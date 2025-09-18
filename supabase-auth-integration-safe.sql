-- =====================================================
-- SAFE SUPABASE AUTH INTEGRATION FOR PASSWORD RESET
-- =====================================================
-- This script is designed to be safe to run on your existing database
-- It checks for existing columns and functions before creating new ones
-- =====================================================

-- 1. SAFELY ADD PASSWORD AND EMAIL VERIFICATION FIELDS TO USER_PROFILES
-- =====================================================
-- Check if columns exist before adding them
DO $$
BEGIN
    -- Add password_hash column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'password_hash'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN password_hash character varying;
    END IF;

    -- Add email_verified column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'email_verified'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN email_verified boolean DEFAULT false;
    END IF;

    -- Add email_verification_token column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'email_verification_token'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN email_verification_token character varying;
    END IF;

    -- Add password_reset_token column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'password_reset_token'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN password_reset_token character varying;
    END IF;

    -- Add password_reset_expires column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'password_reset_expires'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN password_reset_expires timestamp with time zone;
    END IF;
END $$;

-- 2. SAFELY CREATE PASSWORD RESET TOKENS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  token character varying NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  used boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE
);

-- 3. SAFELY CREATE EMAIL VERIFICATION TOKENS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.email_verification_tokens (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  token character varying NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  used boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT email_verification_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT email_verification_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE
);

-- 4. SAFELY CREATE INDEXES FOR BETTER PERFORMANCE
-- =====================================================
-- Password reset tokens indexes
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON public.password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON public.password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON public.password_reset_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_used ON public.password_reset_tokens(used);

-- Email verification tokens indexes
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON public.email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token ON public.email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_expires_at ON public.email_verification_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_used ON public.email_verification_tokens(used);

-- 5. SAFELY CREATE UTILITY FUNCTIONS
-- =====================================================

-- Function to clean up expired tokens (safe to recreate)
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
  -- Delete expired password reset tokens
  DELETE FROM public.password_reset_tokens 
  WHERE expires_at < NOW() AND used = false;
  
  -- Delete expired email verification tokens
  DELETE FROM public.email_verification_tokens 
  WHERE expires_at < NOW() AND used = false;
  
  -- Log cleanup activity
  RAISE NOTICE 'Cleaned up expired tokens at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to generate secure tokens (safe to recreate)
CREATE OR REPLACE FUNCTION generate_secure_token()
RETURNS text AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- 6. SAFELY CREATE PASSWORD RESET FUNCTIONS
-- =====================================================

-- Function to create password reset token (safe to recreate)
CREATE OR REPLACE FUNCTION create_password_reset_token(user_email text)
RETURNS json AS $$
DECLARE
  user_record record;
  token_value text;
  expires_at timestamp with time zone;
BEGIN
  -- Find user by email
  SELECT * INTO user_record 
  FROM public.user_profiles 
  WHERE email = user_email AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found or inactive'
    );
  END IF;
  
  -- Generate secure token
  token_value := generate_secure_token();
  expires_at := NOW() + INTERVAL '1 hour'; -- Token expires in 1 hour
  
  -- Insert token record
  INSERT INTO public.password_reset_tokens (user_id, token, expires_at)
  VALUES (user_record.id, token_value, expires_at);
  
  -- Update user record
  UPDATE public.user_profiles 
  SET 
    password_reset_token = token_value,
    password_reset_expires = expires_at
  WHERE id = user_record.id;
  
  RETURN json_build_object(
    'success', true,
    'token', token_value,
    'expires_at', expires_at,
    'user_id', user_record.id
  );
END;
$$ LANGUAGE plpgsql;

-- Function to verify password reset token (safe to recreate)
CREATE OR REPLACE FUNCTION verify_password_reset_token(token_value text)
RETURNS json AS $$
DECLARE
  token_record record;
  user_record record;
BEGIN
  -- Find token
  SELECT * INTO token_record 
  FROM public.password_reset_tokens 
  WHERE token = token_value AND used = false;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid or expired token'
    );
  END IF;
  
  -- Check if token is expired
  IF token_record.expires_at < NOW() THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Token has expired'
    );
  END IF;
  
  -- Get user information
  SELECT * INTO user_record 
  FROM public.user_profiles 
  WHERE id = token_record.user_id;
  
  RETURN json_build_object(
    'success', true,
    'user_id', user_record.id,
    'username', user_record.username,
    'email', user_record.email
  );
END;
$$ LANGUAGE plpgsql;

-- Function to reset password (safe to recreate)
CREATE OR REPLACE FUNCTION reset_user_password(token_value text, new_password_hash text)
RETURNS json AS $$
DECLARE
  token_record record;
  user_record record;
BEGIN
  -- Verify token
  SELECT * INTO token_record 
  FROM public.password_reset_tokens 
  WHERE token = token_value AND used = false;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid or expired token'
    );
  END IF;
  
  -- Check if token is expired
  IF token_record.expires_at < NOW() THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Token has expired'
    );
  END IF;
  
  -- Update user password
  UPDATE public.user_profiles 
  SET 
    password_hash = new_password_hash,
    password_reset_token = NULL,
    password_reset_expires = NULL,
    updated_at = NOW()
  WHERE id = token_record.user_id;
  
  -- Mark token as used
  UPDATE public.password_reset_tokens 
  SET used = true 
  WHERE id = token_record.id;
  
  -- Get updated user information
  SELECT * INTO user_record 
  FROM public.user_profiles 
  WHERE id = token_record.user_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Password reset successfully',
    'user_id', user_record.id,
    'username', user_record.username
  );
END;
$$ LANGUAGE plpgsql;

-- 7. SAFELY CREATE EMAIL VERIFICATION FUNCTIONS
-- =====================================================

-- Function to create email verification token (safe to recreate)
CREATE OR REPLACE FUNCTION create_email_verification_token(user_email text)
RETURNS json AS $$
DECLARE
  user_record record;
  token_value text;
  expires_at timestamp with time zone;
BEGIN
  -- Find user by email
  SELECT * INTO user_record 
  FROM public.user_profiles 
  WHERE email = user_email AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found or inactive'
    );
  END IF;
  
  -- Generate secure token
  token_value := generate_secure_token();
  expires_at := NOW() + INTERVAL '24 hours'; -- Token expires in 24 hours
  
  -- Insert token record
  INSERT INTO public.email_verification_tokens (user_id, token, expires_at)
  VALUES (user_record.id, token_value, expires_at);
  
  -- Update user record
  UPDATE public.user_profiles 
  SET 
    email_verification_token = token_value
  WHERE id = user_record.id;
  
  RETURN json_build_object(
    'success', true,
    'token', token_value,
    'expires_at', expires_at,
    'user_id', user_record.id
  );
END;
$$ LANGUAGE plpgsql;

-- Function to verify email (safe to recreate)
CREATE OR REPLACE FUNCTION verify_user_email(token_value text)
RETURNS json AS $$
DECLARE
  token_record record;
  user_record record;
BEGIN
  -- Find token
  SELECT * INTO token_record 
  FROM public.email_verification_tokens 
  WHERE token = token_value AND used = false;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid or expired token'
    );
  END IF;
  
  -- Check if token is expired
  IF token_record.expires_at < NOW() THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Token has expired'
    );
  END IF;
  
  -- Update user email verification status
  UPDATE public.user_profiles 
  SET 
    email_verified = true,
    email_verification_token = NULL,
    updated_at = NOW()
  WHERE id = token_record.user_id;
  
  -- Mark token as used
  UPDATE public.email_verification_tokens 
  SET used = true 
  WHERE id = token_record.id;
  
  -- Get updated user information
  SELECT * INTO user_record 
  FROM public.user_profiles 
  WHERE id = token_record.user_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Email verified successfully',
    'user_id', user_record.id,
    'username', user_record.username,
    'email', user_record.email
  );
END;
$$ LANGUAGE plpgsql;

-- 8. SAFELY GRANT PERMISSIONS
-- =====================================================
-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION create_password_reset_token(text) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_password_reset_token(text) TO authenticated;
GRANT EXECUTE ON FUNCTION reset_user_password(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION create_email_verification_token(text) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_user_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_tokens() TO authenticated;
GRANT EXECUTE ON FUNCTION generate_secure_token() TO authenticated;

-- 9. SAFELY ENABLE ROW LEVEL SECURITY
-- =====================================================
-- Enable RLS on new tables
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_verification_tokens ENABLE ROW LEVEL SECURITY;

-- 10. SAFELY CREATE RLS POLICIES
-- =====================================================
-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can read their own password reset tokens" ON public.password_reset_tokens;
DROP POLICY IF EXISTS "Users can read their own email verification tokens" ON public.email_verification_tokens;
DROP POLICY IF EXISTS "Service role can manage password reset tokens" ON public.password_reset_tokens;
DROP POLICY IF EXISTS "Service role can manage email verification tokens" ON public.email_verification_tokens;

-- Create new policies
CREATE POLICY "Users can read their own password reset tokens" ON public.password_reset_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can read their own email verification tokens" ON public.email_verification_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage password reset tokens" ON public.password_reset_tokens
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage email verification tokens" ON public.email_verification_tokens
  FOR ALL USING (auth.role() = 'service_role');

-- 11. ADD COMMENTS FOR DOCUMENTATION
-- =====================================================
COMMENT ON TABLE public.password_reset_tokens IS 'Stores password reset tokens for secure password reset functionality';
COMMENT ON TABLE public.email_verification_tokens IS 'Stores email verification tokens for email verification functionality';
COMMENT ON FUNCTION create_password_reset_token(text) IS 'Creates a secure password reset token for the given email';
COMMENT ON FUNCTION verify_password_reset_token(text) IS 'Verifies a password reset token and returns user information';
COMMENT ON FUNCTION reset_user_password(text, text) IS 'Resets user password using a valid token';
COMMENT ON FUNCTION create_email_verification_token(text) IS 'Creates an email verification token for the given email';
COMMENT ON FUNCTION verify_user_email(text) IS 'Verifies user email using a valid token';

-- 12. VERIFICATION QUERIES
-- =====================================================
-- These queries help verify the installation was successful

-- Check if new columns were added
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public'
AND column_name IN ('password_hash', 'email_verified', 'email_verification_token', 'password_reset_token', 'password_reset_expires')
ORDER BY column_name;

-- Check if new tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('password_reset_tokens', 'email_verification_tokens')
ORDER BY table_name;

-- Check if functions were created
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'create_password_reset_token', 
    'verify_password_reset_token', 
    'reset_user_password',
    'create_email_verification_token',
    'verify_user_email',
    'cleanup_expired_tokens',
    'generate_secure_token'
)
ORDER BY routine_name;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'SUPABASE AUTH INTEGRATION INSTALLED SUCCESSFULLY!';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'New tables created: password_reset_tokens, email_verification_tokens';
    RAISE NOTICE 'New columns added to user_profiles: password_hash, email_verified, etc.';
    RAISE NOTICE 'New functions created: create_password_reset_token, verify_password_reset_token, etc.';
    RAISE NOTICE 'RLS policies enabled for security';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'You can now use the password reset API endpoints!';
    RAISE NOTICE '=====================================================';
END $$;
