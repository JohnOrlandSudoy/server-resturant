// Updated menu routes with improved bucket storage implementation
// This shows the key improvements for bucket-based image storage

import { Router, Request, Response } from 'express';
import { supabaseService } from '../services/supabaseService';
import { logger } from '../utils/logger';
import { upload, validateImageUpload } from '../middleware/uploadMiddleware';

const router = Router();

// Helper function to generate organized file paths
function generateImagePath(menuItemId: string, originalFilename: string): string {
  const sanitizedName = originalFilename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const timestamp = Date.now();
  const extension = sanitizedName.split('.').pop();
  return `menu-items/${menuItemId}/${timestamp}_${sanitizedName}`;
}

// Helper function to get public URL
function getPublicUrl(filePath: string): string {
  const { data } = supabaseService().getClient()
    .storage
    .from('menu-item-images')
    .getPublicUrl(filePath);
  return data.publicUrl;
}

// Create new menu item with image upload
router.post('/', upload.single('image'), validateImageUpload, async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      price,
      category_id,
      image_url, // Keep for external URLs
      prep_time,
      is_available,
      is_featured,
      calories,
      allergens
    } = req.body;

    // Validate required fields
    if (!name || !price) {
      return res.status(400).json({
        success: false,
        error: 'Name and price are required'
      });
    }

    // Validate price
    if (price <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Price must be greater than 0'
      });
    }

    const menuItemData: any = {
      name,
      description,
      price: parseFloat(price),
      category_id,
      prep_time: prep_time || 0,
      is_available: is_available !== undefined ? is_available : true,
      is_featured: is_featured !== undefined ? is_featured : false,
      calories: calories ? parseInt(calories) : null,
      allergens: allergens ? JSON.parse(allergens) : []
    };

    // Handle image upload if file is present
    let uploadedFilePath: string | null = null;
    
    if (req.file) {
      const file = req.file;
      
      try {
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedTypes.includes(file.mimetype)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed.'
          });
        }

        // Generate temporary ID for file path (will be updated after menu item creation)
        const tempId = `temp_${Date.now()}`;
        const filePath = generateImagePath(tempId, file.originalname);
        uploadedFilePath = filePath;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabaseService().getClient()
          .storage
          .from('menu-item-images')
          .upload(filePath, file.buffer, {
            contentType: file.mimetype,
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          logger.error('Image upload error:', uploadError);
          return res.status(500).json({
            success: false,
            error: 'Failed to upload image: ' + uploadError.message
          });
        }

        // Get public URL
        const publicUrl = getPublicUrl(filePath);

        // Add image data to menu item
        menuItemData.image_url = publicUrl;
        menuItemData.image_filename = filePath; // Store the full path
        menuItemData.image_mime_type = file.mimetype;
        menuItemData.image_size = file.size;
        menuItemData.image_alt_text = name;
        
        logger.info('Image uploaded successfully:', filePath);
        
      } catch (uploadError) {
        logger.error('Image upload failed:', uploadError);
        
        // Clean up uploaded file if menu item creation fails
        if (uploadedFilePath) {
          try {
            await supabaseService().getClient()
              .storage
              .from('menu-item-images')
              .remove([uploadedFilePath]);
            logger.info('Cleaned up uploaded file after error:', uploadedFilePath);
          } catch (cleanupError) {
            logger.error('Failed to cleanup uploaded file:', cleanupError);
          }
        }
        
        return res.status(500).json({
          success: false,
          error: 'Failed to upload image'
        });
      }
    } else if (image_url) {
      // Use external URL if provided
      menuItemData.image_url = image_url;
      menuItemData.image_alt_text = name;
      logger.info('Using external image URL:', image_url);
    }

    // Create the menu item
    const result = await supabaseService().createMenuItem(menuItemData);

    if (!result.success) {
      // Clean up uploaded file if menu item creation fails
      if (uploadedFilePath) {
        try {
          await supabaseService().getClient()
            .storage
            .from('menu-item-images')
            .remove([uploadedFilePath]);
          logger.info('Cleaned up uploaded file after menu item creation error:', uploadedFilePath);
        } catch (cleanupError) {
          logger.error('Failed to cleanup uploaded file:', cleanupError);
        }
      }
      
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    // If we uploaded a file with a temp path, move it to the proper location
    if (uploadedFilePath && result.data?.id) {
      try {
        const newFilePath = generateImagePath(result.data.id, req.file!.originalname);
        
        // Copy file to new location
        const { error: copyError } = await supabaseService().getClient()
          .storage
          .from('menu-item-images')
          .copy(uploadedFilePath, newFilePath);

        if (!copyError) {
          // Update the menu item with the new path
          const newPublicUrl = getPublicUrl(newFilePath);
          await supabaseService().updateMenuItem(result.data.id, {
            image_filename: newFilePath,
            image_url: newPublicUrl
          });

          // Remove the temporary file
          await supabaseService().getClient()
            .storage
            .from('menu-item-images')
            .remove([uploadedFilePath]);

          logger.info('Moved image to proper location:', newFilePath);
        }
      } catch (moveError) {
        logger.error('Failed to move image to proper location:', moveError);
        // Don't fail the operation, the image is still accessible
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Menu item created successfully',
      data: result.data
    });

  } catch (error) {
    logger.error('Create menu item error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create menu item'
    });
  }
});

// Update menu item with image handling
router.put('/:id', upload.single('image'), validateImageUpload, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Menu item ID is required'
      });
    }

    // Check if menu item exists
    const existingItem = await supabaseService().getMenuItemById(id);
    if (!existingItem.success) {
      return res.status(404).json({
        success: false,
        error: 'Menu item not found'
      });
    }

    const updateData: any = {};
    
    // Update basic fields
    if (req.body.name !== undefined) updateData.name = req.body.name;
    if (req.body.description !== undefined) updateData.description = req.body.description;
    if (req.body.price !== undefined) {
      if (req.body.price <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Price must be greater than 0'
        });
      }
      updateData.price = parseFloat(req.body.price);
    }
    if (req.body.category_id !== undefined) updateData.category_id = req.body.category_id;
    if (req.body.prep_time !== undefined) updateData.prep_time = parseInt(req.body.prep_time);
    if (req.body.is_available !== undefined) updateData.is_available = req.body.is_available;
    if (req.body.is_featured !== undefined) updateData.is_featured = req.body.is_featured;
    if (req.body.calories !== undefined) updateData.calories = req.body.calories ? parseInt(req.body.calories) : null;
    if (req.body.allergens !== undefined) updateData.allergens = req.body.allergens;

    // Handle image update
    let uploadedFilePath: string | null = null;
    let oldImagePath: string | null = null;

    if (req.file) {
      const file = req.file;
      
      try {
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedTypes.includes(file.mimetype)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed.'
          });
        }

        // Store old image path for cleanup
        oldImagePath = existingItem.data?.image_filename || null;

        // Generate new file path
        const filePath = generateImagePath(id, file.originalname);
        uploadedFilePath = filePath;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabaseService().getClient()
          .storage
          .from('menu-item-images')
          .upload(filePath, file.buffer, {
            contentType: file.mimetype,
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          logger.error('Image upload error:', uploadError);
          return res.status(500).json({
            success: false,
            error: 'Failed to upload image: ' + uploadError.message
          });
        }

        // Get public URL
        const publicUrl = getPublicUrl(filePath);

        // Add image data to update
        updateData.image_url = publicUrl;
        updateData.image_filename = filePath;
        updateData.image_mime_type = file.mimetype;
        updateData.image_size = file.size;
        updateData.image_alt_text = req.body.name || existingItem.data?.name;
        
        logger.info('Image uploaded successfully for update:', filePath);
        
      } catch (uploadError) {
        logger.error('Image upload failed:', uploadError);
        
        // Clean up uploaded file if update fails
        if (uploadedFilePath) {
          try {
            await supabaseService().getClient()
              .storage
              .from('menu-item-images')
              .remove([uploadedFilePath]);
            logger.info('Cleaned up uploaded file after error:', uploadedFilePath);
          } catch (cleanupError) {
            logger.error('Failed to cleanup uploaded file:', cleanupError);
          }
        }
        
        return res.status(500).json({
          success: false,
          error: 'Failed to upload image'
        });
      }
    } else if (req.body.image_url !== undefined) {
      // Use external URL if provided
      updateData.image_url = req.body.image_url;
      updateData.image_alt_text = req.body.name || existingItem.data?.name;
      
      // Clear file-related fields when using external URL
      updateData.image_filename = null;
      updateData.image_mime_type = null;
      updateData.image_size = null;
      
      // Store old image path for cleanup
      oldImagePath = existingItem.data?.image_filename || null;
      
      logger.info('Using external image URL for update:', req.body.image_url);
    }

    // Update the menu item
    const result = await supabaseService().updateMenuItem(id, updateData);

    if (!result.success) {
      // Clean up uploaded file if database update fails
      if (uploadedFilePath) {
        try {
          await supabaseService().getClient()
            .storage
            .from('menu-item-images')
            .remove([uploadedFilePath]);
          logger.info('Cleaned up uploaded file after database error:', uploadedFilePath);
        } catch (cleanupError) {
          logger.error('Failed to cleanup uploaded file:', cleanupError);
        }
      }
      
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    // Clean up old image file if new image was uploaded
    if (oldImagePath && (uploadedFilePath || req.body.image_url)) {
      try {
        await supabaseService().getClient()
          .storage
          .from('menu-item-images')
          .remove([oldImagePath]);
        logger.info('Cleaned up old image file:', oldImagePath);
      } catch (cleanupError) {
        logger.error('Failed to cleanup old image file:', cleanupError);
      }
    }

    return res.json({
      success: true,
      message: 'Menu item updated successfully',
      data: result.data
    });

  } catch (error) {
    logger.error('Update menu item error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update menu item'
    });
  }
});

// Delete menu item with image cleanup
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Menu item ID is required'
      });
    }

    // Check if menu item exists
    const existingItem = await supabaseService().getMenuItemById(id);
    if (!existingItem.success) {
      return res.status(404).json({
        success: false,
        error: 'Menu item not found'
      });
    }

    // Delete the menu item
    const result = await supabaseService().deleteMenuItem(id);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    // Clean up associated image file from storage
    const imagePath = existingItem.data?.image_filename;
    if (imagePath) {
      try {
        await supabaseService().getClient()
          .storage
          .from('menu-item-images')
          .remove([imagePath]);
        logger.info('Cleaned up image file after menu item deletion:', imagePath);
      } catch (cleanupError) {
        logger.error('Failed to cleanup image file after deletion:', cleanupError);
        // Don't fail the delete operation if image cleanup fails
      }
    }

    return res.json({
      success: true,
      message: 'Menu item deleted successfully'
    });

  } catch (error) {
    logger.error('Delete menu item error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete menu item'
    });
  }
});

export default router;
