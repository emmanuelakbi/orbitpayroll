/**
 * Contractor Service Property Tests
 *
 * Property-based tests for contractor wallet uniqueness.
 * **Feature: 03-backend, Property 6: Contractor Wallet Uniqueness**
 * **Validates: Requirements 4.9**
 */

import { describe, it, beforeAll, afterAll } from 'vitest';
import fc from 'fast-check';
import { db } from '../lib/db.js';
import { createContractor } from './contractor.service.js';
import type { PayCycle } from '@orbitpayroll/database';

/**
 * Generate valid Ethereum addresses (42 characters, lowercase)
 */
const ethereumAddressArb = fc
  .hexaString({ minLength: 40, maxLength: 40 })
  .map((hex) => `0x${hex.toLowerCase()}`);

/**
 * Generate valid contractor names (alphanumeric to avoid DB issues)
 */
const contractorNameArb = fc
  .stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789 '.split('')), { minLength: 1, maxLength: 50 })
  .filter((s) => s.trim().length > 0);

/**
 * Generate valid rate amounts (use integers to avoid floating point issues)
 */
const rateAmountArb = fc.integer({ min: 1, max: 100000 });

/**
 * Generate valid pay cycles
 */
const payCycleArb = fc.constantFrom<PayCycle>('WEEKLY', 'BI_WEEKLY', 'MONTHLY');

// Test fixtures
let testUserId: string;
let testOrgId: string;
let testOrg2Id: string;

// Use unique wallet prefix to avoid conflicts with other tests
const TEST_WALLET_PREFIX = 'contractor_test_';
const TEST_USER_WALLET = '0x' + TEST_WALLET_PREFIX + 'a'.repeat(40 - TEST_WALLET_PREFIX.length);
const TEST_TREASURY_WALLET_1 = '0x' + TEST_WALLET_PREFIX + 'b'.repeat(40 - TEST_WALLET_PREFIX.length);
const TEST_TREASURY_WALLET_2 = '0x' + TEST_WALLET_PREFIX + 'c'.repeat(40 - TEST_WALLET_PREFIX.length);

beforeAll(async () => {
  // Clean up only test-specific data (not all data)
  const existingUser = await db.user.findUnique({
    where: { walletAddress: TEST_USER_WALLET },
  });

  if (existingUser) {
    // Delete in correct order respecting foreign keys
    await db.contractor.deleteMany({
      where: { org: { ownerId: existingUser.id } },
    });
    await db.orgMember.deleteMany({
      where: { userId: existingUser.id },
    });
    await db.organization.deleteMany({
      where: { ownerId: existingUser.id },
    });
    await db.user.delete({
      where: { id: existingUser.id },
    });
  }

  // Create test user with unique wallet
  const testUser = await db.user.create({
    data: {
      walletAddress: TEST_USER_WALLET,
    },
  });
  testUserId = testUser.id;

  // Create test organization 1
  const testOrg = await db.organization.create({
    data: {
      name: 'Contractor Test Org 1',
      treasuryAddress: TEST_TREASURY_WALLET_1,
      ownerId: testUserId,
      members: {
        create: {
          userId: testUserId,
          role: 'OWNER_ADMIN',
        },
      },
    },
  });
  testOrgId = testOrg.id;

  // Create test organization 2
  const testOrg2 = await db.organization.create({
    data: {
      name: 'Contractor Test Org 2',
      treasuryAddress: TEST_TREASURY_WALLET_2,
      ownerId: testUserId,
      members: {
        create: {
          userId: testUserId,
          role: 'OWNER_ADMIN',
        },
      },
    },
  });
  testOrg2Id = testOrg2.id;
});

afterAll(async () => {
  // Clean up test data in correct order (respect foreign keys)
  try {
    await db.contractor.deleteMany({
      where: { orgId: { in: [testOrgId, testOrg2Id] } },
    });
    await db.orgMember.deleteMany({
      where: { orgId: { in: [testOrgId, testOrg2Id] } },
    });
    await db.organization.deleteMany({
      where: { id: { in: [testOrgId, testOrg2Id] } },
    });
    await db.user.deleteMany({
      where: { walletAddress: TEST_USER_WALLET },
    });
  } catch {
    // Ignore cleanup errors - other tests may have already cleaned up
  }
  await db.$disconnect();
});

describe('Property 6: Contractor Wallet Uniqueness', () => {
  /**
   * Property 6a: Duplicate Wallet Rejection Within Organization
   *
   * *For any* contractor creation or update within an organization,
   * if the wallet address already exists for another active contractor
   * in that org, the request SHALL be rejected.
   *
   * **Validates: Requirements 4.9**
   */
  it('should reject duplicate wallet addresses within the same organization', async () => {
    await fc.assert(
      fc.asyncProperty(
        ethereumAddressArb,
        contractorNameArb,
        contractorNameArb,
        rateAmountArb,
        rateAmountArb,
        payCycleArb,
        payCycleArb,
        async (
          walletAddress,
          name1,
          name2,
          rateAmount1,
          rateAmount2,
          payCycle1,
          payCycle2
        ) => {
          // Clean up before this iteration
          await db.contractor.deleteMany({ where: { orgId: testOrgId } });

          // Create first contractor with the wallet address
          await createContractor(testOrgId, testUserId, {
            name: name1,
            walletAddress,
            rateAmount: rateAmount1,
            rateCurrency: 'MNEE',
            payCycle: payCycle1,
          });

          // Attempt to create second contractor with same wallet in same org
          let duplicateRejected = false;
          try {
            await createContractor(testOrgId, testUserId, {
              name: name2,
              walletAddress,
              rateAmount: rateAmount2,
              rateCurrency: 'MNEE',
              payCycle: payCycle2,
            });
          } catch (error) {
            // Should throw ContractorError.duplicateWallet()
            if (
              error instanceof Error &&
              error.message.includes('wallet address already exists')
            ) {
              duplicateRejected = true;
            }
          }

          return duplicateRejected;
        }
      ),
      { numRuns: 25 }
    );
  }, 60000);

  /**
   * Property 6b: Same Wallet Allowed Across Different Organizations
   *
   * *For any* wallet address, it SHALL be allowed to exist as an active
   * contractor in multiple different organizations.
   *
   * **Validates: Requirements 4.9**
   */
  it('should allow same wallet address in different organizations', async () => {
    await fc.assert(
      fc.asyncProperty(
        ethereumAddressArb,
        contractorNameArb,
        contractorNameArb,
        rateAmountArb,
        rateAmountArb,
        payCycleArb,
        payCycleArb,
        async (
          walletAddress,
          name1,
          name2,
          rateAmount1,
          rateAmount2,
          payCycle1,
          payCycle2
        ) => {
          // Clean up before this iteration
          await db.contractor.deleteMany({
            where: { orgId: { in: [testOrgId, testOrg2Id] } },
          });

          // Create contractor in org 1
          const contractor1 = await createContractor(testOrgId, testUserId, {
            name: name1,
            walletAddress,
            rateAmount: rateAmount1,
            rateCurrency: 'MNEE',
            payCycle: payCycle1,
          });

          // Create contractor with same wallet in org 2 (should succeed)
          let secondCreationSucceeded = false;
          try {
            const contractor2 = await createContractor(testOrg2Id, testUserId, {
              name: name2,
              walletAddress,
              rateAmount: rateAmount2,
              rateCurrency: 'MNEE',
              payCycle: payCycle2,
            });
            secondCreationSucceeded = contractor2.id !== contractor1.id;
          } catch {
            secondCreationSucceeded = false;
          }

          return secondCreationSucceeded;
        }
      ),
      { numRuns: 25 }
    );
  }, 60000);

  /**
   * Property 6c: Archived Contractors Don't Block Wallet Reuse
   *
   * *For any* wallet address with an archived (inactive) contractor,
   * creating a new active contractor with the same wallet SHALL succeed.
   *
   * **Validates: Requirements 4.9**
   */
  it('should allow wallet reuse after contractor is archived', async () => {
    await fc.assert(
      fc.asyncProperty(
        ethereumAddressArb,
        contractorNameArb,
        contractorNameArb,
        rateAmountArb,
        rateAmountArb,
        payCycleArb,
        payCycleArb,
        async (
          walletAddress,
          name1,
          name2,
          rateAmount1,
          rateAmount2,
          payCycle1,
          payCycle2
        ) => {
          // Clean up before this iteration
          await db.contractor.deleteMany({ where: { orgId: testOrgId } });

          // Create first contractor
          const contractor1 = await createContractor(testOrgId, testUserId, {
            name: name1,
            walletAddress,
            rateAmount: rateAmount1,
            rateCurrency: 'MNEE',
            payCycle: payCycle1,
          });

          // Archive the contractor (soft delete)
          await db.contractor.update({
            where: { id: contractor1.id },
            data: { active: false },
          });

          // Create new contractor with same wallet (should succeed)
          let reuseSucceeded = false;
          try {
            const contractor2 = await createContractor(testOrgId, testUserId, {
              name: name2,
              walletAddress,
              rateAmount: rateAmount2,
              rateCurrency: 'MNEE',
              payCycle: payCycle2,
            });
            reuseSucceeded = contractor2.id !== contractor1.id;
          } catch {
            reuseSucceeded = false;
          }

          return reuseSucceeded;
        }
      ),
      { numRuns: 25 }
    );
  }, 60000);

  /**
   * Property 6d: Case Insensitive Wallet Comparison
   *
   * *For any* wallet address, variations in case (uppercase/lowercase)
   * SHALL be treated as the same address and rejected as duplicates.
   *
   * **Validates: Requirements 4.9**
   */
  it('should treat wallet addresses as case-insensitive', async () => {
    await fc.assert(
      fc.asyncProperty(
        ethereumAddressArb,
        contractorNameArb,
        contractorNameArb,
        rateAmountArb,
        rateAmountArb,
        payCycleArb,
        payCycleArb,
        async (
          walletAddress,
          name1,
          name2,
          rateAmount1,
          rateAmount2,
          payCycle1,
          payCycle2
        ) => {
          // Clean up before this iteration
          await db.contractor.deleteMany({ where: { orgId: testOrgId } });

          // Create first contractor with lowercase wallet
          await createContractor(testOrgId, testUserId, {
            name: name1,
            walletAddress: walletAddress.toLowerCase(),
            rateAmount: rateAmount1,
            rateCurrency: 'MNEE',
            payCycle: payCycle1,
          });

          // Attempt to create second contractor with uppercase wallet
          let duplicateRejected = false;
          try {
            await createContractor(testOrgId, testUserId, {
              name: name2,
              walletAddress: walletAddress.toUpperCase(),
              rateAmount: rateAmount2,
              rateCurrency: 'MNEE',
              payCycle: payCycle2,
            });
          } catch (error) {
            if (
              error instanceof Error &&
              error.message.includes('wallet address already exists')
            ) {
              duplicateRejected = true;
            }
          }

          return duplicateRejected;
        }
      ),
      { numRuns: 25 }
    );
  }, 60000);
});
