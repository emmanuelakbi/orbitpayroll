import type { ApiError } from "./api/types";

/**
 * Human-readable error messages mapped from API error codes.
 * Each message avoids technical jargon and provides actionable guidance.
 */
export interface ErrorMessage {
  title: string;
  description: string;
  action?: string;
}

/**
 * Error code to human-readable message mapping.
 * Follows Requirements 9.1, 9.2, 9.3, 9.4 for clear, non-technical error messages.
 */
export const errorMessages: Record<string, ErrorMessage> = {
  // Authentication errors
  AUTH_001: {
    title: "Session Expired",
    description: "Your session has ended. Please reconnect your wallet to continue.",
    action: "Reconnect Wallet",
  },
  AUTH_002: {
    title: "Signature Failed",
    description: "We couldn't verify your wallet signature. Please try signing again.",
    action: "Try Again",
  },
  AUTH_003: {
    title: "Invalid Signature",
    description: "The signature doesn't match your wallet. Please try again.",
    action: "Try Again",
  },
  AUTH_004: {
    title: "Wallet Not Connected",
    description: "Please connect your wallet to access this feature.",
    action: "Connect Wallet",
  },

  // Organization errors
  ORG_001: {
    title: "Organization Not Found",
    description: "We couldn't find this organization. It may have been removed.",
  },
  ORG_002: {
    title: "Access Denied",
    description: "You don't have permission to access this organization.",
  },
  ORG_003: {
    title: "Organization Name Taken",
    description: "An organization with this name already exists. Please choose a different name.",
  },

  // Contractor errors
  CONT_001: {
    title: "Contractor Not Found",
    description: "We couldn't find this contractor. They may have been removed.",
  },
  CONT_002: {
    title: "Duplicate Wallet Address",
    description: "A contractor with this wallet address already exists in your organization.",
  },
  CONT_003: {
    title: "Invalid Wallet Address",
    description: "The wallet address format is invalid. Please check and try again.",
  },
  CONT_004: {
    title: "Invalid Rate",
    description: "The payment rate must be a positive number.",
  },

  // Payroll errors
  PAY_001: {
    title: "Insufficient Balance",
    description: "Your treasury doesn't have enough MNEE to run this payroll. Please deposit more funds.",
    action: "Deposit MNEE",
  },
  PAY_002: {
    title: "No Active Contractors",
    description: "There are no active contractors to pay. Add contractors before running payroll.",
    action: "Add Contractor",
  },
  PAY_003: {
    title: "Payroll Already Running",
    description: "A payroll is already in progress. Please wait for it to complete.",
  },
  PAY_004: {
    title: "Payroll Run Not Found",
    description: "We couldn't find this payroll run. It may have been removed.",
  },

  // Treasury errors
  TREAS_001: {
    title: "Treasury Not Configured",
    description: "Your organization's treasury hasn't been set up yet.",
    action: "Configure Treasury",
  },
  TREAS_002: {
    title: "Deposit Failed",
    description: "The deposit couldn't be completed. Please check your wallet balance and try again.",
    action: "Try Again",
  },

  // Transaction errors
  TX_REJECTED: {
    title: "Transaction Rejected",
    description: "You cancelled the transaction in your wallet. No changes were made.",
  },
  TX_FAILED: {
    title: "Transaction Failed",
    description: "The transaction couldn't be completed on the blockchain. Please try again.",
    action: "Try Again",
  },
  TX_TIMEOUT: {
    title: "Transaction Timeout",
    description: "The transaction is taking longer than expected. Check your wallet for status.",
  },
  TX_INSUFFICIENT_GAS: {
    title: "Insufficient Gas",
    description: "You don't have enough ETH to pay for transaction fees.",
    action: "Add ETH",
  },

  // Network errors
  NETWORK_ERROR: {
    title: "Connection Error",
    description: "Unable to reach the server. Please check your internet connection.",
    action: "Retry",
  },
  NETWORK_OFFLINE: {
    title: "You're Offline",
    description: "Please check your internet connection and try again.",
  },

  // Validation errors
  VALIDATION_ERROR: {
    title: "Invalid Input",
    description: "Please check your input and try again.",
  },

  // Rate limiting
  RATE_LIMIT: {
    title: "Too Many Requests",
    description: "Please wait a moment before trying again.",
  },

  // Generic errors
  UNKNOWN_ERROR: {
    title: "Something Went Wrong",
    description: "An unexpected error occurred. Please try again.",
    action: "Try Again",
  },
  SERVER_ERROR: {
    title: "Server Error",
    description: "We're having trouble processing your request. Please try again later.",
  },
};

/**
 * Get a human-readable error message from an API error.
 * Falls back to generic message if error code is not mapped.
 */
export function getErrorMessage(error: ApiError | Error | unknown): ErrorMessage {
  // Handle ApiError with code
  if (error && typeof error === "object" && "code" in error) {
    const apiError = error as ApiError;
    const mapped = errorMessages[apiError.code];
    if (mapped) {
      return mapped;
    }
    // Use the API message if no mapping exists
    return {
      title: "Error",
      description: apiError.message || "An error occurred.",
    };
  }

  // Handle standard Error
  if (error instanceof Error) {
    // Check for common error patterns
    if (error.message.includes("network") || error.message.includes("fetch")) {
      return errorMessages.NETWORK_ERROR;
    }
    if (error.message.includes("rejected") || error.message.includes("denied")) {
      return errorMessages.TX_REJECTED;
    }
    return {
      title: "Error",
      description: error.message,
    };
  }

  // Fallback
  return errorMessages.UNKNOWN_ERROR;
}

/**
 * Check if an error is a specific type
 */
export function isErrorCode(error: unknown, code: string): boolean {
  return error !== null && typeof error === "object" && "code" in error && (error as ApiError).code === code;
}

/**
 * Get suggested action for an error, if any
 */
export function getErrorAction(error: ApiError | Error | unknown): string | undefined {
  const message = getErrorMessage(error);
  return message.action;
}
