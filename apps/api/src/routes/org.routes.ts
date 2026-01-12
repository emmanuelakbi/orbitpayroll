/**
 * Organization Routes
 *
 * Handles organization CRUD operations.
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import {
  createOrgSchema,
  updateOrgSchema,
  uuidParamSchema,
  addMemberSchema,
  updateMemberSchema,
  memberIdParamSchema,
} from '../schemas/org.js';
import {
  createOrganization,
  listOrganizations,
  getOrganization,
  updateOrganization,
  addMember,
  listMembers,
  updateMemberRole,
  removeMember,
} from '../services/org.service.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All organization routes require authentication
router.use(authenticate);

/**
 * POST /api/v1/orgs
 *
 * Create a new organization.
 * The authenticated user becomes the OWNER_ADMIN.
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = createOrgSchema.parse(req.body);
    const userId = req.user!.id;

    const org = await createOrganization(userId, name);

    res.status(201).json(org);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/orgs
 *
 * List all organizations where the user is a member.
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const result = await listOrganizations(userId);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/orgs/:id
 *
 * Get a single organization by ID.
 * User must be a member of the organization.
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = uuidParamSchema.parse(req.params);
    const userId = req.user!.id;

    const org = await getOrganization(id, userId);

    res.status(200).json(org);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/orgs/:id
 *
 * Update an organization.
 * Requires OWNER_ADMIN role.
 */
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = uuidParamSchema.parse(req.params);
    const data = updateOrgSchema.parse(req.body);
    const userId = req.user!.id;

    const org = await updateOrganization(id, userId, { name: data.name });

    res.status(200).json(org);
  } catch (error) {
    next(error);
  }
});

// ============================================
// Member Routes
// ============================================

/**
 * POST /api/v1/orgs/:id/members
 *
 * Add a member to an organization.
 * Requires OWNER_ADMIN role.
 */
router.post('/:id/members', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = uuidParamSchema.parse(req.params);
    const { walletAddress, role } = addMemberSchema.parse(req.body);
    const userId = req.user!.id;

    const member = await addMember(id, userId, walletAddress, role);

    res.status(201).json(member);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/orgs/:id/members
 *
 * List all members of an organization.
 * User must be a member of the organization.
 */
router.get('/:id/members', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = uuidParamSchema.parse(req.params);
    const userId = req.user!.id;

    const result = await listMembers(id, userId);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/orgs/:id/members/:memberId
 *
 * Update a member's role.
 * Requires OWNER_ADMIN role.
 */
router.put('/:id/members/:memberId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, memberId } = memberIdParamSchema.parse(req.params);
    const { role } = updateMemberSchema.parse(req.body);
    const userId = req.user!.id;

    const member = await updateMemberRole(id, memberId, userId, role);

    res.status(200).json(member);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/orgs/:id/members/:memberId
 *
 * Remove a member from an organization.
 * Requires OWNER_ADMIN role.
 * Cannot remove the last OWNER_ADMIN.
 */
router.delete('/:id/members/:memberId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, memberId } = memberIdParamSchema.parse(req.params);
    const userId = req.user!.id;

    await removeMember(id, memberId, userId);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
