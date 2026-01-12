/**
 * Payroll Service
 *
 * Handles payroll preview, run creation, and history retrieval.
 */

import { db } from '../lib/db.js';
import { OrgError, PayrollError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { isMember } from './org.service.js';
import { Decimal } from '@prisma/client/runtime/library';
import type { PayrollStatus, ItemStatus } from '@orbitpayroll/database';

// ============================================
// Response Types
// ============================================

export interface PayrollPreviewContractor {
  id: string;
  name: string;
  walletAddress: string;
  amount: string;
}

export interface PayrollPreviewResponse {
  contractors: PayrollPreviewContractor[];
  totalMnee: string;
  treasuryBalance: string;
  isSufficient: boolean;
  deficit: string;
}

export interface PayrollRunResponse {
  id: string;
  orgId: string;
  runLabel: string | null;
  executedAt: string | null;
  txHash: string | null;
  totalMnee: string;
  contractorCount: number;
  status: PayrollStatus;
  createdAt: string;
}

export interface PayrollItemResponse {
  id: string;
  contractorId: string | null;
  contractorName: string;
  walletAddress: string;
  amountMnee: string;
  status: ItemStatus;
}

export interface PayrollRunDetailResponse extends PayrollRunResponse {
  items: PayrollItemResponse[];
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

// ============================================
// Input Types
// ============================================

export interface CreatePayrollRunData {
  txHash: string;
  items: Array<{
    contractorId: string;
    amountMnee: string;
  }>;
  runLabel?: string | undefined;
}

export interface ListPayrollRunsParams {
  page: number;
  limit: number;
}

// ============================================
// Service Functions
// ============================================

/**
 * Generate a payroll preview for an organization
 * Calculates total MNEE from active contractors
 */
export async function previewPayroll(
  orgId: string,
  userId: string
): Promise<PayrollPreviewResponse> {
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

  // Get all active contractors
  const contractors = await db.contractor.findMany({
    where: {
      orgId,
      active: true,
    },
    orderBy: { name: 'asc' },
  });

  // Calculate total and build preview
  let totalMnee = new Decimal(0);
  const previewContractors: PayrollPreviewContractor[] = contractors.map((c) => {
    totalMnee = totalMnee.plus(c.rateAmount);
    return {
      id: c.id,
      name: c.name,
      walletAddress: c.walletAddress,
      amount: c.rateAmount.toString(),
    };
  });

  // For now, treasury balance is a placeholder (would query blockchain in production)
  // This would be fetched from the smart contract via ethers.js
  const treasuryBalance = new Decimal(0);
  const deficit = totalMnee.greaterThan(treasuryBalance)
    ? totalMnee.minus(treasuryBalance)
    : new Decimal(0);

  return {
    contractors: previewContractors,
    totalMnee: totalMnee.toString(),
    treasuryBalance: treasuryBalance.toString(),
    isSufficient: treasuryBalance.greaterThanOrEqualTo(totalMnee),
    deficit: deficit.toString(),
  };
}


/**
 * Create a new payroll run
 * Records the transaction hash and creates payroll items
 */
export async function createPayrollRun(
  orgId: string,
  userId: string,
  data: CreatePayrollRunData
): Promise<PayrollRunResponse> {
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

  // Calculate total from items
  let totalMnee = new Decimal(0);
  for (const item of data.items) {
    totalMnee = totalMnee.plus(new Decimal(item.amountMnee));
  }

  // Create payroll run with items in a transaction
  const payrollRun = await db.$transaction(async (tx) => {
    // Create the payroll run
    const run = await tx.payrollRun.create({
      data: {
        orgId,
        runLabel: data.runLabel ?? null,
        txHash: data.txHash,
        totalMnee,
        status: 'EXECUTED',
        executedAt: new Date(),
      },
    });

    // Create payroll items
    await tx.payrollItem.createMany({
      data: data.items.map((item) => ({
        payrollRunId: run.id,
        contractorId: item.contractorId,
        amountMnee: new Decimal(item.amountMnee),
        status: 'PAID' as ItemStatus,
      })),
    });

    return run;
  });

  logger.info(
    { orgId, payrollRunId: payrollRun.id, txHash: data.txHash },
    'Payroll run created'
  );

  return formatPayrollRunResponse(payrollRun, data.items.length);
}

/**
 * List payroll runs for an organization with pagination
 */
export async function listPayrollRuns(
  orgId: string,
  userId: string,
  params: ListPayrollRunsParams
): Promise<PaginatedResponse<PayrollRunResponse>> {
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

  const { page, limit } = params;
  const skip = (page - 1) * limit;

  // Get total count and payroll runs
  const [total, runs] = await Promise.all([
    db.payrollRun.count({ where: { orgId } }),
    db.payrollRun.findMany({
      where: { orgId },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { items: true },
        },
      },
    }),
  ]);

  return {
    data: runs.map((run) => formatPayrollRunResponse(run, run._count.items)),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get a single payroll run with items
 */
export async function getPayrollRun(
  orgId: string,
  runId: string,
  userId: string
): Promise<PayrollRunDetailResponse> {
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

  // Get the payroll run with items
  const run = await db.payrollRun.findFirst({
    where: {
      id: runId,
      orgId,
    },
    include: {
      items: {
        include: {
          contractor: {
            select: {
              name: true,
              walletAddress: true,
            },
          },
        },
      },
    },
  });

  if (!run) {
    throw PayrollError.notFound();
  }

  return {
    ...formatPayrollRunResponse(run, run.items.length),
    items: run.items.map((item) => ({
      id: item.id,
      contractorId: item.contractorId,
      contractorName: item.contractor?.name ?? 'Unknown',
      walletAddress: item.contractor?.walletAddress ?? 'Unknown',
      amountMnee: item.amountMnee.toString(),
      status: item.status,
    })),
  };
}

// ============================================
// Helper Functions
// ============================================

function formatPayrollRunResponse(
  run: {
    id: string;
    orgId: string;
    runLabel: string | null;
    executedAt: Date | null;
    txHash: string | null;
    totalMnee: Decimal;
    status: PayrollStatus;
    createdAt: Date;
  },
  contractorCount: number
): PayrollRunResponse {
  return {
    id: run.id,
    orgId: run.orgId,
    runLabel: run.runLabel,
    executedAt: run.executedAt?.toISOString() ?? null,
    txHash: run.txHash,
    totalMnee: run.totalMnee.toString(),
    contractorCount,
    status: run.status,
    createdAt: run.createdAt.toISOString(),
  };
}
