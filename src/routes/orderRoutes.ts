import { Router, Request, Response } from 'express';
import { supabaseService } from '../services/supabaseService';
import { logger } from '../utils/logger';
import { cashierOrAdmin, kitchenOrAdmin, adminOnly } from '../middleware/authMiddleware';

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

    // Validate user authentication
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
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

    logger.info('Creating order with data:', { 
      orderData: { ...orderData, created_by: req.user.id },
      user: { id: req.user.id, username: req.user.username }
    });

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
    const validPaymentStatuses = ['unpaid', 'paid', 'refunded', 'pending', 'failed', 'cancelled'];
    if (!validPaymentStatuses.includes(payment_status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment status. Must be one of: unpaid, paid, refunded, pending, failed, cancelled'
      });
    }

    // Validate payment method if provided
    if (payment_method) {
      const validPaymentMethods = ['cash', 'gcash', 'card', 'paymongo', 'qrph'];
      if (!validPaymentMethods.includes(payment_method)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid payment method. Must be one of: cash, gcash, card, paymongo, qrph'
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

// Create PayMongo payment for order (Cashier/Admin)
router.post('/:orderId/paymongo-payment', cashierOrAdmin, async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { description, metadata } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'Order ID is required'
      });
    }

    // Get order details
    const orderResult = await supabaseService().getOrderById(orderId);
    if (!orderResult.success) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    const order = orderResult.data;

    // Check if order is already paid
    if (order.payment_status === 'paid') {
      return res.status(400).json({
        success: false,
        error: 'Order is already paid'
      });
    }

    // Import paymongoService dynamically to avoid circular dependencies
    const { paymongoService } = await import('../services/paymongoService');

    // Calculate amount in centavos (convert from peso to centavos)
    const amountInCentavos = Math.round(order.total_amount * 100);

    // Prepare payment data
    const paymentData = {
      amount: amountInCentavos,
      currency: 'PHP',
      description: description || `Payment for Order #${order.order_number}`,
      metadata: {
        ...metadata,
        orderId: order.id,
        orderNumber: order.order_number,
        customerName: order.customer_name,
        orderType: order.order_type,
        createdBy: req.user.id,
        createdByUsername: req.user.username,
        timestamp: new Date().toISOString()
      }
    };

    logger.info('Creating PayMongo payment for order:', { 
      orderId, 
      orderNumber: order.order_number,
      amount: amountInCentavos,
      createdBy: req.user.username 
    });

    // Create payment intent
    const result = await paymongoService().createPaymentIntent(paymentData);

    if (!result.success) {
      logger.error('Failed to create PayMongo payment for order:', result.error);
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to create payment intent'
      });
    }

    // Update order payment method to 'paymongo' and status to 'pending'
    await supabaseService().updateOrderPayment(orderId, 'pending', 'paymongo', req.user.id);

    return res.status(201).json({
      success: true,
      message: 'PayMongo payment intent created for order',
      data: {
        ...result.data,
        order: {
          id: order.id,
          orderNumber: order.order_number,
          totalAmount: order.total_amount,
          customerName: order.customer_name
        }
      }
    });

  } catch (error) {
    logger.error('Create PayMongo order payment error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create PayMongo order payment'
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

// Create discount (Admin only)
router.post('/discounts', adminOnly, async (req: Request, res: Response) => {
  try {
    const {
      code,
      name,
      description,
      discount_type,
      discount_value,
      minimum_order_amount,
      maximum_discount_amount,
      valid_until
    } = req.body;

    if (!code || !name || !discount_type || !discount_value) {
      return res.status(400).json({
        success: false,
        error: 'Code, name, discount_type, and discount_value are required'
      });
    }

    const discountData = {
      code: code.toUpperCase(),
      name,
      description,
      discount_type,
      discount_value: parseFloat(discount_value),
      minimum_order_amount: minimum_order_amount ? parseFloat(minimum_order_amount) : 0,
      maximum_discount_amount: maximum_discount_amount ? parseFloat(maximum_discount_amount) : null,
      valid_until: valid_until || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
      created_by: req.user.id
    };

    const result = await supabaseService().createDiscount(discountData);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Discount created successfully',
      data: result.data
    });

  } catch (error) {
    logger.error('Create discount error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create discount'
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
// ADMIN ENDPOINTS
// =====================================================

// Delete order (Admin only)
router.delete('/:orderId', adminOnly, async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { force } = req.query; // Optional force parameter for hard delete

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'Order ID is required'
      });
    }

    // Check if order exists first
    const orderCheck = await supabaseService().getOrderById(orderId);
    if (!orderCheck.success) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    const order = orderCheck.data;

    // Prevent deletion of orders that are already completed or have payments
    if (order.payment_status === 'paid') {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete order that has been paid. Consider refunding instead.'
      });
    }

    // For completed orders, require force parameter
    if (order.status === 'completed' && force !== 'true') {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete completed order without force parameter. Add ?force=true to confirm deletion.'
      });
    }

    logger.info(`Admin ${req.user.id} deleting order ${orderId} (status: ${order.status}, payment: ${order.payment_status})`);

    // Use hard delete by default for unpaid/cancelled orders
    const shouldForceDelete = force === 'true' || (order.payment_status === 'unpaid' && order.status === 'cancelled');
    const result = await supabaseService().deleteOrder(orderId, shouldForceDelete);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    return res.json({
      success: true,
      message: 'Order deleted successfully',
      data: {
        order_id: orderId,
        order_number: order.order_number,
        deleted_at: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Delete order error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete order'
    });
  }
});

// Bulk delete orders (Admin only)
router.delete('/bulk/delete', adminOnly, async (req: Request, res: Response) => {
  try {
    const { orderIds, force } = req.body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Order IDs array is required'
      });
    }

    if (orderIds.length > 50) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete more than 50 orders at once'
      });
    }

    logger.info(`Admin ${req.user.id} bulk deleting ${orderIds.length} orders`);

    const result = await supabaseService().bulkDeleteOrders(orderIds, force === true);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    return res.json({
      success: true,
      message: `Successfully deleted ${result.data.deletedCount} orders`,
      data: {
        deleted_count: result.data.deletedCount,
        failed_count: result.data.failedCount,
        failed_orders: result.data.failedOrders,
        deleted_at: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Bulk delete orders error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete orders'
    });
  }
});

// Cancel order (Admin only) - Soft delete alternative
router.put('/:orderId/cancel', adminOnly, async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'Order ID is required'
      });
    }

    // Check if order exists
    const orderCheck = await supabaseService().getOrderById(orderId);
    if (!orderCheck.success) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    const order = orderCheck.data;

    // Prevent cancellation of completed orders
    if (order.status === 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Cannot cancel completed order'
      });
    }

    // Prevent cancellation of paid orders
    if (order.payment_status === 'paid') {
      return res.status(400).json({
        success: false,
        error: 'Cannot cancel paid order. Process refund first.'
      });
    }

    logger.info(`Admin ${req.user.id} cancelling order ${orderId}`);

    const result = await supabaseService().updateOrderStatus(
      orderId, 
      'cancelled', 
      req.user.id, 
      reason || 'Order cancelled by admin'
    );

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    return res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: result.data
    });

  } catch (error) {
    logger.error('Cancel order error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to cancel order'
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

    // Check if order exists first
    const orderCheck = await supabaseService().getOrderById(orderId);
    if (!orderCheck.success) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    logger.info(`Updating order ${orderId} status to ${status} by user ${req.user.id}`);

    const result = await supabaseService().updateOrderStatus(orderId, status, req.user.id, notes);

    if (!result.success) {
      logger.error(`Failed to update order status: ${result.error}`);
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
