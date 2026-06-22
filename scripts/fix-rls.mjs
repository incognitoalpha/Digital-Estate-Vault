// Script to apply the RLS fix directly to Supabase
// Run: node scripts/fix-rls.mjs

const SUPABASE_URL = 'https://hxanubphikiqivrlpkvg.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4YW51YnBoaWtpcWl2cmxwa3ZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjA5NTE2OCwiZXhwIjoyMDk3NjcxMTY4fQ.2Pc9fyiWmdJYF4-_epCZR5xCuR2sLSUB-SGwHy6Gfws';

const sql = `
-- Drop the problematic catch-all policy
drop policy if exists "owner_full_access_assets" on public.assets;

-- Recreate as separate policies per operation (fixes infinite recursion on INSERT)
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
`;

const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
  },
  body: JSON.stringify({ sql }),
});

if (!response.ok) {
  // Try the pg-meta endpoint instead
  const pgMetaResponse = await fetch(`${SUPABASE_URL}/pg-meta/v0/query`, {
    method: 'POST', 
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'X-Connection-Encrypted': SERVICE_ROLE_KEY,
    },
    body: JSON.stringify({ query: sql }),
  });
  
  const text = await pgMetaResponse.text();
  console.log('pg-meta response:', pgMetaResponse.status, text);
} else {
  const result = await response.json();
  console.log('Success:', result);
}
