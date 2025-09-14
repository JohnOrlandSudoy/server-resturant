-- Test script to debug why setting paymongo to true fails
-- Run this in your Supabase SQL editor

-- 1. Check current state
SELECT 
  id,
  method_key,
  method_name,
  is_enabled,
  is_active,
  updated_by,
  updated_at
FROM payment_methods_config 
WHERE method_key = 'paymongo';

-- 2. Try to set it to true with explicit values
UPDATE payment_methods_config 
SET 
  is_enabled = true,
  updated_at = now()
WHERE method_key = 'paymongo'
RETURNING *;

-- 3. Check if there are any CHECK constraints on the table
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'payment_methods_config'::regclass;

-- 4. Check if there are any triggers on the table
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'payment_methods_config';

-- 5. Try a different approach - update by ID instead of method_key
-- First get the ID
SELECT id FROM payment_methods_config WHERE method_key = 'paymongo';

-- Then update by ID (replace with actual ID from above query)
-- UPDATE payment_methods_config 
-- SET is_enabled = true
-- WHERE id = 'ACTUAL_ID_HERE'
-- RETURNING *;

-- 6. Check if there are any database-level constraints or rules
SELECT 
  schemaname,
  tablename,
  rulename,
  definition
FROM pg_rules 
WHERE tablename = 'payment_methods_config';

-- 7. Try to insert a new record to see if that works
-- INSERT INTO payment_methods_config (
--   method_key, 
--   method_name, 
--   method_description, 
--   is_enabled, 
--   is_online, 
--   display_order
-- ) VALUES (
--   'test_method', 
--   'Test Method', 
--   'Test description', 
--   true, 
--   false, 
--   999
-- ) RETURNING *;

-- 8. Clean up test record
-- DELETE FROM payment_methods_config WHERE method_key = 'test_method';
