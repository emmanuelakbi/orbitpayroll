/**
 * Payroll Request/Response Validation Schemas
 */

import { z } from 'zod';

// Transaction hash validation (0x-prefixed, 66 chars total)
const txHash = z
  .string()
  .regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash format');

/**
 * POST /api/v1/orgs/:id/payroll-runs request body
 */
export const createPayrollRunSchema = z.object({
  txHash: txHash,
  items: z
    .array(
      z.object({
        contractorId: z.string().uuid('Invalid contractor ID'),
        amountMnee: z.string().regex(/^\d+(\.\d+)?$/, 'Amount must be a valid number string'),
      })
    )
    .min(1, 'At least one payroll item is required'),
  runLabel: z.string().max(100, 'Run label must be 100 characters or less').optional(),
});

export type CreatePayrollRunRequest = z.infer<typeof createPayrollRunSchema>;

/**
 * GET /api/v1/orgs/:id/payroll-runs query params
 */
export const listPayrollRunsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type ListPayrollRunsQuery = z.infer<typeof listPayrollRunsQuerySchema>;

/**
 * Payroll run ID parameter validation
 */
export const payrollRunIdParamSchema = z.object({
  id: z.string().uuid('Invalid organization ID'),
  runId: z.string().uuid('Invalid payroll run ID'),
});

export type PayrollRunIdParam = z.infer<typeof payrollRunIdParamSchema>;
