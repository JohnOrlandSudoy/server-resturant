-- Test script to update payment method directly in Supabase
-- Run this in your Supabase SQL editor to test if the update works

-- 1. Check current state
SELECT 
  id,
  method_key,
  method_name,
  is_enabled,
  updated_by,
  updated_at
FROM payment_methods_config 
WHERE method_key = 'paymongo';

-- 2. Try to update without updated_by (this might fail)
UPDATE payment_methods_config 
SET is_enabled = false 
WHERE method_key = 'paymongo'
RETURNING *;

-- 3. Check the result
SELECT 
  method_key,
  is_enabled,
  updated_at
FROM payment_methods_config 
WHERE method_key = 'paymongo';

-- 4. Try to update with a valid user ID (replace with actual user ID from your user_profiles table)
-- First, get a valid user ID:
SELECT id, username FROM user_profiles LIMIT 1;

-- Then use that ID in the update (replace 'YOUR_USER_ID_HERE' with actual ID):
-- UPDATE payment_methods_config 
-- SET is_enabled = true, updated_by = 'YOUR_USER_ID_HERE'
-- WHERE method_key = 'paymongo'
-- RETURNING *;

-- 5. Check if there are any RLS policies
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

-- 6. Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'payment_methods_config';
