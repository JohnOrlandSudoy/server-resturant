-- Migration script to set up Supabase bucket storage for menu item images
-- Run this in your Supabase SQL editor

-- 1. Create the storage bucket for menu item images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'menu-item-images',
  'menu-item-images',
  true, -- Make bucket public for easy access
  5242880, -- 5MB file size limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- 2. Create RLS policies for the storage bucket
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

-- Allow authenticated users to update their own uploaded images
CREATE POLICY "Allow users to update their own menu item images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'menu-item-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to delete their own uploaded images
CREATE POLICY "Allow users to delete their own menu item images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'menu-item-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 3. Create a function to generate unique file paths for menu item images
CREATE OR REPLACE FUNCTION generate_menu_item_image_path(
  menu_item_id uuid,
  filename text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  file_extension text;
  unique_filename text;
BEGIN
  -- Extract file extension
  file_extension := substring(filename from '\.([^.]*)$');
  
  -- Generate unique filename with menu item ID and timestamp
  unique_filename := menu_item_id::text || '_' || extract(epoch from now())::bigint || '.' || file_extension;
  
  -- Return path in format: menu-items/{user_id}/{unique_filename}
  RETURN 'menu-items/' || auth.uid()::text || '/' || unique_filename;
END;
$$;

-- 4. Create a function to get the public URL for a menu item image
CREATE OR REPLACE FUNCTION get_menu_item_image_url(image_path text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF image_path IS NULL OR image_path = '' THEN
    RETURN NULL;
  END IF;
  
  -- Return the public URL for the image
  RETURN 'https://' || current_setting('app.settings.supabase_url', true) || '/storage/v1/object/public/menu-item-images/' || image_path;
END;
$$;

-- 5. Add a trigger to automatically update image_url when image_path changes
CREATE OR REPLACE FUNCTION update_menu_item_image_url()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update image_url to point to the bucket storage
  NEW.image_url := get_menu_item_image_url(NEW.image_filename);
  
  RETURN NEW;
END;
$$;

-- Create trigger for menu_items table
DROP TRIGGER IF EXISTS trigger_update_menu_item_image_url ON menu_items;
CREATE TRIGGER trigger_update_menu_item_image_url
  BEFORE INSERT OR UPDATE ON menu_items
  FOR EACH ROW
  EXECUTE FUNCTION update_menu_item_image_url();

-- 6. Optional: Add a column to track the storage path (if you want to keep both approaches)
-- ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS image_storage_path text;

-- 7. Create an index for better performance on image queries
CREATE INDEX IF NOT EXISTS idx_menu_items_image_filename ON menu_items(image_filename) WHERE image_filename IS NOT NULL;

-- 8. Update existing records to use the new image_url format (if they have image_filename)
UPDATE menu_items 
SET image_url = get_menu_item_image_url(image_filename)
WHERE image_filename IS NOT NULL AND image_filename != '';

-- Grant necessary permissions
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT ALL ON storage.objects TO authenticated;
