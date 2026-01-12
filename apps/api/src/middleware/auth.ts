/**
 * Authentication Middleware
 *
 * Validates JWT tokens and attaches user info to request.
 */

import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../services/auth.service.js';
import { AuthError } from '../lib/errors.js';
import { db } from '../lib/db.js';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        walletAddress: string;
      };
    }
  }
}

/**
 * Middleware to authenticate requests using JWT Bearer token.
 * Attaches user info to req.user if valid.
 */
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw AuthError.invalidToken();
    }

    // Extract token from "Bearer <token>"
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw AuthError.invalidToken();
    }

    const token = parts[1]!;

    // Verify token
    const payload = verifyAccessToken(token);

    // Verify user still exists
    const user = await db.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, walletAddress: true },
    });

    if (!user) {
      throw AuthError.invalidToken();
    }

    // Attach user to request
    req.user = {
      id: user.id,
      walletAddress: user.walletAddress,
    };

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Optional authentication middleware.
 * Attaches user info if token is valid, but doesn't fail if missing.
 */
export async function optionalAuthenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return next();
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return next();
    }

    const token = parts[1]!;

    try {
      const payload = verifyAccessToken(token);

      const user = await db.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, walletAddress: true },
      });

      if (user) {
        req.user = {
          id: user.id,
          walletAddress: user.walletAddress,
        };
      }
    } catch {
      // Ignore token errors for optional auth
    }

    next();
  } catch (error) {
    next(error);
  }
}
