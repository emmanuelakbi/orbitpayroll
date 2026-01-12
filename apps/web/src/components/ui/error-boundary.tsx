"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, RefreshCw } from "lucide-react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorFallback
          error={this.state.error}
          onReset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error | null;
  onReset?: () => void;
  title?: string;
  description?: string;
}

export function ErrorFallback({
  error,
  onReset,
  title = "Something went wrong",
  description = "An unexpected error occurred. Please try again.",
}: ErrorFallbackProps) {
  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <CardTitle className="text-lg">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">{description}</p>
        {error && process.env.NODE_ENV === "development" && (
          <pre className="text-xs bg-muted p-2 rounded mb-4 overflow-auto max-h-32">
            {error.message}
          </pre>
        )}
        {onReset && (
          <Button onClick={onReset} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// Hook for handling async errors with retry
interface UseRetryOptions {
  maxRetries?: number;
  retryDelay?: number;
}

export function useRetry<T>(
  asyncFn: () => Promise<T>,
  options: UseRetryOptions = {}
) {
  const { maxRetries = 3, retryDelay = 1000 } = options;
  const [data, setData] = React.useState<T | null>(null);
  const [error, setError] = React.useState<Error | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [retryCount, setRetryCount] = React.useState(0);

  const execute = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await asyncFn();
      setData(result);
      setRetryCount(0);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [asyncFn]);

  const retry = React.useCallback(async () => {
    if (retryCount >= maxRetries) {
      return;
    }

    setRetryCount((prev) => prev + 1);

    // Wait before retrying
    await new Promise((resolve) => setTimeout(resolve, retryDelay));

    return execute();
  }, [execute, retryCount, maxRetries, retryDelay]);

  const reset = React.useCallback(() => {
    setData(null);
    setError(null);
    setRetryCount(0);
  }, []);

  return {
    data,
    error,
    isLoading,
    retryCount,
    canRetry: retryCount < maxRetries,
    execute,
    retry,
    reset,
  };
}
