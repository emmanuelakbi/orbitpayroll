/**
 * RPC Client Tests
 *
 * Tests for the viem public client configuration including:
 * - Chain selection based on environment
 * - Retry logic with exponential backoff
 * - Caching functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getChain,
  getNetworkName,
  withRetry,
  withCache,
  clearRpcCache,
  resetPublicClient,
  getPublicClient,
} from './rpc';
import { mainnet, sepolia } from 'viem/chains';

describe('RPC Client', () => {
  beforeEach(() => {
    // Reset state before each test
    clearRpcCache();
    resetPublicClient();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('getChain', () => {
    it('should return sepolia chain by default', () => {
      vi.stubEnv('NEXT_PUBLIC_NETWORK', '');
      resetPublicClient();
      const chain = getChain();
      expect(chain.id).toBe(sepolia.id);
    });

    it('should return mainnet chain when configured', () => {
      vi.stubEnv('NEXT_PUBLIC_NETWORK', 'mainnet');
      resetPublicClient();
      const chain = getChain();
      expect(chain.id).toBe(mainnet.id);
    });

    it('should return sepolia chain when explicitly configured', () => {
      vi.stubEnv('NEXT_PUBLIC_NETWORK', 'sepolia');
      resetPublicClient();
      const chain = getChain();
      expect(chain.id).toBe(sepolia.id);
    });
  });

  describe('getNetworkName', () => {
    it('should return sepolia by default', () => {
      vi.stubEnv('NEXT_PUBLIC_NETWORK', '');
      expect(getNetworkName()).toBe('sepolia');
    });

    it('should return mainnet when configured', () => {
      vi.stubEnv('NEXT_PUBLIC_NETWORK', 'mainnet');
      expect(getNetworkName()).toBe('mainnet');
    });
  });

  describe('withRetry', () => {
    it('should return result on first successful attempt', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const result = await withRetry(fn, 3, 10);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and succeed', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success');

      const result = await withRetry(fn, 3, 10);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should throw after all retries exhausted', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('persistent failure'));

      await expect(withRetry(fn, 3, 10)).rejects.toThrow('persistent failure');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should use exponential backoff', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');

      const start = Date.now();
      await withRetry(fn, 2, 50);
      const elapsed = Date.now() - start;

      // Should have waited at least 50ms (first retry delay)
      expect(elapsed).toBeGreaterThanOrEqual(40); // Allow some tolerance
    });
  });

  describe('withCache', () => {
    it('should cache results', async () => {
      const fn = vi.fn().mockResolvedValue('cached value');

      const result1 = await withCache('test-key', fn, 1000);
      const result2 = await withCache('test-key', fn, 1000);

      expect(result1).toBe('cached value');
      expect(result2).toBe('cached value');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should refresh cache after TTL expires', async () => {
      const fn = vi
        .fn()
        .mockResolvedValueOnce('first')
        .mockResolvedValueOnce('second');

      const result1 = await withCache('test-key-2', fn, 50);
      expect(result1).toBe('first');

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 60));

      const result2 = await withCache('test-key-2', fn, 50);
      expect(result2).toBe('second');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should use different cache entries for different keys', async () => {
      const fn1 = vi.fn().mockResolvedValue('value1');
      const fn2 = vi.fn().mockResolvedValue('value2');

      const result1 = await withCache('key1', fn1, 1000);
      const result2 = await withCache('key2', fn2, 1000);

      expect(result1).toBe('value1');
      expect(result2).toBe('value2');
      expect(fn1).toHaveBeenCalledTimes(1);
      expect(fn2).toHaveBeenCalledTimes(1);
    });
  });

  describe('clearRpcCache', () => {
    it('should clear all cached values', async () => {
      const fn = vi
        .fn()
        .mockResolvedValueOnce('first')
        .mockResolvedValueOnce('second');

      await withCache('clear-test', fn, 10000);
      clearRpcCache();
      const result = await withCache('clear-test', fn, 10000);

      expect(result).toBe('second');
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('getPublicClient', () => {
    it('should return a public client instance', () => {
      const client = getPublicClient();
      expect(client).toBeDefined();
      expect(typeof client.getBlockNumber).toBe('function');
      expect(typeof client.getBalance).toBe('function');
    });

    it('should return the same instance on multiple calls (singleton)', () => {
      const client1 = getPublicClient();
      const client2 = getPublicClient();
      expect(client1).toBe(client2);
    });

    it('should return a new instance after reset', () => {
      const client1 = getPublicClient();
      resetPublicClient();
      const client2 = getPublicClient();
      expect(client1).not.toBe(client2);
    });
  });
});
