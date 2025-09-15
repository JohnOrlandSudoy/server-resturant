import { Router, Request, Response } from 'express';
import { offlinePaymentService } from '../services/offlinePaymentService';
import { cashierOrAdmin } from '../middleware/authMiddleware';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Process offline payment (Cash, GCash, Card)
 * POST /api/offline-payments/process
 * 
 * Body: {
 *   orderId: string,
 *   paymentMethod: string,  // 'cash', 'gcash', 'card'
 *   amount: number,
 *   notes?: string
 * }
 */
router.post('/process', cashierOrAdmin, async (req: Request, res: Response) => {
  try {
    const { orderId, paymentMethod, amount, notes } = req.body;

    // Validate required fields
    if (!orderId || !paymentMethod || !amount) {
      return res.status(400).json({
        success: false,
        error: 'orderId, paymentMethod, and amount are required'
      });
    }

    // Validate amount
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Amount must be a positive number'
      });
    }

    // Validate payment method
    const validMethods = ['cash', 'gcash', 'card'];
    if (!validMethods.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        error: `Invalid payment method. Must be one of: ${validMethods.join(', ')}`
      });
    }

    logger.info('Processing offline payment:', {
      orderId,
      paymentMethod,
      amount,
      processedBy: req.user.username
    });

    const result = await offlinePaymentService.processOfflinePayment(
      orderId,
      paymentMethod,
      amount,
      notes,
      req.user.id
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json({
      success: true,
      message: 'Offline payment processed successfully',
      data: result.data
    });

  } catch (error) {
    logger.error('Offline payment processing error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get available offline payment methods
 * GET /api/offline-payments/methods
 */
router.get('/methods', async (req: Request, res: Response) => {
  try {
    const result = await offlinePaymentService.getAvailableOfflinePaymentMethods();
    
    if (!result.success) {
      return res.status(500).json(result);
    }

    return res.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    logger.error('Get offline payment methods error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get payment history for an order
 * GET /api/offline-payments/order/:orderId/history
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

    const result = await offlinePaymentService.getOrderPaymentHistory(orderId);
    
    if (!result.success) {
      return res.status(500).json(result);
    }

    return res.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    logger.error('Get payment history error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Generate receipt for offline payment
 * GET /api/offline-payments/receipt/:paymentId
 */
router.get('/receipt/:paymentId', cashierOrAdmin, async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        error: 'Payment ID is required'
      });
    }

    const result = await offlinePaymentService.generateOfflineReceipt(paymentId);
    
    if (!result.success) {
      return res.status(404).json(result);
    }

    return res.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    logger.error('Generate receipt error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Sync payment methods from cloud (Admin only)
 * POST /api/offline-payments/sync-methods
 */
router.post('/sync-methods', cashierOrAdmin, async (req: Request, res: Response) => {
  try {
    await offlinePaymentService.syncPaymentMethodsFromCloud();
    
    return res.json({
      success: true,
      message: 'Payment methods synced successfully'
    });

  } catch (error) {
    logger.error('Sync payment methods error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
