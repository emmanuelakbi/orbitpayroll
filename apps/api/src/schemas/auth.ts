/**
 * Authentication Request/Response Validation Schemas
 */

import { z } from 'zod';

/**
 * Ethereum address validation - 0x-prefixed, 42 chars total
 * Accepts both checksummed and lowercase addresses, normalizes to lowercase
 */
export const ethereumAddress = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address')
  .transform((s) => s.toLowerCase());

/**
 * POST /api/v1/auth/nonce request body
 */
export const nonceRequestSchema = z.object({
  walletAddress: ethereumAddress,
});

export type NonceRequest = z.infer<typeof nonceRequestSchema>;

/**
 * POST /api/v1/auth/verify request body
 */
export const verifyRequestSchema = z.object({
  walletAddress: ethereumAddress,
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/, 'Invalid signature format'),
  nonce: z.string().min(1, 'Nonce is required'),
});

export type VerifyRequest = z.infer<typeof verifyRequestSchema>;

/**
 * POST /api/v1/auth/refresh request body
 */
export const refreshRequestSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type RefreshRequest = z.infer<typeof refreshRequestSchema>;
