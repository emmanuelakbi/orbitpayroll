"use client";

import * as React from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getExpectedChain, isSupportedChain, SUPPORTED_CHAIN_IDS } from "@/lib/wagmi";
import { cn } from "@/lib/utils";

interface NetworkSwitcherProps {
  className?: string;
  /** Show as inline warning or modal-style banner */
  variant?: "inline" | "banner";
}

/**
 * Network Switcher Component
 * 
 * Detects when user is on wrong network and prompts them to switch.
 * 
 * Requirements:
 * - 5.5: Detect and display current connected network
 * - 5.6: Prompt network switch if user is on wrong network
 */
export function NetworkSwitcher({ className, variant = "banner" }: NetworkSwitcherProps) {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending, error } = useSwitchChain();
  
  const expectedChain = getExpectedChain();
  const isWrongNetwork = isConnected && chainId && !isSupportedChain(chainId);
  const isOnExpectedNetwork = chainId === expectedChain.id;

  // Don't show if not connected or on correct network
  if (!isConnected || isOnExpectedNetwork) {
    return null;
  }

  const handleSwitchNetwork = () => {
    switchChain({ chainId: expectedChain.id });
  };

  if (variant === "inline") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {isWrongNetwork && (
          <>
            <span className="text-sm text-destructive">Wrong Network</span>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleSwitchNetwork}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
                  Switching...
                </>
              ) : (
                `Switch to ${expectedChain.name}`
              )}
            </Button>
          </>
        )}
      </div>
    );
  }

  // Banner variant - shows as a prominent warning
  return (
    <div
      className={cn(
        "bg-destructive/10 border border-destructive/20 rounded-lg p-4",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-destructive">
            Wrong Network Detected
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {isWrongNetwork
              ? `Your wallet is connected to an unsupported network. Please switch to ${expectedChain.name} to use OrbitPayroll.`
              : `Please switch to ${expectedChain.name} for the best experience.`}
          </p>
          {error && (
            <p className="text-xs text-destructive mt-2">
              Error: {error.message}
            </p>
          )}
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleSwitchNetwork}
          disabled={isPending}
          className="flex-shrink-0"
        >
          {isPending ? (
            <>
              <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
              Switching...
            </>
          ) : (
            `Switch Network`
          )}
        </Button>
      </div>
    </div>
  );
}

/**
 * Hook to check if user is on the correct network
 * 
 * Returns network status information for use in other components.
 */
export function useNetworkStatus() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending, error } = useSwitchChain();
  
  const expectedChain = getExpectedChain();
  const isSupported = isSupportedChain(chainId);
  const isCorrectNetwork = chainId === expectedChain.id;
  const needsSwitch = isConnected && !isCorrectNetwork;

  return {
    /** Current chain ID */
    chainId,
    /** Expected chain based on environment */
    expectedChain,
    /** Whether the current chain is in the supported list */
    isSupported,
    /** Whether user is on the expected network */
    isCorrectNetwork,
    /** Whether user needs to switch networks */
    needsSwitch,
    /** Whether a switch is in progress */
    isSwitching: isPending,
    /** Any error from the last switch attempt */
    switchError: error,
    /** Function to switch to the expected network */
    switchToExpected: () => switchChain({ chainId: expectedChain.id }),
    /** List of supported chain IDs */
    supportedChainIds: SUPPORTED_CHAIN_IDS,
  };
}

/**
 * Network Guard Component
 * 
 * Wraps content and shows network switch prompt if on wrong network.
 * Useful for protecting pages that require the correct network.
 */
export function NetworkGuard({ children }: { children: React.ReactNode }) {
  const { needsSwitch, isSupported } = useNetworkStatus();

  if (needsSwitch || !isSupported) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <NetworkSwitcher variant="banner" className="max-w-md" />
      </div>
    );
  }

  return <>{children}</>;
}
