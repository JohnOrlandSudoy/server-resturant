-- Debug Payment Records
-- Run this in your Supabase SQL Editor to check payment data

-- 1. Check if payments table exists and has data
SELECT 
    COUNT(*) as total_payments,
    COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_payments,
    COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending_payments,
    COUNT(CASE WHEN payment_status = 'failed' THEN 1 END) as failed_payments
FROM public.payments;

-- 2. Check recent payment records
SELECT 
    id,
    payment_intent_id,
    order_id,
    amount,
    currency,
    status,
    payment_status,
    payment_method,
    created_at,
    paid_at,
    failed_at,
    error_message
FROM public.payments 
ORDER BY created_at DESC 
LIMIT 10;

-- 3. Check if webhook events are being stored
SELECT 
    payment_intent_id,
    webhook_events,
    paymongo_response
FROM public.payments 
WHERE webhook_events IS NOT NULL 
ORDER BY created_at DESC 
LIMIT 5;

-- 4. Check orders table payment status
SELECT 
    id,
    order_number,
    payment_status,
    payment_method,
    total_amount,
    updated_at
FROM public.orders 
WHERE payment_status IN ('paid', 'pending', 'failed')
ORDER BY updated_at DESC 
LIMIT 10;
