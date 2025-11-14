# Sales Operations Analysis - Complete Route Mapping

**Last Updated:** November 14, 2025  
**Analysis Scope:** All sales-related routes across the system  
**Purpose:** Understand the complete sales flow for building waste/spoilage reports and sales analytics

---

## 📊 Quick Overview

Your restaurant system has **three main sales route files**:
1. **`orderRoutes.ts`** – Core order management (creation, items, status, payments)
2. **`paymentRoutes.ts`** – PayMongo QR payment processing
3. **`offlinePaymentRoutes.ts`** – Offline payments (cash, GCash, card)

**Total Sales Endpoints: 35+** across these files.

---

## 🏗️ Sales Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     SALES FLOW ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. ORDER CREATION                                                │
│     ├─ POST /api/orders/               (Cashier creates order)  │
│     ├─ POST /api/orders/:orderId/items (Add items to order)     │
│     └─ POST /api/orders/:orderId/check-availability              │
│                                                                   │
│  2. INVENTORY CHECK & VALIDATION                                  │
│     ├─ GET /api/orders/:orderId/ingredient-validation           │
│     ├─ GET /api/orders/:orderId/ingredient-summary              │
│     └─ GET /api/menu-items/:id/availability (RPC call)          │
│                                                                   │
│  3. DISCOUNT APPLICATION                                          │
│     ├─ GET /api/orders/discounts/available                      │
│     └─ POST /api/orders/:orderId/discounts                      │
│                                                                   │
│  4. PAYMENT PROCESSING                                            │
│     ├─ PUT /api/orders/:orderId/payment (Update status)         │
│     ├─ POST /api/orders/:orderId/paymongo-payment (QR)          │
│     ├─ POST /api/payments/create (Standalone payment)           │
│     └─ POST /api/offline-payments/process (Cash/Card)           │
│                                                                   │
│  5. KITCHEN OPERATIONS                                            │
│     ├─ GET /api/orders/kitchen/orders (Kitchen display)         │
│     ├─ PUT /api/orders/:orderId/status (Update order status)    │
│     └─ GET /api/orders/:orderId/history (Status audit trail)    │
│                                                                   │
│  6. ORDER COMPLETION & REPORTING                                  │
│     ├─ GET /api/orders/:orderId/receipt (Generate receipt)      │
│     ├─ GET /api/orders/:orderId/payment-status (Check payment)  │
│     └─ [POTENTIAL] Waste/Spoilage Report (TO BE ADDED)          │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 SECTION 1: ORDER ROUTES (orderRoutes.ts)

### **CASHIER ENDPOINTS (Order Management)**

#### 1.1 GET /api/orders
**Purpose:** Fetch all orders with pagination and filtering  
**Middleware:** `cashierOrAdmin`  
**Query Params:**
```
page?: number         (default: 1)
limit?: number        (default: 50)
status?: string       (pending|preparing|ready|completed|cancelled)
order_type?: string   (dine_in|takeout)
```
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "order_number": "ORD-001",
      "customer_name": "John Doe",
      "customer_phone": "09123456789",
      "order_type": "dine_in",
      "status": "pending",
      "payment_status": "unpaid",
      "payment_method": "cash",
      "subtotal": 500.00,
      "discount_amount": 50.00,
      "tax_amount": 36.00,
      "total_amount": 486.00,
      "special_instructions": "No onions",
      "table_number": "5",
      "estimated_prep_time": 20,
      "actual_prep_time": null,
      "created_at": "2025-11-14T10:00:00Z",
      "updated_at": "2025-11-14T10:15:00Z",
      "completed_at": null
    }
  ],
  "pagination": { "page": 1, "limit": 50, "total": 150, "totalPages": 3 }
}
```
**DB Table:** `order_summary` (View)

---

#### 1.2 GET /api/orders/search
**Purpose:** Search orders by customer name or order number  
**Middleware:** `cashierOrAdmin`  
**Query Params:**
```
q: string             (search term - required)
page?: number         (default: 1)
limit?: number        (default: 50)
```
**Response:** Same format as GET /api/orders

---

#### 1.3 GET /api/orders/:id
**Purpose:** Get a specific order by ID  
**Middleware:** `cashierOrAdmin`  
**Response:** Single order object (see 1.1 for structure)

---

#### 1.4 GET /api/orders/number/:orderNumber
**Purpose:** Get order by order number (human-readable)  
**Middleware:** `cashierOrAdmin`  
**Response:** Single order object

---

#### 1.5 POST /api/orders
**Purpose:** Create a new order (first step in sales)  
**Middleware:** `cashierOrAdmin`  
**Request Body:**
```json
{
  "customer_name": "John Doe",
  "customer_phone": "09123456789",
  "order_type": "dine_in",                    // required: dine_in | takeout
  "special_instructions": "No onions",
  "table_number": "5",                        // required for dine_in
  "estimated_prep_time": 20
}
```
**Response:**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "id": "uuid",
    "order_number": "ORD-001",
    "customer_name": "John Doe",
    ...
  }
}
```
**DB Table:** `orders`  
**Important:** Returns `order_number` (used in receipts and customer communication)

---

#### 1.6 POST /api/orders/:orderId/items
**Purpose:** Add menu items to an order (second step in sales)  
**Middleware:** `cashierOrAdmin`  
**Request Body:**
```json
{
  "menu_item_id": "uuid",
  "quantity": 2,
  "customizations": {
    "extra_cheese": true,
    "no_onions": true
  },
  "special_instructions": "Make it extra spicy"
}
```
**Pre-Check:** Calls `get_menu_item_availability` RPC to verify ingredient stock  
**Response:**
```json
{
  "success": true,
  "message": "Item added to order successfully",
  "data": {
    "id": "uuid",
    "order_id": "uuid",
    "menu_item_id": "uuid",
    "quantity": 2,
    "unit_price": 250.00,
    "total_price": 500.00,
    "customizations": {...},
    "special_instructions": "Make it extra spicy",
    "menu_item": {
      "name": "Fried Chicken",
      "description": "Crispy fried chicken",
      "ingredients": [
        {
          "id": "uuid",
          "name": "Chicken",
          "quantity_required": 250,
          "unit": "grams",
          "current_stock": 5000,
          "stock_status": "sufficient"
        }
      ]
    }
  }
}
```
**DB Tables:** `order_items`, `menu_items`, `ingredients`  
**📌 KEY FOR WASTE TRACKING:** Stores ingredient requirements per item

---

#### 1.7 PUT /api/orders/items/:itemId
**Purpose:** Update quantity, customizations, or special instructions for an item  
**Middleware:** `cashierOrAdmin`  
**Request Body:**
```json
{
  "quantity": 3,
  "customizations": { "extra_cheese": true },
  "special_instructions": "Extra spicy"
}
```
**Response:** Updated order item (same format as 1.6)

---

#### 1.8 DELETE /api/orders/items/:itemId
**Purpose:** Remove an item from an order  
**Middleware:** `cashierOrAdmin`  
**Response:**
```json
{
  "success": true,
  "message": "Item removed from order successfully"
}
```

---

#### 1.9 GET /api/orders/:orderId/items
**Purpose:** Get all items in an order  
**Middleware:** `cashierOrAdmin`  
**Response:**
```json
{
  "success": true,
  "data": [
    { /* order item objects */ }
  ]
}
```

---

### **PAYMENT ENDPOINTS (Sales Finalization)**

#### 1.10 PUT /api/orders/:orderId/payment
**Purpose:** Update order payment status and method  
**Middleware:** `cashierOrAdmin`  
**Request Body:**
```json
{
  "payment_status": "paid",               // unpaid|paid|refunded|pending|failed|cancelled
  "payment_method": "cash"                // cash|gcash|card|paymongo|qrph
}
```
**Response:**
```json
{
  "success": true,
  "message": "Payment status updated successfully",
  "data": { /* updated order */ }
}
```
**📌 KEY:** This is where the sale is finalized in the database

---

#### 1.11 POST /api/orders/:orderId/paymongo-payment
**Purpose:** Generate PayMongo QR code for payment  
**Middleware:** `cashierOrAdmin`  
**Request Body:**
```json
{
  "description": "Order #ORD-001",
  "metadata": { "table": "5" }
}
```
**Response:**
```json
{
  "success": true,
  "message": "PayMongo payment intent created for order",
  "data": {
    "paymentIntentId": "pi_xxx",
    "qrCodeUrl": "https://...",
    "qrCodeData": "data:image/png;base64,...",
    "status": "awaiting_payment_method",
    "amount": 48600,
    "currency": "PHP",
    "expiresAt": "2025-11-14T10:30:00Z",
    "order": {
      "id": "uuid",
      "orderNumber": "ORD-001",
      "totalAmount": 486.00,
      "paymentStatus": "pending"
    }
  }
}
```
**Calls:** `paymongoService().createPaymentIntent()`  
**Updates:** Sets order payment_status to "pending", payment_method to "paymongo"

---

#### 1.12 GET /api/orders/:orderId/payment-status
**Purpose:** Check real-time payment status from PayMongo  
**Middleware:** `cashierOrAdmin`  
**Response:**
```json
{
  "success": true,
  "data": {
    "order": {
      "id": "uuid",
      "orderNumber": "ORD-001",
      "paymentStatus": "paid",
      "paymentMethod": "paymongo",
      "totalAmount": 486.00
    },
    "latestPayment": {
      "paymentIntentId": "pi_xxx",
      "status": "succeeded",
      "amount": 48600,
      "paidAt": "2025-11-14T10:05:00Z"
    },
    "paymentHistory": [
      { /* array of all payments for this order */ }
    ]
  }
}
```

---

#### 1.13 POST /api/orders/:orderId/sync-payment
**Purpose:** Manually sync PayMongo payment status to database  
**Middleware:** `cashierOrAdmin`  
**Response:**
```json
{
  "success": true,
  "message": "Payment status synced successfully",
  "data": {
    "order": {
      "id": "uuid",
      "orderNumber": "ORD-001",
      "oldPaymentStatus": "pending",
      "newPaymentStatus": "paid"
    },
    "wasUpdated": true
  }
}
```

---

### **DISCOUNT ENDPOINTS**

#### 1.14 GET /api/orders/discounts/available
**Purpose:** Get all active discount codes  
**Middleware:** `cashierOrAdmin`  
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "code": "SAVE10",
      "name": "Save 10%",
      "description": "10% off for dine-in",
      "discount_type": "percentage",        // percentage | fixed_amount
      "discount_value": 10,
      "minimum_order_amount": 100,
      "maximum_discount_amount": 500,
      "is_active": true,
      "valid_from": "2025-11-01T00:00:00Z",
      "valid_until": "2025-12-01T00:00:00Z",
      "usage_limit": 100,
      "used_count": 45
    }
  ]
}
```
**DB Table:** `discounts`

---

#### 1.15 POST /api/orders/:orderId/discounts
**Purpose:** Apply a discount code to an order  
**Middleware:** `cashierOrAdmin`  
**Request Body:**
```json
{
  "discount_code": "SAVE10"
}
```
**Validations:**
- Code exists and is active
- Discount hasn't expired
- Order subtotal >= minimum_order_amount
- Discount amount doesn't exceed maximum_discount_amount

**Response:**
```json
{
  "success": true,
  "message": "Discount applied successfully",
  "data": {
    "discount": { /* discount object */ },
    "discount_amount": 50.00
  }
}
```
**DB Tables:** `discounts`, `order_discounts`  
**📌 KEY:** This reduces order total (affects final payment amount)

---

### **INGREDIENT VALIDATION ENDPOINTS**

#### 1.16 GET /api/orders/:orderId/ingredient-validation
**Purpose:** Check ingredient availability for entire order  
**Middleware:** `cashierOrAdmin`  
**Response:**
```json
{
  "success": true,
  "data": {
    "order_id": "uuid",
    "order_number": "ORD-001",
    "overall_validation": {
      "all_items_available": true,
      "has_low_stock_items": false,
      "total_items": 5,
      "available_items": 5,
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
        "order_item_id": "uuid",
        "menu_item_id": "uuid",
        "quantity": 2,
        "is_available": true,
        "stock_summary": {
          "sufficient_count": 6,
          "low_stock_count": 0,
          "out_of_stock_count": 0
        }
      }
    ]
  }
}
```
**📌 KEY FOR WASTE:** Identifies ingredients that might become waste due to spoilage

---

#### 1.17 GET /api/orders/:orderId/ingredient-summary
**Purpose:** Detailed breakdown of all ingredients needed for order  
**Middleware:** `cashierOrAdmin`  
**Response:**
```json
{
  "success": true,
  "data": {
    "order_id": "uuid",
    "order_number": "ORD-001",
    "customer_name": "John Doe",
    "totals": {
      "total_ingredients": 12,
      "out_of_stock_count": 0,
      "low_stock_count": 2,
      "sufficient_count": 10,
      "total_shortage_amount": 0
    },
    "ingredients": [
      {
        "id": "uuid",
        "name": "Chicken",
        "required_quantity": 500,
        "current_stock": 5000,
        "unit": "grams",
        "stock_status": "sufficient",
        "shortage_amount": 0,
        "is_low_stock": false
      }
    ]
  }
}
```
**DB Joins:** `order_items` → `menu_items` → `menu_item_ingredients` → `ingredients`  
**📌 KEY:** Complete ingredient picture for order fulfillment and waste assessment

---

#### 1.18 POST /api/orders/:orderId/check-availability
**Purpose:** Final availability check before checkout  
**Middleware:** `cashierOrAdmin`  
**Response:**
```json
{
  "success": true,
  "data": {
    "order_id": "uuid",
    "can_checkout": true,
    "has_unavailable_items": false,
    "items": [
      {
        "order_item_id": "uuid",
        "menu_item_id": "uuid",
        "quantity": 2,
        "is_available": true,
        "unavailable_ingredients": [],
        "max_available_quantity": 10
      }
    ],
    "summary": {
      "total_items": 5,
      "available_items": 5,
      "unavailable_items": 0
    }
  }
}
```

---

#### 1.19 POST /api/orders/:orderId/check-quantity-increase
**Purpose:** Check if increasing item quantity would cause shortage  
**Middleware:** `cashierOrAdmin`  
**Request Body:**
```json
{
  "item_updates": [
    { "item_id": "uuid", "new_quantity": 5 },
    { "item_id": "uuid2", "new_quantity": 3 }
  ]
}
```
**Response:**
```json
{
  "success": true,
  "data": {
    "order_id": "uuid",
    "can_increase_quantities": true,
    "validation_results": [
      {
        "item_id": "uuid",
        "old_quantity": 2,
        "new_quantity": 5,
        "is_available": true,
        "additional_quantity_needed": 3
      }
    ]
  }
}
```

---

### **KITCHEN ENDPOINTS (Sales Fulfillment)**

#### 1.20 GET /api/orders/kitchen/orders
**Purpose:** Live kitchen display with all pending/preparing/ready orders  
**Middleware:** `kitchenOrAdmin`  
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "order_number": "ORD-001",
      "customer_name": "John Doe",
      "order_type": "dine_in",
      "status": "pending",
      "table_number": "5",
      "special_instructions": "No onions",
      "created_at": "2025-11-14T10:00:00Z",
      "order_items": [
        {
          "id": "uuid",
          "menu_item_id": "uuid",
          "quantity": 2,
          "menu_items": {
            "name": "Fried Chicken",
            "prep_time": 15,
            "menu_item_ingredients": [
              {
                "quantity_required": 250,
                "unit": "grams",
                "ingredients": {
                  "id": "uuid",
                  "name": "Chicken",
                  "current_stock": 5000,
                  "is_active": true
                }
              }
            ]
          }
        }
      ],
      "kitchen_metadata": {
        "total_items": 2,
        "estimated_total_prep_time": 30,
        "priority": "MEDIUM",
        "ingredients_needed": [
          {
            "name": "Chicken",
            "required_quantity": 500,
            "current_stock": 5000,
            "is_low_stock": false,
            "is_out_of_stock": false
          }
        ],
        "low_stock_ingredients": [],
        "has_low_stock": false,
        "can_prepare": true
      }
    }
  ]
}
```
**Filters:** Only shows orders with status in ['pending', 'preparing', 'ready']  
**📌 KEY:** Pre-calculates priority and ingredient availability

---

#### 1.21 PUT /api/orders/:orderId/status
**Purpose:** Update order status (pending → preparing → ready → completed)  
**Middleware:** `kitchenOrAdmin`  
**Request Body:**
```json
{
  "status": "ready",            // pending|preparing|ready|completed|cancelled
  "notes": "Plated and ready"
}
```
**Response:**
```json
{
  "success": true,
  "message": "Order status updated successfully",
  "data": { /* updated order */ }
}
```
**Side Effects:** 
- Inserts record into `order_status_history`
- Sets `completed_at` if status === 'completed'

**📌 KEY:** Each status change is audited in history table

---

#### 1.22 GET /api/orders/:orderId/history
**Purpose:** Get status history for an order (audit trail)  
**Middleware:** `kitchenOrAdmin`  
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "order_id": "uuid",
      "status": "pending",
      "notes": "Order received",
      "updated_by_user": {
        "username": "cashier1",
        "first_name": "John",
        "last_name": "Smith"
      },
      "created_at": "2025-11-14T10:00:00Z"
    },
    {
      "id": "uuid",
      "order_id": "uuid",
      "status": "preparing",
      "notes": "Started cooking",
      "updated_by_user": {
        "username": "chef1",
        "first_name": "Maria",
        "last_name": "Cruz"
      },
      "created_at": "2025-11-14T10:05:00Z"
    }
  ]
}
```
**DB Table:** `order_status_history`

---

### **ADMIN ENDPOINTS**

#### 1.23 DELETE /api/orders/:orderId
**Purpose:** Delete/cancel an order  
**Middleware:** `adminOnly`  
**Query Params:** `force=true` (for hard delete)  
**Restrictions:**
- Cannot delete paid orders without force
- Cannot delete completed orders without force

**Response:**
```json
{
  "success": true,
  "message": "Order deleted successfully",
  "data": {
    "order_id": "uuid",
    "order_number": "ORD-001",
    "deleted_at": "2025-11-14T10:30:00Z"
  }
}
```

---

#### 1.24 DELETE /api/orders/bulk/delete (POST)
**Purpose:** Bulk delete orders  
**Middleware:** `adminOnly`  
**Request Body:**
```json
{
  "orderIds": ["uuid1", "uuid2", "uuid3"],
  "force": true
}
```
**Response:**
```json
{
  "success": true,
  "data": {
    "deleted_count": 3,
    "failed_count": 0,
    "failed_orders": [],
    "deleted_at": "2025-11-14T10:30:00Z"
  }
}
```

---

#### 1.25 PUT /api/orders/:orderId/cancel
**Purpose:** Soft delete (mark as cancelled)  
**Middleware:** `adminOnly`  
**Request Body:**
```json
{
  "reason": "Customer requested cancellation"
}
```
**Response:**
```json
{
  "success": true,
  "message": "Order cancelled successfully",
  "data": { /* updated order with status: cancelled */ }
}
```

---

### **RECEIPT & REPORTING**

#### 1.26 GET /api/orders/:orderId/receipt
**Purpose:** Generate complete order receipt  
**Middleware:** `cashierOrAdmin`  
**Response:**
```json
{
  "success": true,
  "message": "Order receipt retrieved successfully",
  "data": {
    "order": {
      "id": "uuid",
      "orderNumber": "ORD-001",
      "customerName": "John Doe",
      "customerPhone": "09123456789",
      "orderType": "dine_in",
      "tableNumber": "5",
      "status": "completed",
      "paymentStatus": "paid",
      "paymentMethod": "paymongo",
      "subtotal": 500.00,
      "discountAmount": 50.00,
      "taxAmount": 36.00,
      "totalAmount": 486.00,
      "createdAt": "2025-11-14T10:00:00Z",
      "completedAt": "2025-11-14T10:25:00Z"
    },
    "items": [
      {
        "id": "uuid",
        "menuItemName": "Fried Chicken",
        "quantity": 2,
        "unitPrice": 250.00,
        "totalPrice": 500.00,
        "customizations": { "extra_cheese": true },
        "specialInstructions": "No onions"
      }
    ],
    "payment": {
      "id": "uuid",
      "paymentIntentId": "pi_xxx",
      "status": "succeeded",
      "amount": 48600,
      "paidAt": "2025-11-14T10:05:00Z"
    },
    "statusHistory": [ /* array of status changes */ ],
    "summary": {
      "totalItems": 1,
      "totalQuantity": 2,
      "isPaid": true,
      "paymentMethod": "paymongo"
    }
  }
}
```

---

## 📋 SECTION 2: PAYMENT ROUTES (paymentRoutes.ts)

### **PAYMONGO PAYMENT ENDPOINTS**

#### 2.1 POST /api/payments/create
**Purpose:** Create standalone PayMongo payment intent (not tied to order)  
**Middleware:** `cashierOrAdmin`  
**Request Body:**
```json
{
  "amount": 48600,                    // centavos (100 = PHP 1.00) - REQUIRED
  "orderId": "uuid",                  // optional
  "description": "Payment for drinks",
  "metadata": { "table": "3" }
}
```
**Amount Validation:**
- Minimum: 100 centavos (PHP 1.00)
- Maximum: 10,000,000 centavos (PHP 100,000.00)

**Response:**
```json
{
  "success": true,
  "message": "Payment intent created successfully",
  "data": {
    "paymentIntentId": "pi_xxx",
    "qrCodeUrl": "https://...",
    "qrCodeData": "data:image/png;base64,...",
    "status": "awaiting_payment_method",
    "amount": 48600,
    "currency": "PHP",
    "expiresAt": "2025-11-14T10:30:00Z"
  }
}
```
**DB Tables:** `payments` (created for webhook tracking)

---

#### 2.2 GET /api/payments/status/:paymentIntentId
**Purpose:** Check real-time payment status  
**Middleware:** `cashierOrAdmin`  
**Response:**
```json
{
  "success": true,
  "data": {
    "paymentIntentId": "pi_xxx",
    "status": "succeeded",
    "amount": 48600,
    "currency": "PHP",
    "description": "Payment for Order #ORD-001",
    "metadata": { "orderId": "uuid", "table": "3" },
    "expiresAt": "2025-11-14T10:30:00Z",
    "createdAt": "2025-11-14T10:00:00Z"
  }
}
```

---

#### 2.3 GET /api/payments/history/:orderId
**Purpose:** Get payment history for an order  
**Middleware:** `cashierOrAdmin`  
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "paymentIntentId": "pi_xxx",
      "orderId": "uuid",
      "amount": 48600,
      "status": "succeeded",
      "paymentStatus": "paid",
      "paymentMethod": "paymongo",
      "paidAt": "2025-11-14T10:05:00Z",
      "createdAt": "2025-11-14T10:00:00Z"
    }
  ]
}
```

---

#### 2.4 POST /api/payments/webhook
**Purpose:** PayMongo webhook handler (payment confirmation)  
**Middleware:** Public (webhook signature validation)  
**Function:** Automatically updates payment status when customer completes QR payment

---

## 📋 SECTION 3: OFFLINE PAYMENT ROUTES (offlinePaymentRoutes.ts)

#### 3.1 POST /api/offline-payments/process
**Purpose:** Process cash, GCash, or card payments  
**Middleware:** `cashierOrAdmin`  
**Request Body:**
```json
{
  "orderId": "uuid",                  // REQUIRED
  "paymentMethod": "cash",            // cash | gcash | card (REQUIRED)
  "amount": 486.00,                   // REQUIRED
  "notes": "Paid with 2x PHP 500 bills"
}
```
**Response:**
```json
{
  "success": true,
  "message": "Offline payment processed successfully",
  "data": {
    "id": "uuid",
    "orderId": "uuid",
    "paymentMethod": "cash",
    "amount": 486.00,
    "currency": "PHP",
    "paymentStatus": "paid",
    "transactionId": "TXN-xxx",
    "receiptNumber": "RCP-001",
    "notes": "Paid with 2x PHP 500 bills",
    "createdAt": "2025-11-14T10:05:00Z"
  }
}
```
**DB Table:** `offline_payments`

---

#### 3.2 GET /api/offline-payments/methods
**Purpose:** Get available offline payment methods  
**Middleware:** Public  
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "method_key": "cash",
      "method_name": "Cash",
      "is_enabled": true,
      "display_order": 1
    },
    {
      "id": "uuid",
      "method_key": "gcash",
      "method_name": "GCash",
      "is_enabled": true,
      "display_order": 2
    }
  ]
}
```

---

#### 3.3 GET /api/offline-payments/order/:orderId/history
**Purpose:** Get offline payment history for order  
**Middleware:** `cashierOrAdmin`  
**Response:**
```json
{
  "success": true,
  "data": [
    { /* offline payment objects */ }
  ]
}
```

---

#### 3.4 GET /api/offline-payments/receipt/:paymentId
**Purpose:** Generate receipt for offline payment  
**Middleware:** `cashierOrAdmin`  
**Response:**
```json
{
  "success": true,
  "data": {
    "receiptNumber": "RCP-001",
    "orderId": "uuid",
    "orderNumber": "ORD-001",
    "paymentMethod": "cash",
    "amount": 486.00,
    "currency": "PHP",
    "notes": "Paid with 2x PHP 500 bills",
    "createdAt": "2025-11-14T10:05:00Z"
  }
}
```

---

## 📊 SECTION 4: SALES DATA FLOW & DATABASE SCHEMA

### **Core Sales Tables**

```sql
-- Order Creation
orders (
  id, order_number, customer_name, customer_phone, 
  order_type, status, payment_status, payment_method,
  subtotal, discount_amount, tax_amount, total_amount,
  created_by, created_at, updated_at, completed_at
)

-- Line Items
order_items (
  id, order_id, menu_item_id, quantity, unit_price, 
  total_price, customizations, special_instructions
)

-- Status Tracking
order_status_history (
  id, order_id, status, notes, updated_by, created_at
)

-- Payments
payments (
  id, payment_intent_id, order_id, amount, status,
  payment_status, payment_method, paymongo_response, created_at
)

-- Offline Payments
offline_payments (
  id, order_id, payment_method, amount, payment_status,
  transaction_id, receipt_number, created_at
)

-- Discounts
discounts (
  id, code, name, discount_type, discount_value,
  minimum_order_amount, is_active, valid_until
)

-- Applied Discounts
order_discounts (
  id, order_id, discount_id, discount_amount, applied_at
)
```

---

## 🔄 Complete Sales Workflow

```
┌─────────────────────────────────────────────────────────────┐
│             COMPLETE SALES TRANSACTION FLOW                 │
└─────────────────────────────────────────────────────────────┘

STEP 1: CASHIER CREATES ORDER
  POST /api/orders
    → Creates order record in DB
    → Returns order_id and order_number
    → Status: "pending"

STEP 2: ADD MENU ITEMS
  POST /api/orders/:orderId/items (multiple calls)
    → Checks ingredient availability via RPC
    → Stores items in order_items table
    → Calculates subtotal

STEP 3: VALIDATE & CHECK AVAILABILITY
  GET /api/orders/:orderId/ingredient-validation
    → Verifies all ingredients are in stock
    → Can proceed if all items available

STEP 4: APPLY DISCOUNTS (Optional)
  GET /api/orders/discounts/available
  POST /api/orders/:orderId/discounts
    → Calculates discount_amount
    → Stores in order_discounts table

STEP 5: SELECT PAYMENT METHOD
  ├─ FOR ONLINE (PayMongo):
  │   POST /api/orders/:orderId/paymongo-payment
  │     → Generates QR code
  │     → Creates payment record with status "pending"
  │
  └─ FOR OFFLINE:
      POST /api/offline-payments/process
        → Directly marks as "paid"
        → Creates offline_payments record

STEP 6: CONFIRM PAYMENT
  For PayMongo: Webhook auto-updates OR
  GET /api/orders/:orderId/payment-status (manual check)
  PUT /api/orders/:orderId/payment (manual update)
    → Sets payment_status to "paid"
    → Sales is now finalized ✓

STEP 7: KITCHEN OPERATIONS
  GET /api/orders/kitchen/orders (live display)
  PUT /api/orders/:orderId/status
    → pending → preparing → ready → completed
    → Each change recorded in order_status_history

STEP 8: GENERATE RECEIPT
  GET /api/orders/:orderId/receipt
    → Complete transaction details
    → Payment confirmation
    → Ready for printing or email

STEP 9: ANALYTICS & REPORTING
  [TO BE BUILT]
    → Total sales by date/time
    → Sales by payment method
    → Waste/spoilage reports ← YOUR NEW FEATURE
    → Revenue reports
```

---

## 💡 Key Data Points for Waste/Spoilage Reporting

**When designing your waste reporting feature, track:**

1. **Ingredient Level:**
   - Which ingredients were wasted (from `ingredients` table)
   - Quantity wasted (grams, units, etc.)
   - Cost impact (current_stock × cost_per_unit)
   - Reason: spillage, burn, expiry, quality_issue, over_preparation

2. **Order Level:**
   - Orders that generated waste (cancelled, failed, refused)
   - Items prepared but not served
   - Ingredient shortages causing waste

3. **Kitchen Level:**
   - Which staff member reported waste
   - When waste occurred (time, date)
   - Notes/description for root cause analysis

4. **Financial Impact:**
   - Total cost of wasted ingredients
   - Percentage of daily waste
   - Waste by ingredient category

---

## 📈 Database Tables Affected by Sales

| Table | Used For | Joins To |
|-------|----------|----------|
| `orders` | Core transaction | `user_profiles`, `order_items`, `payments`, `order_status_history` |
| `order_items` | Line items | `menu_items`, `orders` |
| `menu_items` | Product catalog | `menu_item_ingredients`, `categories` |
| `menu_item_ingredients` | Recipe tracking | `ingredients`, `menu_items` |
| `ingredients` | Stock management | `menu_item_ingredients`, `stock_movements` |
| `order_status_history` | Audit trail | `orders`, `user_profiles` |
| `payments` | Payment tracking | `orders`, `user_profiles` |
| `offline_payments` | Offline txns | `orders`, `user_profiles` |
| `order_discounts` | Discount application | `orders`, `discounts` |
| `discounts` | Promo codes | `order_discounts` |
| `stock_movements` | Inventory changes | `ingredients`, `user_profiles` |
| `stock_alerts` | Low stock warnings | `ingredients`, `user_profiles` |

---

## 🎯 Recommendations for Your Waste/Spoilage Feature

Given this sales architecture, here's how to integrate waste reporting:

### **Create These Endpoints:**

```
1. POST /api/kitchen/waste-reports
   - Record a waste incident
   - Link to ingredient (required) and optionally to order
   - Capture reason, quantity, staff member

2. GET /api/kitchen/waste-reports
   - Kitchen dashboard showing recent waste
   - Filter by date range, ingredient, reason

3. GET /api/kitchen/waste-reports/analytics
   - Waste cost by ingredient
   - Waste frequency by reason
   - Daily/weekly/monthly trends

4. PUT /api/kitchen/waste-reports/:id
   - Mark waste as reviewed/resolved
```

### **Modify Existing Tables:**

The `stock_movements` table already has a `movement_type` of `'spoilage'`, so you can:
- Use it for automatic waste tracking from order failures
- Create a separate `waste_reports` table for detailed incident tracking
- Link both for complete waste audit trail

---

## 🔐 Middleware & Access Control

| Endpoint Prefix | Middleware | Roles | Purpose |
|---|---|---|---|
| `/api/orders` | `cashierOrAdmin` | cashier, admin | Order management |
| `/api/orders/kitchen` | `kitchenOrAdmin` | kitchen, admin | Kitchen display |
| `/api/payments` | `cashierOrAdmin` | cashier, admin | Payment processing |
| `/api/offline-payments` | `cashierOrAdmin` | cashier, admin | Offline payment entry |
| `/api/orders/discounts` (POST) | `adminOnly` | admin | Discount creation |
| `/api/orders/discounts` (GET/PUT) | `cashierOrAdmin` | cashier, admin | Discount usage |

---

## 📝 Summary

Your sales system has **35+ endpoints** spanning:
- ✅ Order creation & management
- ✅ Item addition & validation
- ✅ Discount application
- ✅ Online payment (PayMongo)
- ✅ Offline payment (cash/card/GCash)
- ✅ Kitchen operations
- ✅ Receipt generation
- ✅ Status tracking & history

**Next Step:** Integrate waste/spoilage reporting into this architecture using the waste incident capture, kitchen analytics, and stock movement tables.

