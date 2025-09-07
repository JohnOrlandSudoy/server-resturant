# Menu Item Image Bucket Implementation Guide

This guide explains how to implement Supabase bucket storage for menu item images, replacing the current `image_url` approach with a more robust file storage system.

## Overview

The implementation includes:
1. **Supabase Storage Bucket**: `menu-item-images` bucket with proper RLS policies
2. **Database Schema**: Updated `menu_items` table with image metadata fields
3. **API Routes**: Updated endpoints for image upload/management
4. **File Organization**: Structured file paths for better organization

## 1. Database Migration

Run the `menu-items-bucket-migration.sql` script in your Supabase SQL editor:

```sql
-- Creates the storage bucket
-- Sets up RLS policies
-- Creates helper functions
-- Adds triggers for automatic URL generation
```

### Key Features:
- **Bucket**: `menu-item-images` (public, 5MB limit, image types only)
- **RLS Policies**: Secure access control for authenticated users
- **Helper Functions**: 
  - `generate_menu_item_image_path()` - Creates organized file paths
  - `get_menu_item_image_url()` - Generates public URLs
- **Trigger**: Automatically updates `image_url` when `image_filename` changes

## 2. File Organization Structure

```
menu-item-images/
├── menu-items/
│   ├── {menu_item_id}/
│   │   ├── {timestamp}_{original_filename}
│   │   └── {timestamp}_{original_filename}
│   └── {menu_item_id}/
│       └── {timestamp}_{original_filename}
```

### Benefits:
- **Organized**: Files grouped by menu item ID
- **Unique**: Timestamp prevents conflicts
- **Traceable**: Easy to find files for specific menu items

## 3. Database Schema Fields

The `menu_items` table includes these image-related fields:

```sql
-- Legacy field (kept for backward compatibility)
image_url character varying

-- New bucket storage fields
image_file bytea                    -- Actual file data (optional)
image_filename character varying    -- Storage path in bucket
image_mime_type character varying   -- File MIME type
image_size integer                  -- File size in bytes
image_alt_text character varying    -- Accessibility text
image_uploaded_at timestamp with time zone -- Upload timestamp
```

## 4. API Implementation

### Key Changes in Routes:

1. **Bucket Name**: Changed from `'menu-images'` to `'menu-item-images'`
2. **File Paths**: Organized structure with menu item IDs
3. **Error Handling**: Proper cleanup of uploaded files on failure
4. **URL Generation**: Automatic public URL generation

### Upload Process:

```typescript
// 1. Validate file type and size
const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

// 2. Generate organized file path
const filePath = generateImagePath(menuItemId, file.originalname);

// 3. Upload to bucket
const { error } = await supabase.storage
  .from('menu-item-images')
  .upload(filePath, file.buffer, {
    contentType: file.mimetype,
    cacheControl: '3600'
  });

// 4. Get public URL
const publicUrl = getPublicUrl(filePath);

// 5. Store metadata in database
await supabase.from('menu_items').update({
  image_filename: filePath,
  image_url: publicUrl,
  image_mime_type: file.mimetype,
  image_size: file.size
});
```

## 5. Migration Steps

### Step 1: Run Database Migration
```bash
# Execute the SQL migration in Supabase dashboard
psql -h your-db-host -U postgres -d your-db -f menu-items-bucket-migration.sql
```

### Step 2: Update Application Code
```bash
# Replace the current menu routes with the updated version
cp menu-routes-bucket-update.ts src/routes/menuRoutes.ts
```

### Step 3: Test the Implementation
```bash
# Test image upload
curl -X POST http://localhost:3000/api/menus \
  -F "name=Test Item" \
  -F "price=10.99" \
  -F "image=@test-image.jpg"

# Test image update
curl -X PUT http://localhost:3000/api/menus/{id} \
  -F "name=Updated Item" \
  -F "image=@new-image.jpg"
```

## 6. Security Features

### RLS Policies:
- **Upload**: Only authenticated users can upload
- **Read**: Public read access for images
- **Update/Delete**: Users can only modify their own uploads

### File Validation:
- **Type**: Only image files allowed
- **Size**: 5MB maximum file size
- **Extension**: Validated against allowed types

### Cleanup:
- **Failed Uploads**: Automatic cleanup on errors
- **Old Images**: Removed when updating/deleting menu items
- **Orphaned Files**: Can be cleaned up with maintenance scripts

## 7. Benefits of Bucket Storage

### Performance:
- **CDN**: Supabase provides global CDN for images
- **Caching**: Proper cache headers for better performance
- **Scalability**: No database bloat from large files

### Reliability:
- **Backup**: Automatic backups with Supabase
- **Redundancy**: Multiple copies across regions
- **Monitoring**: Built-in monitoring and alerts

### Cost:
- **Storage**: More cost-effective than database storage
- **Bandwidth**: Optimized delivery reduces costs
- **Scaling**: Pay only for what you use

## 8. Monitoring and Maintenance

### Health Checks:
```sql
-- Check bucket usage
SELECT 
  bucket_id,
  COUNT(*) as file_count,
  SUM(metadata->>'size')::bigint as total_size
FROM storage.objects 
WHERE bucket_id = 'menu-item-images'
GROUP BY bucket_id;

-- Check for orphaned files
SELECT o.name 
FROM storage.objects o
LEFT JOIN menu_items m ON m.image_filename = o.name
WHERE o.bucket_id = 'menu-item-images' 
  AND m.id IS NULL;
```

### Cleanup Script:
```sql
-- Remove orphaned files (run periodically)
DELETE FROM storage.objects 
WHERE bucket_id = 'menu-item-images' 
  AND name NOT IN (
    SELECT image_filename 
    FROM menu_items 
    WHERE image_filename IS NOT NULL
  );
```

## 9. Troubleshooting

### Common Issues:

1. **Upload Fails**: Check RLS policies and bucket permissions
2. **Images Not Loading**: Verify public bucket setting
3. **File Not Found**: Check file path generation logic
4. **Permission Denied**: Ensure user is authenticated

### Debug Commands:
```bash
# Check bucket exists
curl -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  https://your-project.supabase.co/storage/v1/bucket/menu-item-images

# List files in bucket
curl -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  https://your-project.supabase.co/storage/v1/object/list/menu-item-images
```

## 10. Future Enhancements

### Planned Features:
- **Image Resizing**: Automatic thumbnail generation
- **WebP Conversion**: Optimize images for web delivery
- **Watermarking**: Add restaurant branding to images
- **Batch Upload**: Multiple image upload support
- **Image Analytics**: Track image usage and performance

### Integration Options:
- **Cloudinary**: For advanced image processing
- **AWS S3**: For enterprise-level storage
- **Local Storage**: For development environments

## Conclusion

This implementation provides a robust, scalable solution for menu item image storage with proper security, organization, and performance optimizations. The bucket-based approach is more suitable for production environments and provides better user experience through faster image loading and better organization.
