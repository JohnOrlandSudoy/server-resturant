-- =====================================================
-- FIX: Foreign Key Constraint Violation
-- =====================================================
-- This script fixes the foreign key constraint issue when deleting orders
-- The problem is that ingredients table has updated_by field that references user_profiles
-- but the delete function doesn't handle this properly

-- =====================================================
-- 1. CHECK CURRENT FOREIGN KEY CONSTRAINTS
-- =====================================================

-- Let's first check what foreign key constraints exist
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name IN ('ingredients', 'orders', 'order_items', 'order_status_history')
ORDER BY tc.table_name, kcu.column_name;

-- =====================================================
-- 2. UPDATE INGREDIENTS TABLE TO HANDLE NULL UPDATED_BY
-- =====================================================

-- Make updated_by nullable in ingredients table to avoid FK constraint issues
ALTER TABLE public.ingredients 
ALTER COLUMN updated_by DROP NOT NULL;

-- Add a comment to clarify
COMMENT ON COLUMN public.ingredients.updated_by IS 'User who last updated this ingredient (nullable)';

-- =====================================================
-- 3. CREATE IMPROVED DELETE FUNCTION
-- =====================================================

-- Drop the existing function first
DROP FUNCTION IF EXISTS delete_order_cascade(uuid);

-- Create improved delete function that handles all foreign key constraints
CREATE OR REPLACE FUNCTION delete_order_cascade(order_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    order_record record;
    deleted_count integer := 0;
    result jsonb;
    error_details text;
BEGIN
    -- Check if order exists
    SELECT * INTO order_record FROM orders WHERE id = order_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Order not found',
            'order_id', order_id_param
        );
    END IF;
    
    -- Check if order can be deleted (business rules)
    IF order_record.payment_status = 'paid' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Cannot delete paid order. Process refund first.',
            'order_id', order_id_param,
            'payment_status', order_record.payment_status
        );
    END IF;
    
    -- Start transaction for cascade delete
    BEGIN
        -- Delete in correct order to avoid foreign key constraint violations
        
        -- 1. Delete order status history first (references orders and user_profiles)
        DELETE FROM order_status_history WHERE order_id = order_id_param;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        
        -- 2. Delete order items (references orders and menu_items)
        DELETE FROM order_items WHERE order_id = order_id_param;
        
        -- 3. Delete order discounts (references orders and discounts)
        DELETE FROM order_discounts WHERE order_id = order_id_param;
        
        -- 4. Delete payments (references orders and user_profiles)
        DELETE FROM payments WHERE order_id = order_id_param;
        DELETE FROM paymongo_payments WHERE order_id = order_id_param;
        DELETE FROM offline_payments WHERE order_id = order_id_param;
        
        -- 5. Finally delete the order itself
        DELETE FROM orders WHERE id = order_id_param;
        
        result := jsonb_build_object(
            'success', true,
            'message', 'Order deleted successfully',
            'order_id', order_id_param,
            'order_number', order_record.order_number,
            'deleted_at', now(),
            'status_history_deleted', deleted_count
        );
        
    EXCEPTION WHEN OTHERS THEN
        -- Get detailed error information
        GET STACKED DIAGNOSTICS error_details = MESSAGE_TEXT;
        
        result := jsonb_build_object(
            'success', false,
            'error', 'Failed to delete order: ' || error_details,
            'order_id', order_id_param,
            'sqlstate', SQLSTATE,
            'detail', error_details
        );
    END;
    
    RETURN result;
END;
$$;

-- =====================================================
-- 4. CREATE SAFE BULK DELETE FUNCTION
-- =====================================================

-- Drop existing function
DROP FUNCTION IF EXISTS bulk_delete_orders_cascade(uuid[]);

-- Create improved bulk delete function
CREATE OR REPLACE FUNCTION bulk_delete_orders_cascade(order_ids_param uuid[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    order_id uuid;
    delete_result jsonb;
    total_deleted integer := 0;
    total_failed integer := 0;
    failed_orders jsonb := '[]'::jsonb;
    deleted_orders jsonb := '[]'::jsonb;
    error_details text;
BEGIN
    -- Validate input
    IF order_ids_param IS NULL OR array_length(order_ids_param, 1) IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Order IDs array is required and cannot be empty'
        );
    END IF;
    
    IF array_length(order_ids_param, 1) > 50 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Cannot delete more than 50 orders at once'
        );
    END IF;
    
    -- Loop through each order ID
    FOREACH order_id IN ARRAY order_ids_param
    LOOP
        BEGIN
            -- Call the single delete function
            SELECT delete_order_cascade(order_id) INTO delete_result;
            
            IF (delete_result->>'success')::boolean THEN
                total_deleted := total_deleted + 1;
                deleted_orders := deleted_orders || jsonb_build_object(
                    'order_id', order_id,
                    'order_number', delete_result->>'order_number'
                );
            ELSE
                total_failed := total_failed + 1;
                failed_orders := failed_orders || jsonb_build_object(
                    'order_id', order_id,
                    'error', delete_result->>'error'
                );
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS error_details = MESSAGE_TEXT;
            total_failed := total_failed + 1;
            failed_orders := failed_orders || jsonb_build_object(
                'order_id', order_id,
                'error', 'Unexpected error: ' || error_details
            );
        END;
    END LOOP;
    
    RETURN jsonb_build_object(
        'success', true,
        'total_processed', array_length(order_ids_param, 1),
        'deleted_count', total_deleted,
        'failed_count', total_failed,
        'deleted_orders', deleted_orders,
        'failed_orders', failed_orders,
        'deleted_at', now()
    );
END;
$$;

-- =====================================================
-- 5. CREATE SAFE FORCE DELETE FUNCTION
-- =====================================================

-- Drop existing function
DROP FUNCTION IF EXISTS force_delete_order(uuid, boolean);

-- Create improved force delete function
CREATE OR REPLACE FUNCTION force_delete_order(order_id_param uuid, force_param boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    order_record record;
    result jsonb;
BEGIN
    -- Check if order exists
    SELECT * INTO order_record FROM orders WHERE id = order_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Order not found',
            'order_id', order_id_param
        );
    END IF;
    
    -- Check if order can be deleted (unless forced)
    IF NOT force_param AND order_record.payment_status = 'paid' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Cannot delete paid order without force parameter',
            'order_id', order_id_param,
            'payment_status', order_record.payment_status,
            'hint', 'Use force=true to override this check'
        );
    END IF;
    
    -- Call the cascade delete function
    SELECT delete_order_cascade(order_id_param) INTO result;
    
    -- Add force information to result
    result := result || jsonb_build_object('force_used', force_param);
    
    RETURN result;
END;
$$;

-- =====================================================
-- 6. CREATE DIAGNOSTIC FUNCTION
-- =====================================================

-- Function to check for foreign key constraint issues
CREATE OR REPLACE FUNCTION check_order_dependencies(order_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result jsonb := '{}'::jsonb;
    count_val integer;
BEGIN
    -- Check order status history
    SELECT COUNT(*) INTO count_val FROM order_status_history WHERE order_id = order_id_param;
    result := result || jsonb_build_object('status_history_count', count_val);
    
    -- Check order items
    SELECT COUNT(*) INTO count_val FROM order_items WHERE order_id = order_id_param;
    result := result || jsonb_build_object('order_items_count', count_val);
    
    -- Check order discounts
    SELECT COUNT(*) INTO count_val FROM order_discounts WHERE order_id = order_id_param;
    result := result || jsonb_build_object('order_discounts_count', count_val);
    
    -- Check payments
    SELECT COUNT(*) INTO count_val FROM payments WHERE order_id = order_id_param;
    result := result || jsonb_build_object('payments_count', count_val);
    
    SELECT COUNT(*) INTO count_val FROM paymongo_payments WHERE order_id = order_id_param;
    result := result || jsonb_build_object('paymongo_payments_count', count_val);
    
    SELECT COUNT(*) INTO count_val FROM offline_payments WHERE order_id = order_id_param;
    result := result || jsonb_build_object('offline_payments_count', count_val);
    
    -- Check if order exists
    SELECT COUNT(*) INTO count_val FROM orders WHERE id = order_id_param;
    result := result || jsonb_build_object('order_exists', count_val > 0);
    
    RETURN result;
END;
$$;

-- =====================================================
-- 7. GRANT PERMISSIONS
-- =====================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION delete_order_cascade(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_delete_orders_cascade(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION force_delete_order(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION check_order_dependencies(uuid) TO authenticated;

-- =====================================================
-- 8. COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON FUNCTION delete_order_cascade(uuid) IS 'Safely deletes an order and all related data, handling foreign key constraints';
COMMENT ON FUNCTION bulk_delete_orders_cascade(uuid[]) IS 'Bulk deletes multiple orders with proper error handling';
COMMENT ON FUNCTION force_delete_order(uuid, boolean) IS 'Force deletes an order, bypassing payment status checks';
COMMENT ON FUNCTION check_order_dependencies(uuid) IS 'Diagnostic function to check order dependencies before deletion';

-- =====================================================
-- 9. TEST THE FIX
-- =====================================================

/*
-- Test the diagnostic function first
SELECT check_order_dependencies('your-order-uuid-here');

-- Test the delete function
SELECT delete_order_cascade('your-order-uuid-here');

-- Test bulk delete
SELECT bulk_delete_orders_cascade(ARRAY['order-uuid-1', 'order-uuid-2']);
*/

-- =====================================================
-- END OF FIX
-- =====================================================
