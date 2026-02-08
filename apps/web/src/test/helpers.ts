/**
 * Test Helpers for OrbitPayroll Web Frontend Tests
 *
 * This module provides utility functions for testing React components,
 * mocking API responses, and common test operations.
 *
 * **Feature: 09-testing**
 * **Validates: Requirements 4.1, 7.1, 7.2**
 */

import { vi } from "vitest";

// =============================================================================
// Mock Data Generators
// =============================================================================

/**
 * Creates a mock user object.
 */
export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: "user-123",
    walletAddress: "0x" + "1".repeat(40),
    email: "test@example.com",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

interface MockUser {
  id: string;
  walletAddress: string;
  email?: string;
  createdAt: string;
}

/**
 * Creates a mock organization object.
 */
export function createMockOrg(overrides: Partial<MockOrg> = {}): MockOrg {
  return {
    id: "org-123",
    name: "Test Organization",
    treasuryAddress: "0x" + "2".repeat(40),
    ownerId: "user-123",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

interface MockOrg {
  id: string;
  name: string;
  treasuryAddress: string;
  ownerId: string;
  createdAt: string;
}

/**
 * Creates a mock contractor object.
 */
export function createMockContractor(
  overrides: Partial<MockContractor> = {},
): MockContractor {
  return {
    id: "contractor-123",
    orgId: "org-123",
    name: "Test Contractor",
    walletAddress: "0x" + "3".repeat(40),
    rateAmount: "1000.00000000",
    payCycle: "MONTHLY",
    active: true,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

interface MockContractor {
  id: string;
  orgId: string;
  name: string;
  walletAddress: string;
  rateAmount: string;
  payCycle: "WEEKLY" | "BI_WEEKLY" | "MONTHLY";
  email?: string;
  active: boolean;
  createdAt: string;
}

/**
 * Creates a mock payroll run object.
 */
export function createMockPayrollRun(
  overrides: Partial<MockPayrollRun> = {},
): MockPayrollRun {
  return {
    id: "payroll-123",
    orgId: "org-123",
    runLabel: "January 2026 Payroll",
    totalMnee: "3000.00000000",
    status: "PENDING",
    createdAt: new Date().toISOString(),
    items: [],
    ...overrides,
  };
}

interface MockPayrollRun {
  id: string;
  orgId: string;
  runLabel?: string;
  totalMnee: string;
  status: "PENDING" | "EXECUTED" | "FAILED";
  txHash?: string;
  createdAt: string;
  items: MockPayrollItem[];
}

interface MockPayrollItem {
  id: string;
  payrollRunId: string;
  contractorId?: string;
  contractorName?: string;
  walletAddress?: string;
  amountMnee: string;
  status: "PENDING" | "PAID" | "FAILED";
}

// =============================================================================
// API Mock Helpers
// =============================================================================

/**
 * Creates a mock fetch response.
 */
export function createMockResponse<T>(data: T, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    headers: new Headers(),
    redirected: false,
    type: "basic",
    url: "",
    clone: () => createMockResponse(data, status),
    body: null,
    bodyUsed: false,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new Blob()),
    formData: () => Promise.resolve(new FormData()),
  } as Response;
}

/**
 * Creates a mock error response.
 */
export function createMockErrorResponse(
  code: string,
  message: string,
  status = 400,
): Response {
  return createMockResponse({ code, message }, status);
}

/**
 * Mocks the global fetch function.
 */
export function mockFetch(responses: Map<string, Response>): void {
  global.fetch = vi.fn((url: string | URL | Request) => {
    const urlString = typeof url === "string" ? url : url.toString();
    const response = responses.get(urlString);
    if (response) {
      return Promise.resolve(response);
    }
    return Promise.reject(new Error(`No mock for ${urlString}`));
  }) as typeof fetch;
}

/**
 * Resets fetch mock.
 */
export function resetFetchMock(): void {
  vi.restoreAllMocks();
}

// =============================================================================
// Wallet Mock Helpers
// =============================================================================

/**
 * Creates a mock wallet connection state.
 */
export function createMockWalletState(
  overrides: Partial<MockWalletState> = {},
): MockWalletState {
  return {
    isConnected: false,
    address: undefined,
    chainId: undefined,
    isConnecting: false,
    ...overrides,
  };
}

interface MockWalletState {
  isConnected: boolean;
  address?: string;
  chainId?: number;
  isConnecting: boolean;
}

/**
 * Creates a connected wallet state.
 */
export function createConnectedWalletState(
  address = "0x" + "1".repeat(40),
  chainId = 11155111,
): MockWalletState {
  return {
    isConnected: true,
    address,
    chainId,
    isConnecting: false,
  };
}

// =============================================================================
// Assertion Helpers
// =============================================================================

/**
 * Checks if a value is a valid UUID.
 */
export function isValidUUID(value: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Checks if a value is a valid Ethereum address.
 */
export function isValidEthereumAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

/**
 * Checks if a value is a valid transaction hash.
 */
export function isValidTxHash(value: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(value);
}

/**
 * Formats a number as MNEE with proper decimals.
 */
export function formatMnee(amount: string | number): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
  });
}

// =============================================================================
// Wait Helpers
// =============================================================================

/**
 * Waits for a specified number of milliseconds.
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Waits for the next tick of the event loop.
 */
export function nextTick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// =============================================================================
// Test Data Constants
// =============================================================================

export const TEST_ADDRESSES = {
  owner: "0x" + "1".repeat(40),
  operator: "0x" + "2".repeat(40),
  contractor1: "0x" + "3".repeat(40),
  contractor2: "0x" + "4".repeat(40),
  treasury: "0x" + "5".repeat(40),
  nonMember: "0x" + "6".repeat(40),
};

export const TEST_TX_HASHES = {
  deposit: "0x" + "a".repeat(64),
  payroll: "0x" + "b".repeat(64),
  withdrawal: "0x" + "c".repeat(64),
};
