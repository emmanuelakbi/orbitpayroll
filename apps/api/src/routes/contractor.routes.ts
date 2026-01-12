/**
 * Contractor Routes
 *
 * Handles contractor CRUD operations within organizations.
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import {
  createContractorSchema,
  updateContractorSchema,
  listContractorsQuerySchema,
  contractorIdParamSchema,
} from '../schemas/contractor.js';
import { uuidParamSchema } from '../schemas/org.js';
import {
  createContractor,
  listContractors,
  getContractor,
  updateContractor,
  archiveContractor,
} from '../services/contractor.service.js';
import { authenticate } from '../middleware/auth.js';

const router = Router({ mergeParams: true });

// All contractor routes require authentication
router.use(authenticate);

/**
 * POST /api/v1/orgs/:id/contractors
 *
 * Create a new contractor in an organization.
 * Any member can create contractors.
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: orgId } = uuidParamSchema.parse(req.params);
    const data = createContractorSchema.parse(req.body);
    const userId = req.user!.id;

    const contractor = await createContractor(orgId, userId, data);

    res.status(201).json(contractor);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/orgs/:id/contractors
 *
 * List all contractors in an organization.
 * Supports pagination, search, and filtering.
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: orgId } = uuidParamSchema.parse(req.params);
    const params = listContractorsQuerySchema.parse(req.query);
    const userId = req.user!.id;

    const result = await listContractors(orgId, userId, params);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/orgs/:id/contractors/:contractorId
 *
 * Get a single contractor by ID.
 */
router.get('/:contractorId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: orgId, contractorId } = contractorIdParamSchema.parse(req.params);
    const userId = req.user!.id;

    const contractor = await getContractor(orgId, contractorId, userId);

    res.status(200).json(contractor);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/orgs/:id/contractors/:contractorId
 *
 * Update a contractor.
 * Requires OWNER_ADMIN role.
 */
router.put('/:contractorId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: orgId, contractorId } = contractorIdParamSchema.parse(req.params);
    const data = updateContractorSchema.parse(req.body);
    const userId = req.user!.id;

    const contractor = await updateContractor(orgId, contractorId, userId, data);

    res.status(200).json(contractor);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/orgs/:id/contractors/:contractorId
 *
 * Archive (soft delete) a contractor.
 * Requires OWNER_ADMIN role.
 */
router.delete('/:contractorId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: orgId, contractorId } = contractorIdParamSchema.parse(req.params);
    const userId = req.user!.id;

    await archiveContractor(orgId, contractorId, userId);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
