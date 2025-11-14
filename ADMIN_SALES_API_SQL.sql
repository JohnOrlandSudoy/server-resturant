-- ============================================================================
-- ADMIN SALES API - SQL MIGRATION SCRIPT
-- ============================================================================
-- Run this script in Supabase SQL Editor to create required tables
-- for sales records and best-seller analytics
-- ============================================================================

-- 1. CREATE sales_records TABLE (REQUIRED - Core sales tracking)
-- ============================================================================
CREATE TABLE public.sales_records (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL,
  order_number character varying NOT NULL,
  menu_item_id uuid NOT NULL,
  menu_item_name character varying NOT NULL,
  quantity integer NOT NULL,
  unit_price numeric NOT NULL,
  total_amount numeric NOT NULL,
  discount_amount numeric DEFAULT 0,
  net_amount numeric NOT NULL,
  customer_name character varying,
  order_type character varying NOT NULL,
  payment_method character varying,
  payment_status character varying NOT NULL,
  sale_date date NOT NULL,
  sale_time time NOT NULL,
  hour_of_day integer NOT NULL,
  day_of_week integer NOT NULL,
  week_number integer NOT NULL,
  month_number integer NOT NULL,
  year_number integer NOT NULL,
  recorded_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT sales_records_pkey PRIMARY KEY (id),
  CONSTRAINT sales_records_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE,
  CONSTRAINT sales_records_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id),
  CONSTRAINT sales_records_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.user_profiles(id)
);

-- Create indexes for sales_records for optimal query performance
CREATE INDEX idx_sales_records_date ON public.sales_records(sale_date DESC);
CREATE INDEX idx_sales_records_menu_item ON public.sales_records(menu_item_id);
CREATE INDEX idx_sales_records_payment_status ON public.sales_records(payment_status);
CREATE INDEX idx_sales_records_order_id ON public.sales_records(order_id);
CREATE INDEX idx_sales_records_week_year ON public.sales_records(week_number, year_number);
CREATE INDEX idx_sales_records_composite ON public.sales_records(sale_date, menu_item_id, payment_status);

-- 2. CREATE daily_sales_summary TABLE (OPTIONAL - Daily aggregations)
-- ============================================================================
CREATE TABLE public.daily_sales_summary (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  sale_date date NOT NULL UNIQUE,
  total_orders integer NOT NULL DEFAULT 0,
  total_items_sold integer NOT NULL DEFAULT 0,
  total_revenue numeric NOT NULL DEFAULT 0,
  total_discount numeric NOT NULL DEFAULT 0,
  net_revenue numeric NOT NULL DEFAULT 0,
  cash_sales numeric DEFAULT 0,
  gcash_sales numeric DEFAULT 0,
  card_sales numeric DEFAULT 0,
  paymongo_sales numeric DEFAULT 0,
  average_order_value numeric DEFAULT 0,
  top_selling_item_id uuid,
  top_selling_item_name character varying,
  top_selling_item_qty integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT daily_sales_summary_pkey PRIMARY KEY (id),
  CONSTRAINT daily_sales_summary_top_item_fkey FOREIGN KEY (top_selling_item_id) REFERENCES public.menu_items(id)
);

CREATE INDEX idx_daily_sales_summary_date ON public.daily_sales_summary(sale_date DESC);

-- 3. CREATE weekly_best_sellers TABLE (OPTIONAL - Weekly rankings)
-- ============================================================================
CREATE TABLE public.weekly_best_sellers (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  week_number integer NOT NULL,
  year_number integer NOT NULL,
  menu_item_id uuid NOT NULL,
  menu_item_name character varying NOT NULL,
  category_id uuid,
  category_name character varying,
  total_quantity_sold integer NOT NULL,
  total_revenue numeric NOT NULL,
  average_daily_sales numeric NOT NULL,
  rank integer NOT NULL,
  growth_percentage numeric,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT weekly_best_sellers_pkey PRIMARY KEY (id),
  CONSTRAINT weekly_best_sellers_menu_item_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id),
  CONSTRAINT weekly_best_sellers_category_fkey FOREIGN KEY (category_id) REFERENCES public.menu_categories(id),
  CONSTRAINT weekly_best_sellers_unique_week_item UNIQUE (week_number, year_number, menu_item_id)
);

CREATE INDEX idx_weekly_best_sellers_rank ON public.weekly_best_sellers(rank);
CREATE INDEX idx_weekly_best_sellers_week_year ON public.weekly_best_sellers(week_number, year_number);

-- 4. CREATE hourly_sales_summary TABLE (OPTIONAL - Real-time dashboard)
-- ============================================================================
CREATE TABLE public.hourly_sales_summary (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  sale_date date NOT NULL,
  hour_of_day integer NOT NULL,
  total_orders integer DEFAULT 0,
  total_items_sold integer DEFAULT 0,
  total_revenue numeric DEFAULT 0,
  total_discount numeric DEFAULT 0,
  net_revenue numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT hourly_sales_summary_pkey PRIMARY KEY (id),
  CONSTRAINT hourly_sales_summary_unique_date_hour UNIQUE (sale_date, hour_of_day)
);

CREATE INDEX idx_hourly_sales_summary_date ON public.hourly_sales_summary(sale_date DESC);
CREATE INDEX idx_hourly_sales_summary_hour ON public.hourly_sales_summary(hour_of_day);

-- ============================================================================
-- IMPORTANT: Verify all tables were created successfully
-- ============================================================================
-- Run this query to verify:
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' 
-- AND tablename IN ('sales_records', 'daily_sales_summary', 'weekly_best_sellers', 'hourly_sales_summary');
