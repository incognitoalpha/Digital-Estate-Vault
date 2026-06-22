-- RLS Policy Tests for Assets Table
-- Run this in Supabase SQL Editor

BEGIN;

-- Create test users
INSERT INTO auth.users (id, email) VALUES 
  ('11111111-1111-1111-1111-111111111111', 'owner1@test.com'),
  ('22222222-2222-2222-2222-222222222222', 'owner2@test.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, vault_salt) VALUES
  ('11111111-1111-1111-1111-111111111111', 'salt1'),
  ('22222222-2222-2222-2222-222222222222', 'salt2')
ON CONFLICT (id) DO NOTHING;

-- Test: Owner can insert their own assets
SET LOCAL role = authenticated;
SET LOCAL request.jwt.claims.sub = '11111111-1111-1111-1111-111111111111';

INSERT INTO assets (owner_id, category, title, ciphertext, iv)
VALUES ('11111111-1111-1111-1111-111111111111', 'account', 'Test Asset', 'encrypted', 'iv123');

-- Test: Owner can read their own assets
SELECT COUNT(*) as owner_can_read FROM assets 
WHERE owner_id = '11111111-1111-1111-1111-111111111111';
-- Expected: 1

-- Test: Owner CANNOT read other owner's assets
SET LOCAL request.jwt.claims.sub = '22222222-2222-2222-2222-222222222222';

SELECT COUNT(*) as cannot_read_others FROM assets 
WHERE owner_id = '11111111-1111-1111-1111-111111111111';
-- Expected: 0 (RLS blocks this)

-- Test: Owner can update their own assets
SET LOCAL request.jwt.claims.sub = '11111111-1111-1111-1111-111111111111';

UPDATE assets 
SET title = 'Updated Title'
WHERE owner_id = '11111111-1111-1111-1111-111111111111';

-- Test: Owner CANNOT update other owner's assets
SET LOCAL request.jwt.claims.sub = '22222222-2222-2222-2222-222222222222';

UPDATE assets 
SET title = 'Hacked!'
WHERE owner_id = '11111111-1111-1111-1111-111111111111';
-- Expected: 0 rows affected

-- Test: Owner can delete their own assets
SET LOCAL request.jwt.claims.sub = '11111111-1111-1111-1111-111111111111';

DELETE FROM assets 
WHERE owner_id = '11111111-1111-1111-1111-111111111111';

-- Cleanup
ROLLBACK;

-- Report
SELECT 'RLS Asset Tests Complete - Review results above' as status;
