-- Quick fix: Allow public access for testing
-- Run this in your Supabase SQL Editor

-- Drop the restrictive authenticated-only policies
DROP POLICY IF EXISTS "Allow authenticated users to upload menu item images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their own menu item images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own menu item images" ON storage.objects;

-- Create public access policies for testing
CREATE POLICY "Allow public upload to menu item images"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'menu-item-images');

CREATE POLICY "Allow public update to menu item images"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'menu-item-images');

CREATE POLICY "Allow public delete to menu item images"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'menu-item-images');

-- Keep the existing public read policy (it's already correct)
-- "Allow public read access to menu item images" already exists and is correct
