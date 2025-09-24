import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

// Import routes
import authRoutes from './routes/authRoutes';
import orderRoutes from './routes/orderRoutes';
import menuRoutes from './routes/menuRoutes';
import inventoryRoutes from './routes/inventoryRoutes';
import customerRoutes from './routes/customerRoutes';
import employeeRoutes from './routes/employeeRoutes';
import syncRoutes from './routes/syncRoutes';
import networkRoutes from './routes/networkRoutes';
import paymentRoutes from './routes/paymentRoutes';
import offlinePaymentRoutes from './routes/offlinePaymentRoutes';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/authMiddleware';
import { setupWebSocket } from './websocket/websocket';

// Import services
import { logger } from './utils/logger';
import { DatabaseService } from './services/databaseService';
import { OfflineService } from './services/offlineService';
import { SyncManager } from './services/syncManager';
import { offlinePaymentService } from './services/offlinePaymentService';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env['CORS_ORIGIN'] || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Initialize offline services
const databaseService = DatabaseService.getInstance();
const offlineService = new OfflineService();
const syncManager = new SyncManager();

// Wait for database to be ready before starting sync
setTimeout(async () => {
  // Wait a bit more for database initialization
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  if (databaseService.isReady()) {
    syncManager.startSyncProcess();
    logger.info(`🔄 Sync manager started`);
    logger.info(`💾 Local database ready: ${process.env['LOCAL_DB_PATH'] || './data/local.db'}`);
    
    // Initialize offline payment methods
    try {
      await offlinePaymentService.syncPaymentMethodsFromCloud();
      logger.info(`💳 Offline payment methods initialized`);
    } catch (error) {
      logger.warn(`⚠️ Failed to initialize payment methods:`, error);
    }
  } else {
    logger.warn(`⚠️ Database not ready, sync manager will start when database is available`);
  }
}, 3000);

// Middleware
app.use(helmet());
app.use(morgan('combined', { stream: { write: (message: string) => logger.info(message.trim()) } }));
app.use(cors({
  origin: ['https://dong-g-pastilan.vercel.app', 'http://localhost:5173'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting - More lenient for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs (increased for development)
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip rate limiting for development
  skip: (req) => {
    // Skip rate limiting in development environment
    return process.env['NODE_ENV'] === 'development';
  }
});
app.use('/api/', limiter);

// Custom rate limit error handler
app.use((req: any, res: any, next: any) => {
  // Handle rate limit errors specifically
  if (req.rateLimit && req.rateLimit.remaining === 0) {
    return res.status(429).json({
      success: false,
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.round(req.rateLimit.resetTime / 1000),
      limit: req.rateLimit.limit,
      remaining: req.rateLimit.remaining
    });
  }
  next();
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env['NODE_ENV']
  });
});

// Offline mode health check
app.get('/health/offline', async (_req, res) => {
  try {
    const offlineStatus = await offlineService.getOfflineStatus();
    const syncStats = await syncManager.getSyncStatistics();
    
    res.json({
      status: 'healthy',
      offline: {
        isOnline: offlineStatus.isOnline,
        networkMode: offlineStatus.networkMode,
        pendingSyncCount: offlineStatus.pendingSyncCount,
        pendingConflictsCount: offlineStatus.pendingConflictsCount,
        registeredDevicesCount: offlineStatus.registeredDevicesCount,
        lastSyncTime: offlineStatus.lastSyncTime
      },
      sync: {
        inProgress: syncStats.syncInProgress,
        totalPending: syncStats.totalPending,
        totalFailed: syncStats.totalFailed,
        totalConflicts: syncStats.totalConflicts,
        lastSyncTime: syncStats.lastSyncTime
      },
      database: {
        ready: databaseService.isReady()
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', authMiddleware, orderRoutes);
app.use('/api/menu', authMiddleware, menuRoutes);
app.use('/api/menus', authMiddleware, menuRoutes);
app.use('/api/inventory', authMiddleware, inventoryRoutes);
app.use('/api/customers', authMiddleware, customerRoutes);
app.use('/api/employees', authMiddleware, employeeRoutes);
app.use('/api/sync', authMiddleware, syncRoutes);
app.use('/api/network', authMiddleware, networkRoutes);
app.use('/api/offline-payments', authMiddleware, offlinePaymentRoutes);
// Payment routes - webhook needs to be unauthenticated, others need auth
// Register webhook route first (unauthenticated)
app.use('/api/payments/webhook', paymentRoutes);
// Register other payment routes with authentication
app.use('/api/payments', authMiddleware, paymentRoutes);

// WebSocket setup
setupWebSocket(io);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});

const PORT = process.env['PORT'] || 3000;

// Start server
httpServer.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📊 Environment: ${process.env['NODE_ENV']}`);
  logger.info(`🔗 Supabase URL: ${process.env['SUPABASE_URL']}`);
  logger.info(`🌐 CORS Origin: ${process.env['CORS_ORIGIN']}`);
  
  // Database status will be logged after initialization completes
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  syncManager.stopSyncProcess();
  databaseService.close();
  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  syncManager.stopSyncProcess();
  databaseService.close();
  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

export default app;
