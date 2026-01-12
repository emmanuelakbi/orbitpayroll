"use client";

import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  metaMaskWallet,
  walletConnectWallet,
  coinbaseWallet,
  injectedWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { createConfig, http } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";

// Get environment variables with fallbacks
const wcProjectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID || "demo";
const mainnetRpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
const sepoliaRpcUrl = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL;
// Note: fallback RPC is handled at the RPC client level (lib/rpc.ts), not in wagmi config

// App metadata for WalletConnect
const appMetadata = {
  appName: "OrbitPayroll",
  appDescription: "Web3 Payroll Platform for Organizations",
  appUrl: typeof window !== "undefined" ? window.location.origin : "https://orbitpayroll.xyz",
  appIcon: typeof window !== "undefined" ? `${window.location.origin}/icon.png` : "https://orbitpayroll.xyz/icon.png",
};

/**
 * Configure wallet connectors
 * Requirements 5.1, 5.2, 5.3, 5.4: Support MetaMask, WalletConnect, Coinbase Wallet
 */
const connectors = connectorsForWallets(
  [
    {
      groupName: "Recommended",
      wallets: [
        // Requirement 5.1: MetaMask browser extension
        metaMaskWallet,
        // Requirement 5.2: WalletConnect protocol for mobile wallets
        walletConnectWallet,
        // Requirement 5.3: Coinbase Wallet
        coinbaseWallet,
      ],
    },
    {
      groupName: "Other",
      wallets: [
        // Generic injected wallet fallback
        injectedWallet,
      ],
    },
  ],
  {
    projectId: wcProjectId,
    appName: appMetadata.appName,
    appDescription: appMetadata.appDescription,
    appUrl: appMetadata.appUrl,
    appIcon: appMetadata.appIcon,
  }
);

/**
 * Determine which chains to enable based on environment
 */
const getEnabledChains = () => {
  const network = process.env.NEXT_PUBLIC_NETWORK;
  
  // For production, only enable mainnet
  if (network === "mainnet") {
    return [mainnet] as const;
  }
  
  // For development/testing, enable both
  return [sepolia, mainnet] as const;
};

const chains = getEnabledChains();

/**
 * Create wagmi config with explicit connectors and transports
 * Requirement 5.4: Use wagmi for wallet connection abstraction
 */
export const config = createConfig({
  chains,
  connectors,
  transports: {
    [mainnet.id]: mainnetRpcUrl 
      ? http(mainnetRpcUrl)
      : http(), // Falls back to public RPC
    [sepolia.id]: sepoliaRpcUrl 
      ? http(sepoliaRpcUrl)
      : http(), // Falls back to public RPC
  },
  ssr: true,
});

/**
 * Export supported chain IDs for network validation
 */
export const SUPPORTED_CHAIN_IDS: readonly number[] = chains.map((chain) => chain.id);

/**
 * Check if a chain ID is supported
 */
export function isSupportedChain(chainId: number | undefined): boolean {
  if (!chainId) return false;
  return SUPPORTED_CHAIN_IDS.includes(chainId);
}

/**
 * Get the expected chain based on environment
 */
export function getExpectedChain() {
  const network = process.env.NEXT_PUBLIC_NETWORK;
  return network === "mainnet" ? mainnet : sepolia;
}

/**
 * Export chain configurations for use elsewhere
 */
export { mainnet, sepolia };
