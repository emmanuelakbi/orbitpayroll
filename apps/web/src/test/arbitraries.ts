/**
 * Fast-check Arbitraries for OrbitPayroll Web Frontend Tests
 *
 * This module provides reusable arbitrary generators for property-based testing
 * of frontend components and logic.
 *
 * **Feature: 09-testing, Property Tests**
 * **Validates: Requirements 5.1, 5.2**
 */

import fc from "fast-check";

// =============================================================================
// Ethereum Address Arbitraries
// =============================================================================

/**
 * Generates valid Ethereum addresses (lowercase).
 */
export const ethereumAddressArb = fc
  .hexaString({ minLength: 40, maxLength: 40 })
  .map((hex) => `0x${hex.toLowerCase()}`);

/**
 * Generates checksummed Ethereum addresses.
 */
export const checksummedAddressArb = fc
  .hexaString({ minLength: 40, maxLength: 40 })
  .map((hex) => {
    // Simple checksum simulation (not actual EIP-55)
    const addr = `0x${hex}`;
    return addr.slice(0, 2) + addr.slice(2).toLowerCase();
  });

/**
 * Generates invalid Ethereum addresses for error testing.
 */
export const invalidAddressArb = fc.oneof(
  fc.constant("0x"),
  fc.constant("0x123"),
  fc.constant("not-an-address"),
  fc.hexaString({ minLength: 1, maxLength: 39 }).map((hex) => `0x${hex}`),
  fc.hexaString({ minLength: 41, maxLength: 50 }).map((hex) => `0x${hex}`),
);

// =============================================================================
// Monetary Value Arbitraries
// =============================================================================

/**
 * Generates valid MNEE token amounts as strings.
 */
export const mneeAmountArb = fc
  .tuple(
    fc.integer({ min: 0, max: 999999999 }),
    fc.integer({ min: 0, max: 99999999 }),
  )
  .map(([intPart, decPart]) => {
    const decStr = decPart.toString().padStart(8, "0");
    return `${intPart}.${decStr}`;
  });

/**
 * Generates positive MNEE amounts (non-zero).
 */
export const positiveMneeAmountArb = fc
  .tuple(
    fc.integer({ min: 1, max: 999999999 }),
    fc.integer({ min: 0, max: 99999999 }),
  )
  .map(([intPart, decPart]) => {
    const decStr = decPart.toString().padStart(8, "0");
    return `${intPart}.${decStr}`;
  });

/**
 * Generates BigInt amounts for contract interactions.
 */
export const bigIntAmountArb = fc
  .bigInt({ min: 1n, max: 10n ** 27n })
  .map((n) => n.toString());

// =============================================================================
// User Input Arbitraries
// =============================================================================

/**
 * Generates valid contractor names.
 */
export const contractorNameArb = fc
  .string({ minLength: 1, maxLength: 100 })
  .filter((s) => s.trim().length > 0);

/**
 * Generates valid organization names.
 */
export const orgNameArb = fc
  .string({ minLength: 1, maxLength: 100 })
  .filter((s) => s.trim().length > 0);

/**
 * Generates valid email addresses.
 */
export const emailArb = fc
  .tuple(
    fc.stringOf(fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz0123456789"), {
      minLength: 1,
      maxLength: 20,
    }),
    fc.constantFrom("example.com", "test.org", "mail.io"),
  )
  .map(([local, domain]) => `${local}@${domain}`);

/**
 * Generates invalid email addresses.
 */
export const invalidEmailArb = fc.oneof(
  fc.constant(""),
  fc.constant("notanemail"),
  fc.constant("@nodomain"),
  fc.constant("noat.com"),
  fc.string({ minLength: 1, maxLength: 10 }).filter((s) => !s.includes("@")),
);

// =============================================================================
// Pay Cycle Arbitraries
// =============================================================================

/**
 * Generates valid pay cycle values.
 */
export const payCycleArb = fc.constantFrom("WEEKLY", "BI_WEEKLY", "MONTHLY");

// =============================================================================
// Transaction Arbitraries
// =============================================================================

/**
 * Generates valid transaction hashes.
 */
export const txHashArb = fc
  .hexaString({ minLength: 64, maxLength: 64 })
  .map((hex) => `0x${hex}`);

/**
 * Generates transaction status values.
 */
export const txStatusArb = fc.constantFrom("pending", "confirmed", "failed");

// =============================================================================
// Payroll Arbitraries
// =============================================================================

/**
 * Generates payroll run status values.
 */
export const payrollStatusArb = fc.constantFrom(
  "PENDING",
  "EXECUTED",
  "FAILED",
);

/**
 * Generates a contractor object for testing.
 */
export const contractorArb = fc.record({
  id: fc.uuid(),
  name: contractorNameArb,
  walletAddress: ethereumAddressArb,
  rateAmount: positiveMneeAmountArb,
  payCycle: payCycleArb,
  email: fc.option(emailArb, { nil: undefined }),
  active: fc.boolean(),
});

/**
 * Generates a list of contractors.
 */
export const contractorListArb = fc.array(contractorArb, {
  minLength: 0,
  maxLength: 20,
});

/**
 * Generates a payroll item for testing.
 */
export const payrollItemArb = fc.record({
  id: fc.uuid(),
  contractorId: fc.uuid(),
  contractorName: contractorNameArb,
  walletAddress: ethereumAddressArb,
  amountMnee: positiveMneeAmountArb,
  status: fc.constantFrom("PENDING", "PAID", "FAILED"),
});

/**
 * Generates a payroll run for testing.
 */
export const payrollRunArb = fc.record({
  id: fc.uuid(),
  runLabel: fc.option(fc.string({ minLength: 1, maxLength: 100 }), {
    nil: undefined,
  }),
  totalMnee: positiveMneeAmountArb,
  status: payrollStatusArb,
  txHash: fc.option(txHashArb, { nil: undefined }),
  createdAt: fc.date().map((d) => d.toISOString()),
  items: fc.array(payrollItemArb, { minLength: 1, maxLength: 10 }),
});

// =============================================================================
// Treasury Arbitraries
// =============================================================================

/**
 * Generates treasury balance data.
 */
export const treasuryBalanceArb = fc.record({
  balance: bigIntAmountArb,
  formattedBalance: positiveMneeAmountArb,
  lastUpdated: fc.date().map((d) => d.toISOString()),
});

/**
 * Generates a treasury transaction.
 */
export const treasuryTransactionArb = fc.record({
  id: fc.uuid(),
  type: fc.constantFrom("DEPOSIT", "WITHDRAWAL", "PAYROLL"),
  amount: positiveMneeAmountArb,
  txHash: txHashArb,
  status: txStatusArb,
  timestamp: fc.date().map((d) => d.toISOString()),
});

// =============================================================================
// Error Message Arbitraries
// =============================================================================

/**
 * Generates API error responses.
 */
export const apiErrorArb = fc.record({
  code: fc.constantFrom(
    "AUTH_001",
    "AUTH_002",
    "ORG_001",
    "ORG_002",
    "PAY_001",
    "PAY_002",
  ),
  message: fc.string({ minLength: 10, maxLength: 200 }),
  details: fc.option(fc.object(), { nil: undefined }),
});

// =============================================================================
// Form Input Arbitraries
// =============================================================================

/**
 * Generates contractor form input data.
 */
export const contractorFormInputArb = fc.record({
  name: contractorNameArb,
  walletAddress: ethereumAddressArb,
  rateAmount: positiveMneeAmountArb,
  payCycle: payCycleArb,
  email: fc.option(emailArb, { nil: "" }),
});

/**
 * Generates invalid contractor form input for validation testing.
 */
export const invalidContractorFormInputArb = fc.oneof(
  fc.record({
    name: fc.constant(""),
    walletAddress: ethereumAddressArb,
    rateAmount: positiveMneeAmountArb,
    payCycle: payCycleArb,
  }),
  fc.record({
    name: contractorNameArb,
    walletAddress: invalidAddressArb,
    rateAmount: positiveMneeAmountArb,
    payCycle: payCycleArb,
  }),
  fc.record({
    name: contractorNameArb,
    walletAddress: ethereumAddressArb,
    rateAmount: fc.constant("0"),
    payCycle: payCycleArb,
  }),
);
