import { Router, Request, Response } from 'express';
import { supabaseService } from '../services/supabaseService';
import { logger } from '../utils/logger';

const router = Router();

// Get all orders
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query['page'] as string) || 1;
    const limit = parseInt(req.query['limit'] as string) || 50;
    const offset = (page - 1) * limit;

    const result = await supabaseService().getOrders(limit, offset);

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

export default router;
