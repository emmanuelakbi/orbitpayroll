/**
 * Contract ABI Exports
 *
 * Centralized ABI management for contract interactions.
 * ABIs are stored as JSON files and exported with TypeScript types.
 *
 * Requirements: 4.1, 4.2, 4.5
 */

import PayrollTreasuryABI from './PayrollTreasury.json';
import MNEEABI from './MNEE.json';

/**
 * PayrollTreasury contract ABI
 * Functions: deposit, getBalance, getAdmin, runPayroll, emergencyWithdraw, setAdmin
 * Events: Deposited, PayrollExecuted, EmergencyWithdrawal, AdminChanged, TreasuryCreated
 */
export const PAYROLL_TREASURY_ABI = PayrollTreasuryABI;

/**
 * MNEE ERC20 token ABI
 * Standard ERC20 functions: balanceOf, allowance, approve, transfer, transferFrom
 * Additional: name, symbol, decimals, totalSupply
 * Events: Transfer, Approval
 *
 * Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 2.7
 */
export const MNEE_ABI = MNEEABI;

/**
 * Human-readable ABI format for viem (alternative format)
 * Useful for quick reference and simpler contract interactions
 */
export const MNEE_ABI_HUMAN = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
] as const;

export const PAYROLL_TREASURY_ABI_HUMAN = [
  'function deposit(uint256 amount)',
  'function getBalance() view returns (uint256)',
  'function getAdmin() view returns (address)',
  'function admin() view returns (address)',
  'function mneeToken() view returns (address)',
  'function MAX_RECIPIENTS() view returns (uint256)',
  'function runPayroll(address[] recipients, uint256[] amounts, bytes32 offchainRunId)',
  'function emergencyWithdraw(uint256 amount, address recipient)',
  'function setAdmin(address newAdmin)',
  'event Deposited(address indexed depositor, uint256 amount)',
  'event PayrollExecuted(bytes32 indexed offchainRunId, uint256 totalAmount, uint256 recipientCount, uint256 timestamp)',
  'event EmergencyWithdrawal(address indexed admin, address indexed recipient, uint256 amount)',
  'event AdminChanged(address indexed previousAdmin, address indexed newAdmin)',
  'event TreasuryCreated(address indexed admin, address indexed mneeToken)',
] as const;
