-- Digital Estate Vault - Initial Schema Migration
-- Phase 1: Database & RLS
-- Creates all core tables with Row-Level Security enabled

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================================
-- PROFILES TABLE
-- Extends auth.users with vault-specific settings
-- ============================================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  checkin_interval_days int not null default 14 check (checkin_interval_days > 0),
  grace_period_days int not null default 7 check (grace_period_days > 0),
  vault_salt text, -- base64-encoded salt for vault key derivation
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- ASSETS TABLE
-- Stores encrypted asset records (accounts, crypto wallets, documents, notes)
-- ============================================================================

create table public.assets (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('account', 'crypto_wallet', 'cloud_doc', 'note', 'other')),
  title text not null,
  ciphertext text not null,  -- AES-GCM encrypted payload (base64)
  iv text not null,           -- initialization vector (base64), non-secret
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_assets_owner on public.assets(owner_id);
create index idx_assets_category on public.assets(category);

-- ============================================================================
-- TRUSTEES TABLE
-- People designated by the owner to receive asset access upon release
-- ============================================================================

create table public.trustees (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  trustee_user_id uuid references auth.users(id), -- null until they accept invite
  email text not null,
  name text,
  invite_status text not null default 'pending' check (invite_status in ('pending', 'accepted', 'revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_trustees_owner on public.trustees(owner_id);
create index idx_trustees_user on public.trustees(trustee_user_id);
create index idx_trustees_email on public.trustees(email);

-- ============================================================================
-- ASSET_TRUSTEE_GRANTS TABLE
-- Many-to-many: which trustee can access which asset, and under what conditions
-- ============================================================================

create table public.asset_trustee_grants (
  id uuid primary key default uuid_generate_v4(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  trustee_id uuid not null references public.trustees(id) on delete cascade,
  release_mode text not null default 'on_trigger' check (release_mode in ('on_trigger', 'immediate', 'requires_quorum')),
  quorum_required int default 1 check (quorum_required > 0),
  created_at timestamptz not null default now(),
  unique (asset_id, trustee_id)
);

create index idx_grants_asset on public.asset_trustee_grants(asset_id);
create index idx_grants_trustee on public.asset_trustee_grants(trustee_id);

-- ============================================================================
-- CHECKINS TABLE
-- Append-only log of owner check-in events
-- ============================================================================

create table public.checkins (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  method text default 'app' check (method in ('app', 'email_link', 'sms_reply'))
);

create index idx_checkins_owner on public.checkins(owner_id);
create index idx_checkins_timestamp on public.checkins(checked_in_at desc);

-- ============================================================================
-- DEAD_MAN_SWITCH_STATE TABLE
-- Current state machine status per owner
-- ============================================================================

create table public.dead_man_switch_state (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'active'
    check (status in ('active', 'warning_sent', 'grace_period', 'trustees_notified', 'released', 'cancelled')),
  last_checkin_at timestamptz not null default now(),
  state_changed_at timestamptz not null default now(),
  warning_sent_at timestamptz,
  grace_period_started_at timestamptz,
  trustees_notified_at timestamptz,
  released_at timestamptz
);

create index idx_dms_status on public.dead_man_switch_state(status);
create index idx_dms_last_checkin on public.dead_man_switch_state(last_checkin_at);

-- ============================================================================
-- RELEASE_EVENTS TABLE
-- Append-only audit trail of escalation/release/cancel actions
-- ============================================================================

create table public.release_events (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null, -- 'warning_sent', 'grace_started', 'trustee_notified', 'asset_released', 'cancelled'
  details jsonb,
  created_at timestamptz not null default now()
);

create index idx_release_events_owner on public.release_events(owner_id);
create index idx_release_events_type on public.release_events(event_type);
create index idx_release_events_timestamp on public.release_events(created_at desc);

-- ============================================================================
-- AUDIT_LOG TABLE
-- Append-only log of all sensitive reads/writes
-- ============================================================================

create table public.audit_log (
  id uuid primary key default uuid_generate_v4(),
  actor_id uuid,
  actor_role text check (actor_role in ('owner', 'trustee', 'system')),
  action text not null,
  target_table text,
  target_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index idx_audit_actor on public.audit_log(actor_id);
create index idx_audit_timestamp on public.audit_log(created_at desc);
create index idx_audit_action on public.audit_log(action);

-- ============================================================================
-- KEEPALIVE_PINGS TABLE
-- Tracks keep-alive pings to prevent Supabase auto-pause
-- This table is intentionally separate from check-ins
-- ============================================================================

create table public.keepalive_pings (
  id uuid primary key default uuid_generate_v4(),
  pinged_at timestamptz not null default now()
);

create index idx_keepalive_timestamp on public.keepalive_pings(pinged_at desc);

-- ============================================================================
-- TRIGGERS
-- Auto-update timestamps
-- ============================================================================

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger assets_updated_at before update on public.assets
  for each row execute function public.handle_updated_at();

create trigger trustees_updated_at before update on public.trustees
  for each row execute function public.handle_updated_at();

-- ============================================================================
-- FUNCTIONS
-- Keep-alive ping function (called by GitHub Actions)
-- ============================================================================

create or replace function public.keepalive_ping(secret text)
returns json as $$
declare
  expected_secret text;
begin
  -- Verify secret to prevent unauthorized pings
  expected_secret := current_setting('app.keepalive_secret', true);

  if secret is null or secret != expected_secret then
    raise exception 'Invalid keepalive secret';
  end if;

  -- Insert ping record (just to create DB activity)
  insert into public.keepalive_pings (pinged_at) values (now());

  -- Clean up old pings (keep only last 30 days)
  delete from public.keepalive_pings
  where pinged_at < now() - interval '30 days';

  return json_build_object(
    'success', true,
    'timestamp', now()
  );
end;
$$ language plpgsql security definer;

-- ============================================================================
-- INITIAL DATA
-- Create profiles row when user signs up
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.email);

  insert into public.dead_man_switch_state (owner_id)
  values (new.id);

  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
