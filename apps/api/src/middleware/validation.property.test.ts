/**
 * Property Test: Input Validation Completeness
 *
 * **Property 7: Input Validation Completeness**
 * *For any* API request with invalid input (per zod schema), the request
 * SHALL be rejected with 400 and field-level error details.
 *
 * **Validates: Requirements 9.1, 9.2**
 *
 * This test verifies that:
 * 1. All request bodies are validated using zod schemas (Req 9.1)
 * 2. Validation failures return 400 with field-level error details (Req 9.2)
 *
 * Note: This test focuses on the auth endpoints (which don't require authentication)
 * and directly tests the Zod schemas to verify validation behavior.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import request from 'supertest';
import fc from 'fast-check';
import { db } from '../lib/db.js';
import { errorHandler } from './error-handler.js';
import authRoutes from '../routes/auth.routes.js';
import {
  createOrgSchema,
  createContractorSchema,
  createPayrollRunSchema,
  uuidParamSchema,
} from '../schemas/index.js';

// Test app setup - only auth routes (no auth required)
function createTestApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/auth', authRoutes);

  // Add test routes that validate schemas directly (bypassing auth)
  app.post('/test/org', (req: Request, res: Response, next: NextFunction) => {
    try {
      createOrgSchema.parse(req.body);
      res.status(200).json({ valid: true });
    } catch (error) {
      next(error);
    }
  });

  app.post('/test/contractor', (req: Request, res: Response, next: NextFunction) => {
    try {
      createContractorSchema.parse(req.body);
      res.status(200).json({ valid: true });
    } catch (error) {
      next(error);
    }
  });

  app.post('/test/payroll', (req: Request, res: Response, next: NextFunction) => {
    try {
      createPayrollRunSchema.parse(req.body);
      res.status(200).json({ valid: true });
    } catch (error) {
      next(error);
    }
  });

  app.get('/test/uuid/:id', (req: Request, res: Response, next: NextFunction) => {
    try {
      uuidParamSchema.parse(req.params);
      res.status(200).json({ valid: true });
    } catch (error) {
      next(error);
    }
  });

  app.use(errorHandler);
  return app;
}

describe('Property 7: Input Validation Completeness', () => {
  let app: Express;

  beforeAll(() => {
    app = createTestApp();
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  /**
   * Feature: input-validation, Property 7: Input Validation Completeness
   * Validates: Requirements 9.1, 9.2
   */
  describe('Auth Endpoint Validation', () => {
    it('should reject invalid wallet addresses with 400 and field-level errors', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate strings that are NOT valid Ethereum addresses
          fc.oneof(
            fc.string({ minLength: 0, maxLength: 41 }), // Too short
            fc.string({ minLength: 43, maxLength: 100 }), // Too long
            fc.constant('not-an-address'),
            fc.constant('0x' + 'g'.repeat(40)), // Invalid hex chars
            fc.constant('1234567890123456789012345678901234567890'), // Missing 0x prefix
          ),
          async (invalidAddress) => {
            const response = await request(app)
              .post('/api/v1/auth/nonce')
              .send({ walletAddress: invalidAddress });

            // Should return 400 for validation error
            expect(response.status).toBe(400);
            expect(response.body.code).toBe('VALIDATION_ERROR');
            expect(response.body.message).toBe('Invalid request body');
            expect(response.body.details).toBeDefined();
            expect(response.body.details.walletAddress).toBeDefined();
            expect(Array.isArray(response.body.details.walletAddress)).toBe(true);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should reject missing required fields with 400 and field-level errors', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate objects without walletAddress
          fc.record({
            randomField: fc.string(),
            anotherField: fc.integer(),
          }),
          async (invalidBody) => {
            const response = await request(app)
              .post('/api/v1/auth/nonce')
              .send(invalidBody);

            expect(response.status).toBe(400);
            expect(response.body.code).toBe('VALIDATION_ERROR');
            expect(response.body.details).toBeDefined();
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Organization Endpoint Validation', () => {
    it('should reject invalid organization names with 400 and field-level errors', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant(''), // Empty string
            fc.string({ minLength: 101, maxLength: 200 }), // Too long
          ),
          async (invalidName) => {
            const response = await request(app)
              .post('/test/org')
              .send({ name: invalidName });

            expect(response.status).toBe(400);
            expect(response.body.code).toBe('VALIDATION_ERROR');
            expect(response.body.message).toBe('Invalid request body');
            expect(response.body.details).toBeDefined();
            expect(response.body.details.name).toBeDefined();
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should reject invalid UUID parameters with 400', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate strings that are NOT valid UUIDs but are valid URL path segments
          fc.oneof(
            fc.stringMatching(/^[a-zA-Z0-9-]{1,35}$/).filter(s => s.length > 0), // Too short, alphanumeric only
            fc.constant('not-a-uuid'),
            fc.constant('12345678-1234-1234-1234-12345678901'), // Missing digit
            fc.constant('gggggggg-gggg-gggg-gggg-gggggggggggg'), // Invalid chars
            fc.constant('invalid-uuid-format'),
            fc.constant('abc123'),
          ),
          async (invalidUuid) => {
            const response = await request(app)
              .get(`/test/uuid/${invalidUuid}`);

            expect(response.status).toBe(400);
            expect(response.body.code).toBe('VALIDATION_ERROR');
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Contractor Endpoint Validation', () => {
    it('should reject invalid contractor data with 400 and field-level errors', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.oneof(
              fc.constant(''), // Empty
              fc.string({ minLength: 101, maxLength: 200 }), // Too long
            ),
            walletAddress: fc.constant('invalid-wallet'),
            rateAmount: fc.oneof(
              fc.constant(-100), // Negative
              fc.constant(0), // Zero
            ),
            payCycle: fc.constant('INVALID_CYCLE'),
          }),
          async (invalidContractor) => {
            const response = await request(app)
              .post('/test/contractor')
              .send(invalidContractor);

            expect(response.status).toBe(400);
            expect(response.body.code).toBe('VALIDATION_ERROR');
            expect(response.body.message).toBe('Invalid request body');
            expect(response.body.details).toBeDefined();
            // Should have multiple field errors
            const errorFields = Object.keys(response.body.details);
            expect(errorFields.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should reject negative rate amounts with field-level error', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: -10000, max: -1 }),
          async (negativeRate) => {
            const response = await request(app)
              .post('/test/contractor')
              .send({
                name: 'Test Contractor',
                walletAddress: '0x1234567890123456789012345678901234567890',
                rateAmount: negativeRate,
                payCycle: 'MONTHLY',
              });

            expect(response.status).toBe(400);
            expect(response.body.code).toBe('VALIDATION_ERROR');
            expect(response.body.details.rateAmount).toBeDefined();
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should reject invalid pay cycles with field-level error', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string().filter(s => !['WEEKLY', 'BI_WEEKLY', 'MONTHLY'].includes(s)),
          async (invalidCycle) => {
            const response = await request(app)
              .post('/test/contractor')
              .send({
                name: 'Test Contractor',
                walletAddress: '0x1234567890123456789012345678901234567890',
                rateAmount: 1000,
                payCycle: invalidCycle,
              });

            expect(response.status).toBe(400);
            expect(response.body.code).toBe('VALIDATION_ERROR');
            expect(response.body.details.payCycle).toBeDefined();
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Payroll Endpoint Validation', () => {
    it('should reject invalid transaction hashes with 400 and field-level errors', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant('invalid-tx-hash'),
            fc.constant('0x' + 'g'.repeat(64)), // Invalid hex
            fc.constant('0x' + '1'.repeat(63)), // Too short
            fc.constant('0x' + '1'.repeat(65)), // Too long
            fc.string({ minLength: 1, maxLength: 65 }), // Random strings
          ),
          async (invalidTxHash) => {
            const response = await request(app)
              .post('/test/payroll')
              .send({
                txHash: invalidTxHash,
                items: [
                  {
                    contractorId: '12345678-1234-1234-1234-123456789012',
                    amountMnee: '1000',
                  },
                ],
              });

            expect(response.status).toBe(400);
            expect(response.body.code).toBe('VALIDATION_ERROR');
            expect(response.body.details.txHash).toBeDefined();
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should reject empty payroll items array with field-level error', async () => {
      const response = await request(app)
        .post('/test/payroll')
        .send({
          txHash: '0x' + '1'.repeat(64),
          items: [],
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('VALIDATION_ERROR');
      expect(response.body.details.items).toBeDefined();
    });

    it('should reject invalid contractor IDs in payroll items', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string().filter(s => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)),
          async (invalidContractorId) => {
            const response = await request(app)
              .post('/test/payroll')
              .send({
                txHash: '0x' + '1'.repeat(64),
                items: [
                  {
                    contractorId: invalidContractorId,
                    amountMnee: '1000',
                  },
                ],
              });

            expect(response.status).toBe(400);
            expect(response.body.code).toBe('VALIDATION_ERROR');
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Error Response Format Consistency', () => {
    it('should always return consistent error format for validation errors', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            endpoint: fc.constantFrom(
              '/api/v1/auth/nonce',
              '/test/org',
              '/test/contractor',
            ),
            body: fc.oneof(
              fc.constant({}),
              fc.constant({ invalid: 'data' }),
              fc.constant(null),
            ),
          }),
          async ({ endpoint, body }) => {
            const response = await request(app)
              .post(endpoint)
              .send(body);

            // All validation errors should have consistent format
            if (response.status === 400) {
              expect(response.body).toHaveProperty('code');
              expect(response.body).toHaveProperty('message');
              expect(response.body.code).toBe('VALIDATION_ERROR');
              expect(typeof response.body.message).toBe('string');

              // Details should be an object with string arrays
              if (response.body.details) {
                expect(typeof response.body.details).toBe('object');
                for (const [, errors] of Object.entries(response.body.details)) {
                  expect(Array.isArray(errors)).toBe(true);
                  for (const error of errors as string[]) {
                    expect(typeof error).toBe('string');
                  }
                }
              }
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
