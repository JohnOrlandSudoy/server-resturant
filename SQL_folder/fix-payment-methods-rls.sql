-- Fix Row Level Security policies for payment_methods_config table
-- This script ensures the table can be updated properly

-- First, let's check if RLS is enabled and what policies exist
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'payment_methods_config';

-- Check existing policies
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

-- Drop existing policies if they exist (to start fresh)
DROP POLICY IF EXISTS "Enable read access for all users" ON payment_methods_config;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON payment_methods_config;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON payment_methods_config;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON payment_methods_config;

-- Create new policies that allow proper access
-- Allow everyone to read payment methods (for public access to available methods)
CREATE POLICY "Enable read access for all users" ON payment_methods_config
  FOR SELECT USING (true);

-- Allow authenticated users to insert new payment methods
CREATE POLICY "Enable insert for authenticated users only" ON payment_methods_config
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update payment methods
CREATE POLICY "Enable update for authenticated users only" ON payment_methods_config
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow authenticated users to delete payment methods
CREATE POLICY "Enable delete for authenticated users only" ON payment_methods_config
  FOR DELETE USING (auth.role() = 'authenticated');

-- Alternative: If you want to disable RLS entirely for this table (less secure but simpler)
-- ALTER TABLE payment_methods_config DISABLE ROW LEVEL SECURITY;

-- Test the update
UPDATE payment_methods_config 
SET is_enabled = false, updated_at = now()
WHERE method_key = 'paymongo'
RETURNING *;

-- Verify the update worked
SELECT method_key, method_name, is_enabled, updated_at 
FROM payment_methods_config 
WHERE method_key = 'paymongo';