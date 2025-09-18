-- Add missing password reset functions to your existing database
-- This script adds the functions that are missing from your current schema

-- 1. Create function to generate secure tokens
CREATE OR REPLACE FUNCTION generate_secure_token()
RETURNS text AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- 2. Create function to create password reset token
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
  -- Set expiration to 1 HOUR from now
  expires_at := NOW() + INTERVAL '1 hour';
  
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

-- 3. Create function to verify password reset token
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

-- 4. Create function to reset password
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

-- 5. Test the functions
SELECT 'Functions created successfully!' as status;

-- Test create token function
SELECT create_password_reset_token('johnorlandsudoy49@gmail.com') as test_result;
