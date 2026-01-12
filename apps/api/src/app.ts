/**
 * Express Application Factory
 */

import express, { type Express } from 'express';
import type { ApiConfig } from '@orbitpayroll/config';
import { setupMiddleware } from './middleware/index.js';
import { setupRoutes } from './routes/index.js';
import { errorHandler } from './middleware/error-handler.js';

export function createApp(config: ApiConfig): Express {
  const app = express();

  // Setup middleware stack
  setupMiddleware(app, config);

  // Setup API routes
  setupRoutes(app);

  // Error handling (must be last)
  app.use(errorHandler);

  return app;
}
