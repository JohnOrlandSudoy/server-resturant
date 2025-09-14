-- Migration script to add PayMongo payments support to your existing database
-- Run this in your Supabase SQL editor

-- =====================================================
-- STEP 1: CREATE ENUM TYPES
-- =====================================================

-- Create ENUM types for payments table (with proper error handling)
DO $$ 
BEGIN
  -- Create payment_intent_status enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_intent_status') THEN
    CREATE TYPE payment_intent_status AS ENUM (
      'awaiting_payment_method',
      'awaiting_next_action',
      'processing',
      'succeeded',
      'payment_failed',
      'cancelled'
    );
  END IF;

  -- Create payment_source_type enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_source_type') THEN
    CREATE TYPE payment_source_type AS ENUM (
      'qrph',
      'card',
      'gcash',
      'grab_pay',
      'shopeepay'
    );
  END IF;

  -- Create payment_status enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE payment_status AS ENUM (
      'pending',
      'paid',
      'failed',
      'cancelled',
      'refunded'
    );
  END IF;

  -- Create payment_method enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
    CREATE TYPE payment_method AS ENUM (
      'paymongo',
      'cash',
      'card',
      'gcash',
      'qrph'
    );
  END IF;
END $$;

-- =====================================================
-- STEP 2: UPDATE ORDERS TABLE
-- =====================================================

-- Add new payment statuses to orders table
ALTER TABLE public.orders 
DROP CONSTRAINT IF EXISTS orders_payment_status_check;

ALTER TABLE public.orders 
ADD CONSTRAINT orders_payment_status_check 
CHECK (payment_status::text = ANY (ARRAY[
  'unpaid'::character varying, 
  'paid'::character varying, 
  'refunded'::character varying,
  'pending'::character varying,
  'failed'::character varying,
  'cancelled'::character varying
]::text[]));

-- Add new payment methods to orders table
ALTER TABLE public.orders 
DROP CONSTRAINT IF EXISTS orders_payment_method_check;

ALTER TABLE public.orders 
ADD CONSTRAINT orders_payment_method_check 
CHECK (payment_method::text = ANY (ARRAY[
  'cash'::character varying, 
  'gcash'::character varying, 
  'card'::character varying,
  'paymongo'::character varying,
  'qrph'::character varying
]::text[]));

-- =====================================================
-- STEP 3: CREATE PAYMENTS TABLE
-- =====================================================

-- Create the payments table (with proper error handling)
DO $$ 
BEGIN
  -- Only create table if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments' AND table_schema = 'public') THEN
    CREATE TABLE public.payments (
      id uuid NOT NULL DEFAULT uuid_generate_v4(),
      payment_intent_id character varying NOT NULL UNIQUE,
      order_id uuid,
      order_number character varying,
      payment_id character varying,
      amount numeric NOT NULL,
      currency character varying NOT NULL DEFAULT 'PHP',
      description text,
      status payment_intent_status NOT NULL DEFAULT 'awaiting_payment_method',
      payment_status payment_status NOT NULL DEFAULT 'pending',
      payment_method payment_method NOT NULL DEFAULT 'paymongo',
      payment_source_type payment_source_type,
      qr_code_url character varying,
      qr_code_data text,
      qr_code_expires_at timestamp with time zone,
      fee_amount numeric DEFAULT 0,
      net_amount numeric,
      external_reference_number character varying,
      error_message text,
      error_code character varying,
      paid_at timestamp with time zone,
      failed_at timestamp with time zone,
      cancelled_at timestamp with time zone,
      paymongo_response jsonb,
      webhook_events jsonb DEFAULT '[]'::jsonb,
      metadata jsonb,
      created_by uuid,
      updated_by uuid,
      created_at timestamp with time zone DEFAULT now(),
      updated_at timestamp with time zone DEFAULT now(),
      CONSTRAINT payments_pkey PRIMARY KEY (id),
      CONSTRAINT payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL,
      CONSTRAINT payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id),
      CONSTRAINT payments_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.user_profiles(id)
    );
    
    RAISE NOTICE 'Payments table created successfully';
  ELSE
    RAISE NOTICE 'Payments table already exists, skipping creation';
  END IF;
END $$;

-- =====================================================
-- STEP 4: CREATE INDEXES
-- =====================================================

-- Create indexes for better performance
DO $$ 
BEGIN
  -- Create index for payment_intent_id
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_payments_payment_intent_id') THEN
    CREATE INDEX idx_payments_payment_intent_id ON public.payments(payment_intent_id);
  END IF;

  -- Create index for order_id
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_payments_order_id') THEN
    CREATE INDEX idx_payments_order_id ON public.payments(order_id);
  END IF;

  -- Create index for payment_status
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_payments_payment_status') THEN
    CREATE INDEX idx_payments_payment_status ON public.payments(payment_status);
  END IF;

  -- Create index for created_at
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_payments_created_at') THEN
    CREATE INDEX idx_payments_created_at ON public.payments(created_at);
  END IF;
END $$;

-- =====================================================
-- STEP 5: ENABLE RLS AND CREATE POLICIES
-- =====================================================

-- Enable RLS on payments table
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Cashiers and admins can view all payments" ON public.payments;
DROP POLICY IF EXISTS "Cashiers and admins can insert payments" ON public.payments;
DROP POLICY IF EXISTS "Cashiers and admins can update payments" ON public.payments;

-- Policy for cashiers and admins to view all payments
CREATE POLICY "Cashiers and admins can view all payments" ON public.payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('cashier', 'admin')
    )
  );

-- Policy for cashiers and admins to insert payments
CREATE POLICY "Cashiers and admins can insert payments" ON public.payments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('cashier', 'admin')
    )
  );

-- Policy for cashiers and admins to update payments
CREATE POLICY "Cashiers and admins can update payments" ON public.payments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('cashier', 'admin')
    )
  );

-- =====================================================
-- STEP 6: CREATE TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_payments_updated_at ON public.payments;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION update_payments_updated_at();

-- =====================================================
-- STEP 7: MIGRATE EXISTING DATA (OPTIONAL)
-- =====================================================

-- Function to migrate existing paymongo_payments to payments table
CREATE OR REPLACE FUNCTION migrate_paymongo_payments_to_payments()
RETURNS void AS $$
BEGIN
  -- Only migrate if paymongo_payments table exists and has data
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'paymongo_payments' AND table_schema = 'public') THEN
    
    -- Insert existing paymongo_payments into payments table
    INSERT INTO public.payments (
      payment_intent_id,
      order_id,
      order_number,
      amount,
      currency,
      description,
      status,
      payment_status,
      payment_method,
      payment_source_type,
      qr_code_url,
      qr_code_data,
      qr_code_expires_at,
      paymongo_response,
      metadata,
      created_by,
      created_at,
      updated_at
    )
    SELECT 
      pp.payment_intent_id,
      pp.order_id,
      o.order_number,
      pp.amount,
      pp.currency,
      'Migrated from paymongo_payments' as description,
      CASE 
        WHEN pp.status = 'pending' THEN 'awaiting_payment_method'::payment_intent_status
        WHEN pp.status = 'succeeded' THEN 'succeeded'::payment_intent_status
        WHEN pp.status = 'failed' THEN 'payment_failed'::payment_intent_status
        WHEN pp.status = 'cancelled' THEN 'cancelled'::payment_intent_status
        ELSE 'awaiting_payment_method'::payment_intent_status
      END as status,
      CASE 
        WHEN pp.status = 'succeeded' THEN 'paid'::payment_status
        WHEN pp.status = 'failed' THEN 'failed'::payment_status
        WHEN pp.status = 'cancelled' THEN 'cancelled'::payment_status
        ELSE 'pending'::payment_status
      END as payment_status,
      'paymongo'::payment_method,
      'qrph'::payment_source_type,
      pp.qr_code_url,
      pp.qr_code_data,
      pp.expires_at,
      jsonb_build_object('migrated_from', 'paymongo_payments', 'original_status', pp.status),
      pp.metadata,
      pp.created_by,
      pp.created_at,
      pp.updated_at
    FROM public.paymongo_payments pp
    LEFT JOIN public.orders o ON pp.order_id = o.id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.payments p 
      WHERE p.payment_intent_id = pp.payment_intent_id
    );
    
    RAISE NOTICE 'Migration completed: % rows migrated from paymongo_payments to payments', 
      (SELECT COUNT(*) FROM public.payments WHERE paymongo_response->>'migrated_from' = 'paymongo_payments');
  ELSE
    RAISE NOTICE 'No paymongo_payments table found, skipping migration';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Run the migration
SELECT migrate_paymongo_payments_to_payments();

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$ 
BEGIN 
  RAISE NOTICE '✅ Migration completed successfully!';
  RAISE NOTICE '✅ New payments table created with PayMongo support';
  RAISE NOTICE '✅ Orders table updated to support PayMongo payment methods';
  RAISE NOTICE '✅ Existing paymongo_payments data migrated (if any)';
  RAISE NOTICE '✅ RLS policies and triggers configured';
  RAISE NOTICE '🚀 Ready to use PayMongo payment endpoints!';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Test the endpoint: POST /api/orders/{orderId}/paymongo-payment';
  RAISE NOTICE '2. Check payment status: GET /api/orders/{orderId}/payment-status';
  RAISE NOTICE '3. Manual sync if needed: POST /api/orders/{orderId}/sync-payment';
END $$;
