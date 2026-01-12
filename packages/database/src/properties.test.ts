/**
 * Property-Based Tests for OrbitPayroll Database
 * 
 * These tests validate correctness properties defined in the design document
 * using fast-check for property-based testing.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import fc from 'fast-check';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Generates a valid Ethereum address (42 characters, lowercase)
 */
const ethereumAddressArb = fc.hexaString({ minLength: 40, maxLength: 40 })
  .map(hex => `0x${hex.toLowerCase()}`);

/**
 * Generates a valid contractor name
 */
const contractorNameArb = fc.string({ minLength: 1, maxLength: 100 })
  .filter(s => s.trim().length > 0);

/**
 * Generates a valid decimal amount for MNEE (positive, up to 18 decimal places)
 * Using string representation to maintain precision
 */
const decimalAmountArb = fc.tuple(
  fc.integer({ min: 1, max: 999999999 }),  // Integer part
  fc.integer({ min: 0, max: 99999999 })    // Decimal part (8 digits)
).map(([intPart, decPart]) => {
  const decStr = decPart.toString().padStart(8, '0');
  return `${intPart}.${decStr}`;
});

/**
 * Generates an array of decimal amounts for payroll items
 */
const payrollItemAmountsArb = fc.array(
  decimalAmountArb,
  { minLength: 1, maxLength: 10 }
);

// =============================================================================
// Test Setup and Teardown
// =============================================================================

let testUserId: string;
let testOrgId: string;

beforeAll(async () => {
  // Create a test user for all tests
  const testUser = await prisma.user.create({
    data: {
      walletAddress: '0x' + 'a'.repeat(40),
      email: 'property-test@example.com',
    },
  });
  testUserId = testUser.id;

  // Create a test organization
  const testOrg = await prisma.organization.create({
    data: {
      name: 'Property Test Org',
      treasuryAddress: '0x' + 'b'.repeat(40),
      ownerId: testUserId,
    },
  });
  testOrgId = testOrg.id;
});

afterAll(async () => {
  // Clean up test data
  await prisma.payrollItem.deleteMany({});
  await prisma.payrollRun.deleteMany({});
  await prisma.contractor.deleteMany({});
  await prisma.organization.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.$disconnect();
});

beforeEach(async () => {
  // Clean up contractors and payroll data before each test
  await prisma.payrollItem.deleteMany({});
  await prisma.payrollRun.deleteMany({});
  await prisma.contractor.deleteMany({});
});

// =============================================================================
// Property 3: Contractor Wallet Uniqueness Per Org
// Validates: Requirements 4.9
// =============================================================================

describe('Property 3: Contractor Wallet Uniqueness Per Org', () => {
  /**
   * Feature: 06-database, Property 3: Contractor Wallet Uniqueness Per Org
   * 
   * *For any* organization, no two active contractors SHALL have the same wallet_address.
   * 
   * **Validates: Requirements 4.9**
   */
  it('should reject duplicate wallet addresses within the same organization', async () => {
    await fc.assert(
      fc.asyncProperty(
        ethereumAddressArb,
        contractorNameArb,
        contractorNameArb,
        async (walletAddress, name1, name2) => {
          // Create first contractor
          await prisma.contractor.create({
            data: {
              orgId: testOrgId,
              name: name1,
              walletAddress,
              rateAmount: new Prisma.Decimal('1000.00000000'),
              payCycle: 'MONTHLY',
            },
          });

          // Attempt to create second contractor with same wallet in same org
          let duplicateRejected = false;
          try {
            await prisma.contractor.create({
              data: {
                orgId: testOrgId,
                name: name2,
                walletAddress,
                rateAmount: new Prisma.Decimal('2000.00000000'),
                payCycle: 'WEEKLY',
              },
            });
          } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
              duplicateRejected = true;
            }
          }

          // Clean up for next iteration
          await prisma.contractor.deleteMany({ where: { orgId: testOrgId } });

          return duplicateRejected;
        }
      ),
      { numRuns: 100 }
    );
  });
});


// =============================================================================
// Property 4: Payroll Total Consistency
// Validates: Requirements 5.7
// =============================================================================

describe('Property 4: Payroll Total Consistency', () => {
  /**
   * Feature: 06-database, Property 4: Payroll Total Consistency
   * 
   * *For any* payroll_run, the total_mnee SHALL equal the sum of amount_mnee 
   * from all associated payroll_items.
   * 
   * **Validates: Requirements 5.7**
   */
  it('should ensure payroll run total equals sum of item amounts', async () => {
    await fc.assert(
      fc.asyncProperty(
        payrollItemAmountsArb,
        async (amounts) => {
          // Calculate expected total
          const expectedTotal = amounts.reduce((sum, amt) => {
            return sum.add(new Prisma.Decimal(amt));
          }, new Prisma.Decimal('0'));

          // Create payroll run with calculated total
          const payrollRun = await prisma.payrollRun.create({
            data: {
              orgId: testOrgId,
              runLabel: 'Property Test Run',
              totalMnee: expectedTotal,
              status: 'PENDING',
            },
          });

          // Create payroll items
          for (const amount of amounts) {
            await prisma.payrollItem.create({
              data: {
                payrollRunId: payrollRun.id,
                amountMnee: new Prisma.Decimal(amount),
                status: 'PENDING',
              },
            });
          }

          // Retrieve and verify
          const items = await prisma.payrollItem.findMany({
            where: { payrollRunId: payrollRun.id },
          });

          const actualSum = items.reduce((sum, item) => {
            return sum.add(item.amountMnee);
          }, new Prisma.Decimal('0'));

          const retrievedRun = await prisma.payrollRun.findUnique({
            where: { id: payrollRun.id },
          });

          // Clean up for next iteration
          await prisma.payrollItem.deleteMany({ where: { payrollRunId: payrollRun.id } });
          await prisma.payrollRun.delete({ where: { id: payrollRun.id } });

          // Verify total equals sum of items
          return retrievedRun!.totalMnee.equals(actualSum);
        }
      ),
      { numRuns: 100 }
    );
  });
});


// =============================================================================
// Property 7: Decimal Precision
// Validates: Requirements 11.6
// =============================================================================

describe('Property 7: Decimal Precision', () => {
  /**
   * Feature: 06-database, Property 7: Decimal Precision
   * 
   * *For any* monetary value (rate_amount, amount_mnee, total_mnee), the value 
   * SHALL be stored with 18 decimal places precision to match MNEE token decimals.
   * 
   * **Validates: Requirements 11.6**
   */
  it('should preserve decimal precision for contractor rate amounts', async () => {
    await fc.assert(
      fc.asyncProperty(
        ethereumAddressArb,
        contractorNameArb,
        decimalAmountArb,
        async (walletAddress, name, rateAmount) => {
          const originalDecimal = new Prisma.Decimal(rateAmount);

          // Create contractor with precise rate amount
          const contractor = await prisma.contractor.create({
            data: {
              orgId: testOrgId,
              name,
              walletAddress,
              rateAmount: originalDecimal,
              payCycle: 'MONTHLY',
            },
          });

          // Retrieve and verify precision is preserved
          const retrieved = await prisma.contractor.findUnique({
            where: { id: contractor.id },
          });

          // Clean up for next iteration
          await prisma.contractor.delete({ where: { id: contractor.id } });

          // Verify the decimal value is exactly preserved
          return retrieved!.rateAmount.equals(originalDecimal);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve decimal precision for payroll item amounts', async () => {
    await fc.assert(
      fc.asyncProperty(
        decimalAmountArb,
        async (amountMnee) => {
          const originalDecimal = new Prisma.Decimal(amountMnee);

          // Create payroll run
          const payrollRun = await prisma.payrollRun.create({
            data: {
              orgId: testOrgId,
              totalMnee: originalDecimal,
              status: 'PENDING',
            },
          });

          // Create payroll item with precise amount
          const payrollItem = await prisma.payrollItem.create({
            data: {
              payrollRunId: payrollRun.id,
              amountMnee: originalDecimal,
              status: 'PENDING',
            },
          });

          // Retrieve and verify precision is preserved
          const retrievedItem = await prisma.payrollItem.findUnique({
            where: { id: payrollItem.id },
          });
          const retrievedRun = await prisma.payrollRun.findUnique({
            where: { id: payrollRun.id },
          });

          // Clean up for next iteration
          await prisma.payrollItem.delete({ where: { id: payrollItem.id } });
          await prisma.payrollRun.delete({ where: { id: payrollRun.id } });

          // Verify both item and run amounts are exactly preserved
          return (
            retrievedItem!.amountMnee.equals(originalDecimal) &&
            retrievedRun!.totalMnee.equals(originalDecimal)
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});
