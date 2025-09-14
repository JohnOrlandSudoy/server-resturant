-- Complete fix for payment_methods_config table
-- This script will ensure the table can be updated properly

-- Step 1: Check current RLS status and policies
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'payment_methods_config';

-- Step 2: Check existing policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'payment_methods_config';

-- Step 3: Drop ALL existing policies
DROP POLICY IF EXISTS "Enable read access for all users" ON payment_methods_config;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON payment_methods_config;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON payment_methods_config;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON payment_methods_config;
DROP POLICY IF EXISTS "payment_methods_config_select_policy" ON payment_methods_config;
DROP POLICY IF EXISTS "payment_methods_config_insert_policy" ON payment_methods_config;
DROP POLICY IF EXISTS "payment_methods_config_update_policy" ON payment_methods_config;
DROP POLICY IF EXISTS "payment_methods_config_delete_policy" ON payment_methods_config;

-- Step 4: Option A - Disable RLS entirely (simplest solution)
ALTER TABLE payment_methods_config DISABLE ROW LEVEL SECURITY;

-- Step 5: Test the update
UPDATE payment_methods_config 
SET is_enabled = true, updated_at = now()
WHERE method_key = 'paymongo'
RETURNING method_key, method_name, is_enabled, updated_at;

-- Step 6: Verify the update worked
SELECT method_key, method_name, is_enabled, updated_at 
FROM payment_methods_config 
WHERE method_key = 'paymongo';

-- Step 7: Test setting it back to false
UPDATE payment_methods_config 
SET is_enabled = false, updated_at = now()
WHERE method_key = 'paymongo'
RETURNING method_key, method_name, is_enabled, updated_at;

-- Step 8: Final verification
SELECT method_key, method_name, is_enabled, updated_at 
FROM payment_methods_config 
WHERE method_key = 'paymongo';

-- Alternative Step 4 (if you want to keep RLS enabled):
-- Uncomment the lines below and comment out "ALTER TABLE payment_methods_config DISABLE ROW LEVEL SECURITY;"

/*
-- Create very permissive policies
CREATE POLICY "Allow all operations for authenticated users" ON payment_methods_config
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Or even more permissive (for testing only):
CREATE POLICY "Allow all operations for everyone" ON payment_methods_config
  FOR ALL USING (true)
  WITH CHECK (true);
*/
