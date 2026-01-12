/**
 * Smart contract related types for OrbitPayroll
 */

/** MNEE Token address on Ethereum */
export const MNEE_TOKEN_ADDRESS = '0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF' as const;

/** Supported network names */
export type NetworkName = 'mainnet' | 'sepolia' | 'hardhat' | 'localhost';

export interface ContractAddresses {
  mneeToken: string;
  payrollTreasury?: string;
  payrollManager?: string;
}

/** Network-specific contract addresses */
export interface NetworkContractAddresses {
  [network: string]: ContractAddresses;
}

export interface PayrollExecutionParams {
  recipients: string[];
  amounts: string[];
  offchainRunId: string;
}

export interface TreasuryDepositEvent {
  depositor: string;
  amount: string;
  txHash: string;
  blockNumber: number;
  timestamp: number;
}

export interface PayrollExecutedEvent {
  offchainRunId: string;
  totalAmount: string;
  recipientCount: number;
  txHash: string;
  blockNumber: number;
  timestamp: number;
}

export interface AdminChangedEvent {
  previousAdmin: string;
  newAdmin: string;
  txHash: string;
  blockNumber: number;
}

export interface EmergencyWithdrawalEvent {
  admin: string;
  recipient: string;
  amount: string;
  txHash: string;
  blockNumber: number;
}
