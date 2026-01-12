/**
 * Notification Routes
 *
 * Handles notification listing and read status management.
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import {
  listNotificationsQuerySchema,
  notificationIdParamSchema,
} from '../schemas/notification.js';
import {
  listNotifications,
  markAsRead,
  markAllAsRead,
} from '../services/notification.service.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All notification routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/notifications
 *
 * List notifications for the authenticated user.
 * Supports pagination and filtering by org and read status.
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params = listNotificationsQuerySchema.parse(req.query);
    const userId = req.user!.id;

    const result = await listNotifications(userId, params);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/notifications/:id/read
 *
 * Mark a single notification as read.
 */
router.put('/:id/read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: notificationId } = notificationIdParamSchema.parse(req.params);
    const userId = req.user!.id;

    await markAsRead(notificationId, userId);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/notifications/read-all
 *
 * Mark all notifications as read for the authenticated user.
 */
router.put('/read-all', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    await markAllAsRead(userId);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
