import { z } from 'zod';
/**
 * API Backend configuration schema.
 * Validates all required environment variables for the backend service.
 */
export declare const apiConfigSchema: z.ZodObject<{
    NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "staging", "production"]>>;
    PORT: z.ZodDefault<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>;
    HOST: z.ZodDefault<z.ZodString>;
    DATABASE_URL: z.ZodString;
    JWT_SECRET: z.ZodString;
    JWT_ACCESS_EXPIRY: z.ZodDefault<z.ZodString>;
    JWT_REFRESH_EXPIRY: z.ZodDefault<z.ZodString>;
    NONCE_EXPIRY_MINUTES: z.ZodDefault<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>;
    RPC_URL: z.ZodString;
    CHAIN_ID: z.ZodDefault<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>;
    MNEE_TOKEN_ADDRESS: z.ZodString;
    CORS_ORIGINS: z.ZodDefault<z.ZodEffects<z.ZodString, string[], string>>;
    RATE_LIMIT_WINDOW_MS: z.ZodDefault<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>;
    RATE_LIMIT_AUTH_MAX: z.ZodDefault<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>;
    RATE_LIMIT_API_MAX: z.ZodDefault<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>;
    REDIS_URL: z.ZodOptional<z.ZodString>;
    LOG_LEVEL: z.ZodDefault<z.ZodEnum<["error", "warn", "info", "debug"]>>;
    SENTRY_DSN: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    NODE_ENV: "development" | "staging" | "production";
    PORT: number;
    HOST: string;
    DATABASE_URL: string;
    JWT_SECRET: string;
    JWT_ACCESS_EXPIRY: string;
    JWT_REFRESH_EXPIRY: string;
    NONCE_EXPIRY_MINUTES: number;
    RPC_URL: string;
    CHAIN_ID: number;
    MNEE_TOKEN_ADDRESS: string;
    CORS_ORIGINS: string[];
    RATE_LIMIT_WINDOW_MS: number;
    RATE_LIMIT_AUTH_MAX: number;
    RATE_LIMIT_API_MAX: number;
    LOG_LEVEL: "error" | "warn" | "info" | "debug";
    REDIS_URL?: string | undefined;
    SENTRY_DSN?: string | undefined;
}, {
    DATABASE_URL: string;
    JWT_SECRET: string;
    RPC_URL: string;
    MNEE_TOKEN_ADDRESS: string;
    NODE_ENV?: "development" | "staging" | "production" | undefined;
    PORT?: string | undefined;
    HOST?: string | undefined;
    JWT_ACCESS_EXPIRY?: string | undefined;
    JWT_REFRESH_EXPIRY?: string | undefined;
    NONCE_EXPIRY_MINUTES?: string | undefined;
    CHAIN_ID?: string | undefined;
    CORS_ORIGINS?: string | undefined;
    RATE_LIMIT_WINDOW_MS?: string | undefined;
    RATE_LIMIT_AUTH_MAX?: string | undefined;
    RATE_LIMIT_API_MAX?: string | undefined;
    REDIS_URL?: string | undefined;
    LOG_LEVEL?: "error" | "warn" | "info" | "debug" | undefined;
    SENTRY_DSN?: string | undefined;
}>;
export type ApiConfig = z.infer<typeof apiConfigSchema>;
/**
 * Loads and validates API configuration from environment variables.
 * Call this at application startup to fail fast on missing config.
 *
 * @throws ConfigValidationError if required variables are missing or invalid
 */
export declare function loadApiConfig(): ApiConfig;
//# sourceMappingURL=api.d.ts.map