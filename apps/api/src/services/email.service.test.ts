/**
 * Email Service Tests
 * 
 * Tests for the email service functionality.
 * Note: These tests run with email disabled (no SENDGRID_API_KEY)
 * to verify graceful degradation behavior.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the logger before importing the service
vi.mock('../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Import after mocking
import { 
  emailService, 
  sendEmail, 
  sendEmailAsync, 
  isEmailEnabled,
  type SendEmailParams,
  type PayrollScheduledData,
  type PayrollExecutedData,
  type LowBalanceData,
} from './email.service';

describe('EmailService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should report disabled when no API key is configured', () => {
      // Service should be disabled without SENDGRID_API_KEY
      expect(isEmailEnabled()).toBe(false);
    });
  });

  describe('send (disabled mode)', () => {
    it('should return success when email is disabled', async () => {
      const params: SendEmailParams = {
        to: 'test@example.com',
        template: 'payroll_scheduled',
        data: {
          organizationName: 'Test Org',
          scheduledDate: '2026-01-15',
          totalAmount: '1000.00',
          contractorCount: 5,
        } as PayrollScheduledData,
      };

      const result = await sendEmail(params);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('disabled');
    });

    it('should handle payroll_executed template', async () => {
      const params: SendEmailParams = {
        to: 'test@example.com',
        template: 'payroll_executed',
        data: {
          organizationName: 'Test Org',
          executedDate: '2026-01-12',
          totalAmount: '5000.00',
          contractorCount: 10,
          transactionHash: '0x1234567890abcdef',
          explorerUrl: 'https://sepolia.etherscan.io/tx/0x1234567890abcdef',
        } as PayrollExecutedData,
      };

      const result = await sendEmail(params);

      expect(result.success).toBe(true);
    });

    it('should handle low_balance template', async () => {
      const params: SendEmailParams = {
        to: 'test@example.com',
        template: 'low_balance',
        data: {
          organizationName: 'Test Org',
          currentBalance: '100.00',
          requiredBalance: '500.00',
          treasuryAddress: '0xabcdef1234567890',
        } as LowBalanceData,
      };

      const result = await sendEmail(params);

      expect(result.success).toBe(true);
    });
  });

  describe('sendAsync', () => {
    it('should not throw when called', async () => {
      const params: SendEmailParams = {
        to: 'test@example.com',
        template: 'payroll_scheduled',
        data: {
          organizationName: 'Test Org',
          scheduledDate: '2026-01-15',
          totalAmount: '1000.00',
          contractorCount: 5,
        } as PayrollScheduledData,
      };

      // sendAsync should not throw
      await expect(sendEmailAsync(params)).resolves.toBeUndefined();
    });
  });

  describe('template data validation', () => {
    it('should accept valid PayrollScheduledData', async () => {
      const data: PayrollScheduledData = {
        organizationName: 'Acme Corp',
        scheduledDate: '2026-02-01',
        totalAmount: '10000.00',
        contractorCount: 25,
      };

      const result = await sendEmail({
        to: 'admin@acme.com',
        template: 'payroll_scheduled',
        data,
      });

      expect(result.success).toBe(true);
    });

    it('should accept valid PayrollExecutedData', async () => {
      const data: PayrollExecutedData = {
        organizationName: 'Acme Corp',
        executedDate: '2026-01-12T10:30:00Z',
        totalAmount: '10000.00',
        contractorCount: 25,
        transactionHash: '0x' + 'a'.repeat(64),
        explorerUrl: 'https://etherscan.io/tx/0x' + 'a'.repeat(64),
      };

      const result = await sendEmail({
        to: 'admin@acme.com',
        template: 'payroll_executed',
        data,
      });

      expect(result.success).toBe(true);
    });

    it('should accept valid LowBalanceData', async () => {
      const data: LowBalanceData = {
        organizationName: 'Acme Corp',
        currentBalance: '500.00',
        requiredBalance: '2000.00',
        treasuryAddress: '0x' + 'b'.repeat(40),
      };

      const result = await sendEmail({
        to: 'admin@acme.com',
        template: 'low_balance',
        data,
      });

      expect(result.success).toBe(true);
    });
  });
});
