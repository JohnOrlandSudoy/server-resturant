import sqlite3 from 'sqlite3';
import path from 'path';
import { logger } from '../utils/logger';

export class DatabaseService {
  private db!: sqlite3.Database;
  private dbPath: string;

  constructor() {
    this.dbPath = process.env['LOCAL_DB_PATH'] || './data/local.db';
    this.initDatabase();
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
      } else {
        logger.info('Connected to local SQLite database');
        this.createTables();
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
        created_at TEXT NOT NULL
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

export const databaseService = new DatabaseService();
