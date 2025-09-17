-- =====================================================
-- TEST SCRIPT: Verify Updated Database
-- =====================================================
-- Run this after executing update-database-with-ingredient-management.sql
-- =====================================================

-- Test 1: Verify functions exist
SELECT '=== TEST 1: Function Existence ===' as test_section;

SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_name LIKE '%ingredient%' 
AND routine_schema = 'public'
ORDER BY routine_name;

-- Test 2: Verify triggers exist
SELECT '=== TEST 2: Trigger Existence ===' as test_section;

SELECT trigger_name, event_object_table, action_timing, event_manipulation
FROM information_schema.triggers 
WHERE trigger_name LIKE '%ingredient%'
ORDER BY trigger_name;

-- Test 3: Verify views exist
SELECT '=== TEST 3: View Existence ===' as test_section;

SELECT table_name, table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('ingredient_stock_status', 'active_stock_alerts')
ORDER BY table_name;

-- Test 4: Test get_menu_item_availability function with COKE MISMO
SELECT '=== TEST 4: Menu Item Availability - COKE MISMO ===' as test_section;

SELECT * FROM get_menu_item_availability(
    'f86c5c73-ccfc-451e-8383-ff69db8a15d9'::uuid, 
    1
);

-- Test 5: Test get_menu_item_availability function with ROYAL MISMO
SELECT '=== TEST 5: Menu Item Availability - ROYAL MISMO ===' as test_section;

SELECT * FROM get_menu_item_availability(
    'b23d9602-e150-4a67-a320-6f7f24c5d62b'::uuid, 
    1
);

-- Test 6: Check menu item ingredients
SELECT '=== TEST 6: Menu Item Ingredients ===' as test_section;

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

-- Test 7: Check ingredients table
SELECT '=== TEST 7: Ingredients Table ===' as test_section;

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

-- Test 8: Check menu_item_ingredients table
SELECT '=== TEST 8: Menu Item Ingredients Table ===' as test_section;

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
WHERE mi.id IN ('f86c5c73-ccfc-451e-8383-ff69db8a15d9', 'b23d9602-e150-4a67-a320-6f7f24c5d62b')
ORDER BY mi.name, i.name;

-- Test 9: Test ingredient stock status view
SELECT '=== TEST 9: Ingredient Stock Status View ===' as test_section;

SELECT 
    id,
    name,
    current_stock,
    min_stock_threshold,
    unit,
    stock_status,
    stock_percentage
FROM ingredient_stock_status
LIMIT 5;

-- Test 10: Test active stock alerts view
SELECT '=== TEST 10: Active Stock Alerts View ===' as test_section;

SELECT 
    id,
    alert_type,
    ingredient_name,
    current_stock,
    threshold_value,
    message,
    created_at
FROM active_stock_alerts
LIMIT 5;

-- Test 11: Test check_ingredient_availability function
SELECT '=== TEST 11: Check Ingredient Availability ===' as test_section;

-- This will only work if the menu item has ingredients
SELECT * FROM check_ingredient_availability(
    'f86c5c73-ccfc-451e-8383-ff69db8a15d9'::uuid, 
    1
);

-- Test 12: Summary
SELECT '=== TEST 12: Summary ===' as test_section;

SELECT 
    'Functions' as component,
    COUNT(*) as count
FROM information_schema.routines 
WHERE routine_name LIKE '%ingredient%' 
AND routine_schema = 'public'

UNION ALL

SELECT 
    'Triggers' as component,
    COUNT(*) as count
FROM information_schema.triggers 
WHERE trigger_name LIKE '%ingredient%'

UNION ALL

SELECT 
    'Views' as component,
    COUNT(*) as count
FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name IN ('ingredient_stock_status', 'active_stock_alerts');

-- Final success message
SELECT '=== ALL TESTS COMPLETED ===' as final_status;
