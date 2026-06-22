# Supabase Edge Functions

This directory contains Deno-based Edge Functions that run on Supabase's infrastructure.

## Functions

### checkin-scanner

**Path:** `supabase/functions/checkin-scanner/index.ts`

**Purpose:** Scans all users' check-in status and triggers state machine transitions.

**Trigger:** Runs via `pg_cron` every 15 minutes.

**State Machine Logic:**
- `active` → `warning_sent`: After check-in interval exceeded
- `warning_sent` → `grace_period`: 3 days after warning sent
- `grace_period` → `trustees_notified`: After grace period days exceeded

**Setup:**
```sql
-- Add pg_cron job in Supabase SQL editor
SELECT cron.schedule(
  'checkin-scanner',
  '*/15 * * * *',  -- Every 15 minutes
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT.supabase.co/functions/v1/checkin-scanner',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  );
  $$
);
```

### escalation-notifier

**Path:** `supabase/functions/escalation-notifier/index.ts`

**Purpose:** Sends email notifications at each state transition.

**Trigger:** Called by `checkin-scanner` when state changes.

**Notifications:**
- `warning_sent`: Reminder email to owner
- `grace_period`: Grace period notice to owner
- `trustees_notified`: Alert to owner + notification to all accepted trustees

**Setup:**
Requires `RESEND_API_KEY` environment variable set in Supabase Edge Functions.

## Deployment

Deploy Edge Functions to Supabase:

```bash
# Deploy checkin-scanner
supabase functions deploy checkin-scanner

# Deploy escalation-notifier
supabase functions deploy escalation-notifier

# Set environment variables
supabase secrets set RESEND_API_KEY=your_resend_api_key
supabase secrets set APP_URL=https://your-app.vercel.app
```

## Local Development

```bash
# Start Supabase locally
supabase start

# Serve function locally
supabase functions serve checkin-scanner --env-file .env.local

# Test function
curl -X POST http://localhost:54321/functions/v1/checkin-scanner \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

## Testing

Edge Functions are excluded from the Next.js TypeScript compilation (see `tsconfig.json`). They run in Deno, not Node.js.

To type-check Edge Functions separately:
```bash
cd supabase/functions/checkin-scanner
deno check index.ts
```

## Notes

- Edge Functions use Deno runtime, not Node.js
- They import from `https://esm.sh/` CDN
- Service role key is available in the function environment
- CORS headers are included for browser access if needed
