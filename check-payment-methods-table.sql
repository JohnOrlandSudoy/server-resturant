-- Check if payment_methods_config table exists
-- Run this in your Supabase SQL editor to verify the table exists

-- Check if table exists
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'payment_methods_config'
ORDER BY ordinal_position;

-- If the above query returns no results, the table doesn't exist
-- Run the payment-methods-config.sql script to create it

-- Check if table has data
SELECT COUNT(*) as payment_methods_count 
FROM payment_methods_config;

-- View all payment methods
SELECT 
  method_key,
  method_name,
  is_enabled,
  is_online,
  display_order
FROM payment_methods_config 
ORDER BY display_order;
