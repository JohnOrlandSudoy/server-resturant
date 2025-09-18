-- Fix the password_reset_tokens table structure
-- Add missing columns that the functions expect

-- First, let's check if the table exists and what columns it has
-- If the table doesn't exist, create it
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  token text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  used boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
);

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add 'used' column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'password_reset_tokens' 
                   AND column_name = 'used') THEN
        ALTER TABLE public.password_reset_tokens ADD COLUMN used boolean DEFAULT false;
    END IF;
    
    -- Add 'created_at' column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'password_reset_tokens' 
                   AND column_name = 'created_at') THEN
        ALTER TABLE public.password_reset_tokens ADD COLUMN created_at timestamp with time zone DEFAULT now();
    END IF;
END $$;

-- Add missing columns to user_profiles if they don't exist
DO $$ 
BEGIN
    -- Add 'password_hash' column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_profiles' 
                   AND column_name = 'password_hash') THEN
        ALTER TABLE public.user_profiles ADD COLUMN password_hash text;
    END IF;
    
    -- Add 'password_reset_token' column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_profiles' 
                   AND column_name = 'password_reset_token') THEN
        ALTER TABLE public.user_profiles ADD COLUMN password_reset_token text;
    END IF;
    
    -- Add 'password_reset_expires' column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_profiles' 
                   AND column_name = 'password_reset_expires') THEN
        ALTER TABLE public.user_profiles ADD COLUMN password_reset_expires timestamp with time zone;
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON public.password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON public.password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON public.password_reset_tokens(expires_at);

-- Test the table structure
SELECT 'Table structure fixed!' as status;

-- Test creating a token
SELECT create_password_reset_token('johnorlandsudoy49@gmail.com') as test_result;
