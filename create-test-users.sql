-- Create test users for adminRestu
-- Run this after setting up the main schema

-- Note: These are test users with simple passwords
-- In production, use proper password hashing

-- Admin user
INSERT INTO user_profiles (
    id,
    username,
    first_name,
    last_name,
    role,
    email,
    phone,
    is_active,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'admin',
    'Admin',
    'User',
    'admin',
    'admin@restaurant.com',
    '+639123456789',
    true,
    NOW(),
    NOW()
);

-- Cashier user
INSERT INTO user_profiles (
    id,
    username,
    first_name,
    last_name,
    role,
    email,
    phone,
    is_active,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'cashier',
    'Cashier',
    'User',
    'cashier',
    'cashier@restaurant.com',
    '+639234567890',
    true,
    NOW(),
    NOW()
);

-- Kitchen user
INSERT INTO user_profiles (
    id,
    username,
    first_name,
    last_name,
    role,
    email,
    phone,
    is_active,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'kitchen',
    'Kitchen',
    'User',
    'kitchen',
    'kitchen@restaurant.com',
    '+639345678901',
    true,
    NOW(),
    NOW()
);

-- Inventory Manager user
INSERT INTO user_profiles (
    id,
    username,
    first_name,
    last_name,
    role,
    email,
    phone,
    is_active,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'inventory',
    'Inventory',
    'Manager',
    'inventory_manager',
    'inventory@restaurant.com',
    '+639456789012',
    true,
    NOW(),
    NOW()
);
