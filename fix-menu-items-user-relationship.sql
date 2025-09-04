-- =====================================================
-- Fix menu_items relationship with user_profiles
-- Add created_by and updated_by columns with foreign keys
-- =====================================================

-- Add created_by and updated_by columns to menu_items
ALTER TABLE public.menu_items 
ADD COLUMN created_by UUID,
ADD COLUMN updated_by UUID;

-- Add foreign key constraints
ALTER TABLE public.menu_items 
ADD CONSTRAINT menu_items_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.user_profiles(id);

ALTER TABLE public.menu_items 
ADD CONSTRAINT menu_items_updated_by_fkey 
FOREIGN KEY (updated_by) REFERENCES public.user_profiles(id);

-- Add indexes for performance
CREATE INDEX idx_menu_items_created_by ON public.menu_items(created_by);
CREATE INDEX idx_menu_items_updated_by ON public.menu_items(updated_by);

-- Update existing menu items to have created_by and updated_by
-- Set to admin user (assuming admin user exists)
UPDATE public.menu_items 
SET 
    created_by = (SELECT id FROM public.user_profiles WHERE username = 'admin' LIMIT 1),
    updated_by = (SELECT id FROM public.user_profiles WHERE username = 'admin' LIMIT 1)
WHERE created_by IS NULL OR updated_by IS NULL;

-- Add similar columns to menu_categories for consistency
ALTER TABLE public.menu_categories 
ADD COLUMN created_by UUID,
ADD COLUMN updated_by UUID;

-- Add foreign key constraints for menu_categories
ALTER TABLE public.menu_categories 
ADD CONSTRAINT menu_categories_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.user_profiles(id);

ALTER TABLE public.menu_categories 
ADD CONSTRAINT menu_categories_updated_by_fkey 
FOREIGN KEY (updated_by) REFERENCES public.user_profiles(id);

-- Add indexes for menu_categories
CREATE INDEX idx_menu_categories_created_by ON public.menu_categories(created_by);
CREATE INDEX idx_menu_categories_updated_by ON public.menu_categories(updated_by);

-- Update existing menu categories to have created_by and updated_by
UPDATE public.menu_categories 
SET 
    created_by = (SELECT id FROM public.user_profiles WHERE username = 'admin' LIMIT 1),
    updated_by = (SELECT id FROM public.user_profiles WHERE username = 'admin' LIMIT 1)
WHERE created_by IS NULL OR updated_by IS NULL;

-- Add image-related columns to menu_items (from your original schema)
ALTER TABLE public.menu_items 
ADD COLUMN IF NOT EXISTS image_file BYTEA,
ADD COLUMN IF NOT EXISTS image_filename VARCHAR(255),
ADD COLUMN IF NOT EXISTS image_mime_type VARCHAR(255),
ADD COLUMN IF NOT EXISTS image_size INTEGER,
ADD COLUMN IF NOT EXISTS image_alt_text VARCHAR(255),
ADD COLUMN IF NOT EXISTS image_uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add image-related columns to menu_categories (from your original schema)
ALTER TABLE public.menu_categories 
ADD COLUMN IF NOT EXISTS image_file BYTEA,
ADD COLUMN IF NOT EXISTS image_filename VARCHAR(255),
ADD COLUMN IF NOT EXISTS image_mime_type VARCHAR(255),
ADD COLUMN IF NOT EXISTS image_size INTEGER,
ADD COLUMN IF NOT EXISTS image_alt_text VARCHAR(255),
ADD COLUMN IF NOT EXISTS image_uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add image-related columns to user_profiles (from your original schema)
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS avatar_file BYTEA,
ADD COLUMN IF NOT EXISTS avatar_filename VARCHAR(255),
ADD COLUMN IF NOT EXISTS avatar_mime_type VARCHAR(255),
ADD COLUMN IF NOT EXISTS avatar_size INTEGER,
ADD COLUMN IF NOT EXISTS avatar_alt_text VARCHAR(255),
ADD COLUMN IF NOT EXISTS avatar_uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update the view to include creator/updater information
DROP VIEW IF EXISTS menu_items_with_categories;

CREATE VIEW menu_items_with_categories AS
SELECT 
    mi.id,
    mi.name,
    mi.description,
    mi.price,
    mi.category_id,
    mc.name as category_name,
    mi.image_url,
    mi.prep_time,
    mi.is_available,
    mi.is_featured,
    mi.popularity,
    mi.calories,
    mi.allergens,
    mi.is_active,
    mi.created_at,
    mi.updated_at,
    mi.created_by,
    mi.updated_by,
    creator.username as creator_username,
    creator.first_name as creator_first_name,
    creator.last_name as creator_last_name,
    updater.username as updater_username,
    updater.first_name as updater_first_name,
    updater.last_name as updater_last_name
FROM menu_items mi
LEFT JOIN menu_categories mc ON mi.category_id = mc.id
LEFT JOIN user_profiles creator ON mi.created_by = creator.id
LEFT JOIN user_profiles updater ON mi.updated_by = updater.id
WHERE mi.is_active = true;

-- Add comments for the new columns
COMMENT ON COLUMN public.menu_items.created_by IS 'User who created this menu item';
COMMENT ON COLUMN public.menu_items.updated_by IS 'User who last updated this menu item';
COMMENT ON COLUMN public.menu_categories.created_by IS 'User who created this category';
COMMENT ON COLUMN public.menu_categories.updated_by IS 'User who last updated this category';

-- =====================================================
-- END OF SCHEMA UPDATE
-- =====================================================
