// Auto-generated contract addresses
// Generated at: 2026-01-11T19:34:31.745Z

export const PAYROLL_TREASURY_ADDRESSES: Record<string, string> = {
  "hardhat": "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
};

export const MNEE_ADDRESSES: Record<string, string> = {
  "hardhat": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  "mainnet": "0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFB6cF"
};

export function getPayrollTreasuryAddress(network: string): string | undefined {
  return PAYROLL_TREASURY_ADDRESSES[network];
}

export function getMneeAddress(network: string): string | undefined {
  return MNEE_ADDRESSES[network];
}
