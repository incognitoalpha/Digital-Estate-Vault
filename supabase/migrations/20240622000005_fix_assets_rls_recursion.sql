-- Fix infinite recursion in assets RLS policies
-- The "owner_full_access_assets" policy used "for all" which causes Postgres to evaluate
-- the trustee_read_released_assets policy during INSERT, creating infinite recursion
-- because that policy references assets.owner_id inside the assets table evaluation.
--
-- Fix: Replace the single "for all" policy with explicit per-operation policies.

-- Drop the problematic catch-all policy
drop policy if exists "owner_full_access_assets" on public.assets;

-- Recreate as separate policies per operation
create policy "owner_select_assets"
  on public.assets for select
  using (auth.uid() = owner_id);

create policy "owner_insert_assets"
  on public.assets for insert
  with check (auth.uid() = owner_id);

create policy "owner_update_assets"
  on public.assets for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "owner_delete_assets"
  on public.assets for delete
  using (auth.uid() = owner_id);
