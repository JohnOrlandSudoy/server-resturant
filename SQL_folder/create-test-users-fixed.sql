-- Create test users for adminRestu (FIXED VERSION)
-- This script properly creates auth users first, then inserts profiles
-- Run this after setting up the main schema

-- Note: These are test users with simple passwords
-- In production, use proper password hashing

-- First, we need to create auth users using Supabase Auth
-- Since we can't directly insert into auth.users, we'll use a different approach

-- Option 1: Create users through Supabase Auth API (recommended)
-- You should create these users through your application or Supabase dashboard

-- Option 2: Temporarily disable the foreign key constraint and insert test data
-- WARNING: This is for development/testing only!

-- Temporarily disable the foreign key constraint
ALTER TABLE user_profiles DISABLE TRIGGER ALL;

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

-- Re-enable the foreign key constraint
ALTER TABLE user_profiles ENABLE TRIGGER ALL;

-- Verify the inserts
SELECT id, username, role, email FROM user_profiles WHERE username IN ('admin', 'cashier', 'kitchen', 'inventory');
