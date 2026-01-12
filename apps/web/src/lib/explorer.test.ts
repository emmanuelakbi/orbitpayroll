/**
 * Block Explorer URL Utilities Tests
 *
 * Tests for the explorer URL generation functions including:
 * - Transaction URL generation
 * - Address URL generation
 * - Network-specific URL support
 * - Generic getExplorerUrl function
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getTxUrl,
  getAddressUrl,
  getTokenUrl,
  getBlockUrl,
  getExplorerUrl,
  getExplorerBaseUrl,
} from './explorer';

describe('Block Explorer URL Utilities', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('getExplorerBaseUrl', () => {
    it('should return mainnet Etherscan URL for mainnet', () => {
      const url = getExplorerBaseUrl('mainnet');
      expect(url).toBe('https://etherscan.io');
    });

    it('should return Sepolia Etherscan URL for sepolia', () => {
      const url = getExplorerBaseUrl('sepolia');
      expect(url).toBe('https://sepolia.etherscan.io');
    });

    it('should use current network when no network specified', () => {
      vi.stubEnv('NEXT_PUBLIC_NETWORK', 'mainnet');
      const url = getExplorerBaseUrl();
      expect(url).toBe('https://etherscan.io');
    });

    it('should default to sepolia when network not set', () => {
      vi.stubEnv('NEXT_PUBLIC_NETWORK', '');
      const url = getExplorerBaseUrl();
      expect(url).toBe('https://sepolia.etherscan.io');
    });
  });

  describe('getTxUrl', () => {
    const testTxHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

    it('should generate correct mainnet transaction URL', () => {
      const url = getTxUrl(testTxHash, 'mainnet');
      expect(url).toBe(`https://etherscan.io/tx/${testTxHash}`);
    });

    it('should generate correct sepolia transaction URL', () => {
      const url = getTxUrl(testTxHash, 'sepolia');
      expect(url).toBe(`https://sepolia.etherscan.io/tx/${testTxHash}`);
    });

    it('should use current network when no network specified', () => {
      vi.stubEnv('NEXT_PUBLIC_NETWORK', 'mainnet');
      const url = getTxUrl(testTxHash);
      expect(url).toBe(`https://etherscan.io/tx/${testTxHash}`);
    });
  });

  describe('getAddressUrl', () => {
    const testAddress = '0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF';

    it('should generate correct mainnet address URL', () => {
      const url = getAddressUrl(testAddress, 'mainnet');
      expect(url).toBe(`https://etherscan.io/address/${testAddress}`);
    });

    it('should generate correct sepolia address URL', () => {
      const url = getAddressUrl(testAddress, 'sepolia');
      expect(url).toBe(`https://sepolia.etherscan.io/address/${testAddress}`);
    });

    it('should use current network when no network specified', () => {
      vi.stubEnv('NEXT_PUBLIC_NETWORK', 'sepolia');
      const url = getAddressUrl(testAddress);
      expect(url).toBe(`https://sepolia.etherscan.io/address/${testAddress}`);
    });
  });

  describe('getTokenUrl', () => {
    const testTokenAddress = '0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF';

    it('should generate correct mainnet token URL', () => {
      const url = getTokenUrl(testTokenAddress, 'mainnet');
      expect(url).toBe(`https://etherscan.io/token/${testTokenAddress}`);
    });

    it('should generate correct sepolia token URL', () => {
      const url = getTokenUrl(testTokenAddress, 'sepolia');
      expect(url).toBe(`https://sepolia.etherscan.io/token/${testTokenAddress}`);
    });
  });

  describe('getBlockUrl', () => {
    it('should generate correct mainnet block URL with number', () => {
      const url = getBlockUrl(12345678, 'mainnet');
      expect(url).toBe('https://etherscan.io/block/12345678');
    });

    it('should generate correct sepolia block URL with string', () => {
      const url = getBlockUrl('12345678', 'sepolia');
      expect(url).toBe('https://sepolia.etherscan.io/block/12345678');
    });
  });

  describe('getExplorerUrl', () => {
    it('should generate correct URL for tx type', () => {
      const hash = '0xabc123';
      const url = getExplorerUrl('tx', hash, 'mainnet');
      expect(url).toBe(`https://etherscan.io/tx/${hash}`);
    });

    it('should generate correct URL for address type', () => {
      const address = '0xdef456';
      const url = getExplorerUrl('address', address, 'sepolia');
      expect(url).toBe(`https://sepolia.etherscan.io/address/${address}`);
    });

    it('should generate correct URL for token type', () => {
      const token = '0x789abc';
      const url = getExplorerUrl('token', token, 'mainnet');
      expect(url).toBe(`https://etherscan.io/token/${token}`);
    });

    it('should generate correct URL for block type', () => {
      const block = '100';
      const url = getExplorerUrl('block', block, 'sepolia');
      expect(url).toBe(`https://sepolia.etherscan.io/block/${block}`);
    });
  });
});
