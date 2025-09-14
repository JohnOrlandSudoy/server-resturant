# 💳 Payment Methods Admin Configuration System

## 🎯 **Overview**

This system allows admins to control which payment methods are available to customers through toggle buttons. Payment methods can be enabled/disabled, configured, and managed through dedicated admin endpoints.

## 🗄️ **Database Setup Required**

### **Step 1: Run SQL Script**
Execute the `payment-methods-config.sql` file in your Supabase SQL editor:

```sql
-- This creates the payment_methods_config table with default payment methods
-- Run this in your Supabase SQL editor
```

### **Step 2: Default Payment Methods**
The script automatically creates these payment methods:

| Method Key | Name | Type | Default Status |
|------------|------|------|----------------|
| `cash` | Cash | Offline | ✅ Enabled |
| `gcash` | GCash | Offline | ✅ Enabled |
| `card` | Credit/Debit Card | Offline | ✅ Enabled |
| `paymongo` | PayMongo (Online) | Online | ✅ Enabled |
| `qrph` | QR Ph | Online | ✅ Enabled |

## 🔧 **Admin API Endpoints**

### **1. Get All Payment Methods (Admin Only)**
```http
GET /api/payments/admin/methods
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "method_key": "cash",
      "method_name": "Cash",
      "method_description": "Traditional cash payment",
      "is_enabled": true,
      "is_online": false,
      "requires_setup": false,
      "display_order": 1,
      "icon_name": "cash",
      "color_code": "#28a745",
      "config_data": {},
      "is_active": true,
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-01-15T10:00:00Z"
    }
  ]
}
```

### **2. Toggle Payment Method (Admin Only)**
```http
PUT /api/payments/admin/methods/:methodKey/toggle
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "is_enabled": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment method paymongo disabled successfully",
  "data": {
    "method_key": "paymongo",
    "method_name": "PayMongo (Online)",
    "is_enabled": false,
    "updated_at": "2024-01-15T10:30:00Z"
  }
}
```

### **3. Update Payment Method (Admin Only)**
```http
PUT /api/payments/admin/methods/:methodKey
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "method_name": "PayMongo Online Payment",
  "method_description": "Secure online payment via PayMongo",
  "is_enabled": true,
  "display_order": 4,
  "icon_name": "paymongo",
  "color_code": "#ff6b35",
  "config_data": {
    "api_key_configured": true,
    "webhook_url": "https://yourdomain.com/api/payments/webhook"
  }
}
```

### **4. Create New Payment Method (Admin Only)**
```http
POST /api/payments/admin/methods
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "method_key": "grab_pay",
  "method_name": "GrabPay",
  "method_description": "GrabPay mobile wallet",
  "is_enabled": true,
  "is_online": true,
  "requires_setup": true,
  "display_order": 6,
  "icon_name": "grab",
  "color_code": "#00b14f"
}
```

### **5. Delete Payment Method (Admin Only)**
```http
DELETE /api/payments/admin/methods/:methodKey
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "success": true,
  "message": "Payment method deleted successfully",
  "data": {
    "method_key": "grab_pay",
    "method_name": "GrabPay",
    "is_active": false,
    "deleted_at": "2024-01-15T10:45:00Z"
  }
}
```

## 🌐 **Public API Endpoint**

### **Get Available Payment Methods (Public)**
```http
GET /api/payments/methods/available
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "method_key": "cash",
      "method_name": "Cash",
      "method_description": "Traditional cash payment",
      "is_online": false,
      "display_order": 1,
      "icon_name": "cash",
      "color_code": "#28a745"
    },
    {
      "method_key": "gcash",
      "method_name": "GCash",
      "method_description": "GCash mobile wallet payment",
      "is_online": false,
      "display_order": 2,
      "icon_name": "gcash",
      "color_code": "#007bff"
    }
  ]
}
```

## 🎛️ **Frontend Integration**

### **Admin Dashboard Toggle Buttons**

```javascript
// Example React component for admin payment methods toggle
const PaymentMethodsAdmin = () => {
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch all payment methods
  const fetchPaymentMethods = async () => {
    const response = await fetch('/api/payments/admin/methods', {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    const data = await response.json();
    setPaymentMethods(data.data);
  };

  // Toggle payment method
  const togglePaymentMethod = async (methodKey, isEnabled) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/payments/admin/methods/${methodKey}/toggle`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ is_enabled: isEnabled })
      });
      
      if (response.ok) {
        await fetchPaymentMethods(); // Refresh list
        showNotification(`Payment method ${isEnabled ? 'enabled' : 'disabled'}`);
      }
    } catch (error) {
      showError('Failed to update payment method');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="payment-methods-admin">
      <h2>Payment Methods Configuration</h2>
      {paymentMethods.map(method => (
        <div key={method.method_key} className="payment-method-card">
          <div className="method-info">
            <h3>{method.method_name}</h3>
            <p>{method.method_description}</p>
            <span className={`badge ${method.is_online ? 'online' : 'offline'}`}>
              {method.is_online ? 'Online' : 'Offline'}
            </span>
          </div>
          <div className="method-controls">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={method.is_enabled}
                onChange={(e) => togglePaymentMethod(method.method_key, e.target.checked)}
                disabled={loading}
              />
              <span className="slider"></span>
            </label>
            <span className="status">
              {method.is_enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};
```

### **Customer Payment Selection**

```javascript
// Example customer payment method selection
const PaymentMethodSelector = () => {
  const [availableMethods, setAvailableMethods] = useState([]);

  // Fetch available payment methods
  useEffect(() => {
    const fetchAvailableMethods = async () => {
      const response = await fetch('/api/payments/methods/available');
      const data = await response.json();
      setAvailableMethods(data.data);
    };
    fetchAvailableMethods();
  }, []);

  return (
    <div className="payment-method-selector">
      <h3>Select Payment Method</h3>
      {availableMethods.map(method => (
        <div key={method.method_key} className="payment-option">
          <input
            type="radio"
            id={method.method_key}
            name="payment_method"
            value={method.method_key}
          />
          <label htmlFor={method.method_key}>
            <i className={`icon-${method.icon_name}`} style={{ color: method.color_code }}></i>
            <span>{method.method_name}</span>
            <small>{method.method_description}</small>
          </label>
        </div>
      ))}
    </div>
  );
};
```

## 🎯 **Use Cases**

### **1. Disable PayMongo Temporarily**
```bash
# Disable PayMongo for maintenance
PUT /api/payments/admin/methods/paymongo/toggle
{
  "is_enabled": false
}
```

### **2. Enable New Payment Method**
```bash
# Add and enable GrabPay
POST /api/payments/admin/methods
{
  "method_key": "grab_pay",
  "method_name": "GrabPay",
  "method_description": "GrabPay mobile wallet",
  "is_enabled": true,
  "is_online": true,
  "display_order": 6
}
```

### **3. Reorder Payment Methods**
```bash
# Update display order
PUT /api/payments/admin/methods/cash
{
  "display_order": 1
}

PUT /api/payments/admin/methods/gcash
{
  "display_order": 2
}
```

## 🔒 **Security Features**

### **Row Level Security (RLS)**
- ✅ **Public Access**: Can only view enabled payment methods
- ✅ **Admin Access**: Can view, create, update, delete all methods
- ✅ **User Tracking**: All changes logged with user ID
- ✅ **Soft Delete**: Methods are deactivated, not permanently deleted

### **Validation**
- ✅ **Method Key Validation**: Only predefined methods allowed
- ✅ **Admin Only**: All admin endpoints require admin role
- ✅ **Input Validation**: All inputs validated and sanitized

## 📊 **Database Schema**

### **payment_methods_config Table**
```sql
CREATE TABLE payment_methods_config (
  id UUID PRIMARY KEY,
  method_key VARCHAR(50) UNIQUE NOT NULL,
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
  created_by UUID REFERENCES user_profiles(id),
  updated_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🚀 **Implementation Steps**

### **1. Database Setup**
```bash
# Run the SQL script in Supabase
# File: payment-methods-config.sql
```

### **2. Test Admin Endpoints**
```bash
# Test getting payment methods
GET /api/payments/admin/methods

# Test toggling a method
PUT /api/payments/admin/methods/cash/toggle
{
  "is_enabled": false
}
```

### **3. Test Public Endpoint**
```bash
# Test getting available methods
GET /api/payments/methods/available
```

### **4. Frontend Integration**
- Add admin toggle buttons
- Update customer payment selection
- Implement real-time updates

## 🎯 **Benefits**

1. **✅ Dynamic Control**: Enable/disable payment methods without code changes
2. **✅ User-Friendly**: Toggle buttons for easy management
3. **✅ Secure**: Admin-only access with proper authentication
4. **✅ Flexible**: Support for online/offline payment methods
5. **✅ Scalable**: Easy to add new payment methods
6. **✅ Trackable**: All changes logged with user information

**Your payment methods can now be controlled through admin toggle buttons!** 🚀
