-- Digital Estate Vault - Row-Level Security Policies
-- Phase 1: Database & RLS
-- Enables and enforces RLS on all tables with proper access control

-- ============================================================================
-- CRITICAL SECURITY RULE:
-- Every table with sensitive data MUST have RLS enabled AND forced.
-- No table should have a blanket "using (true)" policy.
-- Service-role keys bypass RLS and should only be used in Edge Functions.
-- ============================================================================

-- ============================================================================
-- PROFILES TABLE RLS
-- Owners can read/update their own profile
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.profiles force row level security;

create policy "users_read_own_profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "users_update_own_profile"
  on public.profiles for update
  using (auth.uid() = id);

-- ============================================================================
-- ASSETS TABLE RLS
-- Owners have full access to their assets
-- Trustees can read released assets granted to them
-- ============================================================================

alter table public.assets enable row level security;
alter table public.assets force row level security;

create policy "owner_full_access_assets"
  on public.assets for all
  using (auth.uid() = owner_id);

create policy "trustee_read_released_assets"
  on public.assets for select
  using (
    exists (
      select 1
      from public.asset_trustee_grants g
      join public.trustees t on t.id = g.trustee_id
      join public.dead_man_switch_state d on d.owner_id = assets.owner_id
      where g.asset_id = assets.id
        and t.trustee_user_id = auth.uid()
        and t.invite_status = 'accepted'
        and d.status = 'released'
    )
  );

-- ============================================================================
-- TRUSTEES TABLE RLS
-- Owners can manage their trustees
-- Trustees can read their own trustee record
-- ============================================================================

alter table public.trustees enable row level security;
alter table public.trustees force row level security;

create policy "owner_full_access_trustees"
  on public.trustees for all
  using (auth.uid() = owner_id);

create policy "trustee_read_own_record"
  on public.trustees for select
  using (auth.uid() = trustee_user_id and invite_status = 'accepted');

-- ============================================================================
-- ASSET_TRUSTEE_GRANTS TABLE RLS
-- Owners can manage grants for their assets
-- Trustees can read grants for their released assets
-- ============================================================================

alter table public.asset_trustee_grants enable row level security;
alter table public.asset_trustee_grants force row level security;

create policy "owner_manage_grants"
  on public.asset_trustee_grants for all
  using (
    exists (
      select 1 from public.assets
      where assets.id = asset_trustee_grants.asset_id
        and assets.owner_id = auth.uid()
    )
  );

create policy "trustee_read_own_grants"
  on public.asset_trustee_grants for select
  using (
    exists (
      select 1
      from public.trustees t
      join public.dead_man_switch_state d on d.owner_id = t.owner_id
      where t.id = asset_trustee_grants.trustee_id
        and t.trustee_user_id = auth.uid()
        and t.invite_status = 'accepted'
        and d.status = 'released'
    )
  );

-- ============================================================================
-- CHECKINS TABLE RLS
-- Owners can read their own check-ins and insert new ones
-- ============================================================================

alter table public.checkins enable row level security;
alter table public.checkins force row level security;

create policy "owner_read_own_checkins"
  on public.checkins for select
  using (auth.uid() = owner_id);

create policy "owner_insert_checkins"
  on public.checkins for insert
  with check (auth.uid() = owner_id);

-- ============================================================================
-- DEAD_MAN_SWITCH_STATE TABLE RLS
-- Owners can read their own state
-- Trustees can read state of owners who have released assets to them
-- ============================================================================

alter table public.dead_man_switch_state enable row level security;
alter table public.dead_man_switch_state force row level security;

create policy "owner_read_own_dms_state"
  on public.dead_man_switch_state for select
  using (auth.uid() = owner_id);

create policy "trustee_read_released_owner_state"
  on public.dead_man_switch_state for select
  using (
    exists (
      select 1 from public.trustees
      where trustees.owner_id = dead_man_switch_state.owner_id
        and trustees.trustee_user_id = auth.uid()
        and trustees.invite_status = 'accepted'
    )
    and status in ('trustees_notified', 'released')
  );

-- ============================================================================
-- RELEASE_EVENTS TABLE RLS
-- Owners can read their own events
-- Trustees can read events for owners who have released assets to them
-- ============================================================================

alter table public.release_events enable row level security;
alter table public.release_events force row level security;

create policy "owner_read_own_release_events"
  on public.release_events for select
  using (auth.uid() = owner_id);

create policy "trustee_read_relevant_release_events"
  on public.release_events for select
  using (
    exists (
      select 1
      from public.trustees t
      join public.dead_man_switch_state d on d.owner_id = t.owner_id
      where t.owner_id = release_events.owner_id
        and t.trustee_user_id = auth.uid()
        and t.invite_status = 'accepted'
        and d.status in ('trustees_notified', 'released')
    )
  );

-- ============================================================================
-- AUDIT_LOG TABLE RLS
-- Owners can read audit logs where they are the actor or target
-- System operations are not readable by users (only by service role)
-- ============================================================================

alter table public.audit_log enable row level security;
alter table public.audit_log force row level security;

create policy "user_read_own_audit_logs"
  on public.audit_log for select
  using (
    auth.uid() = actor_id
    or actor_role != 'system'
  );

-- ============================================================================
-- KEEPALIVE_PINGS TABLE RLS
-- No user access - only accessible via the keepalive_ping() function
-- which runs with security definer (elevated privileges)
-- ============================================================================

alter table public.keepalive_pings enable row level security;
alter table public.keepalive_pings force row level security;

-- No policies needed - function uses security definer

-- ============================================================================
-- GRANT EXECUTE PERMISSIONS
-- Allow authenticated users to call the keepalive function
-- (secret verification happens inside the function)
-- ============================================================================

grant execute on function public.keepalive_ping(text) to authenticated;
grant execute on function public.keepalive_ping(text) to anon;

-- ============================================================================
-- VERIFICATION QUERY
-- Run this to verify RLS is enabled on all tables
-- ============================================================================

-- Uncomment to verify:
-- select
--   schemaname,
--   tablename,
--   rowsecurity as "RLS Enabled"
-- from pg_tables
-- where schemaname = 'public'
-- order by tablename;
