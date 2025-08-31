 // User types
export type UserRole = 'admin' | 'cashier' | 'kitchen' | 'inventory_manager';

export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phone?: string;
  avatarUrl?: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

// Database User interface (matches snake_case column names)
export interface DatabaseUser {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  phone?: string;
  avatar_url?: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthRequest {
  username: string;
  password: string;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: User;
  error?: string;
}

// Order types
export type OrderType = 'dine_in' | 'takeout' | 'delivery';
export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
export type OrderPriority = 'low' | 'medium' | 'high' | 'urgent';
export type PaymentMethod = 'cash' | 'gcash' | 'card' | 'bank_transfer';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface Order {
  id: string;
  orderNumber: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  orderType: OrderType;
  status: OrderStatus;
  priority: OrderPriority;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  tableNumber?: number;
  specialInstructions?: string;
  estimatedReadyTime?: string;
  actualReadyTime?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
}

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  customizations: any[];
  addons: any[];
  specialInstructions?: string;
  status: OrderStatus;
  preparedBy?: string;
  preparedAt?: string;
  createdAt: string;
}

// Menu types
export interface MenuCategory {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  categoryId: string;
  imageUrl?: string;
  prepTime: number;
  isAvailable: boolean;
  isFeatured: boolean;
  popularity: number;
  calories?: number;
  allergens?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  ingredients: MenuItemIngredient[];
}

export interface MenuItemIngredient {
  id: string;
  menuItemId: string;
  ingredientId: string;
  quantity: number;
  unit: string;
  isOptional: boolean;
  createdAt: string;
}

// Inventory types
export type StockStatus = 'sufficient' | 'low' | 'out' | 'expired';
export type TransactionType = 'in' | 'out' | 'adjustment' | 'spoilage' | 'transfer';

export interface Ingredient {
  id: string;
  name: string;
  description?: string;
  currentStock: number;
  minStock: number;
  maxStock?: number;
  unit: string;
  costPerUnit?: number;
  supplier?: string;
  category?: string;
  expiryDate?: string;
  stockStatus: StockStatus;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryTransaction {
  id: string;
  ingredientId: string;
  transactionType: TransactionType;
  quantity: number;
  unit: string;
  reason?: string;
  referenceId?: string;
  referenceType?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

// Customer types
export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  loyaltyPoints: number;
  totalOrders: number;
  totalSpent: number;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Employee types
export interface EmployeeTimeLog {
  id: string;
  employeeId: string;
  date: string;
  timeIn?: string;
  timeOut?: string;
  totalHours?: number;
  breakDuration: number;
  status: 'active' | 'ended' | 'interrupted';
  notes?: string;
  createdAt: string;
}

// Sync types
export type SyncStatus = 'pending' | 'syncing' | 'completed' | 'failed' | 'conflict';
export type DeviceSyncStatus = 'synced' | 'pending' | 'conflict' | 'offline';
export type SessionStatus = 'active' | 'ended' | 'interrupted';
export type ConflictType = 'update_conflict' | 'delete_conflict' | 'merge_conflict';
export type ResolutionType = 'pending' | 'local_wins' | 'cloud_wins' | 'manual_merge';

export interface SyncQueueItem {
  id: string;
  tableName: string;
  operationType: 'INSERT' | 'UPDATE' | 'DELETE';
  recordId?: string;
  recordData: any;
  localTimestamp: string;
  syncStatus: SyncStatus;
  retryCount: number;
  errorMessage?: string;
  createdBy: string;
  createdAt: string;
}

export interface DeviceInfo {
  id: string;
  deviceId: string;
  deviceName: string;
  deviceType: UserRole;
  userId: string;
  ipAddress?: string;
  macAddress?: string;
  lastSeen: string;
  isOnline: boolean;
  syncStatus: DeviceSyncStatus;
  lastSyncAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NetworkSession {
  id: string;
  sessionId: string;
  adminDeviceId: string;
  startTime: string;
  endTime?: string;
  status: SessionStatus;
  connectedDevices: any[];
  syncSummary: any;
  createdAt: string;
}

export interface DataConflict {
  id: string;
  tableName: string;
  recordId: string;
  conflictType: ConflictType;
  localData?: any;
  cloudData?: any;
  resolution: ResolutionType;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: string[];
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Request types
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SearchQuery extends PaginationQuery {
  search?: string;
  filter?: Record<string, any>;
}

// WebSocket types
export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: string;
  userId?: string;
}

export interface OrderStatusUpdate {
  orderId: string;
  status: OrderStatus;
  updatedBy: string;
  timestamp: string;
}

export interface InventoryUpdate {
  ingredientId: string;
  quantity: number;
  operation: 'add' | 'subtract' | 'set';
  updatedBy: string;
  timestamp: string;
}

// Offline storage types
export interface OfflineData {
  orders: Order[];
  menuItems: MenuItem[];
  ingredients: Ingredient[];
  customers: Customer[];
  syncQueue: SyncQueueItem[];
}

export interface SaveResult {
  success: boolean;
  syncStatus: 'synced' | 'pending' | 'failed';
  data: any;
  error?: string;
}

// Network types
export interface NetworkMode {
  mode: 'online' | 'offline' | 'hybrid';
  cloudAvailable: boolean;
  localNetworkAvailable: boolean;
  adminDeviceUrl?: string;
}

export interface DeviceDiscoveryResult {
  ip: string;
  deviceInfo: DeviceInfo;
  responseTime: number;
  isOnline: boolean;
}
