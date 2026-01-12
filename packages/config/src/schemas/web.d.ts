import { z } from 'zod';
/**
 * Web Frontend configuration schema.
 * Validates all required environment variables for the Next.js frontend.
 * Note: NEXT_PUBLIC_ prefix variables are exposed to the browser.
 */
export declare const webConfigSchema: z.ZodObject<{
    NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "staging", "production"]>>;
    NEXT_PUBLIC_API_URL: z.ZodString;
    NEXT_PUBLIC_RPC_URL: z.ZodString;
    NEXT_PUBLIC_SEPOLIA_RPC_URL: z.ZodOptional<z.ZodString>;
    NEXT_PUBLIC_CHAIN_ID: z.ZodDefault<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>;
    NEXT_PUBLIC_MNEE_ADDRESS: z.ZodString;
    NEXT_PUBLIC_WC_PROJECT_ID: z.ZodString;
    NEXT_PUBLIC_TESTNET_MODE: z.ZodDefault<z.ZodEffects<z.ZodString, boolean, string>>;
    NEXT_PUBLIC_MOCK_MODE: z.ZodDefault<z.ZodEffects<z.ZodString, boolean, string>>;
    NEXT_PUBLIC_SENTRY_DSN: z.ZodOptional<z.ZodString>;
    NEXT_PUBLIC_ANALYTICS_ID: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    NODE_ENV: "development" | "staging" | "production";
    NEXT_PUBLIC_API_URL: string;
    NEXT_PUBLIC_RPC_URL: string;
    NEXT_PUBLIC_CHAIN_ID: number;
    NEXT_PUBLIC_MNEE_ADDRESS: string;
    NEXT_PUBLIC_WC_PROJECT_ID: string;
    NEXT_PUBLIC_TESTNET_MODE: boolean;
    NEXT_PUBLIC_MOCK_MODE: boolean;
    NEXT_PUBLIC_SEPOLIA_RPC_URL?: string | undefined;
    NEXT_PUBLIC_SENTRY_DSN?: string | undefined;
    NEXT_PUBLIC_ANALYTICS_ID?: string | undefined;
}, {
    NEXT_PUBLIC_API_URL: string;
    NEXT_PUBLIC_RPC_URL: string;
    NEXT_PUBLIC_MNEE_ADDRESS: string;
    NEXT_PUBLIC_WC_PROJECT_ID: string;
    NODE_ENV?: "development" | "staging" | "production" | undefined;
    NEXT_PUBLIC_SEPOLIA_RPC_URL?: string | undefined;
    NEXT_PUBLIC_CHAIN_ID?: string | undefined;
    NEXT_PUBLIC_TESTNET_MODE?: string | undefined;
    NEXT_PUBLIC_MOCK_MODE?: string | undefined;
    NEXT_PUBLIC_SENTRY_DSN?: string | undefined;
    NEXT_PUBLIC_ANALYTICS_ID?: string | undefined;
}>;
export type WebConfig = z.infer<typeof webConfigSchema>;
/**
 * Loads and validates Web configuration from environment variables.
 * Call this at application startup to fail fast on missing config.
 *
 * @throws ConfigValidationError if required variables are missing or invalid
 */
export declare function loadWebConfig(): WebConfig;
//# sourceMappingURL=web.d.ts.map