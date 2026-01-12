"use client";

import * as React from "react";
import { WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Hook to detect online/offline network status
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = React.useState(true);

  React.useEffect(() => {
    // Set initial state based on navigator.onLine
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return { isOnline, isOffline: !isOnline };
}

interface OfflineIndicatorProps {
  className?: string;
}

/**
 * Offline indicator banner that appears when the user loses network connection.
 * Automatically shows/hides based on network status.
 * Validates: Requirements 9.5
 */
export function OfflineIndicator({ className }: OfflineIndicatorProps) {
  const { isOffline } = useNetworkStatus();
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    if (isOffline) {
      setShow(true);
    } else {
      // Delay hiding to allow for animation
      const timer = setTimeout(() => setShow(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOffline]);

  if (!show) return null;

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-[110] flex items-center justify-center gap-2 bg-yellow-600 px-4 py-2 text-sm font-medium text-white transition-transform duration-300",
        isOffline ? "translate-y-0" : "-translate-y-full",
        className
      )}
      role="alert"
      aria-live="assertive"
    >
      <WifiOff className="h-4 w-4" />
      <span>You&apos;re offline. Some features may not be available.</span>
    </div>
  );
}

/**
 * Wrapper component that adds offline indicator to the app.
 * Use this in the root layout or providers.
 */
export function OfflineIndicatorWrapper({ children }: { children: React.ReactNode }) {
  return (
    <>
      <OfflineIndicator />
      {children}
    </>
  );
}
