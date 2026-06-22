# Database Schema & Migrations

This directory contains all database migrations, seed data, and Edge Functions for the Digital Estate Vault Supabase backend.

## Structure

```
supabase/
├── migrations/           # SQL migration files (applied in order)
│   ├── 20240622000000_initial_schema.sql    # Core tables and triggers
│   └── 20240622000001_rls_policies.sql      # Row-Level Security policies
├── functions/           # Supabase Edge Functions (Deno runtime)
└── seed.sql            # Development seed data (DO NOT run in production)
```

## Migrations

### 20240622000000_initial_schema.sql

Creates all core tables:
- `profiles` - User settings and vault configuration
- `assets` - Encrypted asset storage
- `trustees` - Designated recipients for asset release
- `asset_trustee_grants` - Many-to-many asset access permissions
- `checkins` - Append-only check-in log
- `dead_man_switch_state` - Current state machine status per owner
- `release_events` - Audit trail of escalation events
- `audit_log` - Security audit log
- `keepalive_pings` - GitHub Actions keep-alive tracking

Also creates:
- Auto-update timestamp triggers
- `keepalive_ping()` function for GitHub Actions
- `handle_new_user()` trigger to auto-create profiles

### 20240622000001_rls_policies.sql

Implements Row-Level Security policies enforcing:
- Owners can only access their own data
- Trustees can only read released assets granted to them
- Trustees cannot access data until `dead_man_switch_state.status = 'released'`
- Revoked trustees lose all access
- Anonymous users cannot access any data
- Service role bypasses RLS (used only in Edge Functions)

## Applying Migrations

### Local Development

```bash
# Start local Supabase (requires Docker)
supabase start

# Apply migrations
supabase db reset  # Drops DB, applies all migrations, runs seed.sql

# Or apply new migrations only
supabase db push
```

### Production (Supabase Cloud)

```bash
# Link to your project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push

# Or use the Supabase dashboard to run migrations manually
```

## Seed Data

`seed.sql` creates test data for development:
- Two owner accounts (Alice, Bob)
- Two trustee accounts (Charlie, Diana)
- Sample assets, grants, and check-ins
- Various dead man's switch states for testing

**⚠️ IMPORTANT:** Never run seed.sql in production! It contains demo data with placeholder UUIDs.

To use seed data:
1. Create test users via Supabase Auth dashboard
2. Update UUIDs in `seed.sql` with actual user IDs
3. Run: `supabase db reset` (local) or execute SQL manually

## RLS Testing

See `../tests/rls/rls_policy_tests.sql` for comprehensive RLS policy tests.

### Manual Verification

1. Create two test users via Supabase Auth
2. User A creates assets
3. User B attempts to read User A's assets (should fail)
4. Create trustee relationship
5. Trustee attempts access before release (should fail)
6. Set status to 'released'
7. Trustee can now read granted assets (should succeed)

### Automated Testing

For pgTAP-based automated tests:

```bash
# Install pgTAP extension
supabase db execute -f tests/rls/rls_policy_tests.sql

# Run tests (requires pgTAP setup)
supabase test db
```

## Keep-Alive Function

The `keepalive_ping(secret)` function is called by GitHub Actions every 3 days to prevent Supabase free-tier auto-pause.

**Critical:** Set the `app.keepalive_secret` config in Supabase:

```sql
-- In Supabase SQL editor or via CLI
ALTER DATABASE postgres SET app.keepalive_secret = 'your-secret-here';
```

Or use Supabase Dashboard: Settings → Database → Connection string → Add custom config

## Security Checklist

- [x] RLS enabled and forced on all tables
- [x] No blanket `using (true)` policies
- [x] Service role key never exposed to client
- [x] Trustee access requires `invite_status = 'accepted'`
- [x] Trustee access requires `status = 'released'`
- [x] Cross-user access blocked by RLS
- [x] Anonymous access blocked
- [x] Audit logging for sensitive operations
- [x] Encrypted asset data (client-side, server stores only ciphertext)

## Edge Functions

Edge Functions will be added in later phases:
- Phase 5: `checkin-scanner` - Detects missed check-ins
- Phase 5: `escalation-notifier` - Sends notifications at each state transition

## Troubleshooting

### Migration fails with "relation already exists"

Reset the database:
```bash
supabase db reset
```

### RLS policies not working as expected

Verify RLS is enabled:
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

Check policies:
```sql
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;
```

### Keep-alive function fails with "invalid secret"

Verify the secret is set correctly:
```sql
SHOW app.keepalive_secret;
```

Update if needed:
```sql
ALTER DATABASE postgres SET app.keepalive_secret = 'your-secret-here';
```

## Schema Diagram

```
auth.users (Supabase Auth)
    ↓ (trigger: handle_new_user)
profiles ←─────┐
    │          │
    ├──→ assets
    │      ↓
    ├──→ trustees
    │      ↓
    └──→ asset_trustee_grants
         (links assets ← → trustees)

dead_man_switch_state (1:1 with profiles)
checkins (append-only log)
release_events (append-only audit trail)
audit_log (append-only security log)
keepalive_pings (system maintenance)
```

## Further Reading

- [Supabase Row-Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Migrations](https://supabase.com/docs/guides/cli/local-development)
- [pgTAP Testing](https://pgtap.org/)
