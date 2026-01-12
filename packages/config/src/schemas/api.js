"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiConfigSchema = void 0;
exports.loadApiConfig = loadApiConfig;
const zod_1 = require("zod");
const validator_1 = require("../validator");
/**
 * Ethereum address validation regex
 */
const ethereumAddress = zod_1.z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Must be a valid Ethereum address (0x followed by 40 hex characters)');
/**
 * API Backend configuration schema.
 * Validates all required environment variables for the backend service.
 */
exports.apiConfigSchema = zod_1.z.object({
    // Environment
    NODE_ENV: zod_1.z
        .enum(['development', 'staging', 'production'])
        .default('development'),
    // Server
    PORT: zod_1.z
        .string()
        .transform((val) => parseInt(val, 10))
        .pipe(zod_1.z.number().min(1).max(65535))
        .default('3001'),
    HOST: zod_1.z.string().default('localhost'),
    // Database (Required)
    DATABASE_URL: zod_1.z
        .string()
        .min(1, 'DATABASE_URL is required')
        .url('DATABASE_URL must be a valid URL'),
    // Authentication (Required)
    JWT_SECRET: zod_1.z
        .string()
        .min(32, 'JWT_SECRET must be at least 32 characters for security'),
    JWT_ACCESS_EXPIRY: zod_1.z.string().default('15m'),
    JWT_REFRESH_EXPIRY: zod_1.z.string().default('7d'),
    NONCE_EXPIRY_MINUTES: zod_1.z
        .string()
        .transform((val) => parseInt(val, 10))
        .pipe(zod_1.z.number().min(1).max(60))
        .default('5'),
    // Ethereum (Required)
    RPC_URL: zod_1.z
        .string()
        .min(1, 'RPC_URL is required')
        .url('RPC_URL must be a valid URL'),
    CHAIN_ID: zod_1.z
        .string()
        .transform((val) => parseInt(val, 10))
        .pipe(zod_1.z.number().positive())
        .default('11155111'),
    MNEE_TOKEN_ADDRESS: ethereumAddress,
    // CORS
    CORS_ORIGINS: zod_1.z
        .string()
        .transform((val) => val.split(',').map((s) => s.trim()))
        .default('http://localhost:3000'),
    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: zod_1.z
        .string()
        .transform((val) => parseInt(val, 10))
        .pipe(zod_1.z.number().positive())
        .default('60000'),
    RATE_LIMIT_AUTH_MAX: zod_1.z
        .string()
        .transform((val) => parseInt(val, 10))
        .pipe(zod_1.z.number().positive())
        .default('100'),
    RATE_LIMIT_API_MAX: zod_1.z
        .string()
        .transform((val) => parseInt(val, 10))
        .pipe(zod_1.z.number().positive())
        .default('1000'),
    // Optional: Redis
    REDIS_URL: zod_1.z.string().url().optional(),
    // Optional: Logging
    LOG_LEVEL: zod_1.z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    // Optional: Monitoring
    SENTRY_DSN: zod_1.z.string().url().optional(),
});
/**
 * Loads and validates API configuration from environment variables.
 * Call this at application startup to fail fast on missing config.
 *
 * @throws ConfigValidationError if required variables are missing or invalid
 */
function loadApiConfig() {
    return (0, validator_1.validateConfig)(exports.apiConfigSchema);
}
//# sourceMappingURL=api.js.map