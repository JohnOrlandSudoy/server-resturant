-- Test script to verify ingredient functions work correctly

-- Test 1: Check if functions exist
SELECT 'Testing function existence...' as test_step;

SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name LIKE '%ingredient%' 
AND routine_schema = 'public';

-- Test 2: Test get_menu_item_availability function with COKE MISMO
SELECT 'Testing get_menu_item_availability with COKE MISMO...' as test_step;

SELECT * FROM get_menu_item_availability(
    'f86c5c73-ccfc-451e-8383-ff69db8a15d9'::uuid, 
    1
);

-- Test 3: Test get_menu_item_availability function with ROYAL MISMO
SELECT 'Testing get_menu_item_availability with ROYAL MISMO...' as test_step;

SELECT * FROM get_menu_item_availability(
    'b23d9602-e150-4a67-a320-6f7f24c5d62b'::uuid, 
    1
);

-- Test 4: Check if menu items have ingredients
SELECT 'Checking menu item ingredients...' as test_step;

SELECT 
    mi.id,
    mi.name,
    COUNT(mii.id) as ingredient_count
FROM menu_items mi
LEFT JOIN menu_item_ingredients mii ON mii.menu_item_id = mi.id
WHERE mi.id IN ('f86c5c73-ccfc-451e-8383-ff69db8a15d9', 'b23d9602-e150-4a67-a320-6f7f24c5d62b')
GROUP BY mi.id, mi.name;

-- Test 5: Check ingredients table
SELECT 'Checking ingredients table...' as test_step;

SELECT 
    id,
    name,
    current_stock,
    min_stock_threshold,
    unit,
    is_active
FROM ingredients
LIMIT 5;

-- Test 6: Check menu_item_ingredients table
SELECT 'Checking menu_item_ingredients table...' as test_step;

SELECT 
    mii.id,
    mi.name as menu_item_name,
    i.name as ingredient_name,
    mii.quantity_required,
    mii.unit,
    mii.is_optional
FROM menu_item_ingredients mii
JOIN menu_items mi ON mi.id = mii.menu_item_id
JOIN ingredients i ON i.id = mii.ingredient_id
LIMIT 5;
