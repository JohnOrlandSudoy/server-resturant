-- =====================================================
-- Fix Ambiguous Column Reference in Menu Availability Trigger
-- The trigger function has ambiguous "is_available" column references
-- =====================================================

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS trigger_update_menu_availability ON public.ingredients;
DROP FUNCTION IF EXISTS update_menu_availability();

-- Recreate the function with proper table aliases
CREATE OR REPLACE FUNCTION update_menu_availability()
RETURNS TRIGGER AS $$
DECLARE
    menu_item_id UUID;
    required_ingredient_id UUID;
    required_quantity DECIMAL(10,3);
    available_stock DECIMAL(10,3);
    menu_available BOOLEAN := true;
BEGIN
    -- Get all menu items that use this ingredient
    FOR menu_item_id, required_quantity IN 
        SELECT mii.menu_item_id, mii.quantity_required
        FROM public.menu_item_ingredients mii
        WHERE mii.ingredient_id = NEW.id AND mii.is_optional = false
    LOOP
        -- Check if we have enough stock for this menu item
        IF NEW.current_stock < required_quantity THEN
            menu_available := false;
            EXIT;
        END IF;
    END LOOP;
    
    -- Update menu item availability with proper table alias
    UPDATE public.menu_items 
    SET is_available = menu_available,
        updated_at = NOW()
    WHERE id IN (
        SELECT mii.menu_item_id
        FROM public.menu_item_ingredients mii
        WHERE mii.ingredient_id = NEW.id
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER trigger_update_menu_availability
    AFTER UPDATE OF current_stock ON public.ingredients
    FOR EACH ROW
    EXECUTE FUNCTION update_menu_availability();

-- =====================================================
-- END OF TRIGGER FIX
-- =====================================================
