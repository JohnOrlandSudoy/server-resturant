-- =====================================================
-- adminRestu - Complete Supabase Database Schema
-- =====================================================
-- This schema supports all requirements for Admin, Kitchen, and Cashier roles
-- Includes offline mode support, real-time features, and comprehensive data management

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- ENUMS AND TYPES
-- =====================================================

-- User roles
CREATE TYPE user_role AS ENUM ('admin', 'cashier', 'kitchen', 'inventory_manager');

-- Order types and statuses
CREATE TYPE order_type AS ENUM ('dine_in', 'takeout', 'delivery');
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled');
CREATE TYPE order_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Payment methods and statuses
CREATE TYPE payment_method AS ENUM ('cash', 'gcash', 'card', 'bank_transfer');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');

-- Inventory statuses
CREATE TYPE stock_status AS ENUM ('sufficient', 'low', 'out', 'expired');
CREATE TYPE transaction_type AS ENUM ('in', 'out', 'adjustment', 'spoilage', 'transfer');

-- Sync and offline statuses
CREATE TYPE sync_status AS ENUM ('pending', 'syncing', 'completed', 'failed', 'conflict');
CREATE TYPE device_sync_status AS ENUM ('synced', 'pending', 'conflict', 'offline');
CREATE TYPE session_status AS ENUM ('active', 'ended', 'interrupted');
CREATE TYPE conflict_type AS ENUM ('update_conflict', 'delete_conflict', 'merge_conflict');
CREATE TYPE resolution_type AS ENUM ('pending', 'local_wins', 'cloud_wins', 'manual_merge');

-- =====================================================
-- CORE TABLES
-- =====================================================

-- 1. User Profiles (extends Supabase Auth)
CREATE TABLE public.user_profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
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

-- 2. Customers
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) UNIQUE,
    email VARCHAR(255),
    address TEXT,
    loyalty_points INTEGER DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    total_spent DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Ingredients
CREATE TABLE ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    current_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
    min_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
    max_stock DECIMAL(10,2),
    unit VARCHAR(20) NOT NULL,
    cost_per_unit DECIMAL(10,2),
    supplier VARCHAR(100),
    category VARCHAR(50),
    expiry_date DATE,
    stock_status stock_status DEFAULT 'sufficient',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Menu Categories
CREATE TABLE menu_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    image_url VARCHAR(255),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Menu Items
CREATE TABLE menu_items (
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

-- 6. Menu Item Ingredients (Junction Table)
CREATE TABLE menu_item_ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
    ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE,
    quantity DECIMAL(10,2) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    is_optional BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(menu_item_id, ingredient_id)
);

-- 7. Menu Item Customizations
CREATE TABLE menu_item_customizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) DEFAULT 0,
    is_required BOOLEAN DEFAULT false,
    max_selections INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Menu Item Add-ons
CREATE TABLE menu_item_addons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Orders
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID REFERENCES customers(id),
    customer_name VARCHAR(100),
    customer_phone VARCHAR(20),
    order_type order_type NOT NULL DEFAULT 'dine_in',
    status order_status NOT NULL DEFAULT 'pending',
    priority order_priority NOT NULL DEFAULT 'medium',
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    discount DECIMAL(10,2) DEFAULT 0,
    tax DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL DEFAULT 0,
    payment_status payment_status NOT NULL DEFAULT 'pending',
    payment_method payment_method,
    table_number INTEGER,
    special_instructions TEXT,
    estimated_ready_time TIMESTAMP WITH TIME ZONE,
    actual_ready_time TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Order Items
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES menu_items(id),
    menu_item_name VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    customizations JSONB DEFAULT '[]',
    addons JSONB DEFAULT '[]',
    special_instructions TEXT,
    status order_status NOT NULL DEFAULT 'pending',
    prepared_by UUID REFERENCES user_profiles(id),
    prepared_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Inventory Transactions
CREATE TABLE inventory_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ingredient_id UUID REFERENCES ingredients(id),
    transaction_type transaction_type NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    reason VARCHAR(100),
    reference_id UUID, -- Order ID or other reference
    reference_type VARCHAR(50), -- 'order', 'adjustment', 'delivery', 'spoilage'
    notes TEXT,
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Employee Time Tracking
CREATE TABLE employee_time_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES user_profiles(id),
    date DATE NOT NULL,
    time_in TIMESTAMP WITH TIME ZONE,
    time_out TIMESTAMP WITH TIME ZONE,
    total_hours DECIMAL(4,2),
    break_duration INTEGER DEFAULT 0, -- in minutes
    status session_status NOT NULL DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. System Logs
CREATE TABLE system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id),
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(50),
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- OFFLINE MODE SUPPORT TABLES
-- =====================================================

-- 14. Sync Queue
CREATE TABLE sync_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(50) NOT NULL,
    operation_type VARCHAR(20) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    record_id UUID,
    record_data JSONB NOT NULL,
    local_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sync_status sync_status NOT NULL DEFAULT 'pending',
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. Device Registry
CREATE TABLE device_registry (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id VARCHAR(100) UNIQUE NOT NULL,
    device_name VARCHAR(100) NOT NULL,
    device_type user_role NOT NULL,
    user_id UUID REFERENCES user_profiles(id),
    ip_address INET,
    mac_address VARCHAR(17),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_online BOOLEAN DEFAULT true,
    sync_status device_sync_status DEFAULT 'synced',
    last_sync_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 16. Network Sessions
CREATE TABLE network_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(100) UNIQUE NOT NULL,
    admin_device_id UUID REFERENCES device_registry(id),
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    status session_status DEFAULT 'active',
    connected_devices JSONB DEFAULT '[]',
    sync_summary JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 17. Data Conflicts
CREATE TABLE data_conflicts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    conflict_type conflict_type NOT NULL,
    local_data JSONB,
    cloud_data JSONB,
    resolution resolution_type DEFAULT 'pending',
    resolved_by UUID REFERENCES user_profiles(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ADDITIONAL FEATURES TABLES
-- =====================================================

-- 18. Tables (for dine-in orders)
CREATE TABLE tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_number INTEGER UNIQUE NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 4,
    status VARCHAR(20) DEFAULT 'available', -- 'available', 'occupied', 'reserved', 'maintenance'
    current_order_id UUID REFERENCES orders(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 19. Promotions/Discounts
CREATE TABLE promotions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL, -- 'percentage', 'fixed_amount'
    discount_value DECIMAL(10,2) NOT NULL,
    min_order_amount DECIMAL(10,2),
    max_discount DECIMAL(10,2),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 20. Order Promotions (Junction Table)
CREATE TABLE order_promotions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    promotion_id UUID REFERENCES promotions(id) ON DELETE CASCADE,
    discount_amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(order_id, promotion_id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- User profiles indexes
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_username ON user_profiles(username);

-- Orders indexes
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);

-- Order items indexes
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_status ON order_items(status);

-- Inventory indexes
CREATE INDEX idx_ingredients_stock_status ON ingredients(stock_status);
CREATE INDEX idx_ingredients_category ON ingredients(category);
CREATE INDEX idx_ingredients_name ON ingredients(name);

-- Menu items indexes
CREATE INDEX idx_menu_items_category_id ON menu_items(category_id);
CREATE INDEX idx_menu_items_available ON menu_items(is_available);
CREATE INDEX idx_menu_items_name ON menu_items(name);

-- Sync queue indexes
CREATE INDEX idx_sync_queue_status ON sync_queue(sync_status);
CREATE INDEX idx_sync_queue_table_name ON sync_queue(table_name);
CREATE INDEX idx_sync_queue_created_at ON sync_queue(created_at);

-- Device registry indexes
CREATE INDEX idx_device_registry_user_id ON device_registry(user_id);
CREATE INDEX idx_device_registry_online ON device_registry(is_online);
CREATE INDEX idx_device_registry_last_seen ON device_registry(last_seen);

-- Inventory transactions indexes
CREATE INDEX idx_inventory_transactions_ingredient_id ON inventory_transactions(ingredient_id);
CREATE INDEX idx_inventory_transactions_type ON inventory_transactions(transaction_type);
CREATE INDEX idx_inventory_transactions_created_at ON inventory_transactions(created_at);

-- Employee time logs indexes
CREATE INDEX idx_employee_time_logs_employee_id ON employee_time_logs(employee_id);
CREATE INDEX idx_employee_time_logs_date ON employee_time_logs(date);
CREATE INDEX idx_employee_time_logs_status ON employee_time_logs(status);

-- =====================================================
-- TRIGGERS AND FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ingredients_updated_at BEFORE UPDATE ON ingredients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON menu_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_device_registry_updated_at BEFORE UPDATE ON device_registry FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.order_number := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(CAST(nextval('order_number_seq') AS TEXT), 4, '0');
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create sequence for order numbers
CREATE SEQUENCE order_number_seq START 1;

-- Apply order number trigger
CREATE TRIGGER generate_order_number_trigger BEFORE INSERT ON orders FOR EACH ROW EXECUTE FUNCTION generate_order_number();

-- Function to update ingredient stock status
CREATE OR REPLACE FUNCTION update_ingredient_stock_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.current_stock <= NEW.min_stock THEN
        IF NEW.current_stock = 0 THEN
            NEW.stock_status := 'out';
        ELSE
            NEW.stock_status := 'low';
        END IF;
    ELSE
        NEW.stock_status := 'sufficient';
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply stock status trigger
CREATE TRIGGER update_stock_status_trigger BEFORE UPDATE ON ingredients FOR EACH ROW EXECUTE FUNCTION update_ingredient_stock_status();

-- Function to update menu item availability based on ingredients
CREATE OR REPLACE FUNCTION update_menu_availability()
RETURNS TRIGGER AS $$
BEGIN
    -- If ingredient stock is out, update related menu items
    IF NEW.stock_status = 'out' THEN
        UPDATE menu_items 
        SET is_available = false 
        WHERE id IN (
            SELECT menu_item_id 
            FROM menu_item_ingredients 
            WHERE ingredient_id = NEW.id AND is_optional = false
        );
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply menu availability trigger
CREATE TRIGGER update_menu_availability_trigger AFTER UPDATE ON ingredients FOR EACH ROW EXECUTE FUNCTION update_menu_availability();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE network_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_conflicts ENABLE ROW LEVEL SECURITY;

-- User Profiles Policies
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON user_profiles FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Orders Policies
CREATE POLICY "Cashiers can manage orders" ON orders FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'cashier'))
);
CREATE POLICY "Kitchen can view orders" ON orders FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'kitchen'))
);

-- Order Items Policies
CREATE POLICY "Kitchen can update order items" ON order_items FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'kitchen'))
);
CREATE POLICY "All roles can view order items" ON order_items FOR SELECT USING (true);

-- Inventory Policies
CREATE POLICY "Inventory managers can manage ingredients" ON ingredients FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'inventory_manager'))
);
CREATE POLICY "Kitchen can view ingredients" ON ingredients FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'kitchen'))
);

-- Menu Items Policies
CREATE POLICY "Admins can manage menu items" ON menu_items FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "All roles can view menu items" ON menu_items FOR SELECT USING (true);

-- =====================================================
-- SAMPLE DATA INSERTS
-- =====================================================

-- Insert sample menu categories
INSERT INTO menu_categories (name, description, sort_order) VALUES
('Main Dishes', 'Filipino main courses', 1),
('Appetizers', 'Starters and snacks', 2),
('Beverages', 'Drinks and refreshments', 3),
('Desserts', 'Sweet treats', 4);

-- Insert sample ingredients
INSERT INTO ingredients (name, description, current_stock, min_stock, unit, cost_per_unit, category) VALUES
('Chicken', 'Fresh chicken meat', 25.5, 10.0, 'kg', 180.00, 'Meat'),
('Rice', 'White rice', 50.0, 20.0, 'kg', 45.00, 'Grains'),
('Pork', 'Fresh pork meat', 15.0, 8.0, 'kg', 220.00, 'Meat'),
('Soy Sauce', 'Kikkoman soy sauce', 8.0, 3.0, 'L', 120.00, 'Condiments'),
('Garlic', 'Fresh garlic', 5.0, 2.0, 'kg', 80.00, 'Vegetables'),
('Onion', 'Fresh onions', 8.0, 3.0, 'kg', 60.00, 'Vegetables'),
('Oil', 'Cooking oil', 12.0, 5.0, 'L', 150.00, 'Cooking'),
('Vinegar', 'White vinegar', 6.0, 2.0, 'L', 45.00, 'Condiments'),
('Pepper', 'Black pepper', 2.0, 1.0, 'kg', 200.00, 'Spices'),
('Salt', 'Table salt', 10.0, 3.0, 'kg', 25.00, 'Spices');

-- Insert sample menu items
INSERT INTO menu_items (name, description, price, category_id, prep_time) VALUES
('Chicken Adobo', 'Classic Filipino chicken adobo with soy sauce and vinegar', 180.00, (SELECT id FROM menu_categories WHERE name = 'Main Dishes'), 25),
('Pork Adobo', 'Traditional pork adobo with garlic and bay leaves', 200.00, (SELECT id FROM menu_categories WHERE name = 'Main Dishes'), 30),
('Sinigang na Baboy', 'Sour tamarind soup with pork and vegetables', 220.00, (SELECT id FROM menu_categories WHERE name = 'Main Dishes'), 35),
('Kare-kare', 'Peanut stew with beef and vegetables', 250.00, (SELECT id FROM menu_categories WHERE name = 'Main Dishes'), 40),
('Lumpia', 'Fresh spring rolls with vegetables', 80.00, (SELECT id FROM menu_categories WHERE name = 'Appetizers'), 15),
('Iced Tea', 'Refreshing iced tea', 45.00, (SELECT id FROM menu_categories WHERE name = 'Beverages'), 5),
('Halo-halo', 'Mixed dessert with shaved ice and toppings', 120.00, (SELECT id FROM menu_categories WHERE name = 'Desserts'), 10);

-- Insert sample customers
INSERT INTO customers (name, phone, email, loyalty_points) VALUES
('Maria Santos', '+639123456789', 'maria@email.com', 150),
('Juan Dela Cruz', '+639234567890', 'juan@email.com', 75),
('Ana Reyes', '+639345678901', 'ana@email.com', 200),
('Pedro Martinez', '+639456789012', 'pedro@email.com', 50);

-- Insert sample tables
INSERT INTO tables (table_number, capacity) VALUES
(1, 4), (2, 4), (3, 6), (4, 4), (5, 8), (6, 2);

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- View for order summary with customer details
CREATE VIEW order_summary AS
SELECT 
    o.id,
    o.order_number,
    o.customer_name,
    o.customer_phone,
    o.order_type,
    o.status,
    o.total,
    o.payment_status,
    o.created_at,
    COUNT(oi.id) as item_count
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id, o.order_number, o.customer_name, o.customer_phone, o.order_type, o.status, o.total, o.payment_status, o.created_at;

-- View for low stock ingredients
CREATE VIEW low_stock_ingredients AS
SELECT 
    id,
    name,
    current_stock,
    min_stock,
    unit,
    stock_status,
    supplier
FROM ingredients
WHERE stock_status IN ('low', 'out')
ORDER BY stock_status DESC, current_stock ASC;

-- View for menu items with availability status
CREATE VIEW menu_items_with_availability AS
SELECT 
    mi.id,
    mi.name,
    mi.description,
    mi.price,
    mc.name as category_name,
    mi.prep_time,
    mi.is_available,
    mi.popularity,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM menu_item_ingredients mii 
            JOIN ingredients i ON mii.ingredient_id = i.id 
            WHERE mii.menu_item_id = mi.id AND i.stock_status = 'out' AND mii.is_optional = false
        ) THEN false
        ELSE mi.is_available
    END as actually_available
FROM menu_items mi
LEFT JOIN menu_categories mc ON mi.category_id = mc.id;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE user_profiles IS 'User profiles extending Supabase Auth with role-based access';
COMMENT ON TABLE orders IS 'Main orders table with customer and payment information';
COMMENT ON TABLE order_items IS 'Individual items within orders with customizations and add-ons';
COMMENT ON TABLE ingredients IS 'Inventory items with stock tracking and alerts';
COMMENT ON TABLE menu_items IS 'Menu items with pricing and preparation time';
COMMENT ON TABLE sync_queue IS 'Queue for offline data synchronization with cloud';
COMMENT ON TABLE device_registry IS 'Registry of connected devices for offline mode';
COMMENT ON TABLE data_conflicts IS 'Conflicts between local and cloud data for resolution';

-- =====================================================
-- END OF SCHEMA
-- =====================================================
