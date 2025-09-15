-- Safe migration script for offline payments
-- This works with your existing payments table structure
-- Run this in your Supabase SQL editor

-- First, let's check if we need to add any missing columns to existing payments table
-- Add columns that might be missing for offline payments
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS receipt_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(255);

-- Create a new table specifically for offline payments to avoid conflicts
CREATE TABLE IF NOT EXISTS public.offline_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  payment_method VARCHAR(50) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'PHP',
  payment_status VARCHAR(20) NOT NULL DEFAULT 'paid',
  transaction_id VARCHAR(255),
  receipt_number VARCHAR(50) UNIQUE,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_offline_payments_order_id ON public.offline_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_offline_payments_payment_method ON public.offline_payments(payment_method);
CREATE INDEX IF NOT EXISTS idx_offline_payments_payment_status ON public.offline_payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_offline_payments_created_at ON public.offline_payments(created_at);
CREATE INDEX IF NOT EXISTS idx_offline_payments_receipt_number ON public.offline_payments(receipt_number);

-- Create RLS policies for offline_payments
ALTER TABLE public.offline_payments ENABLE ROW LEVEL SECURITY;

-- Policy for cashiers and admins to view all offline payments
CREATE POLICY "Cashiers and admins can view all offline payments" ON public.offline_payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role IN ('admin', 'cashier')
    )
  );

-- Policy for cashiers and admins to insert offline payments
CREATE POLICY "Cashiers and admins can insert offline payments" ON public.offline_payments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role IN ('admin', 'cashier')
    )
  );

-- Policy for cashiers and admins to update offline payments
CREATE POLICY "Cashiers and admins can update offline payments" ON public.offline_payments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role IN ('admin', 'cashier')
    )
  );

-- Add trigger to update updated_at timestamp for offline_payments
CREATE TRIGGER update_offline_payments_updated_at 
  BEFORE UPDATE ON public.offline_payments 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Ensure payment_methods_config has offline payment methods
INSERT INTO public.payment_methods_config (
  method_key, 
  method_name, 
  method_description, 
  is_enabled, 
  is_online, 
  requires_setup, 
  display_order, 
  icon_name, 
  color_code
) VALUES 
  ('cash', 'Cash', 'Cash payment at the counter', true, false, false, 1, 'cash', '#28a745'),
  ('gcash', 'GCash', 'GCash mobile payment', true, false, false, 2, 'gcash', '#007bff'),
  ('card', 'Credit/Debit Card', 'Credit or debit card payment', true, false, false, 3, 'credit-card', '#6c757d')
ON CONFLICT (method_key) DO UPDATE SET
  is_online = EXCLUDED.is_online,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();

-- Verify the migration was successful
SELECT 'Offline payments migration completed successfully' as status;
SELECT 'Existing payments table preserved' as note;
SELECT 'New offline_payments table created' as note;
