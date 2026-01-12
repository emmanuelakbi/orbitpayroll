/**
 * Request Validation Middleware
 *
 * Provides reusable middleware for validating request body, params, and query
 * using Zod schemas. Validation errors are automatically handled by the
 * error-handler middleware.
 */

import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { ZodSchema } from 'zod';

/**
 * Validation target - which part of the request to validate
 */
type ValidationTarget = 'body' | 'params' | 'query';

/**
 * Creates a validation middleware for the specified request target.
 *
 * @param schema - Zod schema to validate against
 * @param target - Which part of the request to validate (body, params, or query)
 * @returns Express middleware that validates and transforms the request data
 *
 * @example
 * // Validate request body
 * router.post('/', validate(createOrgSchema, 'body'), handler);
 *
 * // Validate URL params
 * router.get('/:id', validate(uuidParamSchema, 'params'), handler);
 *
 * // Validate query string
 * router.get('/', validate(listQuerySchema, 'query'), handler);
 */
export function validate<T>(
  schema: ZodSchema<T>,
  target: ValidationTarget = 'body'
): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const data = schema.parse(req[target]);
      // Replace with parsed/transformed data
      req[target] = data;
      next();
    } catch (error) {
      // Let the error handler middleware handle ZodErrors
      next(error);
    }
  };
}

/**
 * Validates multiple targets in a single middleware.
 *
 * @param schemas - Object mapping targets to their schemas
 * @returns Express middleware that validates all specified targets
 *
 * @example
 * router.put('/:id',
 *   validateMultiple({
 *     params: uuidParamSchema,
 *     body: updateOrgSchema,
 *   }),
 *   handler
 * );
 */
export function validateMultiple(
  schemas: Partial<Record<ValidationTarget, ZodSchema>>
): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      for (const [target, schema] of Object.entries(schemas)) {
        if (schema) {
          const data = schema.parse(req[target as ValidationTarget]);
          req[target as ValidationTarget] = data;
        }
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Type helper to extract the validated type from a schema.
 * Use this to type your route handlers.
 *
 * @example
 * type CreateOrgBody = ValidatedRequest<typeof createOrgSchema>;
 */
export type ValidatedRequest<T extends ZodSchema> = T extends ZodSchema<infer U> ? U : never;
