 -- Setup Payment Methods Configuration
-- This script populates the payment_methods_config table with default payment methods

-- Insert default payment methods if they don't exist
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
    is_active,
    created_at,
    updated_at
) VALUES 
-- Cash Payment
(
    'cash',
    'Cash',
    'Cash payment at the counter',
    true,
    false,
    false,
    1,
    'cash',
    '#28a745',
    '{}',
    true,
    NOW(),
    NOW()
),
-- GCash Payment
(
    'gcash',
    'GCash',
    'GCash mobile payment',
    true,
    true,
    true,
    2,
    'mobile',
    '#007bff',
    '{}',
    true,
    NOW(),
    NOW()
),
-- Credit/Debit Card
(
    'card',
    'Credit/Debit Card',
    'Credit or debit card payment',
    true,
    true,
    true,
    3,
    'credit-card',
    '#6f42c1',
    '{}',
    true,
    NOW(),
    NOW()
),
-- PayMongo Online Payment
(
    'paymongo',
    'PayMongo',
    'Online payment via PayMongo',
    true,
    true,
    true,
    4,
    'credit-card',
    '#007bff',
    '{}',
    true,
    NOW(),
    NOW()
),
-- QR Ph Payment
(
    'qrph',
    'QR Ph',
    'QR Ph payment system',
    true,
    true,
    true,
    5,
    'qrcode',
    '#17a2b8',
    '{}',
    true,
    NOW(),
    NOW()
),
-- GrabPay
(
    'grab_pay',
    'GrabPay',
    'GrabPay mobile payment',
    false,
    true,
    true,
    6,
    'mobile',
    '#00b14f',
    '{}',
    true,
    NOW(),
    NOW()
),
-- ShopeePay
(
    'shopeepay',
    'ShopeePay',
    'ShopeePay mobile payment',
    false,
    true,
    true,
    7,
    'mobile',
    '#ee4d2d',
    '{}',
    true,
    NOW(),
    NOW()
)
ON CONFLICT (method_key) DO UPDATE SET
    method_name = EXCLUDED.method_name,
    method_description = EXCLUDED.method_description,
    is_enabled = EXCLUDED.is_enabled,
    is_online = EXCLUDED.is_online,
    requires_setup = EXCLUDED.requires_setup,
    display_order = EXCLUDED.display_order,
    icon_name = EXCLUDED.icon_name,
    color_code = EXCLUDED.color_code,
    config_data = EXCLUDED.config_data,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- Verify the payment methods were inserted
SELECT 
    method_key,
    method_name,
    is_enabled,
    is_online,
    display_order,
    icon_name,
    color_code
FROM payment_methods_config 
ORDER BY display_order;

-- Show current status
SELECT 
    COUNT(*) as total_methods,
    COUNT(CASE WHEN is_enabled = true THEN 1 END) as enabled_methods,
    COUNT(CASE WHEN is_online = true THEN 1 END) as online_methods
FROM payment_methods_config;
