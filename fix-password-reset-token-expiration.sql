-- Fix password reset token expiration issue
-- The token should expire in 1 hour, not 1 second

-- Drop and recreate the function with correct expiration time
DROP FUNCTION IF EXISTS create_password_reset_token(text);

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
  -- FIX: Set expiration to 1 HOUR from now, not 1 second
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

-- Test the function to make sure it works
SELECT create_password_reset_token('johnorlandsudoy49@gmail.com');
