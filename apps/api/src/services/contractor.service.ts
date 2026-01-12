/**
 * Contractor Service
 *
 * Handles contractor CRUD operations within organizations.
 */

import { db } from '../lib/db.js';
import { ContractorError, OrgError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { verifyRole, isMember } from './org.service.js';
import type { PayCycle } from '@orbitpayroll/database';
import { Decimal } from '@prisma/client/runtime/library';

export interface ContractorResponse {
  id: string;
  orgId: string;
  name: string;
  walletAddress: string;
  rateAmount: string;
  rateCurrency: string;
  payCycle: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
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

export interface CreateContractorData {
  name: string;
  walletAddress: string;
  rateAmount: number;
  rateCurrency: string;
  payCycle: PayCycle;
}

export interface UpdateContractorData {
  name?: string | undefined;
  walletAddress?: string | undefined;
  rateAmount?: number | undefined;
  rateCurrency?: string | undefined;
  payCycle?: PayCycle | undefined;
}

export interface ListContractorsParams {
  page: number;
  limit: number;
  search?: string | undefined;
  active?: boolean | undefined;
}


/**
 * Create a new contractor in an organization
 * Any member can create contractors
 */
export async function createContractor(
  orgId: string,
  userId: string,
  data: CreateContractorData
): Promise<ContractorResponse> {
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

  // Check for duplicate wallet address within the org (only active contractors)
  const existingContractor = await db.contractor.findFirst({
    where: {
      orgId,
      walletAddress: data.walletAddress.toLowerCase(),
      active: true,
    },
  });

  if (existingContractor) {
    throw ContractorError.duplicateWallet();
  }

  // Create the contractor
  const contractor = await db.contractor.create({
    data: {
      orgId,
      name: data.name,
      walletAddress: data.walletAddress.toLowerCase(),
      rateAmount: new Decimal(data.rateAmount),
      rateCurrency: data.rateCurrency,
      payCycle: data.payCycle,
    },
  });

  logger.info({ orgId, contractorId: contractor.id }, 'Contractor created');

  return formatContractorResponse(contractor);
}

/**
 * List contractors in an organization with pagination, search, and filtering
 */
export async function listContractors(
  orgId: string,
  userId: string,
  params: ListContractorsParams
): Promise<PaginatedResponse<ContractorResponse>> {
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

  const { page, limit, search, active } = params;
  const skip = (page - 1) * limit;

  // Build where clause
  const where: {
    orgId: string;
    active?: boolean;
    OR?: Array<{ name: { contains: string; mode: 'insensitive' } } | { walletAddress: { contains: string; mode: 'insensitive' } }>;
  } = { orgId };

  if (active !== undefined) {
    where.active = active;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { walletAddress: { contains: search, mode: 'insensitive' } },
    ];
  }

  // Get total count and contractors
  const [total, contractors] = await Promise.all([
    db.contractor.count({ where }),
    db.contractor.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return {
    data: contractors.map(formatContractorResponse),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}


/**
 * Get a single contractor by ID
 */
export async function getContractor(
  orgId: string,
  contractorId: string,
  userId: string
): Promise<ContractorResponse> {
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

  // Get the contractor
  const contractor = await db.contractor.findFirst({
    where: {
      id: contractorId,
      orgId,
    },
  });

  if (!contractor) {
    throw ContractorError.notFound();
  }

  return formatContractorResponse(contractor);
}

/**
 * Update a contractor
 * Requires OWNER_ADMIN role
 */
export async function updateContractor(
  orgId: string,
  contractorId: string,
  userId: string,
  data: UpdateContractorData
): Promise<ContractorResponse> {
  // Verify org exists
  const org = await db.organization.findUnique({
    where: { id: orgId },
  });

  if (!org) {
    throw OrgError.notFound();
  }

  // Verify user has OWNER_ADMIN role
  await verifyRole(orgId, userId, 'OWNER_ADMIN');

  // Get the contractor
  const contractor = await db.contractor.findFirst({
    where: {
      id: contractorId,
      orgId,
    },
  });

  if (!contractor) {
    throw ContractorError.notFound();
  }

  // If updating wallet address, check for duplicates
  if (data.walletAddress && data.walletAddress.toLowerCase() !== contractor.walletAddress) {
    const existingContractor = await db.contractor.findFirst({
      where: {
        orgId,
        walletAddress: data.walletAddress.toLowerCase(),
        active: true,
        NOT: { id: contractorId },
      },
    });

    if (existingContractor) {
      throw ContractorError.duplicateWallet();
    }
  }

  // Update the contractor
  const updated = await db.contractor.update({
    where: { id: contractorId },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.walletAddress && { walletAddress: data.walletAddress.toLowerCase() }),
      ...(data.rateAmount !== undefined && { rateAmount: new Decimal(data.rateAmount) }),
      ...(data.rateCurrency && { rateCurrency: data.rateCurrency }),
      ...(data.payCycle && { payCycle: data.payCycle }),
    },
  });

  logger.info({ orgId, contractorId }, 'Contractor updated');

  return formatContractorResponse(updated);
}

/**
 * Archive (soft delete) a contractor
 * Requires OWNER_ADMIN role
 */
export async function archiveContractor(
  orgId: string,
  contractorId: string,
  userId: string
): Promise<void> {
  // Verify org exists
  const org = await db.organization.findUnique({
    where: { id: orgId },
  });

  if (!org) {
    throw OrgError.notFound();
  }

  // Verify user has OWNER_ADMIN role
  await verifyRole(orgId, userId, 'OWNER_ADMIN');

  // Get the contractor
  const contractor = await db.contractor.findFirst({
    where: {
      id: contractorId,
      orgId,
    },
  });

  if (!contractor) {
    throw ContractorError.notFound();
  }

  // Soft delete by setting active=false
  await db.contractor.update({
    where: { id: contractorId },
    data: { active: false },
  });

  logger.info({ orgId, contractorId }, 'Contractor archived');
}

// ============================================
// Helper Functions
// ============================================

function formatContractorResponse(contractor: {
  id: string;
  orgId: string;
  name: string;
  walletAddress: string;
  rateAmount: Decimal;
  rateCurrency: string;
  payCycle: PayCycle;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}): ContractorResponse {
  return {
    id: contractor.id,
    orgId: contractor.orgId,
    name: contractor.name,
    walletAddress: contractor.walletAddress,
    rateAmount: contractor.rateAmount.toString(),
    rateCurrency: contractor.rateCurrency,
    payCycle: contractor.payCycle,
    active: contractor.active,
    createdAt: contractor.createdAt.toISOString(),
    updatedAt: contractor.updatedAt.toISOString(),
  };
}
