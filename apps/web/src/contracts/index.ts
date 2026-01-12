/**
 * Contract Integration Module
 *
 * Centralized exports for contract ABIs, addresses, and utilities.
 * This module provides everything needed for blockchain interactions.
 *
 * Requirements: 2.1, 2.2, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 */

// Export ABIs
export {
  MNEE_ABI,
  MNEE_ABI_HUMAN,
  PAYROLL_TREASURY_ABI,
  PAYROLL_TREASURY_ABI_HUMAN,
} from './abis';

// Export addresses
export {
  ADDRESSES,
  MNEE_ADDRESS,
  getContractAddress,
  getPayrollTreasuryAddress,
  getMneeAddress,
  type NetworkName,
} from './addresses';
