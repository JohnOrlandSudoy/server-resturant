# Kitchen Operations - Detailed Flow & Database Relationships

## Database Entity Relationship Diagram

```
┌─────────────────────┐
│   user_profiles     │
│  ═════════════════  │
│ • id (PK)           │
│ • username (UNIQUE) │
│ • role              │ ◄──── ROLES: cashier, kitchen, admin, customer
│ • password_hash     │
│ • email             │
│ • is_active         │
└──────────┬──────────┘
           │
           │ created_by/updated_by
           │ (one-to-many)
           ├─────────────┬──────────────┬────────────────┬──────────────┐
           ▼             ▼              ▼                ▼              ▼
      ┌────────┐  ┌──────────┐  ┌────────────┐  ┌──────────────┐  ┌─────────┐
      │ orders │  │ingredients│ │menu_items│  │discounts     │  │payments │
      └────────┘  └──────────┘  └────────────┘  └──────────────┘  └─────────┘


ORDERS - Main Entity:
┌─────────────────────────────────────┐
│ orders                              │
├─────────────────────────────────────┤
│ • id (UUID, PK)                     │
│ • order_number (UNIQUE)             │
│ • order_type: 'dine_in|takeout'     │
│ • status: pending|preparing|ready│  │
│         completed|cancelled         │
│ • payment_status: unpaid|paid|...   │
│ • payment_method: cash|gcash|...    │
│ • customer_name, phone, table_no    │
│ • subtotal, discount, tax, total    │
│ • special_instructions              │
│ • estimated_prep_time               │
│ • actual_prep_time                  │
│ • created_by (FK→user_profiles)     │
│ • updated_by (FK→user_profiles)     │
│ • created_at, updated_at, completed_at │
└──────────────────┬──────────────────┘
                   │ (one-to-many)
        ┌──────────┼──────────────────────┐
        ▼          ▼                      ▼
   ┌──────────┐  ┌────────────────┐  ┌─────────────────┐
   │order_items│  │order_status_   │  │order_discounts│
   │          │  │history         │  │               │
   │• id      │  │• id            │  │• id            │
   │• order_id│  │• order_id      │  │• order_id      │
   │• menu_   │  │• status        │  │• discount_id   │
   │  item_id │  │• notes         │  │• discount_amt  │
   │• quantity│  │• updated_by    │  │• applied_at    │
   │• price   │  │• created_at    │  └─────────────────┘
   │• customiz│  └────────────────┘
   │          │
   └────┬─────┘
        │ (many-to-one)
        ▼
   ┌──────────────┐
   │menu_items    │
   │              │
   │• id (PK)     │
   │• name        │
   │• price       │
   │• category_id │──────┐
   │• image_*     │      │
   │• prep_time   │      │
   │• is_available│      │
   │• is_featured │      │
   │• is_active   │      │
   └────┬─────────┘      │
        │                │ (many-to-one)
        │ (one-to-many)  │
        ▼                ▼
   ┌────────────────┐  ┌──────────────┐
   │menu_item_      │  │menu_          │
   │ingredients     │  │categories     │
   │                │  │               │
   │• id            │  │• id           │
   │• menu_item_id  │  │• name(UNIQUE) │
   │• ingredient_id │  │• description  │
   │• qty_required  │  │• image_*      │
   │• unit          │  │• sort_order   │
   │• is_optional   │  │• is_active    │
   └────┬───────────┘  └───────────────┘
        │
        │ (many-to-one)
        ▼
   ┌────────────────┐
   │ingredients     │
   │                │
   │• id (PK)       │
   │• name(UNIQUE)  │
   │• current_stock │
   │• min_threshold │
   │• max_threshold │
   │• cost_per_unit │
   │• supplier      │
   │• category      │
   │• storage_loc   │
   │• expiry_date   │
   │• is_active     │
   └────┬───────────┘
        │
        │ (one-to-many) ┌─────────────────────┐
        ├──────────────►│stock_movements      │
        │               │• id (PK)            │
        │               │• ingredient_id (FK) │
        │               │• movement_type      │
        │               │  (in|out|adj|spoi)  │
        │               │• quantity           │
        │               │• reason             │
        │               │• performed_by (FK)  │
        │               │• created_at         │
        │               └─────────────────────┘
        │
        │ (one-to-many) ┌─────────────────────┐
        └──────────────►│stock_alerts         │
                        │• id (PK)            │
                        │• ingredient_id(FK)  │
                        │• alert_type         │
                        │  (low|out|expiry)   │
                        │• current_stock      │
                        │• threshold_value    │
                        │• message            │
                        │• is_resolved        │
                        │• resolved_by(FK)    │
                        │• created_at         │
                        └─────────────────────┘


PAYMENTS - Payment Processing:
┌─────────────────────────────┐
│ payments                    │
│ (PayMongo Integration)      │
├─────────────────────────────┤
│ • id (UUID, PK)             │
│ • payment_intent_id(UNIQUE) │
│ • order_id (FK→orders)      │
│ • order_number              │
│ • amount (NUMERIC)          │
│ • currency (default: PHP)   │
│ • status (awaiting|succeed) │
│ • payment_status (pending|  │
│   paid|refunded|failed)     │
│ • payment_method (paymongo) │
│ • payment_source_type (qrph)│
│ • qr_code_url, qr_code_data │
│ • qr_code_expires_at        │
│ • fee_amount, net_amount    │
│ • error_message, error_code │
│ • paid_at, failed_at, ...   │
│ • paymongo_response (JSONB) │
│ • webhook_events (JSONB)    │
│ • metadata (JSONB)          │
│ • created_by (FK→users)     │
└─────────────────────────────┘

┌─────────────────────────────┐
│ offline_payments            │
│ (Cash, Bank Transfer, etc)  │
├─────────────────────────────┤
│ • id (UUID, PK)             │
│ • order_id (FK→orders)      │
│ • payment_method            │
│ • amount                    │
│ • currency                  │
│ • payment_status (paid)     │
│ • transaction_id            │
│ • receipt_number (UNIQUE)   │
│ • notes                     │
│ • metadata (JSONB)          │
│ • created_by (FK→users)     │
│ • created_at, updated_at    │
└─────────────────────────────┘

┌─────────────────────────────┐
│ payment_methods_config      │
│ (Settings & Config)         │
├─────────────────────────────┤
│ • id (UUID, PK)             │
│ • method_key (UNIQUE)       │
│   ENUM: cash, gcash, card   │
│         paymongo, qrph      │
│         grab_pay, shopeepay │
│ • method_name               │
│ • is_enabled                │
│ • is_online                 │
│ • requires_setup            │
│ • display_order             │
│ • icon_name, color_code     │
│ • config_data (JSONB)       │
│ • is_active                 │
└─────────────────────────────┘
```

---

## Kitchen Operations Workflow

### 1. Order Creation Phase (Cashier)

```
CASHIER WORKFLOW:
┌───────────────────────────────┐
│ 1. Create Order               │
│    POST /api/orders           │
│    ├─ customer_name           │
│    ├─ customer_phone          │
│    ├─ order_type (dine_in)    │
│    ├─ table_number            │
│    └─ special_instructions    │
└───────────┬───────────────────┘
            │ Response: Order created (status: pending)
            │
┌───────────▼───────────────────┐
│ 2. Add Items to Order         │
│    POST /api/orders/:id/items │
│    Loop for each menu item:   │
│    ├─ menu_item_id            │
│    ├─ quantity                │
│    ├─ customizations          │
│    └─ special_instructions    │
│                               │
│ System Actions:               │
│ ✓ Validates menu item exists  │
│ ✓ Checks ingredient stock     │
│   RPC: get_menu_item_         │
│        availability()         │
│ ✓ Returns item with stock     │
│   info or error               │
│ ✓ Calculates unit/total price │
└───────────┬───────────────────┘
            │
┌───────────▼───────────────────┐
│ 3. Validate Order             │
│    GET /api/orders/:id/       │
│        ingredient-validation  │
│                               │
│ System Actions:               │
│ ✓ Checks each item's          │
│   ingredients                 │
│ ✓ Aggregates totals           │
│ ✓ Identifies shortages        │
│ ✓ Returns summary             │
└───────────┬───────────────────┘
            │ All items available?
            │ ┌─────────────┬──────────────────┐
            │ YES          NO
            │ │             │
            ▼ ▼             ▼
        Continue       Error: Reduce quantity
                       or wait for stock
```

### 2. Payment Processing Phase (Cashier)

```
PAYMENT FLOW - CASH:
┌─────────────────────────────────┐
│ 1. Update Payment Status        │
│    PUT /api/orders/:id/payment  │
│    Body: {                      │
│      payment_status: 'paid',    │
│      payment_method: 'cash'     │
│    }                            │
└────────────┬────────────────────┘
             │ Updates order.payment_status to 'paid'
             │
             ▼
        Order ready for kitchen


PAYMENT FLOW - ONLINE (PayMongo QR):
┌─────────────────────────────────────┐
│ 1. Create Payment Intent            │
│    POST /api/orders/:id/            │
│        paymongo-payment             │
│                                     │
│ System Actions:                     │
│ ✓ Gets order total                  │
│ ✓ Converts PHP to centavos          │
│   (multiply by 100)                 │
│ ✓ Calls PayMongo API to create      │
│   payment intent                    │
│ ✓ Stores payment record in DB:      │
│   - payment_intent_id               │
│   - order_id, amount, currency      │
│   - status: 'awaiting_payment...'   │
│   - qr_code_url, qr_code_data       │
│   - qr_code_expires_at              │
│   - paymongo_response (full JSON)   │
│ ✓ Updates order payment_method to   │
│   'paymongo', status to 'pending'   │
└────────────┬────────────────────────┘
             │
             │ Response:
             │ {
             │   qrCodeUrl: 'https://...',
             │   qrCodeData: 'base64...',
             │   expiresAt: 'ISO timestamp',
             │   amount: 12500,
             │   ...
             │ }
             ▼
        ┌──────────────────────────┐
        │ Frontend displays QR code│
        │ Customer scans & pays    │
        └──────────┬───────────────┘
                   │
        ┌──────────▼───────────────┐
        │ PayMongo Webhook         │
        │ (Asynchronous)           │
        │ POST /webhooks/paymongo  │
        │ Event: payment.succeeded │
        │ Updates:                 │
        │ • payments.status        │
        │ • payments.payment_status│
        │ • payments.paid_at       │
        │ • orders.payment_status  │
        │   to 'paid'              │
        └──────────┬───────────────┘
                   │
                   ▼
             Order status: paid
             Ready for kitchen
```

### 3. Kitchen Operations Phase (Kitchen Staff)

```
KITCHEN WORKFLOW:

┌─────────────────────────────────┐
│ 1. View Pending Orders          │
│    GET /api/orders/kitchen/     │
│        orders                   │
│                                 │
│ System Returns:                 │
│ • All orders with status:       │
│   pending, preparing, ready     │
│ • Sorted by created_at          │
│ • Includes items & ingredients  │
│ • Customer info for dine-in     │
│ • Table numbers for dine-in     │
└────────────┬────────────────────┘
             │
             │ KITCHEN STAFF SEES:
             │ ┌────────────────────────────┐
             │ │ ORDER #1001               │
             │ ├────────────────────────────┤
             │ │ Status: PENDING           │
             │ │ Customer: John Doe        │
             │ │ Table: 5                  │
             │ │ Items:                    │
             │ │ • Burger x2               │
             │ │   - No onions             │
             │ │   - Extra sauce           │
             │ │ • French Fries x2         │
             │ │ • Grilled Fish x1         │
             │ │   - Extra lemon           │
             │ │ Ingredients needed:       │
             │ │ • Beef patties: 2         │
             │ │ • Buns: 2                 │
             │ │ • Potatoes: 2 portions    │
             │ │ • Fish fillets: 1         │
             │ │ • Vegetables: mixed       │
             │ └────────────────────────────┘
             │
┌────────────▼─────────────────────┐
│ 2. Start Preparation             │
│    PUT /api/orders/:id/status    │
│    Body: {                       │
│      status: 'preparing',        │
│      notes: 'Starting prep'      │
│    }                             │
│                                  │
│ System Actions:                  │
│ ✓ Updates order.status           │
│ ✓ Creates entry in                │
│   order_status_history:          │
│   - status: 'preparing'          │
│   - updated_by: kitchen_user_id  │
│   - created_at: NOW              │
│ ✓ Records actual_prep_time start │
└────────────┬─────────────────────┘
             │
             │ [Kitchen prepares items]
             │ [About 10 minutes later]
             │
┌────────────▼─────────────────────┐
│ 3. Items Ready                   │
│    PUT /api/orders/:id/status    │
│    Body: {                       │
│      status: 'ready',            │
│      notes: 'Plated & waiting'   │
│    }                             │
│                                  │
│ System Actions:                  │
│ ✓ Updates order.status           │
│ ✓ Creates status history entry   │
│ ✓ Kitchen/Cashier alerted        │
└────────────┬─────────────────────┘
             │ Order appears as ready
             │ for cashier/waitstaff
             │
┌────────────▼─────────────────────┐
│ 4. Order Served/Completed        │
│    PUT /api/orders/:id/status    │
│    Body: {                       │
│      status: 'completed',        │
│      notes: 'Delivered to table' │
│    }                             │
│                                  │
│ System Actions:                  │
│ ✓ Updates order.status           │
│ ✓ Sets order.completed_at        │
│ ✓ Calculates actual_prep_time    │
│ ✓ Creates final status history   │
│ ✓ Marks order as finished        │
└─────────────────────────────────┘
```

### 4. Ingredient Checking During Order Preparation

```
REAL-TIME INVENTORY CHECK:

┌─────────────────────────────────────────┐
│ Scenario: Kitchen wants to check if     │
│ an order can be prepared                │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ GET /api/orders/:orderId/               │
│     ingredient-validation               │
│                                         │
│ System Flow:                            │
│ 1. Fetch order from DB                  │
│ 2. Get all order_items                  │
│ 3. For each item:                       │
│    a. Get menu_item_ingredients         │
│    b. Get current ingredient stock      │
│    c. Calculate total needed            │
│       = quantity_required * qty_ordered │
│    d. Check if stock >= needed          │
│    e. Categorize:                       │
│       OUT_OF_STOCK (0 available)        │
│       LOW_STOCK (< min_threshold)       │
│       SUFFICIENT (enough stock)         │
│ 4. Aggregate results                    │
│                                         │
│ Returns: {                              │
│   order_id: 'abc123',                   │
│   order_number: '1001',                 │
│   customer_name: 'John Doe',            │
│   overall_validation: {                 │
│     all_items_available: true,          │
│     total_items: 3,                     │
│     available_items: 3,                 │
│     unavailable_items: 0                │
│   },                                    │
│   ingredient_summary: {                 │
│     total_unavailable: 0,               │
│     total_low_stock: 1,                 │
│     total_sufficient: 8                 │
│   },                                    │
│   item_details: [                       │
│     {                                   │
│       order_item_id: 'item1',           │
│       menu_item_name: 'Burger',         │
│       quantity: 2,                      │
│       is_available: true,               │
│       unavailable_ingredients: [],      │
│       stock_summary: {                  │
│         out_of_stock_count: 0,          │
│         low_stock_count: 0,             │
│         sufficient_count: 4             │
│       }                                 │
│     },                                  │
│     ...                                 │
│   ]                                     │
│ }                                       │
└─────────────────────────────────────────┘

KITCHEN DECISION TREE:

Can all items be prepared?
│
├─ YES (all_items_available: true)
│  └─ Start preparation immediately
│     Update status to 'preparing'
│
└─ NO (some items unavailable)
   ├─ Which ingredients are missing?
   │  └─ Check unavailable_ingredients list
   │
   ├─ For LOW_STOCK items:
   │  └─ Possibly ask customer to reduce qty
   │     or inform of delay
   │
   └─ For OUT_OF_STOCK items:
      └─ Cannot prepare, inform cashier
         Suggest alternative menu items
```

### 5. Receipt Generation

```
RECEIPT FLOW:

┌─────────────────────────────────────┐
│ GET /api/orders/:orderId/receipt    │
│                                     │
│ System Actions:                     │
│ ✓ Fetches order details             │
│ ✓ Gets all order items              │
│ ✓ Gets payment history              │
│ ✓ Gets status history               │
│ ✓ Formats data for printing         │
└────────────┬────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────┐
    │ SAMPLE RECEIPT DATA:            │
    ├─────────────────────────────────┤
    │ Order #1001                     │
    │ Date: 2024-01-15 12:30 PM       │
    │                                 │
    │ Customer: John Doe              │
    │ Phone: 09123456789              │
    │ Table: 5                        │
    │ Type: Dine-In                   │
    │                                 │
    │ ITEMS:                          │
    │ Burger x2           ₱300.00     │
    │   - No onions                   │
    │   - Extra sauce                 │
    │ French Fries x2     ₱100.00     │
    │ Grilled Fish x1     ₱250.00     │
    │   - Extra lemon                 │
    │ ───────────────────             │
    │ Subtotal:           ₱650.00     │
    │ Discount (10%):    -₱65.00      │
    │ Tax (8%):           ₱46.80      │
    │ ───────────────────             │
    │ TOTAL:              ₱631.80     │
    │                                 │
    │ PAYMENT:                        │
    │ Method: PayMongo QR             │
    │ Status: PAID                    │
    │ Paid at: 12:35 PM               │
    │ Reference: PAYMONGO_12345       │
    │                                 │
    │ STATUS HISTORY:                 │
    │ 12:30 - Order Created           │
    │ 12:31 - Preparing               │
    │ 12:40 - Ready                   │
    │ 12:42 - Completed               │
    │                                 │
    │ Special Notes:                  │
    │ "Extra hot sauce please"        │
    └─────────────────────────────────┘
```

---

## Stock Alert System Flow

```
AUTOMATIC STOCK ALERT TRIGGER:

When ingredient stock decreases below threshold:

1. Stock Movement Created
   POST /api/inventory/ingredients/:id/adjust-stock
   Body: { quantity: -5, reason: 'Used for orders' }
   └─ Creates entry in stock_movements table

2. System Checks Thresholds
   current_stock (10) < min_stock_threshold (20)?
   └─ YES: Create alert

3. Alert Created in stock_alerts Table
   ├─ ingredient_id: abc123
   ├─ alert_type: 'low_stock'
   ├─ current_stock: 10
   ├─ threshold_value: 20
   ├─ message: 'Ingredient X is running low'
   ├─ is_resolved: false
   └─ created_at: NOW

4. Alert Retrieved by Admin
   GET /api/inventory/stock-alerts
   GET /api/orders/inventory/alerts (from orders API)

5. Admin Action
   PUT /api/inventory/stock-alerts/:id/resolve
   Body: { resolution_notes: 'New stock arrived' }
   └─ Marks is_resolved: true
   └─ Sets resolved_by, resolved_at
```

---

## Concurrent Order Handling

### Potential Race Condition Scenario

```
Scenario: Two orders need beef patties, only 2 available

Time 0:00
┌──────────────────────┐    ┌──────────────────────┐
│ Order #1001          │    │ Order #1002          │
│ Burger x2 (4 patties)│    │ Burger x1 (2 patties)│
│ Terminal A (Cashier1)│    │ Terminal B (Cashier2)│
└──────────────────────┘    └──────────────────────┘

Time 0:01
Cashier1: POST /api/orders/order1/items
├─ Checks availability
├─ RPC: get_menu_item_availability(burger, 2)
├─ Stock check: beef_patties = 2
├─ Result: AVAILABLE (2 >= 4 needed)  ❌ BUG: Should be NO

Time 0:02
Cashier2: POST /api/orders/order2/items
├─ Checks availability
├─ RPC: get_menu_item_availability(burger, 1)
├─ Stock check: beef_patties = 2
├─ Result: AVAILABLE (2 >= 2 needed)  ✓ OK

Both orders added to DB simultaneously!
But stock = 2, needed = 6 items total

KITCHEN PROBLEM:
Cannot fulfill both orders!

SOLUTION NEEDED:
✓ Database-level locking/transactions
✓ Reserve stock during order creation
✓ Release reservation if order cancelled
✓ Decrement actual stock when order completed
```

---

## Complete Status Transition Diagram

```
ORDER STATUS LIFECYCLE:

┌──────────┐
│ PENDING  │ (Initial state)
└────┬─────┘
     │ Kitchen starts prep
     ▼
┌───────────┐
│PREPARING  │ (Kitchen is working)
└────┬──────┘
     │ Items ready to serve
     ▼
┌─────────┐
│ READY   │ (Waiting for pickup/serve)
└────┬────┘
     │ Order served to customer
     ▼
┌──────────┐
│COMPLETED │ (Final state)
└──────────┘

ALTERNATIVE PATH - CANCELLATION:

┌──────────┐
│ PENDING  │ ◄───────┐
└────┬─────┘         │
     │ Cannot cancel from these states:
     ▼           - If payment_status = 'paid'
┌───────────┐    - If status = 'completed'
│PREPARING  │ ✓
└────┬──────┘
     │ CAN cancel (refund required if paid)
     ▼
┌─────────┐ ✓
│ READY   │
└────┬────┘
     │
     ▼
┌──────────┐
│CANCELLED │
└──────────┘

PAYMENT STATUS (Independent):
┌────────┐
│ UNPAID │ (Default)
└────┬───┘
     ├─ Cash/Bank payment received
     │  └─ PAID
     │
     ├─ PayMongo payment initiated
     │  └─ PENDING
     │     ├─ Payment succeeded
     │     │  └─ PAID
     │     ├─ Payment failed
     │     │  └─ FAILED
     │     └─ Payment cancelled
     │        └─ CANCELLED
     │
     └─ Refund initiated
        └─ REFUNDED
```

---

## Performance Considerations

### Database Queries by Endpoint

```
GET /api/orders/kitchen/orders
├─ Query: Select * from orders
├─ Filters: status IN (pending, preparing, ready)
├─ Sort: created_at DESC
├─ Joins: order_items, menu_items
├─ Typical result: 10-50 rows
└─ Recommended index: (status, created_at)

GET /api/orders/:id/ingredient-validation
├─ Query: Select order with items
├─ For each item:
│  └─ RPC: get_menu_item_availability
│     └─ Complex calculation with joins
├─ Joins: 5+ tables per item
├─ N+1 risk: HIGH (loops through items)
└─ Optimization: Batch RPC calls if possible

GET /api/orders/:id/ingredient-summary
├─ Query: Select order items with ingredients
├─ Complex select with nested arrays
├─ Joins: order_items → menu_items → menu_item_ingredients → ingredients
├─ Aggregations: SUM, COUNT
└─ Typical: 5-30 ingredients per order

POST /api/orders/:id/paymongo-payment
├─ Database query: Get order
├─ External API call: PayMongo (500ms-2s)
├─ Database write: Create payment record
├─ Database update: Update order payment_method, status
└─ Recommended: Make PayMongo call async if possible
```

### Caching Opportunities

```
✓ Menu items (low change frequency)
  └─ Cache for 1 hour or until invalidated
  
✓ Menu categories
  └─ Cache for 1 hour
  
✓ Ingredient stock (updated frequently during service)
  └─ Cache for 1-5 minutes
  └─ Invalidate on stock movement
  
✓ Payment methods configuration
  └─ Cache for 1 hour
  └─ Invalidate on config update
  
✗ Orders (constantly changing)
  └─ Real-time required, minimal caching
  
✗ Stock movements (audit trail)
  └─ Real-time required
```

