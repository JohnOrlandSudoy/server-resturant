-- =====================================================
-- SAFE PAYMENTS TABLE MIGRATION
-- =====================================================
-- This script safely migrates from existing paymongo_payments table
-- to the new comprehensive payments table

-- Step 1: Create the new ENUM types (safe - will not error if they exist)
DO $$ 
BEGIN
    -- Create payment_intent_status enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_intent_status') THEN
        CREATE TYPE payment_intent_status AS ENUM (
            'awaiting_payment_method',
            'awaiting_next_action', 
            'processing',
            'succeeded',
            'cancelled',
            'payment_failed'
        );
    END IF;

    -- Create payment_source_type enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_source_type') THEN
        CREATE TYPE payment_source_type AS ENUM (
            'qrph',
            'card',
            'gcash',
            'paymaya',
            'bank_transfer'
        );
    END IF;

    -- Create payment_status enum if it doesn't exist (for consistency with orders table)
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
        CREATE TYPE payment_status AS ENUM (
            'pending',
            'paid',
            'failed',
            'refunded',
            'unpaid',
            'cancelled'
        );
    END IF;

    -- Create payment_method enum if it doesn't exist (for consistency with orders table)
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
        CREATE TYPE payment_method AS ENUM (
            'cash',
            'gcash',
            'card',
            'paymongo',
            'qrph',
            'bank_transfer'
        );
    END IF;
END $$;

-- Step 2: Create the new comprehensive payments table
CREATE TABLE IF NOT EXISTS public.payments (
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
    
    -- Constraints
    CONSTRAINT payments_amount_positive CHECK (amount > 0),
    CONSTRAINT payments_fee_non_negative CHECK (fee_amount >= 0),
    CONSTRAINT payments_net_non_negative CHECK (net_amount >= 0)
);

-- Step 3: Migrate existing data from paymongo_payments to payments (if paymongo_payments exists)
DO $$
BEGIN
    -- Check if paymongo_payments table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'paymongo_payments' AND table_schema = 'public') THEN
        
        -- Migrate existing data
        INSERT INTO public.payments (
            payment_intent_id,
            order_id,
            amount,
            currency,
            status,
            payment_status,
            payment_method,
            payment_source_type,
            qr_code_url,
            qr_code_data,
            expires_at,
            metadata,
            created_by,
            created_at,
            updated_at
        )
        SELECT 
            pm.payment_intent_id,
            pm.order_id,
            -- Convert amount from numeric to integer (centavos)
            CASE 
                WHEN pm.amount IS NOT NULL THEN (pm.amount * 100)::INTEGER
                ELSE 0
            END,
            COALESCE(pm.currency, 'PHP'),
            -- Map status
            CASE 
                WHEN pm.status = 'awaiting_payment_method' THEN 'awaiting_payment_method'::payment_intent_status
                WHEN pm.status = 'succeeded' THEN 'succeeded'::payment_intent_status
                WHEN pm.status = 'failed' THEN 'payment_failed'::payment_intent_status
                WHEN pm.status = 'cancelled' THEN 'cancelled'::payment_intent_status
                ELSE 'awaiting_payment_method'::payment_intent_status
            END,
            -- Map payment status
            CASE 
                WHEN pm.status = 'succeeded' THEN 'paid'::payment_status
                WHEN pm.status = 'failed' THEN 'failed'::payment_status
                WHEN pm.status = 'cancelled' THEN 'cancelled'::payment_status
                ELSE 'pending'::payment_status
            END,
            'paymongo'::payment_method,
            'qrph'::payment_source_type,
            pm.qr_code_url,
            pm.qr_code_data,
            pm.expires_at,
            pm.metadata,
            pm.created_by,
            pm.created_at,
            pm.updated_at
        FROM public.paymongo_payments pm
        WHERE NOT EXISTS (
            SELECT 1 FROM public.payments p 
            WHERE p.payment_intent_id = pm.payment_intent_id
        );
        
        RAISE NOTICE 'Migrated % records from paymongo_payments to payments', 
            (SELECT COUNT(*) FROM public.paymongo_payments);
    ELSE
        RAISE NOTICE 'paymongo_payments table does not exist, skipping migration';
    END IF;
END $$;

-- Step 4: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payments_payment_intent_id ON public.payments(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_payment_status ON public.payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON public.payments(paid_at);
CREATE INDEX IF NOT EXISTS idx_payments_created_by ON public.payments(created_by);

-- Step 5: Create updated_at trigger
CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_payments_updated_at ON public.payments;
CREATE TRIGGER trigger_update_payments_updated_at
    BEFORE UPDATE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION update_payments_updated_at();

-- Step 6: Add RLS policies
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view payments for their orders" ON public.payments;
DROP POLICY IF EXISTS "Cashiers and admins can create payments" ON public.payments;
DROP POLICY IF EXISTS "Cashiers and admins can update payments" ON public.payments;
DROP POLICY IF EXISTS "Only admins can delete payments" ON public.payments;

-- Create new policies
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

CREATE POLICY "Cashiers and admins can create payments" ON public.payments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles up 
            WHERE up.id = auth.uid() 
            AND up.role IN ('admin', 'cashier')
        )
    );

CREATE POLICY "Cashiers and admins can update payments" ON public.payments
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up 
            WHERE up.id = auth.uid() 
            AND up.role IN ('admin', 'cashier')
        )
    );

CREATE POLICY "Only admins can delete payments" ON public.payments
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up 
            WHERE up.id = auth.uid() 
            AND up.role = 'admin'
        )
    );

-- Step 7: Add comments for documentation
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

-- Step 8: Optional - Drop old paymongo_payments table (UNCOMMENT IF YOU WANT TO REMOVE IT)
-- WARNING: Only uncomment this if you're sure you want to remove the old table
-- DROP TABLE IF EXISTS public.paymongo_payments;

-- Final success message
DO $$
BEGIN
    RAISE NOTICE 'Payments table migration completed successfully!';
END $$;
