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

    // Store payment record in database for webhook processing
    if (result.data) {
      const paymentRecord = await supabaseService().createPaymentRecord({
        payment_intent_id: result.data.paymentIntentId,
        order_id: orderId,
        order_number: order.order_number,
        amount: result.data.amount,
        currency: result.data.currency,
        description: paymentData.description || undefined,
        status: result.data.status,
        payment_status: 'pending',
        payment_method: 'paymongo',
        payment_source_type: 'qrph',
        qr_code_url: result.data.qrCodeUrl,
        qr_code_data: result.data.qrCodeData,
        qr_code_expires_at: result.data.expiresAt,
        paymongo_response: result,
        metadata: paymentData.metadata,
        created_by: req.user.id
      });

      if (!paymentRecord.success) {
        logger.error('Failed to create payment record for order:', paymentRecord.error);
        // Don't fail the request, just log the error
      }
    }

    // Update order payment method to 'paymongo' and status to 'pending'
    await supabaseService().updateOrderPayment(orderId, 'pending', 'paymongo', req.user.id);

    logger.info('PayMongo payment intent created for order:', {
      orderId,
      orderNumber: order.order_number,
      paymentIntentId: result.data?.paymentIntentId,
      amount: amountInCentavos,
      createdBy: req.user.username
    });

    return res.status(201).json({
      success: true,
      message: 'PayMongo payment intent created for order',
      data: {
        ...result.data,
        order: {
          id: order.id,
          orderNumber: order.order_number,
          totalAmount: order.total_amount,
          customerName: order.customer_name,
          paymentStatus: 'pending',
          paymentMethod: 'paymongo'
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

// Check PayMongo payment status for order (Cashier/Admin)
router.get('/:orderId/payment-status', cashierOrAdmin, async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;

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

    // Get payment history for this order
    const paymentHistoryResult = await supabaseService().getPaymentHistory(orderId);
    
    if (!paymentHistoryResult.success) {
      return res.status(500).json({
        success: false,
        error: paymentHistoryResult.error || 'Failed to retrieve payment history'
      });
    }

    const payments = paymentHistoryResult.data || [];
    const latestPayment = payments.length > 0 ? payments[0] : null;

    // If there's a PayMongo payment, check its status
    let paymongoStatus = null;
    if (latestPayment && latestPayment.payment_intent_id) {
      try {
        const { paymongoService } = await import('../services/paymongoService');
        const statusResult = await paymongoService().getPaymentStatus(latestPayment.payment_intent_id);
        
        if (statusResult.success) {
          paymongoStatus = statusResult.data;
        }
      } catch (error) {
        logger.error('Error checking PayMongo status:', error);
      }
    }

    return res.json({
      success: true,
      data: {
        order: {
          id: order.id,
          orderNumber: order.order_number,
          paymentStatus: order.payment_status,
          paymentMethod: order.payment_method,
          totalAmount: order.total_amount
        },
        latestPayment: latestPayment ? {
          paymentIntentId: latestPayment.payment_intent_id,
          status: latestPayment.status,
          paymentStatus: latestPayment.payment_status,
          amount: latestPayment.amount,
          createdAt: latestPayment.created_at,
          paidAt: latestPayment.paid_at,
          failedAt: latestPayment.failed_at
        } : null,
        paymongoStatus: paymongoStatus,
        paymentHistory: payments.map((payment: any) => ({
          id: payment.id,
          paymentIntentId: payment.payment_intent_id,
          status: payment.status,
          paymentStatus: payment.payment_status,
          amount: payment.amount,
          createdAt: payment.created_at,
          paidAt: payment.paid_at,
          failedAt: payment.failed_at
        }))
      }
    });

  } catch (error) {
    logger.error('Get order payment status error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch payment status'
    });
  }
});

// Get order receipt (Cashier/Admin)
router.get('/:orderId/receipt', cashierOrAdmin, async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;

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

    // Get order items
    const itemsResult = await supabaseService().getOrderItems(orderId);
    if (!itemsResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve order items'
      });
    }

    // Get payment history
    const paymentHistoryResult = await supabaseService().getPaymentHistory(orderId);
    const payments = paymentHistoryResult.success ? paymentHistoryResult.data || [] : [];
    const latestPayment = payments.length > 0 ? payments[0] : null;

    // Get order status history
    const statusHistoryResult = await supabaseService().getOrderStatusHistory(orderId);
    const statusHistory = statusHistoryResult.success ? statusHistoryResult.data || [] : [];

    // Format receipt data
    const receipt = {
      order: {
        id: order.id,
        orderNumber: order.order_number,
        customerName: order.customer_name,
        customerPhone: order.customer_phone,
        orderType: order.order_type,
        tableNumber: order.table_number,
        status: order.status,
        paymentStatus: order.payment_status,
        paymentMethod: order.payment_method,
        subtotal: order.subtotal,
        discountAmount: order.discount_amount,
        taxAmount: order.tax_amount,
        totalAmount: order.total_amount,
        specialInstructions: order.special_instructions,
        createdAt: order.created_at,
        completedAt: order.completed_at
      },
      items: itemsResult.data?.map((item: any) => ({
        id: item.id,
        menuItemName: item.menu_item_name,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        totalPrice: item.total_price,
        customizations: item.customizations,
        specialInstructions: item.special_instructions
      })) || [],
      payment: latestPayment ? {
        id: latestPayment.id,
        paymentIntentId: latestPayment.payment_intent_id,
        paymentId: latestPayment.payment_id,
        amount: latestPayment.amount,
        currency: latestPayment.currency,
        status: latestPayment.status,
        paymentStatus: latestPayment.payment_status,
        paymentMethod: latestPayment.payment_method,
        paymentSourceType: latestPayment.payment_source_type,
        feeAmount: latestPayment.fee_amount,
        netAmount: latestPayment.net_amount,
        externalReferenceNumber: latestPayment.external_reference_number,
        paidAt: latestPayment.paid_at,
        failedAt: latestPayment.failed_at,
        cancelledAt: latestPayment.cancelled_at,
        createdAt: latestPayment.created_at
      } : null,
      statusHistory: statusHistory.map((status: any) => ({
        id: status.id,
        status: status.status,
        notes: status.notes,
        updatedBy: status.updated_by_user,
        createdAt: status.created_at
      })),
      summary: {
        totalItems: itemsResult.data?.length || 0,
        totalQuantity: itemsResult.data?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0,
        subtotal: order.subtotal,
        discountAmount: order.discount_amount,
        taxAmount: order.tax_amount,
        totalAmount: order.total_amount,
        paymentStatus: order.payment_status,
        isPaid: order.payment_status === 'paid',
        paymentMethod: order.payment_method
      }
    };

    logger.info('Order receipt generated:', {
      orderId,
      orderNumber: order.order_number,
      customerName: order.customer_name,
      totalAmount: order.total_amount,
      paymentStatus: order.payment_status,
      requestedBy: req.user.username
    });

    return res.json({
      success: true,
      message: 'Order receipt retrieved successfully',
      data: receipt
    });

  } catch (error) {
    logger.error('Get order receipt error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve order receipt'
    });
  }
});

// Manually sync PayMongo payment status (Cashier/Admin)
router.post('/:orderId/sync-payment', cashierOrAdmin, async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;

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

    // Get latest payment for this order
    const paymentHistoryResult = await supabaseService().getPaymentHistory(orderId);
    
    if (!paymentHistoryResult.success || !paymentHistoryResult.data || paymentHistoryResult.data.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No payment records found for this order'
      });
    }

    const latestPayment = paymentHistoryResult.data[0];

    if (!latestPayment.payment_intent_id) {
      return res.status(400).json({
        success: false,
        error: 'No PayMongo payment intent found for this order'
      });
    }

    // Check PayMongo status
    const { paymongoService } = await import('../services/paymongoService');
    const statusResult = await paymongoService().getPaymentStatus(latestPayment.payment_intent_id);

    if (!statusResult.success) {
      return res.status(500).json({
        success: false,
        error: statusResult.error || 'Failed to check PayMongo payment status'
      });
    }

    const paymongoData = statusResult.data;
    
    if (!paymongoData) {
      return res.status(500).json({
        success: false,
        error: 'No payment data received from PayMongo'
      });
    }

    let newPaymentStatus = order.payment_status;
    let shouldUpdateOrder = false;

    // Determine if we need to update the order status
    if (paymongoData.status === 'succeeded' && order.payment_status !== 'paid') {
      newPaymentStatus = 'paid';
      shouldUpdateOrder = true;
    } else if (paymongoData.status === 'payment_failed' && order.payment_status !== 'failed') {
      newPaymentStatus = 'failed';
      shouldUpdateOrder = true;
    } else if (paymongoData.status === 'cancelled' && order.payment_status !== 'cancelled') {
      newPaymentStatus = 'cancelled';
      shouldUpdateOrder = true;
    }

    // Update order payment status if needed
    if (shouldUpdateOrder) {
      const updateResult = await supabaseService().updateOrderPayment(
        orderId, 
        newPaymentStatus, 
        'paymongo', 
        req.user.id
      );

      if (!updateResult.success) {
        logger.error('Failed to update order payment status:', updateResult.error);
      }
    }

    // Update payment record with latest PayMongo data
    const updateData: any = {
      status: paymongoData.status,
      paymongo_response: statusResult
    };

    if (paymongoData.status === 'succeeded') {
      updateData.payment_status = 'paid';
      updateData.paid_at = new Date().toISOString();
    } else if (paymongoData.status === 'payment_failed') {
      updateData.payment_status = 'failed';
      updateData.failed_at = new Date().toISOString();
    } else if (paymongoData.status === 'cancelled') {
      updateData.payment_status = 'cancelled';
      updateData.cancelled_at = new Date().toISOString();
    }

    await supabaseService().updatePaymentRecord(latestPayment.payment_intent_id, updateData);

    logger.info('Payment status synced for order:', {
      orderId,
      orderNumber: order.order_number,
      paymentIntentId: latestPayment.payment_intent_id,
      oldStatus: order.payment_status,
      newStatus: newPaymentStatus,
      paymongoStatus: paymongoData.status,
      syncedBy: req.user.username
    });

    return res.json({
      success: true,
      message: 'Payment status synced successfully',
      data: {
        order: {
          id: order.id,
          orderNumber: order.order_number,
          oldPaymentStatus: order.payment_status,
          newPaymentStatus: newPaymentStatus,
          paymentMethod: 'paymongo'
        },
        paymongoStatus: paymongoData,
        wasUpdated: shouldUpdateOrder
      }
    });

  } catch (error) {
    logger.error('Sync payment status error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to sync payment status'
    });
  }
});

export default router;
