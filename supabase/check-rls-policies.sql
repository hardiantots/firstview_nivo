-- ========================================
-- FIX: daily_consumption RLS Policies
-- ========================================
-- Problem: Data tidak tersimpan/terambil karena RLS blocking
-- Solution: Drop & recreate policies dengan benar
--
-- IMPORTANT: Jalankan script ini di Supabase SQL Editor!
-- ========================================

-- STEP 1: Check current RLS status
SELECT 
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'daily_consumption';

-- STEP 2: Check existing policies
SELECT 
  policyname,
  cmd as "Command",
  CASE 
    WHEN qual IS NOT NULL THEN 'USING: ' || qual::text
    ELSE 'No USING clause'
  END as "Using Clause",
  CASE 
    WHEN with_check IS NOT NULL THEN 'WITH CHECK: ' || with_check::text
    ELSE 'No WITH CHECK clause'
  END as "With Check Clause"
FROM pg_policies 
WHERE tablename = 'daily_consumption';

-- STEP 3: Drop all existing policies
DROP POLICY IF EXISTS "Users can view own consumption" ON daily_consumption;
DROP POLICY IF EXISTS "Users can insert own consumption" ON daily_consumption;
DROP POLICY IF EXISTS "Users can update own consumption" ON daily_consumption;
DROP POLICY IF EXISTS "Users can delete own consumption" ON daily_consumption;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON daily_consumption;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON daily_consumption;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON daily_consumption;

-- STEP 4: Enable RLS
ALTER TABLE daily_consumption ENABLE ROW LEVEL SECURITY;

-- STEP 5: Create NEW policies (correct version)
CREATE POLICY "Users can view own consumption" 
  ON daily_consumption
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own consumption" 
  ON daily_consumption
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own consumption" 
  ON daily_consumption
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own consumption" 
  ON daily_consumption
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- STEP 6: Verify policies created successfully
SELECT 
  policyname as "Policy Name",
  cmd as "Command",
  roles as "Roles",
  CASE 
    WHEN qual IS NOT NULL THEN '✓'
    ELSE '✗'
  END as "Has USING",
  CASE 
    WHEN with_check IS NOT NULL THEN '✓'
    ELSE '✗'
  END as "Has WITH CHECK"
FROM pg_policies 
WHERE tablename = 'daily_consumption'
ORDER BY cmd;

-- STEP 7: Test INSERT (manual test)
-- Replace 'YOUR_USER_ID' with actual user_id from auth.users
/*
INSERT INTO daily_consumption (user_id, date, cigarette_count, money_spent)
VALUES (
  auth.uid(), -- Current authenticated user
  CURRENT_DATE,
  5,
  8750
)
RETURNING *;
*/

-- STEP 8: Test SELECT (manual test)
/*
SELECT * FROM daily_consumption 
WHERE user_id = auth.uid()
ORDER BY date DESC
LIMIT 5;
*/

-- ========================================
-- Expected Result:
-- - RLS Enabled: true
-- - 4 policies created (SELECT, INSERT, UPDATE, DELETE)
-- - All policies have "TO authenticated"
-- - INSERT should work without errors
-- - SELECT should return user's own data
-- ========================================
