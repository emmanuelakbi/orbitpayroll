# =============================================================================
# OrbitPayroll API Dockerfile
# =============================================================================
# Multi-stage build for optimized production image
# Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Dependencies
# Install all dependencies including devDependencies for building
# -----------------------------------------------------------------------------
FROM node:20-alpine AS deps

WORKDIR /app

# Install dependencies needed for native modules
RUN apk add --no-cache libc6-compat

# Copy root package files for workspace setup
COPY package.json package-lock.json ./

# Copy workspace package.json files
COPY apps/api/package.json ./apps/api/
COPY packages/config/package.json ./packages/config/
COPY packages/database/package.json ./packages/database/
COPY packages/types/package.json ./packages/types/

# Install all dependencies (including devDependencies for build)
# npm workspaces hoists dependencies to root node_modules
RUN npm ci

# -----------------------------------------------------------------------------
# Stage 2: Builder
# Build TypeScript and generate Prisma client
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Copy dependencies from deps stage (hoisted to root)
COPY --from=deps /app/node_modules ./node_modules

# Copy source files
COPY package.json package-lock.json tsconfig.json ./
COPY apps/api ./apps/api
COPY packages/config ./packages/config
COPY packages/database ./packages/database
COPY packages/types ./packages/types

# Generate Prisma client
RUN npm run db:generate -w @orbitpayroll/database

# Build all packages in correct order
RUN npm run build -w @orbitpayroll/types
RUN npm run build -w @orbitpayroll/config
RUN npm run build -w @orbitpayroll/database
RUN npm run build -w @orbitpayroll/api

# -----------------------------------------------------------------------------
# Stage 3: Production Dependencies
# Install only production dependencies
# -----------------------------------------------------------------------------
FROM node:20-alpine AS prod-deps

WORKDIR /app

# Install dependencies needed for native modules
RUN apk add --no-cache libc6-compat

# Copy package files
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/config/package.json ./packages/config/
COPY packages/database/package.json ./packages/database/
COPY packages/types/package.json ./packages/types/

# Install production dependencies only (hoisted to root)
RUN npm ci --omit=dev

# -----------------------------------------------------------------------------
# Stage 4: Runner
# Final production image with minimal footprint
# -----------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

# Install dependencies for Prisma (openssl) and healthcheck (curl)
RUN apk add --no-cache libc6-compat curl openssl

# Create non-root user for security (Requirement 1.5)
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 orbitpayroll

# Copy production dependencies (hoisted to root)
COPY --from=prod-deps /app/node_modules ./node_modules

# Copy built workspace packages to node_modules for proper resolution
COPY --from=builder /app/packages/config/dist ./node_modules/@orbitpayroll/config/dist
COPY --from=builder /app/packages/config/package.json ./node_modules/@orbitpayroll/config/
COPY --from=builder /app/packages/database/dist ./node_modules/@orbitpayroll/database/dist
COPY --from=builder /app/packages/database/package.json ./node_modules/@orbitpayroll/database/
COPY --from=builder /app/packages/types/dist ./node_modules/@orbitpayroll/types/dist
COPY --from=builder /app/packages/types/package.json ./node_modules/@orbitpayroll/types/

# Copy built API
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/

# Copy Prisma schema and migrations for runtime
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma

# Copy root package.json for workspace resolution
COPY --from=builder /app/package.json ./

# Copy generated Prisma client
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Set ownership to non-root user
RUN chown -R orbitpayroll:nodejs /app

# Switch to non-root user (Requirement 1.5)
USER orbitpayroll

# Expose application port (Requirement 1.6)
EXPOSE 3001

# Environment variables with defaults
ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

# Health check (Requirement 7.4, 7.5)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Startup script that runs migrations then starts the app (Requirement 1.7)
# The app will fail fast if required env vars are missing (Requirement 1.8)
CMD ["sh", "-c", "npx prisma migrate deploy --schema=/app/packages/database/prisma/schema.prisma && node /app/apps/api/dist/index.js"]
