-- =====================================================
-- Fix Ambiguous Column Reference in deduct_ingredient_stock Function
-- The function has ambiguous "current_stock" column references
-- =====================================================

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS trigger_deduct_ingredient_stock ON public.orders;
DROP FUNCTION IF EXISTS deduct_ingredient_stock();

-- Recreate the function with proper variable naming
CREATE OR REPLACE FUNCTION deduct_ingredient_stock()
RETURNS TRIGGER AS $$
DECLARE
    order_item RECORD;
    ingredient_link RECORD;
    required_quantity DECIMAL(10,3);
    available_stock DECIMAL(10,3); -- Renamed from current_stock to avoid ambiguity
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
                
                -- Get current stock (using proper table alias)
                SELECT i.current_stock INTO available_stock
                FROM public.ingredients i
                WHERE i.id = ingredient_link.ingredient_id;
                
                -- Check if we have enough stock
                IF available_stock < required_quantity THEN
                    RAISE EXCEPTION 'Insufficient stock for ingredient % in menu item %. Required: %, Available: %', 
                        ingredient_link.ingredient_id, order_item.menu_item_id, required_quantity, available_stock;
                END IF;
                
                -- Deduct stock (using proper table alias)
                UPDATE public.ingredients i
                SET 
                    current_stock = i.current_stock - required_quantity,
                    updated_at = NOW()
                WHERE i.id = ingredient_link.ingredient_id;
                
                -- Record stock movement
                INSERT INTO public.stock_movements (
                    ingredient_id,
                    movement_type,
                    quantity,
                    reason,
                    reference_number,
                    notes,
                    performed_by
                ) VALUES (
                    ingredient_link.ingredient_id,
                    'out',
                    required_quantity,
                    'Order preparation',
                    NEW.order_number,
                    'Stock deducted for order ' || NEW.order_number,
                    NEW.updated_by
                );
                
            END LOOP;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER trigger_deduct_ingredient_stock
    AFTER UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION deduct_ingredient_stock();

-- =====================================================
-- END OF TRIGGER FIX
-- =====================================================
