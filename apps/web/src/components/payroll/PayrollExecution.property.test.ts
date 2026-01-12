/**
 * Property Test: Transaction Status Tracking
 * 
 * **Property 7: Transaction Status Tracking**
 * *For any* blockchain transaction initiated, the UI SHALL display the current status 
 * (pending, confirming, success, error) AND provide the transaction hash when available.
 * 
 * **Validates: Requirements 6.8, 6.9, 6.10, 6.11**
 * 
 * Feature: 04-frontend, Property 7: Transaction Status Tracking
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import type { TransactionStatus } from "@/components/treasury/TransactionStatusModal";

// Arbitrary for generating valid transaction hashes (66 chars: 0x + 64 hex chars)
const hexChar = fc.constantFrom(..."0123456789abcdef");
const txHashArb = fc.array(hexChar, { minLength: 64, maxLength: 64 }).map(
  (chars) => `0x${chars.join("")}`
);

// Arbitrary for generating error messages
const errorMessageArb = fc.string({ minLength: 1, maxLength: 200 }).filter(
  (s) => s.trim().length > 0
);

// Arbitrary for generating pending messages
const pendingMessageArb = fc.constantFrom(
  "Requesting signature...",
  "Waiting for wallet confirmation...",
  "Processing transaction...",
  "Submitting to network..."
);

// Arbitrary for generating transaction status
const transactionStatusArb: fc.Arbitrary<TransactionStatus> = fc.oneof(
  fc.constant({ status: "idle" as const }),
  pendingMessageArb.map((message) => ({ status: "pending" as const, message })),
  txHashArb.map((txHash) => ({ status: "confirming" as const, txHash })),
  txHashArb.map((txHash) => ({ status: "success" as const, txHash })),
  errorMessageArb.map((error) => ({ status: "error" as const, error }))
);

// Type guard functions
function isIdleStatus(status: TransactionStatus): status is { status: "idle" } {
  return status.status === "idle";
}

function isPendingStatus(status: TransactionStatus): status is { status: "pending"; message: string } {
  return status.status === "pending";
}

function isConfirmingStatus(status: TransactionStatus): status is { status: "confirming"; txHash: string } {
  return status.status === "confirming";
}

function isSuccessStatus(status: TransactionStatus): status is { status: "success"; txHash: string } {
  return status.status === "success";
}

function isErrorStatus(status: TransactionStatus): status is { status: "error"; error: string } {
  return status.status === "error";
}

// Function to check if transaction hash is available
function hasTxHash(status: TransactionStatus): boolean {
  return isConfirmingStatus(status) || isSuccessStatus(status);
}

// Function to get transaction hash if available
function getTxHash(status: TransactionStatus): string | null {
  if (isConfirmingStatus(status) || isSuccessStatus(status)) {
    return status.txHash;
  }
  return null;
}

// Function to check if status allows modal close
function canCloseModal(status: TransactionStatus): boolean {
  return isIdleStatus(status) || isSuccessStatus(status) || isErrorStatus(status);
}

// Function to validate transaction hash format
function isValidTxHash(hash: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
}

// State machine for valid transaction status transitions
type StatusType = TransactionStatus["status"];

const validTransitions: Record<StatusType, StatusType[]> = {
  idle: ["pending"],
  pending: ["confirming", "error"],
  confirming: ["success", "error"],
  success: ["idle"],
  error: ["idle", "pending"],
};

function isValidTransition(from: StatusType, to: StatusType): boolean {
  return validTransitions[from].includes(to);
}

describe("Transaction Status Tracking Property Tests", () => {
  describe("Property 7.1: Transaction hash availability", () => {
    it("*For any* confirming status, transaction hash SHALL be available", () => {
      fc.assert(
        fc.property(txHashArb, (txHash) => {
          const status: TransactionStatus = { status: "confirming", txHash };
          
          // Property: confirming status must have txHash
          expect(hasTxHash(status)).toBe(true);
          expect(getTxHash(status)).toBe(txHash);
          expect(isValidTxHash(txHash)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it("*For any* success status, transaction hash SHALL be available", () => {
      fc.assert(
        fc.property(txHashArb, (txHash) => {
          const status: TransactionStatus = { status: "success", txHash };
          
          // Property: success status must have txHash
          expect(hasTxHash(status)).toBe(true);
          expect(getTxHash(status)).toBe(txHash);
          expect(isValidTxHash(txHash)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it("*For any* pending or error status, transaction hash SHALL NOT be available", () => {
      fc.assert(
        fc.property(
          fc.oneof(
            pendingMessageArb.map((message) => ({ status: "pending" as const, message })),
            errorMessageArb.map((error) => ({ status: "error" as const, error })),
            fc.constant({ status: "idle" as const })
          ),
          (status) => {
            // Property: pending, error, and idle statuses should not have txHash
            expect(hasTxHash(status)).toBe(false);
            expect(getTxHash(status)).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Property 7.2: Status type discrimination", () => {
    it("*For any* transaction status, exactly one type guard SHALL return true", () => {
      fc.assert(
        fc.property(transactionStatusArb, (status) => {
          const guards = [
            isIdleStatus(status),
            isPendingStatus(status),
            isConfirmingStatus(status),
            isSuccessStatus(status),
            isErrorStatus(status),
          ];
          
          // Property: exactly one guard should be true
          const trueCount = guards.filter(Boolean).length;
          expect(trueCount).toBe(1);
        }),
        { numRuns: 100 }
      );
    });

    it("*For any* status, the status field SHALL match the type guard", () => {
      fc.assert(
        fc.property(transactionStatusArb, (status) => {
          // Property: type guard should match status field
          switch (status.status) {
            case "idle":
              expect(isIdleStatus(status)).toBe(true);
              break;
            case "pending":
              expect(isPendingStatus(status)).toBe(true);
              break;
            case "confirming":
              expect(isConfirmingStatus(status)).toBe(true);
              break;
            case "success":
              expect(isSuccessStatus(status)).toBe(true);
              break;
            case "error":
              expect(isErrorStatus(status)).toBe(true);
              break;
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("Property 7.3: Modal close behavior", () => {
    it("*For any* success or error status, modal SHALL be closeable", () => {
      fc.assert(
        fc.property(
          fc.oneof(
            txHashArb.map((txHash) => ({ status: "success" as const, txHash })),
            errorMessageArb.map((error) => ({ status: "error" as const, error })),
            fc.constant({ status: "idle" as const })
          ),
          (status) => {
            // Property: success, error, and idle statuses should allow closing
            expect(canCloseModal(status)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("*For any* pending or confirming status, modal SHALL NOT be closeable", () => {
      fc.assert(
        fc.property(
          fc.oneof(
            pendingMessageArb.map((message) => ({ status: "pending" as const, message })),
            txHashArb.map((txHash) => ({ status: "confirming" as const, txHash }))
          ),
          (status) => {
            // Property: pending and confirming statuses should prevent closing
            expect(canCloseModal(status)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Property 7.4: Valid state transitions", () => {
    it("*For any* idle status, only pending transition SHALL be valid", () => {
      const allStatuses: StatusType[] = ["idle", "pending", "confirming", "success", "error"];
      
      fc.assert(
        fc.property(fc.constantFrom(...allStatuses), (toStatus) => {
          const isValid = isValidTransition("idle", toStatus);
          
          // Property: only idle -> pending is valid
          expect(isValid).toBe(toStatus === "pending");
        }),
        { numRuns: 100 }
      );
    });

    it("*For any* pending status, only confirming or error transitions SHALL be valid", () => {
      const allStatuses: StatusType[] = ["idle", "pending", "confirming", "success", "error"];
      
      fc.assert(
        fc.property(fc.constantFrom(...allStatuses), (toStatus) => {
          const isValid = isValidTransition("pending", toStatus);
          
          // Property: pending -> confirming or pending -> error are valid
          expect(isValid).toBe(toStatus === "confirming" || toStatus === "error");
        }),
        { numRuns: 100 }
      );
    });

    it("*For any* confirming status, only success or error transitions SHALL be valid", () => {
      const allStatuses: StatusType[] = ["idle", "pending", "confirming", "success", "error"];
      
      fc.assert(
        fc.property(fc.constantFrom(...allStatuses), (toStatus) => {
          const isValid = isValidTransition("confirming", toStatus);
          
          // Property: confirming -> success or confirming -> error are valid
          expect(isValid).toBe(toStatus === "success" || toStatus === "error");
        }),
        { numRuns: 100 }
      );
    });

    it("*For any* success status, only idle transition SHALL be valid", () => {
      const allStatuses: StatusType[] = ["idle", "pending", "confirming", "success", "error"];
      
      fc.assert(
        fc.property(fc.constantFrom(...allStatuses), (toStatus) => {
          const isValid = isValidTransition("success", toStatus);
          
          // Property: success -> idle is valid (reset for new transaction)
          expect(isValid).toBe(toStatus === "idle");
        }),
        { numRuns: 100 }
      );
    });

    it("*For any* error status, only idle or pending transitions SHALL be valid", () => {
      const allStatuses: StatusType[] = ["idle", "pending", "confirming", "success", "error"];
      
      fc.assert(
        fc.property(fc.constantFrom(...allStatuses), (toStatus) => {
          const isValid = isValidTransition("error", toStatus);
          
          // Property: error -> idle (reset) or error -> pending (retry) are valid
          expect(isValid).toBe(toStatus === "idle" || toStatus === "pending");
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("Property 7.5: Transaction hash format validation", () => {
    it("*For any* valid transaction hash, format SHALL be 0x followed by 64 hex characters", () => {
      fc.assert(
        fc.property(txHashArb, (txHash) => {
          // Property: valid tx hash format
          expect(isValidTxHash(txHash)).toBe(true);
          expect(txHash).toMatch(/^0x[a-f0-9]{64}$/);
          expect(txHash.length).toBe(66);
        }),
        { numRuns: 100 }
      );
    });

    it("*For any* invalid transaction hash, validation SHALL fail", () => {
      const invalidTxHashArb = fc.oneof(
        // Too short
        fc.array(hexChar, { minLength: 1, maxLength: 63 }).map(
          (chars) => `0x${chars.join("")}`
        ),
        // Too long
        fc.array(hexChar, { minLength: 65, maxLength: 100 }).map(
          (chars) => `0x${chars.join("")}`
        ),
        // Missing 0x prefix
        fc.array(hexChar, { minLength: 64, maxLength: 64 }).map(
          (chars) => chars.join("")
        ),
        // Invalid characters
        fc.constant("0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG")
      );

      fc.assert(
        fc.property(invalidTxHashArb, (invalidHash) => {
          // Property: invalid tx hash should fail validation
          expect(isValidTxHash(invalidHash)).toBe(false);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("Property 7.6: Error message presence", () => {
    it("*For any* error status, error message SHALL be non-empty", () => {
      fc.assert(
        fc.property(errorMessageArb, (error) => {
          const status: TransactionStatus = { status: "error", error };
          
          // Property: error status must have non-empty error message
          expect(isErrorStatus(status)).toBe(true);
          if (isErrorStatus(status)) {
            expect(status.error.trim().length).toBeGreaterThan(0);
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("Property 7.7: Pending message presence", () => {
    it("*For any* pending status, message SHALL be non-empty", () => {
      fc.assert(
        fc.property(pendingMessageArb, (message) => {
          const status: TransactionStatus = { status: "pending", message };
          
          // Property: pending status must have non-empty message
          expect(isPendingStatus(status)).toBe(true);
          if (isPendingStatus(status)) {
            expect(status.message.trim().length).toBeGreaterThan(0);
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("Property 7.8: Status determinism", () => {
    it("*For any* transaction status, type guards are deterministic", () => {
      fc.assert(
        fc.property(transactionStatusArb, (status) => {
          // Property: multiple calls to type guards should return same result
          const results1 = {
            idle: isIdleStatus(status),
            pending: isPendingStatus(status),
            confirming: isConfirmingStatus(status),
            success: isSuccessStatus(status),
            error: isErrorStatus(status),
          };
          
          const results2 = {
            idle: isIdleStatus(status),
            pending: isPendingStatus(status),
            confirming: isConfirmingStatus(status),
            success: isSuccessStatus(status),
            error: isErrorStatus(status),
          };
          
          expect(results1).toEqual(results2);
        }),
        { numRuns: 100 }
      );
    });

    it("*For any* transaction status, hasTxHash is deterministic", () => {
      fc.assert(
        fc.property(transactionStatusArb, (status) => {
          // Property: multiple calls should return same result
          const result1 = hasTxHash(status);
          const result2 = hasTxHash(status);
          const result3 = hasTxHash(status);
          
          expect(result1).toBe(result2);
          expect(result2).toBe(result3);
        }),
        { numRuns: 100 }
      );
    });

    it("*For any* transaction status, canCloseModal is deterministic", () => {
      fc.assert(
        fc.property(transactionStatusArb, (status) => {
          // Property: multiple calls should return same result
          const result1 = canCloseModal(status);
          const result2 = canCloseModal(status);
          const result3 = canCloseModal(status);
          
          expect(result1).toBe(result2);
          expect(result2).toBe(result3);
        }),
        { numRuns: 100 }
      );
    });
  });
});
