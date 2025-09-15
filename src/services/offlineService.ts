import { DatabaseService } from './databaseService';
import { supabaseService } from './supabaseService';
import { logger } from '../utils/logger';
import { 
  SyncQueueItem, 
  SaveResult, 
  NetworkMode, 
  DeviceInfo,
  DataConflict
} from '../types';

export class OfflineService {
  private dbService: DatabaseService;
  private isOnline: boolean = true;
  private lastOnlineCheck: number = 0;
  private onlineCheckInterval: number = 30000; // 30 seconds
  private networkMode: NetworkMode = {
    mode: 'online',
    cloudAvailable: true,
    localNetworkAvailable: true
  };

  constructor() {
    this.dbService = DatabaseService.getInstance();
    this.startOnlineMonitoring();
  }

  // Start monitoring online status
  private startOnlineMonitoring(): void {
    setInterval(async () => {
      await this.checkOnlineStatus();
    }, this.onlineCheckInterval);
  }

  // Check if we're online
  private async checkOnlineStatus(): Promise<void> {
    try {
      const now = Date.now();
      if (now - this.lastOnlineCheck < this.onlineCheckInterval) {
        return;
      }

      this.lastOnlineCheck = now;
      const wasOnline = this.isOnline;

      // Try to ping Supabase
      const { data, error } = await supabaseService().getClient()
        .from('user_profiles')
        .select('id')
        .limit(1);

      this.isOnline = !error && data !== null;
      this.networkMode.cloudAvailable = this.isOnline;

      if (wasOnline !== this.isOnline) {
        logger.info(`Network status changed: ${this.isOnline ? 'ONLINE' : 'OFFLINE'}`);
        this.networkMode.mode = this.isOnline ? 'online' : 'offline';
      }
    } catch (error) {
      this.isOnline = false;
      this.networkMode.cloudAvailable = false;
      this.networkMode.mode = 'offline';
    }
  }

  // Smart data routing - main method for all operations
  async handleRequest(
    operation: 'create' | 'update' | 'delete' | 'read',
    table: string,
    data: any,
    userId?: string
  ): Promise<SaveResult> {
    try {
      if (this.isOnline) {
        // Try online operation first
        const result = await this.supabaseOperation(operation, table, data);
        return {
          success: true,
          syncStatus: 'synced',
          data: result
        };
      } else {
        // Go directly to offline operation
        return await this.offlineOperation(operation, table, data, userId);
      }
    } catch (error) {
      logger.error(`Online operation failed, falling back to offline: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Fallback to offline mode
      return await this.offlineOperation(operation, table, data, userId);
    }
  }

  // Online operation via Supabase
  private async supabaseOperation(
    operation: string,
    table: string,
    data: any
  ): Promise<any> {
    const client = supabaseService().getClient();
    
    switch (operation) {
      case 'create':
        const { data: insertData, error: insertError } = await client
          .from(table)
          .insert(data)
          .select()
          .single();
        if (insertError) throw insertError;
        return insertData;

      case 'update':
        const { data: updateData, error: updateError } = await client
          .from(table)
          .update(data)
          .eq('id', data.id)
          .select()
          .single();
        if (updateError) throw updateError;
        return updateData;

      case 'delete':
        const { error: deleteError } = await client
          .from(table)
          .delete()
          .eq('id', data.id);
        if (deleteError) throw deleteError;
        return { id: data.id, deleted: true };

      case 'read':
        const { data: readData, error: readError } = await client
          .from(table)
          .select('*')
          .eq('id', data.id)
          .single();
        if (readError) throw readError;
        return readData;

      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }
  }

  // Offline operation via SQLite
  private async offlineOperation(
    operation: string,
    table: string,
    data: any,
    userId?: string
  ): Promise<SaveResult> {
    try {
      // Store in local SQLite
      const localResult = await this.executeLocalOperation(operation, table, data);

      // Add to sync queue for later synchronization
      if (operation !== 'read') {
        await this.addToSyncQueue(operation, table, data, userId);
      }

      return {
        success: true,
        syncStatus: 'pending',
        data: localResult
      };
    } catch (error) {
      logger.error(`Offline operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        success: false,
        syncStatus: 'failed',
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Execute operation on local SQLite database
  private async executeLocalOperation(
    operation: string,
    table: string,
    data: any
  ): Promise<any> {
    const now = new Date().toISOString();
    
    switch (operation) {
      case 'create':
        const insertData = {
          ...data,
          id: data.id || this.generateUUID(),
          created_at: now,
          updated_at: now
        };
        await this.dbService.run(
          this.buildInsertSQL(table, insertData),
          Object.values(insertData)
        );
        return insertData;

      case 'update':
        const updateData = {
          ...data,
          updated_at: now
        };
        await this.dbService.run(
          this.buildUpdateSQL(table, updateData),
          [...Object.values(updateData), data.id]
        );
        return updateData;

      case 'delete':
        await this.dbService.run(
          `DELETE FROM ${table} WHERE id = ?`,
          [data.id]
        );
        return { id: data.id, deleted: true };

      case 'read':
        return await this.dbService.get(
          `SELECT * FROM ${table} WHERE id = ?`,
          [data.id]
        );

      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }
  }

  // Add operation to sync queue
  private async addToSyncQueue(
    operation: string,
    table: string,
    data: any,
    userId?: string
  ): Promise<void> {
    const syncItem: Omit<SyncQueueItem, 'id'> = {
      tableName: table,
      operationType: operation.toUpperCase() as 'INSERT' | 'UPDATE' | 'DELETE',
      recordId: data.id,
      recordData: data,
      localTimestamp: new Date().toISOString(),
      syncStatus: 'pending',
      retryCount: 0,
      createdBy: userId || 'system',
      createdAt: new Date().toISOString()
    };

    await this.dbService.addToSyncQueue(syncItem);
    logger.info(`Added to sync queue: ${operation} on ${table}`);
  }

  // Build SQL queries
  private buildInsertSQL(table: string, data: any): string {
    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    return `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
  }

  private buildUpdateSQL(table: string, data: any): string {
    const setClause = Object.keys(data)
      .filter(key => key !== 'id')
      .map(key => `${key} = ?`)
      .join(', ');
    return `UPDATE ${table} SET ${setClause} WHERE id = ?`;
  }

  // Device management
  async registerDevice(deviceInfo: Omit<DeviceInfo, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    await this.dbService.registerDevice(deviceInfo);
    logger.info(`Device registered: ${deviceInfo.deviceName} (${deviceInfo.deviceId})`);
  }

  async getRegisteredDevices(): Promise<DeviceInfo[]> {
    return await this.dbService.getRegisteredDevices();
  }

  // Conflict management
  async addDataConflict(conflict: Omit<DataConflict, 'id' | 'createdAt'>): Promise<void> {
    await this.dbService.addDataConflict(conflict);
    logger.warn(`Data conflict detected: ${conflict.tableName}.${conflict.recordId}`);
  }

  async resolveConflict(conflictId: string, resolution: string, resolvedBy: string): Promise<void> {
    await this.dbService.resolveConflict(conflictId, resolution, resolvedBy);
    logger.info(`Conflict resolved: ${conflictId} by ${resolvedBy}`);
  }

  async getPendingConflicts(): Promise<DataConflict[]> {
    return await this.dbService.getPendingConflicts();
  }

  // Status and monitoring
  async getOfflineStatus(): Promise<{
    isOnline: boolean;
    networkMode: NetworkMode;
    pendingSyncCount: number;
    pendingConflictsCount: number;
    registeredDevicesCount: number;
    lastSyncTime?: string;
  }> {
    const pendingSyncItems = await this.dbService.getPendingSyncItems();
    const pendingConflicts = await this.dbService.getPendingConflicts();
    const registeredDevices = await this.dbService.getRegisteredDevices();

    const result: {
      isOnline: boolean;
      networkMode: NetworkMode;
      pendingSyncCount: number;
      pendingConflictsCount: number;
      registeredDevicesCount: number;
      lastSyncTime?: string;
    } = {
      isOnline: this.isOnline,
      networkMode: this.networkMode,
      pendingSyncCount: pendingSyncItems.length,
      pendingConflictsCount: pendingConflicts.length,
      registeredDevicesCount: registeredDevices.length
    };

    if (pendingSyncItems.length > 0) {
      const lastItem = pendingSyncItems[pendingSyncItems.length - 1];
      if (lastItem && lastItem.createdAt) {
        result.lastSyncTime = lastItem.createdAt;
      }
    }

    return result;
  }

  // Force online check
  async forceOnlineCheck(): Promise<boolean> {
    this.lastOnlineCheck = 0; // Reset to force immediate check
    await this.checkOnlineStatus();
    return this.isOnline;
  }

  // Get current online status
  getIsOnline(): boolean {
    return this.isOnline;
  }

  // Get sync queue
  async getSyncQueue(): Promise<SyncQueueItem[]> {
    return await this.dbService.getPendingSyncItems();
  }

  // Utility methods
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Check if database is ready
  isReady(): boolean {
    return this.dbService.isReady();
  }

  // Get current network mode
  getNetworkMode(): NetworkMode {
    return this.networkMode;
  }

}

export const offlineService = new OfflineService();
