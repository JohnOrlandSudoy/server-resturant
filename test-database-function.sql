-- =====================================================
-- TEST DATABASE FUNCTION
-- =====================================================
-- This script tests if the get_menu_item_availability function exists
-- and works correctly
-- =====================================================

-- 1. Check if the function exists
SELECT 
    routine_name,
    routine_type,
    data_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'get_menu_item_availability' 
AND routine_schema = 'public';

-- 2. Test the function with a sample menu item
-- Replace 'YOUR_MENU_ITEM_ID' with an actual menu item ID from your database
SELECT * FROM get_menu_item_availability(
    'b23d9602-e150-4a67-a320-6f7f24c5d62b'::UUID, 
    1
);

-- 3. Check if there are any order items for the test order
SELECT 
    oi.id,
    oi.order_id,
    oi.menu_item_id,
    oi.quantity,
    mi.name as menu_item_name
FROM order_items oi
JOIN menu_items mi ON oi.menu_item_id = mi.id
WHERE oi.order_id = '83aeeffc-3d87-4e84-94c8-23de37c57871';

-- 4. Check if the menu item has ingredients
SELECT 
    mi.id,
    mi.name,
    COUNT(mii.id) as ingredient_count
FROM menu_items mi
LEFT JOIN menu_item_ingredients mii ON mi.id = mii.menu_item_id
WHERE mi.id = 'b23d9602-e150-4a67-a320-6f7f24c5d62b'
GROUP BY mi.id, mi.name;

-- 5. Check ingredients table
SELECT 
    id,
    name,
    current_stock,
    min_stock_threshold,
    is_active
FROM ingredients 
WHERE is_active = true
LIMIT 5;
