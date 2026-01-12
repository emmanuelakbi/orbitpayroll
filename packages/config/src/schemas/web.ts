import { z } from 'zod';
import { validateConfig } from '../validator';

/**
 * Ethereum address validation regex
 */
const ethereumAddress = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Must be a valid Ethereum address (0x followed by 40 hex characters)');

/**
 * Web Frontend configuration schema.
 * Validates all required environment variables for the Next.js frontend.
 * Note: NEXT_PUBLIC_ prefix variables are exposed to the browser.
 */
export const webConfigSchema = z.object({
  // Environment
  NODE_ENV: z
    .enum(['development', 'staging', 'production'])
    .default('development'),

  // API (Required)
  NEXT_PUBLIC_API_URL: z
    .string()
    .min(1, 'NEXT_PUBLIC_API_URL is required')
    .url('NEXT_PUBLIC_API_URL must be a valid URL'),

  // Ethereum (Required)
  NEXT_PUBLIC_RPC_URL: z
    .string()
    .min(1, 'NEXT_PUBLIC_RPC_URL is required')
    .url('NEXT_PUBLIC_RPC_URL must be a valid URL'),
  NEXT_PUBLIC_SEPOLIA_RPC_URL: z.string().url().optional(),
  NEXT_PUBLIC_CHAIN_ID: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().positive())
    .default('11155111'),
  NEXT_PUBLIC_MNEE_ADDRESS: ethereumAddress,

  // Wallet (Required)
  NEXT_PUBLIC_WC_PROJECT_ID: z
    .string()
    .min(1, 'NEXT_PUBLIC_WC_PROJECT_ID is required for WalletConnect'),

  // Optional: Feature Flags
  NEXT_PUBLIC_TESTNET_MODE: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
  NEXT_PUBLIC_MOCK_MODE: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),

  // Optional: Monitoring
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_ANALYTICS_ID: z.string().optional(),
});

export type WebConfig = z.infer<typeof webConfigSchema>;

/**
 * Loads and validates Web configuration from environment variables.
 * Call this at application startup to fail fast on missing config.
 *
 * @throws ConfigValidationError if required variables are missing or invalid
 */
export function loadWebConfig(): WebConfig {
  return validateConfig(webConfigSchema);
}
