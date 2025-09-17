-- =====================================================
-- TEST: Fixed Ingredient Functions
-- =====================================================
-- Run this after executing complete-fix-ingredient-functions.sql
-- =====================================================

-- Test 1: Check if functions exist
SELECT '=== TEST 1: Function Existence ===' as test_section;

SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_name LIKE '%ingredient%' 
AND routine_schema = 'public'
ORDER BY routine_name;

-- Test 2: Test get_menu_item_availability function with COKE MISMO
SELECT '=== TEST 2: Menu Item Availability - COKE MISMO ===' as test_section;

SELECT * FROM get_menu_item_availability(
    'f86c5c73-ccfc-451e-8383-ff69db8a15d9'::uuid, 
    1
);

-- Test 3: Test get_menu_item_availability function with ROYAL MISMO
SELECT '=== TEST 3: Menu Item Availability - ROYAL MISMO ===' as test_section;

SELECT * FROM get_menu_item_availability(
    'b23d9602-e150-4a67-a320-6f7f24c5d62b'::uuid, 
    1
);

-- Test 4: Check menu item ingredients
SELECT '=== TEST 4: Menu Item Ingredients ===' as test_section;

SELECT 
    mi.id,
    mi.name,
    COUNT(mii.id) as ingredient_count,
    CASE 
        WHEN COUNT(mii.id) = 0 THEN 'No ingredients required'
        ELSE 'Has ingredients'
    END as status
FROM menu_items mi
LEFT JOIN menu_item_ingredients mii ON mii.menu_item_id = mi.id
WHERE mi.id IN ('f86c5c73-ccfc-451e-8383-ff69db8a15d9', 'b23d9602-e150-4a67-a320-6f7f24c5d62b')
GROUP BY mi.id, mi.name
ORDER BY mi.name;

-- Test 5: Check ingredients table
SELECT '=== TEST 5: Ingredients Table ===' as test_section;

SELECT 
    id,
    name,
    current_stock,
    min_stock_threshold,
    unit,
    is_active
FROM ingredients
WHERE is_active = true
LIMIT 5;

-- Test 6: Test check_ingredient_availability function (if menu item has ingredients)
SELECT '=== TEST 6: Check Ingredient Availability ===' as test_section;

-- This will only work if the menu item has ingredients
SELECT * FROM check_ingredient_availability(
    'f86c5c73-ccfc-451e-8383-ff69db8a15d9'::uuid, 
    1
);

-- Final success message
SELECT '=== ALL TESTS COMPLETED ===' as final_status;
