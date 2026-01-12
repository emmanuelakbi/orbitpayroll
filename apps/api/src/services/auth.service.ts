/**
 * Authentication Service
 *
 * Handles wallet-based authentication using SIWE (Sign-In with Ethereum),
 * JWT token generation, and session management.
 */

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { SiweMessage } from 'siwe';
import { db } from '../lib/db.js';
import { AuthError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

// In-memory nonce store with expiration
// In production, use Redis for distributed systems
interface NonceEntry {
  nonce: string;
  walletAddress: string;
  expiresAt: Date;
  message: string;
}

const nonceStore = new Map<string, NonceEntry>();

// Configuration from environment
const JWT_SECRET = process.env.JWT_SECRET ?? 'development-secret-change-me';
const JWT_ACCESS_EXPIRY_MS = parseExpiryToMs(process.env.JWT_ACCESS_EXPIRY ?? '15m');
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY ?? '7d';
const NONCE_EXPIRY_MINUTES = parseInt(process.env.NONCE_EXPIRY_MINUTES ?? '5', 10);
const CHAIN_ID = parseInt(process.env.CHAIN_ID ?? '11155111', 10);

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
 * Generate a cryptographic nonce for wallet authentication
 */
export async function generateNonce(walletAddress: string): Promise<NonceResponse> {
  // Generate a random 32-byte hex string
  const nonce = crypto.randomBytes(32).toString('hex');

  // Calculate expiration time
  const expiresAt = new Date(Date.now() + NONCE_EXPIRY_MINUTES * 60 * 1000);

  // SIWE requires checksummed address - convert from lowercase if needed
  const { getAddress } = await import('ethers');
  const checksummedAddress = getAddress(walletAddress);

  // Create SIWE message
  const siweMessage = new SiweMessage({
    domain: 'orbitpayroll.com',
    address: checksummedAddress,
    statement: 'Sign in to OrbitPayroll',
    uri: 'https://orbitpayroll.com',
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
  });

  // Clean up expired nonces periodically
  cleanupExpiredNonces();

  logger.debug({ walletAddress, nonce: nonce.substring(0, 8) + '...' }, 'Nonce generated');

  return {
    nonce,
    expiresAt: expiresAt.toISOString(),
    message,
  };
}


/**
 * Verify a SIWE signature and issue JWT tokens
 */
export async function verifySignature(
  walletAddress: string,
  signature: string,
  nonce: string
): Promise<VerifyResponse> {
  // Retrieve nonce entry
  const nonceEntry = nonceStore.get(nonce);

  if (!nonceEntry) {
    logger.warn({ walletAddress, nonce: nonce.substring(0, 8) + '...' }, 'Nonce not found');
    throw AuthError.nonceExpired();
  }

  // Check if nonce has expired
  if (new Date() > nonceEntry.expiresAt) {
    nonceStore.delete(nonce);
    logger.warn({ walletAddress }, 'Nonce expired');
    throw AuthError.nonceExpired();
  }

  // Check if wallet address matches
  if (nonceEntry.walletAddress !== walletAddress.toLowerCase()) {
    logger.warn({ walletAddress, expected: nonceEntry.walletAddress }, 'Wallet address mismatch');
    throw AuthError.invalidSignature();
  }

  // Verify SIWE signature
  try {
    const siweMessage = new SiweMessage(nonceEntry.message);
    const result = await siweMessage.verify({ signature });

    if (!result.success) {
      logger.warn({ walletAddress, error: result.error }, 'SIWE verification failed');
      throw AuthError.invalidSignature();
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('AUTH_')) {
      throw error;
    }
    logger.warn({ walletAddress, error }, 'Signature verification error');
    throw AuthError.invalidSignature();
  }

  // Delete used nonce (one-time use)
  nonceStore.delete(nonce);

  // Find or create user
  let user = await db.user.findUnique({
    where: { walletAddress: walletAddress.toLowerCase() },
  });

  if (!user) {
    user = await db.user.create({
      data: { walletAddress: walletAddress.toLowerCase() },
    });
    logger.info({ userId: user.id, walletAddress }, 'New user created');
  }

  // Generate tokens
  const accessToken = generateAccessToken(user.id, user.walletAddress);
  const refreshToken = await generateRefreshToken(user.id);

  logger.info({ userId: user.id, walletAddress }, 'User authenticated');

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
export async function logout(userId: string, refreshToken?: string): Promise<void> {
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
  hashToken,
  cleanupExpiredNonces,
};
