/**
 * Payroll Service Property Tests
 *
 * Property-based tests for payroll preview calculation.
 * **Feature: 03-backend, Property 8: Payroll Preview Calculation**
 * **Validates: Requirements 5.1, 5.2, 5.3**
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import fc from 'fast-check';
import { db } from '../lib/db.js';
import { previewPayroll } from './payroll.service.js';
import { Decimal } from '@prisma/client/runtime/library';
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
  .stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789 '.split('')), {
    minLength: 1,
    maxLength: 50,
  })
  .filter((s) => s.trim().length > 0);

/**
 * Generate valid rate amounts as strings
 * Database has precision 18, scale 8, so max integer part is 10^10 - 1
 * Using values up to 9,999,999,999 (10 digits) to stay within bounds
 */
const rateAmountArb = fc.integer({ min: 1, max: 9999999999 }).map((n) => n.toString());

/**
 * Generate valid pay cycles
 */
const payCycleArb = fc.constantFrom<PayCycle>('WEEKLY', 'BI_WEEKLY', 'MONTHLY');

/**
 * Generate a contractor data object
 */
const contractorDataArb = fc.record({
  name: contractorNameArb,
  walletAddress: ethereumAddressArb,
  rateAmount: rateAmountArb,
  payCycle: payCycleArb,
});

// Test fixtures
let testUserId: string;
let testOrgId: string;

// Use unique wallet prefix to avoid conflicts with other tests
const TEST_WALLET_PREFIX = 'payroll_test_';
const TEST_USER_WALLET = '0x' + TEST_WALLET_PREFIX + 'a'.repeat(40 - TEST_WALLET_PREFIX.length);
const TEST_TREASURY_WALLET = '0x' + TEST_WALLET_PREFIX + 'b'.repeat(40 - TEST_WALLET_PREFIX.length);

beforeAll(async () => {
  // Clean up only test-specific data (not all data)
  // First find and delete any existing test user's data
  const existingUser = await db.user.findUnique({
    where: { walletAddress: TEST_USER_WALLET },
  });

  if (existingUser) {
    // Delete in correct order respecting foreign keys
    await db.payrollItem.deleteMany({
      where: { payrollRun: { org: { ownerId: existingUser.id } } },
    });
    await db.payrollRun.deleteMany({
      where: { org: { ownerId: existingUser.id } },
    });
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

  // Create test organization
  const testOrg = await db.organization.create({
    data: {
      name: 'Payroll Test Org',
      treasuryAddress: TEST_TREASURY_WALLET,
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
});

afterAll(async () => {
  // Clean up test data in correct order (respect foreign keys)
  try {
    await db.payrollItem.deleteMany({
      where: { payrollRun: { orgId: testOrgId } },
    });
    await db.payrollRun.deleteMany({
      where: { orgId: testOrgId },
    });
    await db.contractor.deleteMany({
      where: { orgId: testOrgId },
    });
    await db.orgMember.deleteMany({
      where: { orgId: testOrgId },
    });
    await db.organization.deleteMany({
      where: { id: testOrgId },
    });
    await db.user.deleteMany({
      where: { walletAddress: TEST_USER_WALLET },
    });
  } catch {
    // Ignore cleanup errors
  }
  await db.$disconnect();
});

describe('Property 8: Payroll Preview Calculation', () => {
  /**
   * Property 8a: Total Equals Sum of Individual Amounts
   *
   * *For any* payroll preview request, the totalMnee SHALL equal
   * the sum of all individual contractor amounts.
   *
   * **Validates: Requirements 5.1, 5.2, 5.3**
   */
  it('should calculate totalMnee as sum of all contractor amounts', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(contractorDataArb, { minLength: 0, maxLength: 20 }),
        async (contractorsData) => {
          // Clean up contractors before this iteration
          await db.contractor.deleteMany({ where: { orgId: testOrgId } });

          // Create contractors with unique wallet addresses
          const usedWallets = new Set<string>();
          for (const data of contractorsData) {
            // Skip if wallet already used in this iteration
            if (usedWallets.has(data.walletAddress)) continue;
            usedWallets.add(data.walletAddress);

            await db.contractor.create({
              data: {
                orgId: testOrgId,
                name: data.name,
                walletAddress: data.walletAddress,
                rateAmount: new Decimal(data.rateAmount),
                rateCurrency: 'MNEE',
                payCycle: data.payCycle,
                active: true,
              },
            });
          }

          // Get preview
          const preview = await previewPayroll(testOrgId, testUserId);

          // Calculate expected sum from preview contractors
          const expectedSum = preview.contractors.reduce(
            (sum, c) => sum.plus(new Decimal(c.amount)),
            new Decimal(0)
          );

          // totalMnee should equal the sum
          return new Decimal(preview.totalMnee).equals(expectedSum);
        }
      ),
      { numRuns: 100 }
    );
  }, 120000);

  /**
   * Property 8b: Empty Preview Returns Zero Total
   *
   * *For any* organization with no active contractors,
   * the preview SHALL return zero total and empty contractors array.
   *
   * **Validates: Requirements 5.5**
   */
  it('should return zero total when no active contractors exist', async () => {
    // Clean up all contractors
    await db.contractor.deleteMany({ where: { orgId: testOrgId } });

    const preview = await previewPayroll(testOrgId, testUserId);

    expect(preview.contractors).toHaveLength(0);
    expect(preview.totalMnee).toBe('0');
  });

  /**
   * Property 8c: Archived Contractors Excluded
   *
   * *For any* set of contractors where some are archived,
   * the preview SHALL only include active contractors.
   *
   * **Validates: Requirements 5.4**
   */
  it('should exclude archived contractors from preview', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(contractorDataArb, { minLength: 1, maxLength: 10 }),
        fc.array(contractorDataArb, { minLength: 1, maxLength: 10 }),
        async (activeContractors, archivedContractors) => {
          // Clean up contractors before this iteration
          await db.contractor.deleteMany({ where: { orgId: testOrgId } });

          const usedWallets = new Set<string>();

          // Create active contractors
          for (const data of activeContractors) {
            if (usedWallets.has(data.walletAddress)) continue;
            usedWallets.add(data.walletAddress);

            await db.contractor.create({
              data: {
                orgId: testOrgId,
                name: data.name,
                walletAddress: data.walletAddress,
                rateAmount: new Decimal(data.rateAmount),
                rateCurrency: 'MNEE',
                payCycle: data.payCycle,
                active: true,
              },
            });
          }

          const activeCount = usedWallets.size;

          // Create archived contractors
          for (const data of archivedContractors) {
            if (usedWallets.has(data.walletAddress)) continue;
            usedWallets.add(data.walletAddress);

            await db.contractor.create({
              data: {
                orgId: testOrgId,
                name: data.name,
                walletAddress: data.walletAddress,
                rateAmount: new Decimal(data.rateAmount),
                rateCurrency: 'MNEE',
                payCycle: data.payCycle,
                active: false,
              },
            });
          }

          // Get preview
          const preview = await previewPayroll(testOrgId, testUserId);

          // Preview should only contain active contractors
          return preview.contractors.length === activeCount;
        }
      ),
      { numRuns: 50 }
    );
  }, 120000);

  /**
   * Property 8d: isSufficient Correctness
   *
   * *For any* payroll preview, isSufficient SHALL correctly reflect
   * whether treasuryBalance >= totalMnee.
   *
   * Note: Since treasury balance is currently hardcoded to 0,
   * isSufficient should be true only when totalMnee is 0.
   *
   * **Validates: Requirements 5.3**
   */
  it('should correctly calculate isSufficient based on treasury balance', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(contractorDataArb, { minLength: 0, maxLength: 10 }),
        async (contractorsData) => {
          // Clean up contractors before this iteration
          await db.contractor.deleteMany({ where: { orgId: testOrgId } });

          const usedWallets = new Set<string>();
          for (const data of contractorsData) {
            if (usedWallets.has(data.walletAddress)) continue;
            usedWallets.add(data.walletAddress);

            await db.contractor.create({
              data: {
                orgId: testOrgId,
                name: data.name,
                walletAddress: data.walletAddress,
                rateAmount: new Decimal(data.rateAmount),
                rateCurrency: 'MNEE',
                payCycle: data.payCycle,
                active: true,
              },
            });
          }

          const preview = await previewPayroll(testOrgId, testUserId);

          const totalMnee = new Decimal(preview.totalMnee);
          const treasuryBalance = new Decimal(preview.treasuryBalance);

          // isSufficient should be true when treasuryBalance >= totalMnee
          const expectedSufficient = treasuryBalance.greaterThanOrEqualTo(totalMnee);

          return preview.isSufficient === expectedSufficient;
        }
      ),
      { numRuns: 50 }
    );
  }, 120000);

  /**
   * Property 8e: Deficit Calculation Correctness
   *
   * *For any* payroll preview, deficit SHALL equal max(0, totalMnee - treasuryBalance).
   *
   * **Validates: Requirements 5.3**
   */
  it('should correctly calculate deficit', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(contractorDataArb, { minLength: 0, maxLength: 10 }),
        async (contractorsData) => {
          // Clean up contractors before this iteration
          await db.contractor.deleteMany({ where: { orgId: testOrgId } });

          const usedWallets = new Set<string>();
          for (const data of contractorsData) {
            if (usedWallets.has(data.walletAddress)) continue;
            usedWallets.add(data.walletAddress);

            await db.contractor.create({
              data: {
                orgId: testOrgId,
                name: data.name,
                walletAddress: data.walletAddress,
                rateAmount: new Decimal(data.rateAmount),
                rateCurrency: 'MNEE',
                payCycle: data.payCycle,
                active: true,
              },
            });
          }

          const preview = await previewPayroll(testOrgId, testUserId);

          const totalMnee = new Decimal(preview.totalMnee);
          const treasuryBalance = new Decimal(preview.treasuryBalance);
          const deficit = new Decimal(preview.deficit);

          // Expected deficit is max(0, totalMnee - treasuryBalance)
          const expectedDeficit = totalMnee.greaterThan(treasuryBalance)
            ? totalMnee.minus(treasuryBalance)
            : new Decimal(0);

          return deficit.equals(expectedDeficit);
        }
      ),
      { numRuns: 50 }
    );
  }, 120000);

  /**
   * Property 8f: Preview Contains Contractor Details
   *
   * *For any* active contractor, the preview SHALL include
   * their id, name, walletAddress, and amount.
   *
   * **Validates: Requirements 5.6**
   */
  it('should include contractor details in preview', async () => {
    await fc.assert(
      fc.asyncProperty(contractorDataArb, async (data) => {
        // Clean up contractors before this iteration
        await db.contractor.deleteMany({ where: { orgId: testOrgId } });

        // Create a single contractor
        const contractor = await db.contractor.create({
          data: {
            orgId: testOrgId,
            name: data.name,
            walletAddress: data.walletAddress,
            rateAmount: new Decimal(data.rateAmount),
            rateCurrency: 'MNEE',
            payCycle: data.payCycle,
            active: true,
          },
        });

        const preview = await previewPayroll(testOrgId, testUserId);

        // Should have exactly one contractor
        if (preview.contractors.length !== 1) return false;

        const previewContractor = preview.contractors[0]!;

        // Verify all required fields are present and correct
        return (
          previewContractor.id === contractor.id &&
          previewContractor.name === contractor.name &&
          previewContractor.walletAddress === contractor.walletAddress &&
          previewContractor.amount === contractor.rateAmount.toString()
        );
      }),
      { numRuns: 50 }
    );
  }, 120000);
});
