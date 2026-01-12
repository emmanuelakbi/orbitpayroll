/**
 * Database Client for OrbitPayroll API
 *
 * Re-exports the Prisma client from @orbitpayroll/database package.
 * Uses singleton pattern to prevent multiple connections in development.
 */

import { PrismaClient } from '@orbitpayroll/database';
import { logger } from './logger.js';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}

/**
 * Connect to the database
 */
export async function connectDatabase(): Promise<void> {
  try {
    await db.$connect();
    logger.info('Database connected');
  } catch (error) {
    logger.error({ error }, 'Failed to connect to database');
    throw error;
  }
}

/**
 * Disconnect from the database
 */
export async function disconnectDatabase(): Promise<void> {
  await db.$disconnect();
  logger.info('Database disconnected');
}

// Re-export types from database package
export type { PrismaClient } from '@orbitpayroll/database';
