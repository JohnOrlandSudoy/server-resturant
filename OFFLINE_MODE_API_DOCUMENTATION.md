# 🚀 Offline Mode API Documentation

## Overview
This document provides comprehensive documentation for all offline mode endpoints, testing samples, and implementation details for the Restaurant Management System.

## 📋 Table of Contents
- [New Endpoints](#new-endpoints)
- [Modified Endpoints](#modified-endpoints)
- [Testing Samples](#testing-samples)
- [Implementation Guide](#implementation-guide)
- [Database Schema Changes](#database-schema-changes)
- [Authentication Changes](#authentication-changes)

---

## 🆕 New Endpoints

### 1. Offline Payment Routes (`/api/offline-payments`)

#### Process Offline Payment
```http
POST /api/offline-payments/process
Authorization: Bearer <token>
Content-Type: application/json

{
  "orderId": "uuid",
  "paymentMethod": "cash|gcash|card",
  "amount": 150.00,
  "notes": "Optional payment notes"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Offline payment processed successfully",
  "data": {
    "paymentId": "uuid",
    "receiptNumber": "RCP-2024-001",
    "amount": 150.00,
    "paymentMethod": "cash",
    "status": "paid",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

#### Get Available Payment Methods
```http
GET /api/offline-payments/methods
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "methodKey": "cash",
      "methodName": "Cash",
      "methodDescription": "Cash payment",
      "isEnabled": true,
      "isOnline": false,
      "displayOrder": 1,
      "iconName": "cash",
      "colorCode": "#28a745"
    },
    {
      "id": "uuid",
      "methodKey": "gcash",
      "methodName": "GCash",
      "methodDescription": "GCash mobile payment",
      "isEnabled": true,
      "isOnline": false,
      "displayOrder": 2,
      "iconName": "mobile",
      "colorCode": "#007bff"
    }
  ]
}
```

#### Get Payment History for Order
```http
GET /api/offline-payments/order/{orderId}/history
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "orderId": "uuid",
      "paymentMethod": "cash",
      "amount": 150.00,
      "currency": "PHP",
      "paymentStatus": "paid",
      "receiptNumber": "RCP-2024-001",
      "notes": "Payment notes",
      "createdAt": "2024-01-15T10:30:00Z",
      "createdBy": "user_id"
    }
  ]
}
```

#### Generate Receipt
```http
GET /api/offline-payments/receipt/{paymentId}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "receiptNumber": "RCP-2024-001",
    "orderId": "uuid",
    "paymentMethod": "cash",
    "amount": 150.00,
    "currency": "PHP",
    "processedBy": "John Doe",
    "processedAt": "2024-01-15T10:30:00Z",
    "notes": "Payment notes"
  }
}
```

#### Sync Payment Methods from Cloud
```http
POST /api/offline-payments/sync-methods
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Payment methods synced successfully"
}
```

### 2. Sync Management Routes (`/api/sync`)

#### Get Offline Status
```http
GET /api/sync/offline-status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isOnline": true,
    "networkMode": {
      "mode": "online",
      "lastChecked": "2024-01-15T10:30:00Z"
    },
    "pendingSyncCount": 5,
    "databaseReady": true,
    "lastSyncTime": "2024-01-15T10:25:00Z"
  }
}
```

#### Get Sync Status
```http
GET /api/sync/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalItems": 25,
    "pendingItems": 5,
    "syncedItems": 20,
    "failedItems": 0,
    "lastSyncTime": "2024-01-15T10:25:00Z",
    "networkMode": {
      "mode": "online"
    },
    "isOnline": true
  }
}
```

#### Force Sync
```http
POST /api/sync/force-sync
```

**Response:**
```json
{
  "success": true,
  "message": "Force sync completed",
  "data": {
    "syncedCount": 5,
    "failedCount": 0,
    "duration": "2.5s"
  }
}
```

#### Get Sync Queue
```http
GET /api/sync/queue
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "tableName": "orders",
      "operation": "INSERT",
      "recordData": {...},
      "status": "pending",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### Get Pending Conflicts
```http
GET /api/sync/conflicts
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "tableName": "orders",
      "recordId": "uuid",
      "localData": {...},
      "cloudData": {...},
      "conflictType": "data_mismatch",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### Resolve Conflict
```http
POST /api/sync/resolve-conflict
Content-Type: application/json

{
  "conflictId": "uuid",
  "resolution": "use_local|use_cloud|merge",
  "resolvedBy": "user_id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Conflict resolved successfully"
}
```

#### Clear Failed Sync Items
```http
DELETE /api/sync/failed-items
```

**Response:**
```json
{
  "success": true,
  "message": "Cleared 3 failed sync items",
  "data": {
    "clearedCount": 3
  }
}
```

#### Retry Failed Sync Items
```http
POST /api/sync/retry-failed
```

**Response:**
```json
{
  "success": true,
  "message": "Failed items reset for retry"
}
```

#### Force Online Check
```http
POST /api/sync/check-online
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isOnline": true
  },
  "message": "Online"
}
```

#### Get Registered Devices
```http
GET /api/sync/devices
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "deviceId": "device_123",
      "deviceName": "POS Terminal 1",
      "deviceType": "pos",
      "lastSeen": "2024-01-15T10:30:00Z",
      "isActive": true
    }
  ]
}
```

#### Register Device
```http
POST /api/sync/register-device
Content-Type: application/json

{
  "deviceInfo": {
    "deviceId": "device_123",
    "deviceName": "POS Terminal 1",
    "deviceType": "pos",
    "os": "Windows 10",
    "version": "1.0.0"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Device registered successfully"
}
```

#### Clear Legacy Sync Items
```http
POST /api/sync/clear-legacy
```

**Response:**
```json
{
  "success": true,
  "message": "Cleared 2 legacy sync items",
  "data": {
    "clearedCount": 2
  }
}
```

### 3. Health Check Endpoint

#### Offline Mode Health Check
```http
GET /health/offline
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "offline": {
    "isOnline": true,
    "networkMode": {
      "mode": "online",
      "lastChecked": "2024-01-15T10:30:00Z"
    },
    "pendingSyncCount": 5
  },
  "database": {
    "ready": true,
    "path": "./data/local.db",
    "tables": 12
  }
}
```

---

## 🔄 Modified Endpoints

### 1. Authentication Routes (`/api/auth`)

#### Login (Enhanced for Offline)
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

**Response (Enhanced):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "jwt_token",
    "user": {
      "id": "uuid",
      "username": "admin",
      "email": "admin@restaurant.com",
      "role": "admin",
      "firstName": "Admin",
      "lastName": "User"
    }
  }
}
```

**Note:** User data is now automatically synced to local database for offline access.

#### Register (Enhanced for Offline)
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "cashier",
  "password": "cashier123",
  "email": "cashier@restaurant.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "cashier"
}
```

**Response (Enhanced):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid",
      "username": "cashier",
      "email": "cashier@restaurant.com",
      "role": "cashier",
      "firstName": "John",
      "lastName": "Doe"
    }
  }
}
```

**Note:** User data is now automatically synced to local database for offline access.

---

## 🧪 Testing Samples

### 1. Complete Test Suite

Run the comprehensive test suite:
```bash
# Create test users first
node create-test-users.js

# Run comprehensive offline mode tests
node test-offline-mode-complete.js
```

### 2. Individual Endpoint Testing

#### Test Offline Payment Processing
```javascript
const axios = require('axios');

async function testOfflinePayment() {
  const BASE_URL = 'http://localhost:3000';
  
  // Login first
  const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
    username: 'admin',
    password: 'admin123'
  });
  
  const token = loginResponse.data.data.token;
  
  // Create an order
  const orderResponse = await axios.post(`${BASE_URL}/api/orders`, {
    customer_name: 'Test Customer',
    customer_phone: '09123456789',
    order_type: 'dine_in',
    table_number: 'A1'
  }, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  const orderId = orderResponse.data.data.id;
  
  // Process offline payment
  const paymentResponse = await axios.post(`${BASE_URL}/api/offline-payments/process`, {
    orderId: orderId,
    paymentMethod: 'cash',
    amount: 150.00,
    notes: 'Test payment'
  }, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  console.log('Payment processed:', paymentResponse.data);
}

testOfflinePayment().catch(console.error);
```

#### Test Sync Status
```javascript
async function testSyncStatus() {
  const BASE_URL = 'http://localhost:3000';
  
  // Get offline status
  const offlineStatus = await axios.get(`${BASE_URL}/api/sync/offline-status`);
  console.log('Offline Status:', offlineStatus.data);
  
  // Get sync status
  const syncStatus = await axios.get(`${BASE_URL}/api/sync/status`);
  console.log('Sync Status:', syncStatus.data);
  
  // Force sync
  const forceSync = await axios.post(`${BASE_URL}/api/sync/force-sync`);
  console.log('Force Sync Result:', forceSync.data);
}

testSyncStatus().catch(console.error);
```

#### Test Payment Methods
```javascript
async function testPaymentMethods() {
  const BASE_URL = 'http://localhost:3000';
  
  // Login
  const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
    username: 'admin',
    password: 'admin123'
  });
  
  const token = loginResponse.data.data.token;
  
  // Get available payment methods
  const methods = await axios.get(`${BASE_URL}/api/offline-payments/methods`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  console.log('Available Payment Methods:', methods.data);
  
  // Sync payment methods from cloud
  const syncMethods = await axios.post(`${BASE_URL}/api/offline-payments/sync-methods`, {}, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  console.log('Sync Methods Result:', syncMethods.data);
}

testPaymentMethods().catch(console.error);
```

### 3. cURL Testing Examples

#### Test Offline Status
```bash
curl -X GET http://localhost:3000/api/sync/offline-status
```

#### Test Force Sync
```bash
curl -X POST http://localhost:3000/api/sync/force-sync
```

#### Test Offline Payment (with authentication)
```bash
# First login to get token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | \
  jq -r '.data.token')

# Process offline payment
curl -X POST http://localhost:3000/api/offline-payments/process \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "order-uuid",
    "paymentMethod": "cash",
    "amount": 150.00,
    "notes": "Test payment"
  }'
```

---

## 🏗️ Implementation Guide

### 1. Database Setup

#### Run Migration Script
```bash
# Apply the safe payments migration to Supabase
psql -h your-supabase-host -U postgres -d postgres -f safe-payments-migration.sql
```

#### Local Database Initialization
The local SQLite database is automatically initialized when the server starts. Tables created include:
- `user_profiles` - Local user data for offline authentication
- `payment_methods_config` - Available payment methods
- `offline_payments` - Offline payment records
- `sync_queue` - Items pending synchronization
- `device_registry` - Registered devices
- `data_conflicts` - Sync conflicts
- `sync_status` - Sync statistics

### 2. Environment Variables

Add these to your `.env` file:
```env
# Offline Mode Configuration
LOCAL_DB_PATH=./data/local.db
SYNC_INTERVAL=30000
OFFLINE_TIMEOUT=5000
MAX_RETRY_ATTEMPTS=3
CONFLICT_RESOLUTION_STRATEGY=use_local

# Existing variables...
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
JWT_SECRET=your_jwt_secret
```

### 3. Service Initialization

The offline services are automatically initialized in `src/app.ts`:

```typescript
// Initialize offline services
const databaseService = DatabaseService.getInstance();
const offlineService = new OfflineService();
const syncManager = new SyncManager();

// Start sync process after database is ready
setTimeout(async () => {
  if (databaseService.isReady()) {
    syncManager.startSyncProcess();
    await offlinePaymentService.syncPaymentMethodsFromCloud();
  }
}, 3000);
```

---

## 🗄️ Database Schema Changes

### New Tables

#### 1. `offline_payments` (Supabase)
```sql
CREATE TABLE public.offline_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  payment_method VARCHAR(50) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'PHP',
  payment_status VARCHAR(20) NOT NULL DEFAULT 'paid',
  transaction_id VARCHAR(255),
  receipt_number VARCHAR(50),
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 2. `payment_methods_config` (Supabase)
```sql
CREATE TABLE public.payment_methods_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  method_key VARCHAR(50) NOT NULL UNIQUE,
  method_name VARCHAR(100) NOT NULL,
  method_description TEXT,
  is_enabled BOOLEAN DEFAULT true,
  is_online BOOLEAN DEFAULT false,
  requires_setup BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  icon_name VARCHAR(50),
  color_code VARCHAR(7),
  config_data JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.user_profiles(id),
  updated_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Local SQLite Tables

The following tables are created in the local SQLite database:
- `user_profiles` - Mirrors Supabase user data
- `payment_methods_config` - Mirrors Supabase payment methods
- `offline_payments` - Local payment records
- `sync_queue` - Items pending sync
- `device_registry` - Device information
- `data_conflicts` - Sync conflicts
- `sync_status` - Sync statistics

---

## 🔐 Authentication Changes

### Enhanced Auth Middleware

The authentication middleware now supports offline mode:

```typescript
// In src/middleware/authMiddleware.ts
export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // ... token verification ...
  
  try {
    const decoded = jwtService.verifyToken(token);
    let userResponse;

    if (offlineService.getIsOnline()) {
      try {
        // Try Supabase first
        userResponse = await supabaseService().getUserById(decoded.id);
      } catch (error) {
        // Fallback to local database
        userResponse = await getOfflineUser(decoded.id);
      }
    } else {
      // Use local database when offline
      userResponse = await getOfflineUser(decoded.id);
    }
    
    // ... continue with authentication ...
  } catch (error) {
    // ... error handling ...
  }
};
```

### Offline User Management

Users are automatically synced to local database on login/register:

```typescript
// In src/routes/authRoutes.ts
router.post('/login', async (req: Request, res: Response) => {
  // ... existing login logic ...
  
  // Sync user to local database for offline access
  try {
    await databaseService.syncUserToLocal(user);
    logger.info(`User ${username} synced to local database`);
  } catch (error) {
    logger.warn(`Failed to sync user ${username} to local database:`, error);
  }
  
  // ... response ...
});
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install better-sqlite3 node-cron
```

### 2. Run Migration
```bash
# Apply database migration
psql -f safe-payments-migration.sql
```

### 3. Start Server
```bash
npm run dev
```

### 4. Test Offline Mode
```bash
# Create test users
node create-test-users.js

# Run comprehensive tests
node test-offline-mode-complete.js
```

### 5. Monitor Sync Status
```bash
# Check offline status
curl http://localhost:3000/api/sync/offline-status

# Check sync queue
curl http://localhost:3000/api/sync/queue
```

---

## 📊 Monitoring and Debugging

### Health Check Endpoints
- `GET /health/offline` - Overall offline mode health
- `GET /api/sync/status` - Detailed sync statistics
- `GET /api/sync/offline-status` - Network and database status

### Log Files
- `logs/combined.log` - All application logs
- `logs/error.log` - Error logs only

### Debug Commands
```bash
# Clear legacy sync items
curl -X POST http://localhost:3000/api/sync/clear-legacy

# Force online check
curl -X POST http://localhost:3000/api/sync/check-online

# Retry failed sync items
curl -X POST http://localhost:3000/api/sync/retry-failed
```

---

## 🎯 Role-Based Features

### Admin Features
- ✅ Full offline mode control
- ✅ Sync management
- ✅ Payment method configuration
- ✅ Device management
- ✅ Conflict resolution
- ✅ System monitoring

### Cashier Features
- ✅ Offline order creation
- ✅ Offline payment processing
- ✅ Receipt generation
- ✅ Payment history viewing
- ✅ Menu access

### Kitchen Features
- ✅ Offline order viewing
- ✅ Status updates
- ✅ Order history
- ✅ Menu and ingredient access

---

## 🔧 Troubleshooting

### Common Issues

1. **Sync Errors**: Check sync queue and clear failed items
2. **Authentication Issues**: Verify user sync to local database
3. **Payment Processing**: Ensure payment methods are synced
4. **Database Issues**: Check local database initialization

### Debug Steps

1. Check offline status: `GET /api/sync/offline-status`
2. Review sync queue: `GET /api/sync/queue`
3. Check conflicts: `GET /api/sync/conflicts`
4. Review logs: `tail -f logs/combined.log`

---

## 📈 Performance Considerations

- Local SQLite database provides fast offline access
- Background sync prevents blocking operations
- Conflict resolution maintains data integrity
- Device registration enables multi-device sync
- Retry mechanisms handle network interruptions

---

## 🔒 Security Features

- JWT tokens work offline with local user validation
- Row Level Security (RLS) policies maintained
- Device registration for authorized access
- Conflict resolution with audit trails
- Secure payment processing with receipts

---

*This documentation covers all offline mode endpoints and implementation details. For additional support, refer to the individual service files in the `src/services/` directory.*
