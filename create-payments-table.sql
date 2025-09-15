-- Create payments table in Supabase
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  payment_method VARCHAR(50) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'PHP',
  payment_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  payment_intent_id VARCHAR(255),
  transaction_id VARCHAR(255),
  receipt_number VARCHAR(50),
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_method ON public.payments(payment_method);
CREATE INDEX IF NOT EXISTS idx_payments_payment_status ON public.payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at);
CREATE INDEX IF NOT EXISTS idx_payments_receipt_number ON public.payments(receipt_number);

-- Create RLS policies
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Policy for cashiers and admins to view all payments
CREATE POLICY "Cashiers and admins can view all payments" ON public.payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role IN ('admin', 'cashier')
    )
  );

-- Policy for cashiers and admins to insert payments
CREATE POLICY "Cashiers and admins can insert payments" ON public.payments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role IN ('admin', 'cashier')
    )
  );

-- Policy for cashiers and admins to update payments
CREATE POLICY "Cashiers and admins can update payments" ON public.payments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role IN ('admin', 'cashier')
    )
  );

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_payments_updated_at 
  BEFORE UPDATE ON public.payments 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample payment methods if they don't exist
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
ON CONFLICT (method_key) DO NOTHING;

-- Verify the table was created
SELECT 'Payments table created successfully' as status;
