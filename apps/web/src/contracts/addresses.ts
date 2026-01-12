/**
 * Contract Addresses Configuration
 *
 * Centralized address management for deployed contracts.
 * Supports multiple networks: mainnet, sepolia, localhost (hardhat).
 *
 * Requirements: 2.1, 4.3, 4.4, 4.6
 */

/**
 * Supported network names
 */
export type NetworkName = 'mainnet' | 'sepolia' | 'localhost';

/**
 * Contract addresses by network
 * Requirements: 4.4 - Support multiple networks
 */
export const ADDRESSES = {
  mainnet: {
    MNEE: '0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF' as const,
    PayrollTreasury: undefined as string | undefined, // To be set after mainnet deployment
  },
  sepolia: {
    MNEE: '0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF' as const, // Same address on testnet
    PayrollTreasury: undefined as string | undefined, // To be set after sepolia deployment
  },
  localhost: {
    MNEE: '0x5FbDB2315678afecb367f032d93F642f64180aa3' as const, // Local hardhat deployment
    PayrollTreasury: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0' as const, // Local hardhat deployment
  },
} as const;

/**
 * MNEE token contract address
 * Fixed address as per requirements: 0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF
 *
 * Requirements: 2.1
 */
export const MNEE_ADDRESS = '0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF' as const;

/**
 * Get contract address for a specific network
 *
 * @param contract - Contract name ('MNEE' or 'PayrollTreasury')
 * @param network - Network name (defaults to env variable or 'sepolia')
 * @returns Contract address or undefined if not deployed
 *
 * Requirements: 4.4
 */
export function getContractAddress(
  contract: 'MNEE' | 'PayrollTreasury',
  network?: NetworkName
): string | undefined {
  const networkName = network || getNetworkFromEnv();
  return ADDRESSES[networkName]?.[contract];
}

/**
 * Get MNEE token address for a specific network
 *
 * @param network - Network name (defaults to env variable or 'sepolia')
 * @returns MNEE contract address
 *
 * Requirements: 2.1
 */
export function getMneeAddress(network?: NetworkName): string {
  const networkName = network || getNetworkFromEnv();
  // For mainnet and sepolia, always use the canonical MNEE address
  if (networkName === 'mainnet' || networkName === 'sepolia') {
    return MNEE_ADDRESS;
  }
  // For localhost, use the local deployment address
  return ADDRESSES.localhost.MNEE;
}

/**
 * Get PayrollTreasury address for a specific network
 *
 * @param network - Network name (defaults to env variable or 'sepolia')
 * @returns PayrollTreasury contract address or undefined if not deployed
 *
 * Requirements: 4.4
 */
export function getPayrollTreasuryAddress(network?: NetworkName): string | undefined {
  const networkName = network || getNetworkFromEnv();
  return ADDRESSES[networkName]?.PayrollTreasury;
}

/**
 * Get network name from environment variable
 */
function getNetworkFromEnv(): NetworkName {
  const network = process.env.NEXT_PUBLIC_NETWORK || 'sepolia';
  if (network === 'mainnet' || network === 'sepolia' || network === 'localhost') {
    return network;
  }
  // Default to sepolia for unknown networks
  return 'sepolia';
}

/**
 * Validate that an address is a valid Ethereum address
 */
export function isValidAddress(address: string): address is `0x${string}` {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Type guard to check if a contract is deployed on a network
 */
export function isContractDeployed(
  contract: 'MNEE' | 'PayrollTreasury',
  network?: NetworkName
): boolean {
  const address = getContractAddress(contract, network);
  return address !== undefined && isValidAddress(address);
}
