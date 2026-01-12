/**
 * Contractor-related types for OrbitPayroll
 */

export interface Contractor {
  id: string;
  orgId: string;
  name: string;
  walletAddress: string;
  email: string | null;
  monthlyRate: string; // Stored as string for precision (wei)
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CreateContractorInput {
  name: string;
  walletAddress: string;
  email?: string;
  monthlyRate: string;
}

export interface UpdateContractorInput {
  name?: string;
  walletAddress?: string;
  email?: string;
  monthlyRate?: string;
  isActive?: boolean;
}
