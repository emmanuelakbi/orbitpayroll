/**
 * Payroll-related types for OrbitPayroll
 */

export type PayrollRunStatus = 'pending' | 'confirmed' | 'failed';

export interface PayrollRun {
  id: string;
  orgId: string;
  txHash: string;
  totalAmount: string; // Stored as string for precision (wei)
  recipientCount: number;
  status: PayrollRunStatus;
  executedBy: string; // wallet address
  executedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PayrollItem {
  id: string;
  payrollRunId: string;
  contractorId: string;
  walletAddress: string;
  amount: string; // Stored as string for precision (wei)
  createdAt: Date;
}

export interface PayrollPreview {
  contractors: Array<{
    id: string;
    name: string;
    walletAddress: string;
    amount: string;
  }>;
  totalAmount: string;
  recipientCount: number;
}
