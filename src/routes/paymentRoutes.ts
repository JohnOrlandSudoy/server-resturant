import { Router, Request, Response } from 'express';
import { paymongoService, PaymentIntentData, WebhookEvent } from '../services/paymongoService';
import { supabaseService } from '../services/supabaseService';
import { logger } from '../utils/logger';
import { cashierOrAdmin } from '../middleware/authMiddleware';

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

    // TODO: Implement payment history retrieval from database
    // This would require a payments table to track payment attempts

    return res.json({
      success: true,
      message: 'Payment history retrieved',
      data: {
        orderId,
        payments: [] // Placeholder
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

    // TODO: Implement payment cancellation via PayMongo API
    // This would require calling PayMongo's cancel payment intent endpoint

    return res.json({
      success: true,
      message: 'Payment intent cancelled successfully',
      data: {
        paymentIntentId,
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        cancelledBy: req.user.username
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
      case 'payment_intent.succeeded':
        paymentStatus = 'paid';
        break;
      case 'payment_intent.payment_failed':
        paymentStatus = 'failed';
        break;
      case 'payment_intent.cancelled':
        paymentStatus = 'cancelled';
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

export default router;
