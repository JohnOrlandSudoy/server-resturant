# 💳 Payment Method Enable/Disable Endpoints Guide

## **🎯 Available Payment Method Management Endpoints**

Your system has **complete payment method management** with enable/disable functionality!

## **🔗 Payment Method Endpoints**

### **1. Toggle Payment Method (Enable/Disable) - Admin Only**
```http
PUT /api/payments/admin/methods/:methodKey/toggle
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "is_enabled": true
}
```

**Example - Enable PayMongo:**
```bash
PUT /api/payments/admin/methods/paymongo/toggle
{
  "is_enabled": true
}
```

**Example - Disable Cash:**
```bash
PUT /api/payments/admin/methods/cash/toggle
{
  "is_enabled": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment method paymongo enabled successfully",
  "data": {
    "method_key": "paymongo",
    "method_name": "PayMongo",
    "is_enabled": true,
    "updated_at": "2025-09-17T13:30:00.000Z"
  }
}
```

### **2. Get All Payment Methods Configuration - Admin Only**
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
      "id": "uuid-here",
      "method_key": "cash",
      "method_name": "Cash",
      "method_description": "Cash payment",
      "is_enabled": true,
      "is_online": false,
      "requires_setup": false,
      "display_order": 1,
      "icon_name": "cash",
      "color_code": "#28a745",
      "config_data": {},
      "is_active": true,
      "created_at": "2025-09-17T11:30:00.000Z",
      "updated_at": "2025-09-17T13:30:00.000Z"
    },
    {
      "id": "uuid-here",
      "method_key": "paymongo",
      "method_name": "PayMongo",
      "method_description": "Online payment via PayMongo",
      "is_enabled": true,
      "is_online": true,
      "requires_setup": true,
      "display_order": 2,
      "icon_name": "credit-card",
      "color_code": "#007bff",
      "config_data": {},
      "is_active": true,
      "created_at": "2025-09-17T11:30:00.000Z",
      "updated_at": "2025-09-17T13:30:00.000Z"
    }
  ]
}
```

### **3. Get Available Payment Methods - Public**
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
      "method_description": "Cash payment",
      "is_online": false,
      "display_order": 1,
      "icon_name": "cash",
      "color_code": "#28a745"
    },
    {
      "method_key": "paymongo",
      "method_name": "PayMongo",
      "method_description": "Online payment via PayMongo",
      "is_online": true,
      "display_order": 2,
      "icon_name": "credit-card",
      "color_code": "#007bff"
    }
  ]
}
```

### **4. Update Payment Method Configuration - Admin Only**
```http
PUT /api/payments/admin/methods/:methodKey
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "method_name": "Updated Cash Payment",
  "method_description": "Updated description",
  "is_enabled": false,
  "display_order": 3,
  "icon_name": "money-bill",
  "color_code": "#ffc107"
}
```

### **5. Create New Payment Method - Admin Only**
```http
POST /api/payments/admin/methods
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "method_key": "new_method",
  "method_name": "New Payment Method",
  "method_description": "Description of new method",
  "is_enabled": true,
  "is_online": false,
  "requires_setup": false,
  "display_order": 5,
  "icon_name": "payment",
  "color_code": "#6f42c1",
  "config_data": {}
}
```

### **6. Delete Payment Method - Admin Only**
```http
DELETE /api/payments/admin/methods/:methodKey
Authorization: Bearer <admin-token>
```

## **🧪 Complete Testing Workflow**

### **Step 1: Get All Payment Methods**
```bash
curl -X GET http://localhost:3000/api/payments/admin/methods \
  -H "Authorization: Bearer <admin-token>"
```

### **Step 2: Disable a Payment Method**
```bash
curl -X PUT http://localhost:3000/api/payments/admin/methods/paymongo/toggle \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"is_enabled": false}'
```

### **Step 3: Enable a Payment Method**
```bash
curl -X PUT http://localhost:3000/api/payments/admin/methods/cash/toggle \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"is_enabled": true}'
```

### **Step 4: Check Available Methods (Public)**
```bash
curl -X GET http://localhost:3000/api/payments/methods/available
```

### **Step 5: Update Payment Method Configuration**
```bash
curl -X PUT http://localhost:3000/api/payments/admin/methods/cash \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "method_name": "Cash Payment",
    "method_description": "Pay with cash",
    "is_enabled": true,
    "display_order": 1,
    "icon_name": "money-bill",
    "color_code": "#28a745"
  }'
```

## **📋 Valid Payment Method Keys**

The system supports these payment method keys:
- `cash` - Cash payment
- `gcash` - GCash payment
- `card` - Credit/Debit card
- `paymongo` - PayMongo online payment
- `qrph` - QR Ph payment
- `grab_pay` - GrabPay
- `shopeepay` - ShopeePay

## **🔧 Key Features**

### **✅ Toggle Functionality:**
- **Enable/Disable** any payment method
- **Validation** of method keys
- **State checking** - won't update if already in desired state
- **Audit logging** with user tracking

### **✅ Configuration Management:**
- **Full CRUD** operations for payment methods
- **Display order** management
- **Icon and color** customization
- **Online/Offline** classification
- **Setup requirements** tracking

### **✅ Security:**
- **Admin-only** access for management
- **Public access** for available methods only
- **Input validation** and error handling
- **Audit trail** with timestamps

## **🎯 Quick Enable/Disable Examples**

### **Enable PayMongo:**
```json
PUT /api/payments/admin/methods/paymongo/toggle
{
  "is_enabled": true
}
```

### **Disable Cash:**
```json
PUT /api/payments/admin/methods/cash/toggle
{
  "is_enabled": false
}
```

### **Enable GCash:**
```json
PUT /api/payments/admin/methods/gcash/toggle
{
  "is_enabled": true
}
```

### **Disable Card Payment:**
```json
PUT /api/payments/admin/methods/card/toggle
{
  "is_enabled": false
}
```

## **📊 Complete API Reference**

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| `GET` | `/api/payments/admin/methods` | Get all payment methods config | Admin only |
| `GET` | `/api/payments/methods/available` | Get available payment methods | Public |
| `PUT` | `/api/payments/admin/methods/:methodKey/toggle` | Enable/Disable payment method | Admin only |
| `PUT` | `/api/payments/admin/methods/:methodKey` | Update payment method config | Admin only |
| `POST` | `/api/payments/admin/methods` | Create new payment method | Admin only |
| `DELETE` | `/api/payments/admin/methods/:methodKey` | Delete payment method | Admin only |

## **🚀 Your Payment Method System is Complete!**

### **✅ Full Management Features:**
- ✅ **Enable/Disable** payment methods
- ✅ **Create/Update/Delete** payment methods
- ✅ **Configuration** management
- ✅ **Display order** control
- ✅ **Icon and color** customization
- ✅ **Public API** for available methods
- ✅ **Admin controls** with proper security

**Your payment method enable/disable system is fully functional!** 🎉

The main endpoint you need is:
**`PUT /api/payments/admin/methods/:methodKey/toggle`** with `{"is_enabled": true/false}`
