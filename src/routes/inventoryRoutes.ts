import { Router, Request, Response } from 'express';
import { supabaseService } from '../services/supabaseService';
import { logger } from '../utils/logger';
import { adminOnly } from '../middleware/authMiddleware';

const router = Router();

// =====================================================
// INGREDIENTS MANAGEMENT (Admin Only)
// =====================================================

// Get all ingredients
router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await supabaseService().getIngredients();

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
    logger.error('Get ingredients error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch ingredients'
    });
  }
});

// Get ingredient by ID
router.get('/ingredients/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Ingredient ID is required'
      });
    }

    const result = await supabaseService().getIngredientById(id);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: result.error || 'Ingredient not found'
      });
    }

    return res.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    logger.error('Get ingredient error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch ingredient'
    });
  }
});

// Create new ingredient (Admin only)
router.post('/ingredients', adminOnly, async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      unit,
      current_stock,
      min_stock_threshold,
      max_stock_threshold,
      cost_per_unit,
      supplier,
      category,
      storage_location,
      expiry_date
    } = req.body;

    // Validate required fields
    if (!name || !unit) {
      return res.status(400).json({
        success: false,
        error: 'Name and unit are required'
      });
    }

    const ingredientData = {
      name,
      description,
      unit,
      current_stock: current_stock || 0,
      min_stock_threshold: min_stock_threshold || 0,
      max_stock_threshold,
      cost_per_unit,
      supplier,
      category,
      storage_location,
      expiry_date,
      created_by: req.user.id,
      updated_by: req.user.id
    };

    const result = await supabaseService().createIngredient(ingredientData);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Ingredient created successfully',
      data: result.data
    });

  } catch (error) {
    logger.error('Create ingredient error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create ingredient'
    });
  }
});

// Update ingredient (Admin only)
router.put('/ingredients/:id', adminOnly, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Ingredient ID is required'
      });
    }

    // Check if ingredient exists
    const existingIngredient = await supabaseService().getIngredientById(id);
    if (!existingIngredient.success) {
      return res.status(404).json({
        success: false,
        error: 'Ingredient not found'
      });
    }

    const updateData = {
      ...req.body,
      updated_by: req.user.id
    };

    const result = await supabaseService().updateIngredient(id, updateData);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    return res.json({
      success: true,
      message: 'Ingredient updated successfully',
      data: result.data
    });

  } catch (error) {
    logger.error('Update ingredient error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update ingredient'
    });
  }
});

// Delete ingredient (Admin only)
router.delete('/ingredients/:id', adminOnly, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Ingredient ID is required'
      });
    }

    // Check if ingredient exists
    const existingIngredient = await supabaseService().getIngredientById(id);
    if (!existingIngredient.success) {
      return res.status(404).json({
        success: false,
        error: 'Ingredient not found'
      });
    }

    const result = await supabaseService().deleteIngredient(id);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    return res.json({
      success: true,
      message: 'Ingredient deleted successfully'
    });

  } catch (error) {
    logger.error('Delete ingredient error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete ingredient'
    });
  }
});

// =====================================================
// STOCK MOVEMENTS (Admin Only)
// =====================================================

// Get stock movements
router.get('/movements', adminOnly, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query['page'] as string) || 1;
    const limit = parseInt(req.query['limit'] as string) || 50;
    const ingredientId = req.query['ingredient_id'] as string;
    const offset = (page - 1) * limit;

    const result = await supabaseService().getStockMovements(ingredientId, limit, offset);

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
    logger.error('Get stock movements error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch stock movements'
    });
  }
});

// Create stock movement (Admin only)
router.post('/movements', adminOnly, async (req: Request, res: Response) => {
  try {
    const {
      ingredient_id,
      movement_type,
      quantity,
      reason,
      reference_number,
      notes
    } = req.body;

    // Validate required fields
    if (!ingredient_id || !movement_type || !quantity) {
      return res.status(400).json({
        success: false,
        error: 'Ingredient ID, movement type, and quantity are required'
      });
    }

    // Validate movement type
    const validTypes = ['in', 'out', 'adjustment', 'spoilage'];
    if (!validTypes.includes(movement_type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid movement type. Must be one of: in, out, adjustment, spoilage'
      });
    }

    // Validate quantity
    if (quantity <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Quantity must be greater than 0'
      });
    }

    const movementData = {
      ingredient_id,
      movement_type,
      quantity,
      reason,
      reference_number,
      notes,
      performed_by: req.user.id
    };

    const result = await supabaseService().createStockMovement(movementData);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Stock movement recorded successfully',
      data: result.data
    });

  } catch (error) {
    logger.error('Create stock movement error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to record stock movement'
    });
  }
});

// =====================================================
// MENU ITEM INGREDIENTS (Admin Only)
// =====================================================

// Get menu item ingredients
router.get('/menu-items/:menuItemId/ingredients', adminOnly, async (req: Request, res: Response) => {
  try {
    const { menuItemId } = req.params;

    if (!menuItemId) {
      return res.status(400).json({
        success: false,
        error: 'Menu item ID is required'
      });
    }

    const result = await supabaseService().getMenuItemIngredients(menuItemId);

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
    logger.error('Get menu item ingredients error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch menu item ingredients'
    });
  }
});

// Link ingredient to menu item (Admin only)
router.post('/menu-items/:menuItemId/ingredients', adminOnly, async (req: Request, res: Response) => {
  try {
    const { menuItemId } = req.params;
    const {
      ingredient_id,
      quantity_required,
      unit,
      is_optional
    } = req.body;

    if (!menuItemId) {
      return res.status(400).json({
        success: false,
        error: 'Menu item ID is required'
      });
    }

    if (!ingredient_id || !quantity_required || !unit) {
      return res.status(400).json({
        success: false,
        error: 'Ingredient ID, quantity required, and unit are required'
      });
    }

    if (quantity_required <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Quantity required must be greater than 0'
      });
    }

    const linkData = {
      menu_item_id: menuItemId,
      ingredient_id,
      quantity_required,
      unit,
      is_optional: is_optional || false,
      created_by: req.user.id
    };

    const result = await supabaseService().createMenuItemIngredient(linkData);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Ingredient linked to menu item successfully',
      data: result.data
    });

  } catch (error) {
    logger.error('Link ingredient to menu item error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to link ingredient to menu item'
    });
  }
});

// Update menu item ingredient link (Admin only)
router.put('/menu-items/ingredients/:linkId', adminOnly, async (req: Request, res: Response) => {
  try {
    const { linkId } = req.params;
    const { quantity_required, unit, is_optional } = req.body;

    if (!linkId) {
      return res.status(400).json({
        success: false,
        error: 'Link ID is required'
      });
    }

    if (quantity_required !== undefined && quantity_required <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Quantity required must be greater than 0'
      });
    }

    const updateData = {
      quantity_required,
      unit,
      is_optional
    };

    const result = await supabaseService().updateMenuItemIngredient(linkId, updateData);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    return res.json({
      success: true,
      message: 'Ingredient link updated successfully',
      data: result.data
    });

  } catch (error) {
    logger.error('Update menu item ingredient link error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update ingredient link'
    });
  }
});

// Unlink ingredient from menu item (Admin only)
router.delete('/menu-items/ingredients/:linkId', adminOnly, async (req: Request, res: Response) => {
  try {
    const { linkId } = req.params;

    if (!linkId) {
      return res.status(400).json({
        success: false,
        error: 'Link ID is required'
      });
    }

    const result = await supabaseService().deleteMenuItemIngredient(linkId);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    return res.json({
      success: true,
      message: 'Ingredient unlinked from menu item successfully'
    });

  } catch (error) {
    logger.error('Unlink ingredient from menu item error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to unlink ingredient from menu item'
    });
  }
});

// =====================================================
// STOCK ALERTS (Admin Only)
// =====================================================

// Get stock alerts
router.get('/alerts', adminOnly, async (req: Request, res: Response) => {
  try {
    const resolved = req.query['resolved'] === 'true' ? true : 
                    req.query['resolved'] === 'false' ? false : undefined;

    const result = await supabaseService().getStockAlerts(resolved);

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
    logger.error('Get stock alerts error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch stock alerts'
    });
  }
});

// Resolve stock alert (Admin only)
router.put('/alerts/:alertId/resolve', adminOnly, async (req: Request, res: Response) => {
  try {
    const { alertId } = req.params;

    if (!alertId) {
      return res.status(400).json({
        success: false,
        error: 'Alert ID is required'
      });
    }

    const result = await supabaseService().resolveStockAlert(alertId, req.user.id);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    return res.json({
      success: true,
      message: 'Stock alert resolved successfully',
      data: result.data
    });

  } catch (error) {
    logger.error('Resolve stock alert error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to resolve stock alert'
    });
  }
});

// =====================================================
// INVENTORY REPORTS (Admin Only)
// =====================================================

// Get inventory report
router.get('/reports/inventory', adminOnly, async (_req: Request, res: Response) => {
  try {
    const result = await supabaseService().getInventoryReport();

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
    logger.error('Get inventory report error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch inventory report'
    });
  }
});

// Get menu availability report
router.get('/reports/menu-availability', adminOnly, async (_req: Request, res: Response) => {
  try {
    const result = await supabaseService().getMenuAvailabilityReport();

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
    logger.error('Get menu availability report error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch menu availability report'
    });
  }
});

export default router;
