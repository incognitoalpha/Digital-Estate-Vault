# RLS Policy Tests

These SQL scripts test Row Level Security policies to ensure users can only access their own data.

## How to Run

Execute these scripts directly in Supabase SQL Editor or via psql:

```bash
psql $DATABASE_URL -f tests/rls/test-asset-policies.sql
```

## Test Structure

Each test:
1. Creates test users
2. Attempts authorized operations (should succeed)
3. Attempts unauthorized cross-user access (should fail)
4. Cleans up test data

## Expected Results

All `SELECT` statements checking for unauthorized access should return 0 rows.
All authorized operations should complete without errors.
