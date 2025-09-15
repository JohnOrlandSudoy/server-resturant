import { DatabaseService } from './databaseService';
import { supabaseService } from './supabaseService';
import { offlineService } from './offlineService';
import { logger } from '../utils/logger';
import { 
  SyncQueueItem, 
  DataConflict, 
  ApiResponse,
  ConflictType,
  ResolutionType 
} from '../types';

export class SyncManager {
  private dbService: DatabaseService;
  private syncInterval: NodeJS.Timeout | null = null;
  private isSyncing: boolean = false;
  private syncIntervalMs: number = 30000; // 30 seconds
  private maxRetries: number = 3;
  private retryDelayMs: number = 5000; // 5 seconds

  constructor() {
    this.dbService = DatabaseService.getInstance();
  }

  // Start the sync process
  startSyncProcess(): void {
    if (this.syncInterval) {
      logger.warn('Sync process already running');
      return;
    }

    logger.info('Starting sync process...');
    this.syncInterval = setInterval(async () => {
      if (offlineService.getIsOnline() && !this.isSyncing) {
        await this.processSyncQueue();
      }
    }, this.syncIntervalMs);

    // Also process immediately
    setTimeout(() => {
      if (offlineService.getIsOnline()) {
        this.processSyncQueue();
      }
    }, 2000);
  }

  // Stop the sync process
  stopSyncProcess(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      logger.info('Sync process stopped');
    }
  }

  // Process the sync queue
  async processSyncQueue(): Promise<{
    processed: number;
    successful: number;
    failed: number;
    conflicts: number;
  }> {
    if (this.isSyncing) {
      logger.warn('Sync already in progress, skipping...');
      return { processed: 0, successful: 0, failed: 0, conflicts: 0 };
    }

    this.isSyncing = true;
    let processed = 0;
    let successful = 0;
    let failed = 0;
    let conflicts = 0;

    try {
      const pendingItems = await this.dbService.getPendingSyncItems();
      logger.info(`Processing ${pendingItems.length} pending sync items`);

      for (const item of pendingItems) {
        try {
          const result = await this.syncItem(item);
          processed++;
          
          if (result.success) {
            successful++;
            await this.dbService.updateSyncStatus(item.id, 'synced');
            logger.info(`Successfully synced: ${item.operationType} on ${item.tableName}`);
          } else if (result.conflict) {
            conflicts++;
            await this.handleConflict(item, result.conflict);
            logger.warn(`Conflict detected: ${item.operationType} on ${item.tableName}`);
          } else {
            failed++;
            await this.handleSyncFailure(item, result.error || 'Unknown error');
            logger.error(`Failed to sync: ${item.operationType} on ${item.tableName} - ${result.error || 'Unknown error'}`);
          }
                 } catch (error) {
                   failed++;
                   const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                   await this.handleSyncFailure(item, errorMessage);
                   logger.error(`Sync error for item ${item.id}: ${errorMessage}`);
                   logger.error(`Item details:`, {
                     tableName: item.tableName,
                     operationType: item.operationType,
                     recordId: item.recordId,
                     recordData: item.recordData
                   });
                 }
      }

      logger.info(`Sync completed: ${processed} processed, ${successful} successful, ${failed} failed, ${conflicts} conflicts`);
      return { processed, successful, failed, conflicts };
    } finally {
      this.isSyncing = false;
    }
  }

  // Sync individual item
  private async syncItem(item: SyncQueueItem): Promise<{
    success: boolean;
    conflict?: any;
    error?: string;
  }> {
    try {
      const client = supabaseService().getClient();

             switch (item.operationType) {
               case 'INSERT':
                 // Handle different table types
                 if (item.tableName === 'offline_payments') {
                   // For offline payments table, we need to handle the data structure
                   const paymentData = {
                     ...item.recordData,
                     // Convert SQLite boolean to PostgreSQL boolean
                     metadata: typeof item.recordData.metadata === 'string' 
                       ? JSON.parse(item.recordData.metadata) 
                       : item.recordData.metadata
                   };
                   
                   const { error: insertError } = await client
                     .from('offline_payments')
                     .insert(paymentData)
                     .select()
                     .single();

                   if (insertError) {
                     // Check if it's a conflict (duplicate key)
                     if (insertError.code === '23505') {
                       return { success: false, conflict: { type: 'duplicate', error: insertError } };
                     }
                     throw insertError;
                   }
                 } else if (item.tableName === 'payments') {
                   // Handle legacy payments table (should not happen with new offline system)
                   logger.warn(`Attempting to sync to legacy payments table: ${item.id}`);
                   return { success: false, error: 'Legacy payments table sync not supported' };
                 } else {
                   // For other tables, use standard insert
                   const { error: insertError } = await client
                     .from(item.tableName)
                     .insert(item.recordData)
                     .select()
                     .single();

                   if (insertError) {
                     // Check if it's a conflict (duplicate key)
                     if (insertError.code === '23505') {
                       return { success: false, conflict: { type: 'duplicate', error: insertError } };
                     }
                     throw insertError;
                   }
                 }
                 break;

        case 'UPDATE':
          const { error: updateError } = await client
            .from(item.tableName)
            .update(item.recordData)
            .eq('id', item.recordId)
            .select()
            .single();

          if (updateError) {
            if (updateError.code === 'PGRST116') {
              return { success: false, conflict: { type: 'not_found', error: updateError } };
            }
            throw updateError;
          }
          break;

        case 'DELETE':
          const { error: deleteError } = await client
            .from(item.tableName)
            .delete()
            .eq('id', item.recordId);

          if (deleteError) {
            throw deleteError;
          }
          break;

        default:
          throw new Error(`Unsupported operation: ${item.operationType}`);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Handle sync failure
  private async handleSyncFailure(item: SyncQueueItem, error: string): Promise<void> {
    const newRetryCount = item.retryCount + 1;
    
    if (newRetryCount >= this.maxRetries) {
      await this.dbService.updateSyncStatus(item.id, 'failed', error);
      logger.error(`Max retries reached for sync item ${item.id}, marking as failed`);
    } else {
      await this.dbService.updateSyncStatus(item.id, 'pending', error);
      logger.warn(`Sync item ${item.id} failed, will retry (${newRetryCount}/${this.maxRetries})`);
      
      // Schedule retry
      setTimeout(async () => {
        if (offlineService.getIsOnline()) {
          await this.processSyncQueue();
        }
      }, this.retryDelayMs * newRetryCount);
    }
  }

  // Handle conflict
  private async handleConflict(item: SyncQueueItem, conflict: any): Promise<void> {
    const conflictData: Omit<DataConflict, 'id' | 'createdAt'> = {
      tableName: item.tableName,
      recordId: item.recordId || 'unknown',
      conflictType: this.determineConflictType(conflict.type),
      localData: item.recordData,
      cloudData: null, // Will be populated when resolving
      resolution: 'pending' as ResolutionType
    };

    await this.dbService.addDataConflict(conflictData);
    await this.dbService.updateSyncStatus(item.id, 'conflict');
  }

  // Determine conflict type
  private determineConflictType(type: string): ConflictType {
    switch (type) {
      case 'duplicate':
        return 'update_conflict';
      case 'not_found':
        return 'delete_conflict';
      default:
        return 'merge_conflict';
    }
  }

  // Force sync (manual trigger)
  async forceSync(): Promise<{
    processed: number;
    successful: number;
    failed: number;
    conflicts: number;
  }> {
    logger.info('Force sync requested');
    return await this.processSyncQueue();
  }

  // Get sync queue
  async getSyncQueue(): Promise<SyncQueueItem[]> {
    return await this.dbService.getPendingSyncItems();
  }

  // Resolve conflict
  async resolveConflict(
    conflictId: string, 
    resolution: ResolutionType, 
    resolvedBy: string
  ): Promise<ApiResponse<any>> {
    try {
      const conflicts = await this.dbService.getPendingConflicts();
      const conflict = conflicts.find(c => c.id === conflictId);
      
      if (!conflict) {
        return { success: false, error: 'Conflict not found' };
      }

      // Update conflict resolution
      await this.dbService.resolveConflict(conflictId, resolution, resolvedBy);

      // Handle the resolution
      switch (resolution) {
        case 'local_wins':
          await this.applyLocalData(conflict);
          break;
        case 'cloud_wins':
          await this.applyCloudData(conflict);
          break;
        case 'manual_merge':
          // Manual merge requires additional data
          return { success: true, message: 'Manual merge requires additional processing' };
      }

      logger.info(`Conflict ${conflictId} resolved with ${resolution} by ${resolvedBy}`);
      return { success: true, message: 'Conflict resolved successfully' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Error resolving conflict ${conflictId}: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  // Apply local data (local wins)
  private async applyLocalData(conflict: DataConflict): Promise<void> {
    const client = supabaseService().getClient();
    
    // Update cloud with local data
    const { error } = await client
      .from(conflict.tableName)
      .update(conflict.localData)
      .eq('id', conflict.recordId);

    if (error) {
      throw new Error(`Failed to apply local data: ${error.message}`);
    }
  }

  // Apply cloud data (cloud wins)
  private async applyCloudData(conflict: DataConflict): Promise<void> {
    // Update local database with cloud data
    await this.dbService.run(
      `UPDATE ${conflict.tableName} SET ? WHERE id = ?`,
      [JSON.stringify(conflict.cloudData), conflict.recordId]
    );
  }

  // Get sync statistics
  async getSyncStatistics(): Promise<{
    totalPending: number;
    totalFailed: number;
    totalConflicts: number;
    lastSyncTime?: string;
    syncInProgress: boolean;
  }> {
    const pendingItems = await this.dbService.getPendingSyncItems();
    const failedItems = pendingItems.filter(item => item.syncStatus === 'failed');
    const conflictItems = pendingItems.filter(item => item.syncStatus === 'conflict');
    
    const result: {
      totalPending: number;
      totalFailed: number;
      totalConflicts: number;
      lastSyncTime?: string;
      syncInProgress: boolean;
    } = {
      totalPending: pendingItems.length,
      totalFailed: failedItems.length,
      totalConflicts: conflictItems.length,
      syncInProgress: this.isSyncing
    };

    if (pendingItems.length > 0 && pendingItems[0]) {
      result.lastSyncTime = pendingItems[0].createdAt;
    }

    return result;
  }

  // Clear failed sync items
  async clearFailedSyncItems(): Promise<number> {
    const failedItems = await this.dbService.getPendingSyncItems();
    const failedCount = failedItems.filter(item => item.syncStatus === 'failed').length;
    
    // Remove failed items from sync queue
    await this.dbService.run(
      `DELETE FROM sync_queue WHERE sync_status = 'failed'`
    );

    logger.info(`Cleared ${failedCount} failed sync items`);
    return failedCount;
  }

  // Retry failed sync items
  async retryFailedSyncItems(): Promise<void> {
    const failedItems = await this.dbService.getPendingSyncItems();
    const failedItemsToRetry = failedItems.filter(item => item.syncStatus === 'failed');
    
    // Reset retry count and status for failed items
    for (const item of failedItemsToRetry) {
      await this.dbService.updateSyncStatus(item.id, 'pending');
    }

    logger.info(`Reset ${failedItemsToRetry.length} failed items for retry`);
    
    // Trigger sync if online
    if (offlineService.getIsOnline()) {
      setTimeout(() => this.processSyncQueue(), 1000);
    }
  }

  // Clear legacy sync items (for payments table that no longer exists)
  async clearLegacySyncItems(): Promise<number> {
    const result = await this.dbService.run(
      `DELETE FROM sync_queue WHERE table_name = 'payments'`
    );
    logger.info(`Cleared legacy sync items for payments table`);
    return result.changes || 0;
  }

  // Check if sync is in progress
  isSyncInProgress(): boolean {
    return this.isSyncing;
  }

  // Get sync interval
  getSyncInterval(): number {
    return this.syncIntervalMs;
  }

  // Set sync interval
  setSyncInterval(intervalMs: number): void {
    this.syncIntervalMs = intervalMs;
    logger.info(`Sync interval updated to ${intervalMs}ms`);
  }
}

export const syncManager = new SyncManager();
