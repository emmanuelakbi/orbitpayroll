/**
 * Test Fixtures for OrbitPayroll Web Frontend Tests
 *
 * This module provides deterministic test fixtures for consistent, reproducible tests.
 * All fixtures use predefined data (not random) to ensure test reproducibility.
 *
 * **Feature: 09-testing**
 * **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6**
 */

// =============================================================================
// User Fixtures
// =============================================================================

/**
 * Deterministic user fixtures for frontend testing.
 */
export const USER_FIXTURES = {
  /** Organization owner with full admin privileges */
  owner: {
    id: "user-owner-001",
    walletAddress: "0x1111111111111111111111111111111111111111",
    email: "owner@orbitpayroll.test",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  /** Finance operator with limited privileges */
  operator: {
    id: "user-operator-001",
    walletAddress: "0x2222222222222222222222222222222222222222",
    email: "operator@orbitpayroll.test",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  /** User not belonging to any organization */
  nonMember: {
    id: "user-nonmember-001",
    walletAddress: "0x3333333333333333333333333333333333333333",
    email: "nonmember@orbitpayroll.test",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  /** User without email (wallet-only auth) */
  walletOnly: {
    id: "user-walletonly-001",
    walletAddress: "0x4444444444444444444444444444444444444444",
    email: undefined,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
} as const;

export type UserFixtureKey = keyof typeof USER_FIXTURES;
export type UserFixture = (typeof USER_FIXTURES)[UserFixtureKey];

// =============================================================================
// Organization Fixtures
// =============================================================================

/**
 * Deterministic organization fixtures for frontend testing.
 */
export const ORG_FIXTURES = {
  /** Primary test organization */
  primary: {
    id: "org-primary-001",
    name: "Acme Test Corp",
    treasuryAddress: "0xaaaa111111111111111111111111111111111111",
    ownerId: USER_FIXTURES.owner.id,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  /** Secondary organization for multi-org testing */
  secondary: {
    id: "org-secondary-001",
    name: "Beta Test Inc",
    treasuryAddress: "0xbbbb222222222222222222222222222222222222",
    ownerId: USER_FIXTURES.owner.id,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
} as const;

export type OrgFixtureKey = keyof typeof ORG_FIXTURES;
export type OrgFixture = (typeof ORG_FIXTURES)[OrgFixtureKey];

// =============================================================================
// Contractor Fixtures
// =============================================================================

/**
 * Pay cycle type for frontend.
 */
export type PayCycle = "WEEKLY" | "BI_WEEKLY" | "MONTHLY";

/**
 * Deterministic contractor fixtures for frontend testing.
 */
export const CONTRACTOR_FIXTURES = {
  /** Monthly contractor with standard rate */
  monthly: {
    id: "contractor-monthly-001",
    orgId: ORG_FIXTURES.primary.id,
    name: "Monthly Developer",
    walletAddress: "0xc001111111111111111111111111111111111111",
    rateAmount: "5000.00000000",
    payCycle: "MONTHLY" as PayCycle,
    email: "monthly@contractor.test",
    active: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  /** Bi-weekly contractor */
  biweekly: {
    id: "contractor-biweekly-001",
    orgId: ORG_FIXTURES.primary.id,
    name: "Biweekly Designer",
    walletAddress: "0xc002222222222222222222222222222222222222",
    rateAmount: "2500.00000000",
    payCycle: "BI_WEEKLY" as PayCycle,
    email: "biweekly@contractor.test",
    active: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  /** Weekly contractor */
  weekly: {
    id: "contractor-weekly-001",
    orgId: ORG_FIXTURES.primary.id,
    name: "Weekly Consultant",
    walletAddress: "0xc003333333333333333333333333333333333333",
    rateAmount: "1000.00000000",
    payCycle: "WEEKLY" as PayCycle,
    email: undefined,
    active: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  /** Inactive (archived) contractor */
  inactive: {
    id: "contractor-inactive-001",
    orgId: ORG_FIXTURES.primary.id,
    name: "Former Contractor",
    walletAddress: "0xc004444444444444444444444444444444444444",
    rateAmount: "3000.00000000",
    payCycle: "MONTHLY" as PayCycle,
    email: "former@contractor.test",
    active: false,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  /** High-value contractor for edge case testing */
  highValue: {
    id: "contractor-highvalue-001",
    orgId: ORG_FIXTURES.primary.id,
    name: "Senior Architect",
    walletAddress: "0xc005555555555555555555555555555555555555",
    rateAmount: "25000.00000000",
    payCycle: "MONTHLY" as PayCycle,
    email: "architect@contractor.test",
    active: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
} as const;

export type ContractorFixtureKey = keyof typeof CONTRACTOR_FIXTURES;
export type ContractorFixture =
  (typeof CONTRACTOR_FIXTURES)[ContractorFixtureKey];

// =============================================================================
// Payroll Run Fixtures
// =============================================================================

/**
 * Payroll status type for frontend.
 */
export type PayrollStatus = "PENDING" | "EXECUTED" | "FAILED";

/**
 * Deterministic payroll run fixtures for frontend testing.
 */
export const PAYROLL_RUN_FIXTURES = {
  /** Completed payroll run */
  completed: {
    id: "payroll-completed-001",
    orgId: ORG_FIXTURES.primary.id,
    runLabel: "January 2026 Payroll",
    totalMnee: "8500.00000000",
    status: "EXECUTED" as PayrollStatus,
    txHash:
      "0xabcd111111111111111111111111111111111111111111111111111111111111",
    createdAt: "2026-01-15T00:00:00.000Z",
    items: [
      {
        id: "item-1",
        payrollRunId: "payroll-completed-001",
        contractorId: CONTRACTOR_FIXTURES.monthly.id,
        contractorName: CONTRACTOR_FIXTURES.monthly.name,
        walletAddress: CONTRACTOR_FIXTURES.monthly.walletAddress,
        amountMnee: "5000.00000000",
        status: "PAID" as const,
      },
      {
        id: "item-2",
        payrollRunId: "payroll-completed-001",
        contractorId: CONTRACTOR_FIXTURES.biweekly.id,
        contractorName: CONTRACTOR_FIXTURES.biweekly.name,
        walletAddress: CONTRACTOR_FIXTURES.biweekly.walletAddress,
        amountMnee: "2500.00000000",
        status: "PAID" as const,
      },
      {
        id: "item-3",
        payrollRunId: "payroll-completed-001",
        contractorId: CONTRACTOR_FIXTURES.weekly.id,
        contractorName: CONTRACTOR_FIXTURES.weekly.name,
        walletAddress: CONTRACTOR_FIXTURES.weekly.walletAddress,
        amountMnee: "1000.00000000",
        status: "PAID" as const,
      },
    ],
  },
  /** Pending payroll run */
  pending: {
    id: "payroll-pending-001",
    orgId: ORG_FIXTURES.primary.id,
    runLabel: "February 2026 Payroll",
    totalMnee: "8500.00000000",
    status: "PENDING" as PayrollStatus,
    txHash: undefined,
    createdAt: "2026-02-01T00:00:00.000Z",
    items: [
      {
        id: "item-4",
        payrollRunId: "payroll-pending-001",
        contractorId: CONTRACTOR_FIXTURES.monthly.id,
        contractorName: CONTRACTOR_FIXTURES.monthly.name,
        walletAddress: CONTRACTOR_FIXTURES.monthly.walletAddress,
        amountMnee: "5000.00000000",
        status: "PENDING" as const,
      },
      {
        id: "item-5",
        payrollRunId: "payroll-pending-001",
        contractorId: CONTRACTOR_FIXTURES.biweekly.id,
        contractorName: CONTRACTOR_FIXTURES.biweekly.name,
        walletAddress: CONTRACTOR_FIXTURES.biweekly.walletAddress,
        amountMnee: "2500.00000000",
        status: "PENDING" as const,
      },
    ],
  },
  /** Processing payroll run */
  processing: {
    id: "payroll-processing-001",
    orgId: ORG_FIXTURES.primary.id,
    runLabel: "Processing Payroll",
    totalMnee: "5000.00000000",
    status: "PENDING" as PayrollStatus,
    txHash:
      "0xef01111111111111111111111111111111111111111111111111111111111111",
    createdAt: "2026-01-20T00:00:00.000Z",
    items: [
      {
        id: "item-6",
        payrollRunId: "payroll-processing-001",
        contractorId: CONTRACTOR_FIXTURES.monthly.id,
        contractorName: CONTRACTOR_FIXTURES.monthly.name,
        walletAddress: CONTRACTOR_FIXTURES.monthly.walletAddress,
        amountMnee: "5000.00000000",
        status: "PENDING" as const,
      },
    ],
  },
  /** Failed payroll run */
  failed: {
    id: "payroll-failed-001",
    orgId: ORG_FIXTURES.primary.id,
    runLabel: "Failed Payroll",
    totalMnee: "5000.00000000",
    status: "FAILED" as PayrollStatus,
    txHash: undefined,
    createdAt: "2026-01-10T00:00:00.000Z",
    items: [
      {
        id: "item-7",
        payrollRunId: "payroll-failed-001",
        contractorId: CONTRACTOR_FIXTURES.monthly.id,
        contractorName: CONTRACTOR_FIXTURES.monthly.name,
        walletAddress: CONTRACTOR_FIXTURES.monthly.walletAddress,
        amountMnee: "5000.00000000",
        status: "FAILED" as const,
      },
    ],
  },
} as const;

export type PayrollRunFixtureKey = keyof typeof PAYROLL_RUN_FIXTURES;
export type PayrollRunFixture =
  (typeof PAYROLL_RUN_FIXTURES)[PayrollRunFixtureKey];

// =============================================================================
// Treasury Fixtures
// =============================================================================

/**
 * Deterministic treasury fixtures for frontend testing.
 */
export const TREASURY_FIXTURES = {
  /** Treasury with sufficient balance */
  sufficient: {
    address: ORG_FIXTURES.primary.treasuryAddress,
    balance: "100000000000000000000000", // 100,000 MNEE in wei
    formattedBalance: "100000.00000000",
    lastUpdated: "2026-01-15T12:00:00.000Z",
  },
  /** Treasury with low balance */
  low: {
    address: ORG_FIXTURES.primary.treasuryAddress,
    balance: "1000000000000000000000", // 1,000 MNEE in wei
    formattedBalance: "1000.00000000",
    lastUpdated: "2026-01-15T12:00:00.000Z",
  },
  /** Treasury with zero balance */
  empty: {
    address: ORG_FIXTURES.primary.treasuryAddress,
    balance: "0",
    formattedBalance: "0.00000000",
    lastUpdated: "2026-01-15T12:00:00.000Z",
  },
} as const;

export type TreasuryFixtureKey = keyof typeof TREASURY_FIXTURES;
export type TreasuryFixture = (typeof TREASURY_FIXTURES)[TreasuryFixtureKey];

// =============================================================================
// Transaction Fixtures
// =============================================================================

/**
 * Deterministic transaction fixtures for frontend testing.
 */
export const TRANSACTION_FIXTURES = {
  /** Confirmed deposit transaction */
  confirmedDeposit: {
    id: "tx-deposit-001",
    type: "DEPOSIT" as const,
    amount: "10000.00000000",
    txHash:
      "0xdep1111111111111111111111111111111111111111111111111111111111111",
    status: "confirmed" as const,
    timestamp: "2026-01-10T10:00:00.000Z",
  },
  /** Pending withdrawal transaction */
  pendingWithdrawal: {
    id: "tx-withdrawal-001",
    type: "WITHDRAWAL" as const,
    amount: "5000.00000000",
    txHash:
      "0xwith111111111111111111111111111111111111111111111111111111111111",
    status: "pending" as const,
    timestamp: "2026-01-15T14:00:00.000Z",
  },
  /** Confirmed payroll transaction */
  confirmedPayroll: {
    id: "tx-payroll-001",
    type: "PAYROLL" as const,
    amount: "8500.00000000",
    txHash: PAYROLL_RUN_FIXTURES.completed.txHash,
    status: "confirmed" as const,
    timestamp: "2026-01-15T10:30:00.000Z",
  },
  /** Failed transaction */
  failedTransaction: {
    id: "tx-failed-001",
    type: "PAYROLL" as const,
    amount: "5000.00000000",
    txHash:
      "0xfail111111111111111111111111111111111111111111111111111111111111",
    status: "failed" as const,
    timestamp: "2026-01-10T09:00:00.000Z",
  },
} as const;

export type TransactionFixtureKey = keyof typeof TRANSACTION_FIXTURES;
export type TransactionFixture =
  (typeof TRANSACTION_FIXTURES)[TransactionFixtureKey];

// =============================================================================
// Notification Fixtures
// =============================================================================

/**
 * Deterministic notification fixtures for frontend testing.
 */
export const NOTIFICATION_FIXTURES = {
  /** Unread payroll notification */
  unreadPayroll: {
    id: "notif-unread-001",
    userId: USER_FIXTURES.owner.id,
    orgId: ORG_FIXTURES.primary.id,
    type: "PAYROLL_COMPLETE",
    title: "Payroll Executed",
    message: "January 2026 payroll has been executed successfully.",
    read: false,
    createdAt: "2026-01-15T10:30:00.000Z",
  },
  /** Read notification */
  readNotification: {
    id: "notif-read-001",
    userId: USER_FIXTURES.owner.id,
    orgId: ORG_FIXTURES.primary.id,
    type: "MEMBER_ADDED",
    title: "New Team Member",
    message: "A new finance operator has joined your organization.",
    read: true,
    createdAt: "2026-01-10T09:00:00.000Z",
  },
  /** Low balance warning */
  lowBalanceWarning: {
    id: "notif-warning-001",
    userId: USER_FIXTURES.owner.id,
    orgId: ORG_FIXTURES.primary.id,
    type: "LOW_BALANCE",
    title: "Low Treasury Balance",
    message: "Your treasury balance is below the recommended threshold.",
    read: false,
    createdAt: "2026-01-14T16:00:00.000Z",
  },
} as const;

export type NotificationFixtureKey = keyof typeof NOTIFICATION_FIXTURES;
export type NotificationFixture =
  (typeof NOTIFICATION_FIXTURES)[NotificationFixtureKey];

// =============================================================================
// Fixture Collections
// =============================================================================

/**
 * All user fixtures as an array.
 */
export const ALL_USER_FIXTURES = Object.values(USER_FIXTURES);

/**
 * All org fixtures as an array.
 */
export const ALL_ORG_FIXTURES = Object.values(ORG_FIXTURES);

/**
 * All contractor fixtures as an array.
 */
export const ALL_CONTRACTOR_FIXTURES = Object.values(CONTRACTOR_FIXTURES);

/**
 * Active contractors only.
 */
export const ACTIVE_CONTRACTOR_FIXTURES = ALL_CONTRACTOR_FIXTURES.filter(
  (c) => c.active,
);

/**
 * All payroll run fixtures as an array.
 */
export const ALL_PAYROLL_RUN_FIXTURES = Object.values(PAYROLL_RUN_FIXTURES);

/**
 * All notification fixtures as an array.
 */
export const ALL_NOTIFICATION_FIXTURES = Object.values(NOTIFICATION_FIXTURES);

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Factory function to create a user fixture with custom overrides.
 */
export function createUserFixture(
  overrides: Partial<UserFixture> & { walletAddress: string },
): UserFixture {
  return {
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    email: undefined,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Factory function to create an org fixture with custom overrides.
 */
export function createOrgFixture(
  overrides: Partial<OrgFixture> & {
    name: string;
    treasuryAddress: string;
    ownerId: string;
  },
): OrgFixture {
  return {
    id: `org-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Factory function to create a contractor fixture with custom overrides.
 */
export function createContractorFixture(
  overrides: Partial<ContractorFixture> & {
    orgId: string;
    name: string;
    walletAddress: string;
  },
): ContractorFixture {
  return {
    id: `contractor-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    rateAmount: "1000.00000000",
    payCycle: "MONTHLY" as PayCycle,
    email: undefined,
    active: true,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Factory function to create a payroll run fixture with custom overrides.
 */
export function createPayrollRunFixture(
  overrides: Partial<Omit<PayrollRunFixture, "items">> & {
    orgId: string;
    totalMnee: string;
  },
  items: PayrollRunFixture["items"] = [],
): PayrollRunFixture {
  const id = `payroll-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    runLabel: undefined,
    status: "PENDING" as PayrollStatus,
    txHash: undefined,
    createdAt: new Date().toISOString(),
    items,
    ...overrides,
  } as PayrollRunFixture;
}

/**
 * Factory function to create a notification fixture with custom overrides.
 */
export function createNotificationFixture(
  overrides: Partial<NotificationFixture> & {
    userId: string;
    type: string;
    title: string;
    message: string;
  },
): NotificationFixture {
  return {
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    orgId: undefined,
    read: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  } as NotificationFixture;
}

/**
 * Factory function to create a transaction fixture with custom overrides.
 */
export function createTransactionFixture(
  overrides: Partial<TransactionFixture> & {
    type: "DEPOSIT" | "WITHDRAWAL" | "PAYROLL";
    amount: string;
    txHash: string;
  },
): TransactionFixture {
  return {
    id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    status: "pending" as const,
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

// =============================================================================
// Bulk Factory Functions
// =============================================================================

/**
 * Creates multiple contractor fixtures for an organization.
 */
export function createContractorBatch(
  orgId: string,
  count: number,
  baseWalletPrefix = "0xbatch",
): ContractorFixture[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `contractor-batch-${i + 1}`,
    orgId,
    name: `Batch Contractor ${i + 1}`,
    walletAddress: `${baseWalletPrefix}${(i + 1).toString().padStart(34, "0")}`,
    rateAmount: `${(i + 1) * 1000}.00000000`,
    payCycle: (["WEEKLY", "BI_WEEKLY", "MONTHLY"] as PayCycle[])[i % 3],
    email: `batch${i + 1}@contractor.test`,
    active: true,
    createdAt: new Date().toISOString(),
  }));
}

/**
 * Creates a list of notifications for testing.
 */
export function createNotificationBatch(
  userId: string,
  count: number,
): NotificationFixture[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `notif-batch-${i + 1}`,
    userId,
    orgId: ORG_FIXTURES.primary.id,
    type: i % 2 === 0 ? "PAYROLL_COMPLETE" : "MEMBER_ADDED",
    title: `Notification ${i + 1}`,
    message: `This is notification message ${i + 1}`,
    read: i < count / 2, // First half read, second half unread
    createdAt: new Date(Date.now() - i * 3600000).toISOString(), // Staggered times
  }));
}

// =============================================================================
// Mock API Response Helpers
// =============================================================================

/**
 * Creates a mock API success response.
 */
export function createMockApiResponse<T>(data: T) {
  return {
    ok: true,
    status: 200,
    data,
  };
}

/**
 * Creates a mock API error response.
 */
export function createMockApiError(
  code: string,
  message: string,
  status = 400,
) {
  return {
    ok: false,
    status,
    error: { code, message },
  };
}

/**
 * Creates a mock paginated response.
 */
export function createMockPaginatedResponse<T>(
  items: T[],
  page = 1,
  pageSize = 10,
  total?: number,
) {
  return {
    ok: true,
    status: 200,
    data: {
      items,
      pagination: {
        page,
        pageSize,
        total: total ?? items.length,
        totalPages: Math.ceil((total ?? items.length) / pageSize),
      },
    },
  };
}

// =============================================================================
// Test Data Validation Helpers
// =============================================================================

/**
 * Validates that a wallet address matches expected format.
 */
export function isValidWalletAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validates that a rate amount is properly formatted.
 */
export function isValidRateAmount(amount: string): boolean {
  return /^\d+\.\d{8}$/.test(amount);
}

/**
 * Validates that a transaction hash matches expected format.
 */
export function isValidTxHash(hash: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
}

/**
 * Formats MNEE amount for display.
 */
export function formatMneeAmount(amount: string): string {
  const num = parseFloat(amount);
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
  });
}
