/**
 * Feature Flags Configuration
 * 
 * Provides centralized feature flag management for development and testing.
 * Flags are controlled via environment variables.
 * 
 * Requirements: 11.1, 11.5
 */

export interface FeatureFlags {
  /** Toggle between mock and real contracts */
  useMockContracts: boolean;
  /** Current network name (mainnet, sepolia, etc.) */
  network: "mainnet" | "sepolia" | "localhost";
  /** Whether we're in development mode */
  isDevelopment: boolean;
  /** Whether to show development indicators in the UI */
  showDevIndicators: boolean;
}

/**
 * Get the current feature flags from environment variables
 */
export function getFeatureFlags(): FeatureFlags {
  const useMockContracts = process.env.NEXT_PUBLIC_USE_MOCK_CONTRACTS === "true";
  const network = (process.env.NEXT_PUBLIC_NETWORK || "sepolia") as FeatureFlags["network"];
  const isDevelopment = process.env.NODE_ENV === "development";
  
  return {
    useMockContracts,
    network,
    isDevelopment,
    showDevIndicators: isDevelopment || network !== "mainnet",
  };
}

/**
 * Check if mock contracts should be used
 */
export function isMockContractsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_USE_MOCK_CONTRACTS === "true";
}

/**
 * Get the current network name
 */
export function getCurrentNetwork(): FeatureFlags["network"] {
  return (process.env.NEXT_PUBLIC_NETWORK || "sepolia") as FeatureFlags["network"];
}

/**
 * Check if we're on a testnet
 */
export function isTestnet(): boolean {
  const network = getCurrentNetwork();
  return network === "sepolia" || network === "localhost";
}

/**
 * Check if we're in development mode
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === "development";
}

/**
 * Get network display name for UI
 */
export function getNetworkDisplayName(): string {
  const network = getCurrentNetwork();
  switch (network) {
    case "mainnet":
      return "Ethereum Mainnet";
    case "sepolia":
      return "Sepolia Testnet";
    case "localhost":
      return "Local Development";
    default:
      return network;
  }
}

/**
 * Get network badge color for UI
 */
export function getNetworkBadgeColor(): string {
  const network = getCurrentNetwork();
  switch (network) {
    case "mainnet":
      return "bg-green-500/10 text-green-500 border-green-500/20";
    case "sepolia":
      return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    case "localhost":
      return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    default:
      return "bg-gray-500/10 text-gray-500 border-gray-500/20";
  }
}
