"use client";

import * as React from "react";
import { AlertTriangle, Beaker, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getFeatureFlags,
  getNetworkDisplayName,
  getNetworkBadgeColor,
  isTestnet,
  isMockContractsEnabled,
} from "@/lib/feature-flags";

interface NetworkIndicatorProps {
  className?: string;
  /** Show compact version (icon only on mobile) */
  compact?: boolean;
}

/**
 * Network Indicator Component
 * 
 * Displays the current network name in the header during development.
 * Shows warning styling for testnets and mock contract mode.
 * 
 * Requirements: 11.1, 11.5
 */
export function NetworkIndicator({ className, compact = false }: NetworkIndicatorProps) {
  const flags = getFeatureFlags();
  
  // Only show in development or on non-mainnet networks
  if (!flags.showDevIndicators) {
    return null;
  }

  const networkName = getNetworkDisplayName();
  const badgeColor = getNetworkBadgeColor();
  const isMock = isMockContractsEnabled();
  const testnet = isTestnet();

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Mock Contract Indicator */}
      {isMock && (
        <div
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium",
            "bg-purple-500/10 text-purple-500 border-purple-500/20"
          )}
          title="Using mock contracts for development"
        >
          <Beaker className="h-3 w-3" />
          <span className={cn(compact && "hidden sm:inline")}>Mock</span>
        </div>
      )}

      {/* Network Indicator */}
      <div
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium",
          badgeColor
        )}
        title={`Connected to ${networkName}`}
      >
        {testnet ? (
          <AlertTriangle className="h-3 w-3" />
        ) : (
          <Globe className="h-3 w-3" />
        )}
        <span className={cn(compact && "hidden sm:inline")}>{networkName}</span>
      </div>
    </div>
  );
}

/**
 * Development Banner Component
 * 
 * Shows a prominent banner at the top of the page when in development mode
 * or using mock contracts.
 */
export function DevBanner() {
  const flags = getFeatureFlags();
  
  // Only show if using mock contracts or on testnet
  if (!flags.useMockContracts && !isTestnet()) {
    return null;
  }

  const messages: string[] = [];
  if (flags.useMockContracts) {
    messages.push("Mock contracts enabled");
  }
  if (isTestnet()) {
    messages.push(`Connected to ${getNetworkDisplayName()}`);
  }

  return (
    <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-2">
      <div className="flex items-center justify-center gap-2 text-xs text-yellow-600 dark:text-yellow-400">
        <AlertTriangle className="h-3.5 w-3.5" />
        <span className="font-medium">Development Mode:</span>
        <span>{messages.join(" • ")}</span>
      </div>
    </div>
  );
}
