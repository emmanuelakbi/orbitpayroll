"use client";

import { useCallback, useEffect } from "react";
import { useAccount, useSignMessage, useDisconnect } from "wagmi";
import { useMutation } from "@tanstack/react-query";
import { SiweMessage } from "siwe";
import { api, setTokens, clearTokens, getAccessToken } from "@/lib/api/client";
import { useAuthStore } from "./store";

// Connection state type for UI
export type ConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "signing"
  | "authenticated"
  | "error";

export function useAuth() {
  const { address, isConnected, isConnecting } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { disconnect: wagmiDisconnect } = useDisconnect();

  const {
    isAuthenticated,
    user,
    isLoading,
    setUser,
    setLoading,
    logout: storeLogout,
  } = useAuthStore();

  // Get nonce mutation
  const getNonceMutation = useMutation({
    mutationFn: (walletAddress: string) => api.auth.getNonce(walletAddress),
  });

  // Verify signature mutation
  const verifyMutation = useMutation({
    mutationFn: (data: { message: string; signature: string }) =>
      api.auth.verify(data),
    onSuccess: (data) => {
      setTokens(data.accessToken, data.refreshToken);
      setUser(data.user);
    },
  });

  // SIWE authentication flow
  const authenticate = useCallback(async () => {
    if (!address) {
      throw new Error("No wallet connected");
    }

    setLoading(true);

    try {
      // Step 1: Get nonce from backend
      const { nonce } = await getNonceMutation.mutateAsync(address);

      // Step 2: Create SIWE message
      const message = new SiweMessage({
        domain: window.location.host,
        address,
        statement: "Sign in to OrbitPayroll",
        uri: window.location.origin,
        version: "1",
        chainId: 1, // Mainnet
        nonce,
      });

      const messageToSign = message.prepareMessage();

      // Step 3: Request signature from wallet
      const signature = await signMessageAsync({ message: messageToSign });

      // Step 4: Verify signature with backend
      await verifyMutation.mutateAsync({
        message: messageToSign,
        signature,
      });

      return true;
    } catch (error) {
      // Clear any partial state on error
      clearTokens();
      storeLogout();
      throw error;
    } finally {
      setLoading(false);
    }
  }, [
    address,
    getNonceMutation,
    signMessageAsync,
    verifyMutation,
    setLoading,
    storeLogout,
  ]);

  // Logout function
  const logout = useCallback(async () => {
    try {
      // Call backend logout if we have a token
      if (getAccessToken()) {
        await api.auth.logout().catch(() => {
          // Ignore logout errors - we're clearing local state anyway
        });
      }
    } finally {
      // Always clear local state
      clearTokens();
      storeLogout();
      wagmiDisconnect();
    }
  }, [storeLogout, wagmiDisconnect]);

  // Derive connection state for UI
  const getConnectionState = useCallback((): ConnectionState => {
    if (isLoading || getNonceMutation.isPending || verifyMutation.isPending) {
      return "signing";
    }
    if (isConnecting) {
      return "connecting";
    }
    if (isAuthenticated && isConnected) {
      return "authenticated";
    }
    if (isConnected && !isAuthenticated) {
      return "connected";
    }
    if (getNonceMutation.isError || verifyMutation.isError) {
      return "error";
    }
    return "disconnected";
  }, [
    isLoading,
    isConnecting,
    isConnected,
    isAuthenticated,
    getNonceMutation.isPending,
    getNonceMutation.isError,
    verifyMutation.isPending,
    verifyMutation.isError,
  ]);

  // Check if user disconnected wallet while authenticated
  useEffect(() => {
    if (!isConnected && isAuthenticated) {
      // Wallet disconnected, clear auth state
      clearTokens();
      storeLogout();
    }
  }, [isConnected, isAuthenticated, storeLogout]);

  // Check if wallet address changed
  useEffect(() => {
    if (user && address && user.walletAddress.toLowerCase() !== address.toLowerCase()) {
      // Different wallet connected, clear auth state
      clearTokens();
      storeLogout();
    }
  }, [address, user, storeLogout]);

  return {
    // State
    address,
    isConnected,
    isConnecting,
    isAuthenticated,
    user,
    isLoading,
    connectionState: getConnectionState(),

    // Errors
    error: getNonceMutation.error || verifyMutation.error,

    // Actions
    authenticate,
    logout,

    // Mutation states for fine-grained control
    isGettingNonce: getNonceMutation.isPending,
    isVerifying: verifyMutation.isPending,
  };
}

// Format wallet address for display
export function formatAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
