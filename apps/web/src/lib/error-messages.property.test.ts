/**
 * Property Test: Error Message Clarity
 * 
 * **Property 4: Error Message Clarity**
 * *For any* error condition, the UI SHALL display a human-readable message 
 * without technical jargon AND provide a suggested recovery action where applicable.
 * 
 * **Validates: Requirements 9.1, 9.2, 9.3, 9.4**
 * 
 * Feature: 04-frontend, Property 4: Error Message Clarity
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  errorMessages,
  getErrorMessage,
  isErrorCode,
  getErrorAction,
  type ErrorMessage,
} from "./error-messages";
import type { ApiError } from "./api/types";

// List of technical jargon terms that should NOT appear in user-facing messages
// These are terms that are too technical for end users
// Note: We check for exact matches or patterns, not substrings in user-friendly phrases
const technicalJargonPatterns = [
  /\bnull\b/i,
  /\bundefined\b/i,
  /\bexception\b/i,
  /\bstack\s*trace\b/i,
  /\bNaN\b/,
  /\bTypeError\b/,
  /\bReferenceError\b/,
  /\bSyntaxError\b/,
  /\b500\b/,
  /\b404\b/,
  /\b401\b/,
  /\b403\b/,
  /\bHTTP\b/,
  /\bCORS\b/,
  /\bJSON\b/,
  /\bAPI\b/,
  /\bendpoint\b/i,
  /\bpayload\b/i,
  /\brequest\s*body\b/i,
  /\bresponse\s*body\b/i,
  /\bheader\b/i,
  /\btoken\s*expired\b/i,
  /\bJWT\b/,
  /\bOAuth\b/,
  /\bcallback\b/i,
  /\basync\b/i,
  /\bpromise\b/i,
  /\bunhandled\b/i,
  /\bruntime\b/i,
  /\bcompile\b/i,
  /\bparse\s*error\b/i,
  /\bsyntax\s*error\b/i,
  /\btype\s*error\b/i,
  /\breference\s*error\b/i,
  /\bmemory\b/i,
  /\bheap\b/i,
  /\bbuffer\b/i,
  /\bsocket\b/i,
  /\bECONNREFUSED\b/,
  /\bETIMEDOUT\b/,
  /\bENOTFOUND\b/,
];

// Arbitrary for generating known error codes
const knownErrorCodeArb = fc.constantFrom(...Object.keys(errorMessages));

// Arbitrary for generating unknown error codes
const unknownErrorCodeArb = fc.stringMatching(/^[A-Z]{2,6}_[0-9]{3,4}$/).filter(
  (code) => !(code in errorMessages)
);

// Arbitrary for generating error messages
const errorMessageArb = fc.string({ minLength: 1, maxLength: 200 });

// Arbitrary for generating ApiError objects with known codes
const knownApiErrorArb = fc.record({
  code: knownErrorCodeArb,
  message: errorMessageArb,
  details: fc.option(fc.dictionary(fc.string(), fc.jsonValue()), { nil: undefined }),
});

// Arbitrary for generating ApiError objects with unknown codes
const unknownApiErrorArb = fc.record({
  code: unknownErrorCodeArb,
  message: errorMessageArb,
  details: fc.option(fc.dictionary(fc.string(), fc.jsonValue()), { nil: undefined }),
});

// Arbitrary for generating standard Error objects
const standardErrorArb = fc.string({ minLength: 1, maxLength: 200 }).map(
  (msg) => new Error(msg)
);

/**
 * Check if a string contains technical jargon using regex patterns
 */
function containsTechnicalJargon(text: string): string | null {
  for (const pattern of technicalJargonPatterns) {
    if (pattern.test(text)) {
      return pattern.source;
    }
  }
  return null;
}

/**
 * Check if an error message is human-readable
 */
function isHumanReadable(message: ErrorMessage): boolean {
  // Title should not be empty
  if (!message.title || message.title.trim().length === 0) {
    return false;
  }

  // Title should not contain technical jargon
  if (containsTechnicalJargon(message.title)) {
    return false;
  }

  // Description should not contain technical jargon
  if (message.description && containsTechnicalJargon(message.description)) {
    return false;
  }

  // Title should start with a capital letter
  if (!/^[A-Z]/.test(message.title)) {
    return false;
  }

  return true;
}

describe("Error Message Clarity Property Tests", () => {
  describe("Property 4.1: All predefined error messages are human-readable", () => {
    it("should have human-readable messages for all error codes", () => {
      fc.assert(
        fc.property(knownErrorCodeArb, (code) => {
          const message = errorMessages[code];
          
          // Property: message should exist
          expect(message).toBeDefined();
          
          // Property: title should not be empty
          expect(message.title.trim().length).toBeGreaterThan(0);
          
          // Property: description should not be empty
          expect(message.description.trim().length).toBeGreaterThan(0);
          
          // Property: title should not contain technical jargon
          const titleJargon = containsTechnicalJargon(message.title);
          expect(titleJargon).toBeNull();
          
          // Property: description should not contain technical jargon
          const descJargon = containsTechnicalJargon(message.description);
          expect(descJargon).toBeNull();
          
          // Property: title should start with capital letter
          expect(message.title[0]).toMatch(/[A-Z]/);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("Property 4.2: getErrorMessage always returns a valid message", () => {
    it("should return valid message for known API errors", () => {
      fc.assert(
        fc.property(knownApiErrorArb, (apiError) => {
          const message = getErrorMessage(apiError);
          
          // Property: should return a message object
          expect(message).toBeDefined();
          expect(typeof message.title).toBe("string");
          expect(typeof message.description).toBe("string");
          
          // Property: title should not be empty
          expect(message.title.trim().length).toBeGreaterThan(0);
          
          // Property: should be human-readable
          expect(isHumanReadable(message)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it("should return valid message for unknown API errors", () => {
      fc.assert(
        fc.property(unknownApiErrorArb, (apiError) => {
          const message = getErrorMessage(apiError);
          
          // Property: should return a message object
          expect(message).toBeDefined();
          expect(typeof message.title).toBe("string");
          expect(typeof message.description).toBe("string");
          
          // Property: title should not be empty
          expect(message.title.trim().length).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });

    it("should return valid message for standard Error objects", () => {
      fc.assert(
        fc.property(standardErrorArb, (error) => {
          const message = getErrorMessage(error);
          
          // Property: should return a message object
          expect(message).toBeDefined();
          expect(typeof message.title).toBe("string");
          expect(typeof message.description).toBe("string");
          
          // Property: title should not be empty
          expect(message.title.trim().length).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });

    it("should return fallback message for null/undefined", () => {
      fc.assert(
        fc.property(fc.constantFrom(null, undefined, {}, [], ""), (value) => {
          const message = getErrorMessage(value);
          
          // Property: should return a message object
          expect(message).toBeDefined();
          expect(typeof message.title).toBe("string");
          expect(typeof message.description).toBe("string");
          
          // Property: should be the unknown error fallback
          expect(message.title).toBe("Something Went Wrong");
        }),
        { numRuns: 10 }
      );
    });
  });

  describe("Property 4.3: Error codes are correctly identified", () => {
    it("should correctly identify known error codes", () => {
      fc.assert(
        fc.property(knownErrorCodeArb, errorMessageArb, (code, message) => {
          const apiError: ApiError = { code, message };
          
          // Property: isErrorCode should return true for matching code
          expect(isErrorCode(apiError, code)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it("should correctly reject non-matching error codes", () => {
      fc.assert(
        fc.property(
          knownErrorCodeArb,
          knownErrorCodeArb.filter((c) => c !== "AUTH_001"),
          errorMessageArb,
          (code, differentCode, message) => {
            fc.pre(code !== differentCode);
            
            const apiError: ApiError = { code, message };
            
            // Property: isErrorCode should return false for non-matching code
            expect(isErrorCode(apiError, differentCode)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should return false for non-error objects", () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(null),
            fc.constant(undefined),
            fc.string(),
            fc.integer(),
            fc.boolean()
          ),
          knownErrorCodeArb,
          (value, code) => {
            // Property: isErrorCode should return false for non-error values
            expect(isErrorCode(value, code)).toBe(false);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe("Property 4.4: Action suggestions are provided where applicable", () => {
    it("should provide action for errors that have one defined", () => {
      // Get all error codes that have actions defined
      const codesWithActions = Object.entries(errorMessages)
        .filter(([, msg]) => msg.action !== undefined)
        .map(([code]) => code);

      if (codesWithActions.length === 0) {
        // Skip if no actions are defined
        return;
      }

      fc.assert(
        fc.property(
          fc.constantFrom(...codesWithActions),
          errorMessageArb,
          (code, message) => {
            const apiError: ApiError = { code, message };
            const action = getErrorAction(apiError);
            
            // Property: action should be defined
            expect(action).toBeDefined();
            expect(typeof action).toBe("string");
            expect(action!.trim().length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should return undefined for errors without actions", () => {
      // Get all error codes that don't have actions defined
      const codesWithoutActions = Object.entries(errorMessages)
        .filter(([, msg]) => msg.action === undefined)
        .map(([code]) => code);

      if (codesWithoutActions.length === 0) {
        // Skip if all have actions
        return;
      }

      fc.assert(
        fc.property(
          fc.constantFrom(...codesWithoutActions),
          errorMessageArb,
          (code, message) => {
            const apiError: ApiError = { code, message };
            const action = getErrorAction(apiError);
            
            // Property: action should be undefined
            expect(action).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Property 4.5: Error message consistency", () => {
    it("should return consistent messages for the same error code", () => {
      fc.assert(
        fc.property(
          knownErrorCodeArb,
          errorMessageArb,
          errorMessageArb,
          (code, msg1, msg2) => {
            const error1: ApiError = { code, message: msg1 };
            const error2: ApiError = { code, message: msg2 };
            
            const result1 = getErrorMessage(error1);
            const result2 = getErrorMessage(error2);
            
            // Property: same error code should produce same title
            expect(result1.title).toBe(result2.title);
            
            // Property: same error code should produce same description
            expect(result1.description).toBe(result2.description);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
