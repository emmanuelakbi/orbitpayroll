"use client";

import * as React from "react";
import Image from "next/image";
import { ConnectButton as RainbowConnectButton } from "@rainbow-me/rainbowkit";
import { Button } from "@/components/ui/button";
import { useAuth, formatAddress } from "@/lib/auth";
import { useNetworkStatus } from "@/components/ui/network-switcher";
import { Loader2, Wallet, LogOut, ChevronDown, AlertTriangle, RefreshCw } from "lucide-react";

interface ConnectButtonProps {
  className?: string;
}

/**
 * Network Switch Button Component
 * 
 * Shows a button to switch networks when user is on wrong network.
 * Requirements 5.5, 5.6: Detect wrong network and prompt user to switch
 */
function NetworkSwitchButton() {
  const { needsSwitch, isSupported, expectedChain, switchToExpected, isSwitching } = useNetworkStatus();

  if (!needsSwitch && isSupported) {
    return null;
  }

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={switchToExpected}
      disabled={isSwitching}
    >
      {isSwitching ? (
        <>
          <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
          Switching...
        </>
      ) : (
        <>
          <AlertTriangle className="mr-2 h-3 w-3" />
          Switch to {expectedChain.name}
        </>
      )}
    </Button>
  );
}

export function ConnectButton({
  className,
}: ConnectButtonProps) {
  const {
    address,
    isConnected,
    isAuthenticated,
    connectionState,
    authenticate,
    logout,
    error,
  } = useAuth();

  const [showDropdown, setShowDropdown] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle sign in after wallet connection
  const handleSignIn = React.useCallback(async () => {
    try {
      await authenticate();
    } catch (err) {
      // Error is handled by the hook
      console.error("Authentication failed:", err);
    }
  }, [authenticate]);

  // If not connected, show RainbowKit connect button
  if (!isConnected) {
    return (
      <RainbowConnectButton.Custom>
        {({ openConnectModal, connectModalOpen }) => (
          <Button
            onClick={openConnectModal}
            disabled={connectModalOpen}
            className={className}
          >
            {connectModalOpen ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Wallet className="mr-2 h-4 w-4" />
                Connect Wallet
              </>
            )}
          </Button>
        )}
      </RainbowConnectButton.Custom>
    );
  }

  // Connected but not authenticated - show sign in button
  if (isConnected && !isAuthenticated) {
    const isSigning = connectionState === "signing";

    return (
      <div className="flex items-center gap-2">
        <NetworkSwitchButton />

        <Button
          onClick={handleSignIn}
          disabled={isSigning}
          className={className}
        >
          {isSigning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing...
            </>
          ) : error ? (
            "Retry Sign In"
          ) : (
            "Sign In"
          )}
        </Button>

        <RainbowConnectButton.Custom>
          {({ openAccountModal }) => (
            <Button
              variant="outline"
              size="sm"
              onClick={openAccountModal}
              title={address}
            >
              {formatAddress(address || "")}
            </Button>
          )}
        </RainbowConnectButton.Custom>
      </div>
    );
  }

  // Fully authenticated - show account dropdown
  return (
    <div className="relative" ref={dropdownRef}>
      <RainbowConnectButton.Custom>
        {({ chain, openChainModal }) => (
          <div className="flex items-center gap-2">
            {/* Network switch button if on wrong network */}
            <NetworkSwitchButton />

            {/* Chain indicator */}
            {chain && !chain.unsupported && (
              <Button
                variant="outline"
                size="sm"
                onClick={openChainModal}
                className="hidden sm:flex"
              >
                {chain.hasIcon && chain.iconUrl && (
                  <Image
                    src={chain.iconUrl}
                    alt={chain.name ?? "Chain"}
                    width={16}
                    height={16}
                    className="mr-2"
                  />
                )}
                {chain.name}
              </Button>
            )}

            {/* Account button */}
            <Button
              variant="outline"
              onClick={() => setShowDropdown(!showDropdown)}
              className={className}
            >
              <Wallet className="mr-2 h-4 w-4" />
              {formatAddress(address || "")}
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </RainbowConnectButton.Custom>

      {/* Dropdown menu */}
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-popover border border-border z-50">
          <div className="py-1">
            <div className="px-4 py-2 text-sm text-muted-foreground border-b border-border">
              Connected as
              <div className="font-mono text-foreground truncate">
                {formatAddress(address || "")}
              </div>
            </div>

            <RainbowConnectButton.Custom>
              {({ openAccountModal }) => (
                <button
                  onClick={() => {
                    openAccountModal();
                    setShowDropdown(false);
                  }}
                  className="w-full px-4 py-2 text-sm text-left hover:bg-accent transition-colors"
                >
                  View Account
                </button>
              )}
            </RainbowConnectButton.Custom>

            <button
              onClick={() => {
                logout();
                setShowDropdown(false);
              }}
              className="w-full px-4 py-2 text-sm text-left text-destructive hover:bg-accent transition-colors flex items-center"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
