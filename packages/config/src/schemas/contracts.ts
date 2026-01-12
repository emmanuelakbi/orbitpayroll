import { z } from 'zod';
import { validateConfig } from '../validator';

/**
 * Ethereum address validation regex
 */
const ethereumAddress = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Must be a valid Ethereum address (0x followed by 40 hex characters)');

/**
 * Private key validation regex (with 0x prefix)
 */
const privateKey = z
  .string()
  .regex(/^0x[a-fA-F0-9]{64}$/, 'Must be a valid private key (0x followed by 64 hex characters)');

/**
 * Smart Contracts configuration schema.
 * Validates all required environment variables for contract deployment and testing.
 */
export const contractsConfigSchema = z.object({
  // Network RPC URLs
  MAINNET_RPC_URL: z.string().url().optional(),
  SEPOLIA_RPC_URL: z
    .string()
    .min(1, 'SEPOLIA_RPC_URL is required for testnet deployment')
    .url('SEPOLIA_RPC_URL must be a valid URL'),
  LOCAL_RPC_URL: z.string().url().default('http://127.0.0.1:8545'),

  // Deployment Keys (Required for deployment)
  DEPLOYER_PRIVATE_KEY: privateKey,

  // Contract Addresses
  MNEE_TOKEN_ADDRESS: ethereumAddress,

  // Etherscan Verification (Optional)
  ETHERSCAN_API_KEY: z.string().optional(),

  // Gas Configuration (Optional)
  GAS_PRICE_GWEI: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().positive())
    .optional(),
  GAS_LIMIT_MULTIPLIER: z
    .string()
    .transform((val) => parseFloat(val))
    .pipe(z.number().min(1).max(3))
    .optional(),

  // Testing Configuration
  FORK_BLOCK_NUMBER: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().positive())
    .optional(),
  REPORT_GAS: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
});

export type ContractsConfig = z.infer<typeof contractsConfigSchema>;

/**
 * Loads and validates Contracts configuration from environment variables.
 * Call this at application startup to fail fast on missing config.
 *
 * @throws ConfigValidationError if required variables are missing or invalid
 */
export function loadContractsConfig(): ContractsConfig {
  return validateConfig(contractsConfigSchema);
}
