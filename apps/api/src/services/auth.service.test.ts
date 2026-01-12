/**
 * Authentication Service Tests
 *
 * Property-based tests for nonce uniqueness and expiration.
 * **Feature: 03-backend, Property 1: Nonce Uniqueness and Expiration**
 * **Validates: Requirements 1.1, 1.2**
 */

import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { generateNonce, _internal } from './auth.service.js';
import { getAddress } from 'ethers';

/**
 * Generate valid checksummed Ethereum addresses for testing.
 * Uses ethers.js getAddress to ensure proper checksum.
 */
const validEthereumAddressArb = fc
  .hexaString({ minLength: 40, maxLength: 40 })
  .map((hex) => {
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
    // Clear nonce store before each test
    _internal.nonceStore.clear();
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
            // Generate nonces for all wallet addresses
            const results = await Promise.all(
              walletAddresses.map((addr) => generateNonce(addr))
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
        fc.asyncProperty(validEthereumAddressArb, async (walletAddress) => {
          const before = Date.now();
          const result = await generateNonce(walletAddress);
          const after = Date.now();

          const expiresAt = new Date(result.expiresAt).getTime();
          const expectedMin = before + 5 * 60 * 1000; // 5 minutes from before
          const expectedMax = after + 5 * 60 * 1000 + 1000; // 5 minutes from after + 1s tolerance

          // Expiration should be approximately 5 minutes in the future
          return expiresAt >= expectedMin && expiresAt <= expectedMax;
        }),
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
        fc.asyncProperty(validEthereumAddressArb, async (walletAddress) => {
          const result = await generateNonce(walletAddress);

          // Nonce should be stored
          const stored = _internal.nonceStore.get(result.nonce);
          if (!stored) return false;

          // Stored wallet address should match (lowercase)
          return stored.walletAddress === walletAddress.toLowerCase();
        }),
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
        fc.asyncProperty(validEthereumAddressArb, async (walletAddress) => {
          const result = await generateNonce(walletAddress);

          // Message should contain the nonce
          const containsNonce = result.message.includes(result.nonce);

          // Message should contain the wallet address (checksummed or lowercase)
          const containsWallet =
            result.message.toLowerCase().includes(walletAddress.toLowerCase());

          // Message should contain SIWE standard elements
          const containsDomain = result.message.includes('orbitpayroll.com');
          const containsStatement = result.message.includes('Sign in to OrbitPayroll');

          return containsNonce && containsWallet && containsDomain && containsStatement;
        }),
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
            // Generate multiple nonces for the same wallet
            const results = await Promise.all(
              Array.from({ length: count }, () => generateNonce(walletAddress))
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
});
