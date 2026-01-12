/**
 * Organization Service
 *
 * Handles organization CRUD operations and membership management.
 */

import { db } from '../lib/db.js';
import { AppError, ErrorCode, OrgError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import type { Role } from '@orbitpayroll/database';

export interface OrgResponse {
  id: string;
  name: string;
  treasuryAddress: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListOrgsResponse {
  data: OrgResponse[];
  meta: {
    total: number;
  };
}

export interface MemberResponse {
  id: string;
  userId: string;
  walletAddress: string;
  role: string;
  createdAt: string;
}

export interface ListMembersResponse {
  data: MemberResponse[];
}

/**
 * Create a new organization with the caller as OWNER_ADMIN
 */
export async function createOrganization(
  userId: string,
  name: string
): Promise<OrgResponse> {
  // Generate a placeholder treasury address (will be set when contract is deployed)
  // In production, this would be generated from a deterministic factory contract
  const treasuryAddress = '0x' + '0'.repeat(40);

  const org = await db.organization.create({
    data: {
      name,
      treasuryAddress,
      ownerId: userId,
      members: {
        create: {
          userId,
          role: 'OWNER_ADMIN',
        },
      },
    },
  });

  logger.info({ orgId: org.id, userId }, 'Organization created');

  return formatOrgResponse(org);
}

/**
 * List all organizations where the user is a member
 */
export async function listOrganizations(userId: string): Promise<ListOrgsResponse> {
  const memberships = await db.orgMember.findMany({
    where: { userId },
    include: {
      org: true,
    },
  });

  const orgs = memberships.map((m) => formatOrgResponse(m.org));

  return {
    data: orgs,
    meta: {
      total: orgs.length,
    },
  };
}

/**
 * Get a single organization by ID
 * Verifies the user is a member
 */
export async function getOrganization(
  orgId: string,
  userId: string
): Promise<OrgResponse> {
  const org = await db.organization.findUnique({
    where: { id: orgId },
  });

  if (!org) {
    throw OrgError.notFound();
  }

  // Verify membership
  const membership = await db.orgMember.findUnique({
    where: {
      orgId_userId: {
        orgId,
        userId,
      },
    },
  });

  if (!membership) {
    throw OrgError.notMember();
  }

  return formatOrgResponse(org);
}

/**
 * Update an organization
 * Requires OWNER_ADMIN role
 */
export async function updateOrganization(
  orgId: string,
  userId: string,
  data: { name: string | undefined }
): Promise<OrgResponse> {
  // Verify org exists
  const org = await db.organization.findUnique({
    where: { id: orgId },
  });

  if (!org) {
    throw OrgError.notFound();
  }

  // Verify user has OWNER_ADMIN role
  await verifyRole(orgId, userId, 'OWNER_ADMIN');

  // Update organization
  const updated = await db.organization.update({
    where: { id: orgId },
    data: {
      ...(data.name && { name: data.name }),
    },
  });

  logger.info({ orgId, userId }, 'Organization updated');

  return formatOrgResponse(updated);
}

/**
 * Verify user has the required role in the organization
 */
export async function verifyRole(
  orgId: string,
  userId: string,
  requiredRole: Role
): Promise<void> {
  const membership = await db.orgMember.findUnique({
    where: {
      orgId_userId: {
        orgId,
        userId,
      },
    },
  });

  if (!membership) {
    throw OrgError.notMember();
  }

  // OWNER_ADMIN has all permissions
  if (membership.role === 'OWNER_ADMIN') {
    return;
  }

  // FINANCE_OPERATOR can only access if that's the required role
  if (requiredRole === 'FINANCE_OPERATOR' && membership.role === 'FINANCE_OPERATOR') {
    return;
  }

  throw OrgError.insufficientRole();
}

/**
 * Check if user is a member of the organization
 */
export async function isMember(orgId: string, userId: string): Promise<boolean> {
  const membership = await db.orgMember.findUnique({
    where: {
      orgId_userId: {
        orgId,
        userId,
      },
    },
  });

  return membership !== null;
}

/**
 * Get user's role in an organization
 */
export async function getUserRole(orgId: string, userId: string): Promise<Role | null> {
  const membership = await db.orgMember.findUnique({
    where: {
      orgId_userId: {
        orgId,
        userId,
      },
    },
  });

  return membership?.role ?? null;
}

// ============================================
// Helper Functions
// ============================================

function formatOrgResponse(org: {
  id: string;
  name: string;
  treasuryAddress: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}): OrgResponse {
  return {
    id: org.id,
    name: org.name,
    treasuryAddress: org.treasuryAddress,
    ownerId: org.ownerId,
    createdAt: org.createdAt.toISOString(),
    updatedAt: org.updatedAt.toISOString(),
  };
}

function formatMemberResponse(member: {
  id: string;
  userId: string;
  role: Role;
  createdAt: Date;
  user: {
    walletAddress: string;
  };
}): MemberResponse {
  return {
    id: member.id,
    userId: member.userId,
    walletAddress: member.user.walletAddress,
    role: member.role,
    createdAt: member.createdAt.toISOString(),
  };
}

// ============================================
// Member Management Functions
// ============================================

/**
 * Add a member to an organization
 * Requires OWNER_ADMIN role
 */
export async function addMember(
  orgId: string,
  callerUserId: string,
  walletAddress: string,
  role: Role
): Promise<MemberResponse> {
  // Verify org exists
  const org = await db.organization.findUnique({
    where: { id: orgId },
  });

  if (!org) {
    throw OrgError.notFound();
  }

  // Verify caller has OWNER_ADMIN role
  await verifyRole(orgId, callerUserId, 'OWNER_ADMIN');

  // Find or create user by wallet address
  let user = await db.user.findUnique({
    where: { walletAddress: walletAddress.toLowerCase() },
  });

  if (!user) {
    user = await db.user.create({
      data: {
        walletAddress: walletAddress.toLowerCase(),
      },
    });
  }

  // Check if user is already a member
  const existingMember = await db.orgMember.findUnique({
    where: {
      orgId_userId: {
        orgId,
        userId: user.id,
      },
    },
  });

  if (existingMember) {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      'User is already a member of this organization.',
      409
    );
  }

  // Create membership
  const member = await db.orgMember.create({
    data: {
      orgId,
      userId: user.id,
      role,
    },
    include: {
      user: {
        select: {
          walletAddress: true,
        },
      },
    },
  });

  logger.info({ orgId, userId: user.id, role }, 'Member added to organization');

  return formatMemberResponse(member);
}

/**
 * List all members of an organization
 */
export async function listMembers(
  orgId: string,
  callerUserId: string
): Promise<ListMembersResponse> {
  // Verify org exists
  const org = await db.organization.findUnique({
    where: { id: orgId },
  });

  if (!org) {
    throw OrgError.notFound();
  }

  // Verify caller is a member
  const callerMembership = await db.orgMember.findUnique({
    where: {
      orgId_userId: {
        orgId,
        userId: callerUserId,
      },
    },
  });

  if (!callerMembership) {
    throw OrgError.notMember();
  }

  // Get all members
  const members = await db.orgMember.findMany({
    where: { orgId },
    include: {
      user: {
        select: {
          walletAddress: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  return {
    data: members.map(formatMemberResponse),
  };
}

/**
 * Update a member's role
 * Requires OWNER_ADMIN role
 */
export async function updateMemberRole(
  orgId: string,
  memberId: string,
  callerUserId: string,
  newRole: Role
): Promise<MemberResponse> {
  // Verify org exists
  const org = await db.organization.findUnique({
    where: { id: orgId },
  });

  if (!org) {
    throw OrgError.notFound();
  }

  // Verify caller has OWNER_ADMIN role
  await verifyRole(orgId, callerUserId, 'OWNER_ADMIN');

  // Find the member
  const member = await db.orgMember.findFirst({
    where: {
      id: memberId,
      orgId,
    },
    include: {
      user: {
        select: {
          walletAddress: true,
        },
      },
    },
  });

  if (!member) {
    throw new AppError(ErrorCode.ORG_004, 'Member not found.', 404);
  }

  // If demoting from OWNER_ADMIN, check if this is the last owner
  if (member.role === 'OWNER_ADMIN' && newRole !== 'OWNER_ADMIN') {
    const ownerCount = await db.orgMember.count({
      where: {
        orgId,
        role: 'OWNER_ADMIN',
      },
    });

    if (ownerCount <= 1) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Cannot demote the last owner. Assign another owner first.',
        400
      );
    }
  }

  // Update the role
  const updated = await db.orgMember.update({
    where: { id: memberId },
    data: { role: newRole },
    include: {
      user: {
        select: {
          walletAddress: true,
        },
      },
    },
  });

  logger.info({ orgId, memberId, newRole }, 'Member role updated');

  return formatMemberResponse(updated);
}

/**
 * Remove a member from an organization
 * Requires OWNER_ADMIN role
 * Cannot remove the last OWNER_ADMIN
 */
export async function removeMember(
  orgId: string,
  memberId: string,
  callerUserId: string
): Promise<void> {
  // Verify org exists
  const org = await db.organization.findUnique({
    where: { id: orgId },
  });

  if (!org) {
    throw OrgError.notFound();
  }

  // Verify caller has OWNER_ADMIN role
  await verifyRole(orgId, callerUserId, 'OWNER_ADMIN');

  // Find the member
  const member = await db.orgMember.findFirst({
    where: {
      id: memberId,
      orgId,
    },
  });

  if (!member) {
    throw new AppError(ErrorCode.ORG_004, 'Member not found.', 404);
  }

  // If removing an OWNER_ADMIN, check if this is the last owner
  if (member.role === 'OWNER_ADMIN') {
    const ownerCount = await db.orgMember.count({
      where: {
        orgId,
        role: 'OWNER_ADMIN',
      },
    });

    if (ownerCount <= 1) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Cannot remove the last owner. Assign another owner first.',
        400
      );
    }
  }

  // Remove the member
  await db.orgMember.delete({
    where: { id: memberId },
  });

  logger.info({ orgId, memberId }, 'Member removed from organization');
}
