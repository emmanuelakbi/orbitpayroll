"use client";

import * as React from "react";
import { Bell, Check, Loader2, CheckCheck } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { Notification } from "@/lib/api/types";
import { cn } from "@/lib/utils";

interface NotificationListProps {
  notifications: Notification[];
  isLoading?: boolean;
  error?: Error | null;
  showMarkAllAsRead?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function NotificationList({
  notifications,
  isLoading = false,
  error = null,
  showMarkAllAsRead = true,
  emptyMessage = "No notifications yet",
  className,
}: NotificationListProps) {
  const queryClient = useQueryClient();
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Mark single notification as read
  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => api.notifications.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // Mark all notifications as read
  const markAllAsReadMutation = useMutation({
    mutationFn: () => api.notifications.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsReadMutation.mutate(notification.id);
    }
  };

  // Format relative time
  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Get notification type styles
  const getNotificationTypeStyles = (type: string): string => {
    switch (type) {
      case "PAYROLL_COMPLETED":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
      case "PAYROLL_FAILED":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
      case "DEPOSIT_RECEIVED":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100";
      case "LOW_BALANCE":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100";
      case "CONTRACTOR_ADDED":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100";
    }
  };

  // Get notification type label
  const getNotificationTypeLabel = (type: string): string => {
    switch (type) {
      case "PAYROLL_COMPLETED":
        return "Payroll";
      case "PAYROLL_FAILED":
        return "Error";
      case "DEPOSIT_RECEIVED":
        return "Deposit";
      case "LOW_BALANCE":
        return "Warning";
      case "CONTRACTOR_ADDED":
        return "Contractor";
      default:
        return "Info";
    }
  };

  if (isLoading) {
    return (
      <div className={cn("space-y-3", className)}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 p-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("p-4 text-center text-sm text-muted-foreground", className)}>
        <p>Failed to load notifications</p>
        <p className="text-xs mt-1">{error.message}</p>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className={cn("p-8 text-center text-sm text-muted-foreground", className)}>
        <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Mark all as read header */}
      {showMarkAllAsRead && unreadCount > 0 && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
          <span className="text-sm text-muted-foreground">
            {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-auto py-1 px-2"
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending}
          >
            {markAllAsReadMutation.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <CheckCheck className="h-3 w-3 mr-1" />
            )}
            Mark all as read
          </Button>
        </div>
      )}

      {/* Notification items */}
      <div className="divide-y divide-border">
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onClick={() => handleNotificationClick(notification)}
            formatRelativeTime={formatRelativeTime}
            getTypeStyles={getNotificationTypeStyles}
            getTypeLabel={getNotificationTypeLabel}
            isMarking={markAsReadMutation.isPending && markAsReadMutation.variables === notification.id}
          />
        ))}
      </div>
    </div>
  );
}

interface NotificationItemProps {
  notification: Notification;
  onClick: () => void;
  formatRelativeTime: (date: string) => string;
  getTypeStyles: (type: string) => string;
  getTypeLabel: (type: string) => string;
  isMarking?: boolean;
}

function NotificationItem({
  notification,
  onClick,
  formatRelativeTime,
  getTypeStyles,
  getTypeLabel,
  isMarking = false,
}: NotificationItemProps) {
  return (
    <button
      onClick={onClick}
      disabled={isMarking}
      className={cn(
        "w-full px-4 py-3 text-left hover:bg-accent transition-colors flex gap-3",
        !notification.read && "bg-accent/50",
        isMarking && "opacity-50"
      )}
    >
      {/* Type indicator */}
      <div
        className={cn(
          "h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0",
          getTypeStyles(notification.type)
        )}
      >
        <Bell className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span
            className={cn(
              "text-xs px-2 py-0.5 rounded-full",
              getTypeStyles(notification.type)
            )}
          >
            {getTypeLabel(notification.type)}
          </span>
          {!notification.read && (
            <span className="h-2 w-2 rounded-full bg-primary" />
          )}
        </div>
        <p
          className={cn(
            "text-sm line-clamp-2",
            !notification.read && "font-medium"
          )}
        >
          {notification.message}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {formatRelativeTime(notification.createdAt)}
        </p>
      </div>

      {/* Mark as read indicator */}
      {!notification.read && !isMarking && (
        <div className="flex-shrink-0 self-center">
          <Check className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )}
      {isMarking && (
        <div className="flex-shrink-0 self-center">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
    </button>
  );
}
