/**
 * Global Error Handler Middleware
 *
 * Provides consistent error response format for all API errors:
 * - Zod validation errors → 400 with field-level details
 * - AppError instances → Custom status codes with error codes
 * - Prisma errors → Mapped to appropriate HTTP status codes
 * - SIWE errors → 401 authentication errors
 * - Unknown errors → 500 with correlation ID for tracking
 *
 * All errors are logged with request context for debugging.
 *
 * @see Requirements 9.3, 9.4, 9.5, 9.6, 9.7, 9.8
 */

import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../lib/logger.js';
import { AppError, ErrorCode } from '../lib/errors.js';

/**
 * Standard error response format
 * @see Requirement 9.3: Consistent error format
 */
interface ErrorResponse {
  code: string;
  message: string;
  details?: Record<string, string[]>;
  correlationId?: string;
}

/**
 * Prisma error codes we handle
 * @see https://www.prisma.io/docs/reference/api-reference/error-reference
 */
const PRISMA_ERROR_CODES = {
  P2002: 'P2002', // Unique constraint violation
  P2025: 'P2025', // Record not found
  P2003: 'P2003', // Foreign key constraint violation
  P2014: 'P2014', // Required relation violation
  P2016: 'P2016', // Query interpretation error
  P2021: 'P2021', // Table does not exist
  P2022: 'P2022', // Column does not exist
} as const;

function isPrismaError(err: unknown): err is { code: string; meta?: { target?: string[] } } {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    typeof (err as { code: unknown }).code === 'string' &&
    (err as { code: string }).code.startsWith('P')
  );
}

/**
 * Check if error is a ZodError (handles different module instances)
 */
function isZodError(err: unknown): err is ZodError {
  return (
    err instanceof ZodError ||
    (err !== null &&
      typeof err === 'object' &&
      'name' in err &&
      (err as { name: string }).name === 'ZodError' &&
      'issues' in err &&
      Array.isArray((err as { issues: unknown[] }).issues))
  );
}

/**
 * Check if error is a SiweError
 */
function isSiweError(err: unknown): err is Error & { type: string } {
  return (
    err !== null &&
    typeof err === 'object' &&
    'name' in err &&
    (err as { name: string }).name === 'SiweError'
  );
}

/**
 * Global error handler middleware
 *
 * @see Requirement 9.8: Log all errors with request context
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Generate correlation ID for tracking
  // @see Requirement 9.7: Return 500 for unexpected errors with correlation ID
  const correlationId = crypto.randomUUID();

  // Log error with context
  // @see Requirement 9.8: Log all errors with request context
  logger.error(
    {
      correlationId,
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      ip: req.ip,
      userId: req.user?.id,
    },
    'Request error'
  );

  // Handle known error types
  // @see Requirements 9.4, 9.5, 9.6: Return appropriate status codes
  if (err instanceof AppError) {
    const response: ErrorResponse = {
      code: err.code,
      message: err.message,
    };
    if (err.details) {
      response.details = err.details;
    }
    res.status(err.statusCode).json(response);
    return;
  }

  // Handle Zod validation errors
  // @see Requirement 9.2: Return 400 with field-level error details
  if (isZodError(err)) {
    const details: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const path = issue.path.length > 0 ? issue.path.join('.') : '_root';
      if (!details[path]) {
        details[path] = [];
      }
      details[path].push(issue.message);
    }

    const response: ErrorResponse = {
      code: ErrorCode.VALIDATION_ERROR,
      message: 'Invalid request body',
      details,
    };
    res.status(400).json(response);
    return;
  }

  // Handle SIWE errors
  // @see Requirement 9.4: Return 401 for invalid authentication
  if (isSiweError(err)) {
    const response: ErrorResponse = {
      code: ErrorCode.AUTH_002,
      message: 'Invalid signature or wallet address',
    };
    res.status(401).json(response);
    return;
  }

  // Handle Prisma errors
  // @see Requirement 9.6: Return 404 for non-existent resources
  if (isPrismaError(err)) {
    const response = handlePrismaError(err);
    res.status(response.status).json(response.body);
    return;
  }

  // Handle unknown errors
  // @see Requirement 9.7: Return 500 for unexpected errors with correlation ID
  const response: ErrorResponse = {
    code: ErrorCode.INTERNAL_ERROR,
    message: 'An unexpected error occurred',
    correlationId,
  };

  res.status(500).json(response);
}

/**
 * Handle Prisma-specific errors and map to HTTP responses
 * @see Requirement 9.6: Return 404 for non-existent resources
 */
function handlePrismaError(err: { code: string; meta?: { target?: string[] } }): {
  status: number;
  body: ErrorResponse;
} {
  switch (err.code) {
    case PRISMA_ERROR_CODES.P2002: {
      // Unique constraint violation → 409 Conflict
      const target = err.meta?.target ?? ['field'];
      return {
        status: 409,
        body: {
          code: 'CONFLICT',
          message: `A record with this ${target.join(', ')} already exists`,
        },
      };
    }
    case PRISMA_ERROR_CODES.P2025: {
      // Record not found → 404 Not Found
      return {
        status: 404,
        body: {
          code: 'NOT_FOUND',
          message: 'The requested resource was not found',
        },
      };
    }
    case PRISMA_ERROR_CODES.P2003: {
      // Foreign key constraint violation → 400 Bad Request
      return {
        status: 400,
        body: {
          code: 'INVALID_REFERENCE',
          message: 'Referenced record does not exist',
        },
      };
    }
    case PRISMA_ERROR_CODES.P2014: {
      // Required relation violation → 400 Bad Request
      return {
        status: 400,
        body: {
          code: 'RELATION_VIOLATION',
          message: 'Required related record is missing',
        },
      };
    }
    case PRISMA_ERROR_CODES.P2016:
    case PRISMA_ERROR_CODES.P2021:
    case PRISMA_ERROR_CODES.P2022: {
      // Query/schema errors → 500 Internal Server Error
      return {
        status: 500,
        body: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'A database configuration error occurred',
        },
      };
    }
    default: {
      // Unknown Prisma error → 500 Internal Server Error
      return {
        status: 500,
        body: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'A database error occurred',
        },
      };
    }
  }
}
