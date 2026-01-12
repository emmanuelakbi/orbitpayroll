import { useToast, type ToastType } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/error-messages";
import type { ApiError } from "@/lib/api/types";

/**
 * Custom hook that provides toast notifications with error message mapping.
 * Automatically converts API errors to human-readable messages.
 */
export function useAppToast() {
  const { addToast, removeToast, clearToasts } = useToast();

  /**
   * Show a success toast
   */
  const success = (title: string, message?: string) => {
    return addToast({ type: "success", title, message });
  };

  /**
   * Show an info toast
   */
  const info = (title: string, message?: string) => {
    return addToast({ type: "info", title, message });
  };

  /**
   * Show a warning toast
   */
  const warning = (title: string, message?: string) => {
    return addToast({ type: "warning", title, message });
  };

  /**
   * Show an error toast with automatic message mapping
   */
  const error = (
    errorOrTitle: ApiError | Error | unknown | string,
    message?: string
  ) => {
    // If it's a string, use it directly as title
    if (typeof errorOrTitle === "string") {
      return addToast({ type: "error", title: errorOrTitle, message });
    }

    // Otherwise, map the error to a human-readable message
    const errorMessage = getErrorMessage(errorOrTitle);
    return addToast({
      type: "error",
      title: errorMessage.title,
      message: errorMessage.description,
      action: errorMessage.action
        ? {
            label: errorMessage.action,
            onClick: () => {
              // Action handling can be customized per use case
              // For now, just dismiss the toast
            },
          }
        : undefined,
    });
  };

  /**
   * Show a toast with a custom action button
   */
  const withAction = (
    type: ToastType,
    title: string,
    message: string,
    actionLabel: string,
    onAction: () => void
  ) => {
    return addToast({
      type,
      title,
      message,
      action: { label: actionLabel, onClick: onAction },
    });
  };

  /**
   * Show an error toast with a retry action
   */
  const errorWithRetry = (
    errorOrTitle: ApiError | Error | unknown | string,
    onRetry: () => void
  ) => {
    const errorMessage =
      typeof errorOrTitle === "string"
        ? { title: errorOrTitle, description: "" }
        : getErrorMessage(errorOrTitle);

    return addToast({
      type: "error",
      title: errorMessage.title,
      message: errorMessage.description,
      action: { label: "Try Again", onClick: onRetry },
    });
  };

  /**
   * Show a transaction status toast
   */
  const transaction = {
    pending: (message = "Transaction submitted...") =>
      addToast({
        type: "info",
        title: "Transaction Pending",
        message,
        duration: 0, // Don't auto-dismiss
      }),
    success: (message = "Transaction confirmed!") =>
      addToast({
        type: "success",
        title: "Transaction Successful",
        message,
      }),
    error: (error: unknown) => {
      const errorMessage = getErrorMessage(error);
      return addToast({
        type: "error",
        title: errorMessage.title,
        message: errorMessage.description,
      });
    },
  };

  return {
    success,
    info,
    warning,
    error,
    withAction,
    errorWithRetry,
    transaction,
    removeToast,
    clearToasts,
  };
}
