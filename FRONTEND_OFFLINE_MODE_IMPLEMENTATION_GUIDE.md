# 🚀 Frontend Offline Mode Implementation Guide

## 📋 **Overview**
This guide provides everything you need to implement offline mode in your React frontend for the restaurant management system.

## 🔧 **New API Endpoints**

### **1. Offline Payment Processing**
```typescript
// Process offline payment (Cash, GCash, Card)
POST /api/offline-payments/process
Headers: { Authorization: "Bearer <token>" }
Body: {
  orderId: string,
  paymentMethod: "cash" | "gcash" | "card",
  amount: number,
  notes?: string
}
Response: {
  success: boolean,
  data: {
    paymentId: string,
    receiptNumber: string,
    paymentMethod: string,
    amount: number,
    status: "paid",
    processedOffline: boolean
  }
}

// Get available offline payment methods
GET /api/offline-payments/methods
Headers: { Authorization: "Bearer <token>" }
Response: {
  success: boolean,
  data: [
    {
      method_key: "cash",
      method_name: "Cash",
      method_description: "Cash payment at the counter",
      icon_name: "cash",
      color_code: "#28a745",
      display_order: 1
    }
  ]
}

// Get payment history for an order
GET /api/offline-payments/order/:orderId/history
Headers: { Authorization: "Bearer <token>" }
Response: {
  success: boolean,
  data: [
    {
      id: string,
      payment_method: string,
      amount: number,
      payment_status: string,
      receipt_number: string,
      created_at: string
    }
  ]
}

// Generate receipt for offline payment
GET /api/offline-payments/receipt/:paymentId
Headers: { Authorization: "Bearer <token>" }
Response: {
  success: boolean,
  data: {
    receiptNumber: string,
    paymentId: string,
    orderId: string,
    paymentMethod: string,
    amount: number,
    currency: string,
    status: string,
    transactionId: string,
    processedAt: string,
    notes: string,
    processedOffline: boolean
  }
}
```

### **2. Offline Status & Sync Management**
```typescript
// Get offline system status
GET /health/offline
Response: {
  status: "healthy",
  offline: {
    isOnline: boolean,
    networkMode: {
      mode: "online" | "offline",
      cloudAvailable: boolean,
      localNetworkAvailable: boolean
    },
    pendingSyncCount: number,
    pendingConflictsCount: number,
    registeredDevicesCount: number,
    lastSyncTime?: string
  },
  sync: {
    inProgress: boolean,
    totalPending: number,
    totalFailed: number,
    totalConflicts: number,
    lastSyncTime?: string
  },
  database: {
    ready: boolean
  },
  timestamp: string
}

// Get sync status (requires auth)
GET /api/sync/status
Headers: { Authorization: "Bearer <token>" }
Response: {
  success: boolean,
  data: {
    totalPending: number,
    totalFailed: number,
    totalConflicts: number,
    lastSyncTime?: string,
    syncInProgress: boolean
  }
}

// Force sync
POST /api/sync/force-sync
Headers: { Authorization: "Bearer <token>" }
Response: {
  success: boolean,
  message: string
}

// Get pending conflicts
GET /api/sync/conflicts
Headers: { Authorization: "Bearer <token>" }
Response: {
  success: boolean,
  data: [
    {
      id: string,
      tableName: string,
      recordId: string,
      conflictType: string,
      localData: any,
      cloudData: any,
      resolution: "pending",
      createdAt: string
    }
  ]
}

// Resolve conflict
POST /api/sync/resolve-conflict
Headers: { Authorization: "Bearer <token>" }
Body: {
  conflictId: string,
  resolution: "local_wins" | "cloud_wins" | "manual_merge",
  resolvedBy: string
}
Response: {
  success: boolean,
  message: string
}
```

## 🎯 **Frontend Implementation**

### **1. Offline Status Hook**
```typescript
// hooks/useOfflineStatus.ts
import { useState, useEffect } from 'react';

interface OfflineStatus {
  isOnline: boolean;
  networkMode: {
    mode: 'online' | 'offline';
    cloudAvailable: boolean;
    localNetworkAvailable: boolean;
  };
  pendingSyncCount: number;
  pendingConflictsCount: number;
  registeredDevicesCount: number;
  lastSyncTime?: string;
}

export const useOfflineStatus = () => {
  const [status, setStatus] = useState<OfflineStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/health/offline');
      const data = await response.json();
      setStatus(data.offline);
    } catch (error) {
      console.error('Failed to fetch offline status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, []);

  return { status, loading, refetch: fetchStatus };
};
```

### **2. Offline Payment Service**
```typescript
// services/offlinePaymentService.ts
import { authService } from './authService';

interface PaymentMethod {
  method_key: string;
  method_name: string;
  method_description: string;
  icon_name: string;
  color_code: string;
  display_order: number;
}

interface ProcessPaymentRequest {
  orderId: string;
  paymentMethod: 'cash' | 'gcash' | 'card';
  amount: number;
  notes?: string;
}

interface ProcessPaymentResponse {
  paymentId: string;
  receiptNumber: string;
  paymentMethod: string;
  amount: number;
  status: string;
  processedOffline: boolean;
}

class OfflinePaymentService {
  private baseUrl = '/api/offline-payments';

  async getAvailableMethods(): Promise<PaymentMethod[]> {
    const token = authService.getToken();
    const response = await fetch(`${this.baseUrl}/methods`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch payment methods');
    }

    const data = await response.json();
    return data.data;
  }

  async processPayment(request: ProcessPaymentRequest): Promise<ProcessPaymentResponse> {
    const token = authService.getToken();
    const response = await fetch(`${this.baseUrl}/process`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to process payment');
    }

    const data = await response.json();
    return data.data;
  }

  async getPaymentHistory(orderId: string) {
    const token = authService.getToken();
    const response = await fetch(`${this.baseUrl}/order/${orderId}/history`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch payment history');
    }

    const data = await response.json();
    return data.data;
  }

  async generateReceipt(paymentId: string) {
    const token = authService.getToken();
    const response = await fetch(`${this.baseUrl}/receipt/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to generate receipt');
    }

    const data = await response.json();
    return data.data;
  }
}

export const offlinePaymentService = new OfflinePaymentService();
```

### **3. Offline Payment Component**
```typescript
// components/OfflinePaymentModal.tsx
import React, { useState, useEffect } from 'react';
import { offlinePaymentService } from '../services/offlinePaymentService';
import { useOfflineStatus } from '../hooks/useOfflineStatus';

interface OfflinePaymentModalProps {
  orderId: string;
  orderTotal: number;
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: (paymentData: any) => void;
}

export const OfflinePaymentModal: React.FC<OfflinePaymentModalProps> = ({
  orderId,
  orderTotal,
  isOpen,
  onClose,
  onPaymentSuccess
}) => {
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [amount, setAmount] = useState<number>(orderTotal);
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { status } = useOfflineStatus();

  useEffect(() => {
    if (isOpen) {
      loadPaymentMethods();
    }
  }, [isOpen]);

  const loadPaymentMethods = async () => {
    try {
      const methods = await offlinePaymentService.getAvailableMethods();
      setPaymentMethods(methods);
      if (methods.length > 0) {
        setSelectedMethod(methods[0].method_key);
      }
    } catch (error) {
      console.error('Failed to load payment methods:', error);
    }
  };

  const handlePayment = async () => {
    if (!selectedMethod) return;

    setLoading(true);
    try {
      const result = await offlinePaymentService.processPayment({
        orderId,
        paymentMethod: selectedMethod as 'cash' | 'gcash' | 'card',
        amount,
        notes
      });

      onPaymentSuccess(result);
      onClose();
    } catch (error) {
      console.error('Payment failed:', error);
      alert('Payment failed: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Process Offline Payment</h2>
        
        {/* Offline Status Indicator */}
        <div className={`mb-4 p-2 rounded ${status?.isOnline ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
          {status?.isOnline ? '🟢 Online Mode' : '🟡 Offline Mode'}
        </div>

        {/* Payment Method Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Payment Method</label>
          <div className="space-y-2">
            {paymentMethods.map((method) => (
              <label key={method.method_key} className="flex items-center">
                <input
                  type="radio"
                  name="paymentMethod"
                  value={method.method_key}
                  checked={selectedMethod === method.method_key}
                  onChange={(e) => setSelectedMethod(e.target.value)}
                  className="mr-2"
                />
                <span 
                  className="inline-block w-4 h-4 rounded mr-2"
                  style={{ backgroundColor: method.color_code }}
                ></span>
                {method.method_name}
              </label>
            ))}
          </div>
        </div>

        {/* Amount Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Amount (PHP)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            className="w-full p-2 border rounded"
            step="0.01"
            min="0"
          />
        </div>

        {/* Notes */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Notes (Optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full p-2 border rounded"
            rows={3}
            placeholder="Additional notes..."
          />
        </div>

        {/* Actions */}
        <div className="flex space-x-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handlePayment}
            disabled={loading || !selectedMethod}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Process Payment'}
          </button>
        </div>
      </div>
    </div>
  );
};
```

### **4. Offline Status Indicator Component**
```typescript
// components/OfflineStatusIndicator.tsx
import React from 'react';
import { useOfflineStatus } from '../hooks/useOfflineStatus';

export const OfflineStatusIndicator: React.FC = () => {
  const { status, loading } = useOfflineStatus();

  if (loading) {
    return (
      <div className="flex items-center text-gray-500">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500 mr-2"></div>
        Checking status...
      </div>
    );
  }

  if (!status) {
    return (
      <div className="flex items-center text-red-600">
        <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
        Status Unknown
      </div>
    );
  }

  const isOnline = status.isOnline;
  const pendingSync = status.pendingSyncCount;
  const pendingConflicts = status.pendingConflictsCount;

  return (
    <div className="flex items-center space-x-4">
      {/* Connection Status */}
      <div className={`flex items-center ${isOnline ? 'text-green-600' : 'text-yellow-600'}`}>
        <div className={`w-3 h-3 rounded-full mr-2 ${isOnline ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
        {isOnline ? 'Online' : 'Offline'}
      </div>

      {/* Sync Status */}
      {pendingSync > 0 && (
        <div className="flex items-center text-blue-600">
          <div className="w-3 h-3 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
          {pendingSync} pending sync
        </div>
      )}

      {/* Conflicts */}
      {pendingConflicts > 0 && (
        <div className="flex items-center text-red-600">
          <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
          {pendingConflicts} conflicts
        </div>
      )}
    </div>
  );
};
```

### **5. Enhanced Order Component with Offline Payments**
```typescript
// components/OrderCard.tsx (Updated)
import React, { useState } from 'react';
import { OfflinePaymentModal } from './OfflinePaymentModal';
import { offlinePaymentService } from '../services/offlinePaymentService';

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  total_amount: number;
  payment_status: string;
  order_type: string;
  created_at: string;
}

interface OrderCardProps {
  order: Order;
  onOrderUpdate: () => void;
}

export const OrderCard: React.FC<OrderCardProps> = ({ order, onOrderUpdate }) => {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);

  const handlePaymentSuccess = async (paymentData: any) => {
    // Generate receipt
    try {
      const receipt = await offlinePaymentService.generateReceipt(paymentData.paymentId);
      console.log('Receipt generated:', receipt);
      
      // Show success message
      alert(`Payment processed successfully!\nReceipt: ${receipt.receiptNumber}`);
      
      // Refresh order data
      onOrderUpdate();
    } catch (error) {
      console.error('Failed to generate receipt:', error);
    }
  };

  const loadPaymentHistory = async () => {
    try {
      const history = await offlinePaymentService.getPaymentHistory(order.id);
      setPaymentHistory(history);
    } catch (error) {
      console.error('Failed to load payment history:', error);
    }
  };

  return (
    <div className="border rounded-lg p-4 mb-4">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-semibold">Order #{order.order_number}</h3>
          <p className="text-gray-600">{order.customer_name}</p>
        </div>
        <div className="text-right">
          <p className="font-semibold">PHP {order.total_amount.toFixed(2)}</p>
          <span className={`px-2 py-1 rounded text-xs ${
            order.payment_status === 'paid' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {order.payment_status}
          </span>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-500">
          {order.order_type} • {new Date(order.created_at).toLocaleString()}
        </div>
        
        <div className="space-x-2">
          {order.payment_status !== 'paid' && (
            <button
              onClick={() => setShowPaymentModal(true)}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            >
              Process Payment
            </button>
          )}
          
          <button
            onClick={loadPaymentHistory}
            className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
          >
            Payment History
          </button>
        </div>
      </div>

      {/* Payment History Display */}
      {paymentHistory.length > 0 && (
        <div className="mt-3 pt-3 border-t">
          <h4 className="font-medium mb-2">Payment History:</h4>
          {paymentHistory.map((payment) => (
            <div key={payment.id} className="flex justify-between text-sm">
              <span>{payment.payment_method} - {payment.receipt_number}</span>
              <span>PHP {payment.amount.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      <OfflinePaymentModal
        orderId={order.id}
        orderTotal={order.total_amount}
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
};
```

### **6. Sync Management Component**
```typescript
// components/SyncManager.tsx
import React, { useState, useEffect } from 'react';
import { authService } from '../services/authService';

interface SyncStatus {
  totalPending: number;
  totalFailed: number;
  totalConflicts: number;
  lastSyncTime?: string;
  syncInProgress: boolean;
}

export const SyncManager: React.FC = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSyncStatus = async () => {
    try {
      const token = authService.getToken();
      const response = await fetch('/api/sync/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSyncStatus(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch sync status:', error);
    }
  };

  const forceSync = async () => {
    setLoading(true);
    try {
      const token = authService.getToken();
      const response = await fetch('/api/sync/force-sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        fetchSyncStatus(); // Refresh status
      }
    } catch (error) {
      console.error('Failed to force sync:', error);
      alert('Failed to force sync');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSyncStatus();
    const interval = setInterval(fetchSyncStatus, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (!syncStatus) {
    return <div>Loading sync status...</div>;
  }

  return (
    <div className="bg-white rounded-lg p-4 shadow">
      <h3 className="text-lg font-semibold mb-4">Sync Status</h3>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{syncStatus.totalPending}</div>
          <div className="text-sm text-gray-600">Pending</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{syncStatus.totalFailed}</div>
          <div className="text-sm text-gray-600">Failed</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-600">{syncStatus.totalConflicts}</div>
          <div className="text-sm text-gray-600">Conflicts</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {syncStatus.syncInProgress ? '🔄' : '✅'}
          </div>
          <div className="text-sm text-gray-600">Status</div>
        </div>
      </div>

      {syncStatus.lastSyncTime && (
        <div className="text-sm text-gray-600 mb-4">
          Last sync: {new Date(syncStatus.lastSyncTime).toLocaleString()}
        </div>
      )}

      <button
        onClick={forceSync}
        disabled={loading}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Syncing...' : 'Force Sync Now'}
      </button>
    </div>
  );
};
```

## 🎨 **UI/UX Enhancements**

### **1. Offline Mode Styling**
```css
/* Add to your CSS */
.offline-mode {
  border: 2px solid #f59e0b;
  background-color: #fef3c7;
}

.online-mode {
  border: 2px solid #10b981;
  background-color: #d1fae5;
}

.sync-pending {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

### **2. Toast Notifications**
```typescript
// utils/toast.ts
export const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
  // Implement your toast notification system
  console.log(`${type.toUpperCase()}: ${message}`);
};
```

## 📱 **Mobile Responsiveness**
- Ensure payment modal works on mobile devices
- Make offline status indicator touch-friendly
- Optimize sync manager for mobile screens

## 🔒 **Error Handling**
- Handle network failures gracefully
- Show appropriate messages for offline mode
- Implement retry mechanisms for failed operations

## 🧪 **Testing**
- Test offline payment processing
- Verify sync status updates
- Test conflict resolution
- Ensure proper error handling

This implementation provides a complete offline-capable frontend for your restaurant management system! 🎉
