-- =====================================================
-- Clean Restaurant Management Schema
-- Focus: Menu Items + Authentication Only
-- Roles: admin, kitchen, cashier
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- ENUMS AND TYPES
-- =====================================================

-- User roles (simplified)
CREATE TYPE user_role AS ENUM ('admin', 'kitchen', 'cashier');

-- =====================================================
-- CORE TABLES
-- =====================================================

-- 1. User Profiles (Employees)
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- 2. Menu Categories
CREATE TABLE public.menu_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    image_url VARCHAR(255),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Menu Items
CREATE TABLE public.menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    category_id UUID REFERENCES menu_categories(id),
    image_url VARCHAR(255),
    prep_time INTEGER NOT NULL DEFAULT 0, -- in minutes
    is_available BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    popularity INTEGER DEFAULT 0,
    calories INTEGER,
    allergens TEXT[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Menu items indexes
CREATE INDEX idx_menu_items_category_id ON menu_items(category_id);
CREATE INDEX idx_menu_items_available ON menu_items(is_available);
CREATE INDEX idx_menu_items_name ON menu_items(name);
CREATE INDEX idx_menu_items_active ON menu_items(is_active);

-- User profiles indexes
CREATE INDEX idx_user_profiles_username ON user_profiles(username);
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_user_profiles_active ON user_profiles(is_active);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_menu_categories_updated_at BEFORE UPDATE ON menu_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON menu_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for development
CREATE POLICY "Allow all operations for development" ON user_profiles FOR ALL USING (true);
CREATE POLICY "Allow all operations for development" ON menu_categories FOR ALL USING (true);
CREATE POLICY "Allow all operations for development" ON menu_items FOR ALL USING (true);

-- =====================================================
-- SAMPLE DATA INSERTS
-- =====================================================

-- Insert sample menu categories
INSERT INTO menu_categories (name, description, sort_order) VALUES
('Main Dishes', 'Filipino main courses', 1),
('Appetizers', 'Starters and snacks', 2),
('Beverages', 'Drinks and refreshments', 3),
('Desserts', 'Sweet treats', 4);

-- Insert sample menu items
INSERT INTO menu_items (name, description, price, category_id, prep_time) VALUES
('Chicken Adobo', 'Classic Filipino chicken adobo with soy sauce and vinegar', 180.00, (SELECT id FROM menu_categories WHERE name = 'Main Dishes'), 25),
('Pork Adobo', 'Traditional pork adobo with garlic and bay leaves', 200.00, (SELECT id FROM menu_categories WHERE name = 'Main Dishes'), 30),
('Sinigang na Baboy', 'Sour tamarind soup with pork and vegetables', 220.00, (SELECT id FROM menu_categories WHERE name = 'Main Dishes'), 35),
('Lumpia', 'Fresh spring rolls with vegetables', 80.00, (SELECT id FROM menu_categories WHERE name = 'Appetizers'), 15),
('Iced Tea', 'Refreshing iced tea', 45.00, (SELECT id FROM menu_categories WHERE name = 'Beverages'), 5),
('Halo-halo', 'Mixed dessert with shaved ice and toppings', 120.00, (SELECT id FROM menu_categories WHERE name = 'Desserts'), 10);

-- Insert sample employees (simplified roles)
INSERT INTO user_profiles (username, first_name, last_name, role, phone, email) VALUES
('admin', 'Admin', 'User', 'admin', '+639123456789', 'admin@restaurant.com'),
('cashier1', 'Maria', 'Santos', 'cashier', '+639234567890', 'maria@restaurant.com'),
('kitchen1', 'Juan', 'Dela Cruz', 'kitchen', '+639345678901', 'juan@restaurant.com');

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- View for menu items with category names
CREATE VIEW menu_items_with_categories AS
SELECT 
    mi.id,
    mi.name,
    mi.description,
    mi.price,
    mi.category_id,
    mc.name as category_name,
    mi.image_url,
    mi.prep_time,
    mi.is_available,
    mi.is_featured,
    mi.popularity,
    mi.calories,
    mi.allergens,
    mi.is_active,
    mi.created_at,
    mi.updated_at
FROM menu_items mi
LEFT JOIN menu_categories mc ON mi.category_id = mc.id
WHERE mi.is_active = true;

-- View for employee summary
CREATE VIEW employee_summary AS
SELECT 
    id,
    username,
    first_name,
    last_name,
    role,
    phone,
    email,
    is_active,
    last_login,
    created_at
FROM user_profiles
WHERE is_active = true
ORDER BY role, first_name;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE user_profiles IS 'Employee profiles with role-based access (admin, kitchen, cashier)';
COMMENT ON TABLE menu_items IS 'Menu items with pricing and preparation time';
COMMENT ON TABLE menu_categories IS 'Menu categories for organizing items';

-- =====================================================
-- END OF SCHEMA
-- =====================================================