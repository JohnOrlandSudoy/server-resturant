import { Router, Request, Response } from 'express';
import { paymongoService, PaymentIntentData, WebhookEvent } from '../services/paymongoService';
import { supabaseService } from '../services/supabaseService';
import { logger } from '../utils/logger';
import { cashierOrAdmin, adminOnly } from '../middleware/authMiddleware';

const router = Router();

// =====================================================
// PAYMONGO PAYMENT ENDPOINTS
// =====================================================

/**
 * Create a new payment intent with QR Ph code
 * POST /api/payments/create
 * 
 * Body: {
 *   amount: number,        // Amount in centavos (e.g., 10000 = PHP 100.00)
 *   orderId?: string,      // Optional order ID to link payment
 *   description?: string,  // Optional payment description
 *   metadata?: object      // Optional metadata
 * }
 * 
 * Response: {
 *   success: boolean,
 *   data: {
 *     paymentIntentId: string,
 *     qrCodeUrl?: string,
 *     qrCodeData?: string,
 *     status: string,
 *     amount: number,
 *     currency: string,
 *     expiresAt: string
 *   }
 * }
 */
router.post('/create', cashierOrAdmin, async (req: Request, res: Response) => {
  try {
    const { amount, orderId, description, metadata } = req.body;

    // Validate required fields
    if (!amount || typeof amount !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'Amount is required and must be a number (in centavos)'
      });
    }

    // Validate amount range (minimum PHP 1.00 = 100 centavos, maximum PHP 100,000.00 = 10,000,000 centavos)
    if (amount < 100 || amount > 10000000) {
      return res.status(400).json({
        success: false,
        error: 'Amount must be between PHP 1.00 (100 centavos) and PHP 100,000.00 (10,000,000 centavos)'
      });
    }

    // If orderId is provided, validate it exists
    if (orderId) {
      const orderResult = await supabaseService().getOrderById(orderId);
      if (!orderResult.success) {
        return res.status(404).json({
          success: false,
          error: 'Order not found'
        });
      }
    }

    // Prepare payment data
    const paymentData: PaymentIntentData = {
      amount,
      currency: 'PHP',
      description: description || `Restaurant Order Payment${orderId ? ` - Order #${orderId}` : ''}`,
      metadata: {
        ...metadata,
        orderId: orderId || null,
        createdBy: req.user.id,
        createdByUsername: req.user.username,
        timestamp: new Date().toISOString()
      }
    };

    logger.info('Creating payment intent:', { 
      amount, 
      orderId, 
      createdBy: req.user.username 
    });

    // Create payment intent with QR Ph
    const result = await paymongoService().createPaymentIntent(paymentData);

    if (!result.success) {
      logger.error('Failed to create payment intent:', result.error);
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to create payment intent'
      });
    }

    // Store payment record in database
    if (result.data) {
      const paymentRecord = await supabaseService().createPaymentRecord({
        payment_intent_id: result.data.paymentIntentId,
        order_id: orderId || undefined,
        order_number: orderId ? (await supabaseService().getOrderById(orderId)).data?.order_number : undefined,
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
        logger.error('Failed to create payment record:', paymentRecord.error);
        // Don't fail the request, just log the error
      }
    }

    // Log successful payment creation
    logger.info('Payment intent created successfully:', {
      paymentIntentId: result.data?.paymentIntentId,
      amount: result.data?.amount,
      orderId
    });

    return res.status(201).json({
      success: true,
      message: 'Payment intent created successfully',
      data: result.data
    });

  } catch (error) {
    logger.error('Create payment intent error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create payment intent'
    });
  }
});

/**
 * Get payment status
 * GET /api/payments/status/:paymentIntentId
 * 
 * Response: {
 *   success: boolean,
 *   data: {
 *     paymentIntentId: string,
 *     status: string,
 *     amount: number,
 *     currency: string
 *   }
 * }
 */
router.get('/status/:paymentIntentId', cashierOrAdmin, async (req: Request, res: Response) => {
  try {
    const { paymentIntentId } = req.params;

    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        error: 'Payment intent ID is required'
      });
    }

    logger.info('Retrieving payment status:', { 
      paymentIntentId, 
      requestedBy: req.user.username 
    });

    const result = await paymongoService().getPaymentStatus(paymentIntentId);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: result.error || 'Payment intent not found'
      });
    }

    return res.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    logger.error('Get payment status error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve payment status'
    });
  }
});

/**
 * Create payment for specific order
 * POST /api/payments/order/:orderId
 * 
 * This endpoint creates a payment intent for a specific order
 * and automatically calculates the amount from order items
 */
router.post('/order/:orderId', cashierOrAdmin, async (req: Request, res: Response) => {
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

    // Calculate amount in centavos (convert from peso to centavos)
    const amountInCentavos = Math.round(order.total_amount * 100);

    // Prepare payment data
    const paymentData: PaymentIntentData = {
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

    logger.info('Creating payment for order:', { 
      orderId, 
      orderNumber: order.order_number,
      amount: amountInCentavos,
      createdBy: req.user.username 
    });

    // Create payment intent
    const result = await paymongoService().createPaymentIntent(paymentData);

    if (!result.success) {
      logger.error('Failed to create payment for order:', result.error);
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to create payment intent'
      });
    }

    // Store payment record in database
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

    return res.status(201).json({
      success: true,
      message: 'Payment intent created for order',
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
    logger.error('Create order payment error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create order payment'
    });
  }
});

/**
 * PayMongo Webhook Endpoint
 * POST /api/payments/webhook
 * 
 * This endpoint receives webhook events from PayMongo
 * for payment status updates (success, failure, cancellation)
 * 
 * Security: In production, validate webhook signature
 */
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const event: WebhookEvent = req.body;

    // Log webhook event
    logger.info('Received PayMongo webhook:', {
      eventId: event.id,
      eventType: event.type,
      dataId: event.data.id
    });

    // Validate webhook signature in production
    const signature = req.headers['paymongo-signature'] as string;
    const payload = JSON.stringify(req.body);

    if (!paymongoService().validateWebhookSignature(payload, signature)) {
      logger.error('Invalid webhook signature');
      return res.status(401).json({
        success: false,
        error: 'Invalid webhook signature'
      });
    }

    // Process webhook event
    const result = await paymongoService().processWebhookEvent(event);

    if (!result.success) {
      logger.error('Failed to process webhook event:', result.error);
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to process webhook event'
      });
    }

    // Update order payment status based on webhook event
    await updateOrderPaymentFromWebhook(event);

    // Update payment record in database
    await updatePaymentRecordFromWebhook(event);

    logger.info('Webhook processed successfully:', { eventId: event.id });

    return res.json({
      success: true,
      message: 'Webhook processed successfully'
    });

  } catch (error) {
    logger.error('Webhook processing error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process webhook'
    });
  }
});

/**
 * Get payment history for an order
 * GET /api/payments/order/:orderId/history
 */
router.get('/order/:orderId/history', cashierOrAdmin, async (req: Request, res: Response) => {
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

    // Get payment history
    const paymentHistoryResult = await supabaseService().getPaymentHistory(orderId);

    if (!paymentHistoryResult.success) {
      return res.status(500).json({
        success: false,
        error: paymentHistoryResult.error || 'Failed to retrieve payment history'
      });
    }

    const payments = paymentHistoryResult.data || [];

    // Format payment data for response
    const formattedPayments = payments.map((payment: any) => ({
      id: payment.id,
      paymentIntentId: payment.payment_intent_id,
      paymentId: payment.payment_id,
      amount: payment.amount,
      currency: payment.currency,
      description: payment.description,
      status: payment.status,
      paymentStatus: payment.payment_status,
      paymentMethod: payment.payment_method,
      paymentSourceType: payment.payment_source_type,
      qrCodeUrl: payment.qr_code_url,
      qrCodeExpiresAt: payment.qr_code_expires_at,
      feeAmount: payment.fee_amount,
      netAmount: payment.net_amount,
      externalReferenceNumber: payment.external_reference_number,
      errorMessage: payment.error_message,
      errorCode: payment.error_code,
      createdAt: payment.created_at,
      updatedAt: payment.updated_at,
      paidAt: payment.paid_at,
      failedAt: payment.failed_at,
      cancelledAt: payment.cancelled_at,
      createdBy: payment.created_by_user,
      updatedBy: payment.updated_by_user,
      metadata: payment.metadata,
      webhookEvents: payment.webhook_events
    }));

    logger.info('Payment history retrieved:', {
      orderId,
      orderNumber: order.order_number,
      paymentCount: formattedPayments.length,
      requestedBy: req.user.username
    });

    return res.json({
      success: true,
      message: 'Payment history retrieved successfully',
      data: {
        order: {
          id: order.id,
          orderNumber: order.order_number,
          customerName: order.customer_name,
          totalAmount: order.total_amount,
          paymentStatus: order.payment_status,
          paymentMethod: order.payment_method
        },
        payments: formattedPayments,
        summary: {
          totalPayments: formattedPayments.length,
          successfulPayments: formattedPayments.filter((p: any) => p.paymentStatus === 'paid').length,
          failedPayments: formattedPayments.filter((p: any) => p.paymentStatus === 'failed').length,
          pendingPayments: formattedPayments.filter((p: any) => p.paymentStatus === 'pending').length,
          totalAmount: formattedPayments.reduce((sum: number, p: any) => sum + p.amount, 0),
          totalFees: formattedPayments.reduce((sum: number, p: any) => sum + (p.feeAmount || 0), 0)
        }
      }
    });

  } catch (error) {
    logger.error('Get payment history error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve payment history'
    });
  }
});

/**
 * Cancel a payment intent
 * POST /api/payments/:paymentIntentId/cancel
 */
router.post('/:paymentIntentId/cancel', cashierOrAdmin, async (req: Request, res: Response) => {
  try {
    const { paymentIntentId } = req.params;

    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        error: 'Payment intent ID is required'
      });
    }

    logger.info('Cancelling payment intent:', { 
      paymentIntentId, 
      cancelledBy: req.user.username 
    });

    // Cancel payment intent via PayMongo API
    const result = await paymongoService().cancelPaymentIntent(paymentIntentId);

    if (!result.success) {
      logger.error('Failed to cancel payment intent:', result.error);
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to cancel payment intent'
      });
    }

    logger.info('Payment intent cancelled successfully:', {
      paymentIntentId,
      status: result.data?.status,
      cancelledBy: req.user.username
    });

    return res.json({
      success: true,
      message: 'Payment intent cancelled successfully',
      data: {
        ...result.data,
        cancelledBy: req.user.username,
        cancelledAt: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Cancel payment error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to cancel payment'
    });
  }
});

/**
 * Helper function to update order payment status from webhook
 * @param event - PayMongo webhook event
 */
async function updateOrderPaymentFromWebhook(event: WebhookEvent): Promise<void> {
  try {
    const { type, data } = event;
    const { attributes } = data;
    
    // Extract order ID from metadata
    const orderId = attributes.metadata?.['orderId'];
    
    if (!orderId) {
      logger.warn('No order ID found in webhook metadata');
      return;
    }

    let paymentStatus: string;
    
    switch (type) {
      case 'payment.paid':
      case 'payment_intent.succeeded':
        paymentStatus = 'paid';
        break;
      case 'payment.failed':
      case 'payment_intent.payment_failed':
        paymentStatus = 'failed';
        break;
      case 'payment_intent.cancelled':
        paymentStatus = 'cancelled';
        break;
      case 'qrph.expired':
        paymentStatus = 'pending'; // Revert to pending for expired QR codes
        break;
      default:
        logger.info('No payment status update needed for event type:', type);
        return;
    }

    // Update order payment status
    const result = await supabaseService().updateOrderPayment(
      orderId, 
      paymentStatus, 
      'paymongo', // payment method
      undefined // webhook updates don't have a user ID
    );

    if (result.success) {
      logger.info('Order payment status updated from webhook:', {
        orderId,
        paymentStatus,
        paymentIntentId: data.id
      });
    } else {
      logger.error('Failed to update order payment status:', result.error);
    }

  } catch (error) {
    logger.error('Error updating order payment from webhook:', error);
  }
}

/**
 * Helper function to update payment record from webhook
 * @param event - PayMongo webhook event
 */
async function updatePaymentRecordFromWebhook(event: WebhookEvent): Promise<void> {
  try {
    const { type, data } = event;
    const { attributes } = data;
    
    // Get payment intent ID from the event
    const paymentIntentId = data.id;
    
    if (!paymentIntentId) {
      logger.warn('No payment intent ID found in webhook event');
      return;
    }

    // Get existing payment record
    const existingPayment = await supabaseService().getPaymentByIntentId(paymentIntentId);
    
    if (!existingPayment.success) {
      logger.warn('Payment record not found for intent:', paymentIntentId);
      return;
    }

    const currentWebhookEvents = existingPayment.data.webhook_events || [];
    const updatedWebhookEvents = [...currentWebhookEvents, {
      eventId: event.id,
      eventType: type,
      receivedAt: new Date().toISOString(),
      eventData: event
    }];

    let updateData: any = {
      webhook_events: updatedWebhookEvents,
      paymongo_response: event
    };

    // Update payment record based on event type
    switch (type) {
      case 'payment.paid':
      case 'payment_intent.succeeded':
        updateData = {
          ...updateData,
          status: 'succeeded',
          payment_status: 'paid',
          payment_id: data.id,
          paid_at: new Date().toISOString(),
          fee_amount: attributes.fee || 0,
          net_amount: attributes.net_amount || attributes.amount,
          external_reference_number: attributes.external_reference_number
        };
        break;
      
      case 'payment.failed':
      case 'payment_intent.payment_failed':
        updateData = {
          ...updateData,
          status: 'payment_failed',
          payment_status: 'failed',
          failed_at: new Date().toISOString(),
          error_message: attributes.failed_message,
          error_code: attributes.failed_code
        };
        break;
      
      case 'payment_intent.cancelled':
        updateData = {
          ...updateData,
          status: 'cancelled',
          payment_status: 'cancelled',
          cancelled_at: new Date().toISOString()
        };
        break;
      
      case 'qrph.expired':
        updateData = {
          ...updateData,
          status: 'awaiting_payment_method',
          payment_status: 'pending'
        };
        break;
      
      default:
        logger.info('No payment record update needed for event type:', type);
        return;
    }

    // Update payment record
    const result = await supabaseService().updatePaymentRecord(paymentIntentId, updateData);

    if (result.success) {
      logger.info('Payment record updated from webhook:', {
        paymentIntentId,
        eventType: type,
        eventId: event.id
      });
    } else {
      logger.error('Failed to update payment record from webhook:', result.error);
    }

  } catch (error) {
    logger.error('Error updating payment record from webhook:', error);
  }
}

// =====================================================
// ADMIN PAYMENT METHODS CONFIGURATION ENDPOINTS
// =====================================================

/**
 * Get all payment methods configuration (Admin only)
 * GET /api/payments/admin/methods
 */
router.get('/admin/methods', adminOnly, async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseService().getClient()
      .from('payment_methods_config')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      logger.error('Failed to fetch payment methods config:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch payment methods configuration'
      });
    }

    logger.info('Payment methods configuration retrieved:', {
      count: data?.length || 0,
      requestedBy: req.user.username
    });

    return res.json({
      success: true,
      data: data || []
    });

  } catch (error) {
    logger.error('Get payment methods config error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve payment methods configuration'
    });
  }
});

/**
 * Get available payment methods for frontend (Public)
 * GET /api/payments/methods/available
 */
router.get('/methods/available', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseService().getClient()
      .from('payment_methods_config')
      .select('method_key, method_name, method_description, is_online, display_order, icon_name, color_code')
      .eq('is_enabled', true)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      logger.error('Failed to fetch available payment methods:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch available payment methods'
      });
    }

    return res.json({
      success: true,
      data: data || []
    });

  } catch (error) {
    logger.error('Get available payment methods error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve available payment methods'
    });
  }
});

/**
 * Toggle payment method availability (Admin only)
 * PUT /api/payments/admin/methods/:methodKey/toggle
 */
router.put('/admin/methods/:methodKey/toggle', adminOnly, async (req: Request, res: Response) => {
  try {
    const { methodKey } = req.params;
    const { is_enabled } = req.body;

    // Validate input
    if (!methodKey) {
      return res.status(400).json({
        success: false,
        error: 'Payment method key is required'
      });
    }

    if (typeof is_enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'is_enabled must be a boolean value'
      });
    }

    // Validate method key
    const validMethods = ['cash', 'gcash', 'card', 'paymongo', 'qrph', 'grab_pay', 'shopeepay'];
    if (!validMethods.includes(methodKey)) {
      return res.status(400).json({
        success: false,
        error: `Invalid payment method. Must be one of: ${validMethods.join(', ')}`
      });
    }

    logger.info('Toggle payment method request:', {
      methodKey,
      is_enabled,
      requestedBy: req.user.username
    });

    // Get current state
    const { data: currentMethod, error: fetchError } = await supabaseService().getClient()
      .from('payment_methods_config')
      .select('*')
      .eq('method_key', methodKey)
      .single();

    if (fetchError || !currentMethod) {
      logger.error('Payment method not found:', { methodKey, fetchError });
      return res.status(404).json({
        success: false,
        error: 'Payment method not found'
      });
    }

    // Check if the value is already what we want
    if (currentMethod.is_enabled === is_enabled) {
      logger.info('Payment method already in desired state:', {
        methodKey,
        currentState: currentMethod.is_enabled,
        requestedState: is_enabled
      });
      
      return res.json({
        success: true,
        message: `Payment method ${methodKey} is already ${is_enabled ? 'enabled' : 'disabled'}`,
        data: {
          method_key: currentMethod.method_key,
          method_name: currentMethod.method_name,
          is_enabled: currentMethod.is_enabled,
          updated_at: currentMethod.updated_at
        }
      });
    }

    // Perform the update
    const { data: updatedMethod, error: updateError } = await supabaseService().getClient()
      .from('payment_methods_config')
      .update({
        is_enabled: is_enabled,
        updated_at: new Date().toISOString()
      })
      .eq('method_key', methodKey)
      .select('*');

    if (updateError) {
      logger.error('Failed to update payment method:', {
        methodKey,
        is_enabled,
        error: updateError
      });
      return res.status(500).json({
        success: false,
        error: 'Failed to update payment method configuration',
        details: updateError.message
      });
    }

    if (!updatedMethod || updatedMethod.length === 0) {
      // This can happen if the value is already what we want to set it to
      // Let's fetch the current state to return it
      logger.info('No rows updated, fetching current state:', { methodKey, is_enabled });
      
      const { data: currentData, error: fetchError } = await supabaseService().getClient()
        .from('payment_methods_config')
        .select('*')
        .eq('method_key', methodKey)
        .single();

      if (fetchError || !currentData) {
        logger.error('Failed to fetch current state after update:', { methodKey, fetchError });
        return res.status(500).json({
          success: false,
          error: 'Update completed but failed to retrieve current state'
        });
      }

      // Check if the current state matches what was requested
      if (currentData.is_enabled === is_enabled) {
        // Already in the desired state
        return res.json({
          success: true,
          message: `Payment method ${methodKey} is already ${is_enabled ? 'enabled' : 'disabled'}`,
          data: {
            method_key: currentData.method_key,
            method_name: currentData.method_name,
            is_enabled: currentData.is_enabled,
            updated_at: currentData.updated_at
          }
        });
      } else {
        // Something went wrong - the update should have worked
        logger.error('Update failed but current state is different from requested:', {
          methodKey,
          requested: is_enabled,
          current: currentData.is_enabled
        });
        return res.status(500).json({
          success: false,
          error: 'Update failed - current state does not match requested state'
        });
      }
    }

    // Get the first (and should be only) updated record
    const updatedRecord = updatedMethod[0];

    logger.info('Payment method updated successfully:', {
      methodKey,
      oldState: currentMethod.is_enabled,
      newState: updatedRecord.is_enabled,
      updatedBy: req.user.username
    });

    return res.json({
      success: true,
      message: `Payment method ${methodKey} ${is_enabled ? 'enabled' : 'disabled'} successfully`,
      data: {
        method_key: updatedRecord.method_key,
        method_name: updatedRecord.method_name,
        is_enabled: updatedRecord.is_enabled,
        updated_at: updatedRecord.updated_at
      }
    });

  } catch (error) {
    logger.error('Toggle payment method error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to toggle payment method'
    });
  }
});

/**
 * Update payment method configuration (Admin only)
 * PUT /api/payments/admin/methods/:methodKey
 */
router.put('/admin/methods/:methodKey', adminOnly, async (req: Request, res: Response) => {
  try {
    const { methodKey } = req.params;
    const {
      method_name,
      method_description,
      is_enabled,
      is_online,
      requires_setup,
      display_order,
      icon_name,
      color_code,
      config_data
    } = req.body;

    if (!methodKey) {
      return res.status(400).json({
        success: false,
        error: 'Payment method key is required'
      });
    }

    // Validate method key
    const validMethods = ['cash', 'gcash', 'card', 'paymongo', 'qrph', 'grab_pay', 'shopeepay'];
    if (!validMethods.includes(methodKey)) {
      return res.status(400).json({
        success: false,
        error: `Invalid payment method. Must be one of: ${validMethods.join(', ')}`
      });
    }

    // Prepare update data
    const updateData: any = {
      updated_by: req.user.id,
      updated_at: new Date().toISOString()
    };

    if (method_name !== undefined) updateData.method_name = method_name;
    if (method_description !== undefined) updateData.method_description = method_description;
    if (typeof is_enabled === 'boolean') updateData.is_enabled = is_enabled;
    if (typeof is_online === 'boolean') updateData.is_online = is_online;
    if (typeof requires_setup === 'boolean') updateData.requires_setup = requires_setup;
    if (typeof display_order === 'number') updateData.display_order = display_order;
    if (icon_name !== undefined) updateData.icon_name = icon_name;
    if (color_code !== undefined) updateData.color_code = color_code;
    if (config_data !== undefined) updateData.config_data = config_data;

    // Update payment method configuration
    const { data, error } = await supabaseService().getClient()
      .from('payment_methods_config')
      .update(updateData)
      .eq('method_key', methodKey)
      .select()
      .single();

    if (error) {
      logger.error('Failed to update payment method:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update payment method configuration'
      });
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Payment method not found'
      });
    }

    logger.info('Payment method updated:', {
      methodKey,
      updatedBy: req.user.username,
      changes: Object.keys(updateData).filter(key => key !== 'updated_by' && key !== 'updated_at')
    });

    return res.json({
      success: true,
      message: 'Payment method updated successfully',
      data
    });

  } catch (error) {
    logger.error('Update payment method error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update payment method'
    });
  }
});

/**
 * Create new payment method configuration (Admin only)
 * POST /api/payments/admin/methods
 */
router.post('/admin/methods', adminOnly, async (req: Request, res: Response) => {
  try {
    const {
      method_key,
      method_name,
      method_description,
      is_enabled = true,
      is_online = false,
      requires_setup = false,
      display_order = 0,
      icon_name,
      color_code,
      config_data = {}
    } = req.body;

    // Validate required fields
    if (!method_key || !method_name) {
      return res.status(400).json({
        success: false,
        error: 'method_key and method_name are required'
      });
    }

    // Validate method key
    const validMethods = ['cash', 'gcash', 'card', 'paymongo', 'qrph', 'grab_pay', 'shopeepay'];
    if (!validMethods.includes(method_key)) {
      return res.status(400).json({
        success: false,
        error: `Invalid payment method. Must be one of: ${validMethods.join(', ')}`
      });
    }

    // Check if method already exists
    const { data: existingMethod } = await supabaseService().getClient()
      .from('payment_methods_config')
      .select('id')
      .eq('method_key', method_key)
      .single();

    if (existingMethod) {
      return res.status(409).json({
        success: false,
        error: 'Payment method already exists'
      });
    }

    // Create new payment method configuration
    const { data, error } = await supabaseService().getClient()
      .from('payment_methods_config')
      .insert({
        method_key,
        method_name,
        method_description,
        is_enabled,
        is_online,
        requires_setup,
        display_order,
        icon_name,
        color_code,
        config_data,
        created_by: req.user.id
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create payment method:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create payment method configuration'
      });
    }

    logger.info('Payment method created:', {
      methodKey: method_key,
      methodName: method_name,
      createdBy: req.user.username
    });

    return res.status(201).json({
      success: true,
      message: 'Payment method created successfully',
      data
    });

  } catch (error) {
    logger.error('Create payment method error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create payment method'
    });
  }
});

/**
 * Test payment method update (Admin only) - for debugging
 * GET /api/payments/admin/methods/:methodKey/test
 */
router.get('/admin/methods/:methodKey/test', adminOnly, async (req: Request, res: Response) => {
  try {
    const { methodKey } = req.params;

    // Get current state
    const { data: currentData, error: fetchError } = await supabaseService().getClient()
      .from('payment_methods_config')
      .select('*')
      .eq('method_key', methodKey)
      .single();

    if (fetchError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch payment method',
        details: fetchError.message
      });
    }

    if (!currentData) {
      return res.status(404).json({
        success: false,
        error: 'Payment method not found'
      });
    }

    // Try a simple update
    const newValue = !currentData.is_enabled; // Toggle the value
    
    const { data: updateData, error: updateError } = await supabaseService().getClient()
      .from('payment_methods_config')
      .update({
        is_enabled: newValue,
        updated_by: req.user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', currentData.id)
      .select('*');

    if (updateError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update payment method',
        details: updateError.message
      });
    }

    return res.json({
      success: true,
      message: 'Test update successful',
      data: {
        before: {
          is_enabled: currentData.is_enabled,
          updated_at: currentData.updated_at
        },
        after: {
          is_enabled: updateData[0].is_enabled,
          updated_at: updateData[0].updated_at
        },
        requested: newValue,
        actual: updateData[0].is_enabled,
        match: updateData[0].is_enabled === newValue
      }
    });

  } catch (error) {
    logger.error('Test payment method error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to test payment method'
    });
  }
});

/**
 * Delete payment method configuration (Admin only)
 * DELETE /api/payments/admin/methods/:methodKey
 */
router.delete('/admin/methods/:methodKey', adminOnly, async (req: Request, res: Response) => {
  try {
    const { methodKey } = req.params;

    if (!methodKey) {
      return res.status(400).json({
        success: false,
        error: 'Payment method key is required'
      });
    }

    // Validate method key
    const validMethods = ['cash', 'gcash', 'card', 'paymongo', 'qrph', 'grab_pay', 'shopeepay'];
    if (!validMethods.includes(methodKey)) {
      return res.status(400).json({
        success: false,
        error: `Invalid payment method. Must be one of: ${validMethods.join(', ')}`
      });
    }

    // Check if method exists
    const { data: existingMethod } = await supabaseService().getClient()
      .from('payment_methods_config')
      .select('id, method_name')
      .eq('method_key', methodKey)
      .single();

    if (!existingMethod) {
      return res.status(404).json({
        success: false,
        error: 'Payment method not found'
      });
    }

    // Soft delete (set is_active to false)
    const { error } = await supabaseService().getClient()
      .from('payment_methods_config')
      .update({
        is_active: false,
        updated_by: req.user.id,
        updated_at: new Date().toISOString()
      })
      .eq('method_key', methodKey);

    if (error) {
      logger.error('Failed to delete payment method:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete payment method configuration'
      });
    }

    logger.info('Payment method deleted:', {
      methodKey,
      methodName: existingMethod.method_name,
      deletedBy: req.user.username
    });

    return res.json({
      success: true,
      message: 'Payment method deleted successfully',
      data: {
        method_key: methodKey,
        method_name: existingMethod.method_name,
        is_active: false,
        deleted_at: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Delete payment method error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete payment method'
    });
  }
});

export default router;
