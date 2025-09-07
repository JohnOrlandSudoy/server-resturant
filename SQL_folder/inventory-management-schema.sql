-- =====================================================
-- Inventory Management Schema
-- Real-time monitoring, stock tracking, and menu linking
-- =====================================================

-- =====================================================
-- INVENTORY TABLES
-- =====================================================

-- 1. Ingredients table
CREATE TABLE public.ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    unit VARCHAR(20) NOT NULL DEFAULT 'pieces', -- kg, pieces, liters, etc.
    current_stock DECIMAL(10,3) NOT NULL DEFAULT 0,
    min_stock_threshold DECIMAL(10,3) NOT NULL DEFAULT 0,
    max_stock_threshold DECIMAL(10,3),
    cost_per_unit DECIMAL(10,2),
    supplier VARCHAR(100),
    category VARCHAR(50), -- meat, vegetables, spices, etc.
    storage_location VARCHAR(100), -- freezer, pantry, fridge, etc.
    expiry_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES public.user_profiles(id),
    updated_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Stock movements (in/out transactions)
CREATE TABLE public.stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ingredient_id UUID NOT NULL REFERENCES public.ingredients(id),
    movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment', 'spoilage')),
    quantity DECIMAL(10,3) NOT NULL,
    reason VARCHAR(100), -- purchase, usage, spoilage, adjustment, etc.
    reference_number VARCHAR(50), -- invoice number, order number, etc.
    notes TEXT,
    performed_by UUID NOT NULL REFERENCES public.user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Menu item ingredients (linking menu items to required ingredients)
CREATE TABLE public.menu_item_ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES public.ingredients(id),
    quantity_required DECIMAL(10,3) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    is_optional BOOLEAN DEFAULT false,
    created_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(menu_item_id, ingredient_id)
);

-- 4. Low stock alerts
CREATE TABLE public.stock_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ingredient_id UUID NOT NULL REFERENCES public.ingredients(id),
    alert_type VARCHAR(20) NOT NULL CHECK (alert_type IN ('low_stock', 'out_of_stock', 'expiry_warning')),
    current_stock DECIMAL(10,3) NOT NULL,
    threshold_value DECIMAL(10,3) NOT NULL,
    message TEXT NOT NULL,
    is_resolved BOOLEAN DEFAULT false,
    resolved_by UUID REFERENCES public.user_profiles(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Ingredients indexes
CREATE INDEX idx_ingredients_name ON public.ingredients(name);
CREATE INDEX idx_ingredients_category ON public.ingredients(category);
CREATE INDEX idx_ingredients_active ON public.ingredients(is_active);
CREATE INDEX idx_ingredients_low_stock ON public.ingredients(current_stock, min_stock_threshold) WHERE is_active = true;

-- Stock movements indexes
CREATE INDEX idx_stock_movements_ingredient ON public.stock_movements(ingredient_id);
CREATE INDEX idx_stock_movements_type ON public.stock_movements(movement_type);
CREATE INDEX idx_stock_movements_date ON public.stock_movements(created_at);
CREATE INDEX idx_stock_movements_performed_by ON public.stock_movements(performed_by);

-- Menu item ingredients indexes
CREATE INDEX idx_menu_item_ingredients_menu ON public.menu_item_ingredients(menu_item_id);
CREATE INDEX idx_menu_item_ingredients_ingredient ON public.menu_item_ingredients(ingredient_id);

-- Stock alerts indexes
CREATE INDEX idx_stock_alerts_ingredient ON public.stock_alerts(ingredient_id);
CREATE INDEX idx_stock_alerts_resolved ON public.stock_alerts(is_resolved);
CREATE INDEX idx_stock_alerts_type ON public.stock_alerts(alert_type);

-- =====================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Function to update ingredient stock when stock movement is added
CREATE OR REPLACE FUNCTION update_ingredient_stock()
RETURNS TRIGGER AS $$
BEGIN
    -- Update current stock based on movement type
    IF NEW.movement_type = 'in' THEN
        UPDATE public.ingredients 
        SET current_stock = current_stock + NEW.quantity,
            updated_at = NOW()
        WHERE id = NEW.ingredient_id;
    ELSIF NEW.movement_type IN ('out', 'spoilage') THEN
        UPDATE public.ingredients 
        SET current_stock = GREATEST(0, current_stock - NEW.quantity),
            updated_at = NOW()
        WHERE id = NEW.ingredient_id;
    ELSIF NEW.movement_type = 'adjustment' THEN
        UPDATE public.ingredients 
        SET current_stock = NEW.quantity,
            updated_at = NOW()
        WHERE id = NEW.ingredient_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for stock movements
CREATE TRIGGER trigger_update_ingredient_stock
    AFTER INSERT ON public.stock_movements
    FOR EACH ROW
    EXECUTE FUNCTION update_ingredient_stock();

-- Function to check for low stock and create alerts
CREATE OR REPLACE FUNCTION check_stock_alerts()
RETURNS TRIGGER AS $$
DECLARE
    alert_message TEXT;
BEGIN
    -- Check for low stock
    IF NEW.current_stock <= NEW.min_stock_threshold AND NEW.current_stock > 0 THEN
        alert_message := 'Low stock alert: ' || NEW.name || ' has ' || NEW.current_stock || ' ' || NEW.unit || ' remaining (threshold: ' || NEW.min_stock_threshold || ' ' || NEW.unit || ')';
        
        INSERT INTO public.stock_alerts (ingredient_id, alert_type, current_stock, threshold_value, message)
        VALUES (NEW.id, 'low_stock', NEW.current_stock, NEW.min_stock_threshold, alert_message);
    END IF;
    
    -- Check for out of stock
    IF NEW.current_stock <= 0 THEN
        alert_message := 'Out of stock: ' || NEW.name || ' is completely out of stock';
        
        INSERT INTO public.stock_alerts (ingredient_id, alert_type, current_stock, threshold_value, message)
        VALUES (NEW.id, 'out_of_stock', NEW.current_stock, 0, alert_message);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for stock alerts
CREATE TRIGGER trigger_check_stock_alerts
    AFTER UPDATE OF current_stock ON public.ingredients
    FOR EACH ROW
    EXECUTE FUNCTION check_stock_alerts();

-- Function to update menu item availability based on ingredient stock
CREATE OR REPLACE FUNCTION update_menu_availability()
RETURNS TRIGGER AS $$
DECLARE
    menu_item_id UUID;
    required_ingredient_id UUID;
    required_quantity DECIMAL(10,3);
    available_stock DECIMAL(10,3);
    is_available BOOLEAN := true;
BEGIN
    -- Get all menu items that use this ingredient
    FOR menu_item_id, required_quantity IN 
        SELECT mii.menu_item_id, mii.quantity_required
        FROM public.menu_item_ingredients mii
        WHERE mii.ingredient_id = NEW.id AND mii.is_optional = false
    LOOP
        -- Check if we have enough stock for this menu item
        IF NEW.current_stock < required_quantity THEN
            is_available := false;
            EXIT;
        END IF;
    END LOOP;
    
    -- Update menu item availability
    UPDATE public.menu_items 
    SET is_available = is_available,
        updated_at = NOW()
    WHERE id IN (
        SELECT mii.menu_item_id
        FROM public.menu_item_ingredients mii
        WHERE mii.ingredient_id = NEW.id
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for menu availability updates
CREATE TRIGGER trigger_update_menu_availability
    AFTER UPDATE OF current_stock ON public.ingredients
    FOR EACH ROW
    EXECUTE FUNCTION update_menu_availability();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on inventory tables
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_item_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_alerts ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY "Admin can manage ingredients" ON public.ingredients FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

CREATE POLICY "Admin can manage stock movements" ON public.stock_movements FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

CREATE POLICY "Admin can manage menu ingredients" ON public.menu_item_ingredients FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

CREATE POLICY "Admin can view stock alerts" ON public.stock_alerts FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Allow kitchen staff to view ingredients and stock
CREATE POLICY "Kitchen can view ingredients" ON public.ingredients FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'kitchen')
    )
);

CREATE POLICY "Kitchen can view stock movements" ON public.stock_movements FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'kitchen')
    )
);

-- =====================================================
-- SAMPLE DATA
-- =====================================================

-- Insert sample ingredients
INSERT INTO public.ingredients (name, description, unit, current_stock, min_stock_threshold, cost_per_unit, category, storage_location, created_by, updated_by) VALUES
('Chicken Breast', 'Fresh chicken breast', 'kg', 10.5, 2.0, 180.00, 'meat', 'freezer', (SELECT id FROM public.user_profiles WHERE username = 'admin' LIMIT 1), (SELECT id FROM public.user_profiles WHERE username = 'admin' LIMIT 1)),
('Soy Sauce', 'Premium soy sauce', 'liters', 5.0, 1.0, 45.00, 'sauces', 'pantry', (SELECT id FROM public.user_profiles WHERE username = 'admin' LIMIT 1), (SELECT id FROM public.user_profiles WHERE username = 'admin' LIMIT 1)),
('Black Pepper', 'Ground black pepper', 'grams', 500.0, 100.0, 2.50, 'spices', 'pantry', (SELECT id FROM public.user_profiles WHERE username = 'admin' LIMIT 1), (SELECT id FROM public.user_profiles WHERE username = 'admin' LIMIT 1)),
('Garlic', 'Fresh garlic cloves', 'kg', 2.0, 0.5, 80.00, 'vegetables', 'pantry', (SELECT id FROM public.user_profiles WHERE username = 'admin' LIMIT 1), (SELECT id FROM public.user_profiles WHERE username = 'admin' LIMIT 1)),
('Rice', 'Premium jasmine rice', 'kg', 25.0, 5.0, 60.00, 'grains', 'pantry', (SELECT id FROM public.user_profiles WHERE username = 'admin' LIMIT 1), (SELECT id FROM public.user_profiles WHERE username = 'admin' LIMIT 1));

-- Link ingredients to menu items (Chicken Adobo example)
INSERT INTO public.menu_item_ingredients (menu_item_id, ingredient_id, quantity_required, unit, created_by) VALUES
((SELECT id FROM public.menu_items WHERE name = 'Chicken Adobo' LIMIT 1), (SELECT id FROM public.ingredients WHERE name = 'Chicken Breast' LIMIT 1), 0.3, 'kg', (SELECT id FROM public.user_profiles WHERE username = 'admin' LIMIT 1)),
((SELECT id FROM public.menu_items WHERE name = 'Chicken Adobo' LIMIT 1), (SELECT id FROM public.ingredients WHERE name = 'Soy Sauce' LIMIT 1), 0.05, 'liters', (SELECT id FROM public.user_profiles WHERE username = 'admin' LIMIT 1)),
((SELECT id FROM public.menu_items WHERE name = 'Chicken Adobo' LIMIT 1), (SELECT id FROM public.ingredients WHERE name = 'Black Pepper' LIMIT 1), 5.0, 'grams', (SELECT id FROM public.user_profiles WHERE username = 'admin' LIMIT 1)),
((SELECT id FROM public.menu_items WHERE name = 'Chicken Adobo' LIMIT 1), (SELECT id FROM public.ingredients WHERE name = 'Garlic' LIMIT 1), 0.02, 'kg', (SELECT id FROM public.user_profiles WHERE username = 'admin' LIMIT 1));

-- =====================================================
-- VIEWS FOR REPORTING
-- =====================================================

-- View for ingredients with stock status
CREATE VIEW ingredients_stock_status AS
SELECT 
    i.id,
    i.name,
    i.description,
    i.unit,
    i.current_stock,
    i.min_stock_threshold,
    i.max_stock_threshold,
    i.cost_per_unit,
    i.category,
    i.storage_location,
    CASE 
        WHEN i.current_stock <= 0 THEN 'Out of Stock'
        WHEN i.current_stock <= i.min_stock_threshold THEN 'Low Stock'
        ELSE 'In Stock'
    END as stock_status,
    i.is_active,
    i.created_at,
    i.updated_at
FROM public.ingredients i
WHERE i.is_active = true;

-- View for menu items with ingredient availability
CREATE VIEW menu_items_ingredient_availability AS
SELECT 
    mi.id,
    mi.name,
    mi.is_available as menu_available,
    COUNT(mii.ingredient_id) as total_ingredients,
    COUNT(CASE WHEN i.current_stock >= mii.quantity_required THEN 1 END) as available_ingredients,
    CASE 
        WHEN COUNT(mii.ingredient_id) = 0 THEN 'No ingredients linked'
        WHEN COUNT(CASE WHEN i.current_stock >= mii.quantity_required THEN 1 END) = COUNT(mii.ingredient_id) THEN 'All ingredients available'
        ELSE 'Some ingredients unavailable'
    END as ingredient_status
FROM public.menu_items mi
LEFT JOIN public.menu_item_ingredients mii ON mi.id = mii.menu_item_id
LEFT JOIN public.ingredients i ON mii.ingredient_id = i.id AND i.is_active = true
WHERE mi.is_active = true
GROUP BY mi.id, mi.name, mi.is_available;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.ingredients IS 'Inventory ingredients with stock levels and thresholds';
COMMENT ON TABLE public.stock_movements IS 'Stock in/out transactions and adjustments';
COMMENT ON TABLE public.menu_item_ingredients IS 'Links menu items to required ingredients';
COMMENT ON TABLE public.stock_alerts IS 'Low stock and expiry alerts';

-- =====================================================
-- END OF INVENTORY SCHEMA
-- =====================================================
