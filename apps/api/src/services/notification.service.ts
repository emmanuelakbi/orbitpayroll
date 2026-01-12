/**
 * Notification Service
 *
 * Handles notification listing and read status management.
 */

import { db } from '../lib/db.js';
import { NotificationError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

// ============================================
// Response Types
// ============================================

export interface NotificationResponse {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  orgId: string | null;
  createdAt: string;
}

export interface ListNotificationsResponse {
  data: NotificationResponse[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    unreadCount: number;
  };
}

// ============================================
// Input Types
// ============================================

export interface ListNotificationsParams {
  page: number;
  limit: number;
  orgId?: string | undefined;
  unreadOnly: boolean;
}

// ============================================
// Service Functions
// ============================================

/**
 * List notifications for a user with pagination and filtering
 */
export async function listNotifications(
  userId: string,
  params: ListNotificationsParams
): Promise<ListNotificationsResponse> {
  const { page, limit, orgId, unreadOnly } = params;
  const skip = (page - 1) * limit;

  // Build where clause
  const where: {
    userId: string;
    orgId?: string;
    read?: boolean;
  } = { userId };

  if (orgId) {
    where.orgId = orgId;
  }

  if (unreadOnly) {
    where.read = false;
  }

  // Get total count, unread count, and notifications
  const [total, unreadCount, notifications] = await Promise.all([
    db.notification.count({ where }),
    db.notification.count({ where: { userId, read: false } }),
    db.notification.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return {
    data: notifications.map(formatNotificationResponse),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      unreadCount,
    },
  };
}

/**
 * Mark a single notification as read
 */
export async function markAsRead(
  notificationId: string,
  userId: string
): Promise<void> {
  // Find the notification and verify ownership
  const notification = await db.notification.findFirst({
    where: {
      id: notificationId,
      userId,
    },
  });

  if (!notification) {
    throw NotificationError.notFound();
  }

  // Update the notification
  await db.notification.update({
    where: { id: notificationId },
    data: { read: true },
  });

  logger.debug({ notificationId, userId }, 'Notification marked as read');
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string): Promise<void> {
  const result = await db.notification.updateMany({
    where: {
      userId,
      read: false,
    },
    data: { read: true },
  });

  logger.debug({ userId, count: result.count }, 'All notifications marked as read');
}

// ============================================
// Helper Functions
// ============================================

function formatNotificationResponse(notification: {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  orgId: string | null;
  createdAt: Date;
}): NotificationResponse {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    read: notification.read,
    orgId: notification.orgId,
    createdAt: notification.createdAt.toISOString(),
  };
}
