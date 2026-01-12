# OrbitPayroll

A Web3 payroll platform that enables organizations to automate batched cryptocurrency payments to contractors using MNEE stablecoin on Ethereum.

## Overview

OrbitPayroll turns MNEE into a "salary rail" for DAOs, crypto-native projects, and remote-first teams. Instead of juggling multiple wallets and manual spreadsheets, organizations can:

- Create on-chain MNEE payroll treasuries
- Onboard contractors with wallet addresses, rates, and pay cycles
- Preview and execute batched payroll transactions
- Track transparent payment history with on-chain verification

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React 18, TailwindCSS, RainbowKit, wagmi |
| Backend | Express.js, TypeScript, Pino, Zod |
| Database | PostgreSQL, Prisma ORM |
| Blockchain | Solidity, Hardhat, OpenZeppelin, ethers.js v6 |
| Auth | SIWE (Sign-In with Ethereum), JWT |

## Project Structure

```
orbitpayroll/
├── apps/
│   ├── api/          # Express.js backend API
│   └── web/          # Next.js frontend dashboard
├── packages/
│   ├── config/       # Shared configuration schemas
│   ├── contracts/    # Solidity smart contracts
│   ├── database/     # Prisma ORM package
│   └── types/        # Shared TypeScript types
└── scripts/          # Utility scripts
```

## Prerequisites

- Node.js >= 18.0.0
- Docker & Docker Compose
- An Ethereum wallet (MetaMask recommended)

## Getting Started

### 1. Clone and Install

```bash
git clone https://github.com/your-org/orbitpayroll.git
cd orbitpayroll
npm install
```

### 2. Environment Setup

```bash
# Copy environment files
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

### 3. Start Database

```bash
npm run docker:up
```

### 4. Initialize Database

```bash
cd packages/database
npm run db:generate
npm run db:migrate
```

### 5. Run Development Servers

```bash
# API (runs on port 3001)
cd apps/api && npm run dev

# Web (runs on port 3000)
cd apps/web && npm run dev
```

## Available Commands

### Root Level
```bash
npm install          # Install all dependencies
npm run build        # Build all workspaces
npm run test         # Run tests across all workspaces
npm run docker:up    # Start PostgreSQL container
npm run docker:reset # Reset database
```

### API (`apps/api`)
```bash
npm run dev          # Start dev server with hot reload
npm run build        # Compile TypeScript
npm run test         # Run Vitest tests
```

### Web (`apps/web`)
```bash
npm run dev          # Start Next.js dev server
npm run build        # Production build
npm run test         # Run Vitest tests
```

### Database (`packages/database`)
```bash
npm run db:generate  # Generate Prisma client
npm run db:migrate   # Run migrations
npm run db:studio    # Open Prisma Studio
npm run db:seed      # Seed database
```

### Contracts (`packages/contracts`)
```bash
npm run compile      # Compile Solidity
npm run test         # Run Hardhat tests
npm run deploy:local # Deploy to local node
```

## Smart Contracts

The `PayrollTreasury` contract handles:
- MNEE token deposits from organization wallets
- Batch payroll execution (up to 100 recipients per transaction)
- Admin management and emergency withdrawals
- Event emission for off-chain reconciliation

MNEE Token Address: `0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFB6cF`

## User Roles

| Role | Permissions |
|------|-------------|
| Owner/Admin | Full organization control, treasury management |
| Finance Operator | Execute payroll runs, manage contractors |

## License

[MIT](LICENSE)
