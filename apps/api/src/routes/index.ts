/**
 * API Routes Configuration
 */

import type { Express, Request, Response } from 'express';
import { db } from '../lib/db.js';
import authRoutes from './auth.routes.js';
import orgRoutes from './org.routes.js';
import contractorRoutes from './contractor.routes.js';
import payrollRoutes from './payroll.routes.js';
import treasuryRoutes from './treasury.routes.js';
import notificationRoutes from './notification.routes.js';

export function setupRoutes(app: Express): void {
  // Health check endpoints
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/ready', async (_req: Request, res: Response) => {
    try {
      // Check database connectivity
      await db.$queryRaw`SELECT 1`;
      res.json({ status: 'ready', timestamp: new Date().toISOString() });
    } catch {
      res.status(503).json({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        error: 'Database connection failed',
      });
    }
  });

  // API version prefix
  const apiV1 = '/api/v1';

  // API info endpoint
  app.get(`${apiV1}`, (_req: Request, res: Response) => {
    res.json({
      name: 'OrbitPayroll API',
      version: '1.0.0',
      endpoints: {
        auth: `${apiV1}/auth`,
        orgs: `${apiV1}/orgs`,
        contractors: `${apiV1}/orgs/:id/contractors`,
        payrollRuns: `${apiV1}/orgs/:id/payroll-runs`,
        treasury: `${apiV1}/orgs/:id/treasury`,
        notifications: `${apiV1}/notifications`,
      },
    });
  });

  // Mount route modules
  app.use(`${apiV1}/auth`, authRoutes);
  app.use(`${apiV1}/orgs`, orgRoutes);
  app.use(`${apiV1}/orgs/:id/contractors`, contractorRoutes);
  app.use(`${apiV1}/orgs/:id/payroll-runs`, payrollRoutes);
  app.use(`${apiV1}/orgs/:id/treasury`, treasuryRoutes);
  app.use(`${apiV1}/notifications`, notificationRoutes);

  // 404 handler for unknown routes
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      code: 'NOT_FOUND',
      message: 'The requested endpoint does not exist',
    });
  });
}
