"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contractsConfigSchema = void 0;
exports.loadContractsConfig = loadContractsConfig;
const zod_1 = require("zod");
const validator_1 = require("../validator");
/**
 * Ethereum address validation regex
 */
const ethereumAddress = zod_1.z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Must be a valid Ethereum address (0x followed by 40 hex characters)');
/**
 * Private key validation regex (with 0x prefix)
 */
const privateKey = zod_1.z
    .string()
    .regex(/^0x[a-fA-F0-9]{64}$/, 'Must be a valid private key (0x followed by 64 hex characters)');
/**
 * Smart Contracts configuration schema.
 * Validates all required environment variables for contract deployment and testing.
 */
exports.contractsConfigSchema = zod_1.z.object({
    // Network RPC URLs
    MAINNET_RPC_URL: zod_1.z.string().url().optional(),
    SEPOLIA_RPC_URL: zod_1.z
        .string()
        .min(1, 'SEPOLIA_RPC_URL is required for testnet deployment')
        .url('SEPOLIA_RPC_URL must be a valid URL'),
    LOCAL_RPC_URL: zod_1.z.string().url().default('http://127.0.0.1:8545'),
    // Deployment Keys (Required for deployment)
    DEPLOYER_PRIVATE_KEY: privateKey,
    // Contract Addresses
    MNEE_TOKEN_ADDRESS: ethereumAddress,
    // Etherscan Verification (Optional)
    ETHERSCAN_API_KEY: zod_1.z.string().optional(),
    // Gas Configuration (Optional)
    GAS_PRICE_GWEI: zod_1.z
        .string()
        .transform((val) => parseInt(val, 10))
        .pipe(zod_1.z.number().positive())
        .optional(),
    GAS_LIMIT_MULTIPLIER: zod_1.z
        .string()
        .transform((val) => parseFloat(val))
        .pipe(zod_1.z.number().min(1).max(3))
        .optional(),
    // Testing Configuration
    FORK_BLOCK_NUMBER: zod_1.z
        .string()
        .transform((val) => parseInt(val, 10))
        .pipe(zod_1.z.number().positive())
        .optional(),
    REPORT_GAS: zod_1.z
        .string()
        .transform((val) => val === 'true')
        .default('false'),
});
/**
 * Loads and validates Contracts configuration from environment variables.
 * Call this at application startup to fail fast on missing config.
 *
 * @throws ConfigValidationError if required variables are missing or invalid
 */
function loadContractsConfig() {
    return (0, validator_1.validateConfig)(exports.contractsConfigSchema);
}
//# sourceMappingURL=contracts.js.map