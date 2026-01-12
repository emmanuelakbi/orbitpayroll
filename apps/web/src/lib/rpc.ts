/**
 * RPC Client Configuration
 *
 * Provides a viem public client with:
 * - Configurable primary RPC URL via environment variable
 * - Fallback provider for redundancy
 * - Automatic failover when primary RPC fails
 * - Retry logic with exponential backoff
 * - Request timeout (30 seconds default)
 * - Error logging with method name and parameters
 * - Support for both mainnet and testnet
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7
 */

import { createPublicClient, http, fallback, type PublicClient, type Chain } from 'viem';
import { mainnet, sepolia } from 'viem/chains';

// Configuration constants
const DEFAULT_TIMEOUT = 30_000; // 30 seconds
const DEFAULT_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000; // 1 second base delay

/**
 * Get the current network chain based on environment configuration
 */
export function getChain(): Chain {
  const network = process.env.NEXT_PUBLIC_NETWORK || 'sepolia';
  return network === 'mainnet' ? mainnet : sepolia;
}

/**
 * Get the network name from environment
 */
export function getNetworkName(): 'mainnet' | 'sepolia' {
  const network = process.env.NEXT_PUBLIC_NETWORK || 'sepolia';
  return network === 'mainnet' ? 'mainnet' : 'sepolia';
}

/**
 * Log RPC errors with method name, parameters, and timestamp
 * Requirements: 1.6
 */
function logRpcError(method: string, params: unknown, error: Error): void {
  const timestamp = new Date().toISOString();
  console.error(`[RPC Error] ${timestamp}`, {
    method,
    params,
    error: error.message,
    stack: error.stack,
  });
}

/**
 * Create HTTP transport with timeout configuration
 * Requirements: 1.5
 */
function createHttpTransport(url: string | undefined, timeout: number = DEFAULT_TIMEOUT) {
  if (!url) {
    return null;
  }
  return http(url, {
    timeout,
    retryCount: 0, // We handle retries ourselves for better control
  });
}

/**
 * Build the transport configuration with primary and fallback providers
 * Requirements: 1.1, 1.2, 1.3
 */
function buildTransport() {
  const network = getNetworkName();
  
  // Get RPC URLs based on network
  const primaryUrl = network === 'mainnet' 
    ? process.env.NEXT_PUBLIC_RPC_URL 
    : process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL;
  
  const fallbackUrl = process.env.NEXT_PUBLIC_RPC_URL_FALLBACK;

  const transports: ReturnType<typeof http>[] = [];

  // Add primary transport
  const primaryTransport = createHttpTransport(primaryUrl);
  if (primaryTransport) {
    transports.push(primaryTransport);
  }

  // Add fallback transport if configured
  const fallbackTransport = createHttpTransport(fallbackUrl);
  if (fallbackTransport) {
    transports.push(fallbackTransport);
  }

  // If no transports configured, use default public RPC
  if (transports.length === 0) {
    const chain = getChain();
    const defaultUrl = chain.rpcUrls.default.http[0];
    transports.push(http(defaultUrl, { timeout: DEFAULT_TIMEOUT }));
  }

  // Use fallback transport for automatic failover
  // Requirements: 1.3 - automatic failover when primary RPC fails
  return fallback(transports, {
    rank: true, // Rank transports by latency
    retryCount: 1, // Retry once on each transport before moving to next
  });
}

/**
 * Create the public client singleton
 * Requirements: 1.1, 1.2, 1.3, 1.7
 */
let publicClientInstance: PublicClient | null = null;

export function getPublicClient(): PublicClient {
  if (!publicClientInstance) {
    publicClientInstance = createPublicClient({
      chain: getChain(),
      transport: buildTransport(),
      batch: {
        multicall: true, // Enable multicall batching for efficiency
      },
    });
  }
  return publicClientInstance;
}

/**
 * Reset the public client (useful for testing or network changes)
 */
export function resetPublicClient(): void {
  publicClientInstance = null;
}

/**
 * Retry wrapper with exponential backoff
 * Requirements: 1.3
 *
 * @param fn - Async function to retry
 * @param retries - Number of retry attempts (default: 3)
 * @param baseDelay - Base delay in ms (default: 1000)
 * @returns Promise resolving to the function result
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = DEFAULT_RETRIES,
  baseDelay: number = DEFAULT_RETRY_DELAY
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Log the error
      logRpcError('withRetry', { attempt: attempt + 1, retries }, lastError);

      // Don't wait after the last attempt
      if (attempt < retries - 1) {
        // Exponential backoff: 1s, 2s, 4s, etc.
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('All retry attempts failed');
}

/**
 * Cache for RPC responses (block number, gas price)
 * Requirements: 1.4
 */
interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
}

const rpcCache = new Map<string, CacheEntry<unknown>>();

/**
 * Get cached value or fetch and cache
 * Requirements: 1.4
 */
export async function withCache<T>(
  key: string,
  fn: () => Promise<T>,
  ttlMs: number = 12_000 // Default 12 seconds (roughly 1 block)
): Promise<T> {
  const cached = rpcCache.get(key);
  const now = Date.now();

  if (cached && now - cached.timestamp < cached.ttl) {
    return cached.value as T;
  }

  const value = await fn();
  rpcCache.set(key, { value, timestamp: now, ttl: ttlMs });
  return value;
}

/**
 * Clear the RPC cache
 */
export function clearRpcCache(): void {
  rpcCache.clear();
}

/**
 * Convenience methods for common RPC calls with caching and retry
 */
export const rpc = {
  /**
   * Get current block number with caching
   * Requirements: 1.4
   */
  async getBlockNumber(): Promise<bigint> {
    const client = getPublicClient();
    return withCache('blockNumber', () =>
      withRetry(() => client.getBlockNumber())
    );
  },

  /**
   * Get current gas price with caching
   * Requirements: 1.4
   */
  async getGasPrice(): Promise<bigint> {
    const client = getPublicClient();
    return withCache('gasPrice', () =>
      withRetry(() => client.getGasPrice())
    );
  },

  /**
   * Get balance for an address
   */
  async getBalance(address: `0x${string}`): Promise<bigint> {
    const client = getPublicClient();
    return withRetry(() => client.getBalance({ address }));
  },

  /**
   * Get transaction by hash
   */
  async getTransaction(hash: `0x${string}`) {
    const client = getPublicClient();
    return withRetry(() => client.getTransaction({ hash }));
  },

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(hash: `0x${string}`) {
    const client = getPublicClient();
    return withRetry(() => client.getTransactionReceipt({ hash }));
  },

  /**
   * Wait for transaction receipt with timeout
   */
  async waitForTransactionReceipt(
    hash: `0x${string}`,
    confirmations: number = 1,
    timeout: number = 60_000
  ) {
    const client = getPublicClient();
    return client.waitForTransactionReceipt({
      hash,
      confirmations,
      timeout,
    });
  },

  /**
   * Estimate gas for a transaction
   */
  async estimateGas(params: Parameters<PublicClient['estimateGas']>[0]) {
    const client = getPublicClient();
    return withRetry(() => client.estimateGas(params));
  },

  /**
   * Read contract data
   */
  async readContract<T>(params: Parameters<PublicClient['readContract']>[0]): Promise<T> {
    const client = getPublicClient();
    return withRetry(() => client.readContract(params)) as Promise<T>;
  },
};

// Export the public client for direct access when needed
export const publicClient = getPublicClient();
