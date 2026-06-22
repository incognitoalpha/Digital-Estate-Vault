import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  checkRateLimit,
  getClientIdentifier,
  RATE_LIMITS,
} from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Apply rate limiting
    const identifier = getClientIdentifier(request, user.id);
    const rateLimitResult = checkRateLimit(identifier, RATE_LIMITS.trusteeInvite);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString(),
            'Retry-After': Math.ceil(
              (rateLimitResult.reset - Date.now()) / 1000
            ).toString(),
          },
        }
      );
    }

    const { trustee_id } = await request.json();

    if (!trustee_id) {
      return NextResponse.json(
        { error: 'Missing trustee_id' },
        { status: 400 }
      );
    }

    // Get trustee details
    const { data: trustee, error: trusteeError } = await supabase
      .from('trustees')
      .select('email, name, owner_id')
      .eq('id', trustee_id)
      .eq('owner_id', user.id) // Ensure owner can only send invites for their own trustees
      .single();

    if (trusteeError || !trustee) {
      return NextResponse.json(
        { error: 'Trustee not found' },
        { status: 404 }
      );
    }

    // Get owner name
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single();

    const ownerName = profile?.display_name || user.email || 'the owner';
    const trusteeName = trustee.name || '';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const acceptUrl = `${appUrl}/trustees/accept?token=${trustee_id}`; // TODO: implement proper token-based acceptance

    // Send invitation email via Resend
    const resendKey = process.env.RESEND_API_KEY;
    const fromEmail =
      process.env.RESEND_FROM_EMAIL ||
      'Digital Estate Vault <noreply@digitalestatevault.com>';

    if (!resendKey) {
      console.error('RESEND_API_KEY not configured');
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      );
    }

    const emailTemplate = getTrusteeInviteEmail(
      trusteeName,
      ownerName,
      acceptUrl
    );

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: trustee.email,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('Resend API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to send invitation email' },
        { status: 500 }
      );
    }

    const result = await emailResponse.json();

    // Log email usage
    await supabase.from('email_usage').insert({
      recipient_email: trustee.email,
      email_type: 'trustee_invite',
      owner_id: user.id,
      message_id: result.id,
      success: true,
    });

    return NextResponse.json(
      {
        success: true,
        message_id: result.id,
      },
      {
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.reset.toString(),
        },
      }
    );
  } catch (error) {
    console.error('Send invitation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function getTrusteeInviteEmail(
  trusteeName: string,
  ownerName: string,
  acceptUrl: string
) {
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
  };
}
