-- =====================================================
-- DEBUG INGREDIENT ISSUE
-- =====================================================
-- This script helps debug why menu items show as unavailable
-- even when they should be available
-- =====================================================

-- 1. Check if the menu item exists and is active
SELECT 
    id,
    name,
    is_available,
    is_active,
    price
FROM menu_items 
WHERE id = 'b23d9602-e150-4a67-a320-6f7f24c5d62b';

-- 2. Check if the menu item has any ingredients defined
SELECT 
    mii.id,
    mii.menu_item_id,
    mii.ingredient_id,
    mii.quantity_required,
    mii.unit,
    mii.is_optional,
    i.name as ingredient_name,
    i.current_stock,
    i.min_stock_threshold,
    i.is_active as ingredient_active
FROM menu_item_ingredients mii
JOIN ingredients i ON mii.ingredient_id = i.id
WHERE mii.menu_item_id = 'b23d9602-e150-4a67-a320-6f7f24c5d62b';

-- 3. Check all ingredients in the system
SELECT 
    id,
    name,
    current_stock,
    min_stock_threshold,
    unit,
    is_active
FROM ingredients 
WHERE is_active = true
ORDER BY name;

-- 4. Test the availability function directly
SELECT * FROM get_menu_item_availability(
    'b23d9602-e150-4a67-a320-6f7f24c5d62b'::UUID, 
    1
);

-- 5. Check if there are any menu items with ingredients
SELECT 
    mi.id,
    mi.name,
    COUNT(mii.id) as ingredient_count
FROM menu_items mi
LEFT JOIN menu_item_ingredients mii ON mi.id = mii.menu_item_id
WHERE mi.is_active = true
GROUP BY mi.id, mi.name
ORDER BY ingredient_count DESC;

-- 6. Check stock alerts to see if any ingredients are flagged
SELECT 
    sa.alert_type,
    sa.message,
    i.name as ingredient_name,
    i.current_stock,
    i.min_stock_threshold
FROM stock_alerts sa
JOIN ingredients i ON sa.ingredient_id = i.id
WHERE sa.is_resolved = false
ORDER BY sa.created_at DESC;

