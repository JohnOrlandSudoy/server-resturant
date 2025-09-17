-- =====================================================
-- DATABASE RESTORATION SCRIPT
-- =====================================================
-- This script helps restore your database to the current version
-- by removing any ingredient deduction system components
-- =====================================================

-- 1. DROP INGREDIENT DEDUCTION SYSTEM VIEWS
-- =====================================================
DROP VIEW IF EXISTS menu_items_availability CASCADE;
DROP VIEW IF EXISTS menu_items_availability_with_categories CASCADE;
DROP VIEW IF EXISTS ingredient_stock_status CASCADE;
DROP VIEW IF EXISTS active_stock_alerts CASCADE;

-- 2. DROP INGREDIENT DEDUCTION SYSTEM FUNCTIONS
-- =====================================================
DROP FUNCTION IF EXISTS check_ingredient_availability(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS deduct_ingredients_for_order_item(UUID, UUID, INTEGER, UUID) CASCADE;
DROP FUNCTION IF EXISTS restore_ingredients_for_order_item(UUID, UUID, INTEGER, UUID) CASCADE;
DROP FUNCTION IF EXISTS create_stock_alert_if_needed(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS get_menu_item_availability(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_menu_items_with_categories() CASCADE;

-- 3. DROP INGREDIENT DEDUCTION SYSTEM TRIGGERS
-- =====================================================
DROP TRIGGER IF EXISTS deduct_ingredients_on_order_item_insert ON order_items CASCADE;
DROP TRIGGER IF EXISTS restore_ingredients_on_order_item_delete ON order_items CASCADE;
DROP TRIGGER IF EXISTS handle_order_item_quantity_change ON order_items CASCADE;

-- 4. DROP INGREDIENT DEDUCTION SYSTEM TRIGGER FUNCTIONS
-- =====================================================
DROP FUNCTION IF EXISTS trigger_deduct_ingredients_on_order_item_insert() CASCADE;
DROP FUNCTION IF EXISTS trigger_restore_ingredients_on_order_item_delete() CASCADE;
DROP FUNCTION IF EXISTS trigger_handle_order_item_quantity_change() CASCADE;

-- 5. VERIFY CLEANUP
-- =====================================================
-- Check that no ingredient deduction system components remain
SELECT 'Checking for remaining ingredient deduction system components...' as status;

-- Check for views
SELECT 'Views remaining:' as check_type, schemaname, viewname 
FROM pg_views 
WHERE viewname IN ('menu_items_availability', 'ingredient_stock_status', 'active_stock_alerts')
AND schemaname = 'public';

-- Check for functions
SELECT 'Functions remaining:' as check_type, proname 
FROM pg_proc 
WHERE proname IN (
    'check_ingredient_availability',
    'deduct_ingredients_for_order_item', 
    'restore_ingredients_for_order_item',
    'create_stock_alert_if_needed',
    'get_menu_item_availability',
    'get_menu_items_with_categories'
);

-- Check for triggers
SELECT 'Triggers remaining:' as check_type, trigger_name, event_object_table
FROM information_schema.triggers 
WHERE trigger_name IN (
    'deduct_ingredients_on_order_item_insert',
    'restore_ingredients_on_order_item_delete', 
    'handle_order_item_quantity_change'
);

-- 6. FINAL STATUS
-- =====================================================
SELECT 'Database restoration completed successfully!' as result;
SELECT 'Your database is now restored to the current version without ingredient deduction system.' as message;
