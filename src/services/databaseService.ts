import sqlite3 from 'sqlite3';
import path from 'path';
import { logger } from '../utils/logger';
import { SyncQueueItem, DeviceInfo, DataConflict } from '../types';

export class DatabaseService {
  private static instance: DatabaseService;
  private db!: sqlite3.Database;
  private dbPath: string;
  private isInitialized: boolean = false;

  private constructor() {
    this.dbPath = process.env['LOCAL_DB_PATH'] || './data/local.db';
    this.initDatabase();
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  private initDatabase(): void {
    // Ensure data directory exists
    const dataDir = path.dirname(this.dbPath);
    const fs = require('fs');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    this.db = new sqlite3.Database(this.dbPath, (err) => {
      if (err) {
        logger.error('Error opening database:', err);
        this.isInitialized = false;
      } else {
        logger.info('Connected to local SQLite database');
        this.createTables();
        // Set initialized after tables are created
        setTimeout(() => {
          this.isInitialized = true;
          logger.info('Local SQLite database fully initialized');
        }, 500);
      }
    });
  }

  private createTables(): void {
    const tables = [
      `CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        order_number TEXT UNIQUE NOT NULL,
        customer_id TEXT,
        customer_name TEXT,
        customer_phone TEXT,
        order_type TEXT NOT NULL,
        status TEXT NOT NULL,
        priority TEXT NOT NULL,
        subtotal REAL NOT NULL,
        discount REAL DEFAULT 0,
        tax REAL DEFAULT 0,
        total REAL NOT NULL,
        payment_status TEXT NOT NULL,
        payment_method TEXT,
        table_number INTEGER,
        special_instructions TEXT,
        estimated_ready_time TEXT,
        actual_ready_time TEXT,
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS order_items (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        menu_item_id TEXT NOT NULL,
        menu_item_name TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        total_price REAL NOT NULL,
        customizations TEXT,
        addons TEXT,
        special_instructions TEXT,
        status TEXT NOT NULL,
        prepared_by TEXT,
        prepared_at TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS menu_items (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        category_id TEXT,
        image_url TEXT,
        prep_time INTEGER NOT NULL,
        is_available INTEGER DEFAULT 1,
        is_featured INTEGER DEFAULT 0,
        popularity INTEGER DEFAULT 0,
        calories INTEGER,
        allergens TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS ingredients (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        current_stock REAL NOT NULL,
        min_stock REAL NOT NULL,
        max_stock REAL,
        unit TEXT NOT NULL,
        cost_per_unit REAL,
        supplier TEXT,
        category TEXT,
        expiry_date TEXT,
        stock_status TEXT DEFAULT 'sufficient',
        is_active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT UNIQUE,
        email TEXT,
        address TEXT,
        loyalty_points INTEGER DEFAULT 0,
        total_orders INTEGER DEFAULT 0,
        total_spent REAL DEFAULT 0,
        notes TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        table_name TEXT NOT NULL,
        operation_type TEXT NOT NULL,
        record_id TEXT,
        record_data TEXT NOT NULL,
        local_timestamp TEXT NOT NULL,
        sync_status TEXT NOT NULL DEFAULT 'pending',
        retry_count INTEGER DEFAULT 0,
        error_message TEXT,
        created_by TEXT,
        created_at TEXT NOT NULL,
        synced_at TEXT,
        last_retry_at TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS device_registry (
        id TEXT PRIMARY KEY,
        device_id TEXT UNIQUE NOT NULL,
        device_name TEXT NOT NULL,
        device_type TEXT NOT NULL,
        user_id TEXT,
        ip_address TEXT,
        mac_address TEXT,
        last_seen TEXT NOT NULL,
        is_online INTEGER DEFAULT 1,
        sync_status TEXT DEFAULT 'synced',
        last_sync_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS data_conflicts (
        id TEXT PRIMARY KEY,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        conflict_type TEXT NOT NULL,
        local_data TEXT,
        cloud_data TEXT,
        resolution TEXT DEFAULT 'pending',
        resolved_by TEXT,
        resolved_at TEXT,
        created_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS sync_status (
        id TEXT PRIMARY KEY,
        table_name TEXT NOT NULL,
        last_sync TEXT,
        sync_count INTEGER DEFAULT 0,
        error_count INTEGER DEFAULT 0,
        last_error TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS user_profiles (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'cashier',
        phone TEXT,
        avatar_url TEXT,
        is_active INTEGER DEFAULT 1,
        last_login TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS payment_methods_config (
        id TEXT PRIMARY KEY,
        method_key TEXT NOT NULL UNIQUE,
        method_name TEXT NOT NULL,
        method_description TEXT,
        is_enabled INTEGER DEFAULT 1,
        is_online INTEGER DEFAULT 0,
        requires_setup INTEGER DEFAULT 0,
        display_order INTEGER DEFAULT 0,
        icon_name TEXT,
        color_code TEXT,
        config_data TEXT DEFAULT '{}',
        is_active INTEGER DEFAULT 1,
        created_by TEXT,
        updated_by TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS offline_payments (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        payment_method TEXT NOT NULL,
        amount REAL NOT NULL,
        currency TEXT DEFAULT 'PHP',
        payment_status TEXT NOT NULL DEFAULT 'paid',
        transaction_id TEXT,
        receipt_number TEXT,
        notes TEXT,
        metadata TEXT DEFAULT '{}',
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id)
      )`
    ];

    tables.forEach((table) => {
      this.db.run(table, (err) => {
        if (err) {
          logger.error('Error creating table:', err);
        }
      });
    });
  }

  // Generic query methods
  public async query(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  public async run(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  public async get(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // Offline-specific methods
  public async addToSyncQueue(item: Omit<SyncQueueItem, 'id'>): Promise<void> {
    const id = this.generateUUID();
    const syncItem: SyncQueueItem = {
      id,
      ...item,
      createdAt: new Date().toISOString()
    };

    await this.run(
      `INSERT INTO sync_queue (
        id, table_name, operation_type, record_id, record_data,
        local_timestamp, sync_status, retry_count, error_message,
        created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        syncItem.id,
        syncItem.tableName,
        syncItem.operationType,
        syncItem.recordId || null,
        JSON.stringify(syncItem.recordData),
        syncItem.localTimestamp,
        syncItem.syncStatus,
        syncItem.retryCount,
        syncItem.errorMessage || null,
        syncItem.createdBy,
        syncItem.createdAt
      ]
    );
  }

  public async getPendingSyncItems(): Promise<SyncQueueItem[]> {
    const rows = await this.query(
      `SELECT * FROM sync_queue 
       WHERE sync_status = 'pending' OR sync_status = 'failed'
       ORDER BY created_at ASC`
    );

    return rows.map(row => ({
      id: row.id,
      tableName: row.table_name,
      operationType: row.operation_type,
      recordId: row.record_id,
      recordData: JSON.parse(row.record_data),
      localTimestamp: row.local_timestamp,
      syncStatus: row.sync_status,
      retryCount: row.retry_count,
      errorMessage: row.error_message,
      createdBy: row.created_by,
      createdAt: row.created_at
    }));
  }

  public async updateSyncStatus(id: string, status: string, errorMessage?: string): Promise<void> {
    const now = new Date().toISOString();
    await this.run(
      `UPDATE sync_queue 
       SET sync_status = ?, error_message = ?, 
           synced_at = CASE WHEN ? = 'synced' THEN ? ELSE synced_at END,
           last_retry_at = CASE WHEN ? = 'failed' THEN ? ELSE last_retry_at END
       WHERE id = ?`,
      [status, errorMessage || null, status, now, status, now, id]
    );
  }

  public async registerDevice(deviceInfo: Omit<DeviceInfo, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const id = this.generateUUID();
    const now = new Date().toISOString();
    
    await this.run(
      `INSERT OR REPLACE INTO device_registry (
        id, device_id, device_name, device_type, user_id,
        ip_address, mac_address, last_seen, is_online,
        sync_status, last_sync_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        deviceInfo.deviceId,
        deviceInfo.deviceName,
        deviceInfo.deviceType,
        deviceInfo.userId,
        deviceInfo.ipAddress || null,
        deviceInfo.macAddress || null,
        deviceInfo.lastSeen,
        deviceInfo.isOnline ? 1 : 0,
        deviceInfo.syncStatus,
        deviceInfo.lastSyncAt || null,
        now,
        now
      ]
    );
  }

  public async getRegisteredDevices(): Promise<DeviceInfo[]> {
    const rows = await this.query('SELECT * FROM device_registry ORDER BY last_seen DESC');
    
    return rows.map(row => ({
      id: row.id,
      deviceId: row.device_id,
      deviceName: row.device_name,
      deviceType: row.device_type,
      userId: row.user_id,
      ipAddress: row.ip_address,
      macAddress: row.mac_address,
      lastSeen: row.last_seen,
      isOnline: row.is_online === 1,
      syncStatus: row.sync_status,
      lastSyncAt: row.last_sync_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  public async addDataConflict(conflict: Omit<DataConflict, 'id' | 'createdAt'>): Promise<void> {
    const id = this.generateUUID();
    const now = new Date().toISOString();
    
    await this.run(
      `INSERT INTO data_conflicts (
        id, table_name, record_id, conflict_type,
        local_data, cloud_data, resolution,
        resolved_by, resolved_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        conflict.tableName,
        conflict.recordId,
        conflict.conflictType,
        JSON.stringify(conflict.localData),
        JSON.stringify(conflict.cloudData),
        conflict.resolution,
        conflict.resolvedBy || null,
        conflict.resolvedAt || null,
        now
      ]
    );
  }

  public async resolveConflict(conflictId: string, resolution: string, resolvedBy: string): Promise<void> {
    const now = new Date().toISOString();
    await this.run(
      `UPDATE data_conflicts 
       SET resolution = ?, resolved_by = ?, resolved_at = ?
       WHERE id = ?`,
      [resolution, resolvedBy, now, conflictId]
    );
  }

  public async getPendingConflicts(): Promise<DataConflict[]> {
    const rows = await this.query(
      `SELECT * FROM data_conflicts 
       WHERE resolution = 'pending'
       ORDER BY created_at ASC`
    );

    return rows.map(row => ({
      id: row.id,
      tableName: row.table_name,
      recordId: row.record_id,
      conflictType: row.conflict_type,
      localData: JSON.parse(row.local_data),
      cloudData: JSON.parse(row.cloud_data),
      resolution: row.resolution,
      resolvedBy: row.resolved_by,
      resolvedAt: row.resolved_at,
      createdAt: row.created_at
    }));
  }

  // Utility methods
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // User management methods
  public async syncUserToLocal(user: any): Promise<void> {
    const now = new Date().toISOString();
    await this.run(
      `INSERT OR REPLACE INTO user_profiles (
        id, username, email, first_name, last_name, role,
        phone, avatar_url, is_active, last_login,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id,
        user.username,
        user.email,
        user.first_name || user.firstName,
        user.last_name || user.lastName,
        user.role,
        user.phone || null,
        user.avatar_url || user.avatarUrl || null,
        user.is_active !== undefined ? (user.is_active ? 1 : 0) : 1,
        user.last_login || user.lastLogin || null,
        user.created_at || user.createdAt || now,
        now
      ]
    );
  }

  public async getLocalUser(userId: string): Promise<any> {
    return await this.get(
      'SELECT * FROM user_profiles WHERE id = ? AND is_active = 1',
      [userId]
    );
  }

  public async getAllLocalUsers(): Promise<any[]> {
    return await this.query(
      'SELECT * FROM user_profiles WHERE is_active = 1 ORDER BY username'
    );
  }

  // Payment methods management
  public async syncPaymentMethodToLocal(paymentMethod: any): Promise<void> {
    const now = new Date().toISOString();
    await this.run(
      `INSERT OR REPLACE INTO payment_methods_config (
        id, method_key, method_name, method_description,
        is_enabled, is_online, requires_setup, display_order,
        icon_name, color_code, config_data, is_active,
        created_by, updated_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        paymentMethod.id,
        paymentMethod.method_key,
        paymentMethod.method_name,
        paymentMethod.method_description || null,
        paymentMethod.is_enabled ? 1 : 0,
        paymentMethod.is_online ? 1 : 0,
        paymentMethod.requires_setup ? 1 : 0,
        paymentMethod.display_order || 0,
        paymentMethod.icon_name || null,
        paymentMethod.color_code || null,
        JSON.stringify(paymentMethod.config_data || {}),
        paymentMethod.is_active ? 1 : 0,
        paymentMethod.created_by || null,
        paymentMethod.updated_by || null,
        paymentMethod.created_at || now,
        now
      ]
    );
  }

  public async getLocalPaymentMethods(): Promise<any[]> {
    return await this.query(
      'SELECT * FROM payment_methods_config WHERE is_active = 1 ORDER BY display_order'
    );
  }

  public async getLocalPaymentMethod(methodKey: string): Promise<any> {
    return await this.get(
      'SELECT * FROM payment_methods_config WHERE method_key = ? AND is_active = 1',
      [methodKey]
    );
  }

  // Offline payment records management
  public async createLocalPayment(payment: any): Promise<void> {
    const now = new Date().toISOString();
    await this.run(
      `INSERT INTO offline_payments (
        id, order_id, payment_method, amount, currency,
        payment_status, transaction_id, receipt_number, 
        notes, metadata, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payment.id,
        payment.order_id,
        payment.payment_method,
        payment.amount,
        payment.currency || 'PHP',
        payment.payment_status || 'paid',
        payment.transaction_id || null,
        payment.receipt_number || null,
        payment.notes || null,
        JSON.stringify(payment.metadata || {}),
        payment.created_by,
        now,
        now
      ]
    );
  }

  public async getLocalPayments(orderId?: string): Promise<any[]> {
    if (orderId) {
      return await this.query(
        'SELECT * FROM offline_payments WHERE order_id = ? ORDER BY created_at DESC',
        [orderId]
      );
    }
    return await this.query(
      'SELECT * FROM offline_payments ORDER BY created_at DESC'
    );
  }

  public async updateLocalPaymentStatus(paymentId: string, status: string, transactionId?: string): Promise<void> {
    const now = new Date().toISOString();
    await this.run(
      `UPDATE offline_payments SET 
        payment_status = ?, 
        transaction_id = ?,
        updated_at = ?
      WHERE id = ?`,
      [status, transactionId || null, now, paymentId]
    );
  }

  public isReady(): boolean {
    return this.isInitialized;
  }

  // Close database connection
  public close(): void {
    this.db.close((err) => {
      if (err) {
        logger.error('Error closing database:', err);
      } else {
        logger.info('Database connection closed');
      }
    });
  }
}

export const databaseService = DatabaseService.getInstance();
