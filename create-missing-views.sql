-- =====================================================
-- CREATE MISSING VIEWS FOR ORDER MANAGEMENT
-- Run this script in your Supabase SQL editor
-- =====================================================

-- View for order summary with customer info
CREATE OR REPLACE VIEW order_summary AS
SELECT 
    o.id,
    o.order_number,
    o.customer_name,
    o.customer_phone,
    o.order_type,
    o.status,
    o.payment_status,
    o.payment_method,
    o.subtotal,
    o.discount_amount,
    o.tax_amount,
    o.total_amount,
    o.table_number,
    o.special_instructions,
    o.estimated_prep_time,
    o.actual_prep_time,
    o.created_at,
    o.completed_at,
    creator.username as created_by_username,
    creator.first_name as created_by_first_name,
    creator.last_name as created_by_last_name,
    updater.username as updated_by_username,
    updater.first_name as updated_by_first_name,
    updater.last_name as updated_by_last_name
FROM public.orders o
LEFT JOIN public.user_profiles creator ON o.created_by = creator.id
LEFT JOIN public.user_profiles updater ON o.updated_by = updater.id;

-- View for order items with menu details
CREATE OR REPLACE VIEW order_items_detail AS
SELECT 
    oi.id,
    oi.order_id,
    oi.menu_item_id,
    oi.quantity,
    oi.unit_price,
    oi.total_price,
    oi.customizations,
    oi.special_instructions,
    oi.created_at,
    mi.name as menu_item_name,
    mi.description as menu_item_description,
    mi.image_url as menu_item_image,
    o.order_number,
    o.customer_name,
    o.status as order_status
FROM public.order_items oi
JOIN public.menu_items mi ON oi.menu_item_id = mi.id
JOIN public.orders o ON oi.order_id = o.id;

-- View for kitchen orders (orders that need preparation)
CREATE OR REPLACE VIEW kitchen_orders AS
SELECT 
    o.id,
    o.order_number,
    o.customer_name,
    o.order_type,
    o.status,
    o.table_number,
    o.special_instructions,
    o.estimated_prep_time,
    o.created_at,
    COUNT(oi.id) as item_count,
    STRING_AGG(mi.name, ', ') as menu_items
FROM public.orders o
LEFT JOIN public.order_items oi ON o.id = oi.order_id
LEFT JOIN public.menu_items mi ON oi.menu_item_id = mi.id
WHERE o.status IN ('pending', 'preparing')
GROUP BY o.id, o.order_number, o.customer_name, o.order_type, o.status, o.table_number, o.special_instructions, o.estimated_prep_time, o.created_at
ORDER BY o.created_at ASC;

-- Grant permissions on views
GRANT SELECT ON order_summary TO authenticated;
GRANT SELECT ON order_items_detail TO authenticated;
GRANT SELECT ON kitchen_orders TO authenticated;
