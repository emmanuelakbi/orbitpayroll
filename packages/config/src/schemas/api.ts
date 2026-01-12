import { z } from 'zod';
import { validateConfig } from '../validator';

/**
 * Ethereum address validation regex
 */
const ethereumAddress = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Must be a valid Ethereum address (0x followed by 40 hex characters)');

/**
 * API Backend configuration schema.
 * Validates all required environment variables for the backend service.
 */
export const apiConfigSchema = z.object({
  // Environment
  NODE_ENV: z
    .enum(['development', 'staging', 'production'])
    .default('development'),

  // Server
  PORT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1).max(65535))
    .default('3001'),
  HOST: z.string().default('localhost'),

  // Database (Required)
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required')
    .url('DATABASE_URL must be a valid URL'),

  // Authentication (Required)
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters for security'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  NONCE_EXPIRY_MINUTES: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1).max(60))
    .default('5'),

  // Ethereum (Required)
  RPC_URL: z
    .string()
    .min(1, 'RPC_URL is required')
    .url('RPC_URL must be a valid URL'),
  CHAIN_ID: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().positive())
    .default('11155111'),
  MNEE_TOKEN_ADDRESS: ethereumAddress,

  // CORS
  CORS_ORIGINS: z
    .string()
    .transform((val) => val.split(',').map((s) => s.trim()))
    .default('http://localhost:3000'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().positive())
    .default('60000'),
  RATE_LIMIT_AUTH_MAX: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().positive())
    .default('100'),
  RATE_LIMIT_API_MAX: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().positive())
    .default('1000'),

  // Optional: Redis
  REDIS_URL: z.string().url().optional(),

  // Optional: Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  // Optional: Monitoring
  SENTRY_DSN: z.string().url().optional(),
});

export type ApiConfig = z.infer<typeof apiConfigSchema>;

/**
 * Loads and validates API configuration from environment variables.
 * Call this at application startup to fail fast on missing config.
 *
 * @throws ConfigValidationError if required variables are missing or invalid
 */
export function loadApiConfig(): ApiConfig {
  return validateConfig(apiConfigSchema);
}
