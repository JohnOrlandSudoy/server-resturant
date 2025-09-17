-- =====================================================
-- QUICK FIX: Fix Function Data Types
-- =====================================================
-- This script fixes the data type mismatch in the ingredient functions
-- =====================================================

-- Drop and recreate the problematic functions with correct data types
DROP FUNCTION IF EXISTS check_ingredient_availability(uuid, integer);
DROP FUNCTION IF EXISTS get_menu_item_availability(uuid, integer);

-- =====================================================
-- 1. FUNCTION: Check ingredient availability (FIXED)
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
        i.id as ingredient_id,
        i.name as ingredient_name,
        (mii.quantity_required * p_quantity) as required_quantity,
        i.current_stock as available_stock,
        (i.current_stock >= (mii.quantity_required * p_quantity)) as is_available,
        GREATEST(0, (mii.quantity_required * p_quantity) - i.current_stock) as shortage_amount,
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
-- 2. FUNCTION: Get menu item availability (FIXED)
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
            p_menu_item_id,
            'Menu item not found'::TEXT,
            p_quantity,
            false,
            '[]'::jsonb,
            0,
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
            p_menu_item_id,
            v_menu_item.name,
            p_quantity,
            true,
            '[]'::jsonb,
            999999,
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
        p_menu_item_id,
        v_menu_item.name,
        p_quantity,
        (jsonb_array_length(v_unavailable_ingredients) = 0 AND v_menu_item.is_available = true),
        v_unavailable_ingredients,
        v_max_quantity,
        v_stock_summary;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
SELECT 'Functions fixed successfully! Data type mismatch resolved.' as result;
