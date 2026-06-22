-- Email usage tracking table
-- Tracks email sends to prevent exceeding Resend free tier limits:
-- - 3,000 emails/month
-- - 100 emails/day

create table if not exists email_usage (
  id uuid primary key default gen_random_uuid(),
  sent_at timestamptz default now(),
  recipient_email text not null,
  email_type text not null,
  owner_id uuid references auth.users(id) on delete cascade,
  message_id text,
  success boolean not null default true,
  error_message text
);

-- Index for efficient quota queries
create index email_usage_sent_at_idx on email_usage(sent_at desc);
create index email_usage_owner_id_idx on email_usage(owner_id);

-- Function to check daily email quota
create or replace function check_daily_email_quota()
returns table(
  emails_sent_today bigint,
  limit_reached boolean,
  warning boolean
) as $$
declare
  count_today bigint;
begin
  select count(*)
  into count_today
  from email_usage
  where sent_at >= current_date
    and success = true;

  return query
  select
    count_today,
    count_today >= 100 as limit_reached,
    count_today >= 80 as warning; -- Warn at 80% of daily limit
end;
$$ language plpgsql;

-- Function to check monthly email quota
create or replace function check_monthly_email_quota()
returns table(
  emails_sent_this_month bigint,
  limit_reached boolean,
  warning boolean
) as $$
declare
  count_month bigint;
begin
  select count(*)
  into count_month
  from email_usage
  where sent_at >= date_trunc('month', current_date)
    and success = true;

  return query
  select
    count_month,
    count_month >= 3000 as limit_reached,
    count_month >= 2400 as warning; -- Warn at 80% of monthly limit
end;
$$ language plpgsql;

-- RLS policies
alter table email_usage enable row level security;

-- Only system (service role) can write email usage
create policy "system_insert_email_usage"
  on email_usage for insert
  with check (false); -- Enforces service-role-only writes

-- Owners can view their own email usage
create policy "owner_view_email_usage"
  on email_usage for select
  using (owner_id = auth.uid());

-- System can view all (for quota checks)
-- Note: Service role bypasses RLS, so this is for anon key if needed
create policy "system_view_all_email_usage"
  on email_usage for select
  using (auth.role() = 'service_role');
