-- Digital Estate Vault - RLS Policy Tests
-- Phase 1: Database & RLS
-- Tests that attempt cross-user access and verify denial

-- ============================================================================
-- TEST SETUP
-- This script should be run with pgTAP or manually verified
-- ============================================================================

-- Test user setup (run these as service role to create test users)
-- In practice, these would be created through Supabase Auth signup

-- For manual testing:
-- 1. Create two test users via Supabase Auth dashboard or API
-- 2. Note their UUIDs
-- 3. Replace the UUIDs in the test queries below
-- 4. Run each test query as the respective user

-- ============================================================================
-- SEC-1: User A queries assets for a row owned by User B
-- Expected: 0 rows returned
-- ============================================================================

-- Run as User A (replace with actual User A UUID)
-- Should return 0 rows even though User B has assets
-- SELECT * FROM public.assets WHERE owner_id = '<user_b_uuid>';

-- ============================================================================
-- SEC-2: User A attempts update/delete on User B's asset
-- Expected: Denied (no rows affected)
-- ============================================================================

-- Run as User A
-- Should affect 0 rows
-- UPDATE public.assets SET title = 'hacked' WHERE owner_id = '<user_b_uuid>';
-- DELETE FROM public.assets WHERE owner_id = '<user_b_uuid>';

-- ============================================================================
-- SEC-3: Trustee queries asset granted to them while status != 'released'
-- Expected: 0 rows returned
-- ============================================================================

-- Setup: Owner creates asset, grants to trustee, but status is 'active'
-- Run as Trustee
-- SELECT a.* FROM public.assets a
-- JOIN public.asset_trustee_grants g ON g.asset_id = a.id
-- JOIN public.trustees t ON t.id = g.trustee_id
-- WHERE t.trustee_user_id = auth.uid();
-- Should return 0 rows if dead_man_switch_state.status != 'released'

-- ============================================================================
-- SEC-4: Trustee queries asset after status = 'released'
-- Expected: Row returned, but ciphertext still requires decryption key
-- ============================================================================

-- Setup: Set dead_man_switch_state.status = 'released' for owner
-- Run as Trustee
-- SELECT a.* FROM public.assets a
-- JOIN public.asset_trustee_grants g ON g.asset_id = a.id
-- JOIN public.trustees t ON t.id = g.trustee_id
-- WHERE t.trustee_user_id = auth.uid();
-- Should return rows, but ciphertext is still encrypted

-- ============================================================================
-- SEC-5: Trustee queries asset NOT granted to them, even after release
-- Expected: 0 rows returned
-- ============================================================================

-- Setup: Owner has multiple assets, only some granted to trustee
-- Even with status = 'released', trustee should only see granted assets
-- Run as Trustee
-- SELECT * FROM public.assets WHERE owner_id = '<owner_uuid>';
-- Should only return assets with matching grants

-- ============================================================================
-- SEC-6: Anonymous (unauthenticated) request to any table
-- Expected: Denied
-- ============================================================================

-- Run without auth token
-- SELECT * FROM public.assets;
-- SELECT * FROM public.profiles;
-- SELECT * FROM public.trustees;
-- All should return 0 rows or be denied

-- ============================================================================
-- SEC-7: Revoked trustee attempts read
-- Expected: 0 rows returned
-- ============================================================================

-- Setup: Owner revokes trustee (invite_status = 'revoked')
-- Run as revoked Trustee
-- SELECT a.* FROM public.assets a
-- JOIN public.asset_trustee_grants g ON g.asset_id = a.id
-- JOIN public.trustees t ON t.id = g.trustee_id
-- WHERE t.trustee_user_id = auth.uid();
-- Should return 0 rows (invite_status check in policy)

-- ============================================================================
-- SEC-8: Service role key not exposed to frontend
-- Expected: Static check - key not in client bundle
-- ============================================================================

-- This is checked during build/deployment:
-- 1. Build the Next.js app: npm run build
-- 2. Search the .next output for SUPABASE_SERVICE_ROLE_KEY
-- 3. Should NOT appear in any client-side bundles
-- 4. Only NEXT_PUBLIC_SUPABASE_ANON_KEY should be in client bundles

-- ============================================================================
-- AUTOMATED TEST FUNCTIONS (pgTAP style)
-- These can be run with pgTAP for automated testing
-- ============================================================================

create or replace function test_rls_owner_isolation()
returns void as $$
declare
  user_a_id uuid := '00000000-0000-0000-0000-000000000001'; -- Example UUID
  user_b_id uuid := '00000000-0000-0000-0000-000000000002'; -- Example UUID
  asset_count int;
begin
  -- This is a template - actual implementation requires pgTAP
  -- and proper test user creation via auth.users

  -- Test 1: User A cannot see User B's assets
  set local role authenticated;
  set local request.jwt.claims to json_build_object('sub', user_a_id)::text;

  select count(*) into asset_count
  from public.assets
  where owner_id = user_b_id;

  if asset_count != 0 then
    raise exception 'FAIL: User A can see User B assets (expected 0, got %)', asset_count;
  end if;

  raise notice 'PASS: RLS owner isolation works';
end;
$$ language plpgsql;

-- ============================================================================
-- MANUAL VERIFICATION CHECKLIST
-- ============================================================================

-- [ ] Create two test users via Supabase Auth
-- [ ] User A creates an asset
-- [ ] User B attempts to read User A's asset (should fail)
-- [ ] User B attempts to update User A's asset (should fail)
-- [ ] Owner creates trustee invitation
-- [ ] Trustee accepts invitation
-- [ ] Trustee attempts to read assets while status = 'active' (should fail)
-- [ ] Set owner's dead_man_switch_state.status = 'released'
-- [ ] Trustee can now read granted assets (should succeed)
-- [ ] Trustee cannot read non-granted assets (should fail)
-- [ ] Revoke trustee access
-- [ ] Revoked trustee attempts to read assets (should fail)
-- [ ] Anonymous user attempts to read any table (should fail)

-- ============================================================================
-- RLS VERIFICATION QUERY
-- Run this to confirm RLS is enabled on all tables
-- ============================================================================

select
  schemaname,
  tablename,
  rowsecurity as "RLS Enabled",
  case
    when rowsecurity then 'PASS'
    else 'FAIL - RLS NOT ENABLED'
  end as "Test Result"
from pg_tables
where schemaname = 'public'
  and tablename not in ('spatial_ref_sys') -- Exclude PostGIS tables if any
order by tablename;

-- ============================================================================
-- POLICY COUNT VERIFICATION
-- Ensure each table has appropriate policies
-- ============================================================================

select
  schemaname,
  tablename,
  count(*) as policy_count
from pg_policies
where schemaname = 'public'
group by schemaname, tablename
order by tablename;

-- Expected policy counts:
-- profiles: 2 (read own, update own)
-- assets: 2 (owner full access, trustee read released)
-- trustees: 2 (owner full access, trustee read own)
-- asset_trustee_grants: 2 (owner manage, trustee read own)
-- checkins: 2 (owner read own, owner insert)
-- dead_man_switch_state: 2 (owner read own, trustee read released)
-- release_events: 2 (owner read own, trustee read relevant)
-- audit_log: 1 (user read own)
-- keepalive_pings: 0 (function-only access)
