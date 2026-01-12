"use client";

import { useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { api, getAccessToken, getRefreshToken, setTokens, clearTokens } from "@/lib/api/client";
import { useAuthStore } from "./store";

// Token refresh interval (refresh 5 minutes before expiry, assuming 15 min token lifetime)
const TOKEN_REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes

export function useSession() {
  const { address, isConnected } = useAccount();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, logout: storeLogout } = useAuthStore();

  // Validate session on mount and periodically
  const { data: sessionValid, isLoading: isValidating } = useQuery({
    queryKey: ["session", "validate"],
    queryFn: async () => {
      const token = getAccessToken();
      if (!token) return false;

      try {
        // Try to fetch user orgs as a session validation
        await api.orgs.list();
        return true;
      } catch {
        return false;
      }
    },
    enabled: isAuthenticated && !!getAccessToken(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: TOKEN_REFRESH_INTERVAL,
    retry: false,
  });

  // Token refresh logic
  const refreshSession = useCallback(async (): Promise<boolean> => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      return false;
    }

    try {
      const response = await api.auth.refresh(refreshToken);
      setTokens(response.accessToken, response.refreshToken);
      return true;
    } catch {
      // Refresh failed, clear session
      clearTokens();
      storeLogout();
      return false;
    }
  }, [storeLogout]);

  // Handle session invalidation
  useEffect(() => {
    if (sessionValid === false && isAuthenticated) {
      // Session is invalid, try to refresh
      refreshSession().then((success) => {
        if (!success) {
          // Refresh failed, invalidate queries and logout
          queryClient.clear();
        }
      });
    }
  }, [sessionValid, isAuthenticated, refreshSession, queryClient]);

  // Handle wallet disconnect
  useEffect(() => {
    if (!isConnected && isAuthenticated) {
      clearTokens();
      storeLogout();
      queryClient.clear();
    }
  }, [isConnected, isAuthenticated, storeLogout, queryClient]);

  // Handle wallet address change
  useEffect(() => {
    if (user && address && user.walletAddress.toLowerCase() !== address.toLowerCase()) {
      clearTokens();
      storeLogout();
      queryClient.clear();
    }
  }, [address, user, storeLogout, queryClient]);

  // Logout function
  const logout = useCallback(async () => {
    try {
      const token = getAccessToken();
      if (token) {
        await api.auth.logout().catch(() => {
          // Ignore logout API errors
        });
      }
    } finally {
      clearTokens();
      storeLogout();
      queryClient.clear();
    }
  }, [storeLogout, queryClient]);

  return {
    user,
    isAuthenticated,
    isValidating,
    sessionValid,
    refreshSession,
    logout,
  };
}

// Hook to check if user has valid session on protected pages
export function useRequireAuth(redirectTo: string = "/auth") {
  const { isAuthenticated, isValidating } = useSession();
  const { isConnected } = useAccount();

  useEffect(() => {
    // Wait for validation to complete
    if (isValidating) return;

    // If not authenticated or not connected, redirect
    if (!isAuthenticated || !isConnected) {
      if (typeof window !== "undefined") {
        window.location.href = redirectTo;
      }
    }
  }, [isAuthenticated, isConnected, isValidating, redirectTo]);

  return {
    isLoading: isValidating,
    isAuthenticated: isAuthenticated && isConnected,
  };
}
