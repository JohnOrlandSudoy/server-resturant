import { Router, Request, Response } from 'express';
import { supabaseService } from '../services/supabaseService';
import { logger } from '../utils/logger';

const router = Router();

// Get sync status
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const result = await supabaseService().getSyncStatus();

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
    logger.error('Get sync status error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch sync status'
    });
  }
});

export default router;
