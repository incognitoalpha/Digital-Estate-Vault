-- RLS Policy Tests for Trustees Table

BEGIN;

-- Create test users
INSERT INTO auth.users (id, email) VALUES 
  ('33333333-3333-3333-3333-333333333333', 'owner@test.com'),
  ('44444444-4444-4444-4444-444444444444', 'trustee@test.com'),
  ('55555555-5555-5555-5555-555555555555', 'other@test.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, vault_salt) VALUES
  ('33333333-3333-3333-3333-333333333333', 'salt1'),
  ('44444444-4444-4444-4444-444444444444', 'salt2'),
  ('55555555-5555-5555-5555-555555555555', 'salt3')
ON CONFLICT (id) DO NOTHING;

-- Test: Owner can create trustee
SET LOCAL role = authenticated;
SET LOCAL request.jwt.claims.sub = '33333333-3333-3333-3333-333333333333';

INSERT INTO trustees (owner_id, email, name, invite_status)
VALUES ('33333333-3333-3333-3333-333333333333', 'trustee@test.com', 'Test Trustee', 'pending')
RETURNING id;

-- Test: Owner can read their trustees
SELECT COUNT(*) as owner_can_read_trustees FROM trustees 
WHERE owner_id = '33333333-3333-3333-3333-333333333333';
-- Expected: 1

-- Test: Other user CANNOT read owner's trustees
SET LOCAL request.jwt.claims.sub = '55555555-5555-5555-5555-555555555555';

SELECT COUNT(*) as cannot_read_others_trustees FROM trustees 
WHERE owner_id = '33333333-3333-3333-3333-333333333333';
-- Expected: 0 (RLS blocks)

-- Test: Trustee can read their own trustee record
SET LOCAL request.jwt.claims.sub = '44444444-4444-4444-4444-444444444444';

UPDATE trustees 
SET trustee_user_id = '44444444-4444-4444-4444-444444444444'
WHERE email = 'trustee@test.com';

SELECT COUNT(*) as trustee_can_read_own FROM trustees 
WHERE trustee_user_id = '44444444-4444-4444-4444-444444444444';
-- Expected: 1

-- Test: Owner CANNOT be modified by others
SET LOCAL request.jwt.claims.sub = '55555555-5555-5555-5555-555555555555';

UPDATE trustees 
SET invite_status = 'revoked'
WHERE owner_id = '33333333-3333-3333-3333-333333333333';
-- Expected: 0 rows affected

ROLLBACK;

SELECT 'RLS Trustee Tests Complete' as status;
