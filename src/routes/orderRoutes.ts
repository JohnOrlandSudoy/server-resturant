import { Router, Request, Response } from 'express';
import { supabaseService } from '../services/supabaseService';
import { logger } from '../utils/logger';
import { cashierOrAdmin, kitchenOrAdmin } from '../middleware/authMiddleware';

const router = Router();

// =====================================================
// CASHIER ENDPOINTS
// =====================================================

// Get all orders (Cashier/Admin)
router.get('/', cashierOrAdmin, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query['page'] as string) || 1;
    const limit = parseInt(req.query['limit'] as string) || 50;
    const status = req.query['status'] as string;
    const orderType = req.query['order_type'] as string;
    const offset = (page - 1) * limit;

    const result = await supabaseService().getOrders(limit, offset, status, orderType);

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
    logger.error('Get orders error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch orders'
    });
  }
});

// Search orders by customer name or order number (Cashier/Admin)
router.get('/search', cashierOrAdmin, async (req: Request, res: Response) => {
  try {
    const searchTerm = req.query['q'] as string;
    const page = parseInt(req.query['page'] as string) || 1;
    const limit = parseInt(req.query['limit'] as string) || 50;
    const offset = (page - 1) * limit;

    if (!searchTerm) {
      return res.status(400).json({
        success: false,
        error: 'Search term is required'
      });
    }

    const result = await supabaseService().searchOrders(searchTerm, limit, offset);

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
    logger.error('Search orders error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to search orders'
    });
  }
});

// Get order by ID (Cashier/Admin)
router.get('/:id', cashierOrAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Order ID is required'
      });
    }

    const result = await supabaseService().getOrderById(id);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: result.error || 'Order not found'
      });
    }

    return res.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    logger.error('Get order error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch order'
    });
  }
});

// Get order by order number (Cashier/Admin)
router.get('/number/:orderNumber', cashierOrAdmin, async (req: Request, res: Response) => {
  try {
    const { orderNumber } = req.params;

    if (!orderNumber) {
      return res.status(400).json({
        success: false,
        error: 'Order number is required'
      });
    }

    const result = await supabaseService().getOrderByNumber(orderNumber);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: result.error || 'Order not found'
      });
    }

    return res.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    logger.error('Get order by number error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch order'
    });
  }
});

// Create new order (Cashier/Admin)
router.post('/', cashierOrAdmin, async (req: Request, res: Response) => {
  try {
    const {
      customer_name,
      customer_phone,
      order_type,
      special_instructions,
      table_number,
      estimated_prep_time
    } = req.body;

    // Validate required fields
    if (!order_type) {
      return res.status(400).json({
        success: false,
        error: 'Order type is required'
      });
    }

    // Validate order type
    const validOrderTypes = ['dine_in', 'takeout'];
    if (!validOrderTypes.includes(order_type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid order type. Must be one of: dine_in, takeout'
      });
    }

    // Validate table number for dine-in orders
    if (order_type === 'dine_in' && !table_number) {
      return res.status(400).json({
        success: false,
        error: 'Table number is required for dine-in orders'
      });
    }

    const orderData = {
      customer_name,
      customer_phone,
      order_type,
      special_instructions,
      table_number,
      estimated_prep_time,
      created_by: req.user.id
    };

    const result = await supabaseService().createOrder(orderData);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: result.data
    });

  } catch (error) {
    logger.error('Create order error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create order'
    });
  }
});

// Add item to order (Cashier/Admin)
router.post('/:orderId/items', cashierOrAdmin, async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const {
      menu_item_id,
      quantity,
      customizations,
      special_instructions
    } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'Order ID is required'
      });
    }

    if (!menu_item_id || !quantity) {
      return res.status(400).json({
        success: false,
        error: 'Menu item ID and quantity are required'
      });
    }

    if (quantity <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Quantity must be greater than 0'
      });
    }

    // Get menu item details for pricing
    const menuItemResult = await supabaseService().getMenuItemById(menu_item_id);
    if (!menuItemResult.success || !menuItemResult.data) {
      return res.status(404).json({
        success: false,
        error: 'Menu item not found'
      });
    }

    const menuItem = menuItemResult.data;
    const unitPrice = menuItem.price;
    const totalPrice = unitPrice * quantity;

    const orderItemData = {
      order_id: orderId,
      menu_item_id,
      quantity,
      unit_price: unitPrice,
      total_price: totalPrice,
      customizations: customizations ? JSON.stringify(customizations) : null,
      special_instructions
    };

    const result = await supabaseService().addOrderItem(orderItemData);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Item added to order successfully',
      data: result.data
    });

  } catch (error) {
    logger.error('Add order item error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to add item to order'
    });
  }
});

// Update order item (Cashier/Admin)
router.put('/items/:itemId', cashierOrAdmin, async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    const { quantity, customizations, special_instructions } = req.body;

    if (!itemId) {
      return res.status(400).json({
        success: false,
        error: 'Item ID is required'
      });
    }

    if (quantity !== undefined && quantity <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Quantity must be greater than 0'
      });
    }

    const updateData: any = {};
    if (quantity !== undefined) updateData.quantity = quantity;
    if (customizations !== undefined) updateData.customizations = JSON.stringify(customizations);
    if (special_instructions !== undefined) updateData.special_instructions = special_instructions;

    const result = await supabaseService().updateOrderItem(itemId, updateData);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    return res.json({
      success: true,
      message: 'Order item updated successfully',
      data: result.data
    });

  } catch (error) {
    logger.error('Update order item error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update order item'
    });
  }
});

// Remove item from order (Cashier/Admin)
router.delete('/items/:itemId', cashierOrAdmin, async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;

    if (!itemId) {
      return res.status(400).json({
        success: false,
        error: 'Item ID is required'
      });
    }

    const result = await supabaseService().deleteOrderItem(itemId);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    return res.json({
      success: true,
      message: 'Item removed from order successfully'
    });

  } catch (error) {
    logger.error('Delete order item error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to remove item from order'
    });
  }
});

// Get order items (Cashier/Admin)
router.get('/:orderId/items', cashierOrAdmin, async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'Order ID is required'
      });
    }

    const result = await supabaseService().getOrderItems(orderId);

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
    logger.error('Get order items error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch order items'
    });
  }
});

// Update order payment status (Cashier/Admin)
router.put('/:orderId/payment', cashierOrAdmin, async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { payment_status, payment_method } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'Order ID is required'
      });
    }

    if (!payment_status) {
      return res.status(400).json({
        success: false,
        error: 'Payment status is required'
      });
    }

    // Validate payment status
    const validPaymentStatuses = ['unpaid', 'paid', 'refunded'];
    if (!validPaymentStatuses.includes(payment_status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment status. Must be one of: unpaid, paid, refunded'
      });
    }

    // Validate payment method if provided
    if (payment_method) {
      const validPaymentMethods = ['cash', 'gcash', 'card'];
      if (!validPaymentMethods.includes(payment_method)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid payment method. Must be one of: cash, gcash, card'
        });
      }
    }

    const result = await supabaseService().updateOrderPayment(orderId, payment_status, payment_method, req.user.id);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    return res.json({
      success: true,
      message: 'Payment status updated successfully',
      data: result.data
    });

  } catch (error) {
    logger.error('Update order payment error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update payment status'
    });
  }
});

// Get available discounts (Cashier/Admin)
router.get('/discounts/available', cashierOrAdmin, async (_req: Request, res: Response) => {
  try {
    const result = await supabaseService().getDiscounts();

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
    logger.error('Get discounts error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch discounts'
    });
  }
});

// Apply discount to order (Cashier/Admin)
router.post('/:orderId/discounts', cashierOrAdmin, async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { discount_code } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'Order ID is required'
      });
    }

    if (!discount_code) {
      return res.status(400).json({
        success: false,
        error: 'Discount code is required'
      });
    }

    // Get discount details
    const discountResult = await supabaseService().getDiscountByCode(discount_code);
    if (!discountResult.success) {
      return res.status(404).json({
        success: false,
        error: discountResult.error
      });
    }

    const discount = discountResult.data;

    // Get order details to calculate discount amount
    const orderResult = await supabaseService().getOrderById(orderId);
    if (!orderResult.success) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    const order = orderResult.data;

    // Check minimum order amount
    if (order.subtotal < discount.minimum_order_amount) {
      return res.status(400).json({
        success: false,
        error: `Minimum order amount of ${discount.minimum_order_amount} required for this discount`
      });
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (discount.discount_type === 'percentage') {
      discountAmount = (order.subtotal * discount.discount_value) / 100;
      if (discount.maximum_discount_amount && discountAmount > discount.maximum_discount_amount) {
        discountAmount = discount.maximum_discount_amount;
      }
    } else if (discount.discount_type === 'fixed_amount') {
      discountAmount = discount.discount_value;
    }

    // Apply discount
    const result = await supabaseService().applyDiscountToOrder(orderId, discount.id, discountAmount);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    return res.json({
      success: true,
      message: 'Discount applied successfully',
      data: {
        discount: discount,
        discount_amount: discountAmount
      }
    });

  } catch (error) {
    logger.error('Apply discount error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to apply discount'
    });
  }
});

// =====================================================
// KITCHEN ENDPOINTS
// =====================================================

// Get kitchen orders (Kitchen/Admin)
router.get('/kitchen/orders', kitchenOrAdmin, async (_req: Request, res: Response) => {
  try {
    const result = await supabaseService().getKitchenOrders();

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
    logger.error('Get kitchen orders error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch kitchen orders'
    });
  }
});

// Update order status (Kitchen/Admin)
router.put('/:orderId/status', kitchenOrAdmin, async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { status, notes } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'Order ID is required'
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required'
      });
    }

    // Validate status
    const validStatuses = ['pending', 'preparing', 'ready', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be one of: pending, preparing, ready, completed, cancelled'
      });
    }

    const result = await supabaseService().updateOrderStatus(orderId, status, req.user.id, notes);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    return res.json({
      success: true,
      message: 'Order status updated successfully',
      data: result.data
    });

  } catch (error) {
    logger.error('Update order status error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update order status'
    });
  }
});

// Get order status history (Kitchen/Admin)
router.get('/:orderId/history', kitchenOrAdmin, async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'Order ID is required'
      });
    }

    const result = await supabaseService().getOrderStatusHistory(orderId);

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
    logger.error('Get order status history error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch order status history'
    });
  }
});

export default router;
