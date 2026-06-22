/**
 * Email template system for Digital Estate Vault
 * Uses Resend API for transactional emails
 */

export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

interface CheckinReminderParams {
  ownerName: string;
  lastCheckinDate: string;
  dashboardUrl: string;
}

interface GracePeriodParams {
  ownerName: string;
  gracePeriodEndsAt: string;
  dashboardUrl: string;
}

interface TrusteeNotificationParams {
  trusteeName: string;
  ownerName: string;
  assetCount: number;
}

interface ReleaseConfirmationParams {
  trusteeName: string;
  ownerName: string;
  assetCount: number;
  portalUrl: string;
}

interface CancellationParams {
  ownerName: string;
  cancelledAt: string;
}

export function checkinReminderTemplate(
  params: CheckinReminderParams
): EmailTemplate {
  const { ownerName, lastCheckinDate, dashboardUrl } = params;

  return {
    subject: 'Time to Check In - Digital Estate Vault',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #334155; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #0f766e; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 30px 20px; border: 1px solid #e2e8f0; border-top: none; }
            .button { display: inline-block; background: #0f766e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #64748b; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Digital Estate Vault</h1>
            </div>
            <div class="content">
              <h2>Time to Check In</h2>
              <p>Hi ${ownerName},</p>
              <p>We haven't heard from you since <strong>${lastCheckinDate}</strong>. Please check in to let us know you're okay.</p>
              <p>Regular check-ins ensure your trustees know you're safe and prevent accidental asset release.</p>
              <center>
                <a href="${dashboardUrl}" class="button">Check In Now</a>
              </center>
              <p style="margin-top: 30px; color: #64748b; font-size: 14px;">
                If you don't check in, we'll send follow-up reminders according to your configured schedule.
              </p>
            </div>
            <div class="footer">
              <p>Digital Estate Vault - Secure Your Digital Legacy</p>
              <p><a href="${dashboardUrl}/settings">Notification Preferences</a></p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Time to Check In

Hi ${ownerName},

We haven't heard from you since ${lastCheckinDate}. Please check in to let us know you're okay.

Check in now: ${dashboardUrl}

If you don't check in, we'll send follow-up reminders according to your configured schedule.

Digital Estate Vault - Secure Your Digital Legacy
Notification Preferences: ${dashboardUrl}/settings`,
  };
}

export function gracePeriodTemplate(
  params: GracePeriodParams
): EmailTemplate {
  const { ownerName, gracePeriodEndsAt, dashboardUrl } = params;

  return {
    subject: 'Grace Period Active - Action Required',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #334155; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #d97706; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 30px 20px; border: 1px solid #e2e8f0; border-top: none; }
            .alert { background: #fef3c7; border-left: 4px solid #d97706; padding: 15px; margin: 20px 0; }
            .button { display: inline-block; background: #d97706; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #64748b; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⚠️ Grace Period Active</h1>
            </div>
            <div class="content">
              <h2>Action Required</h2>
              <p>Hi ${ownerName},</p>
              <div class="alert">
                <strong>Your grace period has started.</strong> If we don't hear from you by <strong>${gracePeriodEndsAt}</strong>, we'll begin notifying your trustees.
              </div>
              <p>This is an automated safety measure. If everything is okay, please check in now to cancel this process.</p>
              <center>
                <a href="${dashboardUrl}" class="button">Check In Now</a>
              </center>
              <p style="margin-top: 30px; color: #64748b; font-size: 14px;">
                If this was triggered by mistake (vacation, hospitalization, etc.), checking in will immediately reset your status to active.
              </p>
            </div>
            <div class="footer">
              <p>Digital Estate Vault - Secure Your Digital Legacy</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `⚠️ Grace Period Active - Action Required

Hi ${ownerName},

Your grace period has started. If we don't hear from you by ${gracePeriodEndsAt}, we'll begin notifying your trustees.

This is an automated safety measure. If everything is okay, please check in now to cancel this process.

Check in now: ${dashboardUrl}

If this was triggered by mistake (vacation, hospitalization, etc.), checking in will immediately reset your status to active.

Digital Estate Vault`,
  };
}

export function trusteeNotificationTemplate(
  params: TrusteeNotificationParams
): EmailTemplate {
  const { trusteeName, ownerName, assetCount } = params;

  return {
    subject: `Estate Access Pending - ${ownerName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #334155; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1e40af; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 30px 20px; border: 1px solid #e2e8f0; border-top: none; }
            .info { background: #dbeafe; border-left: 4px solid #1e40af; padding: 15px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #64748b; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔔 Trustee Notification</h1>
            </div>
            <div class="content">
              <h2>Estate Access Pending</h2>
              <p>Hi ${trusteeName},</p>
              <div class="info">
                <p><strong>${ownerName}</strong> has not checked in for their configured period.</p>
                <p>You have been designated as a trustee for <strong>${assetCount} asset${assetCount === 1 ? '' : 's'}</strong>.</p>
              </div>
              <p>This notification means the dead man's switch has been triggered. You may receive access to designated assets after the final confirmation period.</p>
              <p><strong>What happens next:</strong></p>
              <ul>
                <li>${ownerName} still has time to check in and cancel this process</li>
                <li>If they don't respond, asset release will proceed automatically</li>
                <li>You'll receive another notification when access is granted</li>
              </ul>
              <p style="margin-top: 30px; color: #64748b; font-size: 14px;">
                If you believe this is an error or if you've heard from ${ownerName} directly, please ask them to check in immediately.
              </p>
            </div>
            <div class="footer">
              <p>Digital Estate Vault - Secure Digital Legacy Management</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Estate Access Pending - ${ownerName}

Hi ${trusteeName},

${ownerName} has not checked in for their configured period. You have been designated as a trustee for ${assetCount} asset${assetCount === 1 ? '' : 's'}.

This notification means the dead man's switch has been triggered. You may receive access to designated assets after the final confirmation period.

What happens next:
- ${ownerName} still has time to check in and cancel this process
- If they don't respond, asset release will proceed automatically
- You'll receive another notification when access is granted

If you believe this is an error or if you've heard from ${ownerName} directly, please ask them to check in immediately.

Digital Estate Vault`,
  };
}

export function releaseConfirmationTemplate(
  params: ReleaseConfirmationParams
): EmailTemplate {
  const { trusteeName, ownerName, assetCount, portalUrl } = params;

  return {
    subject: `Access Granted - ${ownerName}'s Estate`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #334155; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #15803d; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 30px 20px; border: 1px solid #e2e8f0; border-top: none; }
            .button { display: inline-block; background: #15803d; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #64748b; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔓 Access Granted</h1>
            </div>
            <div class="content">
              <h2>Estate Assets Released</h2>
              <p>Hi ${trusteeName},</p>
              <p>You now have access to <strong>${assetCount} asset${assetCount === 1 ? '' : 's'}</strong> from ${ownerName}'s digital estate.</p>
              <p>These assets were designated for you in case of emergency. You can access them through the trustee portal.</p>
              <center>
                <a href="${portalUrl}" class="button">Access Trustee Portal</a>
              </center>
              <p style="margin-top: 30px;"><strong>Important:</strong></p>
              <ul>
                <li>All access is logged for audit purposes</li>
                <li>Treat this information with care and respect</li>
                <li>Some assets may require additional verification or quorum approval</li>
              </ul>
            </div>
            <div class="footer">
              <p>Digital Estate Vault - Secure Digital Legacy Management</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Access Granted - ${ownerName}'s Estate

Hi ${trusteeName},

You now have access to ${assetCount} asset${assetCount === 1 ? '' : 's'} from ${ownerName}'s digital estate.

These assets were designated for you in case of emergency. You can access them through the trustee portal.

Access portal: ${portalUrl}

Important:
- All access is logged for audit purposes
- Treat this information with care and respect
- Some assets may require additional verification or quorum approval

Digital Estate Vault`,
  };
}

export function cancellationTemplate(params: CancellationParams): EmailTemplate {
  const { ownerName, cancelledAt } = params;

  return {
    subject: 'Release Cancelled - All Clear',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #334155; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #15803d; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 30px 20px; border: 1px solid #e2e8f0; border-top: none; }
            .footer { text-align: center; padding: 20px; color: #64748b; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ All Clear</h1>
            </div>
            <div class="content">
              <h2>Release Process Cancelled</h2>
              <p>Good news! ${ownerName} checked in on ${cancelledAt}.</p>
              <p>The asset release process has been cancelled. No access will be granted to trustees.</p>
              <p>This was a false alarm. Everything is back to normal.</p>
            </div>
            <div class="footer">
              <p>Digital Estate Vault</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Release Cancelled - All Clear

Good news! ${ownerName} checked in on ${cancelledAt}.

The asset release process has been cancelled. No access will be granted to trustees.

This was a false alarm. Everything is back to normal.

Digital Estate Vault`,
  };
}
