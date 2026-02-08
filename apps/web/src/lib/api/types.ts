// API Response types
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Auth types
export interface NonceResponse {
  nonce: string;
  message: string;
  expiresAt: string;
}

export interface VerifyRequest {
  walletAddress: string;
  signature: string;
  nonce: string;
}

export interface VerifyResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

// User types
export interface User {
  id: string;
  walletAddress: string;
  createdAt: string;
  updatedAt: string;
}

// Organization types
export interface Organization {
  id: string;
  name: string;
  treasuryAddress: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrgRequest {
  name: string;
  treasuryAddress?: string;
}

export interface UpdateOrgRequest {
  name?: string;
  treasuryAddress?: string;
}

// Contractor types
// Matches API: payCycle uses BI_WEEKLY (with underscore), active is boolean
export type PayCycle = "WEEKLY" | "BI_WEEKLY" | "MONTHLY";

export interface Contractor {
  id: string;
  orgId: string;
  name: string;
  walletAddress: string;
  rateAmount: string;
  rateCurrency: string;
  payCycle: PayCycle;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ContractorInput {
  name: string;
  walletAddress: string;
  rateAmount: number;
  rateCurrency: string;
  payCycle: PayCycle;
}

// Payroll types
// Matches API PayrollPreviewResponse
export interface PayrollPreview {
  contractors: {
    id: string;
    name: string;
    walletAddress: string;
    amount: string;
  }[];
  totalMnee: string;
  treasuryBalance: string;
  isSufficient: boolean;
  deficit: string;
}

// Matches API PayrollRunResponse
export interface PayrollRun {
  id: string;
  orgId: string;
  runLabel: string | null;
  executedAt: string | null;
  txHash: string | null;
  totalMnee: string;
  contractorCount: number;
  status: "PENDING" | "EXECUTED" | "FAILED";
  createdAt: string;
}

export interface PayrollRunDetail extends PayrollRun {
  items: {
    id: string;
    contractorId: string | null;
    contractorName: string;
    walletAddress: string;
    amountMnee: string;
    status: "PENDING" | "PAID" | "FAILED";
  }[];
}

export interface CreatePayrollRunRequest {
  txHash: string;
  items: {
    contractorId: string;
    amountMnee: string;
  }[];
  runLabel?: string;
}

// Treasury types
// Matches API TreasuryResponse
export interface TreasuryResponse {
  contractAddress: string;
  mneeBalance: string;
  upcomingPayrollTotal: string;
  nextPayrollDate: string | null;
  isSufficient: boolean;
  deficit: string;
  lastUpdated: string;
}

// Notification types
// Matches API NotificationResponse
export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  orgId: string | null;
  createdAt: string;
}

// List params
export interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
  [key: string]: string | number | undefined;
}
