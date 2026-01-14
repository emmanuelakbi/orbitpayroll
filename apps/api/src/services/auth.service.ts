/**
 * Authentication Service
 *
 * Handles wallet-based authentication using SIWE (Sign-In with Ethereum),
 * JWT token generation, and session management.
 *
 * Security Features:
 * - Cryptographically random nonces (32 bytes / 256 bits)
 * - Nonce expiration (5 minutes)
 * - Single-use nonces (deleted after verification)
 * - Rate limiting for nonce requests (10 per minute per IP)
 * - Comprehensive authentication logging
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7
 */

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { SiweMessage } from 'siwe';
import { db } from '../lib/db.js';
import { AuthError, AppError, ErrorCode } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { auditLogger } from '../lib/audit-logger.js';

// In-memory nonce store with expiration
// In production, use Redis for distributed systems
interface NonceEntry {
  nonce: string;
  walletAddress: string;
  expiresAt: Date;
  message: string;
  createdAt: Date;
}

const nonceStore = new Map<string, NonceEntry>();

// Rate limiting for nonce requests per IP (10 per minute)
// Requirement 1.6: Rate limit nonce requests (10 per minute per IP)
interface NonceRateLimitEntry {
  count: number;
  windowStart: Date;
}

const nonceRateLimitStore = new Map<string, NonceRateLimitEntry>();
const NONCE_RATE_LIMIT_MAX = 10;
const NONCE_RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

// Configuration from environment
// Requirement 2.3: JWT_SECRET must be at least 32 characters (256 bits)
const JWT_SECRET = process.env.JWT_SECRET ?? 'development-secret-change-me';
// Requirement 2.1: Access tokens expire in 15 minutes
const JWT_ACCESS_EXPIRY_MS = parseExpiryToMs(process.env.JWT_ACCESS_EXPIRY ?? '15m');
// Requirement 2.2: Refresh tokens expire in 7 days
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY ?? '7d';
const NONCE_EXPIRY_MINUTES = parseInt(process.env.NONCE_EXPIRY_MINUTES ?? '5', 10);
const CHAIN_ID = parseInt(process.env.CHAIN_ID ?? '11155111', 10);

// JWT Security Constants
const JWT_SECRET_MIN_LENGTH = 32; // 256 bits minimum (Requirement 2.3)
const JWT_ACCESS_EXPIRY_MAX_MS = 30 * 60 * 1000; // 30 minutes max for access tokens
const JWT_REFRESH_EXPIRY_MAX_DAYS = 30; // 30 days max for refresh tokens

/**
 * Validate JWT secret strength
 * Requirement 2.3: Sign JWTs with strong secret (minimum 256 bits)
 */
function validateJwtSecret(secret: string): boolean {
  return secret.length >= JWT_SECRET_MIN_LENGTH;
}

// Validate JWT secret at startup (warn in development, throw in production)
if (!validateJwtSecret(JWT_SECRET)) {
  const message = `JWT_SECRET must be at least ${JWT_SECRET_MIN_LENGTH} characters (256 bits) for security`;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(message);
  } else {
    logger.warn({ event: 'jwt_secret_weak' }, message);
  }
}

/**
 * Parse expiry string like "15m", "7d" to milliseconds
 */
function parseExpiryToMs(expiry: string): number {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) {
    return 15 * 60 * 1000; // Default 15 minutes
  }

  const value = parseInt(match[1]!, 10);
  const unit = match[2];

  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return value * (multipliers[unit!] ?? 60 * 1000);
}

export interface NonceResponse {
  nonce: string;
  expiresAt: string;
  message: string;
}

export interface AuthContext {
  ip: string;
  userAgent?: string;
}

export interface VerifyResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    walletAddress: string;
    createdAt: string;
  };
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

interface JWTPayload {
  sub: string;
  wallet: string;
  iat: number;
  exp: number;
}

/**
 * Check if IP is rate limited for nonce requests
 * Requirement 1.6: Rate limit nonce requests (10 per minute per IP)
 */
function checkNonceRateLimit(ip: string): boolean {
  const now = new Date();
  const entry = nonceRateLimitStore.get(ip);

  if (!entry) {
    // First request from this IP
    nonceRateLimitStore.set(ip, { count: 1, windowStart: now });
    return true;
  }

  const windowAge = now.getTime() - entry.windowStart.getTime();

  if (windowAge > NONCE_RATE_LIMIT_WINDOW_MS) {
    // Window expired, reset
    nonceRateLimitStore.set(ip, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= NONCE_RATE_LIMIT_MAX) {
    // Rate limit exceeded
    return false;
  }

  // Increment count
  entry.count++;
  return true;
}

/**
 * Clean up expired rate limit entries
 */
function cleanupRateLimitEntries(): void {
  const now = new Date();
  for (const [ip, entry] of nonceRateLimitStore.entries()) {
    if (now.getTime() - entry.windowStart.getTime() > NONCE_RATE_LIMIT_WINDOW_MS) {
      nonceRateLimitStore.delete(ip);
    }
  }
}

/**
 * Generate a cryptographic nonce for wallet authentication
 *
 * Security:
 * - Requirement 1.1: Implements SIWE standard
 * - Requirement 1.2: Generates cryptographically random nonces (32 bytes / 256 bits)
 * - Requirement 1.3: Nonces expire after 5 minutes
 * - Requirement 1.6: Rate limits nonce requests (10 per minute per IP)
 * - Requirement 1.7: Logs authentication attempts with IP and wallet address
 */
export async function generateNonce(
  walletAddress: string,
  context?: AuthContext
): Promise<NonceResponse> {
  const ip = context?.ip ?? 'unknown';

  // Requirement 1.6: Check rate limit for nonce requests
  if (!checkNonceRateLimit(ip)) {
    logger.warn(
      { ip, walletAddress, event: 'nonce_rate_limited' },
      'Nonce request rate limited'
    );
    throw new AppError(
      ErrorCode.RATE_LIMIT,
      'Too many nonce requests. Please try again later.',
      429
    );
  }

  // Requirement 1.2: Generate a random 32-byte (256-bit) hex string
  const nonce = crypto.randomBytes(32).toString('hex');

  // Requirement 1.3: Calculate expiration time (5 minutes)
  const expiresAt = new Date(Date.now() + NONCE_EXPIRY_MINUTES * 60 * 1000);

  // SIWE requires checksummed address - convert from lowercase if needed
  const { getAddress } = await import('ethers');
  const checksummedAddress = getAddress(walletAddress);

  // Get domain from environment or use default
  const siweDomain = process.env.SIWE_DOMAIN ?? 'orbitpayroll.io';
  const siweUri = process.env.SIWE_URI ?? `https://${siweDomain}`;

  // Requirement 1.1: Create SIWE message
  const siweMessage = new SiweMessage({
    domain: siweDomain,
    address: checksummedAddress,
    statement: 'Sign in to OrbitPayroll',
    uri: siweUri,
    version: '1',
    chainId: CHAIN_ID,
    nonce,
    issuedAt: new Date().toISOString(),
    expirationTime: expiresAt.toISOString(),
  });

  const message = siweMessage.prepareMessage();

  // Store nonce with expiration (use lowercase for consistency)
  nonceStore.set(nonce, {
    nonce,
    walletAddress: walletAddress.toLowerCase(),
    expiresAt,
    message,
    createdAt: new Date(),
  });

  // Clean up expired nonces and rate limit entries periodically
  cleanupExpiredNonces();
  cleanupRateLimitEntries();

  // Requirement 1.7: Log nonce generation with IP and wallet address
  logger.info(
    {
      ip,
      walletAddress: walletAddress.toLowerCase(),
      noncePrefix: nonce.substring(0, 8),
      expiresAt: expiresAt.toISOString(),
      event: 'nonce_generated',
    },
    'Nonce generated for wallet authentication'
  );

  return {
    nonce,
    expiresAt: expiresAt.toISOString(),
    message,
  };
}


/**
 * Verify a SIWE signature and issue JWT tokens
 *
 * Security:
 * - Requirement 1.4: Verifies signature matches wallet address and nonce
 * - Requirement 1.5: Prevents nonce reuse (single-use tokens)
 * - Requirement 1.7: Logs all authentication attempts with IP and wallet address
 */
export async function verifySignature(
  walletAddress: string,
  signature: string,
  nonce: string,
  context?: AuthContext
): Promise<VerifyResponse> {
  const ip = context?.ip ?? 'unknown';

  // Retrieve nonce entry
  const nonceEntry = nonceStore.get(nonce);

  if (!nonceEntry) {
    // Requirement 1.7: Log failed authentication attempt
    logger.warn(
      {
        ip,
        walletAddress: walletAddress.toLowerCase(),
        noncePrefix: nonce.substring(0, 8),
        reason: 'nonce_not_found',
        event: 'auth_failed',
      },
      'Authentication failed: nonce not found'
    );
    // Audit log: login failure (Requirement 5.1)
    auditLogger.loginFailure(
      {
        walletAddress: walletAddress.toLowerCase(),
        ip,
        reason: 'nonce_not_found',
      },
      {}
    );
    throw AuthError.nonceExpired();
  }

  // Requirement 1.3: Check if nonce has expired
  if (new Date() > nonceEntry.expiresAt) {
    nonceStore.delete(nonce);
    // Requirement 1.7: Log failed authentication attempt
    logger.warn(
      {
        ip,
        walletAddress: walletAddress.toLowerCase(),
        noncePrefix: nonce.substring(0, 8),
        reason: 'nonce_expired',
        event: 'auth_failed',
      },
      'Authentication failed: nonce expired'
    );
    // Audit log: login failure (Requirement 5.1)
    auditLogger.loginFailure(
      {
        walletAddress: walletAddress.toLowerCase(),
        ip,
        reason: 'nonce_expired',
      },
      {}
    );
    throw AuthError.nonceExpired();
  }

  // Check if wallet address matches
  if (nonceEntry.walletAddress !== walletAddress.toLowerCase()) {
    // Requirement 1.7: Log failed authentication attempt
    logger.warn(
      {
        ip,
        walletAddress: walletAddress.toLowerCase(),
        expectedWallet: nonceEntry.walletAddress,
        reason: 'wallet_mismatch',
        event: 'auth_failed',
      },
      'Authentication failed: wallet address mismatch'
    );
    // Audit log: login failure (Requirement 5.1)
    auditLogger.loginFailure(
      {
        walletAddress: walletAddress.toLowerCase(),
        ip,
        reason: 'wallet_mismatch',
      },
      {}
    );
    throw AuthError.invalidSignature();
  }

  // Requirement 1.4: Verify SIWE signature
  try {
    const siweMessage = new SiweMessage(nonceEntry.message);
    const result = await siweMessage.verify({ signature });

    if (!result.success) {
      // Requirement 1.7: Log failed authentication attempt
      logger.warn(
        {
          ip,
          walletAddress: walletAddress.toLowerCase(),
          reason: 'siwe_verification_failed',
          error: result.error?.type,
          event: 'auth_failed',
        },
        'Authentication failed: SIWE verification failed'
      );
      // Audit log: login failure (Requirement 5.1)
      auditLogger.loginFailure(
        {
          walletAddress: walletAddress.toLowerCase(),
          ip,
          reason: 'siwe_verification_failed',
        },
        {}
      );
      throw AuthError.invalidSignature();
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('AUTH_')) {
      throw error;
    }
    // Requirement 1.7: Log failed authentication attempt
    logger.warn(
      {
        ip,
        walletAddress: walletAddress.toLowerCase(),
        reason: 'signature_verification_error',
        error: error instanceof Error ? error.message : 'Unknown error',
        event: 'auth_failed',
      },
      'Authentication failed: signature verification error'
    );
    // Audit log: login failure (Requirement 5.1)
    auditLogger.loginFailure(
      {
        walletAddress: walletAddress.toLowerCase(),
        ip,
        reason: 'signature_verification_error',
      },
      {}
    );
    throw AuthError.invalidSignature();
  }

  // Requirement 1.5: Delete used nonce (single-use / one-time use)
  nonceStore.delete(nonce);

  // Find or create user
  let user = await db.user.findUnique({
    where: { walletAddress: walletAddress.toLowerCase() },
  });

  const isNewUser = !user;

  if (!user) {
    user = await db.user.create({
      data: { walletAddress: walletAddress.toLowerCase() },
    });
    logger.info(
      {
        ip,
        userId: user.id,
        walletAddress: walletAddress.toLowerCase(),
        event: 'user_created',
      },
      'New user created'
    );
  }

  // Generate tokens
  const accessToken = generateAccessToken(user.id, user.walletAddress);
  const refreshToken = await generateRefreshToken(user.id);

  // Requirement 1.7: Log successful authentication
  logger.info(
    {
      ip,
      userId: user.id,
      walletAddress: walletAddress.toLowerCase(),
      isNewUser,
      event: 'auth_success',
    },
    'User authenticated successfully'
  );

  // Audit log: login success (Requirement 5.1)
  await auditLogger.loginSuccess(
    {
      walletAddress: walletAddress.toLowerCase(),
      ip,
      isNewUser,
    },
    {
      userId: user.id,
    }
  );

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      walletAddress: user.walletAddress,
      createdAt: user.createdAt.toISOString(),
    },
  };
}

/**
 * Refresh access token using a valid refresh token
 */
export async function refreshTokens(refreshToken: string): Promise<RefreshResponse> {
  // Hash the refresh token to look up in database
  const tokenHash = hashToken(refreshToken);

  // Find session by token hash
  const session = await db.session.findFirst({
    where: {
      tokenHash,
      expiresAt: { gt: new Date() },
    },
    include: { user: true },
  });

  if (!session) {
    logger.warn({ tokenHash: tokenHash.substring(0, 8) + '...' }, 'Invalid or expired refresh token');
    throw AuthError.invalidToken();
  }

  // Delete old session (token rotation)
  await db.session.delete({ where: { id: session.id } });

  // Generate new tokens
  const newAccessToken = generateAccessToken(session.user.id, session.user.walletAddress);
  const newRefreshToken = await generateRefreshToken(session.user.id);

  logger.info({ userId: session.user.id }, 'Tokens refreshed');

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
}

/**
 * Invalidate a user's session (logout)
 */
export async function logout(userId: string, refreshToken?: string, walletAddress?: string): Promise<void> {
  if (refreshToken) {
    // Delete specific session
    const tokenHash = hashToken(refreshToken);
    await db.session.deleteMany({
      where: { userId, tokenHash },
    });
  } else {
    // Delete all sessions for user
    await db.session.deleteMany({
      where: { userId },
    });
  }

  logger.info({ userId }, 'User logged out');

  // Audit log: logout (Requirement 5.1)
  await auditLogger.logout(
    {
      walletAddress: walletAddress ?? 'unknown',
    },
    {
      userId,
    }
  );
}

/**
 * Invalidate all sessions for a user
 * 
 * Security:
 * - Requirement 2.8: Invalidate all sessions on password/wallet change
 * 
 * This should be called when:
 * - User changes their wallet address
 * - User requests to log out from all devices
 * - Security incident requires session revocation
 */
export async function invalidateAllSessions(userId: string): Promise<number> {
  const result = await db.session.deleteMany({
    where: { userId },
  });

  logger.info(
    { userId, sessionsInvalidated: result.count, event: 'sessions_invalidated' },
    'All user sessions invalidated'
  );

  return result.count;
}

/**
 * Verify and decode a JWT access token
 */
export function verifyAccessToken(token: string): JWTPayload {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return payload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw AuthError.tokenExpired();
    }
    throw AuthError.invalidToken();
  }
}

// ============================================
// Helper Functions
// ============================================

function generateAccessToken(userId: string, walletAddress: string): string {
  // Use milliseconds for expiresIn to avoid type issues with string values
  return jwt.sign(
    { sub: userId, wallet: walletAddress },
    JWT_SECRET,
    { expiresIn: Math.floor(JWT_ACCESS_EXPIRY_MS / 1000) } // Convert to seconds
  );
}

async function generateRefreshToken(userId: string): Promise<string> {
  // Generate random token
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);

  // Calculate expiration (parse JWT_REFRESH_EXPIRY like "7d")
  const expiresAt = parseExpiry(JWT_REFRESH_EXPIRY);

  // Store session in database
  await db.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return token;
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function parseExpiry(expiry: string): Date {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) {
    // Default to 7 days
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }

  const value = parseInt(match[1]!, 10);
  const unit = match[2];

  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return new Date(Date.now() + value * (multipliers[unit!] ?? 24 * 60 * 60 * 1000));
}

function cleanupExpiredNonces(): void {
  const now = new Date();
  for (const [key, entry] of nonceStore.entries()) {
    if (entry.expiresAt < now) {
      nonceStore.delete(key);
    }
  }
}

// Export for testing
export const _internal = {
  nonceStore,
  nonceRateLimitStore,
  hashToken,
  cleanupExpiredNonces,
  cleanupRateLimitEntries,
  checkNonceRateLimit,
  validateJwtSecret,
  parseExpiryToMs,
  NONCE_RATE_LIMIT_MAX,
  NONCE_RATE_LIMIT_WINDOW_MS,
  JWT_SECRET_MIN_LENGTH,
  JWT_ACCESS_EXPIRY_MAX_MS,
  JWT_REFRESH_EXPIRY_MAX_DAYS,
};
