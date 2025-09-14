-- =====================================================
-- Payments Table Schema for PayMongo Integration
-- =====================================================
-- This table tracks all payment attempts and their statuses
-- for comprehensive payment history and reporting

-- Payment status enum (extending existing payment_status)
CREATE TYPE payment_intent_status AS ENUM (
    'awaiting_payment_method',
    'awaiting_next_action', 
    'processing',
    'succeeded',
    'cancelled',
    'payment_failed'
);

-- Payment source types
CREATE TYPE payment_source_type AS ENUM (
    'qrph',
    'card',
    'gcash',
    'paymaya',
    'bank_transfer'
);

-- Create payments table
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- PayMongo identifiers
    payment_intent_id VARCHAR(100) UNIQUE NOT NULL,
    payment_id VARCHAR(100), -- PayMongo payment ID (when payment is created)
    
    -- Order relationship
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    order_number VARCHAR(50),
    
    -- Payment details
    amount INTEGER NOT NULL, -- Amount in centavos (e.g., 10000 = PHP 100.00)
    currency VARCHAR(3) NOT NULL DEFAULT 'PHP',
    description TEXT,
    
    -- Payment status and method
    status payment_intent_status NOT NULL DEFAULT 'awaiting_payment_method',
    payment_status payment_status NOT NULL DEFAULT 'pending',
    payment_method payment_method,
    payment_source_type payment_source_type,
    
    -- QR Ph specific data
    qr_code_url TEXT,
    qr_code_data TEXT,
    qr_code_expires_at TIMESTAMP WITH TIME ZONE,
    
    -- PayMongo response data
    paymongo_response JSONB, -- Store full PayMongo response for debugging
    webhook_events JSONB DEFAULT '[]', -- Store webhook events received
    
    -- Payment timing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    paid_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    
    -- User tracking
    created_by UUID REFERENCES public.user_profiles(id),
    updated_by UUID REFERENCES public.user_profiles(id),
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Error tracking
    error_message TEXT,
    error_code VARCHAR(50),
    
    -- Fee information (from PayMongo)
    fee_amount INTEGER DEFAULT 0, -- Fee in centavos
    net_amount INTEGER DEFAULT 0, -- Net amount after fees in centavos
    
    -- External reference
    external_reference_number VARCHAR(100),
    
    -- Indexes for performance
    CONSTRAINT payments_amount_positive CHECK (amount > 0),
    CONSTRAINT payments_fee_non_negative CHECK (fee_amount >= 0),
    CONSTRAINT payments_net_non_negative CHECK (net_amount >= 0)
);

-- Create indexes for better performance
CREATE INDEX idx_payments_payment_intent_id ON public.payments(payment_intent_id);
CREATE INDEX idx_payments_order_id ON public.payments(order_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_payments_payment_status ON public.payments(payment_status);
CREATE INDEX idx_payments_created_at ON public.payments(created_at);
CREATE INDEX idx_payments_paid_at ON public.payments(paid_at);
CREATE INDEX idx_payments_created_by ON public.payments(created_by);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_payments_updated_at
    BEFORE UPDATE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION update_payments_updated_at();

-- Add RLS policies
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view payments for orders they created or are assigned to
CREATE POLICY "Users can view payments for their orders" ON public.payments
    FOR SELECT USING (
        created_by = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM public.orders o 
            WHERE o.id = payments.order_id 
            AND (o.created_by = auth.uid() OR o.updated_by = auth.uid())
        ) OR
        EXISTS (
            SELECT 1 FROM public.user_profiles up 
            WHERE up.id = auth.uid() 
            AND up.role IN ('admin', 'cashier')
        )
    );

-- Policy: Cashiers and admins can insert payments
CREATE POLICY "Cashiers and admins can create payments" ON public.payments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles up 
            WHERE up.id = auth.uid() 
            AND up.role IN ('admin', 'cashier')
        )
    );

-- Policy: Cashiers and admins can update payments
CREATE POLICY "Cashiers and admins can update payments" ON public.payments
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up 
            WHERE up.id = auth.uid() 
            AND up.role IN ('admin', 'cashier')
        )
    );

-- Policy: Only admins can delete payments
CREATE POLICY "Only admins can delete payments" ON public.payments
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up 
            WHERE up.id = auth.uid() 
            AND up.role = 'admin'
        )
    );

-- Add comments for documentation
COMMENT ON TABLE public.payments IS 'Tracks all payment attempts and their statuses for PayMongo integration';
COMMENT ON COLUMN public.payments.amount IS 'Payment amount in centavos (e.g., 10000 = PHP 100.00)';
COMMENT ON COLUMN public.payments.payment_intent_id IS 'PayMongo payment intent ID';
COMMENT ON COLUMN public.payments.payment_id IS 'PayMongo payment ID (created when payment succeeds)';
COMMENT ON COLUMN public.payments.qr_code_url IS 'Base64 encoded QR code image URL';
COMMENT ON COLUMN public.payments.qr_code_data IS 'Raw QR code data string';
COMMENT ON COLUMN public.payments.paymongo_response IS 'Full PayMongo API response for debugging';
COMMENT ON COLUMN public.payments.webhook_events IS 'Array of webhook events received for this payment';
COMMENT ON COLUMN public.payments.fee_amount IS 'PayMongo processing fee in centavos';
COMMENT ON COLUMN public.payments.net_amount IS 'Net amount received after fees in centavos';
