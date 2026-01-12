/**
 * Notification Request/Response Validation Schemas
 */

import { z } from 'zod';

/**
 * GET /api/v1/notifications query params
 */
export const listNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  orgId: z.string().uuid('Invalid organization ID').optional(),
  unreadOnly: z.coerce.boolean().optional().default(false),
});

export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;

/**
 * Notification ID parameter validation
 */
export const notificationIdParamSchema = z.object({
  id: z.string().uuid('Invalid notification ID'),
});

export type NotificationIdParam = z.infer<typeof notificationIdParamSchema>;
