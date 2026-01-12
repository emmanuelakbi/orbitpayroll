/**
 * Middleware Stack Configuration
 */

import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import type { ApiConfig } from '@orbitpayroll/config';
import { requestLogger } from './request-logger.js';
import { createRateLimiters } from './rate-limiter.js';

// Re-export validation middleware
export { validate, validateMultiple, type ValidatedRequest } from './validate.js';

// Re-export error handler
export { errorHandler } from './error-handler.js';

// Re-export auth middleware
export { authenticate } from './auth.js';

export function setupMiddleware(app: Express, config: ApiConfig): void {
  // Security headers
  app.use(helmet());

  // CORS configuration
  app.use(
    cors({
      origin: config.CORS_ORIGINS,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Response compression
  app.use(compression());

  // Body parsing
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  // Request logging
  app.use(requestLogger);

  // Rate limiting
  const { authLimiter, apiLimiter } = createRateLimiters(config);

  // Apply auth rate limiter to auth routes
  app.use('/api/v1/auth', authLimiter);

  // Apply general API rate limiter to all other routes
  app.use('/api/v1', apiLimiter);
}
