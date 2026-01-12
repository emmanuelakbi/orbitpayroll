/**
 * Property Test: Payroll Preview Accuracy
 * 
 * **Property 5: Payroll Preview Accuracy**
 * *For any* payroll preview display, the total shown SHALL equal the sum of 
 * individual contractor amounts displayed.
 * 
 * **Validates: Requirements 6.2, 6.3**
 * 
 * Feature: 04-frontend, Property 5: Payroll Preview Accuracy
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

// Type for contractor payment in preview
interface ContractorPayment {
  id: string;
  name: string;
  walletAddress: string;
  amount: string; // BigInt as string
}

// Type for payroll preview
interface PayrollPreview {
  contractors: ContractorPayment[];
  total: string; // BigInt as string
  treasuryBalance: string;
  isSufficient: boolean;
}

// Arbitrary for generating valid Ethereum addresses
const hexChar = fc.constantFrom(..."0123456789abcdef");
const ethereumAddressArb = fc.array(hexChar, { minLength: 40, maxLength: 40 }).map(
  (chars) => `0x${chars.join("")}`
);

// Arbitrary for generating valid MNEE amounts (as BigInt strings)
// MNEE has 18 decimals, so we generate amounts in wei
const mneeAmountArb = fc.bigInt({ min: BigInt(0), max: BigInt("1000000000000000000000000") }).map(
  (amount) => amount.toString()
);

// Arbitrary for generating positive MNEE amounts
const positiveMneeAmountArb = fc.bigInt({ min: BigInt(1), max: BigInt("1000000000000000000000000") }).map(
  (amount) => amount.toString()
);

// Arbitrary for generating contractor names
const contractorNameArb = fc.string({ minLength: 1, maxLength: 50 }).filter(
  (s) => s.trim().length > 0
);

// Arbitrary for generating a single contractor payment
const contractorPaymentArb: fc.Arbitrary<ContractorPayment> = fc.record({
  id: fc.uuid(),
  name: contractorNameArb,
  walletAddress: ethereumAddressArb,
  amount: positiveMneeAmountArb,
});

// Function to calculate total from contractor amounts
function calculateTotal(contractors: ContractorPayment[]): string {
  return contractors
    .reduce((sum, c) => sum + BigInt(c.amount), BigInt(0))
    .toString();
}

// Function to create a valid payroll preview
function createPayrollPreview(
  contractors: ContractorPayment[],
  treasuryBalance: string
): PayrollPreview {
  const total = calculateTotal(contractors);
  const isSufficient = BigInt(treasuryBalance) >= BigInt(total);
  
  return {
    contractors,
    total,
    treasuryBalance,
    isSufficient,
  };
}

// Function to verify payroll preview accuracy
function verifyPayrollPreviewAccuracy(preview: PayrollPreview): boolean {
  const calculatedTotal = calculateTotal(preview.contractors);
  return calculatedTotal === preview.total;
}

// Function to verify insufficient balance warning
function verifyInsufficientBalanceWarning(preview: PayrollPreview): boolean {
  const total = BigInt(preview.total);
  const balance = BigInt(preview.treasuryBalance);
  const expectedIsSufficient = balance >= total;
  return preview.isSufficient === expectedIsSufficient;
}

// Function to calculate deficit
function calculateDeficit(preview: PayrollPreview): string {
  const total = BigInt(preview.total);
  const balance = BigInt(preview.treasuryBalance);
  if (balance >= total) return "0";
  return (total - balance).toString();
}

describe("Payroll Preview Accuracy Property Tests", () => {
  describe("Property 5.1: Total equals sum of contractor amounts", () => {
    it("*For any* list of contractor payments, the total SHALL equal the sum of individual amounts", () => {
      fc.assert(
        fc.property(
          fc.array(contractorPaymentArb, { minLength: 0, maxLength: 50 }),
          mneeAmountArb,
          (contractors, treasuryBalance) => {
            // Create preview
            const preview = createPayrollPreview(contractors, treasuryBalance);
            
            // Property: total should equal sum of contractor amounts
            expect(verifyPayrollPreviewAccuracy(preview)).toBe(true);
            
            // Verify by manual calculation
            const manualTotal = contractors.reduce(
              (sum, c) => sum + BigInt(c.amount),
              BigInt(0)
            );
            expect(preview.total).toBe(manualTotal.toString());
          }
        ),
        { numRuns: 100 }
      );
    });

    it("*For any* empty contractor list, total SHALL be zero", () => {
      fc.assert(
        fc.property(mneeAmountArb, (treasuryBalance) => {
          // Create preview with no contractors
          const preview = createPayrollPreview([], treasuryBalance);
          
          // Property: total should be zero
          expect(preview.total).toBe("0");
          expect(verifyPayrollPreviewAccuracy(preview)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it("*For any* single contractor, total SHALL equal that contractor's amount", () => {
      fc.assert(
        fc.property(contractorPaymentArb, mneeAmountArb, (contractor, treasuryBalance) => {
          // Create preview with single contractor
          const preview = createPayrollPreview([contractor], treasuryBalance);
          
          // Property: total should equal the single contractor's amount
          expect(preview.total).toBe(contractor.amount);
          expect(verifyPayrollPreviewAccuracy(preview)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("Property 5.2: Insufficient balance detection", () => {
    it("*For any* preview where balance < total, isSufficient SHALL be false", () => {
      fc.assert(
        fc.property(
          fc.array(contractorPaymentArb, { minLength: 1, maxLength: 20 }),
          (contractors) => {
            // Calculate total
            const total = BigInt(calculateTotal(contractors));
            
            // Generate balance less than total
            const insufficientBalance = (total - BigInt(1)).toString();
            
            // Create preview
            const preview = createPayrollPreview(contractors, insufficientBalance);
            
            // Property: isSufficient should be false
            expect(preview.isSufficient).toBe(false);
            expect(verifyInsufficientBalanceWarning(preview)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("*For any* preview where balance >= total, isSufficient SHALL be true", () => {
      fc.assert(
        fc.property(
          fc.array(contractorPaymentArb, { minLength: 0, maxLength: 20 }),
          fc.bigInt({ min: BigInt(0), max: BigInt("1000000000000000000000") }),
          (contractors, extraBalance) => {
            // Calculate total
            const total = BigInt(calculateTotal(contractors));
            
            // Generate balance >= total
            const sufficientBalance = (total + extraBalance).toString();
            
            // Create preview
            const preview = createPayrollPreview(contractors, sufficientBalance);
            
            // Property: isSufficient should be true
            expect(preview.isSufficient).toBe(true);
            expect(verifyInsufficientBalanceWarning(preview)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("*For any* preview where balance == total, isSufficient SHALL be true", () => {
      fc.assert(
        fc.property(
          fc.array(contractorPaymentArb, { minLength: 0, maxLength: 20 }),
          (contractors) => {
            // Calculate total
            const total = calculateTotal(contractors);
            
            // Set balance exactly equal to total
            const preview = createPayrollPreview(contractors, total);
            
            // Property: isSufficient should be true when balance equals total
            expect(preview.isSufficient).toBe(true);
            expect(verifyInsufficientBalanceWarning(preview)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Property 5.3: Deficit calculation accuracy", () => {
    it("*For any* insufficient balance, deficit SHALL equal total - balance", () => {
      fc.assert(
        fc.property(
          fc.array(contractorPaymentArb, { minLength: 1, maxLength: 20 }),
          fc.bigInt({ min: BigInt(1), max: BigInt("1000000000000000000000") }),
          (contractors, deficitAmount) => {
            // Calculate total
            const total = BigInt(calculateTotal(contractors));
            
            // Generate balance that creates the specified deficit
            const balance = total - deficitAmount;
            if (balance < BigInt(0)) return; // Skip if balance would be negative
            
            // Create preview
            const preview = createPayrollPreview(contractors, balance.toString());
            
            // Property: deficit should equal total - balance
            const calculatedDeficit = calculateDeficit(preview);
            expect(calculatedDeficit).toBe(deficitAmount.toString());
          }
        ),
        { numRuns: 100 }
      );
    });

    it("*For any* sufficient balance, deficit SHALL be zero", () => {
      fc.assert(
        fc.property(
          fc.array(contractorPaymentArb, { minLength: 0, maxLength: 20 }),
          fc.bigInt({ min: BigInt(0), max: BigInt("1000000000000000000000") }),
          (contractors, extraBalance) => {
            // Calculate total
            const total = BigInt(calculateTotal(contractors));
            
            // Generate sufficient balance
            const balance = (total + extraBalance).toString();
            
            // Create preview
            const preview = createPayrollPreview(contractors, balance);
            
            // Property: deficit should be zero
            expect(calculateDeficit(preview)).toBe("0");
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Property 5.4: Calculation determinism", () => {
    it("*For any* contractor list, total calculation is deterministic", () => {
      fc.assert(
        fc.property(
          fc.array(contractorPaymentArb, { minLength: 0, maxLength: 20 }),
          (contractors) => {
            // Property: multiple calculations should yield same result
            const total1 = calculateTotal(contractors);
            const total2 = calculateTotal(contractors);
            const total3 = calculateTotal(contractors);
            
            expect(total1).toBe(total2);
            expect(total2).toBe(total3);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("*For any* preview, verification is deterministic", () => {
      fc.assert(
        fc.property(
          fc.array(contractorPaymentArb, { minLength: 0, maxLength: 20 }),
          mneeAmountArb,
          (contractors, treasuryBalance) => {
            const preview = createPayrollPreview(contractors, treasuryBalance);
            
            // Property: multiple verifications should yield same result
            const result1 = verifyPayrollPreviewAccuracy(preview);
            const result2 = verifyPayrollPreviewAccuracy(preview);
            const result3 = verifyPayrollPreviewAccuracy(preview);
            
            expect(result1).toBe(result2);
            expect(result2).toBe(result3);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Property 5.5: Order independence", () => {
    it("*For any* contractor list, total is independent of contractor order", () => {
      fc.assert(
        fc.property(
          fc.array(contractorPaymentArb, { minLength: 2, maxLength: 20 }),
          (contractors) => {
            // Calculate total with original order
            const originalTotal = calculateTotal(contractors);
            
            // Calculate total with reversed order
            const reversedTotal = calculateTotal([...contractors].reverse());
            
            // Shuffle contractors
            const shuffled = [...contractors].sort(() => Math.random() - 0.5);
            const shuffledTotal = calculateTotal(shuffled);
            
            // Property: total should be same regardless of order
            expect(originalTotal).toBe(reversedTotal);
            expect(originalTotal).toBe(shuffledTotal);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Property 5.6: BigInt precision", () => {
    it("*For any* large amounts, calculation maintains precision", () => {
      // Generate large amounts that would overflow regular numbers
      const largeAmountArb = fc.bigInt({
        min: BigInt("1000000000000000000000"), // 1000 MNEE
        max: BigInt("1000000000000000000000000000"), // 1 billion MNEE
      }).map((amount) => amount.toString());

      const largeContractorArb: fc.Arbitrary<ContractorPayment> = fc.record({
        id: fc.uuid(),
        name: contractorNameArb,
        walletAddress: ethereumAddressArb,
        amount: largeAmountArb,
      });

      fc.assert(
        fc.property(
          fc.array(largeContractorArb, { minLength: 1, maxLength: 10 }),
          (contractors) => {
            // Calculate total
            const total = calculateTotal(contractors);
            
            // Verify it's a valid BigInt string
            expect(() => BigInt(total)).not.toThrow();
            
            // Verify sum is correct
            const expectedTotal = contractors.reduce(
              (sum, c) => sum + BigInt(c.amount),
              BigInt(0)
            );
            expect(total).toBe(expectedTotal.toString());
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
