"use client";

import * as React from "react";
import { Bell, Check, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { Notification } from "@/lib/api/types";
import { cn } from "@/lib/utils";

interface NotificationBellProps {
  className?: string;
}

/**
 * Accessible Notification Bell component.
 * 
 * WCAG 2.1 AA Compliance:
 * - Keyboard navigation (Arrow keys, Enter, Escape)
 * - Proper ARIA attributes for menu pattern
 * - Focus management within dropdown
 * - Screen reader announcements for unread count
 * 
 * Validates: Requirements 7.1, 7.2, 7.3
 */
export function NotificationBell({ className }: NotificationBellProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [focusedIndex, setFocusedIndex] = React.useState(-1);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const queryClient = useQueryClient();

  // Fetch notifications
  const {
    data: notificationsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.notifications.list({ limit: 10 }),
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10 * 1000, // 10 seconds - notifications should be relatively fresh
    gcTime: 2 * 60 * 1000, // 2 minutes cache
  });

  const notifications = notificationsData?.data ?? [];
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

  // Close dropdown when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle notification click
  const handleNotificationClick = React.useCallback((notification: Notification) => {
    if (!notification.read) {
      markAsReadMutation.mutate(notification.id);
    }
    // Could navigate based on notification type here
  }, [markAsReadMutation]);

  // Keyboard navigation for dropdown
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) {
        if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setIsOpen(true);
          setFocusedIndex(0);
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setFocusedIndex((prev) =>
            prev < notifications.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusedIndex((prev) =>
            prev > 0 ? prev - 1 : notifications.length - 1
          );
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < notifications.length) {
            handleNotificationClick(notifications[focusedIndex]!);
          }
          break;
        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          setFocusedIndex(-1);
          buttonRef.current?.focus();
          break;
        case "Tab":
          setIsOpen(false);
          setFocusedIndex(-1);
          break;
        case "Home":
          e.preventDefault();
          setFocusedIndex(0);
          break;
        case "End":
          e.preventDefault();
          setFocusedIndex(notifications.length - 1);
          break;
      }
    },
    [isOpen, notifications, focusedIndex, handleNotificationClick]
  );

  // Focus the selected item when dropdown opens
  React.useEffect(() => {
    if (isOpen && focusedIndex >= 0) {
      const items = dropdownRef.current?.querySelectorAll('[role="menuitem"]');
      if (items && items[focusedIndex]) {
        (items[focusedIndex] as HTMLElement).focus();
      }
    }
  }, [isOpen, focusedIndex]);

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

  // Get notification icon based on type
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
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100";
    }
  };

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      {/* Bell Button */}
      <Button
        ref={buttonRef}
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-controls="notification-menu"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span 
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center"
            aria-hidden="true"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {/* Dropdown */}
      {isOpen && (
        <div 
          id="notification-menu"
          className="absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-popover border border-border z-50"
          role="menu"
          aria-label="Notifications"
          onKeyDown={handleKeyDown}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-sm" id="notification-menu-label">Notifications</h3>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-auto py-1 px-2 min-h-[44px]"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
                aria-label="Mark all notifications as read"
              >
                {markAllAsReadMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" aria-hidden="true" />
                ) : (
                  <Check className="h-3 w-3 mr-1" aria-hidden="true" />
                )}
                Mark all as read
              </Button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto" role="group" aria-labelledby="notification-menu-label">
            {isLoading ? (
              <div className="p-4 space-y-3" role="status" aria-label="Loading notifications">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" aria-hidden="true" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-full" aria-hidden="true" />
                      <Skeleton className="h-3 w-20" aria-hidden="true" />
                    </div>
                  </div>
                ))}
                <span className="sr-only">Loading notifications...</span>
              </div>
            ) : error ? (
              <div className="p-4 text-center text-sm text-muted-foreground" role="alert">
                Failed to load notifications
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" aria-hidden="true" />
                <p>No notifications yet</p>
              </div>
            ) : (
              <div className="py-1">
                {notifications.map((notification, index) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    role="menuitem"
                    tabIndex={focusedIndex === index ? 0 : -1}
                    className={cn(
                      "w-full px-4 py-3 text-left hover:bg-accent transition-colors flex gap-3 min-h-[44px]",
                      !notification.read && "bg-accent/50",
                      focusedIndex === index && "bg-accent"
                    )}
                    aria-label={`${notification.read ? "" : "Unread: "}${notification.message}, ${formatRelativeTime(notification.createdAt)}`}
                  >
                    {/* Type indicator */}
                    <div
                      className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0",
                        getNotificationTypeStyles(notification.type)
                      )}
                      aria-hidden="true"
                    >
                      <Bell className="h-4 w-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
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

                    {/* Unread indicator */}
                    {!notification.read && (
                      <div 
                        className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-2" 
                        aria-hidden="true"
                      />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
