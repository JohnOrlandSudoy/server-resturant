-- Debug script to check payment methods configuration table
-- Run this in your Supabase SQL editor to diagnose the update issue

-- 1. Check current state of payment methods
SELECT 
  id,
  method_key,
  method_name,
  is_enabled,
  is_active,
  created_at,
  updated_at
FROM payment_methods_config 
ORDER BY display_order;

-- 2. Check if there are any RLS policies on the table
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

-- 3. Check if RLS is enabled on the table
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'payment_methods_config';

-- 4. Try a direct update to see if it works
UPDATE payment_methods_config 
SET is_enabled = false 
WHERE method_key = 'paymongo'
RETURNING *;

-- 5. Check the result
SELECT 
  method_key,
  is_enabled,
  updated_at
FROM payment_methods_config 
WHERE method_key = 'paymongo';

-- 6. If the above works, try setting it back to true
UPDATE payment_methods_config 
SET is_enabled = true 
WHERE method_key = 'paymongo'
RETURNING *;
