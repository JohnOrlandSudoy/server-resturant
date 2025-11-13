# Restaurant API - Visual Reference Card

## 🎨 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     RESTAURANT MANAGEMENT API                   │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐
│  POS System  │ (Cashier App)
│  - Orders    │
│  - Payments  │
│  - Receipts  │
└──────┬───────┘
       │
       │ REST API
       │ (Express.js)
       │
┌──────▼────────────────────────────────────────────────────────┐
│                   AUTHENTICATION LAYER                         │
│  • JWT Token Validation                                        │
│  • Role-Based Access Control (RBAC)                            │
│  • Middleware: cashierOrAdmin, kitchenOrAdmin, adminOnly       │
└──────┬────────────────────────────────────────────────────────┘
       │
┌──────▼────────────────────────────────────────────────────────┐
│              ROUTE HANDLERS (Express Router)                   │
├────────────────────────────────────────────────────────────────┤
│ orderRoutes.ts (60 endpoints)      menuRoutes.ts (20 endpoints)│
│ inventoryRoutes.ts (15 endpoints)  paymentRoutes.ts (5 endpoints)
│ employeeRoutes.ts (1 endpoint)     customerRoutes.ts (1 endpoint)
└──────┬────────────────────────────────────────────────────────┘
       │
┌──────▼────────────────────────────────────────────────────────┐
│              SERVICE LAYER                                      │
│  • supabaseService()  (Database operations)                    │
│  • paymongoService()  (Payment operations)                     │
│  • logger (Logging)                                            │
└──────┬────────────────────────────────────────────────────────┘
       │
┌──────▼────────────────────────────────────────────────────────┐
│         EXTERNAL SERVICES                                       │
├────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐      ┌──────────────────────────┐    │
│  │  Supabase           │      │  PayMongo                │    │
│  │  ├─ PostgreSQL DB   │      │  ├─ QR Code Generation   │    │
│  │  ├─ Auth            │      │  ├─ Payment Intent       │    │
│  │  └─ Storage Bucket  │      │  └─ Webhook Callbacks    │    │
│  └─────────────────────┘      └──────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
       │
┌──────▼────────────────────────────────────────────────────────┐
│              CLIENTS                                            │
├────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌────────────┐  ┌──────────────┐             │
│  │   Kitchen   │  │   Cashier  │  │    Admin     │             │
│  │   Display   │  │   Terminal │  │  Dashboard   │             │
│  └─────────────┘  └────────────┘  └──────────────┘             │
└──────────────────────────────────────────────────────────────┘
```

---

## 🔐 User Roles & Permissions Matrix

```
                          │ Cashier │ Kitchen │ Admin │
──────────────────────────┼─────────┼─────────┼───────┤
CREATE ORDER              │    ✅   │    ❌   │   ✅  │
VIEW ALL ORDERS           │    ✅   │    ❌   │   ✅  │
VIEW KITCHEN ORDERS       │    ❌   │    ✅   │   ✅  │
ADD ITEMS TO ORDER        │    ✅   │    ❌   │   ✅  │
UPDATE ORDER PAYMENT      │    ✅   │    ❌   │   ✅  │
UPDATE ORDER STATUS       │    ❌   │    ✅   │   ✅  │
DELETE ORDER              │    ❌   │    ❌   │   ✅  │
CREATE MENU ITEM          │    ❌   │    ❌   │   ✅  │
MANAGE INGREDIENTS        │    ❌   │    ❌   │   ✅  │
MANAGE DISCOUNTS          │    ❌   │    ❌   │   ✅  │
CREATE PAYMENT METHOD     │    ❌   │    ❌   │   ✅  │
VIEW RECEIPTS             │    ✅   │    ❌   │   ✅  │
CHECK STOCK ALERTS        │    ❌   │    ❌   │   ✅  │
```

---

## 📊 Order Status Lifecycle

```
                    ┌──────────────┐
                    │   PENDING    │ ← Order Created
                    │ (Initial)    │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  PREPARING   │ ← Kitchen Starts
                    │  (In Progress)│
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │    READY     │ ← Done, Waiting to Serve
                    │ (Plated)     │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  COMPLETED   │ ← Served to Customer
                    │  (Finished)  │
                    └──────────────┘

ALTERNATIVE PATH (Cancellation):
    ┌──────────────┐
    │   PENDING    │
    │ ╔═══════════╗│
    │ ║ CAN       ║│
    │ ║ CANCEL    ║│
    │ ╚═════╤═════╝│
    └──────┬───────┘
           │
    ┌──────▼──────────┐
    │   CANCELLED     │
    │  (If still      │
    │   unpaid)       │
    └─────────────────┘

PAYMENT STATUS (Independent):
  unpaid → paid (after cash/PayMongo)
        → refunded (after refund)
        → failed (if payment fails)
        → cancelled (if cancelled before paid)
```

---

## 💰 Payment Methods Flow

```
ORDER COMPLETE → PAYMENT NEEDED
                    │
        ┌───────────┼───────────┐
        │           │           │
        ▼           ▼           ▼
     CASH        ONLINE     OFFLINE
     (Quick)    (PayMongo)   (Bank)
        │           │           │
        │           ├───────┬───┘
        │           │       │
        ▼           ▼       ▼
    PAID    QR CODE SCAN   MANUAL
             REQUIRED      ENTRY
             
             │
             ▼
        WAITING FOR
        PAYMENT
             │
    ┌────────┴────────┐
    │                 │
    ▼                 ▼
 WEBHOOK          MANUAL SYNC
 (Automatic)      (Manual)
    │                 │
    └────────┬────────┘
             ▼
         PAID
          │
          ▼
    ORDER READY
    FOR KITCHEN
```

---

## 🍽️ Complete Order Flow Sequence

```
╔════════════════╗
║   CASHIER      ║
╚════════════════╝
      │
      │ 1. Create empty order
      ├─► POST /api/orders
      │   └─► order_id: abc123, status: pending
      │
      │ 2. Add items (with validation)
      ├─► POST /api/orders/abc123/items (Burger x2)
      │   └─► Check: Beef available?
      │       ✓ YES → Item added
      │       ✗ NO  → Error: Insufficient stock
      │
      ├─► POST /api/orders/abc123/items (Fries x2)
      │
      │ 3. Validate entire order
      ├─► GET /api/orders/abc123/ingredient-validation
      │   └─► Response: All items available ✓
      │
      │ 4. Process payment
      │   ├─► Cash: PUT /api/orders/abc123/payment
      │   │         status='paid', method='cash'
      │   │
      │   └─► PayMongo: POST /api/orders/abc123/paymongo-payment
      │                 └─► QR Code generated
      │
      └─► Order status: payment_status='paid'
          order_status='pending' (ready for kitchen)

╔════════════════╗
║     KITCHEN    ║
╚════════════════╝
      │
      │ 5. View pending orders
      ├─► GET /api/orders/kitchen/orders
      │   └─► See: Order #abc123, Burger x2, Fries x2
      │
      │ 6. Start preparation
      ├─► PUT /api/orders/abc123/status
      │   └─► status: 'preparing'
      │       History entry created
      │
      │ 7. Items ready to serve
      ├─► PUT /api/orders/abc123/status
      │   └─► status: 'ready'
      │       Kitchen staff notified
      │
      │ 8. Serve to customer
      └─► PUT /api/orders/abc123/status
          └─► status: 'completed'
              completed_at: timestamp
              History entry created

╔════════════════╗
║     BOTH       ║
╚════════════════╝
      │
      │ 9. Generate receipt (anytime)
      └─► GET /api/orders/abc123/receipt
          └─► Full receipt with items, payment, history
```

---

## 📦 Inventory Flow

```
                    INGREDIENT STOCK TRACKING

Current Stock: 50 units
Min Threshold: 20 units
Max Threshold: 100 units

        ┌─────────────────────────────────┐
        │   STOCK SUFFICIENT (50)          │
        │   ✓ Can fulfill orders           │
        │   ✓ No alerts                    │
        └──────────┬──────────────────────┘
                   │
          ─ 10 units used in orders
                   │
                   ▼
        ┌─────────────────────────────────┐
        │   STOCK LOW (40)                 │
        │   ✓ Can fulfill orders           │
        │   ✓ No alerts yet                │
        └──────────┬──────────────────────┘
                   │
          ─ 20 more units used
                   │
                   ▼
        ┌─────────────────────────────────┐
        │   STOCK AT THRESHOLD (20)        │
        │   ✓ Can fulfill orders           │
        │   🟠 LOW_STOCK alert created     │
        │   ─► Admin should restock        │
        └──────────┬──────────────────────┘
                   │
          ─ 1 more unit used
                   │
                   ▼
        ┌─────────────────────────────────┐
        │   STOCK BELOW THRESHOLD (19)    │
        │   ⚠️ Limits new orders            │
        │   🔴 OUT_OF_STOCK alert created  │
        │   ─► Cannot add items with this  │
        └──────────┬──────────────────────┘
                   │
       + 50 units restocked
                   │
                   ▼
        ┌─────────────────────────────────┐
        │   STOCK REPLENISHED (69)        │
        │   ✓ Alerts resolved              │
        │   ✓ Ready for orders again       │
        └─────────────────────────────────┘

AUDIT TRAIL (stock_movements):
  ├─ Movement 1: OUT -10 (orders prepared)
  ├─ Movement 2: OUT -20 (orders prepared)
  ├─ Movement 3: OUT -1 (orders prepared)
  └─ Movement 4: IN +50 (delivery received)
```

---

## 🎯 Real-Time Decision Trees

### Adding Item to Order Decision Tree

```
Cashier: "Add 5 Burgers to Order"
    │
    ▼
Check: Is menu item active?
    ├─ NO → Error: Menu item not available
    │
    └─ YES → Check: Is menu item available?
        ├─ NO → Error: Item not available
        │
        └─ YES → Check: Ingredients in stock?
            (RPC: get_menu_item_availability)
            │
            ├─ Beef Patties: 5 available, need 10
            │   Status: INSUFFICIENT
            │
            ├─ Buns: 10 available, need 5
            │   Status: SUFFICIENT
            │
            ├─ Sauce: 20 available, need 5
            │   Status: SUFFICIENT
            │
            └─ Decision:
                NOT ALL INGREDIENTS AVAILABLE
                │
                ├─ Option 1: Error message
                │            "Cannot add 5 burgers
                │             Need: 10 beef patties
                │             Have: 5 beef patties"
                │
                └─ Option 2: Ask customer
                           "Can you take 2 burgers?"
                           (2 burgers = 4 patties needed ✓)
```

### Payment Processing Decision Tree

```
Cashier: "Complete Payment"
    │
    ├─ Payment Method: CASH?
    │  └─ YES → Set payment_status = 'paid'
    │          Order ready immediately
    │
    └─ Payment Method: PayMongo?
       └─ YES → Create payment intent
               │
               ├─ Success: Return QR code
               │          Cashier displays QR
               │          Customer scans
               │          │
               │          ├─ SUCCESS
               │          │  └─ Webhook received
               │          │     Status updated to 'paid'
               │          │
               │          └─ TIMEOUT/FAIL
               │             └─ Manual sync available
               │
               └─ Error: Failed to create payment
                        Retry or use cash
```

---

## 🚨 Alert System Priority

```
ALERT TYPES (Priority Order)

🔴 CRITICAL: OUT_OF_STOCK
   ├─ current_stock = 0
   ├─ Impact: Cannot add any orders with this item
   ├─ Action: IMMEDIATE RESTOCK REQUIRED
   └─ System: Blocks orders

🟠 HIGH: LOW_STOCK
   ├─ current_stock ≤ min_threshold
   ├─ Impact: Limited order capacity
   ├─ Action: Restock soon
   └─ System: Allows orders if quantity available

🟡 MEDIUM: EXPIRY_WARNING
   ├─ expiry_date approaching (e.g., within 7 days)
   ├─ Impact: Plan to use item before expiry
   ├─ Action: Use first / discard after date
   └─ System: Warning only

🟢 LOW: STOCK_MOVEMENT_ANOMALY
   ├─ Unusual movement pattern detected
   ├─ Impact: Investigate usage
   ├─ Action: Review and adjust
   └─ System: Logging/notification
```

---

## 📈 API Response Status Codes

```
✅ 200 OK             - Request succeeded
✅ 201 CREATED        - Resource created
❌ 400 BAD REQUEST    - Invalid input/validation failed
❌ 401 UNAUTHORIZED   - Missing/invalid token
❌ 403 FORBIDDEN      - Insufficient permissions
❌ 404 NOT FOUND      - Resource doesn't exist
❌ 409 CONFLICT       - Data conflict (e.g., duplicate)
❌ 500 SERVER ERROR   - Unexpected server error
❌ 503 SERVICE UNAVAILABLE - External service down
```

---

## 🔍 Common API Patterns

### Pattern 1: Create → Add Items → Validate → Pay
```
POST /api/orders
├─ Response: order_id

POST /api/orders/:id/items
POST /api/orders/:id/items
├─ Responses: item_id(s)

GET /api/orders/:id/ingredient-validation
├─ Check: all_items_available

PUT /api/orders/:id/payment
├─ Response: payment_status: paid
```

### Pattern 2: Read with Filtering & Pagination
```
GET /api/endpoint?page=1&limit=50&filter=value
├─ Response: 
│  ├─ data: []
│  └─ pagination:
│     ├─ page: 1
│     ├─ limit: 50
│     ├─ total: 150
│     └─ totalPages: 3
```

### Pattern 3: Create → Get → Update → Read History
```
POST /api/resource
├─ Response: resource_id

GET /api/resource/:id
├─ Get current state

PUT /api/resource/:id
├─ Update fields

GET /api/resource/:id/history
├─ Get change audit trail
```

---

## ⚡ Quick Performance Tips

### ✓ DO's
```
✅ Cache menu items (change infrequently)
✅ Paginate large result sets
✅ Use indexed fields in WHERE clauses
✅ Batch operations when possible
✅ Call RPC functions efficiently
✅ Pre-validate data before API calls
```

### ✗ DON'Ts
```
❌ Don't load all orders without pagination
❌ Don't validate inventory after order created
❌ Don't make separate API calls for each item
❌ Don't skip role validation checks
❌ Don't retry PayMongo indefinitely
❌ Don't expose sensitive error details
```

---

## 🔗 Entity Relationship at a Glance

```
user_profiles (People)
    │
    ├─ creates → orders → order_items → menu_items
    │             │         │              │
    │             │         │              └─ menu_item_ingredients → ingredients
    │             │         │
    │             ├─ order_status_history
    │             │
    │             ├─ order_discounts ←─ discounts
    │             │
    │             └─ payments / offline_payments
    │
    ├─ manages → ingredients
    │            │
    │            ├─ stock_movements
    │            │
    │            └─ stock_alerts
    │
    ├─ creates → menu_items, menu_categories
    │
    └─ configures → payment_methods_config
```

---

## 📱 Common Mobile/Frontend Queries

```
KITCHEN DISPLAY BOARD:
  GET /api/orders/kitchen/orders (auto-refresh every 5s)
  Filters: status IN (pending, preparing, ready)
  Display: Order #, Items, Table, Prep Time

CASHIER REGISTER:
  POST /api/orders (new order)
  POST /api/orders/:id/items (add item)
  GET /api/orders/menu-items/:id/availability (check stock)
  PUT /api/orders/:id/payment (finalize)

ADMIN DASHBOARD:
  GET /api/inventory/stock-alerts (active alerts)
  GET /api/inventory/low-stock (items needing restock)
  GET /api/orders (all orders with filters)
  GET /api/employees (staff list)

CUSTOMER RECEIPT:
  GET /api/orders/:id/receipt (after order completed)
```

---

## 🎓 Implementation Checklist

```
BEFORE DEPLOYING TO PRODUCTION:

Database Setup:
  ☐ All tables created
  ☐ Foreign keys configured
  ☐ Indexes created for performance
  ☐ RPC functions deployed
  ☐ Views created
  ☐ RLS policies configured (if needed)

API Setup:
  ☐ All route handlers tested
  ☐ Authentication middleware working
  ☐ Error handling in place
  ☐ Logging configured
  ☐ Rate limiting added

External Services:
  ☐ PayMongo account setup
  ☐ PayMongo webhook URL registered
  ☐ Supabase storage buckets created
  ☐ Email service configured (if needed)

Testing:
  ☐ Unit tests written
  ☐ Integration tests passed
  ☐ Load testing completed
  ☐ Security audit done
  ☐ Error scenarios tested

Monitoring:
  ☐ Error tracking setup
  ☐ Performance monitoring
  ☐ Logging aggregation
  ☐ Alerts configured
  ☐ Backup strategy defined

Documentation:
  ☐ API documentation complete
  ☐ Database schema documented
  ☐ Deployment guide written
  ☐ Troubleshooting guide ready
  ☐ Team trained on system
```

---

**This card covers all major aspects of your restaurant management system. Print or bookmark for quick reference!**

