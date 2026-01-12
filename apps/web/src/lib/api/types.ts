// API Response types
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Auth types
export interface NonceResponse {
  nonce: string;
}

export interface VerifyRequest {
  message: string;
  signature: string;
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
export type PayCycle = "WEEKLY" | "BIWEEKLY" | "MONTHLY";
export type ContractorStatus = "ACTIVE" | "ARCHIVED";

export interface Contractor {
  id: string;
  name: string;
  walletAddress: string;
  rateAmount: string;
  rateCurrency: string;
  payCycle: PayCycle;
  status: ContractorStatus;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContractorInput {
  name: string;
  walletAddress: string;
  rateAmount: string;
  rateCurrency: string;
  payCycle: PayCycle;
}

// Payroll types
export interface PayrollPreview {
  contractors: {
    id: string;
    name: string;
    walletAddress: string;
    amount: string;
  }[];
  total: string;
  treasuryBalance: string;
  isSufficient: boolean;
}

export interface PayrollRun {
  id: string;
  organizationId: string;
  txHash: string | null;
  totalAmount: string;
  contractorCount: number;
  status: "PENDING" | "CONFIRMED" | "FAILED";
  executedAt: string;
  createdAt: string;
}

export interface PayrollRunDetail extends PayrollRun {
  payments: {
    contractorId: string;
    contractorName: string;
    walletAddress: string;
    amount: string;
  }[];
}

export interface CreatePayrollRunRequest {
  txHash: string;
  payments: {
    contractorId: string;
    amount: string;
  }[];
}

// Treasury types
export interface TreasuryResponse {
  balance: string;
  address: string;
}

// Notification types
export interface Notification {
  id: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
}

// List params
export interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
  [key: string]: string | number | undefined;
}
