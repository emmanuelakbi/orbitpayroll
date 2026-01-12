import { z } from 'zod';
/**
 * Smart Contracts configuration schema.
 * Validates all required environment variables for contract deployment and testing.
 */
export declare const contractsConfigSchema: z.ZodObject<{
    MAINNET_RPC_URL: z.ZodOptional<z.ZodString>;
    SEPOLIA_RPC_URL: z.ZodString;
    LOCAL_RPC_URL: z.ZodDefault<z.ZodString>;
    DEPLOYER_PRIVATE_KEY: z.ZodString;
    MNEE_TOKEN_ADDRESS: z.ZodString;
    ETHERSCAN_API_KEY: z.ZodOptional<z.ZodString>;
    GAS_PRICE_GWEI: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>;
    GAS_LIMIT_MULTIPLIER: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>;
    FORK_BLOCK_NUMBER: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>;
    REPORT_GAS: z.ZodDefault<z.ZodEffects<z.ZodString, boolean, string>>;
}, "strip", z.ZodTypeAny, {
    MNEE_TOKEN_ADDRESS: string;
    SEPOLIA_RPC_URL: string;
    LOCAL_RPC_URL: string;
    DEPLOYER_PRIVATE_KEY: string;
    REPORT_GAS: boolean;
    MAINNET_RPC_URL?: string | undefined;
    ETHERSCAN_API_KEY?: string | undefined;
    GAS_PRICE_GWEI?: number | undefined;
    GAS_LIMIT_MULTIPLIER?: number | undefined;
    FORK_BLOCK_NUMBER?: number | undefined;
}, {
    MNEE_TOKEN_ADDRESS: string;
    SEPOLIA_RPC_URL: string;
    DEPLOYER_PRIVATE_KEY: string;
    MAINNET_RPC_URL?: string | undefined;
    LOCAL_RPC_URL?: string | undefined;
    ETHERSCAN_API_KEY?: string | undefined;
    GAS_PRICE_GWEI?: string | undefined;
    GAS_LIMIT_MULTIPLIER?: string | undefined;
    FORK_BLOCK_NUMBER?: string | undefined;
    REPORT_GAS?: string | undefined;
}>;
export type ContractsConfig = z.infer<typeof contractsConfigSchema>;
/**
 * Loads and validates Contracts configuration from environment variables.
 * Call this at application startup to fail fast on missing config.
 *
 * @throws ConfigValidationError if required variables are missing or invalid
 */
export declare function loadContractsConfig(): ContractsConfig;
//# sourceMappingURL=contracts.d.ts.map