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

    // Apply rate limiting per user
    const identifier = getClientIdentifier(request, user.id);
    const rateLimitResult = checkRateLimit(identifier, RATE_LIMITS.checkin);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Too many check-in attempts. Please try again later.',
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

    // Insert check-in record
    const { error: checkinError } = await supabase.from('checkins').insert({
      owner_id: user.id,
      method: 'app',
    });

    if (checkinError) {
      console.error('Check-in insert error:', checkinError);
      return NextResponse.json(
        { error: 'Failed to record check-in' },
        { status: 500 }
      );
    }

    // Update dead man's switch state
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('dead_man_switch_state')
      .update({
        status: 'active',
        last_checkin_at: now,
        state_changed_at: now,
      })
      .eq('owner_id', user.id);

    if (updateError) {
      console.error('DMS state update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update status' },
        { status: 500 }
      );
    }

    // Log audit entry
    await supabase.from('audit_log').insert({
      actor_id: user.id,
      actor_role: 'owner',
      action: 'checkin_performed',
      target_table: 'checkins',
    });

    return NextResponse.json(
      {
        success: true,
        checkedInAt: now,
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
    console.error('Check-in error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
