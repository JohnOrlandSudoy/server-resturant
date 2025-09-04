import { Router, Request, Response } from 'express';
import { supabaseService } from '../services/supabaseService';
import { logger } from '../utils/logger';
import { upload } from '../middleware/uploadMiddleware';

const router = Router();

// Get all menu items with optional filtering
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query['page'] as string) || 1;
    const limit = parseInt(req.query['limit'] as string) || 50;
    const category = req.query['category'] as string;
    const available = req.query['available'] as string;
    const featured = req.query['featured'] as string;
    const search = req.query['search'] as string;

    logger.info('GET /api/menus called with:', { page, limit, category, available, featured, search });

    // Use direct query like the test endpoint
    const { data, error } = await supabaseService().getClient()
      .from('menu_items')
      .select(`
        *,
        creator:user_profiles!created_by(id, username, first_name, last_name, role),
        updater:user_profiles!updated_by(id, username, first_name, last_name, role)
      `);

    logger.info('Direct query result:', { 
      dataCount: data?.length || 0, 
      error: error?.message || 'none' 
    });

    if (error) {
      return res.status(500).json({
        success: false,
        error: `Database error: ${error.message}`
      });
    }

    // Filter by is_active = true
    let finalData = (data || []).filter(item => item.is_active === true);
    
    // Apply additional filters if provided
    if (category) {
      finalData = finalData.filter(item => item.category_id === category);
    }
    if (available !== undefined) {
      finalData = finalData.filter(item => item.is_available === (available === 'true'));
    }
    if (featured !== undefined) {
      finalData = finalData.filter(item => item.is_featured === (featured === 'true'));
    }
    if (search) {
      finalData = finalData.filter(item => 
        item.name.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    // Apply pagination
    const offset = (page - 1) * limit;
    const paginatedData = finalData.slice(offset, offset + limit);

    return res.json({
      success: true,
      data: paginatedData,
      pagination: {
        page,
        limit,
        total: finalData.length,
        totalPages: Math.ceil(finalData.length / limit)
      }
    });

  } catch (error) {
    logger.error('Get menu items error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch menu items'
    });
  }
});

// Move static routes above dynamic :id
// Get menu categories
router.get('/categories', async (_req: Request, res: Response) => {
  try {
    const result = await supabaseService().getMenuCategories();

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    return res.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    logger.error('Get menu categories error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch menu categories'
    });
  }
});

// Get joined items with categories
router.get('/items-with-categories', async (_req: Request, res: Response) => {
  try {
    const result = await supabaseService().getMenuItemsWithCategories();
    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error });
    }
    return res.json({ success: true, data: result.data });
  } catch (error) {
    logger.error('Get items-with-categories error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch items with categories' });
  }
});

// Create category
router.post('/categories', async (req: Request, res: Response) => {
  try {
    const { name, description, image_url, sort_order, is_active } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }
    const result = await supabaseService().createMenuCategory({
      name,
      description,
      image_url,
      sort_order,
      is_active
    });
    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error });
    }
    return res.status(201).json({ success: true, data: result.data });
  } catch (error) {
    logger.error('Create category error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create category' });
  }
});

// Update category
router.put('/categories/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Category ID is required' });
    }
    const exists = await supabaseService().getMenuCategoryById(id);
    if (!exists.success || !exists.data) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }
    const result = await supabaseService().updateMenuCategory(id, req.body);
    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error });
    }
    return res.json({ success: true, data: result.data });
  } catch (error) {
    logger.error('Update category error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update category' });
  }
});

// Delete category (soft delete)
router.delete('/categories/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Category ID is required' });
    }
    const exists = await supabaseService().getMenuCategoryById(id);
    if (!exists.success || !exists.data) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }
    const result = await supabaseService().deleteMenuCategory(id);
    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error });
    }
    return res.json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    logger.error('Delete category error:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete category' });
  }
});

// Debug endpoint - simple query without joins
router.get('/debug/all', async (_req: Request, res: Response) => {
  try {
    logger.info('Testing direct Supabase query...');
    const { data, error } = await supabaseService().getClient()
      .from('menu_items')
      .select('*');
    logger.info('Direct query result:', { 
      dataCount: data?.length || 0, 
      error: error?.message || 'none',
      sampleData: data?.slice(0, 2)
    });
    return res.json({
      success: true,
      data: data || [],
      count: data?.length || 0,
      error: error?.message || 'none'
    });
  } catch (error) {
    logger.error('Debug query error:', error);
    return res.status(500).json({
      success: false,
      error: `Database error: ${error}`
    });
  }
});

// Test database connection
router.get('/test-db', async (_req: Request, res: Response) => {
  try {
    logger.info('Testing database connection...');
    
    // Test 1: Simple count query
    const { count, error: countError } = await supabaseService().getClient()
      .from('menu_items')
      .select('*', { count: 'exact', head: true });
    
    logger.info('Count query result:', { count, error: countError?.message || 'none' });
    
    // Test 2: Simple select query
    const { data, error } = await supabaseService().getClient()
      .from('menu_items')
      .select('*')
      .limit(5);
    
    logger.info('Select query result:', { 
      dataCount: data?.length || 0, 
      error: error?.message || 'none',
      sampleData: data?.slice(0, 2)
    });
    
    return res.json({
      success: true,
      count: count || 0,
      dataCount: data?.length || 0,
      error: error?.message || 'none',
      sampleData: data?.slice(0, 2) || []
    });
    
  } catch (error) {
    logger.error('Database test error:', error);
    return res.status(500).json({
      success: false,
      error: `Database test failed: ${error}`
    });
  }
});

// Get menu item by ID (keep this after static routes)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Menu item ID is required'
      });
    }

    const result = await supabaseService().getMenuItemById(id);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: result.error || 'Menu item not found'
      });
    }

    return res.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    logger.error('Get menu item error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch menu item'
    });
  }
});

// Create new menu item with optional image upload
router.post('/', upload.single('image'), async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      price,
      category_id,
      image_url, // Keep this for external URLs
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
    if (req.file) {
      const file = req.file;
      
      try {
        // Upload to Supabase Storage
        const fileName = `menu-${Date.now()}-${file.originalname}`;
        const { error: uploadError } = await supabaseService().getClient()
          .storage
          .from('menu-images')
          .upload(fileName, file.buffer, {
            contentType: file.mimetype,
            cacheControl: '3600'
          });

        if (uploadError) {
          logger.error('Image upload error:', uploadError);
          return res.status(500).json({
            success: false,
            error: 'Failed to upload image: ' + uploadError.message
          });
        }

        // Get public URL
        const { data: urlData } = supabaseService().getClient()
          .storage
          .from('menu-images')
          .getPublicUrl(fileName);

        // Add image data to menu item
        menuItemData.image_url = urlData.publicUrl;
        menuItemData.image_filename = fileName;
        menuItemData.image_mime_type = file.mimetype;
        menuItemData.image_size = file.size;
        
        logger.info('Image uploaded successfully:', fileName);
        
      } catch (uploadError) {
        logger.error('Image upload failed:', uploadError);
        return res.status(500).json({
          success: false,
          error: 'Failed to upload image'
        });
      }
    } else if (image_url) {
      // Use external URL if provided
      menuItemData.image_url = image_url;
      logger.info('Using external image URL:', image_url);
    }

    const result = await supabaseService().createMenuItem(menuItemData);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
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

// Update menu item
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Menu item ID is required'
      });
    }

    const {
      name,
      description,
      price,
      category_id,
      image_url,
      prep_time,
      is_available,
      is_featured,
      calories,
      allergens
    } = req.body;

    // Check if menu item exists
    const existingItem = await supabaseService().getMenuItemById(id);
    if (!existingItem.success) {
      return res.status(404).json({
        success: false,
        error: 'Menu item not found'
      });
    }

    // Validate price if provided
    if (price !== undefined && price <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Price must be greater than 0'
      });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = parseFloat(price);
    if (category_id !== undefined) updateData.category_id = category_id;
    if (image_url !== undefined) updateData.image_url = image_url;
    if (prep_time !== undefined) updateData.prep_time = parseInt(prep_time);
    if (is_available !== undefined) updateData.is_available = is_available;
    if (is_featured !== undefined) updateData.is_featured = is_featured;
    if (calories !== undefined) updateData.calories = calories ? parseInt(calories) : null;
    if (allergens !== undefined) updateData.allergens = allergens;

    const result = await supabaseService().updateMenuItem(id, updateData);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
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




// Delete menu item (soft delete by setting is_active to false)
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

    const result = await supabaseService().deleteMenuItem(id);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
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
