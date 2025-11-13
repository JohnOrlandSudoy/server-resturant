-- =====================================================
-- UPDATE SCHEMA: Remove reason requirement for deleting orders
-- =====================================================
-- This script updates the existing schema to allow order deletion
-- without requiring a reason field, making the delete operations simpler

-- =====================================================
-- 1. UPDATE ORDER_STATUS_HISTORY TABLE
-- =====================================================
-- Make notes field optional (nullable) instead of required
-- This allows order status changes without requiring a reason

ALTER TABLE public.order_status_history 
ALTER COLUMN notes DROP NOT NULL;

-- Add a comment to clarify the field is optional
COMMENT ON COLUMN public.order_status_history.notes IS 'Optional notes for status change (can be null)';

-- =====================================================
-- 2. CREATE ENHANCED DELETE FUNCTIONS
-- =====================================================

-- Function to delete order with all related data (cascade delete)
CREATE OR REPLACE FUNCTION delete_order_cascade(order_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    order_record record;
    deleted_count integer := 0;
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
        -- Delete order status history
        DELETE FROM order_status_history WHERE order_id = order_id_param;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        
        -- Delete order items
        DELETE FROM order_items WHERE order_id = order_id_param;
        
        -- Delete order discounts
        DELETE FROM order_discounts WHERE order_id = order_id_param;
        
        -- Delete payments (if any)
        DELETE FROM payments WHERE order_id = order_id_param;
        DELETE FROM paymongo_payments WHERE order_id = order_id_param;
        DELETE FROM offline_payments WHERE order_id = order_id_param;
        
        -- Finally delete the order
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
        result := jsonb_build_object(
            'success', false,
            'error', 'Failed to delete order: ' || SQLERRM,
            'order_id', order_id_param
        );
    END;
    
    RETURN result;
END;
$$;

-- Function for bulk delete orders
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
BEGIN
    -- Loop through each order ID
    FOREACH order_id IN ARRAY order_ids_param
    LOOP
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
-- 3. CREATE SIMPLIFIED ORDER CANCELLATION FUNCTION
-- =====================================================

-- Function to cancel order without requiring reason
CREATE OR REPLACE FUNCTION cancel_order_simple(order_id_param uuid, updated_by_param uuid)
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
    
    -- Check if order can be cancelled
    IF order_record.status = 'completed' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Cannot cancel completed order',
            'order_id', order_id_param,
            'current_status', order_record.status
        );
    END IF;
    
    IF order_record.payment_status = 'paid' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Cannot cancel paid order. Process refund first.',
            'order_id', order_id_param,
            'payment_status', order_record.payment_status
        );
    END IF;
    
    -- Update order status to cancelled
    UPDATE orders 
    SET 
        status = 'cancelled',
        updated_by = updated_by_param,
        updated_at = now()
    WHERE id = order_id_param;
    
    -- Record status change in history (without requiring notes)
    INSERT INTO order_status_history (order_id, status, updated_by)
    VALUES (order_id_param, 'cancelled', updated_by_param);
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Order cancelled successfully',
        'order_id', order_id_param,
        'order_number', order_record.order_number,
        'old_status', order_record.status,
        'new_status', 'cancelled',
        'updated_at', now()
    );
END;
$$;

-- =====================================================
-- 4. CREATE ADMIN DELETE FUNCTIONS WITH FORCE OPTION
-- =====================================================

-- Function to force delete order (bypasses payment status check)
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
-- 5. CREATE VIEWS FOR DELETED ORDERS AUDIT
-- =====================================================

-- View to track order deletion history (if you want to implement soft deletes later)
CREATE OR REPLACE VIEW order_deletion_audit AS
SELECT 
    o.id,
    o.order_number,
    o.customer_name,
    o.status,
    o.payment_status,
    o.total_amount,
    o.created_at,
    o.updated_at,
    o.updated_by,
    up.username as updated_by_username,
    'deleted' as audit_action,
    now() as audit_timestamp
FROM orders o
LEFT JOIN user_profiles up ON o.updated_by = up.id
WHERE o.status = 'cancelled' OR o.payment_status = 'cancelled';

-- =====================================================
-- 6. GRANT PERMISSIONS
-- =====================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION delete_order_cascade(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_delete_orders_cascade(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_order_simple(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION force_delete_order(uuid, boolean) TO authenticated;

-- Grant select on the audit view
GRANT SELECT ON order_deletion_audit TO authenticated;

-- =====================================================
-- 7. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Index for order status history lookups
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_updated_by ON order_status_history(updated_by);
CREATE INDEX IF NOT EXISTS idx_order_status_history_created_at ON order_status_history(created_at);

-- Index for order lookups
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_by ON orders(created_by);
CREATE INDEX IF NOT EXISTS idx_orders_updated_by ON orders(updated_by);

-- =====================================================
-- 8. COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON FUNCTION delete_order_cascade(uuid) IS 'Deletes an order and all related data (cascade delete)';
COMMENT ON FUNCTION bulk_delete_orders_cascade(uuid[]) IS 'Bulk deletes multiple orders and their related data';
COMMENT ON FUNCTION cancel_order_simple(uuid, uuid) IS 'Cancels an order without requiring a reason';
COMMENT ON FUNCTION force_delete_order(uuid, boolean) IS 'Force deletes an order, bypassing payment status checks';
COMMENT ON VIEW order_deletion_audit IS 'Audit view for tracking order deletions and cancellations';

-- =====================================================
-- 9. EXAMPLE USAGE
-- =====================================================

/*
-- Example 1: Delete a single order
SELECT delete_order_cascade('order-uuid-here');

-- Example 2: Bulk delete orders
SELECT bulk_delete_orders_cascade(ARRAY['order-uuid-1', 'order-uuid-2', 'order-uuid-3']);

-- Example 3: Cancel an order
SELECT cancel_order_simple('order-uuid-here', 'user-uuid-here');

-- Example 4: Force delete a paid order
SELECT force_delete_order('order-uuid-here', true);

-- Example 5: Check deletion audit
SELECT * FROM order_deletion_audit WHERE order_number = 'ORD-001';
*/

-- =====================================================
-- END OF SCHEMA UPDATE
-- =====================================================
