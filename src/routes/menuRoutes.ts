import { Router, Request, Response } from 'express';
import { supabaseService } from '../services/supabaseService';
import { logger } from '../utils/logger';

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

    const result = await supabaseService().getMenuItems(page, limit, {
      category,
      available: available === 'true',
      featured: featured === 'true',
      search
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    return res.json({
      success: true,
      data: result.data,
      pagination: {
        page,
        limit,
        total: result.data?.length || 0,
        totalPages: Math.ceil((result.data?.length || 0) / limit)
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

// Get menu item by ID
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

// Create new menu item
router.post('/', async (req: Request, res: Response) => {
  try {
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

    const menuItemData = {
      name,
      description,
      price: parseFloat(price),
      category_id,
      image_url,
      prep_time: prep_time || 0,
      is_available: is_available !== undefined ? is_available : true,
      is_featured: is_featured !== undefined ? is_featured : false,
      calories: calories ? parseInt(calories) : null,
      allergens: allergens || []
    };

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
