/**
 * Organization Request/Response Validation Schemas
 */

import { z } from 'zod';

// Ethereum address validation
const ethereumAddress = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address')
  .transform((s) => s.toLowerCase());

/**
 * POST /api/v1/orgs request body
 */
export const createOrgSchema = z.object({
  name: z
    .string()
    .min(1, 'Organization name is required')
    .max(100, 'Organization name must be 100 characters or less'),
});

export type CreateOrgRequest = z.infer<typeof createOrgSchema>;

/**
 * PUT /api/v1/orgs/:id request body
 */
export const updateOrgSchema = z.object({
  name: z
    .string()
    .min(1, 'Organization name is required')
    .max(100, 'Organization name must be 100 characters or less')
    .optional(),
});

export type UpdateOrgRequest = z.infer<typeof updateOrgSchema>;

/**
 * UUID parameter validation
 */
export const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid organization ID'),
});

export type UuidParam = z.infer<typeof uuidParamSchema>;

/**
 * Member ID parameter validation
 */
export const memberIdParamSchema = z.object({
  id: z.string().uuid('Invalid organization ID'),
  memberId: z.string().uuid('Invalid member ID'),
});

export type MemberIdParam = z.infer<typeof memberIdParamSchema>;

/**
 * POST /api/v1/orgs/:id/members request body
 */
export const addMemberSchema = z.object({
  walletAddress: ethereumAddress,
  role: z.enum(['OWNER_ADMIN', 'FINANCE_OPERATOR'], {
    errorMap: () => ({ message: 'Role must be OWNER_ADMIN or FINANCE_OPERATOR' }),
  }),
});

export type AddMemberRequest = z.infer<typeof addMemberSchema>;

/**
 * PUT /api/v1/orgs/:id/members/:memberId request body
 */
export const updateMemberSchema = z.object({
  role: z.enum(['OWNER_ADMIN', 'FINANCE_OPERATOR'], {
    errorMap: () => ({ message: 'Role must be OWNER_ADMIN or FINANCE_OPERATOR' }),
  }),
});

export type UpdateMemberRequest = z.infer<typeof updateMemberSchema>;
