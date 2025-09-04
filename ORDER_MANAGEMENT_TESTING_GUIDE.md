# 🧪 Order Management System Testing Guide

## 📋 Prerequisites

1. **Database Setup**: Run the order management schema first:
   ```sql
   -- Execute this in your Supabase SQL editor
   \i order-management-schema.sql
   ```

2. **Server Running**: Make sure your server is running on `http://localhost:3000`

3. **Test Users**: Ensure you have test users with different roles:
   - Admin user
   - Cashier user  
   - Kitchen user

---

## 🔐 Step 1: Authentication Setup

### Login as Cashier
```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "username": "cashier1",
  "password": "cashier123"
}
```

**Expected Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-id",
    "username": "cashier1",
    "role": "cashier"
  }
}
```

**Save the token** - you'll need it for all subsequent requests as `Authorization: Bearer {token}`

---

## 🛒 Step 2: Cashier Order Processing Workflow

### 2.1 Create New Order
```http
POST http://localhost:3000/api/orders/
Authorization: Bearer {your-token}
Content-Type: application/json

{
  "customer_name": "John Doe",
  "customer_phone": "+639123456789",
  "order_type": "dine_in",
  "table_number": "T01",
  "special_instructions": "Extra spicy, no onions",
  "estimated_prep_time": 15
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "id": "order-uuid",
    "order_number": "ORD-20241201-0001",
    "customer_name": "John Doe",
    "order_type": "dine_in",
    "status": "pending",
    "payment_status": "unpaid",
    "subtotal": 0,
    "total_amount": 0
  }
}
```

**Save the `order_number` and `id`** for next steps.

### 2.2 Add Items to Order
```http
POST http://localhost:3000/api/orders/{order-id}/items
Authorization: Bearer {your-token}
Content-Type: application/json

{
  "menu_item_id": "menu-item-uuid",
  "quantity": 2,
  "customizations": {
    "spice_level": "extra_hot",
    "size": "large"
  },
  "special_instructions": "Extra crispy"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Item added to order successfully",
  "data": {
    "id": "order-item-uuid",
    "order_id": "order-uuid",
    "menu_item_id": "menu-item-uuid",
    "quantity": 2,
    "unit_price": 150.00,
    "total_price": 300.00,
    "customizations": "{\"spice_level\":\"extra_hot\",\"size\":\"large\"}",
    "special_instructions": "Extra crispy"
  }
}
```

### 2.3 Get Order Items
```http
GET http://localhost:3000/api/orders/{order-id}/items
Authorization: Bearer {your-token}
```

### 2.4 Apply Discount
```http
POST http://localhost:3000/api/orders/{order-id}/discounts
Authorization: Bearer {your-token}
Content-Type: application/json

{
  "discount_code": "WELCOME10"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Discount applied successfully",
  "data": {
    "discount": {
      "id": "discount-uuid",
      "code": "WELCOME10",
      "name": "Welcome Discount",
      "discount_type": "percentage",
      "discount_value": 10.00
    },
    "discount_amount": 30.00
  }
}
```

### 2.5 Process Payment
```http
PUT http://localhost:3000/api/orders/{order-id}/payment
Authorization: Bearer {your-token}
Content-Type: application/json

{
  "payment_status": "paid",
  "payment_method": "cash"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Payment status updated successfully",
  "data": {
    "id": "order-uuid",
    "payment_status": "paid",
    "payment_method": "cash",
    "total_amount": 270.00
  }
}
```

---

## 👨‍🍳 Step 3: Kitchen Staff Workflow

### 3.1 Login as Kitchen Staff
```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "username": "kitchen1",
  "password": "kitchen123"
}
```

### 3.2 Get Kitchen Orders
```http
GET http://localhost:3000/api/orders/kitchen/orders
Authorization: Bearer {kitchen-token}
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "order-uuid",
      "order_number": "ORD-20241201-0001",
      "customer_name": "John Doe",
      "order_type": "dine_in",
      "status": "pending",
      "table_number": "T01",
      "special_instructions": "Extra spicy, no onions",
      "estimated_prep_time": 15,
      "created_at": "2024-12-01T10:00:00Z",
      "item_count": 2,
      "menu_items": "Chicken Adobo, Rice"
    }
  ]
}
```

### 3.3 Update Order Status to Preparing
```http
PUT http://localhost:3000/api/orders/{order-id}/status
Authorization: Bearer {kitchen-token}
Content-Type: application/json

{
  "status": "preparing",
  "notes": "Started cooking - estimated 10 minutes"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Order status updated successfully",
  "data": {
    "id": "order-uuid",
    "status": "preparing",
    "updated_at": "2024-12-01T10:05:00Z"
  }
}
```

### 3.4 Update Order Status to Ready
```http
PUT http://localhost:3000/api/orders/{order-id}/status
Authorization: Bearer {kitchen-token}
Content-Type: application/json

{
  "status": "ready",
  "notes": "Order ready for pickup"
}
```

### 3.5 Get Order Status History
```http
GET http://localhost:3000/api/orders/{order-id}/history
Authorization: Bearer {kitchen-token}
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "history-uuid",
      "order_id": "order-uuid",
      "status": "pending",
      "notes": "Status updated",
      "created_at": "2024-12-01T10:00:00Z",
      "updated_by_user": {
        "username": "cashier1",
        "first_name": "John",
        "last_name": "Cashier"
      }
    },
    {
      "id": "history-uuid-2",
      "order_id": "order-uuid",
      "status": "preparing",
      "notes": "Started cooking - estimated 10 minutes",
      "created_at": "2024-12-01T10:05:00Z",
      "updated_by_user": {
        "username": "kitchen1",
        "first_name": "Jane",
        "last_name": "Chef"
      }
    }
  ]
}
```

---

## 🔍 Step 4: Order Search and Management

### 4.1 Search Orders by Customer Name
```http
GET http://localhost:3000/api/orders/search?q=John
Authorization: Bearer {cashier-token}
```

### 4.2 Search Orders by Order Number
```http
GET http://localhost:3000/api/orders/search?q=ORD-20241201-0001
Authorization: Bearer {cashier-token}
```

### 4.3 Get Order by Order Number
```http
GET http://localhost:3000/api/orders/number/ORD-20241201-0001
Authorization: Bearer {cashier-token}
```

### 4.4 List All Orders with Filtering
```http
GET http://localhost:3000/api/orders/?status=preparing&order_type=dine_in&page=1&limit=10
Authorization: Bearer {cashier-token}
```

---

## 🎯 Step 5: Complete Test Scenarios

### Scenario 1: Dine-in Order with Discount
1. Create dine-in order for table T05
2. Add 3 menu items with customizations
3. Apply 5% cash discount
4. Process cash payment
5. Kitchen updates to preparing → ready → completed

### Scenario 2: Takeout Order
1. Create takeout order
2. Add 2 menu items
3. Process GCash payment
4. Kitchen prepares and marks ready

### Scenario 3: Order Modification
1. Create order with items
2. Update item quantities
3. Remove an item
4. Add new item
5. Process payment

---

## 🚨 Error Testing

### Test Invalid Order Type
```http
POST http://localhost:3000/api/orders/
Authorization: Bearer {cashier-token}
Content-Type: application/json

{
  "customer_name": "Test Customer",
  "order_type": "invalid_type"
}
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Invalid order type. Must be one of: dine_in, takeout"
}
```

### Test Missing Table Number for Dine-in
```http
POST http://localhost:3000/api/orders/
Authorization: Bearer {cashier-token}
Content-Type: application/json

{
  "customer_name": "Test Customer",
  "order_type": "dine_in"
}
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Table number is required for dine-in orders"
}
```

### Test Invalid Discount Code
```http
POST http://localhost:3000/api/orders/{order-id}/discounts
Authorization: Bearer {cashier-token}
Content-Type: application/json

{
  "discount_code": "INVALID_CODE"
}
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Discount not found or expired"
}
```

---

## 📊 Expected Database Changes

After running the tests, you should see:

1. **Orders table**: New order records with auto-generated order numbers
2. **Order items table**: Items linked to orders with pricing
3. **Order status history**: Status change audit trail
4. **Stock movements**: Automatic ingredient stock deduction
5. **Menu availability**: Updated based on ingredient stock levels

---

## 🔧 Troubleshooting

### Common Issues:

1. **401 Unauthorized**: Check if token is valid and user has correct role
2. **404 Not Found**: Verify order IDs and menu item IDs exist
3. **400 Bad Request**: Check request body format and required fields
4. **500 Server Error**: Check server logs for database connection issues

### Debug Tips:

1. **Check server logs** for detailed error messages
2. **Verify database schema** is properly set up
3. **Test with simple requests** first before complex workflows
4. **Use browser dev tools** to inspect request/response headers

---

## 🎉 Success Indicators

✅ **Order creation** with auto-generated order numbers  
✅ **Real-time total calculation** with tax and discounts  
✅ **Automatic stock deduction** when orders are confirmed  
✅ **Status tracking** with complete audit trail  
✅ **Role-based access** working correctly  
✅ **Search functionality** returning accurate results  
✅ **Payment processing** updating order status  
✅ **Kitchen workflow** updating order statuses  

The system is working correctly when all these features function as expected!
