-- Payment Methods Configuration Setup
-- This script ensures all payment methods are properly configured

-- First, let's check if the payment_methods_config table exists and has the right structure
-- If not, we'll need to create it

-- Insert or update payment methods
INSERT INTO payment_methods_config (
  method_key,
  method_name,
  method_description,
  is_enabled,
  is_online,
  requires_setup,
  display_order,
  icon_name,
  color_code,
  config_data,
  is_active
) VALUES 
  ('cash', 'Cash', 'Cash payment at the counter', true, false, false, 1, 'cash', '#28a745', '{}', true),
  ('gcash', 'GCash', 'GCash mobile payment', true, true, true, 2, 'gcash', '#007bff', '{}', true),
  ('card', 'Credit/Debit Card', 'Credit or debit card payment', true, true, true, 3, 'credit-card', '#6c757d', '{}', true),
  ('paymongo', 'PayMongo (Online)', 'PayMongo online payment gateway', true, true, true, 4, 'paymongo', '#ff6b35', '{}', true),
  ('qrph', 'QR Ph', 'QR Ph payment system', true, true, true, 5, 'qr-code', '#17a2b8', '{}', true),
  ('grab_pay', 'GrabPay', 'GrabPay mobile payment', false, true, true, 6, 'grab', '#00b14f', '{}', true),
  ('shopeepay', 'ShopeePay', 'ShopeePay mobile payment', false, true, true, 7, 'shopee', '#ee4d2d', '{}', true)
ON CONFLICT (method_key) 
DO UPDATE SET
  method_name = EXCLUDED.method_name,
  method_description = EXCLUDED.method_description,
  is_online = EXCLUDED.is_online,
  requires_setup = EXCLUDED.requires_setup,
  display_order = EXCLUDED.display_order,
  icon_name = EXCLUDED.icon_name,
  color_code = EXCLUDED.color_code,
  config_data = EXCLUDED.config_data,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Verify the setup
SELECT 
  method_key,
  method_name,
  is_enabled,
  is_online,
  display_order,
  updated_at
FROM payment_methods_config 
ORDER BY display_order;
