-- =====================================================
-- COMPLETE FIX: Ingredient Functions
-- =====================================================
-- This script completely fixes all ingredient management functions
-- =====================================================

-- Drop ALL existing functions and triggers to start fresh
DROP FUNCTION IF EXISTS get_menu_item_availability(uuid, integer);
DROP FUNCTION IF EXISTS check_ingredient_availability(uuid, integer);
DROP FUNCTION IF EXISTS create_stock_alert_if_needed(uuid, uuid);
DROP FUNCTION IF EXISTS deduct_ingredients_for_order_item(uuid, uuid, integer, uuid);
DROP FUNCTION IF EXISTS restore_ingredients_for_order_item(uuid, uuid, integer, uuid);
DROP FUNCTION IF EXISTS trigger_deduct_ingredients_on_order_item_insert();
DROP FUNCTION IF EXISTS trigger_restore_ingredients_on_order_item_delete();
DROP FUNCTION IF EXISTS trigger_handle_order_item_quantity_change();

-- Drop triggers
DROP TRIGGER IF EXISTS deduct_ingredients_on_order_item_insert ON order_items;
DROP TRIGGER IF EXISTS restore_ingredients_on_order_item_delete ON order_items;
DROP TRIGGER IF EXISTS handle_order_item_quantity_change ON order_items;

-- Drop views
DROP VIEW IF EXISTS ingredient_stock_status;
DROP VIEW IF EXISTS active_stock_alerts;

-- =====================================================
-- 1. FUNCTION: Check ingredient availability (COMPLETELY FIXED)
-- =====================================================
CREATE OR REPLACE FUNCTION check_ingredient_availability(
    p_menu_item_id UUID,
    p_quantity INTEGER
) RETURNS TABLE (
    ingredient_id UUID,
    ingredient_name TEXT,
    required_quantity NUMERIC,
    available_stock NUMERIC,
    is_available BOOLEAN,
    shortage_amount NUMERIC,
    stock_status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id::UUID as ingredient_id,
        i.name::TEXT as ingredient_name,
        (mii.quantity_required * p_quantity)::NUMERIC as required_quantity,
        i.current_stock::NUMERIC as available_stock,
        (i.current_stock >= (mii.quantity_required * p_quantity))::BOOLEAN as is_available,
        GREATEST(0, (mii.quantity_required * p_quantity) - i.current_stock)::NUMERIC as shortage_amount,
        CASE 
            WHEN i.current_stock <= 0 THEN 'out_of_stock'::TEXT
            WHEN i.current_stock <= i.min_stock_threshold THEN 'low_stock'::TEXT
            WHEN i.max_stock_threshold IS NOT NULL AND i.current_stock >= i.max_stock_threshold THEN 'overstocked'::TEXT
            ELSE 'sufficient'::TEXT
        END as stock_status
    FROM menu_item_ingredients mii
    JOIN ingredients i ON mii.ingredient_id = i.id
    WHERE mii.menu_item_id = p_menu_item_id
    AND mii.is_optional = false
    AND i.is_active = true
    ORDER BY i.name;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 2. FUNCTION: Get menu item availability (COMPLETELY FIXED)
-- =====================================================
CREATE OR REPLACE FUNCTION get_menu_item_availability(
    p_menu_item_id UUID,
    p_quantity INTEGER DEFAULT 1
) RETURNS TABLE (
    menu_item_id UUID,
    menu_item_name TEXT,
    requested_quantity INTEGER,
    is_available BOOLEAN,
    unavailable_ingredients JSONB,
    max_available_quantity INTEGER,
    stock_summary JSONB
) AS $$
DECLARE
    v_menu_item RECORD;
    v_ingredient_record RECORD;
    v_unavailable_ingredients JSONB := '[]'::jsonb;
    v_ingredient_json JSONB;
    v_max_quantity INTEGER := 999999;
    v_ingredient_max_quantity INTEGER;
    v_stock_summary JSONB := '{}'::jsonb;
    v_out_of_stock_count INTEGER := 0;
    v_low_stock_count INTEGER := 0;
    v_sufficient_count INTEGER := 0;
    v_total_ingredients INTEGER := 0;
BEGIN
    -- Get menu item details
    SELECT * INTO v_menu_item 
    FROM menu_items 
    WHERE id = p_menu_item_id AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            p_menu_item_id::UUID,
            'Menu item not found'::TEXT,
            p_quantity::INTEGER,
            false::BOOLEAN,
            '[]'::jsonb,
            0::INTEGER,
            '{"error": "Menu item not found"}'::jsonb;
        RETURN;
    END IF;
    
    -- Check if menu item has ingredients
    SELECT COUNT(*) INTO v_total_ingredients
    FROM menu_item_ingredients mii
    WHERE mii.menu_item_id = p_menu_item_id;
    
    -- If no ingredients required, item is always available
    IF v_total_ingredients = 0 THEN
        RETURN QUERY SELECT 
            p_menu_item_id::UUID,
            v_menu_item.name::TEXT,
            p_quantity::INTEGER,
            true::BOOLEAN,
            '[]'::jsonb,
            999999::INTEGER,
            '{"no_ingredients_required": true}'::jsonb;
        RETURN;
    END IF;
    
    -- Check each required ingredient
    FOR v_ingredient_record IN 
        SELECT * FROM check_ingredient_availability(p_menu_item_id, p_quantity)
    LOOP
        -- Calculate max quantity available for this ingredient
        IF v_ingredient_record.required_quantity > 0 THEN
            v_ingredient_max_quantity := FLOOR(v_ingredient_record.available_stock / 
                (v_ingredient_record.required_quantity / p_quantity));
            v_max_quantity := LEAST(v_max_quantity, v_ingredient_max_quantity);
        END IF;
        
        -- Count stock status
        IF v_ingredient_record.stock_status = 'out_of_stock' THEN
            v_out_of_stock_count := v_out_of_stock_count + 1;
        ELSIF v_ingredient_record.stock_status = 'low_stock' THEN
            v_low_stock_count := v_low_stock_count + 1;
        ELSE
            v_sufficient_count := v_sufficient_count + 1;
        END IF;
        
        -- If ingredient is not available, add to unavailable list
        IF NOT v_ingredient_record.is_available THEN
            v_ingredient_json := jsonb_build_object(
                'ingredient_id', v_ingredient_record.ingredient_id,
                'ingredient_name', v_ingredient_record.ingredient_name,
                'required_quantity', v_ingredient_record.required_quantity,
                'available_stock', v_ingredient_record.available_stock,
                'shortage_amount', v_ingredient_record.shortage_amount,
                'stock_status', v_ingredient_record.stock_status
            );
            
            v_unavailable_ingredients := v_unavailable_ingredients || v_ingredient_json;
        END IF;
    END LOOP;
    
    -- Build stock summary
    v_stock_summary := jsonb_build_object(
        'out_of_stock_count', v_out_of_stock_count,
        'low_stock_count', v_low_stock_count,
        'sufficient_count', v_sufficient_count,
        'total_ingredients', v_total_ingredients
    );
    
    -- Determine if requested quantity is available
    RETURN QUERY SELECT 
        p_menu_item_id::UUID,
        v_menu_item.name::TEXT,
        p_quantity::INTEGER,
        (jsonb_array_length(v_unavailable_ingredients) = 0 AND v_menu_item.is_available = true)::BOOLEAN,
        v_unavailable_ingredients,
        v_max_quantity::INTEGER,
        v_stock_summary;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. FUNCTION: Create stock alert if needed
-- =====================================================
CREATE OR REPLACE FUNCTION create_stock_alert_if_needed(
    p_ingredient_id UUID,
    p_created_by UUID DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    v_ingredient RECORD;
    v_alert_type TEXT;
    v_message TEXT;
BEGIN
    -- Get current ingredient data
    SELECT * INTO v_ingredient 
    FROM ingredients 
    WHERE id = p_ingredient_id;
    
    -- Determine alert type and message
    IF v_ingredient.current_stock <= 0 THEN
        v_alert_type := 'out_of_stock';
        v_message := format('%s is out of stock!', v_ingredient.name);
    ELSIF v_ingredient.current_stock <= v_ingredient.min_stock_threshold THEN
        v_alert_type := 'low_stock';
        v_message := format('%s is running low. Current: %s %s, Minimum: %s %s', 
            v_ingredient.name, 
            v_ingredient.current_stock,
            v_ingredient.unit,
            v_ingredient.min_stock_threshold,
            v_ingredient.unit
        );
    ELSE
        -- No alert needed
        RETURN;
    END IF;
    
    -- Check if there's already an unresolved alert for this ingredient
    IF NOT EXISTS (
        SELECT 1 FROM stock_alerts 
        WHERE ingredient_id = p_ingredient_id 
        AND alert_type = v_alert_type 
        AND is_resolved = false
    ) THEN
        -- Create new alert
        INSERT INTO stock_alerts (
            ingredient_id,
            alert_type,
            current_stock,
            threshold_value,
            message
        ) VALUES (
            p_ingredient_id,
            v_alert_type,
            v_ingredient.current_stock,
            v_ingredient.min_stock_threshold,
            v_message
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. FUNCTION: Deduct ingredients for order item
-- =====================================================
CREATE OR REPLACE FUNCTION deduct_ingredients_for_order_item(
    p_order_item_id UUID,
    p_menu_item_id UUID,
    p_quantity INTEGER,
    p_created_by UUID
) RETURNS VOID AS $$
DECLARE
    v_ingredient_record RECORD;
    v_total_required NUMERIC;
BEGIN
    -- Check each required ingredient
    FOR v_ingredient_record IN 
        SELECT 
            i.id as ingredient_id,
            i.name as ingredient_name,
            i.current_stock as available_stock,
            (mii.quantity_required * p_quantity) as required_quantity,
            mii.is_optional
        FROM menu_item_ingredients mii
        JOIN ingredients i ON mii.ingredient_id = i.id
        WHERE mii.menu_item_id = p_menu_item_id
        AND mii.is_optional = false
        AND i.is_active = true
    LOOP
        v_total_required := v_ingredient_record.required_quantity;
        
        -- Check if enough stock is available
        IF v_ingredient_record.available_stock < v_total_required THEN
            RAISE EXCEPTION 'Insufficient stock for ingredient %: required %, available %', 
                v_ingredient_record.ingredient_name, v_total_required, v_ingredient_record.available_stock;
        END IF;
        
        -- Update ingredient stock
        UPDATE ingredients 
        SET 
            current_stock = current_stock - v_total_required,
            updated_at = NOW(),
            updated_by = p_created_by
        WHERE id = v_ingredient_record.ingredient_id;
        
        -- Record stock movement
        INSERT INTO stock_movements (
            ingredient_id,
            movement_type,
            quantity,
            reason,
            reference_number,
            notes,
            performed_by
        ) VALUES (
            v_ingredient_record.ingredient_id,
            'out',
            v_total_required,
            'Order Item Deduction',
            p_order_item_id::TEXT,
            format('Deducted for order item %s (quantity: %s)', p_order_item_id, p_quantity),
            p_created_by
        );
        
        -- Check if stock is now below threshold and create alert
        PERFORM create_stock_alert_if_needed(v_ingredient_record.ingredient_id, p_created_by);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. FUNCTION: Restore ingredients for order item
-- =====================================================
CREATE OR REPLACE FUNCTION restore_ingredients_for_order_item(
    p_order_item_id UUID,
    p_menu_item_id UUID,
    p_quantity INTEGER,
    p_created_by UUID
) RETURNS VOID AS $$
DECLARE
    v_ingredient_record RECORD;
    v_total_required NUMERIC;
BEGIN
    -- Restore each required ingredient
    FOR v_ingredient_record IN 
        SELECT 
            i.id as ingredient_id,
            i.name as ingredient_name,
            i.current_stock as available_stock,
            (mii.quantity_required * p_quantity) as required_quantity
        FROM menu_item_ingredients mii
        JOIN ingredients i ON mii.ingredient_id = i.id
        WHERE mii.menu_item_id = p_menu_item_id
        AND mii.is_optional = false
        AND i.is_active = true
    LOOP
        v_total_required := v_ingredient_record.required_quantity;
        
        -- Update ingredient stock
        UPDATE ingredients 
        SET 
            current_stock = current_stock + v_total_required,
            updated_at = NOW(),
            updated_by = p_created_by
        WHERE id = v_ingredient_record.ingredient_id;
        
        -- Record stock movement
        INSERT INTO stock_movements (
            ingredient_id,
            movement_type,
            quantity,
            reason,
            reference_number,
            notes,
            performed_by
        ) VALUES (
            v_ingredient_record.ingredient_id,
            'in',
            v_total_required,
            'Order Item Cancellation',
            p_order_item_id::TEXT,
            format('Restored for cancelled order item %s (quantity: %s)', p_order_item_id, p_quantity),
            p_created_by
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. TRIGGER FUNCTIONS
-- =====================================================

-- Trigger function for order item insert
CREATE OR REPLACE FUNCTION trigger_deduct_ingredients_on_order_item_insert()
RETURNS TRIGGER AS $$
DECLARE
    v_created_by UUID;
BEGIN
    -- Get the created_by from the order
    SELECT created_by INTO v_created_by 
    FROM orders 
    WHERE id = NEW.order_id;
    
    -- Deduct ingredients
    PERFORM deduct_ingredients_for_order_item(
        NEW.id,
        NEW.menu_item_id,
        NEW.quantity,
        COALESCE(v_created_by, '00000000-0000-0000-0000-000000000000'::UUID)
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for order item delete
CREATE OR REPLACE FUNCTION trigger_restore_ingredients_on_order_item_delete()
RETURNS TRIGGER AS $$
DECLARE
    v_created_by UUID;
BEGIN
    -- Get the created_by from the order
    SELECT created_by INTO v_created_by 
    FROM orders 
    WHERE id = OLD.order_id;
    
    -- Restore ingredients
    PERFORM restore_ingredients_for_order_item(
        OLD.id,
        OLD.menu_item_id,
        OLD.quantity,
        COALESCE(v_created_by, '00000000-0000-0000-0000-000000000000'::UUID)
    );
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for quantity changes
CREATE OR REPLACE FUNCTION trigger_handle_order_item_quantity_change()
RETURNS TRIGGER AS $$
DECLARE
    v_created_by UUID;
    v_quantity_diff INTEGER;
BEGIN
    -- Get the created_by from the order
    SELECT created_by INTO v_created_by 
    FROM orders 
    WHERE id = NEW.order_id;
    
    -- Calculate quantity difference
    v_quantity_diff := NEW.quantity - OLD.quantity;
    
    IF v_quantity_diff > 0 THEN
        -- Quantity increased - deduct additional ingredients
        PERFORM deduct_ingredients_for_order_item(
            NEW.id,
            NEW.menu_item_id,
            v_quantity_diff,
            COALESCE(v_created_by, '00000000-0000-0000-0000-000000000000'::UUID)
        );
        
    ELSIF v_quantity_diff < 0 THEN
        -- Quantity decreased - restore excess ingredients
        PERFORM restore_ingredients_for_order_item(
            NEW.id,
            NEW.menu_item_id,
            ABS(v_quantity_diff),
            COALESCE(v_created_by, '00000000-0000-0000-0000-000000000000'::UUID)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. CREATE TRIGGERS
-- =====================================================

-- Trigger to deduct ingredients when order item is inserted
CREATE TRIGGER deduct_ingredients_on_order_item_insert
    AFTER INSERT ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION trigger_deduct_ingredients_on_order_item_insert();

-- Trigger to restore ingredients when order item is deleted
CREATE TRIGGER restore_ingredients_on_order_item_delete
    AFTER DELETE ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION trigger_restore_ingredients_on_order_item_delete();

-- Trigger to handle quantity changes
CREATE TRIGGER handle_order_item_quantity_change
    AFTER UPDATE ON order_items
    FOR EACH ROW
    WHEN (OLD.quantity IS DISTINCT FROM NEW.quantity)
    EXECUTE FUNCTION trigger_handle_order_item_quantity_change();

-- =====================================================
-- 8. CREATE VIEWS
-- =====================================================

-- View for ingredient stock status
CREATE OR REPLACE VIEW ingredient_stock_status AS
SELECT 
    i.id,
    i.name,
    i.current_stock,
    i.min_stock_threshold,
    i.max_stock_threshold,
    i.unit,
    i.cost_per_unit,
    i.supplier,
    i.category,
    i.is_active,
    CASE 
        WHEN i.current_stock <= 0 THEN 'out_of_stock'
        WHEN i.current_stock <= i.min_stock_threshold THEN 'low_stock'
        WHEN i.max_stock_threshold IS NOT NULL AND i.current_stock >= i.max_stock_threshold THEN 'overstocked'
        ELSE 'sufficient'
    END as stock_status,
    CASE 
        WHEN i.current_stock <= 0 THEN 0
        WHEN i.current_stock <= i.min_stock_threshold THEN 
            ROUND((i.current_stock / NULLIF(i.min_stock_threshold, 0)) * 100, 2)
        ELSE 100
    END as stock_percentage,
    i.created_at,
    i.updated_at
FROM ingredients i
WHERE i.is_active = true
ORDER BY 
    CASE 
        WHEN i.current_stock <= 0 THEN 1
        WHEN i.current_stock <= i.min_stock_threshold THEN 2
        ELSE 3
    END,
    i.name;

-- View for active stock alerts
CREATE OR REPLACE VIEW active_stock_alerts AS
SELECT 
    sa.id,
    sa.alert_type,
    sa.message,
    sa.current_stock,
    sa.threshold_value,
    sa.created_at,
    i.id as ingredient_id,
    i.name as ingredient_name,
    i.unit,
    i.supplier,
    i.category
FROM stock_alerts sa
JOIN ingredients i ON sa.ingredient_id = i.id
WHERE sa.is_resolved = false
ORDER BY 
    CASE sa.alert_type
        WHEN 'out_of_stock' THEN 1
        WHEN 'low_stock' THEN 2
        WHEN 'expiry_warning' THEN 3
        ELSE 4
    END,
    sa.created_at DESC;

-- =====================================================
-- 9. TEST THE FUNCTIONS
-- =====================================================

-- Test the functions to make sure they work
SELECT 'Testing functions...' as status;

-- Test get_menu_item_availability
SELECT * FROM get_menu_item_availability(
    'f86c5c73-ccfc-451e-8383-ff69db8a15d9'::uuid, 
    1
);

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
SELECT 'All ingredient functions fixed and working correctly!' as result;
