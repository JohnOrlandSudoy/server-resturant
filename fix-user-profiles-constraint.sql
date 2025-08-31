-- Fix user_profiles foreign key constraint for development
-- This allows inserting test users without requiring auth.users records

-- Drop the existing foreign key constraint
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;

-- Recreate the table without the foreign key constraint for development
-- In production, you should keep the foreign key constraint

-- Option 1: Drop and recreate the table (if you don't have data yet)
DROP TABLE IF EXISTS user_profiles CASCADE;

CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role user_role NOT NULL DEFAULT 'cashier',
    phone VARCHAR(20),
    email VARCHAR(255),
    avatar_url VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recreate the indexes
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_username ON user_profiles(username);

-- Recreate the trigger
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Recreate RLS policies (simplified for development)
CREATE POLICY "Allow all operations for development" ON user_profiles FOR ALL USING (true);

-- Now insert test users
INSERT INTO user_profiles (
    username,
    first_name,
    last_name,
    role,
    email,
    phone,
    is_active
) VALUES 
    ('admin', 'Admin', 'User', 'admin', 'admin@restaurant.com', '+639123456789', true),
    ('cashier', 'Cashier', 'User', 'cashier', 'cashier@restaurant.com', '+639234567890', true),
    ('kitchen', 'Kitchen', 'User', 'kitchen', 'kitchen@restaurant.com', '+639345678901', true),
    ('inventory', 'Inventory', 'Manager', 'inventory_manager', 'inventory@restaurant.com', '+639456789012', true);

-- Verify the inserts
SELECT id, username, role, email FROM user_profiles;
