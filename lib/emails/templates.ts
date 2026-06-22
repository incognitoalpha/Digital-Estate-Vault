/**
 * Email templates for Digital Estate Vault
 * All templates use plain, warm, reassuring language per PRD Section 8.1
 */

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export function getCheckinReminderEmail(
  ownerName: string,
  daysOverdue: number,
  checkinUrl: string
): EmailTemplate {
  return {
    subject: 'Time to check in with Digital Estate Vault',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #0f172a; font-size: 24px; margin-bottom: 16px;">It's time to check in</h1>

        <p style="color: #475569; font-size: 16px; line-height: 1.6;">
          Hi${ownerName ? ` ${ownerName}` : ''},
        </p>

        <p style="color: #475569; font-size: 16px; line-height: 1.6;">
          We haven't heard from you in ${daysOverdue} days. To keep your Digital Estate Vault active
          and prevent your trustees from being notified, please check in when you have a moment.
        </p>

        <div style="margin: 32px 0;">
          <a href="${checkinUrl}" style="background-color: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 500;">
            I'm here — Check in now
          </a>
        </div>

        <p style="color: #64748b; font-size: 14px; line-height: 1.6;">
          If we don't hear from you, we'll continue sending reminders during your grace period.
          After that, your designated trustees will be notified according to your settings.
        </p>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />

        <p style="color: #94a3b8; font-size: 12px;">
          Digital Estate Vault — Secure digital asset management<br />
          You're receiving this because you set up a dead man's switch with us.
        </p>
      </div>
    `,
    text: `It's time to check in

Hi${ownerName ? ` ${ownerName}` : ''},

We haven't heard from you in ${daysOverdue} days. To keep your Digital Estate Vault active and prevent your trustees from being notified, please check in when you have a moment.

Check in now: ${checkinUrl}

If we don't hear from you, we'll continue sending reminders during your grace period. After that, your designated trustees will be notified according to your settings.

---
Digital Estate Vault — Secure digital asset management
You're receiving this because you set up a dead man's switch with us.`,
  };
}

export function getMissedCheckinWarningEmail(
  ownerName: string,
  gracePeriodDays: number,
  finalDate: string,
  checkinUrl: string
): EmailTemplate {
  return {
    subject: 'Urgent: Please check in with Digital Estate Vault',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
          <p style="color: #92400e; font-weight: 500; margin: 0;">
            ⚠ Your grace period is active
          </p>
        </div>

        <h1 style="color: #0f172a; font-size: 24px; margin-bottom: 16px;">We still haven't heard from you</h1>

        <p style="color: #475569; font-size: 16px; line-height: 1.6;">
          Hi${ownerName ? ` ${ownerName}` : ''},
        </p>

        <p style="color: #475569; font-size: 16px; line-height: 1.6;">
          You've missed your check-in deadline. Your ${gracePeriodDays}-day grace period is now active.
        </p>

        <p style="color: #475569; font-size: 16px; line-height: 1.6;">
          <strong>If we don't hear from you by ${finalDate}, your trustees will be notified</strong>
          and the release process will begin according to your settings.
        </p>

        <div style="margin: 32px 0;">
          <a href="${checkinUrl}" style="background-color: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 500;">
            I'm okay — Check in now
          </a>
        </div>

        <p style="color: #64748b; font-size: 14px; line-height: 1.6;">
          If this is a false alarm, checking in will immediately reset your status and stop the release process.
        </p>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />

        <p style="color: #94a3b8; font-size: 12px;">
          Digital Estate Vault<br />
          You're receiving this because you set up a dead man's switch with us.
        </p>
      </div>
    `,
    text: `⚠ Your grace period is active

We still haven't heard from you

Hi${ownerName ? ` ${ownerName}` : ''},

You've missed your check-in deadline. Your ${gracePeriodDays}-day grace period is now active.

If we don't hear from you by ${finalDate}, your trustees will be notified and the release process will begin according to your settings.

Check in now: ${checkinUrl}

If this is a false alarm, checking in will immediately reset your status and stop the release process.

---
Digital Estate Vault
You're receiving this because you set up a dead man's switch with us.`,
  };
}

export function getTrusteeNotifiedEmail(
  ownerName: string,
  releaseDate: string,
  cancelUrl: string
): EmailTemplate {
  return {
    subject: 'Your trustees have been notified',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
          <p style="color: #991b1b; font-weight: 500; margin: 0;">
            Your trustees have been notified
          </p>
        </div>

        <h1 style="color: #0f172a; font-size: 24px; margin-bottom: 16px;">Release process has begun</h1>

        <p style="color: #475569; font-size: 16px; line-height: 1.6;">
          Hi${ownerName ? ` ${ownerName}` : ''},
        </p>

        <p style="color: #475569; font-size: 16px; line-height: 1.6;">
          Your grace period has ended. Your designated trustees have been notified and will receive
          access to your designated assets on <strong>${releaseDate}</strong>.
        </p>

        <p style="color: #475569; font-size: 16px; line-height: 1.6;">
          <strong>If this is a mistake, you can still cancel:</strong>
        </p>

        <div style="margin: 32px 0;">
          <a href="${cancelUrl}" style="background-color: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 500;">
            I'm okay — Cancel the release
          </a>
        </div>

        <p style="color: #64748b; font-size: 14px; line-height: 1.6;">
          Canceling will immediately stop the release process, and your trustees will be notified
          that it was a false alarm.
        </p>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />

        <p style="color: #94a3b8; font-size: 12px;">
          Digital Estate Vault<br />
          You're receiving this because you set up a dead man's switch with us.
        </p>
      </div>
    `,
    text: `Your trustees have been notified

Release process has begun

Hi${ownerName ? ` ${ownerName}` : ''},

Your grace period has ended. Your designated trustees have been notified and will receive access to your designated assets on ${releaseDate}.

If this is a mistake, you can still cancel: ${cancelUrl}

Canceling will immediately stop the release process, and your trustees will be notified that it was a false alarm.

---
Digital Estate Vault
You're receiving this because you set up a dead man's switch with us.`,
  };
}

export function getTrusteeNotificationEmail(
  trusteeName: string,
  ownerName: string,
  expectedReleaseDate: string,
  portalUrl: string
): EmailTemplate {
  return {
    subject: `Important notification from ${ownerName}'s Digital Estate Vault`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #0f172a; font-size: 24px; margin-bottom: 16px;">You may soon receive access to digital assets</h1>

        <p style="color: #475569; font-size: 16px; line-height: 1.6;">
          Hi${trusteeName ? ` ${trusteeName}` : ''},
        </p>

        <p style="color: #475569; font-size: 16px; line-height: 1.6;">
          ${ownerName} designated you as a trusted contact in their Digital Estate Vault.
          We haven't been able to reach them according to their check-in schedule.
        </p>

        <p style="color: #475569; font-size: 16px; line-height: 1.6;">
          If we don't hear from them by <strong>${expectedReleaseDate}</strong>, you'll receive access
          to the digital assets they've designated for you.
        </p>

        <div style="margin: 32px 0;">
          <a href="${portalUrl}" style="background-color: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 500;">
            View your trustee portal
          </a>
        </div>

        <p style="color: #64748b; font-size: 14px; line-height: 1.6;">
          This notification is part of ${ownerName}'s pre-arranged plan. If you have concerns or
          believe this may be a false alarm, please attempt to contact them directly through other means.
        </p>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />

        <p style="color: #94a3b8; font-size: 12px;">
          Digital Estate Vault<br />
          You're receiving this because ${ownerName} designated you as a trustee.
        </p>
      </div>
    `,
    text: `You may soon receive access to digital assets

Hi${trusteeName ? ` ${trusteeName}` : ''},

${ownerName} designated you as a trusted contact in their Digital Estate Vault. We haven't been able to reach them according to their check-in schedule.

If we don't hear from them by ${expectedReleaseDate}, you'll receive access to the digital assets they've designated for you.

View your trustee portal: ${portalUrl}

This notification is part of ${ownerName}'s pre-arranged plan. If you have concerns or believe this may be a false alarm, please attempt to contact them directly through other means.

---
Digital Estate Vault
You're receiving this because ${ownerName} designated you as a trustee.`,
  };
}

export function getReleaseCompletedEmailToOwner(
  ownerName: string,
  releaseDate: string
): EmailTemplate {
  return {
    subject: 'Asset release completed',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #0f172a; font-size: 24px; margin-bottom: 16px;">Release completed</h1>

        <p style="color: #475569; font-size: 16px; line-height: 1.6;">
          Hi${ownerName ? ` ${ownerName}` : ''},
        </p>

        <p style="color: #475569; font-size: 16px; line-height: 1.6;">
          As of ${releaseDate}, your designated trustees have received access to the assets
          you allocated to them according to your pre-arranged plan.
        </p>

        <p style="color: #475569; font-size: 16px; line-height: 1.6;">
          This notification confirms the release process is complete.
        </p>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />

        <p style="color: #94a3b8; font-size: 12px;">
          Digital Estate Vault
        </p>
      </div>
    `,
    text: `Release completed

Hi${ownerName ? ` ${ownerName}` : ''},

As of ${releaseDate}, your designated trustees have received access to the assets you allocated to them according to your pre-arranged plan.

This notification confirms the release process is complete.

---
Digital Estate Vault`,
  };
}

export function getReleaseCompletedEmailToTrustee(
  trusteeName: string,
  ownerName: string,
  portalUrl: string
): EmailTemplate {
  return {
    subject: `Access granted to ${ownerName}'s digital assets`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #0f172a; font-size: 24px; margin-bottom: 16px;">You now have access to designated assets</h1>

        <p style="color: #475569; font-size: 16px; line-height: 1.6;">
          Hi${trusteeName ? ` ${trusteeName}` : ''},
        </p>

        <p style="color: #475569; font-size: 16px; line-height: 1.6;">
          As planned, you now have access to the digital assets ${ownerName} designated for you in their Digital Estate Vault.
        </p>

        <div style="margin: 32px 0;">
          <a href="${portalUrl}" style="background-color: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 500;">
            Access your assets
          </a>
        </div>

        <p style="color: #64748b; font-size: 14px; line-height: 1.6;">
          Please treat this information with appropriate care and respect.
        </p>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />

        <p style="color: #94a3b8; font-size: 12px;">
          Digital Estate Vault<br />
          You're receiving this because ${ownerName} designated you as a trustee.
        </p>
      </div>
    `,
    text: `You now have access to designated assets

Hi${trusteeName ? ` ${trusteeName}` : ''},

As planned, you now have access to the digital assets ${ownerName} designated for you in their Digital Estate Vault.

Access your assets: ${portalUrl}

Please treat this information with appropriate care and respect.

---
Digital Estate Vault
You're receiving this because ${ownerName} designated you as a trustee.`,
  };
}

export function getCancellationConfirmationEmail(
  ownerName: string,
  cancelledAt: string
): EmailTemplate {
  return {
    subject: 'Release cancelled successfully',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
          <p style="color: #065f46; font-weight: 500; margin: 0;">
            ✓ Release cancelled
          </p>
        </div>

        <h1 style="color: #0f172a; font-size: 24px; margin-bottom: 16px;">Welcome back</h1>

        <p style="color: #475569; font-size: 16px; line-height: 1.6;">
          Hi${ownerName ? ` ${ownerName}` : ''},
        </p>

        <p style="color: #475569; font-size: 16px; line-height: 1.6;">
          You've successfully cancelled the release process as of ${cancelledAt}.
          Your status has been reset to active, and your trustees have been notified that this was a false alarm.
        </p>

        <p style="color: #475569; font-size: 16px; line-height: 1.6;">
          Your next check-in is due according to your regular schedule.
        </p>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />

        <p style="color: #94a3b8; font-size: 12px;">
          Digital Estate Vault
        </p>
      </div>
    `,
    text: `✓ Release cancelled

Welcome back

Hi${ownerName ? ` ${ownerName}` : ''},

You've successfully cancelled the release process as of ${cancelledAt}. Your status has been reset to active, and your trustees have been notified that this was a false alarm.

Your next check-in is due according to your regular schedule.

---
Digital Estate Vault`,
  };
}

export function getFalseAlarmNotificationToTrustee(
  trusteeName: string,
  ownerName: string
): EmailTemplate {
  return {
    subject: `Update: ${ownerName} has checked in`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
          <p style="color: #065f46; font-weight: 500; margin: 0;">
            ✓ False alarm
          </p>
        </div>

        <h1 style="color: #0f172a; font-size: 24px; margin-bottom: 16px;">Good news</h1>

        <p style="color: #475569; font-size: 16px; line-height: 1.6;">
          Hi${trusteeName ? ` ${trusteeName}` : ''},
        </p>

        <p style="color: #475569; font-size: 16px; line-height: 1.6;">
          ${ownerName} has checked in, and the release process has been cancelled.
          No further action is needed from you at this time.
        </p>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />

        <p style="color: #94a3b8; font-size: 12px;">
          Digital Estate Vault<br />
          You're receiving this because ${ownerName} designated you as a trustee.
        </p>
      </div>
    `,
    text: `✓ False alarm — Good news

Hi${trusteeName ? ` ${trusteeName}` : ''},

${ownerName} has checked in, and the release process has been cancelled. No further action is needed from you at this time.

---
Digital Estate Vault
You're receiving this because ${ownerName} designated you as a trustee.`,
  };
}

export function getTrusteeInviteEmail(
  trusteeName: string,
  ownerName: string,
  acceptUrl: string
): EmailTemplate {
  return {
    subject: `${ownerName} has invited you to be a trustee`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #0f172a; font-size: 24px; margin-bottom: 16px;">You've been invited as a trustee</h1>

        <p style="color: #475569; font-size: 16px; line-height: 1.6;">
          Hi${trusteeName ? ` ${trusteeName}` : ''},
        </p>

        <p style="color: #475569; font-size: 16px; line-height: 1.6;">
          ${ownerName} has designated you as a trusted contact in their Digital Estate Vault.
          This means they trust you to receive access to certain digital assets if they become unreachable.
        </p>

        <div style="background-color: #f1f5f9; padding: 16px; border-radius: 8px; margin: 24px 0;">
          <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0;">
            <strong>What does this mean?</strong><br />
            You'll only receive access if ${ownerName} misses multiple scheduled check-ins over an extended period.
            This is part of their contingency planning to ensure important information reaches trusted people.
          </p>
        </div>

        <div style="margin: 32px 0;">
          <a href="${acceptUrl}" style="background-color: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 500;">
            Accept invitation
          </a>
        </div>

        <p style="color: #64748b; font-size: 14px; line-height: 1.6;">
          If you have questions about this invitation, please contact ${ownerName} directly.
        </p>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />

        <p style="color: #94a3b8; font-size: 12px;">
          Digital Estate Vault — Secure digital asset management<br />
          You're receiving this because ${ownerName} invited you to be a trustee.
        </p>
      </div>
    `,
    text: `You've been invited as a trustee

Hi${trusteeName ? ` ${trusteeName}` : ''},

${ownerName} has designated you as a trusted contact in their Digital Estate Vault. This means they trust you to receive access to certain digital assets if they become unreachable.

What does this mean?
You'll only receive access if ${ownerName} misses multiple scheduled check-ins over an extended period. This is part of their contingency planning to ensure important information reaches trusted people.

Accept invitation: ${acceptUrl}

If you have questions about this invitation, please contact ${ownerName} directly.

---
Digital Estate Vault — Secure digital asset management
You're receiving this because ${ownerName} invited you to be a trustee.`,
  };
}
