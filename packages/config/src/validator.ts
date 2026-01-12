import { z, ZodError, ZodSchema } from 'zod';

/**
 * Custom error class for configuration validation failures.
 * Provides detailed, human-readable error messages.
 */
export class ConfigValidationError extends Error {
  public readonly errors: Array<{ path: string; message: string }>;

  constructor(errors: Array<{ path: string; message: string }>) {
    const errorList = errors
      .map((e) => `  - ${e.path}: ${e.message}`)
      .join('\n');

    super(
      `\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `  CONFIGURATION ERROR\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `\n` +
        `  Missing or invalid environment variables:\n` +
        `\n` +
        `${errorList}\n` +
        `\n` +
        `  Please check your .env file and ensure all required variables are set.\n` +
        `  See .env.example for reference.\n` +
        `\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
    );

    this.name = 'ConfigValidationError';
    this.errors = errors;
  }
}

/**
 * Formats Zod validation errors into a readable format.
 */
function formatZodErrors(error: ZodError): Array<{ path: string; message: string }> {
  return error.errors.map((err) => ({
    path: err.path.length > 0 ? err.path.join('.') : 'unknown',
    message: err.message,
  }));
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
export function validateConfig<T extends ZodSchema>(
  schema: T,
  env: Record<string, string | undefined> = process.env
): z.infer<T> {
  const result = schema.safeParse(env);

  if (!result.success) {
    const errors = formatZodErrors(result.error);
    throw new ConfigValidationError(errors);
  }

  return result.data;
}
