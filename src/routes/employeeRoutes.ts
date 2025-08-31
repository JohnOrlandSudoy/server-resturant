import { Router, Request, Response } from 'express';
import { supabaseService } from '../services/supabaseService';
import { logger } from '../utils/logger';

const router = Router();

// Get all employees
router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await supabaseService().getEmployees();

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
    logger.error('Get employees error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch employees'
    });
  }
});

export default router;
