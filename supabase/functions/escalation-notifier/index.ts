import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

// Email template helper functions
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getCheckinReminderEmail(
  ownerName: string,
  daysOverdue: number,
  checkinUrl: string
) {
  return {
    subject: 'Time to check in with Digital Estate Vault',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #0f172a; font-size: 24px; margin-bottom: 16px;">It's time to check in</h1>
        <p style="color: #475569; font-size: 16px; line-height: 1.6;">Hi${ownerName ? ` ${ownerName}` : ''},</p>
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
  };
}

function getMissedCheckinWarningEmail(
  ownerName: string,
  gracePeriodDays: number,
  finalDate: string,
  checkinUrl: string
) {
  return {
    subject: 'Urgent: Please check in with Digital Estate Vault',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
          <p style="color: #92400e; font-weight: 500; margin: 0;">⚠ Your grace period is active</p>
        </div>
        <h1 style="color: #0f172a; font-size: 24px; margin-bottom: 16px;">We still haven't heard from you</h1>
        <p style="color: #475569; font-size: 16px; line-height: 1.6;">Hi${ownerName ? ` ${ownerName}` : ''},</p>
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
  };
}

function getTrusteeNotifiedEmail(
  ownerName: string,
  releaseDate: string,
  cancelUrl: string
) {
  return {
    subject: 'Your trustees have been notified',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
          <p style="color: #991b1b; font-weight: 500; margin: 0;">Your trustees have been notified</p>
        </div>
        <h1 style="color: #0f172a; font-size: 24px; margin-bottom: 16px;">Release process has begun</h1>
        <p style="color: #475569; font-size: 16px; line-height: 1.6;">Hi${ownerName ? ` ${ownerName}` : ''},</p>
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
  };
}

function getTrusteeNotificationEmail(
  trusteeName: string,
  ownerName: string,
  expectedReleaseDate: string,
  portalUrl: string
) {
  return {
    subject: `Important notification from ${ownerName}'s Digital Estate Vault`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #0f172a; font-size: 24px; margin-bottom: 16px;">You may soon receive access to digital assets</h1>
        <p style="color: #475569; font-size: 16px; line-height: 1.6;">Hi${trusteeName ? ` ${trusteeName}` : ''},</p>
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
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { owner_id, event_type } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendKey = Deno.env.get('RESEND_API_KEY')!;
    const fromEmail =
      Deno.env.get('RESEND_FROM_EMAIL') ||
      'Digital Estate Vault <noreply@digitalestatevault.com>';
    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:3000';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get owner profile and email
    const { data: owner } = await supabase
      .from('profiles')
      .select('display_name, checkin_interval_days, grace_period_days')
      .eq('id', owner_id)
      .single();

    const { data: user } = await supabase.auth.admin.getUserById(owner_id);

    if (!user?.user?.email) {
      throw new Error('Owner email not found');
    }

    const ownerEmail = user.user.email;
    const ownerName = owner?.display_name || '';

    const checkinUrl = `${appUrl}/dashboard`;
    const cancelUrl = `${appUrl}/dashboard`;
    const portalUrl = `${appUrl}/portal`;

    let ownerEmailTemplate: { subject: string; html: string } | null = null;
    const trusteeEmails: Array<{ to: string; subject: string; html: string }> =
      [];

    // Calculate dates for templates
    const now = new Date();
    const gracePeriodDays = owner?.grace_period_days || 7;
    const finalDate = new Date(now);
    finalDate.setDate(finalDate.getDate() + gracePeriodDays);
    const releaseDate = new Date(now);
    releaseDate.setDate(releaseDate.getDate() + 3); // 3 days after trustee notification

    switch (event_type) {
      case 'warning_sent': {
        const daysOverdue = owner?.checkin_interval_days || 14;
        ownerEmailTemplate = getCheckinReminderEmail(
          ownerName,
          daysOverdue,
          checkinUrl
        );
        break;
      }

      case 'grace_period': {
        ownerEmailTemplate = getMissedCheckinWarningEmail(
          ownerName,
          gracePeriodDays,
          formatDate(finalDate),
          checkinUrl
        );
        break;
      }

      case 'trustees_notified': {
        ownerEmailTemplate = getTrusteeNotifiedEmail(
          ownerName,
          formatDate(releaseDate),
          cancelUrl
        );

        // Notify all accepted trustees
        const { data: trustees } = await supabase
          .from('trustees')
          .select('email, name')
          .eq('owner_id', owner_id)
          .eq('invite_status', 'accepted');

        for (const trustee of trustees || []) {
          const template = getTrusteeNotificationEmail(
            trustee.name || '',
            ownerName || 'the owner',
            formatDate(releaseDate),
            portalUrl
          );
          trusteeEmails.push({
            to: trustee.email,
            subject: template.subject,
            html: template.html,
          });
        }
        break;
      }

      default:
        throw new Error(`Unknown event type: ${event_type}`);
    }

    // Send email to owner
    if (ownerEmailTemplate) {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: fromEmail,
          to: ownerEmail,
          subject: ownerEmailTemplate.subject,
          html: ownerEmailTemplate.html,
        }),
      });

      if (!emailResponse.ok) {
        const errorText = await emailResponse.text();
        await supabase.from('email_usage').insert({
          recipient_email: ownerEmail,
          email_type: event_type,
          owner_id: owner_id,
          success: false,
          error_message: errorText,
        });
        throw new Error(`Failed to send owner email: ${errorText}`);
      }

      const emailResult = await emailResponse.json();

      // Log successful email send
      await supabase.from('email_usage').insert({
        recipient_email: ownerEmail,
        email_type: event_type,
        owner_id: owner_id,
        message_id: emailResult.id,
        success: true,
      });
    }

    // Send emails to trustees
    for (const email of trusteeEmails) {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: fromEmail,
          to: email.to,
          subject: email.subject,
          html: email.html,
        }),
      });

      if (!emailResponse.ok) {
        const errorText = await emailResponse.text();
        console.error(
          `Failed to send trustee email to ${email.to}:`,
          errorText
        );
        await supabase.from('email_usage').insert({
          recipient_email: email.to,
          email_type: `${event_type}_trustee`,
          owner_id: owner_id,
          success: false,
          error_message: errorText,
        });
        // Continue with other emails even if one fails
      } else {
        const emailResult = await emailResponse.json();
        await supabase.from('email_usage').insert({
          recipient_email: email.to,
          email_type: `${event_type}_trustee`,
          owner_id: owner_id,
          message_id: emailResult.id,
          success: true,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        event_type,
        owner_id,
        emails_sent: 1 + trusteeEmails.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Escalation notifier error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
