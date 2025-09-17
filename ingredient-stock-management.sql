-- =====================================================
-- INGREDIENT STOCK MANAGEMENT SYSTEM
-- =====================================================
-- This script implements automatic ingredient deduction
-- when orders are created and stock validation with alerts
-- =====================================================

-- 1. FUNCTION: Check if ingredients are available for a menu item
-- =====================================================
CREATE OR REPLACE FUNCTION check_ingredient_availability(
    p_menu_item_id UUID,
    p_quantity INTEGER
) RETURNS TABLE (
    ingredient_id UUID,
    ingredient_name VARCHAR,
    required_quantity NUMERIC,
    available_stock NUMERIC,
    is_available BOOLEAN,
    shortage_amount NUMERIC,
    stock_status VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id as ingredient_id,
        i.name as ingredient_name,
        (mii.quantity_required * p_quantity) as required_quantity,
        i.current_stock as available_stock,
        (i.current_stock >= (mii.quantity_required * p_quantity)) as is_available,
        GREATEST(0, (mii.quantity_required * p_quantity) - i.current_stock) as shortage_amount,
        CASE 
            WHEN i.current_stock <= 0 THEN 'out_of_stock'
            WHEN i.current_stock <= i.min_stock_threshold THEN 'low_stock'
            WHEN i.max_stock_threshold IS NOT NULL AND i.current_stock >= i.max_stock_threshold THEN 'overstocked'
            ELSE 'sufficient'
        END as stock_status
    FROM menu_item_ingredients mii
    JOIN ingredients i ON mii.ingredient_id = i.id
    WHERE mii.menu_item_id = p_menu_item_id
    AND mii.is_optional = false
    AND i.is_active = true
    ORDER BY i.name;
END;
$$ LANGUAGE plpgsql;

-- 2. FUNCTION: Get menu item availability with detailed ingredient info
-- =====================================================
CREATE OR REPLACE FUNCTION get_menu_item_availability(
    p_menu_item_id UUID,
    p_quantity INTEGER DEFAULT 1
) RETURNS TABLE (
    menu_item_id UUID,
    menu_item_name VARCHAR,
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
BEGIN
    -- Get menu item details
    SELECT * INTO v_menu_item 
    FROM menu_items 
    WHERE id = p_menu_item_id AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            p_menu_item_id,
            'Menu item not found'::VARCHAR,
            p_quantity,
            false,
            '[]'::jsonb,
            0,
            '{}'::jsonb;
        RETURN;
    END IF;
    
    -- Check each required ingredient
    FOR v_ingredient_record IN 
        SELECT * FROM check_ingredient_availability(p_menu_item_id, p_quantity)
    LOOP
        -- Calculate max quantity available for this ingredient
        v_ingredient_max_quantity := FLOOR(v_ingredient_record.available_stock / 
            (v_ingredient_record.required_quantity / p_quantity));
        
        -- Update overall max quantity
        v_max_quantity := LEAST(v_max_quantity, v_ingredient_max_quantity);
        
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
        'total_ingredients', v_out_of_stock_count + v_low_stock_count + v_sufficient_count
    );
    
    -- Determine if requested quantity is available
    RETURN QUERY SELECT 
        p_menu_item_id,
        v_menu_item.name,
        p_quantity,
        (jsonb_array_length(v_unavailable_ingredients) = 0 AND v_menu_item.is_available = true),
        v_unavailable_ingredients,
        v_max_quantity,
        v_stock_summary;
END;
$$ LANGUAGE plpgsql;

-- 3. FUNCTION: Create stock alert if ingredient is below threshold
-- =====================================================
CREATE OR REPLACE FUNCTION create_stock_alert_if_needed(
    p_ingredient_id UUID,
    p_created_by UUID DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    v_ingredient RECORD;
    v_alert_type VARCHAR;
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

-- 4. FUNCTION: Deduct ingredients from stock when order item is added
-- =====================================================
CREATE OR REPLACE FUNCTION deduct_ingredients_for_order_item(
    p_order_item_id UUID,
    p_menu_item_id UUID,
    p_quantity INTEGER,
    p_created_by UUID
) RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    deducted_ingredients JSONB
) AS $$
DECLARE
    v_ingredient_record RECORD;
    v_deducted_ingredients JSONB := '[]'::jsonb;
    v_ingredient_json JSONB;
    v_total_deducted INTEGER := 0;
    v_errors TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if all required ingredients are available first
    FOR v_ingredient_record IN 
        SELECT * FROM check_ingredient_availability(p_menu_item_id, p_quantity)
    LOOP
        IF NOT v_ingredient_record.is_available THEN
            v_errors := array_append(v_errors, 
                format('Insufficient stock for %s. Required: %s %s, Available: %s %s', 
                    v_ingredient_record.ingredient_name,
                    v_ingredient_record.required_quantity,
                    'units',
                    v_ingredient_record.available_stock,
                    'units'
                )
            );
        END IF;
    END LOOP;
    
    -- If there are errors, return them
    IF array_length(v_errors, 1) > 0 THEN
        RETURN QUERY SELECT 
            false as success,
            array_to_string(v_errors, '; ') as message,
            '[]'::jsonb as deducted_ingredients;
        RETURN;
    END IF;
    
    -- Deduct ingredients from stock
    FOR v_ingredient_record IN 
        SELECT * FROM check_ingredient_availability(p_menu_item_id, p_quantity)
    LOOP
        -- Update ingredient stock
        UPDATE ingredients 
        SET 
            current_stock = current_stock - v_ingredient_record.required_quantity,
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
            v_ingredient_record.required_quantity,
            'Order Item Deduction',
            p_order_item_id::TEXT,
            format('Deducted for order item %s (quantity: %s)', p_order_item_id, p_quantity),
            p_created_by
        );
        
        -- Create ingredient deduction record
        v_ingredient_json := jsonb_build_object(
            'ingredient_id', v_ingredient_record.ingredient_id,
            'ingredient_name', v_ingredient_record.ingredient_name,
            'quantity_deducted', v_ingredient_record.required_quantity,
            'remaining_stock', v_ingredient_record.available_stock - v_ingredient_record.required_quantity
        );
        
        v_deducted_ingredients := v_deducted_ingredients || v_ingredient_json;
        v_total_deducted := v_total_deducted + 1;
        
        -- Check if stock is now below threshold and create alert
        PERFORM create_stock_alert_if_needed(v_ingredient_record.ingredient_id, p_created_by);
    END LOOP;
    
    RETURN QUERY SELECT 
        true as success,
        format('Successfully deducted ingredients for %s items. %s ingredients processed.', p_quantity, v_total_deducted) as message,
        v_deducted_ingredients;
END;
$$ LANGUAGE plpgsql;

-- 5. FUNCTION: Restore ingredients when order item is removed/cancelled
-- =====================================================
CREATE OR REPLACE FUNCTION restore_ingredients_for_order_item(
    p_order_item_id UUID,
    p_menu_item_id UUID,
    p_quantity INTEGER,
    p_created_by UUID
) RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    restored_ingredients JSONB
) AS $$
DECLARE
    v_ingredient_record RECORD;
    v_restored_ingredients JSONB := '[]'::jsonb;
    v_ingredient_json JSONB;
    v_total_restored INTEGER := 0;
BEGIN
    -- Restore ingredients to stock
    FOR v_ingredient_record IN 
        SELECT 
            i.id as ingredient_id,
            i.name as ingredient_name,
            (mii.quantity_required * p_quantity) as required_quantity,
            i.current_stock as available_stock
        FROM menu_item_ingredients mii
        JOIN ingredients i ON mii.ingredient_id = i.id
        WHERE mii.menu_item_id = p_menu_item_id
        AND mii.is_optional = false
        AND i.is_active = true
    LOOP
        -- Update ingredient stock
        UPDATE ingredients 
        SET 
            current_stock = current_stock + v_ingredient_record.required_quantity,
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
            v_ingredient_record.required_quantity,
            'Order Item Cancellation',
            p_order_item_id::TEXT,
            format('Restored for cancelled order item %s (quantity: %s)', p_order_item_id, p_quantity),
            p_created_by
        );
        
        -- Create ingredient restoration record
        v_ingredient_json := jsonb_build_object(
            'ingredient_id', v_ingredient_record.ingredient_id,
            'ingredient_name', v_ingredient_record.ingredient_name,
            'quantity_restored', v_ingredient_record.required_quantity,
            'new_stock', v_ingredient_record.available_stock + v_ingredient_record.required_quantity
        );
        
        v_restored_ingredients := v_restored_ingredients || v_ingredient_json;
        v_total_restored := v_total_restored + 1;
    END LOOP;
    
    RETURN QUERY SELECT 
        true as success,
        format('Successfully restored ingredients for %s items. %s ingredients processed.', p_quantity, v_total_restored) as message,
        v_restored_ingredients;
END;
$$ LANGUAGE plpgsql;

-- 6. TRIGGER: Automatically deduct ingredients when order item is inserted
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_deduct_ingredients_on_order_item_insert()
RETURNS TRIGGER AS $$
DECLARE
    v_result RECORD;
    v_created_by UUID;
BEGIN
    -- Get the created_by from the order
    SELECT created_by INTO v_created_by 
    FROM orders 
    WHERE id = NEW.order_id;
    
    -- Deduct ingredients
    SELECT * INTO v_result 
    FROM deduct_ingredients_for_order_item(
        NEW.id,
        NEW.menu_item_id,
        NEW.quantity,
        COALESCE(v_created_by, '00000000-0000-0000-0000-000000000000'::UUID)
    );
    
    -- If deduction failed, raise an error
    IF NOT v_result.success THEN
        RAISE EXCEPTION 'Ingredient deduction failed: %', v_result.message;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS deduct_ingredients_on_order_item_insert ON order_items;
CREATE TRIGGER deduct_ingredients_on_order_item_insert
    AFTER INSERT ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION trigger_deduct_ingredients_on_order_item_insert();

-- 7. TRIGGER: Restore ingredients when order item is deleted
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_restore_ingredients_on_order_item_delete()
RETURNS TRIGGER AS $$
DECLARE
    v_result RECORD;
    v_created_by UUID;
BEGIN
    -- Get the created_by from the order
    SELECT created_by INTO v_created_by 
    FROM orders 
    WHERE id = OLD.order_id;
    
    -- Restore ingredients
    SELECT * INTO v_result 
    FROM restore_ingredients_for_order_item(
        OLD.id,
        OLD.menu_item_id,
        OLD.quantity,
        COALESCE(v_created_by, '00000000-0000-0000-0000-000000000000'::UUID)
    );
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS restore_ingredients_on_order_item_delete ON order_items;
CREATE TRIGGER restore_ingredients_on_order_item_delete
    AFTER DELETE ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION trigger_restore_ingredients_on_order_item_delete();

-- 8. TRIGGER: Handle quantity changes in order items
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_handle_order_item_quantity_change()
RETURNS TRIGGER AS $$
DECLARE
    v_result RECORD;
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
        SELECT * INTO v_result 
        FROM deduct_ingredients_for_order_item(
            NEW.id,
            NEW.menu_item_id,
            v_quantity_diff,
            COALESCE(v_created_by, '00000000-0000-0000-0000-000000000000'::UUID)
        );
        
        IF NOT v_result.success THEN
            RAISE EXCEPTION 'Additional ingredient deduction failed: %', v_result.message;
        END IF;
        
    ELSIF v_quantity_diff < 0 THEN
        -- Quantity decreased - restore excess ingredients
        SELECT * INTO v_result 
        FROM restore_ingredients_for_order_item(
            NEW.id,
            NEW.menu_item_id,
            ABS(v_quantity_diff),
            COALESCE(v_created_by, '00000000-0000-0000-0000-000000000000'::UUID)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS handle_order_item_quantity_change ON order_items;
CREATE TRIGGER handle_order_item_quantity_change
    AFTER UPDATE ON order_items
    FOR EACH ROW
    WHEN (OLD.quantity IS DISTINCT FROM NEW.quantity)
    EXECUTE FUNCTION trigger_handle_order_item_quantity_change();

-- 9. VIEW: Real-time ingredient stock status
-- =====================================================
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

-- 10. VIEW: Active stock alerts
-- =====================================================
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
-- END OF INGREDIENT STOCK MANAGEMENT SYSTEM
-- =====================================================

SELECT 'Ingredient stock management system installed successfully!' as result;
