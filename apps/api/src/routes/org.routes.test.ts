/**
 * Organization Routes Tests
 *
 * Property-based tests for organization membership enforcement.
 * **Feature: 03-backend, Property 4: Organization Membership Enforcement**
 * **Validates: Requirements 2.3, 2.4, 2.5**
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import fc from 'fast-check';
import express, { type Express } from 'express';
import request from 'supertest';
import { db } from '../lib/db.js';
import orgRoutes from './org.routes.js';
import { errorHandler } from '../middleware/error-handler.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET ?? 'development-secret-change-me';

/**
 * Create a minimal test app without rate limiting
 */
function createTestApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/orgs', orgRoutes);
  app.use(errorHandler);
  return app;
}

/**
 * Generate a valid JWT token for a user
 */
function generateTestToken(userId: string, walletAddress: string): string {
  return jwt.sign(
    { sub: userId, wallet: walletAddress },
    JWT_SECRET,
    { expiresIn: '15m' }
  );
}

/**
 * Generate valid organization names for testing (alphanumeric + spaces only)
 */
const validOrgNameArb = fc
  .stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 '.split('')), { minLength: 1, maxLength: 50 })
  .filter((s) => s.trim().length > 0);

describe('Organization Routes', () => {
  let app: Express;
  // Test users
  let ownerUser: { id: string; walletAddress: string };
  let memberUser: { id: string; walletAddress: string };
  let nonMemberUser: { id: string; walletAddress: string };
  let ownerToken: string;
  let memberToken: string;
  let nonMemberToken: string;

  beforeAll(async () => {
    app = createTestApp();

    // Create test users
    ownerUser = await db.user.create({
      data: { walletAddress: '0x' + '1'.repeat(40) },
    });
    memberUser = await db.user.create({
      data: { walletAddress: '0x' + '2'.repeat(40) },
    });
    nonMemberUser = await db.user.create({
      data: { walletAddress: '0x' + '3'.repeat(40) },
    });

    // Generate tokens
    ownerToken = generateTestToken(ownerUser.id, ownerUser.walletAddress);
    memberToken = generateTestToken(memberUser.id, memberUser.walletAddress);
    nonMemberToken = generateTestToken(nonMemberUser.id, nonMemberUser.walletAddress);
  });

  afterAll(async () => {
    // Clean up test data
    await db.orgMember.deleteMany({
      where: {
        userId: { in: [ownerUser.id, memberUser.id, nonMemberUser.id] },
      },
    });
    await db.organization.deleteMany({
      where: {
        ownerId: { in: [ownerUser.id, memberUser.id, nonMemberUser.id] },
      },
    });
    await db.user.deleteMany({
      where: {
        id: { in: [ownerUser.id, memberUser.id, nonMemberUser.id] },
      },
    });
    await db.$disconnect();
  });

  describe('POST /api/v1/orgs', () => {
    it('should create organization with caller as OWNER_ADMIN', async () => {
      const res = await request(app)
        .post('/api/v1/orgs')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Test Organization' });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Test Organization');
      expect(res.body.ownerId).toBe(ownerUser.id);

      // Verify membership was created
      const membership = await db.orgMember.findUnique({
        where: {
          orgId_userId: {
            orgId: res.body.id,
            userId: ownerUser.id,
          },
        },
      });
      expect(membership).not.toBeNull();
      expect(membership?.role).toBe('OWNER_ADMIN');

      // Clean up
      await db.orgMember.deleteMany({ where: { orgId: res.body.id } });
      await db.organization.delete({ where: { id: res.body.id } });
    });

    it('should reject request without authentication', async () => {
      const res = await request(app)
        .post('/api/v1/orgs')
        .send({ name: 'Test Organization' });

      expect(res.status).toBe(401);
    });

    it('should reject invalid organization name', async () => {
      const res = await request(app)
        .post('/api/v1/orgs')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: '' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/orgs', () => {
    let testOrg: { id: string };

    beforeEach(async () => {
      // Create a test organization
      testOrg = await db.organization.create({
        data: {
          name: 'List Test Org',
          treasuryAddress: '0x' + '0'.repeat(40),
          ownerId: ownerUser.id,
          members: {
            create: {
              userId: ownerUser.id,
              role: 'OWNER_ADMIN',
            },
          },
        },
      });
    });

    afterAll(async () => {
      // Clean up
      await db.orgMember.deleteMany({ where: { orgId: testOrg.id } });
      await db.organization.delete({ where: { id: testOrg.id } }).catch(() => {});
    });

    it('should return only organizations where user is a member', async () => {
      const res = await request(app)
        .get('/api/v1/orgs')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.some((org: { id: string }) => org.id === testOrg.id)).toBe(true);
    });

    it('should return empty list for user with no memberships', async () => {
      const res = await request(app)
        .get('/api/v1/orgs')
        .set('Authorization', `Bearer ${nonMemberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.some((org: { id: string }) => org.id === testOrg.id)).toBe(false);
    });
  });

  describe('Property 4: Organization Membership Enforcement', () => {
    let testOrg: { id: string; name: string };

    beforeAll(async () => {
      // Create a test organization with owner and member
      testOrg = await db.organization.create({
        data: {
          name: 'Property Test Org',
          treasuryAddress: '0x' + '0'.repeat(40),
          ownerId: ownerUser.id,
          members: {
            createMany: {
              data: [
                { userId: ownerUser.id, role: 'OWNER_ADMIN' },
                { userId: memberUser.id, role: 'FINANCE_OPERATOR' },
              ],
            },
          },
        },
      });
    });

    afterAll(async () => {
      // Clean up
      await db.orgMember.deleteMany({ where: { orgId: testOrg.id } });
      await db.organization.delete({ where: { id: testOrg.id } }).catch(() => {});
    });

    /**
     * Property 4a: Non-members cannot access organization details
     * For any API request to GET /api/v1/orgs/:id, if the user is not a member,
     * the request SHALL be rejected with 403.
     * **Validates: Requirements 2.3, 2.5**
     */
    it('should reject GET request from non-member with 403', async () => {
      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}`)
        .set('Authorization', `Bearer ${nonMemberToken}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('ORG_002');
    });

    /**
     * Property 4b: Members can access organization details
     * For any API request to GET /api/v1/orgs/:id, if the user is a member,
     * the request SHALL succeed.
     * **Validates: Requirements 2.3**
     */
    it('should allow GET request from member', async () => {
      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testOrg.id);
    });

    /**
     * Property 4c: Non-members cannot update organization
     * For any API request to PUT /api/v1/orgs/:id, if the user is not a member,
     * the request SHALL be rejected with 403.
     * **Validates: Requirements 2.4, 2.5**
     */
    it('should reject PUT request from non-member with 403', async () => {
      const res = await request(app)
        .put(`/api/v1/orgs/${testOrg.id}`)
        .set('Authorization', `Bearer ${nonMemberToken}`)
        .send({ name: 'Hacked Org' });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('ORG_002');
    });

    /**
     * Property 4d: FINANCE_OPERATOR cannot update organization
     * For any API request to PUT /api/v1/orgs/:id, if the user is a FINANCE_OPERATOR,
     * the request SHALL be rejected with 403.
     * **Validates: Requirements 2.4**
     */
    it('should reject PUT request from FINANCE_OPERATOR with 403', async () => {
      const res = await request(app)
        .put(`/api/v1/orgs/${testOrg.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ name: 'Updated by Operator' });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('ORG_003');
    });

    /**
     * Property 4e: OWNER_ADMIN can update organization
     * For any API request to PUT /api/v1/orgs/:id, if the user is an OWNER_ADMIN,
     * the request SHALL succeed.
     * **Validates: Requirements 2.4**
     */
    it('should allow PUT request from OWNER_ADMIN', async () => {
      const newName = 'Updated Org Name';
      const res = await request(app)
        .put(`/api/v1/orgs/${testOrg.id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: newName });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe(newName);
    });

    /**
     * Property 4f: Property-based test for membership enforcement
     * For any randomly generated organization and user combinations,
     * membership enforcement SHALL be consistent.
     * **Validates: Requirements 2.3, 2.4, 2.5**
     */
    it('should consistently enforce membership across random org names', async () => {
      await fc.assert(
        fc.asyncProperty(validOrgNameArb, async (orgName) => {
          // Create a new org with owner
          const org = await db.organization.create({
            data: {
              name: orgName,
              treasuryAddress: '0x' + '0'.repeat(40),
              ownerId: ownerUser.id,
              members: {
                create: {
                  userId: ownerUser.id,
                  role: 'OWNER_ADMIN',
                },
              },
            },
          });

          try {
            // Non-member should be rejected
            const nonMemberRes = await request(app)
              .get(`/api/v1/orgs/${org.id}`)
              .set('Authorization', `Bearer ${nonMemberToken}`);

            // Member should be allowed
            const memberRes = await request(app)
              .get(`/api/v1/orgs/${org.id}`)
              .set('Authorization', `Bearer ${ownerToken}`);

            return nonMemberRes.status === 403 && memberRes.status === 200;
          } finally {
            // Clean up
            await db.orgMember.deleteMany({ where: { orgId: org.id } });
            await db.organization.delete({ where: { id: org.id } }).catch(() => {});
          }
        }),
        { numRuns: 25 }
      );
    }, 60000); // Increase timeout for property test
  });

  describe('GET /api/v1/orgs/:id', () => {
    it('should return 404 for non-existent organization', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .get(`/api/v1/orgs/${fakeId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('ORG_004');
    });

    it('should return 400 for invalid UUID', async () => {
      const res = await request(app)
        .get('/api/v1/orgs/invalid-uuid')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(400);
    });
  });
});
