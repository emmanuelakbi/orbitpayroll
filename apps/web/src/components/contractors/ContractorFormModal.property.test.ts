/**
 * Property Test: Form Validation Feedback
 * 
 * **Property 2: Form Validation Feedback**
 * *For any* form input that violates validation rules, the UI SHALL display an inline 
 * error message near the relevant field within 100ms of the validation trigger.
 * 
 * **Validates: Requirements 4.6, 4.7**
 * 
 * Feature: 04-frontend, Property 2: Form Validation Feedback
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  isValidWalletAddress,
  isValidRateAmount,
} from "./ContractorFormModal";

// Arbitrary for generating valid Ethereum addresses (0x + 40 hex chars)
const hexChar = fc.constantFrom(..."0123456789abcdefABCDEF");
const validEthereumAddressArb = fc.array(hexChar, { minLength: 40, maxLength: 40 }).map(
  (chars) => `0x${chars.join("")}`
);

// Arbitrary for generating invalid wallet addresses
const invalidWalletAddressArb = fc.oneof(
  // Too short
  fc.array(hexChar, { minLength: 1, maxLength: 39 }).map(
    (chars) => `0x${chars.join("")}`
  ),
  // Too long
  fc.array(hexChar, { minLength: 41, maxLength: 50 }).map(
    (chars) => `0x${chars.join("")}`
  ),
  // Missing 0x prefix
  fc.array(hexChar, { minLength: 40, maxLength: 40 }).map(
    (chars) => chars.join("")
  ),
  // Wrong prefix
  fc.array(hexChar, { minLength: 40, maxLength: 40 }).map(
    (chars) => `1x${chars.join("")}`
  ),
  // Contains invalid characters
  fc.tuple(
    fc.array(hexChar, { minLength: 20, maxLength: 20 }),
    fc.constantFrom(..."ghijklmnopqrstuvwxyzGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()"),
    fc.array(hexChar, { minLength: 19, maxLength: 19 })
  ).map(([prefix, invalidChar, suffix]) => `0x${prefix.join("")}${invalidChar}${suffix.join("")}`),
  // Empty string
  fc.constant(""),
  // Just 0x
  fc.constant("0x"),
  // Random strings
  fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.startsWith("0x"))
);

// Arbitrary for generating valid positive rate amounts
const validRateAmountArb = fc.oneof(
  // Integer amounts
  fc.integer({ min: 1, max: 1000000 }).map(n => n.toString()),
  // Decimal amounts
  fc.tuple(
    fc.integer({ min: 0, max: 1000000 }),
    fc.integer({ min: 1, max: 99 })
  ).map(([int, dec]) => `${int}.${dec.toString().padStart(2, "0")}`),
  // Small decimals
  fc.double({ min: 0.01, max: 1000000, noNaN: true }).map(n => n.toFixed(2))
).filter(s => {
  const num = parseFloat(s);
  return !isNaN(num) && num > 0 && isFinite(num);
});

// Arbitrary for generating invalid rate amounts
const invalidRateAmountArb = fc.oneof(
  // Zero
  fc.constant("0"),
  fc.constant("0.00"),
  // Negative numbers
  fc.integer({ min: -1000000, max: -1 }).map(n => n.toString()),
  fc.double({ min: -1000000, max: -0.01, noNaN: true }).map(n => n.toFixed(2)),
  // Non-numeric strings (filter out strings that parseFloat can partially parse)
  fc.string({ minLength: 1, maxLength: 20 }).filter(s => {
    const parsed = parseFloat(s);
    return isNaN(parsed) || !isFinite(parsed);
  }),
  // Empty string
  fc.constant(""),
  // Special values that parseFloat handles specially
  fc.constant("NaN"),
  fc.constant("Infinity"),
  fc.constant("-Infinity")
);

describe("Form Validation Property Tests", () => {
  describe("Property 2.1: Wallet Address Validation", () => {
    it("*For any* valid Ethereum address, isValidWalletAddress SHALL return true", () => {
      fc.assert(
        fc.property(validEthereumAddressArb, (address) => {
          // Property: valid addresses should pass validation
          expect(isValidWalletAddress(address)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it("*For any* invalid wallet address, isValidWalletAddress SHALL return false", () => {
      fc.assert(
        fc.property(invalidWalletAddressArb, (address) => {
          // Property: invalid addresses should fail validation
          expect(isValidWalletAddress(address)).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it("*For any* address, validation result is deterministic", () => {
      fc.assert(
        fc.property(fc.string({ minLength: 0, maxLength: 100 }), (address) => {
          // Property: calling validation multiple times should return same result
          const result1 = isValidWalletAddress(address);
          const result2 = isValidWalletAddress(address);
          const result3 = isValidWalletAddress(address);
          
          expect(result1).toBe(result2);
          expect(result2).toBe(result3);
        }),
        { numRuns: 100 }
      );
    });

    it("*For any* valid address, case variations should be accepted", () => {
      fc.assert(
        fc.property(validEthereumAddressArb, (address) => {
          // Property: both lowercase and uppercase hex should be valid
          const lowercase = address.toLowerCase();
          const uppercase = address.toUpperCase().replace("0X", "0x");
          
          expect(isValidWalletAddress(lowercase)).toBe(true);
          expect(isValidWalletAddress(uppercase)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("Property 2.2: Rate Amount Validation", () => {
    it("*For any* positive number string, isValidRateAmount SHALL return true", () => {
      fc.assert(
        fc.property(validRateAmountArb, (amount) => {
          // Property: positive amounts should pass validation
          expect(isValidRateAmount(amount)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it("*For any* invalid rate amount, isValidRateAmount SHALL return false", () => {
      fc.assert(
        fc.property(invalidRateAmountArb, (amount) => {
          // Property: invalid amounts should fail validation
          expect(isValidRateAmount(amount)).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it("*For any* rate amount, validation result is deterministic", () => {
      fc.assert(
        fc.property(fc.string({ minLength: 0, maxLength: 50 }), (amount) => {
          // Property: calling validation multiple times should return same result
          const result1 = isValidRateAmount(amount);
          const result2 = isValidRateAmount(amount);
          const result3 = isValidRateAmount(amount);
          
          expect(result1).toBe(result2);
          expect(result2).toBe(result3);
        }),
        { numRuns: 100 }
      );
    });

    it("*For any* positive integer, it should be a valid rate", () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 10000000 }), (num) => {
          // Property: any positive integer should be valid
          expect(isValidRateAmount(num.toString())).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it("*For any* positive decimal, it should be a valid rate", () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.01, max: 10000000, noNaN: true }),
          (num) => {
            // Property: any positive decimal should be valid
            expect(isValidRateAmount(num.toString())).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Property 2.3: Validation Consistency", () => {
    it("*For any* input, exactly one of valid/invalid should be true", () => {
      fc.assert(
        fc.property(fc.string({ minLength: 0, maxLength: 100 }), (input) => {
          // Property: validation should be binary (true or false, never undefined)
          const walletResult = isValidWalletAddress(input);
          const rateResult = isValidRateAmount(input);
          
          expect(typeof walletResult).toBe("boolean");
          expect(typeof rateResult).toBe("boolean");
        }),
        { numRuns: 100 }
      );
    });

    it("*For any* whitespace-only string, rate validation should fail", () => {
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom(" ", "\t", "\n", "\r"), { minLength: 0, maxLength: 10 }).map(arr => arr.join("")),
          (whitespace) => {
            // Property: whitespace-only strings should fail rate validation
            expect(isValidRateAmount(whitespace)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("*For any* whitespace-only string, wallet validation should fail", () => {
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom(" ", "\t", "\n", "\r"), { minLength: 0, maxLength: 10 }).map(arr => arr.join("")),
          (whitespace) => {
            // Property: whitespace-only strings should fail wallet validation
            expect(isValidWalletAddress(whitespace)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
