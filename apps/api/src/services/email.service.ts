/**
 * Email Service for OrbitPayroll
 * 
 * Handles transactional email notifications via SendGrid.
 * Supports async sending to avoid blocking API responses.
 * Gracefully degrades when email is disabled.
 */

import sgMail, { MailDataRequired } from '@sendgrid/mail';
import { logger } from '../lib/logger';

// Email template types
export type EmailTemplate = 'payroll_scheduled' | 'payroll_executed' | 'low_balance';

// Template data interfaces
export interface PayrollScheduledData {
  organizationName: string;
  scheduledDate: string;
  totalAmount: string;
  contractorCount: number;
}

export interface PayrollExecutedData {
  organizationName: string;
  executedDate: string;
  totalAmount: string;
  contractorCount: number;
  transactionHash: string;
  explorerUrl: string;
}

export interface LowBalanceData {
  organizationName: string;
  currentBalance: string;
  requiredBalance: string;
  treasuryAddress: string;
}

export type TemplateData = PayrollScheduledData | PayrollExecutedData | LowBalanceData;

// Email send parameters
export interface SendEmailParams {
  to: string;
  template: EmailTemplate;
  data: TemplateData;
}

// Email send result
export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Email configuration
interface EmailConfig {
  enabled: boolean;
  apiKey: string | null;
  fromAddress: string;
  fromName: string;
}

// Template subjects
const TEMPLATE_SUBJECTS: Record<EmailTemplate, string> = {
  payroll_scheduled: 'Payroll Scheduled - OrbitPayroll',
  payroll_executed: 'Payroll Executed Successfully - OrbitPayroll',
  low_balance: 'Low Treasury Balance Alert - OrbitPayroll',
};

/**
 * Email Service class
 * Handles all email operations with graceful degradation
 */
class EmailService {
  private config: EmailConfig;
  private initialized: boolean = false;

  constructor() {
    this.config = {
      enabled: false,
      apiKey: process.env.SENDGRID_API_KEY || null,
      fromAddress: process.env.EMAIL_FROM_ADDRESS || 'noreply@orbitpayroll.xyz',
      fromName: process.env.EMAIL_FROM_NAME || 'OrbitPayroll',
    };
  }

  /**
   * Initialize the email service
   * Sets up SendGrid client if API key is available
   */
  initialize(): void {
    if (this.initialized) return;

    if (this.config.apiKey) {
      sgMail.setApiKey(this.config.apiKey);
      this.config.enabled = true;
      logger.info('Email service initialized with SendGrid');
    } else {
      logger.info('Email service disabled - no SENDGRID_API_KEY configured');
    }

    this.initialized = true;
  }

  /**
   * Check if email service is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Send an email asynchronously (non-blocking)
   * Logs the operation and handles errors gracefully
   */
  async sendAsync(params: SendEmailParams): Promise<void> {
    // Fire and forget - don't await
    this.send(params).catch((error) => {
      logger.error({ error, params: { to: params.to, template: params.template } }, 
        'Async email send failed');
    });
  }

  /**
   * Send an email and wait for result
   */
  async send(params: SendEmailParams): Promise<EmailResult> {
    if (!this.initialized) {
      this.initialize();
    }

    const { to, template, data } = params;

    // Log attempt
    logger.debug({ to, template }, 'Attempting to send email');

    // If email is disabled, log and return success (graceful degradation)
    if (!this.config.enabled) {
      logger.info({ to, template, data }, 'Email disabled - would have sent');
      return { success: true, messageId: 'disabled' };
    }

    try {
      const htmlContent = this.renderTemplate(template, data);
      const textContent = this.renderTextTemplate(template, data);

      const msg: MailDataRequired = {
        to,
        from: {
          email: this.config.fromAddress,
          name: this.config.fromName,
        },
        subject: TEMPLATE_SUBJECTS[template],
        text: textContent,
        html: htmlContent,
      };

      const [response] = await sgMail.send(msg);
      
      const messageId = (response.headers['x-message-id'] as string) || `sg-${Date.now()}`;
      
      logger.info({ to, template, messageId, statusCode: response.statusCode }, 
        'Email sent successfully');

      return { success: true, messageId };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error({ 
        error: errorMessage, 
        to, 
        template,
      }, 'Failed to send email');

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Render HTML email template
   */
  private renderTemplate(template: EmailTemplate, data: TemplateData): string {
    const baseStyles = `
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f9fafb;
    `;

    const headerStyles = `
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: white;
      padding: 30px;
      border-radius: 12px 12px 0 0;
      text-align: center;
    `;

    const contentStyles = `
      background: white;
      padding: 30px;
      border-radius: 0 0 12px 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    `;

    switch (template) {
      case 'payroll_scheduled':
        return this.renderPayrollScheduledHtml(data as PayrollScheduledData, baseStyles, headerStyles, contentStyles);
      case 'payroll_executed':
        return this.renderPayrollExecutedHtml(data as PayrollExecutedData, baseStyles, headerStyles, contentStyles);
      case 'low_balance':
        return this.renderLowBalanceHtml(data as LowBalanceData, baseStyles, headerStyles, contentStyles);
      default:
        return '';
    }
  }

  private renderPayrollScheduledHtml(
    data: PayrollScheduledData, 
    baseStyles: string, 
    headerStyles: string, 
    contentStyles: string
  ): string {
    return `
      <div style="${baseStyles}">
        <div style="${headerStyles}">
          <h1 style="margin: 0; font-size: 24px;">📅 Payroll Scheduled</h1>
        </div>
        <div style="${contentStyles}">
          <p>Hello,</p>
          <p>A payroll run has been scheduled for <strong>${data.organizationName}</strong>.</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Scheduled Date:</strong> ${data.scheduledDate}</p>
            <p style="margin: 5px 0;"><strong>Total Amount:</strong> ${data.totalAmount} MNEE</p>
            <p style="margin: 5px 0;"><strong>Recipients:</strong> ${data.contractorCount} contractor(s)</p>
          </div>
          <p>Please ensure your treasury has sufficient funds before the scheduled date.</p>
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            — The OrbitPayroll Team
          </p>
        </div>
      </div>
    `;
  }

  private renderPayrollExecutedHtml(
    data: PayrollExecutedData, 
    baseStyles: string, 
    headerStyles: string, 
    contentStyles: string
  ): string {
    return `
      <div style="${baseStyles}">
        <div style="${headerStyles}">
          <h1 style="margin: 0; font-size: 24px;">✅ Payroll Executed</h1>
        </div>
        <div style="${contentStyles}">
          <p>Hello,</p>
          <p>A payroll run has been successfully executed for <strong>${data.organizationName}</strong>.</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Executed:</strong> ${data.executedDate}</p>
            <p style="margin: 5px 0;"><strong>Total Paid:</strong> ${data.totalAmount} MNEE</p>
            <p style="margin: 5px 0;"><strong>Recipients:</strong> ${data.contractorCount} contractor(s)</p>
          </div>
          <p>
            <a href="${data.explorerUrl}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">
              View Transaction
            </a>
          </p>
          <p style="color: #6b7280; font-size: 12px; word-break: break-all;">
            Transaction: ${data.transactionHash}
          </p>
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            — The OrbitPayroll Team
          </p>
        </div>
      </div>
    `;
  }

  private renderLowBalanceHtml(
    data: LowBalanceData, 
    baseStyles: string, 
    headerStyles: string, 
    contentStyles: string
  ): string {
    const alertHeaderStyles = headerStyles.replace('#6366f1', '#ef4444').replace('#8b5cf6', '#f97316');
    
    return `
      <div style="${baseStyles}">
        <div style="${alertHeaderStyles}">
          <h1 style="margin: 0; font-size: 24px;">⚠️ Low Balance Alert</h1>
        </div>
        <div style="${contentStyles}">
          <p>Hello,</p>
          <p>The treasury balance for <strong>${data.organizationName}</strong> is running low.</p>
          <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
            <p style="margin: 5px 0;"><strong>Current Balance:</strong> ${data.currentBalance} MNEE</p>
            <p style="margin: 5px 0;"><strong>Required for Next Payroll:</strong> ${data.requiredBalance} MNEE</p>
          </div>
          <p>Please deposit additional funds to ensure upcoming payroll runs can be executed.</p>
          <p style="color: #6b7280; font-size: 12px; word-break: break-all;">
            Treasury Address: ${data.treasuryAddress}
          </p>
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            — The OrbitPayroll Team
          </p>
        </div>
      </div>
    `;
  }

  /**
   * Render plain text email template (fallback)
   */
  private renderTextTemplate(template: EmailTemplate, data: TemplateData): string {
    switch (template) {
      case 'payroll_scheduled': {
        const d = data as PayrollScheduledData;
        return `
Payroll Scheduled - OrbitPayroll

A payroll run has been scheduled for ${d.organizationName}.

Scheduled Date: ${d.scheduledDate}
Total Amount: ${d.totalAmount} MNEE
Recipients: ${d.contractorCount} contractor(s)

Please ensure your treasury has sufficient funds before the scheduled date.

— The OrbitPayroll Team
        `.trim();
      }
      case 'payroll_executed': {
        const d = data as PayrollExecutedData;
        return `
Payroll Executed - OrbitPayroll

A payroll run has been successfully executed for ${d.organizationName}.

Executed: ${d.executedDate}
Total Paid: ${d.totalAmount} MNEE
Recipients: ${d.contractorCount} contractor(s)

View Transaction: ${d.explorerUrl}
Transaction Hash: ${d.transactionHash}

— The OrbitPayroll Team
        `.trim();
      }
      case 'low_balance': {
        const d = data as LowBalanceData;
        return `
Low Balance Alert - OrbitPayroll

The treasury balance for ${d.organizationName} is running low.

Current Balance: ${d.currentBalance} MNEE
Required for Next Payroll: ${d.requiredBalance} MNEE

Please deposit additional funds to ensure upcoming payroll runs can be executed.

Treasury Address: ${d.treasuryAddress}

— The OrbitPayroll Team
        `.trim();
      }
      default:
        return '';
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();

// Export convenience functions
export const sendEmail = (params: SendEmailParams) => emailService.send(params);
export const sendEmailAsync = (params: SendEmailParams) => emailService.sendAsync(params);
export const isEmailEnabled = () => emailService.isEnabled();
