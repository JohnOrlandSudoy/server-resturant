-- Updated SQL schema with PayMongo payments support
-- This extends your existing updated.sql with the new payments table

-- =====================================================
-- EXISTING TABLES (from your updated.sql)
-- =====================================================

CREATE TABLE public.discounts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  code character varying NOT NULL UNIQUE,
  name character varying NOT NULL,
  description text,
  discount_type character varying NOT NULL CHECK (discount_type::text = ANY (ARRAY['percentage'::character varying, 'fixed_amount'::character varying]::text[])),
  discount_value numeric NOT NULL,
  minimum_order_amount numeric DEFAULT 0,
  maximum_discount_amount numeric,
  is_active boolean DEFAULT true,
  valid_from timestamp with time zone DEFAULT now(),
  valid_until timestamp with time zone,
  usage_limit integer,
  used_count integer DEFAULT 0,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT discounts_pkey PRIMARY KEY (id),
  CONSTRAINT discounts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id)
);

CREATE TABLE public.ingredients (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL UNIQUE,
  description text,
  unit character varying NOT NULL DEFAULT 'pieces'::character varying,
  current_stock numeric NOT NULL DEFAULT 0,
  min_stock_threshold numeric NOT NULL DEFAULT 0,
  max_stock_threshold numeric,
  cost_per_unit numeric,
  supplier character varying,
  category character varying,
  storage_location character varying,
  expiry_date date,
  is_active boolean DEFAULT true,
  created_by uuid,
  updated_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ingredients_pkey PRIMARY KEY (id),
  CONSTRAINT ingredients_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id),
  CONSTRAINT ingredients_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.user_profiles(id)
);

CREATE TABLE public.menu_categories (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL UNIQUE,
  description text,
  image_url character varying,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  image_file bytea,
  image_filename character varying,
  image_mime_type character varying,
  image_size integer,
  image_alt_text character varying,
  image_uploaded_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  CONSTRAINT menu_categories_pkey PRIMARY KEY (id),
  CONSTRAINT menu_categories_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id),
  CONSTRAINT menu_categories_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.user_profiles(id)
);

CREATE TABLE public.menu_item_ingredients (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  menu_item_id uuid NOT NULL,
  ingredient_id uuid NOT NULL,
  quantity_required numeric NOT NULL,
  unit character varying NOT NULL,
  is_optional boolean DEFAULT false,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT menu_item_ingredients_pkey PRIMARY KEY (id),
  CONSTRAINT menu_item_ingredients_ingredient_id_fkey FOREIGN KEY (ingredient_id) REFERENCES public.ingredients(id),
  CONSTRAINT menu_item_ingredients_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id),
  CONSTRAINT menu_item_ingredients_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id)
);

CREATE TABLE public.menu_items (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  description text,
  price numeric NOT NULL,
  category_id uuid,
  image_url character varying,
  prep_time integer NOT NULL DEFAULT 0,
  is_available boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  popularity integer DEFAULT 0,
  calories integer,
  allergens ARRAY,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  image_file bytea,
  image_filename character varying,
  image_mime_type character varying,
  image_size integer,
  image_alt_text character varying,
  image_uploaded_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  CONSTRAINT menu_items_pkey PRIMARY KEY (id),
  CONSTRAINT menu_items_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.menu_categories(id),
  CONSTRAINT menu_items_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.user_profiles(id),
  CONSTRAINT menu_items_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id)
);

CREATE TABLE public.order_discounts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL,
  discount_id uuid NOT NULL,
  discount_amount numeric NOT NULL,
  applied_at timestamp with time zone DEFAULT now(),
  CONSTRAINT order_discounts_pkey PRIMARY KEY (id),
  CONSTRAINT order_discounts_discount_id_fkey FOREIGN KEY (discount_id) REFERENCES public.discounts(id),
  CONSTRAINT order_discounts_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);

CREATE TABLE public.order_items (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL,
  menu_item_id uuid NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL,
  total_price numeric NOT NULL,
  customizations text,
  special_instructions text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT order_items_pkey PRIMARY KEY (id),
  CONSTRAINT order_items_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id),
  CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);

CREATE TABLE public.order_status_history (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL,
  status character varying NOT NULL,
  notes text,
  updated_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT order_status_history_pkey PRIMARY KEY (id),
  CONSTRAINT order_status_history_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT order_status_history_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.user_profiles(id)
);

-- =====================================================
-- UPDATED ORDERS TABLE (with PayMongo support)
-- =====================================================

CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  order_number character varying NOT NULL UNIQUE,
  customer_name character varying,
  customer_phone character varying,
  order_type character varying NOT NULL CHECK (order_type::text = ANY (ARRAY['dine_in'::character varying, 'takeout'::character varying]::text[])),
  status character varying NOT NULL DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'preparing'::character varying, 'ready'::character varying, 'completed'::character varying, 'cancelled'::character varying]::text[])),
  payment_status character varying NOT NULL DEFAULT 'unpaid'::character varying CHECK (payment_status::text = ANY (ARRAY['unpaid'::character varying, 'paid'::character varying, 'refunded'::character varying, 'pending'::character varying, 'failed'::character varying, 'cancelled'::character varying]::text[])),
  payment_method character varying CHECK (payment_method::text = ANY (ARRAY['cash'::character varying, 'gcash'::character varying, 'card'::character varying, 'paymongo'::character varying, 'qrph'::character varying]::text[])),
  subtotal numeric NOT NULL DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  special_instructions text,
  table_number character varying,
  estimated_prep_time integer,
  actual_prep_time integer,
  created_by uuid NOT NULL,
  updated_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.user_profiles(id),
  CONSTRAINT orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id)
);

-- =====================================================
-- NEW PAYMENTS TABLE (replaces paymongo_payments)
-- =====================================================

-- Create ENUM types for payments table
CREATE TYPE payment_intent_status AS ENUM (
  'awaiting_payment_method',
  'awaiting_next_action',
  'processing',
  'succeeded',
  'payment_failed',
  'cancelled'
);

CREATE TYPE payment_source_type AS ENUM (
  'qrph',
  'card',
  'gcash',
  'grab_pay',
  'shopeepay'
);

CREATE TYPE payment_status AS ENUM (
  'pending',
  'paid',
  'failed',
  'cancelled',
  'refunded'
);

CREATE TYPE payment_method AS ENUM (
  'paymongo',
  'cash',
  'card',
  'gcash',
  'qrph'
);

-- Create the payments table
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

-- Create indexes for better performance
CREATE INDEX idx_payments_payment_intent_id ON public.payments(payment_intent_id);
CREATE INDEX idx_payments_order_id ON public.payments(order_id);
CREATE INDEX idx_payments_payment_status ON public.payments(payment_status);
CREATE INDEX idx_payments_created_at ON public.payments(created_at);

-- =====================================================
-- LEGACY PAYMONGO_PAYMENTS TABLE (keep for backward compatibility)
-- =====================================================

CREATE TABLE public.paymongo_payments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL,
  payment_intent_id character varying NOT NULL UNIQUE,
  amount numeric NOT NULL,
  currency character varying NOT NULL DEFAULT 'PHP'::character varying,
  status character varying NOT NULL DEFAULT 'pending'::character varying,
  qr_code_url character varying,
  qr_code_data text,
  expires_at timestamp with time zone,
  metadata jsonb,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT paymongo_payments_pkey PRIMARY KEY (id),
  CONSTRAINT paymongo_payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id),
  CONSTRAINT paymongo_payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);

-- =====================================================
-- REMAINING EXISTING TABLES
-- =====================================================

CREATE TABLE public.stock_alerts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  ingredient_id uuid NOT NULL,
  alert_type character varying NOT NULL CHECK (alert_type::text = ANY (ARRAY['low_stock'::character varying, 'out_of_stock'::character varying, 'expiry_warning'::character varying]::text[])),
  current_stock numeric NOT NULL,
  threshold_value numeric NOT NULL,
  message text NOT NULL,
  is_resolved boolean DEFAULT false,
  resolved_by uuid,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT stock_alerts_pkey PRIMARY KEY (id),
  CONSTRAINT stock_alerts_ingredient_id_fkey FOREIGN KEY (ingredient_id) REFERENCES public.ingredients(id),
  CONSTRAINT stock_alerts_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.user_profiles(id)
);

CREATE TABLE public.stock_movements (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  ingredient_id uuid NOT NULL,
  movement_type character varying NOT NULL CHECK (movement_type::text = ANY (ARRAY['in'::character varying, 'out'::character varying, 'adjustment'::character varying, 'spoilage'::character varying]::text[])),
  quantity numeric NOT NULL,
  reason character varying,
  reference_number character varying,
  notes text,
  performed_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT stock_movements_pkey PRIMARY KEY (id),
  CONSTRAINT stock_movements_ingredient_id_fkey FOREIGN KEY (ingredient_id) REFERENCES public.ingredients(id),
  CONSTRAINT stock_movements_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.user_profiles(id)
);

CREATE TABLE public.user_profiles (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  username character varying NOT NULL UNIQUE,
  first_name character varying NOT NULL,
  last_name character varying NOT NULL,
  role USER-DEFINED NOT NULL DEFAULT 'cashier'::user_role,
  phone character varying,
  email character varying,
  avatar_url character varying,
  is_active boolean DEFAULT true,
  last_login timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  avatar_file bytea,
  avatar_filename character varying,
  avatar_mime_type character varying,
  avatar_size integer,
  avatar_alt_text character varying,
  avatar_uploaded_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_profiles_pkey PRIMARY KEY (id)
);

-- =====================================================
-- RLS POLICIES FOR PAYMENTS TABLE
-- =====================================================

-- Enable RLS on payments table
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

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
-- TRIGGERS FOR PAYMENTS TABLE
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION update_payments_updated_at();

-- =====================================================
-- MIGRATION FROM PAYMONGO_PAYMENTS TO PAYMENTS
-- =====================================================

-- Function to migrate existing paymongo_payments to payments table
CREATE OR REPLACE FUNCTION migrate_paymongo_payments_to_payments()
RETURNS void AS $$
BEGIN
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
END;
$$ LANGUAGE plpgsql;

-- Run the migration
SELECT migrate_paymongo_payments_to_payments();

-- =====================================================
-- COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.payments IS 'Comprehensive payment tracking table for all payment methods including PayMongo';
COMMENT ON COLUMN public.payments.payment_intent_id IS 'PayMongo payment intent ID';
COMMENT ON COLUMN public.payments.payment_id IS 'PayMongo payment ID (set when payment succeeds)';
COMMENT ON COLUMN public.payments.payment_status IS 'Overall payment status: pending, paid, failed, cancelled, refunded';
COMMENT ON COLUMN public.payments.status IS 'PayMongo payment intent status';
COMMENT ON COLUMN public.payments.payment_method IS 'Payment method used: paymongo, cash, card, gcash, qrph';
COMMENT ON COLUMN public.payments.payment_source_type IS 'PayMongo payment source type: qrph, card, gcash, etc.';
COMMENT ON COLUMN public.payments.webhook_events IS 'Array of webhook events received for this payment';
COMMENT ON COLUMN public.payments.paymongo_response IS 'Full PayMongo API response data';

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$ 
BEGIN 
  RAISE NOTICE '✅ Database schema updated successfully!';
  RAISE NOTICE '✅ New payments table created with PayMongo support';
  RAISE NOTICE '✅ Orders table updated to support PayMongo payment methods';
  RAISE NOTICE '✅ Existing paymongo_payments data migrated to new payments table';
  RAISE NOTICE '✅ RLS policies and triggers configured';
  RAISE NOTICE '🚀 Ready to use PayMongo payment endpoints!';
END $$;
