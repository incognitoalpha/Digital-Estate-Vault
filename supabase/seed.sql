-- Digital Estate Vault - Development Seed Data
-- Phase 1: Database & RLS
-- Creates sample data for local development and testing

-- ============================================================================
-- IMPORTANT: This seed data is for DEVELOPMENT ONLY
-- Never run this on production!
-- ============================================================================

-- This script assumes you've already created test users via Supabase Auth.
-- Replace the UUIDs below with actual user IDs from your auth.users table.

-- ============================================================================
-- CONFIGURATION
-- Replace these with your actual test user UUIDs
-- ============================================================================

do $$
declare
  owner_alice_id uuid := '11111111-1111-1111-1111-111111111111'; -- Replace with actual UUID
  owner_bob_id uuid := '22222222-2222-2222-2222-222222222222';   -- Replace with actual UUID
  trustee_charlie_id uuid := '33333333-3333-3333-3333-333333333333'; -- Replace with actual UUID
  trustee_diana_id uuid := '44444444-4444-4444-4444-444444444444';   -- Replace with actual UUID

  alice_asset_1 uuid;
  alice_asset_2 uuid;
  alice_asset_3 uuid;
  bob_asset_1 uuid;

  trustee_charlie uuid;
  trustee_diana uuid;
begin

  -- ============================================================================
  -- PROFILES
  -- Assume these are auto-created via trigger when users sign up
  -- Just update them with meaningful data
  -- ============================================================================

  update public.profiles
  set
    display_name = 'Alice Owner',
    checkin_interval_days = 14,
    grace_period_days = 7,
    vault_salt = 'YWxpY2Utc2FsdA==' -- base64 encoded "alice-salt" for demo
  where id = owner_alice_id;

  update public.profiles
  set
    display_name = 'Bob Owner',
    checkin_interval_days = 30,
    grace_period_days = 14,
    vault_salt = 'Ym9iLXNhbHQ=' -- base64 encoded "bob-salt" for demo
  where id = owner_bob_id;

  -- ============================================================================
  -- ASSETS
  -- Pre-encrypted with a known passphrase for testing
  -- ============================================================================

  -- Alice's assets
  insert into public.assets (id, owner_id, category, title, ciphertext, iv)
  values
    (
      uuid_generate_v4(),
      owner_alice_id,
      'account',
      'Gmail Account',
      'ZGVtby1jaXBoZXJ0ZXh0LWdtYWls', -- demo ciphertext (base64)
      'ZGVtby1pdg==' -- demo IV (base64)
    ),
    (
      uuid_generate_v4(),
      owner_alice_id,
      'crypto_wallet',
      'Bitcoin Wallet',
      'ZGVtby1jaXBoZXJ0ZXh0LWJ0Yw==',
      'ZGVtby1pdg=='
    ),
    (
      uuid_generate_v4(),
      owner_alice_id,
      'note',
      'Safe Combination',
      'ZGVtby1jaXBoZXJ0ZXh0LXNhZmU=',
      'ZGVtby1pdg=='
    )
  returning id into alice_asset_1;

  -- Bob's assets
  insert into public.assets (id, owner_id, category, title, ciphertext, iv)
  values
    (
      uuid_generate_v4(),
      owner_bob_id,
      'cloud_doc',
      'Estate Documents',
      'ZGVtby1jaXBoZXJ0ZXh0LWRvY3M=',
      'ZGVtby1pdg=='
    )
  returning id into bob_asset_1;

  -- Store some asset IDs for grant creation
  select id into alice_asset_1 from public.assets where owner_id = owner_alice_id and category = 'account' limit 1;
  select id into alice_asset_2 from public.assets where owner_id = owner_alice_id and category = 'crypto_wallet' limit 1;
  select id into alice_asset_3 from public.assets where owner_id = owner_alice_id and category = 'note' limit 1;

  -- ============================================================================
  -- TRUSTEES
  -- Alice has invited Charlie and Diana
  -- ============================================================================

  insert into public.trustees (id, owner_id, trustee_user_id, email, name, invite_status)
  values
    (
      uuid_generate_v4(),
      owner_alice_id,
      trustee_charlie_id,
      'charlie@example.com',
      'Charlie Trustee',
      'accepted'
    ),
    (
      uuid_generate_v4(),
      owner_alice_id,
      trustee_diana_id,
      'diana@example.com',
      'Diana Trustee',
      'accepted'
    )
  returning id into trustee_charlie;

  -- Get trustee IDs for grant creation
  select id into trustee_charlie from public.trustees where owner_id = owner_alice_id and email = 'charlie@example.com';
  select id into trustee_diana from public.trustees where owner_id = owner_alice_id and email = 'diana@example.com';

  -- ============================================================================
  -- ASSET GRANTS
  -- Alice grants different assets to her trustees
  -- ============================================================================

  -- Charlie gets access to Gmail and Bitcoin wallet
  insert into public.asset_trustee_grants (asset_id, trustee_id, release_mode)
  values
    (alice_asset_1, trustee_charlie, 'on_trigger'),
    (alice_asset_2, trustee_charlie, 'on_trigger');

  -- Diana gets access to all three assets
  insert into public.asset_trustee_grants (asset_id, trustee_id, release_mode)
  values
    (alice_asset_1, trustee_diana, 'on_trigger'),
    (alice_asset_2, trustee_diana, 'on_trigger'),
    (alice_asset_3, trustee_diana, 'on_trigger');

  -- ============================================================================
  -- CHECK-INS
  -- Alice has recent check-ins, Bob hasn't checked in for a while
  -- ============================================================================

  insert into public.checkins (owner_id, checked_in_at, method)
  values
    (owner_alice_id, now() - interval '2 days', 'app'),
    (owner_alice_id, now() - interval '16 days', 'app'),
    (owner_alice_id, now() - interval '30 days', 'email_link'),
    (owner_bob_id, now() - interval '45 days', 'app');

  -- ============================================================================
  -- DEAD MAN'S SWITCH STATE
  -- Alice is active, Bob is in grace period
  -- ============================================================================

  update public.dead_man_switch_state
  set
    status = 'active',
    last_checkin_at = now() - interval '2 days',
    state_changed_at = now() - interval '2 days'
  where owner_id = owner_alice_id;

  update public.dead_man_switch_state
  set
    status = 'grace_period',
    last_checkin_at = now() - interval '45 days',
    state_changed_at = now() - interval '10 days',
    warning_sent_at = now() - interval '15 days',
    grace_period_started_at = now() - interval '10 days'
  where owner_id = owner_bob_id;

  -- ============================================================================
  -- RELEASE EVENTS
  -- Bob has some escalation events
  -- ============================================================================

  insert into public.release_events (owner_id, event_type, details)
  values
    (
      owner_bob_id,
      'warning_sent',
      jsonb_build_object('sent_at', now() - interval '15 days', 'method', 'email')
    ),
    (
      owner_bob_id,
      'grace_started',
      jsonb_build_object('started_at', now() - interval '10 days')
    );

  -- ============================================================================
  -- AUDIT LOG
  -- Some sample audit entries
  -- ============================================================================

  insert into public.audit_log (actor_id, actor_role, action, target_table, target_id)
  values
    (owner_alice_id, 'owner', 'asset_created', 'assets', alice_asset_1),
    (owner_alice_id, 'owner', 'trustee_invited', 'trustees', trustee_charlie),
    (trustee_charlie_id, 'trustee', 'invitation_accepted', 'trustees', trustee_charlie),
    (owner_bob_id, 'owner', 'checkin_performed', 'checkins', null),
    (null, 'system', 'warning_sent', 'dead_man_switch_state', owner_bob_id);

  raise notice 'Seed data created successfully!';
  raise notice 'Alice (%) - Active, 3 assets, 2 trustees', owner_alice_id;
  raise notice 'Bob (%) - Grace period, 1 asset', owner_bob_id;
  raise notice 'Charlie (%) - Trustee for Alice', trustee_charlie_id;
  raise notice 'Diana (%) - Trustee for Alice', trustee_diana_id;

end $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- Run these to verify seed data was created correctly
-- ============================================================================

-- Check profiles
select id, display_name, checkin_interval_days, grace_period_days
from public.profiles
order by display_name;

-- Check assets
select a.title, a.category, p.display_name as owner
from public.assets a
join public.profiles p on p.id = a.owner_id
order by p.display_name, a.title;

-- Check trustees
select t.name, t.email, t.invite_status, p.display_name as owner
from public.trustees t
join public.profiles p on p.id = t.owner_id
order by p.display_name, t.name;

-- Check grants
select
  p.display_name as owner,
  a.title as asset,
  t.name as trustee,
  g.release_mode
from public.asset_trustee_grants g
join public.assets a on a.id = g.asset_id
join public.trustees t on t.id = g.trustee_id
join public.profiles p on p.id = a.owner_id
order by p.display_name, t.name, a.title;

-- Check dead man's switch state
select p.display_name, d.status, d.last_checkin_at, d.state_changed_at
from public.dead_man_switch_state d
join public.profiles p on p.id = d.owner_id
order by p.display_name;
