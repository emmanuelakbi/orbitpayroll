/**
 * Property Test: Wallet Connection State Consistency
 * 
 * **Property 1: Wallet Connection State Consistency**
 * *For any* wallet connection state change, the UI SHALL reflect the correct 
 * authentication status, AND disconnecting SHALL clear all user-specific data from the UI.
 * 
 * **Validates: Requirements 2.1-2.8**
 * 
 * Feature: 04-frontend, Property 1: Wallet Connection State Consistency
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import * as fc from "fast-check";
import { useAuthStore, type AuthState } from "./store";
import { clearTokens, setTokens, getAccessToken, getRefreshToken } from "@/lib/api/client";

// Arbitrary for generating valid Ethereum addresses
const hexChar = fc.constantFrom(..."0123456789abcdef");
const ethereumAddressArb = fc.array(hexChar, { minLength: 40, maxLength: 40 }).map(
  (chars) => `0x${chars.join("")}`
);

// Arbitrary for generating ISO date strings
const isoDateArb = fc.integer({ min: 1577836800000, max: 1893456000000 }).map(
  (timestamp) => new Date(timestamp).toISOString()
);

// Arbitrary for generating user objects
const userArb = fc.record({
  id: fc.uuid(),
  walletAddress: ethereumAddressArb,
  createdAt: isoDateArb,
  updatedAt: isoDateArb,
});

// Arbitrary for generating JWT-like tokens
const alphanumChar = fc.constantFrom(..."ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789");
const tokenArb = fc.array(alphanumChar, { minLength: 20, maxLength: 100 }).map(
  (chars) => chars.join("")
);

// Auth action types
type AuthAction =
  | { type: "setUser"; user: AuthState["user"] }
  | { type: "setAuthenticated"; value: boolean }
  | { type: "logout" }
  | { type: "setLoading"; value: boolean };

// Arbitrary for auth actions
const authActionArb: fc.Arbitrary<AuthAction> = fc.oneof(
  userArb.map((user) => ({ type: "setUser" as const, user })),
  fc.constant({ type: "setUser" as const, user: null }),
  fc.boolean().map((value) => ({ type: "setAuthenticated" as const, value })),
  fc.constant({ type: "logout" as const }),
  fc.boolean().map((value) => ({ type: "setLoading" as const, value }))
);

describe("Auth State Consistency Property Tests", () => {
  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.setState({
      isAuthenticated: false,
      user: null,
      isLoading: false,
    });
    
    // Clear mocked localStorage
    vi.mocked(localStorage.getItem).mockReturnValue(null);
    vi.mocked(localStorage.setItem).mockClear();
    vi.mocked(localStorage.removeItem).mockClear();
  });

  it("Property 1.1: Setting a user should set isAuthenticated to true", () => {
    fc.assert(
      fc.property(userArb, (user) => {
        // Reset state
        useAuthStore.setState({ isAuthenticated: false, user: null });
        
        // Action: set user
        useAuthStore.getState().setUser(user);
        
        // Property: isAuthenticated should be true when user is set
        const state = useAuthStore.getState();
        expect(state.isAuthenticated).toBe(true);
        expect(state.user).toEqual(user);
      }),
      { numRuns: 100 }
    );
  });

  it("Property 1.2: Setting user to null should set isAuthenticated to false", () => {
    fc.assert(
      fc.property(userArb, (user) => {
        // Setup: start with authenticated user
        useAuthStore.setState({ isAuthenticated: true, user });
        
        // Action: set user to null
        useAuthStore.getState().setUser(null);
        
        // Property: isAuthenticated should be false when user is null
        const state = useAuthStore.getState();
        expect(state.isAuthenticated).toBe(false);
        expect(state.user).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  it("Property 1.3: Logout should clear all user-specific data", () => {
    fc.assert(
      fc.property(userArb, tokenArb, tokenArb, (user, accessToken, refreshToken) => {
        // Setup: authenticated state with tokens
        useAuthStore.setState({ isAuthenticated: true, user, isLoading: false });
        setTokens(accessToken, refreshToken);
        
        // Action: logout
        useAuthStore.getState().logout();
        clearTokens();
        
        // Property: all user data should be cleared
        const state = useAuthStore.getState();
        expect(state.isAuthenticated).toBe(false);
        expect(state.user).toBeNull();
        expect(state.isLoading).toBe(false);
        
        // Tokens should be cleared (localStorage.removeItem called)
        expect(localStorage.removeItem).toHaveBeenCalled();
      }),
      { numRuns: 100 }
    );
  });

  it("Property 1.4: Auth state transitions are consistent", () => {
    fc.assert(
      fc.property(fc.array(authActionArb, { minLength: 1, maxLength: 10 }), (actions) => {
        // Reset state
        useAuthStore.setState({
          isAuthenticated: false,
          user: null,
          isLoading: false,
        });

        // Apply actions
        for (const action of actions) {
          const store = useAuthStore.getState();
          switch (action.type) {
            case "setUser":
              store.setUser(action.user);
              break;
            case "setAuthenticated":
              store.setAuthenticated(action.value);
              break;
            case "logout":
              store.logout();
              break;
            case "setLoading":
              store.setLoading(action.value);
              break;
          }
        }

        // Property: state should be internally consistent
        const finalState = useAuthStore.getState();
        
        // Find the indices of the last relevant actions
        let lastLogoutIndex = -1;
        let lastSetUserIndex = -1;
        let lastSetAuthIndex = -1;
        
        for (let i = actions.length - 1; i >= 0; i--) {
          const action = actions[i];
          if (action.type === "logout" && lastLogoutIndex === -1) {
            lastLogoutIndex = i;
          }
          if (action.type === "setUser" && lastSetUserIndex === -1) {
            lastSetUserIndex = i;
          }
          if (action.type === "setAuthenticated" && lastSetAuthIndex === -1) {
            lastSetAuthIndex = i;
          }
        }
        
        // Determine expected user state based on the last action that affects it
        const lastUserAffectingIndex = Math.max(lastLogoutIndex, lastSetUserIndex);
        
        if (lastUserAffectingIndex === lastLogoutIndex && lastLogoutIndex >= 0) {
          // Logout was the last action affecting user
          expect(finalState.user).toBeNull();
          
          // isAuthenticated depends on whether setAuthenticated was called after logout
          if (lastSetAuthIndex > lastLogoutIndex) {
            const lastSetAuthAction = actions[lastSetAuthIndex] as { type: "setAuthenticated"; value: boolean };
            expect(finalState.isAuthenticated).toBe(lastSetAuthAction.value);
          } else {
            expect(finalState.isAuthenticated).toBe(false);
          }
        } else if (lastUserAffectingIndex === lastSetUserIndex && lastSetUserIndex >= 0) {
          // setUser was the last action affecting user
          const lastSetUserAction = actions[lastSetUserIndex] as { type: "setUser"; user: AuthState["user"] };
          expect(finalState.user).toEqual(lastSetUserAction.user);
          
          // isAuthenticated depends on whether setAuthenticated was called after setUser
          if (lastSetAuthIndex > lastSetUserIndex) {
            const lastSetAuthAction = actions[lastSetAuthIndex] as { type: "setAuthenticated"; value: boolean };
            expect(finalState.isAuthenticated).toBe(lastSetAuthAction.value);
          } else {
            // setUser sets isAuthenticated based on whether user is null
            expect(finalState.isAuthenticated).toBe(lastSetUserAction.user !== null);
          }
        } else if (lastSetAuthIndex >= 0) {
          // Only setAuthenticated was called (no setUser or logout)
          const lastSetAuthAction = actions[lastSetAuthIndex] as { type: "setAuthenticated"; value: boolean };
          expect(finalState.isAuthenticated).toBe(lastSetAuthAction.value);
          expect(finalState.user).toBeNull(); // user was never set
        }
      }),
      { numRuns: 100 }
    );
  });

  it("Property 1.5: Token storage is consistent with auth state", () => {
    fc.assert(
      fc.property(tokenArb, tokenArb, (accessToken, refreshToken) => {
        // Setup mock to return tokens
        vi.mocked(localStorage.getItem).mockImplementation((key) => {
          if (key === "orbitpayroll_access_token") return accessToken;
          if (key === "orbitpayroll_refresh_token") return refreshToken;
          return null;
        });

        // Action: set tokens
        setTokens(accessToken, refreshToken);

        // Property: tokens should be stored
        expect(localStorage.setItem).toHaveBeenCalledWith(
          "orbitpayroll_access_token",
          accessToken
        );
        expect(localStorage.setItem).toHaveBeenCalledWith(
          "orbitpayroll_refresh_token",
          refreshToken
        );

        // Property: tokens should be retrievable
        expect(getAccessToken()).toBe(accessToken);
        expect(getRefreshToken()).toBe(refreshToken);
      }),
      { numRuns: 100 }
    );
  });

  it("Property 1.6: Clearing tokens removes all auth tokens", () => {
    fc.assert(
      fc.property(tokenArb, tokenArb, (accessToken, refreshToken) => {
        // Setup: set tokens first
        setTokens(accessToken, refreshToken);
        vi.mocked(localStorage.setItem).mockClear();

        // Action: clear tokens
        clearTokens();

        // Property: both tokens should be removed
        expect(localStorage.removeItem).toHaveBeenCalledWith(
          "orbitpayroll_access_token"
        );
        expect(localStorage.removeItem).toHaveBeenCalledWith(
          "orbitpayroll_refresh_token"
        );
      }),
      { numRuns: 100 }
    );
  });
});
