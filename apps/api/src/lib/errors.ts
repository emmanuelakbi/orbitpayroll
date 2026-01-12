/**
 * Custom Error Classes and Error Codes
 */

export const ErrorCode = {
  // Authentication errors
  AUTH_001: 'AUTH_001', // Nonce expired
  AUTH_002: 'AUTH_002', // Invalid signature
  AUTH_003: 'AUTH_003', // Token expired
  AUTH_004: 'AUTH_004', // Invalid token

  // Organization errors
  ORG_001: 'ORG_001', // Invalid org name
  ORG_002: 'ORG_002', // Not a member
  ORG_003: 'ORG_003', // Insufficient role
  ORG_004: 'ORG_004', // Org not found

  // Contractor errors
  CONT_001: 'CONT_001', // Invalid wallet address
  CONT_002: 'CONT_002', // Duplicate wallet
  CONT_003: 'CONT_003', // Invalid rate
  CONT_004: 'CONT_004', // Contractor not found

  // Payroll errors
  PAY_001: 'PAY_001', // Invalid tx hash
  PAY_002: 'PAY_002', // Payroll run not found

  // Notification errors
  NOTIF_001: 'NOTIF_001', // Notification not found

  // General errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMIT: 'RATE_LIMIT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCodeType,
    message: string,
    public readonly statusCode: number = 400,
    public readonly details?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

// Convenience factory functions
export const AuthError = {
  nonceExpired: () =>
    new AppError(ErrorCode.AUTH_001, 'Nonce has expired. Please request a new one.', 401),
  invalidSignature: () =>
    new AppError(ErrorCode.AUTH_002, 'Invalid signature. Please sign the message again.', 401),
  tokenExpired: () =>
    new AppError(ErrorCode.AUTH_003, 'Session expired. Please reconnect your wallet.', 401),
  invalidToken: () =>
    new AppError(ErrorCode.AUTH_004, 'Invalid authentication token.', 401),
};

export const OrgError = {
  invalidName: () =>
    new AppError(ErrorCode.ORG_001, 'Organization name must be 1-100 characters.', 400),
  notMember: () =>
    new AppError(ErrorCode.ORG_002, 'You are not a member of this organization.', 403),
  insufficientRole: () =>
    new AppError(ErrorCode.ORG_003, 'You do not have permission to perform this action.', 403),
  notFound: () =>
    new AppError(ErrorCode.ORG_004, 'Organization not found.', 404),
};

export const ContractorError = {
  invalidWallet: () =>
    new AppError(ErrorCode.CONT_001, 'Invalid Ethereum wallet address.', 400),
  duplicateWallet: () =>
    new AppError(ErrorCode.CONT_002, 'A contractor with this wallet address already exists in this organization.', 409),
  invalidRate: () =>
    new AppError(ErrorCode.CONT_003, 'Rate amount must be a positive number.', 400),
  notFound: () =>
    new AppError(ErrorCode.CONT_004, 'Contractor not found.', 404),
};

export const PayrollError = {
  invalidTxHash: () =>
    new AppError(ErrorCode.PAY_001, 'Invalid transaction hash format.', 400),
  notFound: () =>
    new AppError(ErrorCode.PAY_002, 'Payroll run not found.', 404),
};

export const NotificationError = {
  notFound: () =>
    new AppError(ErrorCode.NOTIF_001, 'Notification not found.', 404),
};
