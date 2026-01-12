/**
 * Organization-related types for OrbitPayroll
 */

export type OrgMemberRole = 'owner' | 'admin' | 'operator' | 'viewer';

export interface Organization {
  id: string;
  name: string;
  treasuryAddress: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrgMember {
  id: string;
  orgId: string;
  userId: string;
  role: OrgMemberRole;
  createdAt: Date;
  updatedAt: Date;
}
