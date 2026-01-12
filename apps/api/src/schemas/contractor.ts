/**
 * Contractor Request/Response Validation Schemas
 */

import { z } from 'zod';

// Ethereum address validation
const ethereumAddress = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address')
  .transform((s) => s.toLowerCase());

/**
 * POST /api/v1/orgs/:id/contractors request body
 */
export const createContractorSchema = z.object({
  name: z
    .string()
    .min(1, 'Contractor name is required')
    .max(100, 'Contractor name must be 100 characters or less'),
  walletAddress: ethereumAddress,
  rateAmount: z.number().positive('Rate amount must be a positive number'),
  rateCurrency: z.string().default('MNEE'),
  payCycle: z.enum(['WEEKLY', 'BI_WEEKLY', 'MONTHLY'], {
    errorMap: () => ({ message: 'Pay cycle must be WEEKLY, BI_WEEKLY, or MONTHLY' }),
  }),
});

export type CreateContractorRequest = z.infer<typeof createContractorSchema>;

/**
 * PUT /api/v1/orgs/:id/contractors/:contractorId request body
 */
export const updateContractorSchema = z.object({
  name: z
    .string()
    .min(1, 'Contractor name is required')
    .max(100, 'Contractor name must be 100 characters or less')
    .optional(),
  walletAddress: ethereumAddress.optional(),
  rateAmount: z.number().positive('Rate amount must be a positive number').optional(),
  rateCurrency: z.string().optional(),
  payCycle: z
    .enum(['WEEKLY', 'BI_WEEKLY', 'MONTHLY'], {
      errorMap: () => ({ message: 'Pay cycle must be WEEKLY, BI_WEEKLY, or MONTHLY' }),
    })
    .optional(),
});

export type UpdateContractorRequest = z.infer<typeof updateContractorSchema>;

/**
 * GET /api/v1/orgs/:id/contractors query params
 */
export const listContractorsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  active: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
});

export type ListContractorsQuery = z.infer<typeof listContractorsQuerySchema>;

/**
 * Contractor ID parameter validation
 */
export const contractorIdParamSchema = z.object({
  id: z.string().uuid('Invalid organization ID'),
  contractorId: z.string().uuid('Invalid contractor ID'),
});

export type ContractorIdParam = z.infer<typeof contractorIdParamSchema>;
