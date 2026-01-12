/**
 * Block Explorer URL Utilities
 *
 * Provides functions to generate Etherscan links for:
 * - Transaction hashes
 * - Contract/wallet addresses
 * - Tokens
 * - Blocks
 *
 * Supports mainnet and testnet (Sepolia) configurations.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { getNetworkName } from './rpc';

/**
 * Supported network types for explorer URLs
 */
export type ExplorerNetwork = 'mainnet' | 'sepolia';

/**
 * Types of explorer links that can be generated
 */
export type ExplorerLinkType = 'tx' | 'address' | 'token' | 'block';

/**
 * Base URLs for Etherscan on different networks
 * Requirements: 7.3 - Support network-specific explorer URLs
 */
const EXPLORER_BASE_URLS: Record<ExplorerNetwork, string> = {
  mainnet: 'https://etherscan.io',
  sepolia: 'https://sepolia.etherscan.io',
};

/**
 * Path prefixes for different link types
 */
const EXPLORER_PATHS: Record<ExplorerLinkType, string> = {
  tx: '/tx/',
  address: '/address/',
  token: '/token/',
  block: '/block/',
};

/**
 * Get the base explorer URL for a network
 *
 * @param network - The network to get the explorer URL for
 * @returns The base Etherscan URL for the network
 */
export function getExplorerBaseUrl(network?: ExplorerNetwork): string {
  const resolvedNetwork = network ?? getNetworkName();
  return EXPLORER_BASE_URLS[resolvedNetwork];
}

/**
 * Generate an explorer URL for a given type and hash/address
 * Requirements: 7.4 - Provide utility function: getExplorerUrl(type, hash, network)
 *
 * @param type - The type of link (tx, address, token, block)
 * @param hashOrAddress - The transaction hash, address, or block number
 * @param network - Optional network override (defaults to current network)
 * @returns The full Etherscan URL
 */
export function getExplorerUrl(
  type: ExplorerLinkType,
  hashOrAddress: string,
  network?: ExplorerNetwork
): string {
  const baseUrl = getExplorerBaseUrl(network);
  const path = EXPLORER_PATHS[type];
  return `${baseUrl}${path}${hashOrAddress}`;
}

/**
 * Generate an Etherscan link for a transaction hash
 * Requirements: 7.1 - Generate Etherscan links for transaction hashes
 *
 * @param txHash - The transaction hash
 * @param network - Optional network override (defaults to current network)
 * @returns The full Etherscan transaction URL
 *
 * @example
 * getTxUrl('0x123...abc') // Returns 'https://sepolia.etherscan.io/tx/0x123...abc'
 * getTxUrl('0x123...abc', 'mainnet') // Returns 'https://etherscan.io/tx/0x123...abc'
 */
export function getTxUrl(txHash: string, network?: ExplorerNetwork): string {
  return getExplorerUrl('tx', txHash, network);
}

/**
 * Generate an Etherscan link for an address (contract or wallet)
 * Requirements: 7.2 - Generate Etherscan links for contract addresses
 *
 * @param address - The Ethereum address
 * @param network - Optional network override (defaults to current network)
 * @returns The full Etherscan address URL
 *
 * @example
 * getAddressUrl('0x8cce...cF') // Returns 'https://sepolia.etherscan.io/address/0x8cce...cF'
 * getAddressUrl('0x8cce...cF', 'mainnet') // Returns 'https://etherscan.io/address/0x8cce...cF'
 */
export function getAddressUrl(address: string, network?: ExplorerNetwork): string {
  return getExplorerUrl('address', address, network);
}

/**
 * Generate an Etherscan link for a token contract
 *
 * @param tokenAddress - The token contract address
 * @param network - Optional network override (defaults to current network)
 * @returns The full Etherscan token URL
 */
export function getTokenUrl(tokenAddress: string, network?: ExplorerNetwork): string {
  return getExplorerUrl('token', tokenAddress, network);
}

/**
 * Generate an Etherscan link for a block
 *
 * @param blockNumber - The block number
 * @param network - Optional network override (defaults to current network)
 * @returns The full Etherscan block URL
 */
export function getBlockUrl(blockNumber: string | number, network?: ExplorerNetwork): string {
  return getExplorerUrl('block', String(blockNumber), network);
}

/**
 * Open an explorer URL in a new tab
 * Requirements: 7.5 - Open explorer links in new tab
 *
 * @param url - The URL to open
 * @returns void
 *
 * @example
 * openInExplorer(getTxUrl('0x123...abc'))
 */
export function openInExplorer(url: string): void {
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

/**
 * Open a transaction in the block explorer
 * Requirements: 7.1, 7.5
 *
 * @param txHash - The transaction hash
 * @param network - Optional network override
 */
export function openTxInExplorer(txHash: string, network?: ExplorerNetwork): void {
  openInExplorer(getTxUrl(txHash, network));
}

/**
 * Open an address in the block explorer
 * Requirements: 7.2, 7.5
 *
 * @param address - The Ethereum address
 * @param network - Optional network override
 */
export function openAddressInExplorer(address: string, network?: ExplorerNetwork): void {
  openInExplorer(getAddressUrl(address, network));
}
