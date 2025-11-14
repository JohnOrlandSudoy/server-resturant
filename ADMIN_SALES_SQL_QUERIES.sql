-- ============================================================================
-- ADMIN SALES API - DIRECT SQL QUERIES
-- ============================================================================
-- Use these queries directly on your Supabase database
-- You can run them in Supabase SQL Editor or copy into your SQL client
-- ============================================================================

-- ============================================================================
-- QUERY 1: Get Best Sellers This Week (Using Existing Tables)
-- ============================================================================
-- Returns the top 10 best-selling menu items for the current week
-- Based on order_items joined with orders table
-- 
-- USAGE: Copy and paste into Supabase SQL Editor
-- ============================================================================
SELECT 
  ROW_NUMBER() OVER (ORDER BY SUM(oi.quantity) DESC) as rank,
  oi.menu_item_id,
  mi.name as menu_item_name,
  mi.category_id,
  mc.name as category_name,
  SUM(oi.quantity) as total_quantity,
  SUM(oi.total_price) as total_revenue,
  ROUND(SUM(oi.total_price) / 7.0, 2) as average_daily_sales
FROM order_items oi
INNER JOIN orders o ON oi.order_id = o.id
INNER JOIN menu_items mi ON oi.menu_item_id = mi.id
LEFT JOIN menu_categories mc ON mi.category_id = mc.id
WHERE 
  -- Current week (ISO week number)
  EXTRACT(WEEK FROM o.created_at::date) = EXTRACT(WEEK FROM CURRENT_DATE)
  AND EXTRACT(YEAR FROM o.created_at::date) = EXTRACT(YEAR FROM CURRENT_DATE)
  -- Only completed paid orders
  AND o.status = 'completed'
  AND o.payment_status = 'paid'
GROUP BY oi.menu_item_id, mi.name, mi.category_id, mc.name
ORDER BY total_quantity DESC
LIMIT 10;

-- ============================================================================
-- QUERY 2: Get Best Sellers for Specific Week
-- ============================================================================
-- Returns best sellers for a specific week and year
-- Replace $1, $2 with actual week and year values
-- Example: SELECT ... WHERE week_number = 45 AND year_number = 2025;
-- ============================================================================
SELECT 
  ROW_NUMBER() OVER (ORDER BY SUM(oi.quantity) DESC) as rank,
  oi.menu_item_id,
  mi.name as menu_item_name,
  mi.category_id,
  mc.name as category_name,
  SUM(oi.quantity) as total_quantity,
  SUM(oi.total_price) as total_revenue,
  ROUND(SUM(oi.total_price) / 7.0, 2) as average_daily_sales
FROM order_items oi
INNER JOIN orders o ON oi.order_id = o.id
INNER JOIN menu_items mi ON oi.menu_item_id = mi.id
LEFT JOIN menu_categories mc ON mi.category_id = mc.id
WHERE 
  -- Specific week (replace with actual week and year)
  EXTRACT(WEEK FROM o.created_at::date) = 45  -- Replace 45 with desired week number
  AND EXTRACT(YEAR FROM o.created_at::date) = 2025  -- Replace 2025 with desired year
  AND o.status = 'completed'
  AND o.payment_status = 'paid'
GROUP BY oi.menu_item_id, mi.name, mi.category_id, mc.name
ORDER BY total_quantity DESC;

-- ============================================================================
-- QUERY 3: Get Best Sellers This Month (Bonus)
-- ============================================================================
-- Returns top 10 best-selling items for current month
-- ============================================================================
SELECT 
  ROW_NUMBER() OVER (ORDER BY SUM(oi.quantity) DESC) as rank,
  oi.menu_item_id,
  mi.name as menu_item_name,
  SUM(oi.quantity) as total_quantity,
  SUM(oi.total_price) as total_revenue
FROM order_items oi
INNER JOIN orders o ON oi.order_id = o.id
INNER JOIN menu_items mi ON oi.menu_item_id = mi.id
WHERE 
  EXTRACT(MONTH FROM o.created_at::date) = EXTRACT(MONTH FROM CURRENT_DATE)
  AND EXTRACT(YEAR FROM o.created_at::date) = EXTRACT(YEAR FROM CURRENT_DATE)
  AND o.status = 'completed'
  AND o.payment_status = 'paid'
GROUP BY oi.menu_item_id, mi.name
ORDER BY total_quantity DESC
LIMIT 10;

-- ============================================================================
-- QUERY 4: Get All Sales Records with Details
-- ============================================================================
-- Returns all sales records with order and payment details
-- Can be filtered by date range or payment status
-- ============================================================================
SELECT 
  o.id as order_id,
  o.order_number,
  o.created_at::date as sale_date,
  o.created_at::time as sale_time,
  oi.menu_item_id,
  mi.name as menu_item_name,
  oi.quantity,
  oi.unit_price,
  oi.total_price,
  (o.discount_amount * oi.total_price / o.total_amount) as estimated_item_discount,
  (oi.total_price - (o.discount_amount * oi.total_price / o.total_amount)) as net_amount,
  o.customer_name,
  o.order_type,
  o.payment_method,
  o.payment_status,
  EXTRACT(HOUR FROM o.created_at) as hour_of_day,
  EXTRACT(DOW FROM o.created_at) as day_of_week,
  EXTRACT(WEEK FROM o.created_at) as week_number,
  EXTRACT(MONTH FROM o.created_at) as month_number,
  EXTRACT(YEAR FROM o.created_at) as year_number
FROM order_items oi
INNER JOIN orders o ON oi.order_id = o.id
INNER JOIN menu_items mi ON oi.menu_item_id = mi.id
WHERE 
  o.status = 'completed'
  AND o.payment_status = 'paid'
  -- Optional: Add date range filter
  -- AND o.created_at::date BETWEEN '2025-01-01' AND '2025-01-31'
ORDER BY o.created_at DESC;

-- ============================================================================
-- QUERY 5: Get Sales Records by Date Range
-- ============================================================================
-- Returns sales records between two dates
-- Replace start_date and end_date with actual dates
-- ============================================================================
SELECT 
  o.order_number,
  o.created_at::date as sale_date,
  oi.menu_item_id,
  mi.name as menu_item_name,
  oi.quantity,
  oi.unit_price,
  oi.total_price,
  o.payment_method,
  o.payment_status,
  o.customer_name
FROM order_items oi
INNER JOIN orders o ON oi.order_id = o.id
INNER JOIN menu_items mi ON oi.menu_item_id = mi.id
WHERE 
  o.status = 'completed'
  AND o.payment_status = 'paid'
  AND o.created_at::date BETWEEN '2025-01-01' AND '2025-01-31'  -- Replace dates
ORDER BY o.created_at DESC;

-- ============================================================================
-- QUERY 6: Daily Sales Summary
-- ============================================================================
-- Returns total sales, orders, items, and revenue for a specific date
-- Replace date in WHERE clause
-- ============================================================================
SELECT 
  o.created_at::date as sale_date,
  COUNT(DISTINCT o.id) as total_orders,
  SUM(oi.quantity) as total_items_sold,
  ROUND(SUM(o.total_amount)::numeric, 2) as total_revenue,
  ROUND(SUM(o.discount_amount)::numeric, 2) as total_discount,
  ROUND((SUM(o.total_amount) - SUM(o.discount_amount))::numeric, 2) as net_revenue,
  ROUND(SUM(CASE WHEN o.payment_method = 'cash' THEN o.total_amount ELSE 0 END)::numeric, 2) as cash_sales,
  ROUND(SUM(CASE WHEN o.payment_method = 'gcash' THEN o.total_amount ELSE 0 END)::numeric, 2) as gcash_sales,
  ROUND(SUM(CASE WHEN o.payment_method = 'card' THEN o.total_amount ELSE 0 END)::numeric, 2) as card_sales,
  ROUND(SUM(CASE WHEN o.payment_method = 'paymongo' THEN o.total_amount ELSE 0 END)::numeric, 2) as paymongo_sales,
  ROUND((SUM(o.total_amount) / COUNT(DISTINCT o.id))::numeric, 2) as average_order_value
FROM orders o
INNER JOIN order_items oi ON o.id = oi.order_id
WHERE 
  o.status = 'completed'
  AND o.payment_status = 'paid'
  AND o.created_at::date = CURRENT_DATE  -- Replace CURRENT_DATE with '2025-01-15' for specific date
GROUP BY o.created_at::date;

-- ============================================================================
-- QUERY 7: Hourly Sales Summary
-- ============================================================================
-- Returns sales breakdown by hour of day
-- Useful for identifying peak hours
-- ============================================================================
SELECT 
  o.created_at::date as sale_date,
  EXTRACT(HOUR FROM o.created_at) as hour_of_day,
  COUNT(DISTINCT o.id) as total_orders,
  SUM(oi.quantity) as total_items_sold,
  ROUND(SUM(o.total_amount)::numeric, 2) as total_revenue,
  ROUND(SUM(o.discount_amount)::numeric, 2) as total_discount,
  ROUND((SUM(o.total_amount) - SUM(o.discount_amount))::numeric, 2) as net_revenue
FROM orders o
INNER JOIN order_items oi ON o.id = oi.order_id
WHERE 
  o.status = 'completed'
  AND o.payment_status = 'paid'
  AND o.created_at::date = CURRENT_DATE  -- Replace with specific date
GROUP BY o.created_at::date, EXTRACT(HOUR FROM o.created_at)
ORDER BY hour_of_day ASC;

-- ============================================================================
-- QUERY 8: Revenue Analytics by Payment Method
-- ============================================================================
-- Returns revenue breakdown by payment method for date range
-- ============================================================================
SELECT 
  o.payment_method,
  COUNT(DISTINCT o.id) as total_transactions,
  SUM(oi.quantity) as total_items,
  ROUND(SUM(o.total_amount)::numeric, 2) as total_revenue,
  ROUND(SUM(o.discount_amount)::numeric, 2) as total_discount,
  ROUND((SUM(o.total_amount) - SUM(o.discount_amount))::numeric, 2) as net_revenue,
  ROUND((SUM(o.total_amount) / COUNT(DISTINCT o.id))::numeric, 2) as avg_transaction_value
FROM orders o
INNER JOIN order_items oi ON o.id = oi.order_id
WHERE 
  o.status = 'completed'
  AND o.payment_status = 'paid'
  AND o.created_at::date BETWEEN '2025-01-01' AND '2025-01-31'  -- Replace dates
GROUP BY o.payment_method
ORDER BY total_revenue DESC;

-- ============================================================================
-- QUERY 9: Category Performance (Top Categories by Revenue)
-- ============================================================================
-- Shows which product categories generate the most revenue
-- ============================================================================
SELECT 
  mc.id as category_id,
  mc.name as category_name,
  COUNT(DISTINCT o.id) as total_orders,
  SUM(oi.quantity) as total_items_sold,
  ROUND(SUM(oi.total_price)::numeric, 2) as total_revenue,
  ROUND((SUM(oi.total_price) / COUNT(DISTINCT o.id))::numeric, 2) as avg_order_value
FROM order_items oi
INNER JOIN orders o ON oi.order_id = o.id
INNER JOIN menu_items mi ON oi.menu_item_id = mi.id
INNER JOIN menu_categories mc ON mi.category_id = mc.id
WHERE 
  o.status = 'completed'
  AND o.payment_status = 'paid'
  AND o.created_at::date BETWEEN '2025-01-01' AND '2025-01-31'  -- Replace dates
GROUP BY mc.id, mc.name
ORDER BY total_revenue DESC;

-- ============================================================================
-- QUERY 10: Week-over-Week Best Sellers Comparison
-- ============================================================================
-- Compare top sellers between two consecutive weeks
-- ============================================================================
SELECT 
  CASE WHEN EXTRACT(WEEK FROM o.created_at) = 45 THEN 'Week 45' ELSE 'Week 46' END as week_label,
  ROW_NUMBER() OVER (PARTITION BY EXTRACT(WEEK FROM o.created_at) ORDER BY SUM(oi.quantity) DESC) as rank,
  mi.name as menu_item_name,
  SUM(oi.quantity) as total_quantity,
  ROUND(SUM(oi.total_price)::numeric, 2) as total_revenue
FROM order_items oi
INNER JOIN orders o ON oi.order_id = o.id
INNER JOIN menu_items mi ON oi.menu_item_id = mi.id
WHERE 
  o.status = 'completed'
  AND o.payment_status = 'paid'
  AND EXTRACT(WEEK FROM o.created_at) IN (45, 46)  -- Replace week numbers
  AND EXTRACT(YEAR FROM o.created_at) = 2025  -- Replace year
GROUP BY EXTRACT(WEEK FROM o.created_at), mi.name, mi.id
ORDER BY EXTRACT(WEEK FROM o.created_at), rank
LIMIT 20;

-- ============================================================================
-- BONUS QUERY 11: Sales by Item Category - Daily Breakdown
-- ============================================================================
-- Track how each category performs daily
-- ============================================================================
SELECT 
  o.created_at::date as sale_date,
  mc.name as category_name,
  SUM(oi.quantity) as total_items,
  ROUND(SUM(oi.total_price)::numeric, 2) as total_revenue
FROM order_items oi
INNER JOIN orders o ON oi.order_id = o.id
INNER JOIN menu_items mi ON oi.menu_item_id = mi.id
INNER JOIN menu_categories mc ON mi.category_id = mc.id
WHERE 
  o.status = 'completed'
  AND o.payment_status = 'paid'
  AND o.created_at::date BETWEEN '2025-01-01' AND '2025-01-31'  -- Replace dates
GROUP BY o.created_at::date, mc.name
ORDER BY o.created_at::date DESC, total_revenue DESC;

-- ============================================================================
-- BONUS QUERY 12: Top Customers by Revenue
-- ============================================================================
-- Identify top customers (if customer_name is tracked)
-- ============================================================================
SELECT 
  o.customer_name,
  COUNT(o.id) as total_orders,
  ROUND(SUM(o.total_amount)::numeric, 2) as total_spent,
  ROUND((SUM(o.total_amount) / COUNT(o.id))::numeric, 2) as average_order_value,
  MAX(o.created_at) as last_order_date
FROM orders o
WHERE 
  o.status = 'completed'
  AND o.payment_status = 'paid'
  AND o.customer_name IS NOT NULL
  AND o.created_at::date BETWEEN '2025-01-01' AND '2025-01-31'  -- Replace dates
GROUP BY o.customer_name
ORDER BY total_spent DESC
LIMIT 20;
