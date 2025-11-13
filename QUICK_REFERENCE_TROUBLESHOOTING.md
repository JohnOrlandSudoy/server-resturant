# Kitchen API - Quick Reference & Troubleshooting Guide

## Quick Endpoint Reference

### Kitchen Staff Operations

#### View Kitchen Orders
```http
GET /api/orders/kitchen/orders
Authorization: Bearer <token_kitchen_or_admin>

Response 200:
{
  "success": true,
  "data": [
    {
      "id": "abc123",
      "order_number": "1001",
      "status": "pending",
      "customer_name": "John Doe",
      "table_number": "5",
      "order_type": "dine_in",
      "items": [
        {
          "id": "item1",
          "menu_item_name": "Burger",
          "quantity": 2,
          "special_instructions": "No onions"
        }
      ],
      "created_at": "2024-01-15T12:30:00Z"
    }
  ]
}
```

#### Update Order Status
```http
PUT /api/orders/:orderId/status
Authorization: Bearer <token_kitchen_or_admin>
Content-Type: application/json

Request Body:
{
  "status": "preparing",
  "notes": "Started prep at station 2"
}

Valid Status Values:
- "pending" (initial)
- "preparing" (in progress)
- "ready" (done, waiting to serve)
- "completed" (served to customer)
- "cancelled" (order cancelled)

Response 200:
{
  "success": true,
  "message": "Order status updated successfully",
  "data": {
    "id": "abc123",
    "order_number": "1001",
    "status": "preparing",
    "order_status_history": {
      "id": "history1",
      "status": "preparing",
      "updated_by": "kitchen_user_1",
      "created_at": "2024-01-15T12:31:00Z"
    }
  }
}
```

#### View Order Status History
```http
GET /api/orders/:orderId/history
Authorization: Bearer <token_kitchen_or_admin>

Response 200:
{
  "success": true,
  "data": [
    {
      "id": "history1",
      "order_id": "abc123",
      "status": "preparing",
      "notes": "Started prep",
      "updated_by_user": {
        "username": "kitchen_user_1",
        "first_name": "Maria",
        "last_name": "Garcia"
      },
      "created_at": "2024-01-15T12:31:00Z"
    },
    {
      "id": "history2",
      "order_id": "abc123",
      "status": "pending",
      "notes": null,
      "updated_by_user": {
        "username": "cashier_1",
        "first_name": "John",
        "last_name": "Smith"
      },
      "created_at": "2024-01-15T12:30:00Z"
    }
  ]
}
```

#### Check Order Ingredients
```http
GET /api/orders/:orderId/ingredient-validation
Authorization: Bearer <token_cashier_or_admin>

Response 200:
{
  "success": true,
  "data": {
    "order_id": "abc123",
    "order_number": "1001",
    "customer_name": "John Doe",
    "order_status": "pending",
    "overall_validation": {
      "all_items_available": true,
      "has_low_stock_items": false,
      "total_items": 3,
      "available_items": 3,
      "unavailable_items": 0
    },
    "ingredient_summary": {
      "total_unavailable_ingredients": 0,
      "total_low_stock_ingredients": 0,
      "total_sufficient_ingredients": 12,
      "total_ingredients": 12
    },
    "item_details": [
      {
        "order_item_id": "item1",
        "menu_item_id": "burger1",
        "menu_item_name": "Burger",
        "current_quantity": 2,
        "is_available": true,
        "unavailable_ingredients": [],
        "max_available_quantity": 5,
        "stock_summary": {
          "out_of_stock_count": 0,
          "low_stock_count": 0,
          "sufficient_count": 4
        }
      }
    ]
  }
}
```

#### Get Ingredient Summary for Order
```http
GET /api/orders/:orderId/ingredient-summary
Authorization: Bearer <token_cashier_or_admin>

Response 200:
{
  "success": true,
  "data": {
    "order_id": "abc123",
    "order_number": "1001",
    "customer_name": "John Doe",
    "totals": {
      "total_ingredients": 5,
      "out_of_stock_count": 0,
      "low_stock_count": 1,
      "sufficient_count": 4,
      "total_shortage_amount": 0
    },
    "ingredients": [
      {
        "ingredient_id": "ing1",
        "ingredient_name": "Beef Patty",
        "current_stock": 10,
        "min_stock_threshold": 5,
        "unit": "pieces",
        "total_required": 4,
        "stock_status": "sufficient",
        "shortage_amount": 0,
        "menu_items": [
          {
            "menu_item_name": "Burger",
            "quantity": 2,
            "required_per_item": 2,
            "total_required": 4
          }
        ]
      }
    ]
  }
}
```

---

### Cashier Operations

#### Create Order
```http
POST /api/orders
Authorization: Bearer <token_cashier_or_admin>
Content-Type: application/json

Request Body:
{
  "customer_name": "John Doe",
  "customer_phone": "09123456789",
  "order_type": "dine_in",
  "table_number": "5",
  "estimated_prep_time": 15,
  "special_instructions": "Extra hot sauce"
}

Response 201:
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "id": "abc123",
    "order_number": "1001",
    "customer_name": "John Doe",
    "order_type": "dine_in",
    "status": "pending",
    "payment_status": "unpaid",
    "created_at": "2024-01-15T12:30:00Z"
  }
}
```

#### Add Item to Order
```http
POST /api/orders/:orderId/items
Authorization: Bearer <token_cashier_or_admin>
Content-Type: application/json

Request Body:
{
  "menu_item_id": "burger1",
  "quantity": 2,
  "customizations": {
    "no_onions": true,
    "extra_sauce": true
  },
  "special_instructions": "Meat cooked well-done"
}

Response 201 (Success):
{
  "success": true,
  "message": "Item added to order successfully",
  "data": {
    "id": "item1",
    "order_id": "abc123",
    "quantity": 2,
    "unit_price": 150.00,
    "total_price": 300.00,
    "menu_item": {
      "name": "Burger",
      "description": "Grilled beef burger",
      "image_url": "https://...",
      "ingredients": [
        {
          "id": "ing1",
          "name": "Beef Patty",
          "quantity_required": 2,
          "unit": "pieces",
          "current_stock": 10,
          "min_stock_threshold": 5,
          "stock_status": "sufficient",
          "total_required_for_order": 4
        }
      ]
    }
  }
}

Response 400 (Ingredients Unavailable):
{
  "success": false,
  "error": "Insufficient ingredients: Beef Patty",
  "details": {
    "unavailable_ingredients": [
      {
        "ingredient_name": "Beef Patty",
        "required": 4,
        "available": 2,
        "shortage": 2
      }
    ],
    "max_available_quantity": 1,
    "stock_summary": {
      "out_of_stock_count": 0,
      "low_stock_count": 1,
      "sufficient_count": 3
    }
  }
}
```

#### Process Payment - Cash
```http
PUT /api/orders/:orderId/payment
Authorization: Bearer <token_cashier_or_admin>
Content-Type: application/json

Request Body:
{
  "payment_status": "paid",
  "payment_method": "cash"
}

Response 200:
{
  "success": true,
  "message": "Payment status updated successfully",
  "data": {
    "id": "abc123",
    "payment_status": "paid",
    "payment_method": "cash"
  }
}
```

#### Process Payment - PayMongo QR
```http
POST /api/orders/:orderId/paymongo-payment
Authorization: Bearer <token_cashier_or_admin>
Content-Type: application/json

Request Body:
{
  "description": "Order #1001 - Dining",
  "metadata": {
    "custom_field": "value"
  }
}

Response 201:
{
  "success": true,
  "message": "PayMongo payment intent created for order",
  "data": {
    "paymentIntentId": "pi_abc123def456",
    "amount": 63180,
    "currency": "PHP",
    "status": "awaiting_payment_method",
    "qrCodeUrl": "https://paymongo-qr-url...",
    "qrCodeData": "base64encodedimage...",
    "expiresAt": "2024-01-15T12:45:00Z",
    "order": {
      "id": "abc123",
      "orderNumber": "1001",
      "totalAmount": 631.80,
      "customerName": "John Doe",
      "paymentStatus": "pending",
      "paymentMethod": "paymongo"
    }
  }
}
```

#### Get Order Receipt
```http
GET /api/orders/:orderId/receipt
Authorization: Bearer <token_cashier_or_admin>

Response 200:
{
  "success": true,
  "message": "Order receipt retrieved successfully",
  "data": {
    "order": {
      "id": "abc123",
      "orderNumber": "1001",
      "customerName": "John Doe",
      "customerPhone": "09123456789",
      "orderType": "dine_in",
      "tableNumber": "5",
      "status": "completed",
      "paymentStatus": "paid",
      "paymentMethod": "paymongo",
      "subtotal": 650.00,
      "discountAmount": 65.00,
      "taxAmount": 46.80,
      "totalAmount": 631.80,
      "createdAt": "2024-01-15T12:30:00Z",
      "completedAt": "2024-01-15T12:50:00Z"
    },
    "items": [
      {
        "id": "item1",
        "menuItemName": "Burger",
        "quantity": 2,
        "unitPrice": 150.00,
        "totalPrice": 300.00,
        "customizations": "{\"no_onions\": true}",
        "specialInstructions": "Well-done"
      }
    ],
    "payment": {
      "id": "pay1",
      "paymentIntentId": "pi_abc123",
      "amount": 63180,
      "status": "succeeded",
      "paidAt": "2024-01-15T12:32:00Z"
    },
    "statusHistory": [
      {
        "id": "h1",
        "status": "completed",
        "updatedBy": "kitchen_staff",
        "createdAt": "2024-01-15T12:50:00Z"
      }
    ],
    "summary": {
      "totalItems": 3,
      "totalQuantity": 5,
      "isPaid": true
    }
  }
}
```

---

## Troubleshooting Guide

### Issue: "Insufficient ingredients" Error

**Scenario**: Cashier tries to add 5 burgers but gets error saying insufficient beef patties

**Root Cause**: Current stock is less than needed

**Check**:
```http
GET /api/orders/menu-items/burger1/availability?quantity=5
```

**Response**:
```json
{
  "is_available": false,
  "unavailable_ingredients": [
    {
      "ingredient_name": "Beef Patty",
      "required": 10,
      "available": 5,
      "shortage": 5
    }
  ],
  "max_available_quantity": 2
}
```

**Solutions**:
1. **Reduce Quantity**: Ask customer for fewer items
2. **Wait for Stock**: If new shipment coming soon
3. **Offer Alternative**: Suggest similar items
4. **Update Stock**: Admin adds new inventory

**Update Stock**:
```http
POST /api/inventory/ingredients/beefPattyId/adjust-stock
Authorization: Bearer <token_admin>
Content-Type: application/json

Request Body:
{
  "quantity": 20,
  "reason": "New shipment arrived",
  "reference_number": "INV-2024-001"
}

Response 200:
{
  "success": true,
  "message": "Stock adjusted successfully",
  "data": {
    "ingredient_id": "beefPattyId",
    "previous_stock": 5,
    "new_stock": 25,
    "adjustment": 20
  }
}
```

---

### Issue: Order Status Stuck on "Preparing"

**Scenario**: Kitchen started preparing order 2 hours ago, still shows "preparing"

**Root Cause**: Kitchen staff forgot to update status or system hasn't been updated

**Check Order Status History**:
```http
GET /api/orders/abc123/history
```

**Expected**: Should see recent status updates

**If Not Updated**:
1. **Manual Update**:
```http
PUT /api/orders/abc123/status
Authorization: Bearer <token_kitchen>
Content-Type: application/json

{
  "status": "ready",
  "notes": "Just finished plating"
}
```

2. **Mark as Completed**:
```http
PUT /api/orders/abc123/status
Authorization: Bearer <token_kitchen>
Content-Type: application/json

{
  "status": "completed",
  "notes": "Delivered to table 5"
}
```

---

### Issue: Payment Shows "Pending" Not "Paid"

**Scenario**: Customer paid with PayMongo but order still shows "unpaid"

**Root Causes**: 
1. Webhook not received yet (PayMongo delay)
2. Webhook delivery failed
3. PayMongo status update failed

**Manual Sync Solution**:
```http
POST /api/orders/abc123/sync-payment
Authorization: Bearer <token_cashier>

Response 200:
{
  "success": true,
  "message": "Payment status synced successfully",
  "data": {
    "order": {
      "id": "abc123",
      "oldPaymentStatus": "pending",
      "newPaymentStatus": "paid",
      "paymentMethod": "paymongo"
    },
    "paymongoStatus": {
      "status": "succeeded",
      "id": "pi_abc123",
      "amount": 63180
    },
    "wasUpdated": true
  }
}
```

**If Still Not Working**:
1. Check PayMongo dashboard for payment status
2. Verify payment_intent_id is correct
3. Contact PayMongo support if payment shows as failed

---

### Issue: Menu Item Not Showing Available Ingredients

**Scenario**: Order ingredient-summary doesn't show ingredient details

**Root Causes**:
1. Ingredients not linked to menu item
2. Ingredients marked as inactive
3. Database query failed

**Check Menu Item Ingredients**:
```http
GET /api/menus/burger1
```

**Response Should Include**:
```json
{
  "menu_item_ingredients": [
    {
      "ingredient_id": "ing1",
      "ingredient_name": "Beef Patty",
      "quantity_required": 2,
      "unit": "pieces",
      "is_optional": false
    }
  ]
}
```

**If Missing Ingredients**:
```http
POST /api/menus/burger1/ingredients
Authorization: Bearer <token_admin>
Content-Type: application/json

{
  "ingredients": [
    {
      "ingredient_id": "ing1",
      "quantity_required": 2,
      "unit": "pieces",
      "is_optional": false
    }
  ]
}
```

---

### Issue: Stock Alerts Not Appearing

**Scenario**: Ingredient below threshold but no alert in system

**Root Cause**: Alert might not be created or already resolved

**Check All Alerts**:
```http
GET /api/orders/inventory/alerts
Authorization: Bearer <token_admin>
```

**Filter by Status**:
```http
GET /api/inventory/stock-alerts?is_resolved=false
```

**Create Alert Manually** (if system didn't):
```http
POST /api/inventory/stock-alerts
Authorization: Bearer <token_admin>
Content-Type: application/json

{
  "ingredient_id": "ing1",
  "alert_type": "low_stock",
  "current_stock": 5,
  "threshold_value": 20,
  "message": "Beef Patty running low"
}
```

---

### Issue: Order Doesn't Show in Kitchen Display

**Scenario**: Cashier created order but kitchen can't see it

**Root Causes**:
1. Order not yet marked as paid
2. Kitchen user doesn't have proper role
3. Order status is "cancelled"
4. Cache issue

**Verify Order Exists**:
```http
GET /api/orders/abc123
Authorization: Bearer <token_cashier>
```

**Check Order Status**:
- Should be: "pending", "preparing", or "ready"
- NOT "completed" or "cancelled"

**Verify Kitchen User Has Role**:
- User must have role: "kitchen" or "admin"
- Not "cashier" or "customer"

**Manual Check Kitchen Orders**:
```http
GET /api/orders/kitchen/orders
Authorization: Bearer <token_kitchen>
```

**If Still Not Showing**:
1. Verify order payment_status is "paid"
2. Check order status isn't completed
3. Clear browser cache if using frontend
4. Refresh page

---

### Issue: Quantity Increase Blocked

**Scenario**: Trying to increase burger quantity from 2 to 5, but system says insufficient stock

**Check Availability**:
```http
POST /api/orders/abc123/check-quantity-increase
Authorization: Bearer <token_cashier>
Content-Type: application/json

{
  "item_updates": [
    {
      "item_id": "item1",
      "new_quantity": 5
    }
  ]
}

Response:
{
  "can_increase_quantities": false,
  "validation_results": [
    {
      "item_id": "item1",
      "menu_item_name": "Burger",
      "current_quantity": 2,
      "new_quantity": 5,
      "quantity_change": 3,
      "is_available": false,
      "unavailable_ingredients": [
        {
          "ingredient_name": "Beef Patty",
          "required": 3,
          "available": 2
        }
      ]
    }
  ]
}
```

**Solutions**:
1. **Add Inventory**: Wait for restock or manually add stock
2. **Reduce Quantity**: Ask customer for fewer items
3. **Offer Alternative**: Suggest different menu item

---

### Issue: Payment Intent Expired

**Scenario**: QR code was displayed too long, now expired

**QR Code Expiration**: Typically 1 hour from creation

**Solution**: Create new payment intent
```http
POST /api/orders/abc123/paymongo-payment
Authorization: Bearer <token_cashier>

(Creates new QR code)
```

**Note**: Old payment intent is discarded, new one is used

---

## Error Code Reference

| Status | Error | Cause | Solution |
|--------|-------|-------|----------|
| 400 | Order type is required | Missing order_type field | Add order_type: 'dine_in' or 'takeout' |
| 400 | Table number is required for dine-in orders | dine_in without table_number | Add table_number for dine-in |
| 400 | Invalid order type | order_type not dine_in/takeout | Use correct order type |
| 400 | Insufficient ingredients | Not enough stock | Reduce qty or restock |
| 400 | Menu item is not available | Item.is_available = false | Contact admin to activate |
| 401 | User authentication required | No token or invalid token | Login again |
| 403 | Unauthorized (kitchen role) | Cashier trying kitchen endpoint | Use correct role endpoint |
| 404 | Order not found | Invalid order ID | Verify order ID exists |
| 404 | Menu item not found | Invalid menu_item_id | Verify menu item ID |
| 404 | Ingredient not found | Invalid ingredient_id | Verify ingredient exists |
| 500 | Failed to fetch orders | Database error | Retry or contact support |
| 500 | Failed to create PayMongo payment | PayMongo API error | Check payment config, retry |

---

## Common Workflows

### Workflow 1: Create and Complete an Order (5 minutes)

```
STEP 1 - Create Order (Cashier)
POST /api/orders
  └─ Response: order_id = abc123

STEP 2 - Add Items (Cashier)
POST /api/orders/abc123/items (Burger x2)
  └─ Check: Ingredients available?
     └─ YES: Item added
     └─ NO: Reduce quantity

POST /api/orders/abc123/items (Fries x2)
  └─ All items added

STEP 3 - Validate Order (Cashier)
GET /api/orders/abc123/ingredient-validation
  └─ Check: all_items_available = true?
     └─ YES: Proceed to payment
     └─ NO: Remove items or wait for stock

STEP 4 - Process Payment (Cashier)
PUT /api/orders/abc123/payment
  └─ If CASH: Set status = 'paid', method = 'cash'
  └─ If QR: POST paymongo-payment, wait for scan

STEP 5 - Kitchen Starts Prep
GET /api/orders/kitchen/orders
  └─ See order abc123
PUT /api/orders/abc123/status
  └─ Update: status = 'preparing'

STEP 6 - Items Ready
PUT /api/orders/abc123/status
  └─ Update: status = 'ready'
  └─ Notify server/cashier

STEP 7 - Serve & Complete
PUT /api/orders/abc123/status
  └─ Update: status = 'completed'

STEP 8 - Generate Receipt
GET /api/orders/abc123/receipt
  └─ Print receipt for customer
```

### Workflow 2: Handle Insufficient Stock

```
STEP 1 - Cashier Tries to Add Item
POST /api/orders/abc123/items (Burger x10)
  └─ Response: ERROR - Insufficient beef (available: 3, need: 20)

STEP 2 - Offer Options
  ├─ Option A: Reduce to 3 burgers
  │  └─ POST /api/orders/abc123/items (Burger x3)
  │     └─ Success
  │
  └─ Option B: Wait for restock
     └─ Inform customer
     └─ Ask to come back in 30 min

STEP 3 - Admin Restocks (If choosing wait)
POST /api/inventory/ingredients/beefId/adjust-stock
  Body: quantity = 20, reason = 'Delivery arrived'
  └─ Stock updated from 3 → 23

STEP 4 - Retry Order
POST /api/orders/abc123/items (Burger x10)
  └─ Now successful!
```

### Workflow 3: Handle Payment Sync Issue

```
STEP 1 - Order Shows "Pending" After PayMongo Payment
GET /api/orders/abc123
  └─ payment_status = 'pending' (should be 'paid')
  └─ Webhook not received yet

STEP 2 - Manually Sync
POST /api/orders/abc123/sync-payment
  └─ System checks PayMongo status
  └─ Finds: Payment succeeded
  └─ Updates: payment_status → 'paid'

STEP 3 - Verify Update
GET /api/orders/abc123
  └─ payment_status = 'paid' ✓
```

---

## Performance Tips

### For Kitchen Staff
- ✓ View kitchen orders only (filtered display)
- ✓ Update status frequently (every 5-10 min)
- ✓ Use order number (1001) to search, not ID

### For Cashier
- ✓ Check ingredient availability BEFORE adding items
- ✓ Validate entire order before marking paid
- ✓ Use order search for quick lookup
- ✓ Batch similar items when possible

### For Admin
- ✓ Monitor stock alerts daily
- ✓ Restock items approaching min threshold
- ✓ Review stock movements weekly
- ✓ Disable inactive menu items

---

## Logging & Monitoring

### Key Events to Monitor
```
✓ Order creation with prep time estimates
✓ Ingredient additions to orders (failures)
✓ Payment intent creation
✓ PayMongo webhook events
✓ Order status transitions
✓ Stock movements
✓ Alert creation and resolution
```

### Metrics to Track
```
✓ Average prep time (actual vs estimated)
✓ Payment success rate
✓ Stock alerts per day
✓ Orders completed per hour
✓ Ingredient shortage incidents
✓ PayMongo API response times
```

