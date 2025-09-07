-- =====================================================
-- Order Management Schema
-- Cashier and Kitchen Staff Features
-- =====================================================

-- =====================================================
-- ORDER TABLES
-- =====================================================

-- 1. Orders table
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(20) NOT NULL UNIQUE, -- Auto-generated order number
    customer_name VARCHAR(100),
    customer_phone VARCHAR(20),
    order_type VARCHAR(20) NOT NULL CHECK (order_type IN ('dine_in', 'takeout')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'completed', 'cancelled')),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
    payment_method VARCHAR(20) CHECK (payment_method IN ('cash', 'gcash', 'card')),
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    special_instructions TEXT,
    table_number VARCHAR(10), -- For dine-in orders
    estimated_prep_time INTEGER, -- in minutes
    actual_prep_time INTEGER, -- in minutes
    created_by UUID NOT NULL REFERENCES public.user_profiles(id),
    updated_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 2. Order items table
CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES public.menu_items(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    customizations TEXT, -- JSON string for customizations
    special_instructions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Order status history (for tracking status changes)
CREATE TABLE public.order_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL,
    notes TEXT,
    updated_by UUID NOT NULL REFERENCES public.user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Discounts/Promos table
CREATE TABLE public.discounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
    discount_value DECIMAL(10,2) NOT NULL,
    minimum_order_amount DECIMAL(10,2) DEFAULT 0,
    maximum_discount_amount DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true,
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE,
    usage_limit INTEGER,
    used_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Order discounts (many-to-many relationship)
CREATE TABLE public.order_discounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    discount_id UUID NOT NULL REFERENCES public.discounts(id),
    discount_amount DECIMAL(10,2) NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Orders indexes
CREATE INDEX idx_orders_order_number ON public.orders(order_number);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX idx_orders_created_at ON public.orders(created_at);
CREATE INDEX idx_orders_customer_name ON public.orders(customer_name);
CREATE INDEX idx_orders_created_by ON public.orders(created_by);

-- Order items indexes
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX idx_order_items_menu_item_id ON public.order_items(menu_item_id);

-- Order status history indexes
CREATE INDEX idx_order_status_history_order_id ON public.order_status_history(order_id);
CREATE INDEX idx_order_status_history_created_at ON public.order_status_history(created_at);

-- Discounts indexes
CREATE INDEX idx_discounts_code ON public.discounts(code);
CREATE INDEX idx_discounts_active ON public.discounts(is_active);
CREATE INDEX idx_discounts_valid_dates ON public.discounts(valid_from, valid_until);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
    order_count INTEGER;
    order_date VARCHAR(8);
    order_number VARCHAR(20);
BEGIN
    -- Get current date in YYYYMMDD format
    order_date := TO_CHAR(NOW(), 'YYYYMMDD');
    
    -- Count orders for today
    SELECT COUNT(*) + 1 INTO order_count
    FROM public.orders
    WHERE DATE(created_at) = CURRENT_DATE;
    
    -- Generate order number: ORD-YYYYMMDD-XXXX
    order_number := 'ORD-' || order_date || '-' || LPAD(order_count::TEXT, 4, '0');
    
    NEW.order_number := order_number;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate order number
CREATE TRIGGER trigger_generate_order_number
    BEFORE INSERT ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION generate_order_number();

-- Function to update order totals
CREATE OR REPLACE FUNCTION update_order_totals()
RETURNS TRIGGER AS $$
DECLARE
    order_subtotal DECIMAL(10,2);
    order_discount DECIMAL(10,2);
    order_tax DECIMAL(10,2);
    order_total DECIMAL(10,2);
BEGIN
    -- Calculate subtotal from order items
    SELECT COALESCE(SUM(total_price), 0) INTO order_subtotal
    FROM public.order_items
    WHERE order_id = COALESCE(NEW.order_id, OLD.order_id);
    
    -- Calculate total discount amount
    SELECT COALESCE(SUM(discount_amount), 0) INTO order_discount
    FROM public.order_discounts
    WHERE order_id = COALESCE(NEW.order_id, OLD.order_id);
    
    -- Calculate tax (assuming 12% VAT)
    order_tax := (order_subtotal - order_discount) * 0.12;
    
    -- Calculate total
    order_total := order_subtotal - order_discount + order_tax;
    
    -- Update order totals
    UPDATE public.orders
    SET 
        subtotal = order_subtotal,
        discount_amount = order_discount,
        tax_amount = order_tax,
        total_amount = order_total,
        updated_at = NOW()
    WHERE id = COALESCE(NEW.order_id, OLD.order_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers to update order totals
CREATE TRIGGER trigger_update_order_totals_items
    AFTER INSERT OR UPDATE OR DELETE ON public.order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_order_totals();

CREATE TRIGGER trigger_update_order_totals_discounts
    AFTER INSERT OR UPDATE OR DELETE ON public.order_discounts
    FOR EACH ROW
    EXECUTE FUNCTION update_order_totals();

-- Function to record order status changes
CREATE OR REPLACE FUNCTION record_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only record if status actually changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.order_status_history (order_id, status, notes, updated_by)
        VALUES (NEW.id, NEW.status, 'Status updated', NEW.updated_by);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to record status changes
CREATE TRIGGER trigger_record_order_status_change
    AFTER UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION record_order_status_change();

-- Function to deduct ingredient stock when order is confirmed
CREATE OR REPLACE FUNCTION deduct_ingredient_stock()
RETURNS TRIGGER AS $$
DECLARE
    order_item RECORD;
    ingredient_link RECORD;
    required_quantity DECIMAL(10,3);
    current_stock DECIMAL(10,3);
BEGIN
    -- Only process when order status changes to 'preparing' or 'ready'
    IF NEW.status IN ('preparing', 'ready') AND OLD.status = 'pending' THEN
        
        -- Loop through all order items
        FOR order_item IN 
            SELECT oi.menu_item_id, oi.quantity
            FROM public.order_items oi
            WHERE oi.order_id = NEW.id
        LOOP
            
            -- Loop through all ingredients for this menu item
            FOR ingredient_link IN
                SELECT mii.ingredient_id, mii.quantity_required, mii.unit
                FROM public.menu_item_ingredients mii
                WHERE mii.menu_item_id = order_item.menu_item_id
                AND mii.is_optional = false
            LOOP
                
                -- Calculate required quantity for this order
                required_quantity := ingredient_link.quantity_required * order_item.quantity;
                
                -- Get current stock
                SELECT current_stock INTO current_stock
                FROM public.ingredients
                WHERE id = ingredient_link.ingredient_id;
                
                -- Check if we have enough stock
                IF current_stock < required_quantity THEN
                    RAISE EXCEPTION 'Insufficient stock for ingredient % in menu item %. Required: %, Available: %', 
                        ingredient_link.ingredient_id, order_item.menu_item_id, required_quantity, current_stock;
                END IF;
                
                -- Deduct stock
                UPDATE public.ingredients
                SET 
                    current_stock = current_stock - required_quantity,
                    updated_at = NOW()
                WHERE id = ingredient_link.ingredient_id;
                
                -- Record stock movement
                INSERT INTO public.stock_movements (
                    ingredient_id, 
                    movement_type, 
                    quantity, 
                    reason, 
                    reference_number, 
                    performed_by
                ) VALUES (
                    ingredient_link.ingredient_id,
                    'out',
                    required_quantity,
                    'Order fulfillment',
                    NEW.order_number,
                    NEW.updated_by
                );
                
            END LOOP;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to deduct stock when order is confirmed
CREATE TRIGGER trigger_deduct_ingredient_stock
    AFTER UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION deduct_ingredient_stock();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on order tables
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_discounts ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for development
CREATE POLICY "Allow all operations for development" ON public.orders FOR ALL USING (true);
CREATE POLICY "Allow all operations for development" ON public.order_items FOR ALL USING (true);
CREATE POLICY "Allow all operations for development" ON public.order_status_history FOR ALL USING (true);
CREATE POLICY "Allow all operations for development" ON public.discounts FOR ALL USING (true);
CREATE POLICY "Allow all operations for development" ON public.order_discounts FOR ALL USING (true);

-- =====================================================
-- SAMPLE DATA
-- =====================================================

-- Insert sample discounts
INSERT INTO public.discounts (code, name, description, discount_type, discount_value, minimum_order_amount, is_active, created_by) VALUES
('WELCOME10', 'Welcome Discount', '10% off for new customers', 'percentage', 10.00, 100.00, true, (SELECT id FROM public.user_profiles WHERE username = 'admin' LIMIT 1)),
('CASH5', 'Cash Payment Discount', '5% off for cash payments', 'percentage', 5.00, 50.00, true, (SELECT id FROM public.user_profiles WHERE username = 'admin' LIMIT 1)),
('FIXED20', 'Fixed Amount Discount', '20 pesos off orders above 200', 'fixed_amount', 20.00, 200.00, true, (SELECT id FROM public.user_profiles WHERE username = 'admin' LIMIT 1));

-- =====================================================
-- VIEWS FOR REPORTING
-- =====================================================

-- View for order summary with customer info
CREATE VIEW order_summary AS
SELECT 
    o.id,
    o.order_number,
    o.customer_name,
    o.customer_phone,
    o.order_type,
    o.status,
    o.payment_status,
    o.payment_method,
    o.subtotal,
    o.discount_amount,
    o.tax_amount,
    o.total_amount,
    o.table_number,
    o.special_instructions,
    o.estimated_prep_time,
    o.actual_prep_time,
    o.created_at,
    o.completed_at,
    creator.username as created_by_username,
    creator.first_name as created_by_first_name,
    creator.last_name as created_by_last_name,
    updater.username as updated_by_username,
    updater.first_name as updated_by_first_name,
    updater.last_name as updated_by_last_name
FROM public.orders o
LEFT JOIN public.user_profiles creator ON o.created_by = creator.id
LEFT JOIN public.user_profiles updater ON o.updated_by = updater.id;

-- View for order items with menu details
CREATE VIEW order_items_detail AS
SELECT 
    oi.id,
    oi.order_id,
    oi.menu_item_id,
    oi.quantity,
    oi.unit_price,
    oi.total_price,
    oi.customizations,
    oi.special_instructions,
    oi.created_at,
    mi.name as menu_item_name,
    mi.description as menu_item_description,
    mi.image_url as menu_item_image,
    o.order_number,
    o.customer_name,
    o.status as order_status
FROM public.order_items oi
JOIN public.menu_items mi ON oi.menu_item_id = mi.id
JOIN public.orders o ON oi.order_id = o.id;

-- View for kitchen orders (orders that need preparation)
CREATE VIEW kitchen_orders AS
SELECT 
    o.id,
    o.order_number,
    o.customer_name,
    o.order_type,
    o.status,
    o.table_number,
    o.special_instructions,
    o.estimated_prep_time,
    o.created_at,
    COUNT(oi.id) as item_count,
    STRING_AGG(mi.name, ', ') as menu_items
FROM public.orders o
LEFT JOIN public.order_items oi ON o.id = oi.order_id
LEFT JOIN public.menu_items mi ON oi.menu_item_id = mi.id
WHERE o.status IN ('pending', 'preparing')
GROUP BY o.id, o.order_number, o.customer_name, o.order_type, o.status, o.table_number, o.special_instructions, o.estimated_prep_time, o.created_at
ORDER BY o.created_at ASC;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.orders IS 'Customer orders with payment and status tracking';
COMMENT ON TABLE public.order_items IS 'Individual items within an order';
COMMENT ON TABLE public.order_status_history IS 'Audit trail of order status changes';
COMMENT ON TABLE public.discounts IS 'Available discounts and promotional codes';
COMMENT ON TABLE public.order_discounts IS 'Applied discounts to specific orders';

-- =====================================================
-- END OF ORDER MANAGEMENT SCHEMA
-- =====================================================
