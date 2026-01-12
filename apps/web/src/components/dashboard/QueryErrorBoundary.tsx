"use client";

import * as React from "react";
import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary, ErrorFallback } from "@/components/ui/error-boundary";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

interface QueryErrorBoundaryProps {
  children: React.ReactNode;
}

export function QueryErrorBoundary({ children }: QueryErrorBoundaryProps) {
  const { reset } = useQueryErrorResetBoundary();

  return (
    <ErrorBoundary onReset={reset}>
      {children}
    </ErrorBoundary>
  );
}

// Inline error state for query errors (not boundary)
interface QueryErrorProps {
  error: Error | null;
  onRetry?: () => void;
  title?: string;
  compact?: boolean;
}

export function QueryError({
  error,
  onRetry,
  title = "Failed to load data",
  compact = false,
}: QueryErrorProps) {
  if (!error) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm">
        <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
        <span className="text-destructive">{title}</span>
        {onRetry && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRetry}
            className="ml-auto h-7 px-2"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        )}
      </div>
    );
  }

  return (
    <ErrorFallback
      error={error}
      onReset={onRetry}
      title={title}
      description="We couldn't load this data. Please check your connection and try again."
    />
  );
}

// Empty state component
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon && (
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium mb-1">{title}</h3>
      {description && (
        <p className="text-muted-foreground text-sm max-w-sm mb-4">
          {description}
        </p>
      )}
      {action}
    </div>
  );
}
