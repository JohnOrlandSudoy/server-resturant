-- =====================================================
-- Fix Inventory RLS Policies for JWT Authentication
-- The current policies use auth.uid() which doesn't work with JWT tokens
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admin can manage ingredients" ON public.ingredients;
DROP POLICY IF EXISTS "Admin can manage stock movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Admin can manage menu ingredients" ON public.menu_item_ingredients;
DROP POLICY IF EXISTS "Admin can view stock alerts" ON public.stock_alerts;
DROP POLICY IF EXISTS "Kitchen can view ingredients" ON public.ingredients;
DROP POLICY IF EXISTS "Kitchen can view stock movements" ON public.stock_movements;

-- For development/testing, create permissive policies
-- In production, you should implement proper JWT-based RLS

-- Create permissive policies for development
CREATE POLICY "Allow all operations for development" ON public.ingredients FOR ALL USING (true);
CREATE POLICY "Allow all operations for development" ON public.stock_movements FOR ALL USING (true);
CREATE POLICY "Allow all operations for development" ON public.menu_item_ingredients FOR ALL USING (true);
CREATE POLICY "Allow all operations for development" ON public.stock_alerts FOR ALL USING (true);

-- Alternative: If you want to keep RLS enabled but allow all operations
-- You can also temporarily disable RLS for testing:
-- ALTER TABLE public.ingredients DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.stock_movements DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.menu_item_ingredients DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.stock_alerts DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- END OF RLS FIX
-- =====================================================
