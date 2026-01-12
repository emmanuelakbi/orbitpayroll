/**
 * Authentication Routes
 *
 * Handles wallet-based authentication using SIWE (Sign-In with Ethereum).
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import {
  nonceRequestSchema,
  verifyRequestSchema,
  refreshRequestSchema,
} from '../schemas/auth.js';
import {
  generateNonce,
  verifySignature,
  refreshTokens,
  logout,
} from '../services/auth.service.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

/**
 * POST /api/v1/auth/nonce
 *
 * Generate a nonce for wallet authentication.
 * Returns a SIWE message to be signed by the wallet.
 */
router.post('/nonce', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { walletAddress } = nonceRequestSchema.parse(req.body);
    const result = await generateNonce(walletAddress);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/auth/verify
 *
 * Verify a signed SIWE message and issue JWT tokens.
 */
router.post('/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { walletAddress, signature, nonce } = verifyRequestSchema.parse(req.body);
    const result = await verifySignature(walletAddress, signature, nonce);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/auth/refresh
 *
 * Refresh access token using a valid refresh token.
 * Implements token rotation for security.
 */
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = refreshRequestSchema.parse(req.body);
    const result = await refreshTokens(refreshToken);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/auth/logout
 *
 * Invalidate the current session.
 * Requires authentication.
 */
router.post('/logout', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const refreshToken = req.body.refreshToken as string | undefined;

    await logout(userId, refreshToken);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
