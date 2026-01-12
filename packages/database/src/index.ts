// =============================================================================
// OrbitPayroll Database Package
// =============================================================================
// Re-exports Prisma Client and types for use across the monorepo.
// =============================================================================

export * from '@prisma/client';
export { PrismaClient } from '@prisma/client';

// Singleton instance for development
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
