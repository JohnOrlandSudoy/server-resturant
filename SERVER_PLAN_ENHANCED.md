# Enhanced Server Implementation Plan - adminRestu

## 🚀 **System Overview**

This document outlines the complete server implementation plan for the adminRestu restaurant management system with **hybrid online/offline capabilities**. The system supports three operational modes:

1. **Online Mode**: Full cloud connectivity with Supabase
2. **Offline Mode**: Local network communication between devices
3. **Hybrid Mode**: Seamless transition between online/offline states

---

## 🏗️ **Enhanced Technology Stack**

### **Backend Framework**
- **Node.js 18+** - Runtime environment
- **Express.js 4.18+** - Web framework
- **TypeScript 5.0+** - Type safety and development experience

### **Database & Storage**
- **Supabase** - Primary cloud database (PostgreSQL)
- **SQLite** - Local offline database
- **IndexedDB** - Browser-based local storage
- **LocalStorage** - Session and cache storage

### **Network & Communication**
- **WebSocket** - Real-time communication
- **Socket.io** - Cross-platform real-time engine
- **Peer-to-Peer (P2P)** - Direct device communication
- **WebRTC** - Browser-based peer connections
- **HTTP/HTTPS** - REST API communication

### **Authentication & Security**
- **Supabase Auth** - Cloud authentication
- **JWT** - Token-based authentication
- **Local Authentication** - Offline user verification
- **bcryptjs** - Password hashing
- **Crypto-js** - Local data encryption

### **Additional Tools**
- **joi** - Request validation
- **cors** - Cross-origin resource sharing
- **helmet** - Security headers
- **morgan** - HTTP request logging
- **compression** - Response compression
- **rate-limiter-flexible** - Rate limiting
- **node-cron** - Scheduled tasks
- **winston** - Logging
- **nodemailer** - Email notifications

---

## 🌐 **Network Architecture**

### **Online Mode Architecture**
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Admin     │    │  Cashier    │    │   Kitchen   │
│  Device     │    │  Device     │    │   Device    │
└─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
                    ┌─────────────┐
                    │   Internet  │
                    └─────────────┘
                           │
                    ┌─────────────┐
                    │  Supabase   │
                    │   Cloud     │
                    └─────────────┘
```

### **Offline Mode Architecture**
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Admin     │◄──►│  Cashier    │◄──►│   Kitchen   │
│  Device     │    │  Device     │    │   Device    │
│ (Server)    │    │ (Client)    │    │ (Client)    │
└─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
                    ┌─────────────┐
                    │ Local WiFi  │
                    │  Network    │
                    └─────────────┘
```

### **Hybrid Mode Architecture**
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Admin     │    │  Cashier    │    │   Kitchen   │
│  Device     │    │  Device     │    │   Device    │
│ (Hybrid)    │    │ (Hybrid)    │    │ (Hybrid)    │
└─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
                    ┌─────────────┐
                    │ Local WiFi  │
                    │  Network    │
                    └─────────────┘
                           │
                    ┌─────────────┐
                    │   Internet  │
                    │  (Backup)   │
                    └─────────────┘
```

---

## 📊 **Enhanced Database Schema**

### **Additional Tables for Offline Support**

#### **13. Sync Queue Table**
```sql
CREATE TABLE sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name VARCHAR(50) NOT NULL,
  operation_type VARCHAR(20) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
  record_id UUID,
  record_data JSONB NOT NULL,
  local_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sync_status sync_status_type NOT NULL DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TYPE sync_status_type AS ENUM ('pending', 'syncing', 'completed', 'failed');
```

#### **14. Device Registry Table**
```sql
CREATE TABLE device_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id VARCHAR(100) UNIQUE NOT NULL,
  device_name VARCHAR(100) NOT NULL,
  device_type device_type NOT NULL,
  user_id UUID REFERENCES user_profiles(id),
  ip_address INET,
  mac_address VARCHAR(17),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_online BOOLEAN DEFAULT true,
  sync_status device_sync_status DEFAULT 'synced',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TYPE device_type AS ENUM ('admin', 'cashier', 'kitchen', 'mobile');
CREATE TYPE device_sync_status AS ENUM ('synced', 'pending', 'conflict', 'offline');
```

#### **15. Network Sessions Table**
```sql
CREATE TABLE network_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(100) UNIQUE NOT NULL,
  admin_device_id UUID REFERENCES device_registry(id),
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  status session_status DEFAULT 'active',
  connected_devices JSONB DEFAULT '[]',
  sync_summary JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TYPE session_status AS ENUM ('active', 'ended', 'interrupted');
```

#### **16. Data Conflicts Table**
```sql
CREATE TABLE data_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name VARCHAR(50) NOT NULL,
  record_id UUID NOT NULL,
  conflict_type conflict_type NOT NULL,
  local_data JSONB,
  cloud_data JSONB,
  resolution resolution_type DEFAULT 'pending',
  resolved_by UUID REFERENCES user_profiles(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TYPE conflict_type AS ENUM ('update_conflict', 'delete_conflict', 'merge_conflict');
CREATE TYPE resolution_type AS ENUM ('pending', 'local_wins', 'cloud_wins', 'manual_merge');
```

---

## 🔄 **Offline Mode Implementation**

### **Local Server Setup**
```typescript
// Local server for offline mode
class LocalServer {
  private express: Express;
  private httpServer: Server;
  private io: Server;
  private sqlite: Database;
  private connectedClients: Map<string, Socket> = new Map();

  constructor() {
    this.express = express();
    this.httpServer = createServer(this.express);
    this.io = new Server(this.httpServer);
    this.sqlite = new Database('./local.db');
    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
  }

  private setupMiddleware() {
    this.express.use(cors());
    this.express.use(express.json());
    this.express.use(helmet());
  }

  private setupRoutes() {
    // Local API routes
    this.express.use('/api/local', localRoutes);
    this.express.use('/api/sync', syncRoutes);
    this.express.use('/api/network', networkRoutes);
  }

  private setupWebSocket() {
    this.io.on('connection', (socket) => {
      this.handleClientConnection(socket);
    });
  }

  private handleClientConnection(socket: Socket) {
    const deviceId = socket.handshake.query.deviceId as string;
    const deviceType = socket.handshake.query.deviceType as string;
    
    this.connectedClients.set(deviceId, socket);
    
    socket.on('disconnect', () => {
      this.connectedClients.delete(deviceId);
    });

    socket.on('order-update', (data) => {
      this.broadcastToOtherDevices(deviceId, 'order-updated', data);
    });

    socket.on('inventory-update', (data) => {
      this.broadcastToOtherDevices(deviceId, 'inventory-updated', data);
    });
  }

  public start(port: number = 3000) {
    this.httpServer.listen(port, () => {
      console.log(`Local server running on port ${port}`);
    });
  }
}
```

### **Client-Side Offline Manager**
```typescript
class OfflineManager {
  private db: IDBDatabase;
  private syncQueue: SyncQueueItem[] = [];
  private isOnline: boolean = navigator.onLine;
  private localServerUrl: string = 'http://192.168.1.100:3000';

  constructor() {
    this.initIndexedDB();
    this.setupNetworkListeners();
    this.startPeriodicSync();
  }

  private async initIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('adminRestu', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.createObjectStores(db);
      };
    });
  }

  private createObjectStores(db: IDBDatabase) {
    // Create object stores for local data
    const stores = ['orders', 'menu_items', 'ingredients', 'customers', 'sync_queue'];
    
    stores.forEach(storeName => {
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: 'id' });
      }
    });
  }

  public async saveData(table: string, data: any) {
    if (this.isOnline) {
      // Save to cloud
      await this.saveToCloud(table, data);
    } else {
      // Save to local storage and queue for sync
      await this.saveToLocal(table, data);
      this.addToSyncQueue(table, 'INSERT', data);
    }
  }

  private async saveToLocal(table: string, data: any) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([table], 'readwrite');
      const store = transaction.objectStore(table);
      const request = store.put(data);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private addToSyncQueue(table: string, operation: string, data: any) {
    const syncItem: SyncQueueItem = {
      id: crypto.randomUUID(),
      table_name: table,
      operation_type: operation,
      record_data: data,
      local_timestamp: new Date().toISOString(),
      sync_status: 'pending',
      retry_count: 0
    };
    
    this.syncQueue.push(syncItem);
    this.saveSyncQueue();
  }

  private async syncWithCloud() {
    if (!this.isOnline || this.syncQueue.length === 0) return;

    for (const item of this.syncQueue) {
      try {
        await this.processSyncItem(item);
        this.removeFromSyncQueue(item.id);
      } catch (error) {
        item.retry_count++;
        item.error_message = error.message;
        if (item.retry_count >= 3) {
          item.sync_status = 'failed';
        }
      }
    }
  }

  private async processSyncItem(item: SyncQueueItem) {
    const response = await fetch(`${this.cloudApiUrl}/api/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.statusText}`);
    }

    return response.json();
  }
}
```

---

## 🌐 **Network Discovery & Communication**

### **Device Discovery Service**
```typescript
class DeviceDiscovery {
  private devices: Map<string, DeviceInfo> = new Map();
  private discoveryInterval: NodeJS.Timeout;
  private localNetwork: string = '192.168.1.0/24';

  constructor() {
    this.startDiscovery();
  }

  private startDiscovery() {
    // Scan local network for other devices
    this.discoveryInterval = setInterval(() => {
      this.scanNetwork();
    }, 5000);
  }

  private async scanNetwork() {
    const networkRange = this.getNetworkRange();
    
    for (let i = 1; i <= 254; i++) {
      const ip = `${networkRange}.${i}`;
      this.checkDevice(ip);
    }
  }

  private async checkDevice(ip: string) {
    try {
      const response = await fetch(`http://${ip}:3000/health`, {
        method: 'GET',
        timeout: 1000
      });

      if (response.ok) {
        const deviceInfo = await response.json();
        this.devices.set(ip, deviceInfo);
        this.notifyDeviceFound(deviceInfo);
      }
    } catch (error) {
      // Device not found or not responding
    }
  }

  private notifyDeviceFound(deviceInfo: DeviceInfo) {
    // Emit event for UI to show available devices
    this.emit('deviceFound', deviceInfo);
  }

  public getAvailableDevices(): DeviceInfo[] {
    return Array.from(this.devices.values());
  }

  public async connectToDevice(deviceInfo: DeviceInfo) {
    try {
      const socket = io(`http://${deviceInfo.ip}:3000`, {
        query: {
          deviceId: this.deviceId,
          deviceType: this.deviceType
        }
      });

      socket.on('connect', () => {
        console.log(`Connected to ${deviceInfo.name}`);
        this.emit('connected', deviceInfo);
      });

      return socket;
    } catch (error) {
      throw new Error(`Failed to connect to ${deviceInfo.name}`);
    }
  }
}
```

### **Peer-to-Peer Communication**
```typescript
class P2PCommunication {
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private dataChannels: Map<string, RTCDataChannel> = new Map();

  constructor() {
    this.setupWebRTC();
  }

  private setupWebRTC() {
    // Configure STUN/TURN servers for NAT traversal
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };

    // Create peer connection
    const peerConnection = new RTCPeerConnection(configuration);
    
    peerConnection.ondatachannel = (event) => {
      this.handleDataChannel(event.channel);
    };

    return peerConnection;
  }

  private handleDataChannel(channel: RTCDataChannel) {
    channel.onopen = () => {
      console.log('Data channel opened');
    };

    channel.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleMessage(data);
    };

    channel.onclose = () => {
      console.log('Data channel closed');
    };
  }

  private handleMessage(data: any) {
    switch (data.type) {
      case 'order_update':
        this.broadcastOrderUpdate(data.payload);
        break;
      case 'inventory_update':
        this.broadcastInventoryUpdate(data.payload);
        break;
      case 'sync_request':
        this.handleSyncRequest(data.payload);
        break;
    }
  }

  public async sendMessage(targetDevice: string, message: any) {
    const channel = this.dataChannels.get(targetDevice);
    if (channel && channel.readyState === 'open') {
      channel.send(JSON.stringify(message));
    }
  }
}
```

---

## 🔄 **Data Synchronization**

### **Sync Manager**
```typescript
class SyncManager {
  private syncQueue: SyncItem[] = [];
  private syncInProgress: boolean = false;
  private lastSyncTimestamp: Date | null = null;

  constructor() {
    this.loadSyncQueue();
    this.startPeriodicSync();
  }

  public async syncData() {
    if (this.syncInProgress) return;
    
    this.syncInProgress = true;
    
    try {
      // Sync local changes to cloud
      await this.syncLocalToCloud();
      
      // Sync cloud changes to local
      await this.syncCloudToLocal();
      
      // Resolve conflicts
      await this.resolveConflicts();
      
      this.lastSyncTimestamp = new Date();
      this.clearSyncQueue();
      
    } catch (error) {
      console.error('Sync failed:', error);
      this.handleSyncError(error);
    } finally {
      this.syncInProgress = false;
    }
  }

  private async syncLocalToCloud() {
    const pendingChanges = await this.getPendingChanges();
    
    for (const change of pendingChanges) {
      try {
        await this.sendToCloud(change);
        await this.markAsSynced(change.id);
      } catch (error) {
        await this.markAsFailed(change.id, error.message);
      }
    }
  }

  private async syncCloudToLocal() {
    const lastSync = this.lastSyncTimestamp || new Date(0);
    const cloudChanges = await this.getCloudChanges(lastSync);
    
    for (const change of cloudChanges) {
      try {
        await this.applyCloudChange(change);
      } catch (error) {
        await this.createConflict(change);
      }
    }
  }

  private async resolveConflicts() {
    const conflicts = await this.getConflicts();
    
    for (const conflict of conflicts) {
      const resolution = await this.getConflictResolution(conflict);
      await this.applyResolution(conflict, resolution);
    }
  }

  private async getConflictResolution(conflict: Conflict): Promise<Resolution> {
    // Show conflict resolution UI to user
    return new Promise((resolve) => {
      this.emit('conflictDetected', conflict, resolve);
    });
  }
}
```

---

## 🔒 **Enhanced Security**

### **Local Authentication**
```typescript
class LocalAuth {
  private users: Map<string, LocalUser> = new Map();
  private sessions: Map<string, Session> = new Map();

  constructor() {
    this.loadLocalUsers();
  }

  public async authenticate(username: string, password: string): Promise<AuthResult> {
    const user = this.users.get(username);
    
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    
    if (!isValid) {
      return { success: false, error: 'Invalid password' };
    }

    const session = this.createSession(user);
    return { success: true, session, user };
  }

  private createSession(user: LocalUser): Session {
    const sessionId = crypto.randomUUID();
    const session: Session = {
      id: sessionId,
      userId: user.id,
      username: user.username,
      role: user.role,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  public validateSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    
    if (!session) return false;
    
    if (session.expiresAt < new Date()) {
      this.sessions.delete(sessionId);
      return false;
    }

    return true;
  }
}
```

### **Data Encryption**
```typescript
class DataEncryption {
  private encryptionKey: string;

  constructor() {
    this.encryptionKey = this.generateEncryptionKey();
  }

  public encryptData(data: any): string {
    const jsonString = JSON.stringify(data);
    return CryptoJS.AES.encrypt(jsonString, this.encryptionKey).toString();
  }

  public decryptData(encryptedData: string): any {
    const decrypted = CryptoJS.AES.decrypt(encryptedData, this.encryptionKey);
    const jsonString = decrypted.toString(CryptoJS.enc.Utf8);
    return JSON.parse(jsonString);
  }

  private generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}
```

---

## 📱 **Role-Specific Features**

### **Admin Device Features**
```typescript
class AdminDevice {
  private syncManager: SyncManager;
  private deviceDiscovery: DeviceDiscovery;
  private localServer: LocalServer;

  constructor() {
    this.syncManager = new SyncManager();
    this.deviceDiscovery = new DeviceDiscovery();
    this.localServer = new LocalServer();
    
    this.setupAdminFeatures();
  }

  private setupAdminFeatures() {
    // Start local server for other devices
    this.localServer.start(3000);
    
    // Monitor all connected devices
    this.deviceDiscovery.on('deviceFound', (device) => {
      this.addDeviceToNetwork(device);
    });
    
    // Handle sync requests from other devices
    this.syncManager.on('syncRequest', (request) => {
      this.handleSyncRequest(request);
    });
  }

  public async generateNetworkReport(): Promise<NetworkReport> {
    const devices = this.deviceDiscovery.getAvailableDevices();
    const syncStatus = await this.syncManager.getSyncStatus();
    
    return {
      totalDevices: devices.length,
      onlineDevices: devices.filter(d => d.isOnline).length,
      syncStatus,
      lastSync: this.syncManager.getLastSyncTimestamp(),
      networkHealth: this.calculateNetworkHealth()
    };
  }

  public async forceSync(): Promise<void> {
    await this.syncManager.syncData();
  }
}
```

### **Cashier Device Features**
```typescript
class CashierDevice {
  private offlineManager: OfflineManager;
  private networkConnection: NetworkConnection;

  constructor() {
    this.offlineManager = new OfflineManager();
    this.networkConnection = new NetworkConnection();
    
    this.setupCashierFeatures();
  }

  private setupCashierFeatures() {
    // Connect to admin device when available
    this.networkConnection.on('adminFound', (adminDevice) => {
      this.connectToAdmin(adminDevice);
    });
    
    // Handle order processing
    this.offlineManager.on('orderCreated', (order) => {
      this.processOrder(order);
    });
  }

  public async processOrder(orderData: OrderData): Promise<OrderResult> {
    // Check if online
    if (this.networkConnection.isConnected()) {
      return await this.processOrderOnline(orderData);
    } else {
      return await this.processOrderOffline(orderData);
    }
  }

  private async processOrderOffline(orderData: OrderData): Promise<OrderResult> {
    // Save order locally
    await this.offlineManager.saveData('orders', orderData);
    
    // Queue for sync when online
    this.offlineManager.addToSyncQueue('orders', 'INSERT', orderData);
    
    return {
      success: true,
      orderId: orderData.id,
      syncStatus: 'pending'
    };
  }
}
```

### **Kitchen Device Features**
```typescript
class KitchenDevice {
  private orderManager: OrderManager;
  private inventoryManager: InventoryManager;

  constructor() {
    this.orderManager = new OrderManager();
    this.inventoryManager = new InventoryManager();
    
    this.setupKitchenFeatures();
  }

  private setupKitchenFeatures() {
    // Listen for new orders
    this.orderManager.on('newOrder', (order) => {
      this.handleNewOrder(order);
    });
    
    // Monitor inventory levels
    this.inventoryManager.on('lowStock', (item) => {
      this.handleLowStock(item);
    });
  }

  public async updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
    await this.orderManager.updateStatus(orderId, status);
    
    // Broadcast to other devices
    this.broadcastOrderUpdate({
      orderId,
      status,
      timestamp: new Date()
    });
  }

  private broadcastOrderUpdate(update: OrderUpdate) {
    // Send to local network
    this.networkConnection.broadcast('orderUpdate', update);
    
    // Queue for cloud sync
    this.offlineManager.addToSyncQueue('orders', 'UPDATE', update);
  }
}
```

---

## 🔌 **Enhanced API Endpoints**

### **Local Network Routes**
```typescript
// Local network communication
router.get('/api/local/devices', getAvailableDevices);
router.post('/api/local/connect', connectToDevice);
router.post('/api/local/disconnect', disconnectFromDevice);

// Local data management
router.get('/api/local/data/:table', getLocalData);
router.post('/api/local/data/:table', saveLocalData);
router.put('/api/local/data/:table/:id', updateLocalData);
router.delete('/api/local/data/:table/:id', deleteLocalData);

// Sync management
router.get('/api/local/sync/status', getSyncStatus);
router.post('/api/local/sync/force', forceSync);
router.get('/api/local/sync/queue', getSyncQueue);
router.post('/api/local/sync/resolve', resolveConflict);

// Network management
router.get('/api/local/network/health', getNetworkHealth);
router.post('/api/local/network/scan', scanNetwork);
router.get('/api/local/network/devices', getNetworkDevices);
```

### **Cloud Sync Routes**
```typescript
// Cloud synchronization
router.post('/api/sync/upload', uploadLocalData);
router.post('/api/sync/download', downloadCloudData);
router.post('/api/sync/conflicts', resolveConflicts);
router.get('/api/sync/status', getSyncStatus);

// Conflict resolution
router.get('/api/conflicts', getConflicts);
router.post('/api/conflicts/:id/resolve', resolveConflict);
router.delete('/api/conflicts/:id', deleteConflict);
```

---

## 🚀 **Deployment & Configuration**

### **Environment Configuration**
```bash
# Production environment variables
NODE_ENV=production
PORT=3000

# Cloud Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Local Network Configuration
LOCAL_NETWORK_RANGE=192.168.1.0/24
LOCAL_SERVER_PORT=3000
DEVICE_DISCOVERY_INTERVAL=5000

# Sync Configuration
SYNC_INTERVAL=30000
MAX_RETRY_ATTEMPTS=3
CONFLICT_RESOLUTION_TIMEOUT=30000

# Security Configuration
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_encryption_key
CORS_ORIGIN=https://your-frontend-domain.com

# Offline Configuration
OFFLINE_MODE_ENABLED=true
LOCAL_DB_PATH=./local.db
INDEXED_DB_NAME=adminRestu
```

### **Device-Specific Configuration**
```typescript
// Admin device configuration
const adminConfig = {
  role: 'admin',
  serverMode: 'hybrid',
  canStartLocalServer: true,
  canManageNetwork: true,
  canForceSync: true,
  canResolveConflicts: true
};

// Cashier device configuration
const cashierConfig = {
  role: 'cashier',
  serverMode: 'client',
  canStartLocalServer: false,
  canManageNetwork: false,
  canForceSync: false,
  canResolveConflicts: false
};

// Kitchen device configuration
const kitchenConfig = {
  role: 'kitchen',
  serverMode: 'client',
  canStartLocalServer: false,
  canManageNetwork: false,
  canForceSync: false,
  canResolveConflicts: false
};
```

---

## 📊 **Monitoring & Analytics**

### **Network Health Monitoring**
```typescript
class NetworkMonitor {
  private metrics: NetworkMetrics = {
    devicesConnected: 0,
    syncSuccessRate: 0,
    averageResponseTime: 0,
    conflictsResolved: 0,
    offlineTime: 0
  };

  public updateMetrics(update: Partial<NetworkMetrics>) {
    this.metrics = { ...this.metrics, ...update };
    this.emit('metricsUpdated', this.metrics);
  }

  public generateHealthReport(): NetworkHealthReport {
    return {
      status: this.calculateHealthStatus(),
      metrics: this.metrics,
      recommendations: this.generateRecommendations(),
      timestamp: new Date()
    };
  }

  private calculateHealthStatus(): 'healthy' | 'warning' | 'critical' {
    if (this.metrics.syncSuccessRate > 95 && this.metrics.averageResponseTime < 1000) {
      return 'healthy';
    } else if (this.metrics.syncSuccessRate > 80 && this.metrics.averageResponseTime < 3000) {
      return 'warning';
    } else {
      return 'critical';
    }
  }
}
```

---

## 🔄 **Migration & Rollout Strategy**

### **Phase 1: Core Infrastructure (Week 1-2)**
1. Set up Supabase project and database schema
2. Implement basic Express.js server
3. Create local SQLite database
4. Implement basic authentication

### **Phase 2: Offline Capabilities (Week 3-4)**
1. Implement IndexedDB for local storage
2. Create offline data manager
3. Implement local authentication
4. Add data encryption

### **Phase 3: Network Communication (Week 5-6)**
1. Implement device discovery
2. Create WebSocket communication
3. Add peer-to-peer capabilities
4. Implement local network server

### **Phase 4: Synchronization (Week 7-8)**
1. Implement sync queue system
2. Add conflict resolution
3. Create sync monitoring
4. Add data validation

### **Phase 5: Role-Specific Features (Week 9-10)**
1. Implement admin dashboard
2. Create cashier interface
3. Build kitchen dashboard
4. Add role-based permissions

### **Phase 6: Testing & Optimization (Week 11-12)**
1. Comprehensive testing
2. Performance optimization
3. Security audit
4. Documentation

### **Phase 7: Deployment (Week 13)**
1. Production deployment
2. User training
3. Monitoring setup
4. Support documentation

---

## 📋 **Requirements Checklist**

### **Functional Requirements**
- [ ] Multi-role user management (Admin, Cashier, Kitchen)
- [ ] Real-time order processing
- [ ] Inventory management with stock tracking
- [ ] Menu management with ingredient dependencies
- [ ] Customer management and loyalty system
- [ ] Payment processing (Cash, GCash, Card)
- [ ] Employee time tracking
- [ ] Sales reporting and analytics
- [ ] Offline mode operation
- [ ] Local network communication
- [ ] Data synchronization
- [ ] Conflict resolution
- [ ] Backup and restore functionality

### **Non-Functional Requirements**
- [ ] High availability (99.9% uptime)
- [ ] Low latency (< 100ms response time)
- [ ] Scalability (support 100+ concurrent users)
- [ ] Security (encryption, authentication, authorization)
- [ ] Data integrity (ACID compliance)
- [ ] Backup and disaster recovery
- [ ] Monitoring and logging
- [ ] User-friendly interface
- [ ] Mobile responsiveness
- [ ] Cross-platform compatibility

### **Technical Requirements**
- [ ] Node.js 18+ runtime
- [ ] TypeScript 5.0+ support
- [ ] PostgreSQL database (Supabase)
- [ ] SQLite for local storage
- [ ] WebSocket communication
- [ ] RESTful API design
- [ ] JWT authentication
- [ ] Data encryption
- [ ] Real-time notifications
- [ ] Offline-first architecture
- [ ] Progressive Web App features
- [ ] Docker containerization

---

*This enhanced server plan provides a comprehensive foundation for building a robust, scalable restaurant management system with full offline capabilities and seamless online/offline transitions.*
