/**
 * Authentication Routes Integration Tests
 *
 * Tests the full auth flow: nonce -> sign -> verify -> refresh -> logout
 * Verifies JWT tokens work correctly for protected endpoints.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import { Wallet } from 'ethers';
import { db } from '../lib/db.js';
import authRoutes from './auth.routes.js';
import { errorHandler } from '../middleware/error-handler.js';
import { _internal } from '../services/auth.service.js';

// Create test app
function createTestApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/auth', authRoutes);
  app.use(errorHandler);
  return app;
}

describe('Auth Routes Integration', () => {
  let app: Express;
  let testWallet: Wallet;
  let walletAddress: string;

  beforeAll(async () => {
    app = createTestApp();
    // Create a test wallet for signing
    testWallet = Wallet.createRandom();
    // Use checksummed address for SIWE compatibility
    walletAddress = testWallet.address;
  });

  afterAll(async () => {
    // Clean up test data
    await db.session.deleteMany({});
    await db.user.deleteMany({
      where: { walletAddress: walletAddress.toLowerCase() },
    });
    await db.$disconnect();
  });

  beforeEach(() => {
    // Clear nonce store before each test
    _internal.nonceStore.clear();
  });

  describe('POST /api/v1/auth/nonce', () => {
    it('should generate a nonce for valid wallet address', async () => {
      const response = await request(app)
        .post('/api/v1/auth/nonce')
        .set('Content-Type', 'application/json')
        .send({ walletAddress });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('nonce');
      expect(response.body).toHaveProperty('expiresAt');
      expect(response.body).toHaveProperty('message');
      expect(response.body.nonce).toHaveLength(64); // 32 bytes hex
      expect(response.body.message).toContain('Sign in to OrbitPayroll');
    });

    it('should reject invalid wallet address format', async () => {
      const response = await request(app)
        .post('/api/v1/auth/nonce')
        .send({ walletAddress: 'invalid-address' })
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should reject missing wallet address', async () => {
      const response = await request(app)
        .post('/api/v1/auth/nonce')
        .send({})
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/auth/verify', () => {
    it('should verify valid signature and return tokens', async () => {
      // Step 1: Get nonce
      const nonceResponse = await request(app)
        .post('/api/v1/auth/nonce')
        .send({ walletAddress })
        .expect(200);

      const { nonce, message } = nonceResponse.body;

      // Step 2: Sign the message
      const signature = await testWallet.signMessage(message);

      // Step 3: Verify signature
      const verifyResponse = await request(app)
        .post('/api/v1/auth/verify')
        .send({
          walletAddress,
          signature,
          nonce,
        })
        .expect(200);

      expect(verifyResponse.body).toHaveProperty('accessToken');
      expect(verifyResponse.body).toHaveProperty('refreshToken');
      expect(verifyResponse.body).toHaveProperty('user');
      expect(verifyResponse.body.user.walletAddress).toBe(walletAddress.toLowerCase());
    });

    it('should reject invalid signature', async () => {
      // Get nonce
      const nonceResponse = await request(app)
        .post('/api/v1/auth/nonce')
        .send({ walletAddress })
        .expect(200);

      const { nonce } = nonceResponse.body;

      // Use invalid signature
      const response = await request(app)
        .post('/api/v1/auth/verify')
        .send({
          walletAddress,
          signature: '0x' + '00'.repeat(65),
          nonce,
        })
        .expect(401);

      expect(response.body.code).toBe('AUTH_002');
    });

    it('should reject expired/invalid nonce', async () => {
      const response = await request(app)
        .post('/api/v1/auth/verify')
        .send({
          walletAddress,
          signature: '0x' + '00'.repeat(65),
          nonce: 'invalid-nonce',
        })
        .expect(401);

      expect(response.body.code).toBe('AUTH_001');
    });

    it('should reject reused nonce', async () => {
      // Get nonce
      const nonceResponse = await request(app)
        .post('/api/v1/auth/nonce')
        .send({ walletAddress })
        .expect(200);

      const { nonce, message } = nonceResponse.body;
      const signature = await testWallet.signMessage(message);

      // First verification should succeed
      await request(app)
        .post('/api/v1/auth/verify')
        .send({ walletAddress, signature, nonce })
        .expect(200);

      // Second verification with same nonce should fail
      const response = await request(app)
        .post('/api/v1/auth/verify')
        .send({ walletAddress, signature, nonce })
        .expect(401);

      expect(response.body.code).toBe('AUTH_001');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh tokens with valid refresh token', async () => {
      // Complete auth flow first
      const nonceResponse = await request(app)
        .post('/api/v1/auth/nonce')
        .send({ walletAddress })
        .expect(200);

      const { nonce, message } = nonceResponse.body;
      const signature = await testWallet.signMessage(message);

      const verifyResponse = await request(app)
        .post('/api/v1/auth/verify')
        .send({ walletAddress, signature, nonce })
        .expect(200);

      const { refreshToken } = verifyResponse.body;

      // Refresh tokens
      const refreshResponse = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(refreshResponse.body).toHaveProperty('accessToken');
      expect(refreshResponse.body).toHaveProperty('refreshToken');
      // New refresh token should be different (rotation)
      expect(refreshResponse.body.refreshToken).not.toBe(refreshToken);
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.code).toBe('AUTH_004');
    });

    it('should reject reused refresh token (rotation)', async () => {
      // Complete auth flow
      const nonceResponse = await request(app)
        .post('/api/v1/auth/nonce')
        .send({ walletAddress })
        .expect(200);

      const { nonce, message } = nonceResponse.body;
      const signature = await testWallet.signMessage(message);

      const verifyResponse = await request(app)
        .post('/api/v1/auth/verify')
        .send({ walletAddress, signature, nonce })
        .expect(200);

      const { refreshToken } = verifyResponse.body;

      // First refresh should succeed
      await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      // Second refresh with same token should fail (token was rotated)
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(401);

      expect(response.body.code).toBe('AUTH_004');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should logout with valid access token', async () => {
      // Complete auth flow
      const nonceResponse = await request(app)
        .post('/api/v1/auth/nonce')
        .send({ walletAddress })
        .expect(200);

      const { nonce, message } = nonceResponse.body;
      const signature = await testWallet.signMessage(message);

      const verifyResponse = await request(app)
        .post('/api/v1/auth/verify')
        .send({ walletAddress, signature, nonce })
        .expect(200);

      const { accessToken, refreshToken } = verifyResponse.body;

      // Logout
      await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(204);

      // Refresh token should no longer work
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(401);

      expect(response.body.code).toBe('AUTH_004');
    });

    it('should reject logout without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .send({})
        .expect(401);

      expect(response.body.code).toBe('AUTH_004');
    });
  });

  describe('Full Auth Flow', () => {
    it('should complete full auth cycle: nonce -> verify -> refresh -> logout', async () => {
      // 1. Request nonce
      const nonceResponse = await request(app)
        .post('/api/v1/auth/nonce')
        .send({ walletAddress })
        .expect(200);

      expect(nonceResponse.body.nonce).toBeDefined();

      // 2. Sign and verify
      const signature = await testWallet.signMessage(nonceResponse.body.message);
      const verifyResponse = await request(app)
        .post('/api/v1/auth/verify')
        .send({
          walletAddress,
          signature,
          nonce: nonceResponse.body.nonce,
        })
        .expect(200);

      expect(verifyResponse.body.accessToken).toBeDefined();
      expect(verifyResponse.body.refreshToken).toBeDefined();

      // 3. Refresh tokens
      const refreshResponse = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: verifyResponse.body.refreshToken })
        .expect(200);

      expect(refreshResponse.body.accessToken).toBeDefined();
      expect(refreshResponse.body.refreshToken).toBeDefined();

      // 4. Logout
      await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${refreshResponse.body.accessToken}`)
        .send({ refreshToken: refreshResponse.body.refreshToken })
        .expect(204);

      // 5. Verify refresh token is invalidated
      await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: refreshResponse.body.refreshToken })
        .expect(401);
    });
  });

  describe('JWT Token Verification', () => {
    it('should decode JWT with correct claims', async () => {
      // Complete auth flow
      const nonceResponse = await request(app)
        .post('/api/v1/auth/nonce')
        .send({ walletAddress })
        .expect(200);

      const signature = await testWallet.signMessage(nonceResponse.body.message);
      const verifyResponse = await request(app)
        .post('/api/v1/auth/verify')
        .send({
          walletAddress,
          signature,
          nonce: nonceResponse.body.nonce,
        })
        .expect(200);

      // Decode JWT (without verification, just to check structure)
      const [, payloadBase64] = verifyResponse.body.accessToken.split('.');
      const payload = JSON.parse(Buffer.from(payloadBase64!, 'base64').toString());

      expect(payload).toHaveProperty('sub'); // User ID
      expect(payload).toHaveProperty('wallet');
      expect(payload).toHaveProperty('iat');
      expect(payload).toHaveProperty('exp');
      expect(payload.wallet).toBe(walletAddress.toLowerCase());
    });
  });
});
