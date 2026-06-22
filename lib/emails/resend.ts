/**
 * Email service using Resend API
 * Handles all transactional emails for Digital Estate Vault
 */

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@digitalestatevault.com';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Send an email via Resend
 * Returns the message ID on success, throws on error
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
}: SendEmailParams): Promise<string> {
  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
      text,
    });

    if (result.error) {
      console.error('Resend API error:', result.error);
      throw new Error(`Email send failed: ${result.error.message}`);
    }

    console.log(`Email sent successfully to ${to}: ${result.data?.id}`);
    return result.data?.id || 'unknown';
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
}

/**
 * Track email usage to warn when approaching free tier limits
 * Resend free tier: 3,000 emails/month, 100/day
 */
export async function checkEmailQuota(): Promise<{
  withinLimits: boolean;
  warning?: string;
}> {
  // Note: Resend doesn't provide a quota check API on free tier
  // This is a placeholder for future implementation with local tracking
  // In production, implement a counter in the database to track daily/monthly sends

  // TODO: Implement database-backed email counter
  // - Track sends per day and per month in a table
  // - Warn at 80/day (80% of 100/day limit)
  // - Warn at 2,400/month (80% of 3,000/month limit)

  return { withinLimits: true };
}

/**
 * Validate email configuration
 */
export function validateEmailConfig(): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!process.env.RESEND_API_KEY) {
    errors.push('RESEND_API_KEY is not set');
  }

  if (!process.env.RESEND_FROM_EMAIL) {
    errors.push('RESEND_FROM_EMAIL is not set (will use default)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
