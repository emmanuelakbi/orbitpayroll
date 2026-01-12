/**
 * Schema Index
 *
 * Central export point for all Zod validation schemas.
 * Import schemas from this file for consistency.
 */

// Auth schemas
export {
  ethereumAddress,
  nonceRequestSchema,
  verifyRequestSchema,
  refreshRequestSchema,
  type NonceRequest,
  type VerifyRequest,
  type RefreshRequest,
} from './auth.js';

// Organization schemas
export {
  createOrgSchema,
  updateOrgSchema,
  uuidParamSchema,
  memberIdParamSchema,
  addMemberSchema,
  updateMemberSchema,
  type CreateOrgRequest,
  type UpdateOrgRequest,
  type UuidParam,
  type MemberIdParam,
  type AddMemberRequest,
  type UpdateMemberRequest,
} from './org.js';

// Contractor schemas
export {
  createContractorSchema,
  updateContractorSchema,
  listContractorsQuerySchema,
  contractorIdParamSchema,
  type CreateContractorRequest,
  type UpdateContractorRequest,
  type ListContractorsQuery,
  type ContractorIdParam,
} from './contractor.js';

// Payroll schemas
export {
  createPayrollRunSchema,
  listPayrollRunsQuerySchema,
  payrollRunIdParamSchema,
  type CreatePayrollRunRequest,
  type ListPayrollRunsQuery,
  type PayrollRunIdParam,
} from './payroll.js';

// Notification schemas
export {
  listNotificationsQuerySchema,
  notificationIdParamSchema,
  type ListNotificationsQuery,
  type NotificationIdParam,
} from './notification.js';
