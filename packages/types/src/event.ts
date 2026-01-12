/**
 * Audit event types for OrbitPayroll
 */

export type EventType =
  | 'org.created'
  | 'org.updated'
  | 'member.added'
  | 'member.removed'
  | 'member.role_changed'
  | 'contractor.created'
  | 'contractor.updated'
  | 'contractor.deleted'
  | 'payroll.executed'
  | 'payroll.confirmed'
  | 'payroll.failed'
  | 'treasury.deployed'
  | 'treasury.funded';

export interface AuditEvent {
  id: string;
  orgId: string;
  eventType: EventType;
  actorWallet: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}
