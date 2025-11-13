import { Router, Request, Response } from 'express';
import { supabaseService } from '../services/supabaseService';
import { logger } from '../utils/logger';
import { kitchenOrAdmin } from '../middleware/authMiddleware';

const router = Router();

// =====================================================
// KITCHEN WASTE REPORTING
// =====================================================

// Submit a waste incident
router.post('/waste-reports', kitchenOrAdmin, async (req: Request, res: Response) => {
  try {
    const {
      ingredientId,
      quantity,
      unit,
      reason,
      orderId,
      notes,
      photoUrl
    } = req.body;

    if (!ingredientId) {
      return res.status(400).json({
        success: false,
        error: 'ingredientId is required'
      });
    }

    if (!quantity || Number(quantity) <= 0) {
      return res.status(400).json({
        success: false,
        error: 'quantity must be a positive number'
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: 'reason is required'
      });
    }

    if (orderId) {
      const orderResult = await supabaseService().getOrderById(orderId);

      if (!orderResult.success) {
        return res.status(404).json({
          success: false,
          error: orderResult.error || 'Order not found'
        });
      }
    }

    const result = await supabaseService().createWasteReport({
      ingredient_id: ingredientId,
      quantity,
      unit,
      reason,
      reported_by: req.user.id,
      order_id: orderId,
      notes,
      photo_url: photoUrl
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to create waste report'
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Waste report submitted successfully',
      data: result.data
    });
  } catch (error) {
    logger.error('Create waste report error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create waste report'
    });
  }
});

// List waste reports
router.get('/waste-reports', kitchenOrAdmin, async (req: Request, res: Response) => {
  try {
    const {
      startDate,
      endDate,
      status,
      reason,
      limit,
      offset
    } = req.query;

    const filters: {
      startDate?: string;
      endDate?: string;
      status?: string;
      reason?: string;
      limit?: number;
      offset?: number;
    } = {};

    if (typeof startDate === 'string') {
      filters.startDate = startDate;
    }

    if (typeof endDate === 'string') {
      filters.endDate = endDate;
    }

    if (typeof status === 'string') {
      filters.status = status;
    }

    if (typeof reason === 'string') {
      filters.reason = reason;
    }

    if (typeof limit === 'string' || typeof limit === 'number') {
      const parsedLimit = Number(limit);
      if (!Number.isNaN(parsedLimit)) {
        filters.limit = parsedLimit;
      }
    }

    if (typeof offset === 'string' || typeof offset === 'number') {
      const parsedOffset = Number(offset);
      if (!Number.isNaN(parsedOffset)) {
        filters.offset = parsedOffset;
      }
    }

    const result = await supabaseService().getWasteReports(filters);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to fetch waste reports'
      });
    }

    return res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    logger.error('List waste reports error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch waste reports'
    });
  }
});

// Waste report details
router.get('/waste-reports/:id', kitchenOrAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Waste report ID is required'
      });
    }

    const result = await supabaseService().getWasteReportById(id);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: result.error || 'Waste report not found'
      });
    }

    return res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    logger.error('Get waste report error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch waste report'
    });
  }
});

// Update / resolve waste report
router.put('/waste-reports/:id', kitchenOrAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes, photoUrl } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Waste report ID is required'
      });
    }

    const allowedStatuses = ['pending', 'reviewed', 'resolved'];
    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be one of: pending, reviewed, resolved'
      });
    }

    const result = await supabaseService().updateWasteReport(id, {
      status,
      notes,
      photo_url: photoUrl,
      resolved_by: req.user.id
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to update waste report'
      });
    }

    return res.json({
      success: true,
      message: 'Waste report updated successfully',
      data: result.data
    });
  } catch (error) {
    logger.error('Update waste report error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update waste report'
    });
  }
});

// Waste analytics
router.get('/waste-reports/analytics', kitchenOrAdmin, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const filters: {
      startDate?: string;
      endDate?: string;
    } = {};

    if (typeof startDate === 'string') {
      filters.startDate = startDate;
    }

    if (typeof endDate === 'string') {
      filters.endDate = endDate;
    }

    const result = await supabaseService().getWasteAnalytics(filters);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to fetch waste analytics'
      });
    }

    return res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    logger.error('Get waste analytics error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch waste analytics'
    });
  }
});

export default router;

