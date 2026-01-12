/**
 * Payroll Routes
 *
 * Handles payroll preview, run creation, and history retrieval.
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import {
  createPayrollRunSchema,
  listPayrollRunsQuerySchema,
  payrollRunIdParamSchema,
} from '../schemas/payroll.js';
import { uuidParamSchema } from '../schemas/org.js';
import {
  previewPayroll,
  createPayrollRun,
  listPayrollRuns,
  getPayrollRun,
} from '../services/payroll.service.js';
import { authenticate } from '../middleware/auth.js';

const router = Router({ mergeParams: true });

// All payroll routes require authentication
router.use(authenticate);

/**
 * POST /api/v1/orgs/:id/payroll-runs/preview
 *
 * Generate a payroll preview for an organization.
 * Calculates total MNEE from active contractors.
 */
router.post('/preview', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: orgId } = uuidParamSchema.parse(req.params);
    const userId = req.user!.id;

    const preview = await previewPayroll(orgId, userId);

    res.status(200).json(preview);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/orgs/:id/payroll-runs
 *
 * Create a new payroll run.
 * Records the transaction hash and creates payroll items.
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: orgId } = uuidParamSchema.parse(req.params);
    const data = createPayrollRunSchema.parse(req.body);
    const userId = req.user!.id;

    const payrollRun = await createPayrollRun(orgId, userId, data);

    res.status(201).json(payrollRun);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/orgs/:id/payroll-runs
 *
 * List all payroll runs for an organization.
 * Supports pagination.
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: orgId } = uuidParamSchema.parse(req.params);
    const params = listPayrollRunsQuerySchema.parse(req.query);
    const userId = req.user!.id;

    const result = await listPayrollRuns(orgId, userId, params);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/orgs/:id/payroll-runs/:runId
 *
 * Get a single payroll run with items.
 */
router.get('/:runId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: orgId, runId } = payrollRunIdParamSchema.parse(req.params);
    const userId = req.user!.id;

    const payrollRun = await getPayrollRun(orgId, runId, userId);

    res.status(200).json(payrollRun);
  } catch (error) {
    next(error);
  }
});

export default router;
