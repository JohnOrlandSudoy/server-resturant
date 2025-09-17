-- =====================================================
-- FIX MENU ITEMS WITHOUT INGREDIENTS
-- =====================================================
-- This script provides solutions for menu items that don't have
-- ingredients defined but should still be orderable
-- =====================================================

-- OPTION 1: Create a "No Ingredients Required" ingredient for simple items
-- =====================================================
INSERT INTO ingredients (
    id,
    name,
    description,
    unit,
    current_stock,
    min_stock_threshold,
    max_stock_threshold,
    is_active
) VALUES (
    '00000000-0000-0000-0000-000000000001'::UUID,
    'No Ingredients Required',
    'Placeholder ingredient for menu items that don\'t require specific ingredients',
    'units',
    999999,
    0,
    999999,
    true
) ON CONFLICT (id) DO NOTHING;

-- OPTION 2: Add the placeholder ingredient to menu items that don't have any ingredients
-- =====================================================
INSERT INTO menu_item_ingredients (
    menu_item_id,
    ingredient_id,
    quantity_required,
    unit,
    is_optional
)
SELECT 
    mi.id as menu_item_id,
    '00000000-0000-0000-0000-000000000001'::UUID as ingredient_id,
    0 as quantity_required,
    'units' as unit,
    true as is_optional
FROM menu_items mi
WHERE mi.is_active = true
AND mi.id NOT IN (
    SELECT DISTINCT menu_item_id 
    FROM menu_item_ingredients
);

-- OPTION 3: Update the availability function to handle items without ingredients
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
    v_ingredient_count INTEGER := 0;
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
    
    -- Count total ingredients for this menu item
    SELECT COUNT(*) INTO v_ingredient_count
    FROM menu_item_ingredients mii
    JOIN ingredients i ON mii.ingredient_id = i.id
    WHERE mii.menu_item_id = p_menu_item_id
    AND mii.is_optional = false
    AND i.is_active = true;
    
    -- If no ingredients are required, item is always available
    IF v_ingredient_count = 0 THEN
        RETURN QUERY SELECT 
            p_menu_item_id,
            v_menu_item.name,
            p_quantity,
            v_menu_item.is_available,
            '[]'::jsonb,
            999999,
            jsonb_build_object(
                'out_of_stock_count', 0,
                'low_stock_count', 0,
                'sufficient_count', 0,
                'total_ingredients', 0,
                'no_ingredients_required', true
            );
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
        'total_ingredients', v_out_of_stock_count + v_low_stock_count + v_sufficient_count,
        'no_ingredients_required', false
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

-- OPTION 4: Update the deduction function to handle items without ingredients
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
    v_ingredient_count INTEGER := 0;
BEGIN
    -- Count total ingredients for this menu item
    SELECT COUNT(*) INTO v_ingredient_count
    FROM menu_item_ingredients mii
    JOIN ingredients i ON mii.ingredient_id = i.id
    WHERE mii.menu_item_id = p_menu_item_id
    AND mii.is_optional = false
    AND i.is_active = true;
    
    -- If no ingredients are required, return success immediately
    IF v_ingredient_count = 0 THEN
        RETURN QUERY SELECT 
            true as success,
            'No ingredients required for this menu item' as message,
            '[]'::jsonb as deducted_ingredients;
        RETURN;
    END IF;
    
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

-- OPTION 5: Update the restore function to handle items without ingredients
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
    v_ingredient_count INTEGER := 0;
BEGIN
    -- Count total ingredients for this menu item
    SELECT COUNT(*) INTO v_ingredient_count
    FROM menu_item_ingredients mii
    JOIN ingredients i ON mii.ingredient_id = i.id
    WHERE mii.menu_item_id = p_menu_item_id
    AND mii.is_optional = false
    AND i.is_active = true;
    
    -- If no ingredients are required, return success immediately
    IF v_ingredient_count = 0 THEN
        RETURN QUERY SELECT 
            true as success,
            'No ingredients to restore for this menu item' as message,
            '[]'::jsonb as restored_ingredients;
        RETURN;
    END IF;
    
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

-- =====================================================
-- END OF FIX
-- =====================================================

SELECT 'Menu items without ingredients fix applied successfully!' as result;

