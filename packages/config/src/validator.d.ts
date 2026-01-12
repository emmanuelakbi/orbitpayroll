import { z, ZodSchema } from 'zod';
/**
 * Custom error class for configuration validation failures.
 * Provides detailed, human-readable error messages.
 */
export declare class ConfigValidationError extends Error {
    readonly errors: Array<{
        path: string;
        message: string;
    }>;
    constructor(errors: Array<{
        path: string;
        message: string;
    }>);
}
/**
 * Validates environment variables against a Zod schema.
 * Throws ConfigValidationError with detailed messages on failure.
 *
 * @param schema - Zod schema to validate against
 * @param env - Environment object (defaults to process.env)
 * @returns Validated and typed configuration object
 * @throws ConfigValidationError if validation fails
 */
export declare function validateConfig<T extends ZodSchema>(schema: T, env?: Record<string, string | undefined>): z.infer<T>;
//# sourceMappingURL=validator.d.ts.map