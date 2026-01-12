/**
 * User-related types for OrbitPayroll
 */

export interface User {
  id: string;
  walletAddress: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: string;
  userId: string;
  walletAddress: string;
  nonce: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface AuthNonce {
  nonce: string;
  walletAddress: string;
  expiresAt: Date;
}
