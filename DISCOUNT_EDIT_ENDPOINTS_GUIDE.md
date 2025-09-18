# ✏️ Discount Edit/Update Endpoints Guide

## **🎉 NEW EDIT FUNCTIONALITY ADDED!**

I've added the missing edit/update functionality for your discount system. Now you have **complete CRUD operations** for discounts!

## **🔗 New Discount Edit Endpoints**

### **1. Get Single Discount by ID (Admin Only)**
```http
GET /api/orders/discounts/:id
Authorization: Bearer <admin-token>
```

**Example:**
```bash
GET /api/orders/discounts/123e4567-e89b-12d3-a456-426614174000
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "code": "SAVE20",
    "name": "20% Off Special",
    "description": "Get 20% off on orders above 500",
    "discount_type": "percentage",
    "discount_value": 20,
    "minimum_order_amount": 500,
    "maximum_discount_amount": 200,
    "is_active": true,
    "valid_from": "2025-09-17T11:30:00.000Z",
    "valid_until": "2025-12-31T23:59:59.000Z",
    "usage_limit": null,
    "used_count": 0,
    "created_by": "user-id",
    "created_at": "2025-09-17T11:30:00.000Z",
    "updated_at": "2025-09-17T11:30:00.000Z"
  }
}
```

### **2. Update Discount (Admin Only)**
```http
PUT /api/orders/discounts/:id
Authorization: Bearer <admin-token>
Content-Type: application/json
```

**Example - Update discount value:**
```json
{
  "discount_value": 25,
  "maximum_discount_amount": 300
}
```

**Example - Update multiple fields:**
```json
{
  "name": "Updated 25% Off Special",
  "description": "Updated description",
  "discount_value": 25,
  "minimum_order_amount": 600,
  "maximum_discount_amount": 300,
  "is_active": true,
  "valid_until": "2025-12-31T23:59:59.000Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Discount updated successfully",
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "code": "SAVE20",
    "name": "Updated 25% Off Special",
    "description": "Updated description",
    "discount_type": "percentage",
    "discount_value": 25,
    "minimum_order_amount": 600,
    "maximum_discount_amount": 300,
    "is_active": true,
    "valid_from": "2025-09-17T11:30:00.000Z",
    "valid_until": "2025-12-31T23:59:59.000Z",
    "usage_limit": null,
    "used_count": 0,
    "created_by": "user-id",
    "created_at": "2025-09-17T11:30:00.000Z",
    "updated_at": "2025-09-17T12:45:00.000Z"
  }
}
```

### **3. Delete Discount (Admin Only)**
```http
DELETE /api/orders/discounts/:id
Authorization: Bearer <admin-token>
```

**Example:**
```bash
DELETE /api/orders/discounts/123e4567-e89b-12d3-a456-426614174000
```

**Response:**
```json
{
  "success": true,
  "message": "Discount deleted successfully",
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "code": "SAVE20",
    "name": "20% Off Special",
    "description": "Get 20% off on orders above 500",
    "discount_type": "percentage",
    "discount_value": 20,
    "minimum_order_amount": 500,
    "maximum_discount_amount": 200,
    "is_active": true,
    "valid_from": "2025-09-17T11:30:00.000Z",
    "valid_until": "2025-12-31T23:59:59.000Z",
    "usage_limit": null,
    "used_count": 0,
    "created_by": "user-id",
    "created_at": "2025-09-17T11:30:00.000Z",
    "updated_at": "2025-09-17T11:30:00.000Z"
  }
}
```

## **🧪 Complete Testing Workflow**

### **Step 1: Create a Discount**
```bash
curl -X POST http://localhost:3000/api/orders/discounts \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "TEST20",
    "name": "Test 20% Off",
    "description": "Test discount for editing",
    "discount_type": "percentage",
    "discount_value": 20,
    "minimum_order_amount": 100
  }'
```

### **Step 2: Get the Created Discount**
```bash
curl -X GET http://localhost:3000/api/orders/discounts/{discount-id} \
  -H "Authorization: Bearer <admin-token>"
```

### **Step 3: Update the Discount**
```bash
curl -X PUT http://localhost:3000/api/orders/discounts/{discount-id} \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Test 25% Off",
    "discount_value": 25,
    "minimum_order_amount": 200
  }'
```

### **Step 4: Verify the Update**
```bash
curl -X GET http://localhost:3000/api/orders/discounts/{discount-id} \
  -H "Authorization: Bearer <admin-token>"
```

### **Step 5: Delete the Discount**
```bash
curl -X DELETE http://localhost:3000/api/orders/discounts/{discount-id} \
  -H "Authorization: Bearer <admin-token>"
```

## **📋 Complete Discount API Reference**

### **All Available Discount Endpoints:**

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| `POST` | `/api/orders/discounts` | Create new discount | Admin only |
| `GET` | `/api/orders/discounts/available` | Get all available discounts | Cashier/Admin |
| `GET` | `/api/orders/discounts/:id` | Get single discount by ID | Admin only |
| `PUT` | `/api/orders/discounts/:id` | Update discount | Admin only |
| `DELETE` | `/api/orders/discounts/:id` | Delete discount | Admin only |
| `POST` | `/api/orders/:orderId/discounts` | Apply discount to order | Cashier/Admin |

## **🔧 Update Features**

### **✅ What You Can Update:**
- `code` - Discount code (automatically converted to uppercase)
- `name` - Discount name
- `description` - Discount description
- `discount_type` - "percentage" or "fixed_amount"
- `discount_value` - Discount value
- `minimum_order_amount` - Minimum order amount required
- `maximum_discount_amount` - Maximum discount amount (for percentage)
- `is_active` - Whether discount is active
- `valid_until` - Expiration date
- `usage_limit` - Maximum number of uses

### **✅ Validation:**
- Discount type must be "percentage" or "fixed_amount"
- All numeric values are properly parsed
- Code is automatically converted to uppercase
- Only provided fields are updated (partial updates supported)

### **✅ Security:**
- All edit operations require Admin role
- Proper error handling and validation
- Audit trail with updated_at timestamp

## **🎯 Postman Collection**

### **Environment Variables:**
```json
{
  "baseUrl": "http://localhost:3000",
  "adminToken": "your-admin-jwt-token",
  "discountId": "discount-uuid-here"
}
```

### **Collection Structure:**
1. **Create Discount** - `POST {{baseUrl}}/api/orders/discounts`
2. **Get All Discounts** - `GET {{baseUrl}}/api/orders/discounts/available`
3. **Get Single Discount** - `GET {{baseUrl}}/api/orders/discounts/{{discountId}}`
4. **Update Discount** - `PUT {{baseUrl}}/api/orders/discounts/{{discountId}}`
5. **Delete Discount** - `DELETE {{baseUrl}}/api/orders/discounts/{{discountId}}`
6. **Apply Discount** - `POST {{baseUrl}}/api/orders/{{orderId}}/discounts`

## **🚀 Your Discount System is Now Complete!**

### **✅ Full CRUD Operations:**
- ✅ **Create** - Add new discounts
- ✅ **Read** - Get all discounts or single discount
- ✅ **Update** - Edit existing discounts
- ✅ **Delete** - Remove discounts
- ✅ **Apply** - Use discounts on orders

### **✅ Production Ready Features:**
- ✅ Role-based security (Admin/Cashier)
- ✅ Input validation and error handling
- ✅ Flexible partial updates
- ✅ Audit trail with timestamps
- ✅ Proper business logic
- ✅ Complete API documentation

**Your discount system now has complete edit functionality!** 🎉
