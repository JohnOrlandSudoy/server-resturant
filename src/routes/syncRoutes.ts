import { Router, Request, Response } from 'express';
import { offlineService } from '../services/offlineService';
import { syncManager } from '../services/syncManager';
import { logger } from '../utils/logger';

const router = Router();

// Get offline status
router.get('/offline-status', async (_req: Request, res: Response) => {
  try {
    const status = await offlineService.getOfflineStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    logger.error('Get offline status error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Get sync status
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const syncStats = await syncManager.getSyncStatistics();
    const offlineStatus = await offlineService.getOfflineStatus();
    
    res.json({
      success: true,
      data: {
        ...syncStats,
        networkMode: offlineStatus.networkMode,
        isOnline: offlineStatus.isOnline
      }
    });
  } catch (error) {
    logger.error('Get sync status error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch sync status'
    });
  }
});

// Force sync
router.post('/force-sync', async (_req: Request, res: Response) => {
  try {
    const result = await syncManager.forceSync();
    res.json({ 
      success: true, 
      message: 'Force sync completed',
      data: result 
    });
  } catch (error) {
    logger.error('Force sync error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Get sync queue
router.get('/queue', async (_req: Request, res: Response) => {
  try {
    const queue = await syncManager.getSyncQueue();
    res.json({ success: true, data: queue });
  } catch (error) {
    logger.error('Get sync queue error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Get pending conflicts
router.get('/conflicts', async (_req: Request, res: Response) => {
  try {
    const conflicts = await offlineService.getPendingConflicts();
    res.json({ success: true, data: conflicts });
  } catch (error) {
    logger.error('Get conflicts error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Resolve conflict
router.post('/resolve-conflict', async (req: Request, res: Response) => {
  try {
    const { conflictId, resolution, resolvedBy } = req.body;
    
    if (!conflictId || !resolution || !resolvedBy) {
      return res.status(400).json({
        success: false,
        error: 'conflictId, resolution, and resolvedBy are required'
      });
    }

    const result = await syncManager.resolveConflict(conflictId, resolution, resolvedBy);
    return res.json(result);
  } catch (error) {
    logger.error('Resolve conflict error:', error);
    return res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Clear failed sync items
router.delete('/failed-items', async (_req: Request, res: Response) => {
  try {
    const clearedCount = await syncManager.clearFailedSyncItems();
    res.json({ 
      success: true, 
      message: `Cleared ${clearedCount} failed sync items`,
      data: { clearedCount }
    });
  } catch (error) {
    logger.error('Clear failed items error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Retry failed sync items
router.post('/retry-failed', async (_req: Request, res: Response) => {
  try {
    await syncManager.retryFailedSyncItems();
    res.json({ 
      success: true, 
      message: 'Failed items reset for retry' 
    });
  } catch (error) {
    logger.error('Retry failed items error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Force online check
router.post('/check-online', async (_req: Request, res: Response) => {
  try {
    const isOnline = await offlineService.forceOnlineCheck();
    res.json({ 
      success: true, 
      data: { isOnline },
      message: isOnline ? 'Online' : 'Offline'
    });
  } catch (error) {
    logger.error('Force online check error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Get registered devices
router.get('/devices', async (_req: Request, res: Response) => {
  try {
    const devices = await offlineService.getRegisteredDevices();
    res.json({ success: true, data: devices });
  } catch (error) {
    logger.error('Get devices error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Register device
router.post('/register-device', async (req: Request, res: Response) => {
  try {
    const { deviceInfo } = req.body;
    
    if (!deviceInfo) {
      return res.status(400).json({
        success: false,
        error: 'deviceInfo is required'
      });
    }

    await offlineService.registerDevice(deviceInfo);
    return res.json({ 
      success: true, 
      message: 'Device registered successfully' 
    });
  } catch (error) {
    logger.error('Register device error:', error);
    return res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Clear legacy sync items (for payments table)
router.post('/clear-legacy', async (req: Request, res: Response) => {
  try {
    const clearedCount = await syncManager.clearLegacySyncItems();
    return res.json({
      success: true,
      message: `Cleared ${clearedCount} legacy sync items`,
      data: { clearedCount }
    });
  } catch (error) {
    logger.error('Clear legacy sync items error:', error);
    return res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

export default router;
