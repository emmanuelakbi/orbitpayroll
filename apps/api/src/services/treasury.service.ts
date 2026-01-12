/**
 * Treasury Service
 *
 * Handles treasury information retrieval including balance caching
 * and upcoming payroll calculations.
 */

import { db } from '../lib/db.js';
import { OrgError } from '../lib/errors.js';
import { isMember } from './org.service.js';
import { Decimal } from '@prisma/client/runtime/library';

// ============================================
// Response Types
// ============================================

export interface TreasuryResponse {
  contractAddress: string;
  mneeBalance: string;
  upcomingPayrollTotal: string;
  nextPayrollDate: string | null;
  isSufficient: boolean;
  deficit: string;
  lastUpdated: string;
}

// ============================================
// Cache Management
// ============================================

interface BalanceCache {
  balance: string;
  timestamp: Date;
}

// In-memory cache for treasury balances (keyed by org ID)
// In production, this would use Redis for distributed caching
const balanceCache = new Map<string, BalanceCache>();

// Cache TTL in milliseconds (30 seconds)
const CACHE_TTL_MS = 30 * 1000;

/**
 * Check if cached balance is still fresh
 */
function isCacheFresh(cache: BalanceCache | undefined): boolean {
  if (!cache) return false;
  const age = Date.now() - cache.timestamp.getTime();
  return age < CACHE_TTL_MS;
}

/**
 * Get cached balance or null if stale/missing
 */
function getCachedBalance(orgId: string): BalanceCache | null {
  const cache = balanceCache.get(orgId);
  if (isCacheFresh(cache)) {
    return cache!;
  }
  return null;
}

/**
 * Update the balance cache for an organization
 */
function setCachedBalance(orgId: string, balance: string): BalanceCache {
  const cache: BalanceCache = {
    balance,
    timestamp: new Date(),
  };
  balanceCache.set(orgId, cache);
  return cache;
}

// ============================================
// Blockchain Integration (Placeholder)
// ============================================

/**
 * Query the blockchain for the treasury's MNEE balance
 * 
 * In production, this would use ethers.js to:
 * 1. Connect to the appropriate network (Sepolia/Mainnet)
 * 2. Create an ERC20 contract instance for MNEE
 * 3. Call balanceOf(treasuryAddress)
 * 
 * For now, returns a placeholder value.
 */
async function queryBlockchainBalance(_treasuryAddress: string): Promise<string> {
  // TODO: Implement actual blockchain query
  // const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  // const mneeContract = new ethers.Contract(MNEE_ADDRESS, ERC20_ABI, provider);
  // const balance = await mneeContract.balanceOf(treasuryAddress);
  // return balance.toString();
  
  // Placeholder: return "0" for now
  return '0';
}

// ============================================
// Service Functions
// ============================================

/**
 * Get treasury information for an organization
 * 
 * Returns contract address, balance (cached if fresh), upcoming payroll total,
 * and whether the treasury has sufficient funds.
 */
export async function getTreasuryInfo(
  orgId: string,
  userId: string
): Promise<TreasuryResponse> {
  // Verify org exists
  const org = await db.organization.findUnique({
    where: { id: orgId },
  });

  if (!org) {
    throw OrgError.notFound();
  }

  // Verify user is a member
  const memberCheck = await isMember(orgId, userId);
  if (!memberCheck) {
    throw OrgError.notMember();
  }

  // Get balance from cache or blockchain
  let balanceCache = getCachedBalance(orgId);
  
  if (!balanceCache) {
    // Cache is stale or missing, query blockchain
    const balance = await queryBlockchainBalance(org.treasuryAddress);
    balanceCache = setCachedBalance(orgId, balance);
  }

  // Calculate upcoming payroll total from active contractors
  const activeContractors = await db.contractor.findMany({
    where: {
      orgId,
      active: true,
    },
    select: {
      rateAmount: true,
    },
  });

  let upcomingPayrollTotal = new Decimal(0);
  for (const contractor of activeContractors) {
    upcomingPayrollTotal = upcomingPayrollTotal.plus(contractor.rateAmount);
  }

  // Get next scheduled payroll date (if any pending payroll runs exist)
  const nextScheduledRun = await db.payrollRun.findFirst({
    where: {
      orgId,
      status: 'PENDING',
      scheduledDate: {
        not: null,
      },
    },
    orderBy: {
      scheduledDate: 'asc',
    },
    select: {
      scheduledDate: true,
    },
  });

  // Calculate if treasury has sufficient funds
  const treasuryBalance = new Decimal(balanceCache.balance);
  const isSufficient = treasuryBalance.greaterThanOrEqualTo(upcomingPayrollTotal);
  const deficit = upcomingPayrollTotal.greaterThan(treasuryBalance)
    ? upcomingPayrollTotal.minus(treasuryBalance)
    : new Decimal(0);

  return {
    contractAddress: org.treasuryAddress,
    mneeBalance: balanceCache.balance,
    upcomingPayrollTotal: upcomingPayrollTotal.toString(),
    nextPayrollDate: nextScheduledRun?.scheduledDate?.toISOString() ?? null,
    isSufficient,
    deficit: deficit.toString(),
    lastUpdated: balanceCache.timestamp.toISOString(),
  };
}

/**
 * Invalidate the balance cache for an organization
 * Call this after a payroll run or deposit to force a fresh query
 */
export function invalidateBalanceCache(orgId: string): void {
  balanceCache.delete(orgId);
}

/**
 * Clear all cached balances
 * Useful for testing or maintenance
 */
export function clearAllBalanceCache(): void {
  balanceCache.clear();
}
