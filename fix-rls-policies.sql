-- =====================================================
-- FIX RLS POLICIES FOR PASSWORD RESET TOKENS
-- =====================================================
-- This script fixes the RLS policies that are blocking token creation
-- =====================================================

-- 1. DROP EXISTING RESTRICTIVE POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Users can read their own password reset tokens" ON public.password_reset_tokens;
DROP POLICY IF EXISTS "Users can read their own email verification tokens" ON public.email_verification_tokens;
DROP POLICY IF EXISTS "Service role can manage password reset tokens" ON public.password_reset_tokens;
DROP POLICY IF EXISTS "Service role can manage email verification tokens" ON public.email_verification_tokens;

-- 2. CREATE MORE PERMISSIVE POLICIES FOR PASSWORD RESET TOKENS
-- =====================================================
-- Allow service role to do everything
CREATE POLICY "Service role full access password reset tokens" ON public.password_reset_tokens
  FOR ALL USING (auth.role() = 'service_role');

-- Allow authenticated users to read their own tokens
CREATE POLICY "Users can read their own password reset tokens" ON public.password_reset_tokens
  FOR SELECT USING (auth.uid() = user_id);

-- Allow anonymous users to insert tokens (for password reset requests)
CREATE POLICY "Allow anonymous token creation" ON public.password_reset_tokens
  FOR INSERT WITH CHECK (true);

-- Allow anonymous users to update tokens (for marking as used)
CREATE POLICY "Allow anonymous token updates" ON public.password_reset_tokens
  FOR UPDATE USING (true);

-- 3. CREATE MORE PERMISSIVE POLICIES FOR EMAIL VERIFICATION TOKENS
-- =====================================================
-- Allow service role to do everything
CREATE POLICY "Service role full access email verification tokens" ON public.email_verification_tokens
  FOR ALL USING (auth.role() = 'service_role');

-- Allow authenticated users to read their own tokens
CREATE POLICY "Users can read their own email verification tokens" ON public.email_verification_tokens
  FOR SELECT USING (auth.uid() = user_id);

-- Allow anonymous users to insert tokens (for email verification requests)
CREATE POLICY "Allow anonymous email token creation" ON public.email_verification_tokens
  FOR INSERT WITH CHECK (true);

-- Allow anonymous users to update tokens (for marking as used)
CREATE POLICY "Allow anonymous email token updates" ON public.email_verification_tokens
  FOR UPDATE USING (true);

-- 4. ALTERNATIVE: DISABLE RLS TEMPORARILY FOR TESTING
-- =====================================================
-- If the above doesn't work, you can temporarily disable RLS:
-- ALTER TABLE public.password_reset_tokens DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.email_verification_tokens DISABLE ROW LEVEL SECURITY;

-- 5. VERIFY POLICIES
-- =====================================================
-- Check current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename IN ('password_reset_tokens', 'email_verification_tokens')
ORDER BY tablename, policyname;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'RLS POLICIES FIXED FOR PASSWORD RESET!';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'New policies created to allow token creation';
    RAISE NOTICE 'Service role has full access';
    RAISE NOTICE 'Anonymous users can create and update tokens';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Try the password reset API again!';
    RAISE NOTICE '=====================================================';
END $$;
