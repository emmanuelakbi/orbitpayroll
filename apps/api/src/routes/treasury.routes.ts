/**
 * Treasury Routes
 *
 * Handles treasury information retrieval for organizations.
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { uuidParamSchema } from '../schemas/org.js';
import { getTreasuryInfo } from '../services/treasury.service.js';
import { authenticate } from '../middleware/auth.js';

const router = Router({ mergeParams: true });

// All treasury routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/orgs/:id/treasury
 *
 * Get treasury information for an organization.
 * Returns contract address, balance, upcoming payroll total, and sufficiency status.
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: orgId } = uuidParamSchema.parse(req.params);
    const userId = req.user!.id;

    const treasuryInfo = await getTreasuryInfo(orgId, userId);

    res.status(200).json(treasuryInfo);
  } catch (error) {
    next(error);
  }
});

export default router;
