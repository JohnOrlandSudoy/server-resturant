-- =====================================================
-- Payment Methods Configuration Table
-- =====================================================
-- This table allows admins to enable/disable payment methods
-- Run this in your Supabase SQL editor

-- Create payment methods configuration table
CREATE TABLE IF NOT EXISTS public.payment_methods_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Payment method identifier
  method_key VARCHAR(50) UNIQUE NOT NULL,
  method_name VARCHAR(100) NOT NULL,
  method_description TEXT,
  
  -- Configuration
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  is_online BOOLEAN NOT NULL DEFAULT false, -- true for online payments (PayMongo, etc.)
  requires_setup BOOLEAN NOT NULL DEFAULT false, -- true if needs API keys/config
  
  -- Display settings
  display_order INTEGER DEFAULT 0,
  icon_name VARCHAR(50), -- for frontend icons
  color_code VARCHAR(7), -- hex color for UI
  
  -- Configuration data (JSON for API keys, settings, etc.)
  config_data JSONB DEFAULT '{}',
  
  -- Status and tracking
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.user_profiles(id),
  updated_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT payment_methods_config_method_key_check 
    CHECK (method_key IN ('cash', 'gcash', 'card', 'paymongo', 'qrph', 'grab_pay', 'shopeepay'))
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payment_methods_config_enabled 
ON public.payment_methods_config(is_enabled, is_active);

-- Insert default payment methods
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
  ('cash', 'Cash', 'Traditional cash payment', true, false, false, 1, 'cash', '#28a745'),
  ('gcash', 'GCash', 'GCash mobile wallet payment', true, false, false, 2, 'gcash', '#007bff'),
  ('card', 'Credit/Debit Card', 'Credit or debit card payment', true, false, false, 3, 'credit-card', '#6c757d'),
  ('paymongo', 'PayMongo (Online)', 'PayMongo online payment gateway', true, true, true, 4, 'paymongo', '#ff6b35'),
  ('qrph', 'QR Ph', 'Philippine QR code payment', true, true, true, 5, 'qr-code', '#17a2b8')
ON CONFLICT (method_key) DO NOTHING;

-- Create RLS policies
ALTER TABLE public.payment_methods_config ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read enabled payment methods
CREATE POLICY "Anyone can view enabled payment methods" ON public.payment_methods_config
  FOR SELECT USING (is_enabled = true AND is_active = true);

-- Policy: Only admins can view all payment methods
CREATE POLICY "Admins can view all payment methods" ON public.payment_methods_config
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Only admins can insert payment methods
CREATE POLICY "Admins can insert payment methods" ON public.payment_methods_config
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Only admins can update payment methods
CREATE POLICY "Admins can update payment methods" ON public.payment_methods_config
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Only admins can delete payment methods
CREATE POLICY "Admins can delete payment methods" ON public.payment_methods_config
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_payment_methods_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_payment_methods_config_updated_at
  BEFORE UPDATE ON public.payment_methods_config
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_methods_config_updated_at();

-- Add comments
COMMENT ON TABLE public.payment_methods_config IS 'Configuration table for payment methods availability';
COMMENT ON COLUMN public.payment_methods_config.method_key IS 'Unique identifier for payment method (cash, gcash, card, paymongo, qrph)';
COMMENT ON COLUMN public.payment_methods_config.is_enabled IS 'Whether this payment method is available for selection';
COMMENT ON COLUMN public.payment_methods_config.is_online IS 'Whether this is an online payment method';
COMMENT ON COLUMN public.payment_methods_config.requires_setup IS 'Whether this method requires additional configuration';
COMMENT ON COLUMN public.payment_methods_config.config_data IS 'JSON configuration data (API keys, settings, etc.)';
