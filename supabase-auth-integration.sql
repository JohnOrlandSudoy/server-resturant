-- Supabase Auth Integration for Password Reset
-- Run this script in your Supabase SQL editor

-- 1. Add password and email verification fields to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS password_hash character varying,
ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS email_verification_token character varying,
ADD COLUMN IF NOT EXISTS password_reset_token character varying,
ADD COLUMN IF NOT EXISTS password_reset_expires timestamp with time zone;

-- 2. Create password reset tokens table for tracking
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

-- 3. Create email verification tokens table
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

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON public.password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON public.password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON public.password_reset_tokens(expires_at);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON public.email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token ON public.email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_expires_at ON public.email_verification_tokens(expires_at);

-- 5. Create function to clean up expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
  -- Delete expired password reset tokens
  DELETE FROM public.password_reset_tokens 
  WHERE expires_at < NOW() AND used = false;
  
  -- Delete expired email verification tokens
  DELETE FROM public.email_verification_tokens 
  WHERE expires_at < NOW() AND used = false;
END;
$$ LANGUAGE plpgsql;

-- 6. Create function to generate secure tokens
CREATE OR REPLACE FUNCTION generate_secure_token()
RETURNS text AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- 7. Create function to create password reset token
CREATE OR REPLACE FUNCTION create_password_reset_token(user_email text)
RETURNS json AS $$
DECLARE
  user_record record;
  token_value text;
  expires_at timestamp with time zone;
  result json;
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

-- 8. Create function to verify password reset token
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

-- 9. Create function to reset password
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

-- 10. Create function to create email verification token
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

-- 11. Create function to verify email
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

-- 12. Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_password_reset_token(text) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_password_reset_token(text) TO authenticated;
GRANT EXECUTE ON FUNCTION reset_user_password(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION create_email_verification_token(text) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_user_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_tokens() TO authenticated;
GRANT EXECUTE ON FUNCTION generate_secure_token() TO authenticated;

-- 13. Create RLS policies for password reset tokens
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_verification_tokens ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own tokens
CREATE POLICY "Users can read their own password reset tokens" ON public.password_reset_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can read their own email verification tokens" ON public.email_verification_tokens
  FOR SELECT USING (auth.uid() = user_id);

-- Allow service role to manage all tokens
CREATE POLICY "Service role can manage password reset tokens" ON public.password_reset_tokens
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage email verification tokens" ON public.email_verification_tokens
  FOR ALL USING (auth.role() = 'service_role');

-- 14. Create a scheduled job to clean up expired tokens (optional)
-- This would need to be set up in Supabase dashboard or via pg_cron
-- SELECT cron.schedule('cleanup-expired-tokens', '0 2 * * *', 'SELECT cleanup_expired_tokens();');

COMMENT ON TABLE public.password_reset_tokens IS 'Stores password reset tokens for secure password reset functionality';
COMMENT ON TABLE public.email_verification_tokens IS 'Stores email verification tokens for email verification functionality';
COMMENT ON FUNCTION create_password_reset_token(text) IS 'Creates a secure password reset token for the given email';
COMMENT ON FUNCTION verify_password_reset_token(text) IS 'Verifies a password reset token and returns user information';
COMMENT ON FUNCTION reset_user_password(text, text) IS 'Resets user password using a valid token';
COMMENT ON FUNCTION create_email_verification_token(text) IS 'Creates an email verification token for the given email';
COMMENT ON FUNCTION verify_user_email(text) IS 'Verifies user email using a valid token';
