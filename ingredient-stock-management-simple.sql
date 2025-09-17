-- Simplified Ingredient Stock Management System
-- This script creates the necessary functions for ingredient validation

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_menu_item_availability(uuid, integer);
DROP FUNCTION IF EXISTS check_ingredient_availability(uuid, integer);

-- Create the get_menu_item_availability function
CREATE OR REPLACE FUNCTION get_menu_item_availability(
    p_menu_item_id uuid,
    p_quantity integer DEFAULT 1
)
RETURNS TABLE(
    menu_item_id uuid,
    menu_item_name text,
    requested_quantity integer,
    is_available boolean,
    unavailable_ingredients jsonb,
    max_available_quantity integer,
    stock_summary jsonb
) AS $$
DECLARE
    menu_item_record record;
    ingredient_record record;
    total_required numeric;
    available_stock numeric;
    max_quantity integer;
    unavailable_ingredients jsonb := '[]'::jsonb;
    stock_summary jsonb := '{}'::jsonb;
    has_ingredients boolean := false;
BEGIN
    -- Get menu item details
    SELECT mi.id, mi.name, mi.is_available, mi.is_active
    INTO menu_item_record
    FROM menu_items mi
    WHERE mi.id = p_menu_item_id;
    
    -- Check if menu item exists and is available
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            p_menu_item_id,
            'Menu item not found'::text,
            p_quantity,
            false,
            '[]'::jsonb,
            0,
            '{"error": "Menu item not found"}'::jsonb;
        RETURN;
    END IF;
    
    IF NOT menu_item_record.is_available OR NOT menu_item_record.is_active THEN
        RETURN QUERY SELECT 
            p_menu_item_id,
            menu_item_record.name,
            p_quantity,
            false,
            '[]'::jsonb,
            0,
            '{"error": "Menu item not available"}'::jsonb;
        RETURN;
    END IF;
    
    -- Check if menu item has ingredients
    SELECT COUNT(*) > 0 INTO has_ingredients
    FROM menu_item_ingredients mii
    WHERE mii.menu_item_id = p_menu_item_id;
    
    -- If no ingredients required, item is always available
    IF NOT has_ingredients THEN
        RETURN QUERY SELECT 
            p_menu_item_id,
            menu_item_record.name,
            p_quantity,
            true,
            '[]'::jsonb,
            999999,
            '{"no_ingredients_required": true}'::jsonb;
        RETURN;
    END IF;
    
    -- Check ingredient availability
    max_quantity := 999999;
    
    FOR ingredient_record IN
        SELECT 
            i.id,
            i.name,
            i.current_stock,
            i.min_stock_threshold,
            i.unit,
            mii.quantity_required,
            mii.is_optional
        FROM menu_item_ingredients mii
        JOIN ingredients i ON i.id = mii.ingredient_id
        WHERE mii.menu_item_id = p_menu_item_id
        AND i.is_active = true
    LOOP
        total_required := ingredient_record.quantity_required * p_quantity;
        available_stock := ingredient_record.current_stock;
        
        -- Check if ingredient is available
        IF available_stock < total_required THEN
            -- Add to unavailable ingredients
            unavailable_ingredients := unavailable_ingredients || jsonb_build_object(
                'ingredient_id', ingredient_record.id,
                'ingredient_name', ingredient_record.name,
                'required_quantity', total_required,
                'available_stock', available_stock,
                'shortage_amount', total_required - available_stock,
                'unit', ingredient_record.unit,
                'is_optional', ingredient_record.is_optional
            );
            
            -- Calculate max available quantity for this ingredient
            IF ingredient_record.quantity_required > 0 THEN
                max_quantity := LEAST(max_quantity, FLOOR(available_stock / ingredient_record.quantity_required));
            END IF;
        END IF;
    END LOOP;
    
    -- Build stock summary
    stock_summary := jsonb_build_object(
        'total_ingredients', (SELECT COUNT(*) FROM menu_item_ingredients WHERE menu_item_id = p_menu_item_id),
        'unavailable_count', jsonb_array_length(unavailable_ingredients),
        'available_count', (SELECT COUNT(*) FROM menu_item_ingredients WHERE menu_item_id = p_menu_item_id) - jsonb_array_length(unavailable_ingredients)
    );
    
    -- Return result
    RETURN QUERY SELECT 
        p_menu_item_id,
        menu_item_record.name,
        p_quantity,
        jsonb_array_length(unavailable_ingredients) = 0,
        unavailable_ingredients,
        max_quantity,
        stock_summary;
END;
$$ LANGUAGE plpgsql;

-- Create the check_ingredient_availability function
CREATE OR REPLACE FUNCTION check_ingredient_availability(
    p_menu_item_id uuid,
    p_quantity integer DEFAULT 1
)
RETURNS TABLE(
    ingredient_id uuid,
    ingredient_name text,
    required_quantity numeric,
    available_stock numeric,
    shortage_amount numeric,
    unit text,
    is_optional boolean,
    stock_status text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id,
        i.name,
        mii.quantity_required * p_quantity,
        i.current_stock,
        GREATEST(0, (mii.quantity_required * p_quantity) - i.current_stock),
        i.unit,
        mii.is_optional,
        CASE 
            WHEN i.current_stock <= 0 THEN 'out_of_stock'
            WHEN i.current_stock <= i.min_stock_threshold THEN 'low_stock'
            ELSE 'sufficient'
        END
    FROM menu_item_ingredients mii
    JOIN ingredients i ON i.id = mii.ingredient_id
    WHERE mii.menu_item_id = p_menu_item_id
    AND i.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Create stock alerts function
CREATE OR REPLACE FUNCTION create_stock_alert_if_needed(
    p_ingredient_id uuid,
    p_created_by uuid DEFAULT NULL
)
RETURNS void AS $$
DECLARE
    ingredient_record record;
    alert_type text;
    alert_message text;
BEGIN
    -- Get ingredient details
    SELECT i.*, i.current_stock, i.min_stock_threshold
    INTO ingredient_record
    FROM ingredients i
    WHERE i.id = p_ingredient_id;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- Determine alert type
    IF ingredient_record.current_stock <= 0 THEN
        alert_type := 'out_of_stock';
        alert_message := 'Ingredient ' || ingredient_record.name || ' is out of stock';
    ELSIF ingredient_record.current_stock <= ingredient_record.min_stock_threshold THEN
        alert_type := 'low_stock';
        alert_message := 'Ingredient ' || ingredient_record.name || ' is running low (current: ' || ingredient_record.current_stock || ', threshold: ' || ingredient_record.min_stock_threshold || ')';
    ELSE
        RETURN; -- No alert needed
    END IF;
    
    -- Check if alert already exists and is unresolved
    IF EXISTS (
        SELECT 1 FROM stock_alerts 
        WHERE ingredient_id = p_ingredient_id 
        AND alert_type = alert_type 
        AND is_resolved = false
    ) THEN
        RETURN; -- Alert already exists
    END IF;
    
    -- Create new alert
    INSERT INTO stock_alerts (
        ingredient_id,
        alert_type,
        current_stock,
        threshold_value,
        message,
        created_at
    ) VALUES (
        p_ingredient_id,
        alert_type,
        ingredient_record.current_stock,
        ingredient_record.min_stock_threshold,
        alert_message,
        NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- Create ingredient deduction function
CREATE OR REPLACE FUNCTION deduct_ingredients_for_order_item(
    p_order_item_id uuid,
    p_menu_item_id uuid,
    p_quantity integer,
    p_created_by uuid
)
RETURNS void AS $$
DECLARE
    ingredient_record record;
    total_required numeric;
BEGIN
    -- Check each ingredient
    FOR ingredient_record IN
        SELECT 
            i.id,
            i.name,
            i.current_stock,
            mii.quantity_required,
            mii.is_optional
        FROM menu_item_ingredients mii
        JOIN ingredients i ON i.id = mii.ingredient_id
        WHERE mii.menu_item_id = p_menu_item_id
        AND i.is_active = true
    LOOP
        total_required := ingredient_record.quantity_required * p_quantity;
        
        -- Check if enough stock is available
        IF ingredient_record.current_stock < total_required THEN
            IF NOT ingredient_record.is_optional THEN
                RAISE EXCEPTION 'Insufficient stock for ingredient %: required %, available %', 
                    ingredient_record.name, total_required, ingredient_record.current_stock;
            END IF;
        END IF;
        
        -- Deduct ingredients (only if not optional or if enough stock)
        IF ingredient_record.is_optional OR ingredient_record.current_stock >= total_required THEN
            -- Update ingredient stock
            UPDATE ingredients 
            SET current_stock = current_stock - total_required,
                updated_at = NOW(),
                updated_by = p_created_by
            WHERE id = ingredient_record.id;
            
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
                ingredient_record.id,
                'out',
                total_required,
                'Order item deduction',
                p_order_item_id::text,
                'Deducted for order item: ' || p_order_item_id,
                p_created_by
            );
            
            -- Create stock alert if needed
            PERFORM create_stock_alert_if_needed(ingredient_record.id, p_created_by);
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create ingredient restoration function
CREATE OR REPLACE FUNCTION restore_ingredients_for_order_item(
    p_order_item_id uuid,
    p_menu_item_id uuid,
    p_quantity integer,
    p_created_by uuid
)
RETURNS void AS $$
DECLARE
    ingredient_record record;
    total_required numeric;
BEGIN
    -- Restore each ingredient
    FOR ingredient_record IN
        SELECT 
            i.id,
            i.name,
            mii.quantity_required,
            mii.is_optional
        FROM menu_item_ingredients mii
        JOIN ingredients i ON i.id = mii.ingredient_id
        WHERE mii.menu_item_id = p_menu_item_id
        AND i.is_active = true
    LOOP
        total_required := ingredient_record.quantity_required * p_quantity;
        
        -- Restore ingredients (only if not optional)
        IF NOT ingredient_record.is_optional THEN
            -- Update ingredient stock
            UPDATE ingredients 
            SET current_stock = current_stock + total_required,
                updated_at = NOW(),
                updated_by = p_created_by
            WHERE id = ingredient_record.id;
            
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
                ingredient_record.id,
                'in',
                total_required,
                'Order item restoration',
                p_order_item_id::text,
                'Restored for order item: ' || p_order_item_id,
                p_created_by
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic ingredient management
DROP TRIGGER IF EXISTS deduct_ingredients_on_order_item_insert ON order_items;
DROP TRIGGER IF EXISTS restore_ingredients_on_order_item_delete ON order_items;
DROP TRIGGER IF EXISTS handle_order_item_quantity_change ON order_items;

-- Trigger to deduct ingredients when order item is inserted
CREATE TRIGGER deduct_ingredients_on_order_item_insert
    AFTER INSERT ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION deduct_ingredients_for_order_item(
        NEW.id,
        NEW.menu_item_id,
        NEW.quantity,
        NEW.created_by
    );

-- Trigger to restore ingredients when order item is deleted
CREATE TRIGGER restore_ingredients_on_order_item_delete
    AFTER DELETE ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION restore_ingredients_for_order_item(
        OLD.id,
        OLD.menu_item_id,
        OLD.quantity,
        OLD.created_by
    );

-- Trigger to handle quantity changes
CREATE OR REPLACE FUNCTION handle_order_item_quantity_change()
RETURNS TRIGGER AS $$
BEGIN
    -- If quantity increased, deduct additional ingredients
    IF NEW.quantity > OLD.quantity THEN
        PERFORM deduct_ingredients_for_order_item(
            NEW.id,
            NEW.menu_item_id,
            NEW.quantity - OLD.quantity,
            NEW.updated_by
        );
    -- If quantity decreased, restore ingredients
    ELSIF NEW.quantity < OLD.quantity THEN
        PERFORM restore_ingredients_for_order_item(
            NEW.id,
            NEW.menu_item_id,
            OLD.quantity - NEW.quantity,
            NEW.updated_by
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_order_item_quantity_change
    AFTER UPDATE ON order_items
    FOR EACH ROW
    WHEN (OLD.quantity IS DISTINCT FROM NEW.quantity)
    EXECUTE FUNCTION handle_order_item_quantity_change();

-- Create views for monitoring
CREATE OR REPLACE VIEW ingredient_stock_status AS
SELECT 
    i.id,
    i.name,
    i.description,
    i.unit,
    i.current_stock,
    i.min_stock_threshold,
    i.max_stock_threshold,
    i.cost_per_unit,
    i.supplier,
    i.category,
    i.storage_location,
    i.expiry_date,
    i.is_active,
    CASE 
        WHEN i.current_stock <= 0 THEN 'out_of_stock'
        WHEN i.current_stock <= i.min_stock_threshold THEN 'low_stock'
        WHEN i.max_stock_threshold IS NOT NULL AND i.current_stock > i.max_stock_threshold THEN 'overstocked'
        ELSE 'sufficient'
    END as stock_status,
    CASE 
        WHEN i.min_stock_threshold > 0 THEN 
            ROUND((i.current_stock / i.min_stock_threshold) * 100, 2)
        ELSE 100
    END as stock_percentage
FROM ingredients i
WHERE i.is_active = true;

CREATE OR REPLACE VIEW active_stock_alerts AS
SELECT 
    sa.id,
    sa.ingredient_id,
    i.name as ingredient_name,
    i.unit,
    sa.alert_type,
    sa.current_stock,
    sa.threshold_value,
    sa.message,
    sa.created_at,
    sa.is_resolved,
    sa.resolved_at
FROM stock_alerts sa
JOIN ingredients i ON i.id = sa.ingredient_id
WHERE sa.is_resolved = false
ORDER BY sa.created_at DESC;

-- Success message
SELECT 'Ingredient stock management system installed successfully!' as message;
