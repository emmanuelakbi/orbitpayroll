"use client";

import * as React from "react";
import {
  getFeatureFlags,
  type FeatureFlags,
  isMockContractsEnabled,
  isTestnet as checkTestnet,
  getCurrentNetwork,
  getNetworkDisplayName,
} from "@/lib/feature-flags";

/**
 * React hook for accessing feature flags
 * 
 * Provides reactive access to feature flags in React components.
 * 
 * Requirements: 11.1, 11.5
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { useMockContracts, network, isTestnet } = useFeatureFlags();
 *   
 *   if (useMockContracts) {
 *     return <MockContractWarning />;
 *   }
 *   
 *   return <RealContractUI />;
 * }
 * ```
 */
export function useFeatureFlags(): FeatureFlags & {
  isTestnet: boolean;
  networkDisplayName: string;
} {
  const flags = React.useMemo(() => getFeatureFlags(), []);
  const isTestnet = React.useMemo(() => checkTestnet(), []);
  const networkDisplayName = React.useMemo(() => getNetworkDisplayName(), []);

  return {
    ...flags,
    isTestnet,
    networkDisplayName,
  };
}

/**
 * Hook to check if mock contracts are enabled
 */
export function useMockContractsEnabled(): boolean {
  return React.useMemo(() => isMockContractsEnabled(), []);
}

/**
 * Hook to get the current network
 */
export function useCurrentNetwork(): {
  network: FeatureFlags["network"];
  displayName: string;
  isTestnet: boolean;
} {
  return React.useMemo(
    () => ({
      network: getCurrentNetwork(),
      displayName: getNetworkDisplayName(),
      isTestnet: checkTestnet(),
    }),
    []
  );
}
