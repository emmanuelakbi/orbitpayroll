/**
 * Rate Limiting Middleware
 *
 * Implements two tiers of rate limiting:
 * - Auth endpoints: 100 requests/minute per IP
 * - Authenticated API: 1000 requests/minute per IP
 */

import rateLimit from 'express-rate-limit';
import type { ApiConfig } from '@orbitpayroll/config';
import { logger } from '../lib/logger.js';

export function createRateLimiters(config: ApiConfig) {
  // Rate limiter for auth endpoints (stricter)
  const authLimiter = rateLimit({
    windowMs: config.RATE_LIMIT_WINDOW_MS,
    max: config.RATE_LIMIT_AUTH_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      code: 'RATE_LIMIT',
      message: 'Too many authentication requests, please try again later',
    },
    handler: (req, res, _next, options) => {
      logger.warn(
        {
          ip: req.ip,
          path: req.path,
          limit: options.max,
        },
        'Auth rate limit exceeded'
      );
      res.status(429).json(options.message);
    },
    keyGenerator: (req) => {
      // Use X-Forwarded-For if behind proxy, otherwise use IP
      return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip ?? 'unknown';
    },
  });

  // Rate limiter for general API endpoints (more permissive)
  const apiLimiter = rateLimit({
    windowMs: config.RATE_LIMIT_WINDOW_MS,
    max: config.RATE_LIMIT_API_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      code: 'RATE_LIMIT',
      message: 'Too many requests, please try again later',
    },
    handler: (req, res, _next, options) => {
      logger.warn(
        {
          ip: req.ip,
          path: req.path,
          limit: options.max,
        },
        'API rate limit exceeded'
      );
      res.status(429).json(options.message);
    },
    keyGenerator: (req) => {
      return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip ?? 'unknown';
    },
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/health' || req.path === '/ready';
    },
  });

  return { authLimiter, apiLimiter };
}
