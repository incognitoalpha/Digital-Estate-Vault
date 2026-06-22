import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface Owner {
  id: string;
  checkin_interval_days: number;
  grace_period_days: number;
}

interface DMSState {
  owner_id: string;
  status: string;
  last_checkin_at: string;
  state_changed_at: string;
  warning_sent_at: string | null;
  grace_period_started_at: string | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();

    // Get all users with their profiles and DMS state
    const { data: states, error: statesError } = await supabase
      .from('dead_man_switch_state')
      .select(
        `
        owner_id,
        status,
        last_checkin_at,
        state_changed_at,
        warning_sent_at,
        grace_period_started_at,
        profiles!inner(
          checkin_interval_days,
          grace_period_days
        )
      `
      )
      .in('status', ['active', 'warning_sent', 'grace_period']);

    if (statesError) {
      throw statesError;
    }

    const transitions: string[] = [];

    for (const state of states || []) {
      const profile = (state as any).profiles;
      const lastCheckin = new Date(state.last_checkin_at);
      const hoursSinceCheckin =
        (now.getTime() - lastCheckin.getTime()) / (1000 * 60 * 60);
      const daysSinceCheckin = hoursSinceCheckin / 24;

      const checkinIntervalHours = profile.checkin_interval_days * 24;
      const gracePeriodHours = profile.grace_period_days * 24;

      let newStatus = state.status;
      const updates: any = {};

      // State machine logic
      if (state.status === 'active') {
        if (daysSinceCheckin > profile.checkin_interval_days) {
          // Move to warning_sent
          newStatus = 'warning_sent';
          updates.status = newStatus;
          updates.warning_sent_at = now.toISOString();
          updates.state_changed_at = now.toISOString();
          transitions.push(`${state.owner_id}: active → warning_sent`);
        }
      } else if (state.status === 'warning_sent') {
        const warningAge = state.warning_sent_at
          ? (now.getTime() - new Date(state.warning_sent_at).getTime()) /
            (1000 * 60 * 60 * 24)
          : 0;

        if (warningAge > 3) {
          // Grace period starts 3 days after warning
          newStatus = 'grace_period';
          updates.status = newStatus;
          updates.grace_period_started_at = now.toISOString();
          updates.state_changed_at = now.toISOString();
          transitions.push(`${state.owner_id}: warning_sent → grace_period`);
        }
      } else if (state.status === 'grace_period') {
        const graceAge = state.grace_period_started_at
          ? (now.getTime() -
              new Date(state.grace_period_started_at).getTime()) /
            (1000 * 60 * 60 * 24)
          : 0;

        if (graceAge > profile.grace_period_days) {
          // Grace period expired, notify trustees
          newStatus = 'trustees_notified';
          updates.status = newStatus;
          updates.trustees_notified_at = now.toISOString();
          updates.state_changed_at = now.toISOString();
          transitions.push(
            `${state.owner_id}: grace_period → trustees_notified`
          );
        }
      }

      // Apply updates if status changed
      if (Object.keys(updates).length > 0) {
        await supabase
          .from('dead_man_switch_state')
          .update(updates)
          .eq('owner_id', state.owner_id);

        // Log release event
        await supabase.from('release_events').insert({
          owner_id: state.owner_id,
          event_type: `state_transition_${newStatus}`,
          details: {
            from: state.status,
            to: newStatus,
            timestamp: now.toISOString(),
          },
        });

        // Log audit entry
        await supabase.from('audit_log').insert({
          actor_role: 'system',
          action: 'state_transition',
          target_table: 'dead_man_switch_state',
          target_id: state.owner_id,
          metadata: {
            from: state.status,
            to: newStatus,
          },
        });

        // Trigger notification via escalation-notifier
        try {
          const notifierUrl = `${supabaseUrl}/functions/v1/escalation-notifier`;
          const notifierResponse = await fetch(notifierUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              owner_id: state.owner_id,
              event_type: newStatus,
            }),
          });

          if (!notifierResponse.ok) {
            console.error(
              `Failed to send notification for ${state.owner_id}:`,
              await notifierResponse.text()
            );
          }
        } catch (notifyError) {
          console.error('Notification error:', notifyError);
          // Continue processing other states even if notification fails
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        scanned: states?.length || 0,
        transitions: transitions.length,
        details: transitions,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
