/**
 * Authentication Service Tests
 *
 * Unit tests for nonce generation, signature verification, and token issuance.
 * **Feature: 09-testing, Task 2.1: Auth Service Tests**
 * **Validates: Requirements 2.3**
 *
 * Property-based tests for nonce uniqueness and expiration.
 * **Feature: 03-backend, Property 1: Nonce Uniqueness and Expiration**
 * **Validates: Requirements 1.1, 1.2**
 *
 * Property-based tests for JWT security.
 * **Feature: 08-security, Property 2: JWT Security**
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7**
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import fc from 'fast-check';
import {
  generateNonce,
  verifyAccessToken,
  verifySignature,
  refreshTokens,
  logout,
  invalidateAllSessions,
  _internal,
} from './auth.service.js';
import { getAddress } from 'ethers';
import jwt from 'jsonwebtoken';
import { db } from '../lib/db.js';

/**
 * Generate valid checksummed Ethereum addresses for testing.
 * Uses ethers.js getAddress to ensure proper checksum.
 */
const validEthereumAddressArb = fc.hexaString({ minLength: 40, maxLength: 40 }).map((hex) => {
  try {
    // Convert to checksummed address using ethers
    return getAddress(`0x${hex}`);
  } catch {
    // If invalid, return a known valid address
    return '0x0000000000000000000000000000000000000001';
  }
});

describe('AuthService', () => {
  beforeEach(() => {
    // Clear nonce store and rate limit store before each test
    _internal.nonceStore.clear();
    _internal.nonceRateLimitStore.clear();
  });

  describe('Property 1: Nonce Uniqueness and Expiration', () => {
    /**
     * Property 1a: Nonce Uniqueness
     * For any two nonce requests, the generated nonces SHALL be unique.
     * **Validates: Requirements 1.1**
     */
    it('should generate unique nonces for multiple requests', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(validEthereumAddressArb, { minLength: 2, maxLength: 50 }),
          async (walletAddresses) => {
            // Clear rate limit store to avoid rate limiting during test
            _internal.nonceRateLimitStore.clear();

            // Generate nonces for all wallet addresses with unique IPs
            const results = await Promise.all(
              walletAddresses.map((addr, index) =>
                generateNonce(addr, { ip: `192.168.1.${index}` })
              )
            );

            // Extract nonces
            const nonces = results.map((r) => r.nonce);

            // All nonces should be unique
            const uniqueNonces = new Set(nonces);
            return uniqueNonces.size === nonces.length;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 1b: Nonce Expiration Time
     * For any nonce, it SHALL have an expiration time 5 minutes in the future.
     * **Validates: Requirements 1.2**
     */
    it('should set nonce expiration to 5 minutes in the future', async () => {
      await fc.assert(
        fc.asyncProperty(
          validEthereumAddressArb,
          fc.integer({ min: 0, max: 255 }),
          async (walletAddress, ipSuffix) => {
            const before = Date.now();
            const result = await generateNonce(walletAddress, { ip: `192.168.1.${ipSuffix}` });
            const after = Date.now();

            const expiresAt = new Date(result.expiresAt).getTime();
            const expectedMin = before + 5 * 60 * 1000; // 5 minutes from before
            const expectedMax = after + 5 * 60 * 1000 + 1000; // 5 minutes from after + 1s tolerance

            // Expiration should be approximately 5 minutes in the future
            return expiresAt >= expectedMin && expiresAt <= expectedMax;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 1c: Nonce Storage
     * For any generated nonce, it SHALL be stored in the nonce store.
     * **Validates: Requirements 1.2**
     */
    it('should store nonce with correct wallet address', async () => {
      await fc.assert(
        fc.asyncProperty(
          validEthereumAddressArb,
          fc.integer({ min: 0, max: 255 }),
          async (walletAddress, ipSuffix) => {
            const result = await generateNonce(walletAddress, { ip: `192.168.1.${ipSuffix}` });

            // Nonce should be stored
            const stored = _internal.nonceStore.get(result.nonce);
            if (!stored) return false;

            // Stored wallet address should match (lowercase)
            return stored.walletAddress === walletAddress.toLowerCase();
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 1d: SIWE Message Format
     * For any nonce request, the returned message SHALL be a valid SIWE message.
     * **Validates: Requirements 1.1**
     */
    it('should return valid SIWE message containing nonce and wallet', async () => {
      await fc.assert(
        fc.asyncProperty(
          validEthereumAddressArb,
          fc.integer({ min: 0, max: 255 }),
          async (walletAddress, ipSuffix) => {
            const result = await generateNonce(walletAddress, { ip: `192.168.1.${ipSuffix}` });

            // Message should contain the nonce
            const containsNonce = result.message.includes(result.nonce);

            // Message should contain the wallet address (checksummed or lowercase)
            const containsWallet = result.message
              .toLowerCase()
              .includes(walletAddress.toLowerCase());

            // Message should contain SIWE standard elements
            const containsDomain = result.message.includes('orbitpayroll.io');
            const containsStatement = result.message.includes('Sign in to OrbitPayroll');

            return containsNonce && containsWallet && containsDomain && containsStatement;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 1e: Same wallet can request multiple nonces
     * For any wallet address, multiple nonce requests SHALL each return unique nonces.
     * **Validates: Requirements 1.1**
     */
    it('should generate unique nonces for same wallet requesting multiple times', async () => {
      await fc.assert(
        fc.asyncProperty(
          validEthereumAddressArb,
          fc.integer({ min: 2, max: 10 }),
          async (walletAddress, count) => {
            // Clear rate limit store to avoid rate limiting during test
            _internal.nonceRateLimitStore.clear();

            // Generate multiple nonces for the same wallet with unique IPs
            const results = await Promise.all(
              Array.from({ length: count }, (_, index) =>
                generateNonce(walletAddress, { ip: `192.168.1.${index}` })
              )
            );

            // All nonces should be unique
            const nonces = results.map((r) => r.nonce);
            const uniqueNonces = new Set(nonces);
            return uniqueNonces.size === nonces.length;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 2: JWT Security', () => {
    /**
     * Property 2a: JWT Secret Minimum Length
     * For any JWT secret, it SHALL be at least 32 characters (256 bits).
     * **Validates: Requirement 2.3**
     */
    it('should validate JWT secret minimum length of 32 characters', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 0, maxLength: 100 }), (secret) => {
          const isValid = _internal.validateJwtSecret(secret);
          const expectedValid = secret.length >= _internal.JWT_SECRET_MIN_LENGTH;
          return isValid === expectedValid;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property 2b: Access Token Expiry Parsing
     * For any valid expiry string, it SHALL be parsed correctly to milliseconds.
     * **Validates: Requirement 2.1**
     */
    it('should parse expiry strings correctly to milliseconds', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000 }),
          fc.constantFrom('s', 'm', 'h', 'd'),
          (value, unit) => {
            const expiryString = `${value}${unit}`;
            const result = _internal.parseExpiryToMs(expiryString);

            const multipliers: Record<string, number> = {
              s: 1000,
              m: 60 * 1000,
              h: 60 * 60 * 1000,
              d: 24 * 60 * 60 * 1000,
            };

            const expected = value * multipliers[unit]!;
            return result === expected;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 2c: Refresh Token Hash Uniqueness
     * For any two different tokens, their hashes SHALL be different.
     * **Validates: Requirement 2.7**
     */
    it('should generate unique hashes for different tokens', () => {
      fc.assert(
        fc.property(
          fc.hexaString({ minLength: 64, maxLength: 64 }),
          fc.hexaString({ minLength: 64, maxLength: 64 }),
          (token1, token2) => {
            // Skip if tokens are the same
            if (token1 === token2) return true;

            const hash1 = _internal.hashToken(token1);
            const hash2 = _internal.hashToken(token2);

            return hash1 !== hash2;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 2d: Token Hash Determinism
     * For any token, hashing it multiple times SHALL produce the same hash.
     * **Validates: Requirement 2.7**
     */
    it('should produce deterministic hashes for the same token', () => {
      fc.assert(
        fc.property(fc.hexaString({ minLength: 32, maxLength: 128 }), (token) => {
          const hash1 = _internal.hashToken(token);
          const hash2 = _internal.hashToken(token);
          const hash3 = _internal.hashToken(token);

          return hash1 === hash2 && hash2 === hash3;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property 2e: Token Hash Length
     * For any token, the hash SHALL be a 64-character hex string (SHA-256).
     * **Validates: Requirement 2.7**
     */
    it('should produce 64-character hex hashes (SHA-256)', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 1000 }), (token) => {
          const hash = _internal.hashToken(token);

          // SHA-256 produces 64 hex characters
          const isCorrectLength = hash.length === 64;
          // Should only contain hex characters
          const isHex = /^[a-f0-9]+$/.test(hash);

          return isCorrectLength && isHex;
        }),
        { numRuns: 100 }
      );
    });
  });

  // ==========================================================================
  // Unit Tests for Nonce Generation
  // ==========================================================================
  describe('Unit Tests: Nonce Generation', () => {
    it('should generate a 64-character hex nonce', async () => {
      const walletAddress = '0x1234567890123456789012345678901234567890';
      const result = await generateNonce(walletAddress, { ip: '127.0.0.1' });

      expect(result.nonce).toHaveLength(64);
      expect(/^[a-f0-9]+$/.test(result.nonce)).toBe(true);
    });

    it('should return a valid SIWE message', async () => {
      const walletAddress = '0x1234567890123456789012345678901234567890';
      const result = await generateNonce(walletAddress, { ip: '127.0.0.1' });

      expect(result.message).toContain('orbitpayroll.io');
      expect(result.message).toContain('Sign in to OrbitPayroll');
      expect(result.message).toContain(result.nonce);
    });

    it('should return an expiration time in ISO format', async () => {
      const walletAddress = '0x1234567890123456789012345678901234567890';
      const result = await generateNonce(walletAddress, { ip: '127.0.0.1' });

      const expiresAt = new Date(result.expiresAt);
      expect(expiresAt.toISOString()).toBe(result.expiresAt);
    });

    it('should store the nonce in the nonce store', async () => {
      const walletAddress = '0x1234567890123456789012345678901234567890';
      const result = await generateNonce(walletAddress, { ip: '127.0.0.1' });

      const stored = _internal.nonceStore.get(result.nonce);
      expect(stored).toBeDefined();
      expect(stored?.walletAddress).toBe(walletAddress.toLowerCase());
    });

    it('should rate limit nonce requests from the same IP', async () => {
      const walletAddress = '0x1234567890123456789012345678901234567890';
      const ip = '192.168.1.100';

      // Make 10 requests (the limit)
      for (let i = 0; i < 10; i++) {
        await generateNonce(walletAddress, { ip });
      }

      // 11th request should be rate limited
      await expect(generateNonce(walletAddress, { ip })).rejects.toThrow('Too many nonce requests');
    });

    it('should allow requests from different IPs', async () => {
      const walletAddress = '0x1234567890123456789012345678901234567890';

      // Make requests from different IPs
      const results = await Promise.all([
        generateNonce(walletAddress, { ip: '192.168.1.1' }),
        generateNonce(walletAddress, { ip: '192.168.1.2' }),
        generateNonce(walletAddress, { ip: '192.168.1.3' }),
      ]);

      expect(results).toHaveLength(3);
      results.forEach((r) => expect(r.nonce).toBeDefined());
    });

    it('should clean up expired nonces', async () => {
      const walletAddress = '0x1234567890123456789012345678901234567890';

      // Add an expired nonce manually
      const expiredNonce = 'expired-nonce-12345678901234567890123456789012';
      _internal.nonceStore.set(expiredNonce, {
        nonce: expiredNonce,
        walletAddress: walletAddress.toLowerCase(),
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
        message: 'test message',
        createdAt: new Date(Date.now() - 6 * 60 * 1000),
      });

      // Generate a new nonce (triggers cleanup)
      await generateNonce(walletAddress, { ip: '127.0.0.1' });

      // Expired nonce should be cleaned up
      expect(_internal.nonceStore.has(expiredNonce)).toBe(false);
    });
  });

  // ==========================================================================
  // Unit Tests for Signature Verification
  // ==========================================================================
  describe('Unit Tests: Signature Verification', () => {
    it('should reject verification with non-existent nonce', async () => {
      const walletAddress = '0x1234567890123456789012345678901234567890';
      const signature = '0x' + 'a'.repeat(130);
      const nonce = 'non-existent-nonce-1234567890123456789012345';

      await expect(
        verifySignature(walletAddress, signature, nonce, { ip: '127.0.0.1' })
      ).rejects.toThrow();
    });

    it('should reject verification with expired nonce', async () => {
      const walletAddress = '0x1234567890123456789012345678901234567890';
      const signature = '0x' + 'a'.repeat(130);
      const nonce = 'expired-nonce-12345678901234567890123456789012';

      // Add an expired nonce
      _internal.nonceStore.set(nonce, {
        nonce,
        walletAddress: walletAddress.toLowerCase(),
        expiresAt: new Date(Date.now() - 1000), // Expired
        message: 'test message',
        createdAt: new Date(Date.now() - 6 * 60 * 1000),
      });

      await expect(
        verifySignature(walletAddress, signature, nonce, { ip: '127.0.0.1' })
      ).rejects.toThrow();
    });

    it('should reject verification with mismatched wallet address', async () => {
      const walletAddress = '0x1234567890123456789012345678901234567890';
      const differentWallet = '0x0987654321098765432109876543210987654321';
      const signature = '0x' + 'a'.repeat(130);
      const nonce = 'test-nonce-123456789012345678901234567890123';

      // Add a nonce for a different wallet
      _internal.nonceStore.set(nonce, {
        nonce,
        walletAddress: differentWallet.toLowerCase(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        message: 'test message',
        createdAt: new Date(),
      });

      await expect(
        verifySignature(walletAddress, signature, nonce, { ip: '127.0.0.1' })
      ).rejects.toThrow();
    });

    it('should delete nonce after failed verification attempt with expired nonce', async () => {
      const walletAddress = '0x1234567890123456789012345678901234567890';
      const signature = '0x' + 'a'.repeat(130);
      const nonce = 'expired-nonce-12345678901234567890123456789012';

      // Add an expired nonce
      _internal.nonceStore.set(nonce, {
        nonce,
        walletAddress: walletAddress.toLowerCase(),
        expiresAt: new Date(Date.now() - 1000),
        message: 'test message',
        createdAt: new Date(Date.now() - 6 * 60 * 1000),
      });

      try {
        await verifySignature(walletAddress, signature, nonce, { ip: '127.0.0.1' });
      } catch {
        // Expected to throw
      }

      // Nonce should be deleted
      expect(_internal.nonceStore.has(nonce)).toBe(false);
    });
  });

  // ==========================================================================
  // Unit Tests for Token Issuance (verifyAccessToken)
  // ==========================================================================
  describe('Unit Tests: Token Issuance', () => {
    const JWT_SECRET =
      process.env.JWT_SECRET ?? 'test-secret-key-for-testing-minimum-32-characters-long';

    it('should verify a valid access token', () => {
      const userId = 'test-user-id';
      const walletAddress = '0x1234567890123456789012345678901234567890';

      const token = jwt.sign({ sub: userId, wallet: walletAddress }, JWT_SECRET, {
        expiresIn: '15m',
      });

      const payload = verifyAccessToken(token);

      expect(payload.sub).toBe(userId);
      expect(payload.wallet).toBe(walletAddress);
    });

    it('should reject an expired access token', () => {
      const userId = 'test-user-id';
      const walletAddress = '0x1234567890123456789012345678901234567890';

      const token = jwt.sign(
        { sub: userId, wallet: walletAddress },
        JWT_SECRET,
        { expiresIn: '-1s' } // Already expired
      );

      expect(() => verifyAccessToken(token)).toThrow();
    });

    it('should reject a token with invalid signature', () => {
      const userId = 'test-user-id';
      const walletAddress = '0x1234567890123456789012345678901234567890';

      const token = jwt.sign(
        { sub: userId, wallet: walletAddress },
        'wrong-secret-key-that-is-long-enough-for-testing',
        { expiresIn: '15m' }
      );

      expect(() => verifyAccessToken(token)).toThrow();
    });

    it('should reject a malformed token', () => {
      expect(() => verifyAccessToken('not-a-valid-jwt')).toThrow();
    });

    it('should include iat and exp claims in verified token', () => {
      const userId = 'test-user-id';
      const walletAddress = '0x1234567890123456789012345678901234567890';

      const token = jwt.sign({ sub: userId, wallet: walletAddress }, JWT_SECRET, {
        expiresIn: '15m',
      });

      const payload = verifyAccessToken(token);

      expect(payload.iat).toBeDefined();
      expect(payload.exp).toBeDefined();
      expect(payload.exp).toBeGreaterThan(payload.iat);
    });
  });

  // ==========================================================================
  // Unit Tests for Rate Limiting
  // ==========================================================================
  describe('Unit Tests: Rate Limiting', () => {
    it('should track rate limit count correctly', () => {
      const ip = '192.168.1.50';

      // First request should pass
      expect(_internal.checkNonceRateLimit(ip)).toBe(true);

      // Check the count
      const entry = _internal.nonceRateLimitStore.get(ip);
      expect(entry?.count).toBe(1);
    });

    it('should reset rate limit after window expires', () => {
      const ip = '192.168.1.51';

      // Set up an old rate limit entry
      _internal.nonceRateLimitStore.set(ip, {
        count: 10,
        windowStart: new Date(Date.now() - _internal.NONCE_RATE_LIMIT_WINDOW_MS - 1000),
      });

      // Should pass because window expired
      expect(_internal.checkNonceRateLimit(ip)).toBe(true);

      // Count should be reset to 1
      const entry = _internal.nonceRateLimitStore.get(ip);
      expect(entry?.count).toBe(1);
    });

    it('should block requests when rate limit is exceeded', () => {
      const ip = '192.168.1.52';

      // Set up a rate limit entry at the max
      _internal.nonceRateLimitStore.set(ip, {
        count: _internal.NONCE_RATE_LIMIT_MAX,
        windowStart: new Date(),
      });

      // Should be blocked
      expect(_internal.checkNonceRateLimit(ip)).toBe(false);
    });

    it('should clean up expired rate limit entries', () => {
      const ip1 = '192.168.1.53';
      const ip2 = '192.168.1.54';

      // Add an expired entry
      _internal.nonceRateLimitStore.set(ip1, {
        count: 5,
        windowStart: new Date(Date.now() - _internal.NONCE_RATE_LIMIT_WINDOW_MS - 1000),
      });

      // Add a current entry
      _internal.nonceRateLimitStore.set(ip2, {
        count: 3,
        windowStart: new Date(),
      });

      // Run cleanup
      _internal.cleanupRateLimitEntries();

      // Expired entry should be removed
      expect(_internal.nonceRateLimitStore.has(ip1)).toBe(false);
      // Current entry should remain
      expect(_internal.nonceRateLimitStore.has(ip2)).toBe(true);
    });
  });
});
