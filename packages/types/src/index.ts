/**
 * @orbitpayroll/types
 * Shared TypeScript types for OrbitPayroll frontend and backend
 */

// User & Auth
export type { User, Session, AuthNonce } from './user.js';

// Organization
export type { Organization, OrgMember, OrgMemberRole } from './organization.js';

// Contractor
export type {
  Contractor,
  CreateContractorInput,
  UpdateContractorInput,
} from './contractor.js';

// Payroll
export type {
  PayrollRun,
  PayrollItem,
  PayrollPreview,
  PayrollRunStatus,
} from './payroll.js';

// Events
export type { AuditEvent, EventType } from './event.js';

// API
export type {
  ApiResponse,
  ApiError,
  ApiResult,
  PaginatedResponse,
} from './api.js';

// Contracts
export {
  MNEE_TOKEN_ADDRESS,
  type ContractAddresses,
  type PayrollExecutionParams,
  type TreasuryDepositEvent,
  type PayrollExecutedEvent,
} from './contract.js';
