-- Fix RLS policies for menu-item-images bucket
-- Run this in your Supabase SQL editor

-- First, drop the existing restrictive policies
DROP POLICY IF EXISTS "Allow authenticated users to upload menu item images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to menu item images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their own menu item images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own menu item images" ON storage.objects;

-- Create more permissive policies for development/testing
-- Allow authenticated users to upload images
CREATE POLICY "Allow authenticated users to upload menu item images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'menu-item-images');

-- Allow public read access to menu item images
CREATE POLICY "Allow public read access to menu item images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'menu-item-images');

-- Allow authenticated users to update any menu item images
CREATE POLICY "Allow authenticated users to update menu item images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'menu-item-images');

-- Allow authenticated users to delete any menu item images
CREATE POLICY "Allow authenticated users to delete menu item images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'menu-item-images');

-- Alternative: If you want to disable RLS completely for testing
-- (NOT recommended for production)
-- ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Check current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';
