# Restaurant Management API - Comprehensive Analysis

## Overview
This is a complete restaurant management system with capabilities for order management, kitchen operations, inventory management, payment processing, and employee role-based access control.

---

## Database Schema Analysis (Supabase)

### Core Tables

#### 1. **user_profiles**
- **Purpose**: User authentication and role management
- **Key Fields**:
  - `id` (UUID, PK) - User identifier
  - `username` (VARCHAR, UNIQUE) - Login username
  - `role` (USER-DEFINED: cashier, kitchen, admin, etc.)
  - `email`, `phone`, `avatar_url`
  - `is_active` - Soft delete flag
  - `password_hash` - Encrypted password
  - `email_verified`, `email_verification_token`
  - `password_reset_token`, `password_reset_expires`
- **Relationships**: Created by relationships to multiple tables

#### 2. **orders**
- **Purpose**: Order transaction records
- **Key Fields**:
  - `id` (UUID, PK) - Order identifier
  - `order_number` (VARCHAR, UNIQUE) - Human-readable order ID
  - `order_type` (ENUM: 'dine_in', 'takeout')
  - `status` (ENUM: 'pending', 'preparing', 'ready', 'completed', 'cancelled')
  - `payment_status` (ENUM: 'unpaid', 'paid', 'refunded', 'pending', 'failed', 'cancelled')
  - `payment_method` (ENUM: 'cash', 'gcash', 'card', 'paymongo', 'qrph')
  - `customer_name`, `customer_phone`, `table_number`
  - `subtotal`, `discount_amount`, `tax_amount`, `total_amount`
  - `special_instructions`, `estimated_prep_time`, `actual_prep_time`
  - `created_by` (FK to user_profiles)
  - `updated_by` (FK to user_profiles)
  - `created_at`, `updated_at`, `completed_at`
- **Relationships**: One-to-many with order_items, payments, offline_payments, order_discounts, order_status_history

#### 3. **order_items**
- **Purpose**: Individual line items in orders
- **Key Fields**:
  - `id`, `order_id` (FK), `menu_item_id` (FK)
  - `quantity`, `unit_price`, `total_price`
  - `customizations` (JSON)
  - `special_instructions`
  - `created_at`
- **Relationships**: FK to orders, menu_items

#### 4. **menu_items**
- **Purpose**: Menu catalog
- **Key Fields**:
  - `id` (UUID, PK)
  - `name`, `description`
  - `price` (NUMERIC)
  - `category_id` (FK to menu_categories)
  - `image_url`, `image_file`, `image_mime_type`, `image_size`
  - `prep_time` (minutes)
  - `is_available`, `is_featured`, `is_active`
  - `calories` (INTEGER)
  - `allergens` (ARRAY)
  - `popularity` (counter)
  - `created_by`, `updated_by`
  - `created_at`, `updated_at`, `image_uploaded_at`
- **Relationships**: 
  - One-to-many with menu_item_ingredients
  - FK to menu_categories
  - FK to user_profiles (creator/updater)

#### 5. **menu_item_ingredients**
- **Purpose**: Ingredient requirements for menu items
- **Key Fields**:
  - `id`, `menu_item_id` (FK), `ingredient_id` (FK)
  - `quantity_required` (NUMERIC)
  - `unit` (VARCHAR)
  - `is_optional` (BOOLEAN)
  - `created_by`
  - `created_at`
- **Relationships**: FK to menu_items, ingredients

#### 6. **ingredients**
- **Purpose**: Inventory management
- **Key Fields**:
  - `id`, `name` (UNIQUE)
  - `description`, `unit`
  - `current_stock` (NUMERIC)
  - `min_stock_threshold`, `max_stock_threshold`
  - `cost_per_unit`, `supplier`, `category`, `storage_location`
  - `expiry_date`
  - `is_active`
  - `created_by`, `updated_by`
  - `created_at`, `updated_at`
- **Relationships**: 
  - One-to-many with menu_item_ingredients
  - One-to-many with stock_movements
  - One-to-many with stock_alerts

#### 7. **menu_categories**
- **Purpose**: Menu organization
- **Key Fields**:
  - `id`, `name` (UNIQUE)
  - `description`, `image_url`, `image_file`
  - `sort_order`
  - `is_active`
  - `created_by`, `updated_by`
  - `created_at`, `updated_at`

#### 8. **stock_movements**
- **Purpose**: Audit trail for inventory changes
- **Key Fields**:
  - `id`, `ingredient_id` (FK)
  - `movement_type` (ENUM: 'in', 'out', 'adjustment', 'spoilage')
  - `quantity` (NUMERIC)
  - `reason`, `reference_number`, `notes`
  - `performed_by` (FK to user_profiles)
  - `created_at`

#### 9. **stock_alerts**
- **Purpose**: Low stock and expiry warnings
- **Key Fields**:
  - `id`, `ingredient_id` (FK)
  - `alert_type` (ENUM: 'low_stock', 'out_of_stock', 'expiry_warning')
  - `current_stock`, `threshold_value`
  - `message`
  - `is_resolved`
  - `resolved_by`, `resolved_at`
  - `created_at`

#### 10. **payments** (PayMongo Integration)
- **Purpose**: Online payment tracking
- **Key Fields**:
  - `id`, `payment_intent_id` (UNIQUE), `order_id` (FK), `order_number`
  - `amount`, `currency` (default: 'PHP')
  - `description`
  - `status` (USER-DEFINED: awaiting_payment_method, processing, succeeded, failed, cancelled)
  - `payment_status` (pending, paid, refunded, failed, cancelled)
  - `payment_method` (paymongo, gcash, card, etc.)
  - `payment_source_type` (qrph, card, etc.)
  - `qr_code_url`, `qr_code_data`, `qr_code_expires_at`
  - `fee_amount`, `net_amount`
  - `external_reference_number`, `error_message`, `error_code`
  - `paid_at`, `failed_at`, `cancelled_at`
  - `paymongo_response` (JSONB)
  - `webhook_events` (JSONB array)
  - `metadata` (JSONB)
  - `created_by`, `updated_by`

#### 11. **offline_payments**
- **Purpose**: Cash and offline payment tracking
- **Key Fields**:
  - `id`, `order_id` (FK), `payment_method`
  - `amount`, `currency`
  - `payment_status` (paid, etc.)
  - `transaction_id`, `receipt_number` (UNIQUE)
  - `notes`, `metadata` (JSONB)
  - `created_by`, `created_at`, `updated_at`

#### 12. **order_discounts**
- **Purpose**: Applied discounts to orders
- **Key Fields**:
  - `id`, `order_id` (FK), `discount_id` (FK)
  - `discount_amount`
  - `applied_at`

#### 13. **discounts**
- **Purpose**: Discount management
- **Key Fields**:
  - `id`, `code` (UNIQUE, VARCHAR)
  - `name`, `description`
  - `discount_type` (ENUM: 'percentage', 'fixed_amount')
  - `discount_value`
  - `minimum_order_amount`
  - `maximum_discount_amount`
  - `is_active`
  - `valid_from`, `valid_until`
  - `usage_limit`, `used_count`
  - `created_by`, `created_at`, `updated_at`

#### 14. **order_status_history**
- **Purpose**: Status change audit trail
- **Key Fields**:
  - `id`, `order_id` (FK)
  - `status`
  - `notes`
  - `updated_by` (FK to user_profiles)
  - `created_at`

#### 15. **payment_methods_config**
- **Purpose**: Payment method configuration
- **Key Fields**:
  - `id`, `method_key` (UNIQUE, ENUM: cash, gcash, card, paymongo, qrph, grab_pay, shopeepay)
  - `method_name`, `method_description`
  - `is_enabled`, `is_online`
  - `requires_setup`
  - `display_order`, `icon_name`, `color_code`
  - `config_data` (JSONB)
  - `is_active`
  - `created_by`, `updated_by`

#### 16. **email_verification_tokens** & **password_reset_tokens**
- **Purpose**: Account security
- **Key Fields**: user_id, token (UNIQUE), expires_at, used, created_at

#### 17. **paymongo_payments** (Legacy?)
- **Purpose**: Appears to be a duplicate/legacy version of payments table
- Mirrors payments table structure with order_id, payment_intent_id, amount, status, etc.

---

## API Routes Analysis

### File Structure
```
src/routes/
├── authRoutes.ts          (Not analyzed)
├── customerRoutes.ts      (Minimal - customer listing)
├── employeeRoutes.ts      (Minimal - employee listing)
├── inventoryRoutes.ts     (Ingredient management)
├── menuRoutes.ts          (Menu and category management)
├── networkRoutes.ts       (Not analyzed)
├── offlinePaymentRoutes.ts (Offline payment handling)
├── orderRoutes.ts         (Main order & kitchen routes)
├── paymentRoutes.ts       (Not analyzed)
├── syncRoutes.ts          (Not analyzed)
```

---

## Detailed Endpoint Analysis

### 1. ORDER ROUTES (`orderRoutes.ts`) - 2374 Lines

#### **CASHIER ENDPOINTS** (Role: `cashierOrAdmin`)

##### Get Orders
- **GET** `/api/orders` - Fetch paginated orders with filtering
  - Query params: `page`, `limit`, `status`, `order_type`
  - Returns: Paginated list with pagination metadata
  - Use case: View all orders dashboard

##### Search Orders
- **GET** `/api/orders/search` - Search by customer name or order number
  - Query params: `q` (search term), `page`, `limit`
  - Returns: Filtered paginated results

##### Get Single Order
- **GET** `/api/orders/:id` - Get order by UUID
- **GET** `/api/orders/number/:orderNumber` - Get order by order number
  - Returns: Full order object with all details

##### Create Order
- **POST** `/api/orders` - Create new order
  - Body: `customer_name`, `customer_phone`, `order_type`, `special_instructions`, `table_number`, `estimated_prep_time`
  - Validation:
    - `order_type` must be 'dine_in' or 'takeout'
    - `table_number` required for dine-in orders
  - Response: Created order with unique `order_number`

##### Add Item to Order
- **POST** `/api/orders/:orderId/items` - Add menu item to order
  - Body: `menu_item_id`, `quantity`, `customizations`, `special_instructions`
  - Validation:
    - Checks ingredient availability using RPC function
    - Validates menu item is available and active
    - Quantity must be > 0
  - Response: Order item with formatted ingredient info including:
    - Ingredient name, quantity_required, unit, is_optional
    - Current stock, min threshold
    - Stock status (out_of_stock, low_stock, sufficient)
    - Total required for order

##### Update Order Item
- **PUT** `/api/orders/items/:itemId` - Modify order item quantity
  - Body: `quantity`, `customizations`, `special_instructions`
  - Validation: If increasing quantity, checks ingredient availability
  - Response: Updated item with ingredient info

##### Remove Item from Order
- **DELETE** `/api/orders/items/:itemId` - Remove item from order
  - Response: Success confirmation

##### Get Order Items
- **GET** `/api/orders/:orderId/items` - Fetch all items in order
  - Returns: Array of order items

##### Update Payment Status
- **PUT** `/api/orders/:orderId/payment` - Update order payment status
  - Body: `payment_status` (required), `payment_method` (optional)
  - Valid statuses: unpaid, paid, refunded, pending, failed, cancelled
  - Valid methods: cash, gcash, card, paymongo, qrph

##### Create PayMongo Payment
- **POST** `/api/orders/:orderId/paymongo-payment` - Generate QR code payment
  - Body: `description` (optional), `metadata` (optional)
  - Process:
    1. Gets order details
    2. Converts peso to centavos
    3. Creates PayMongo payment intent
    4. Stores payment record in database
    5. Updates order payment method to 'paymongo' and status to 'pending'
  - Response: Payment intent with QR code URL and expiration

##### Get Available Discounts
- **GET** `/api/orders/discounts/available` - List all active discounts
  - Returns: Array of discount objects

##### Check Menu Item Availability
- **GET** `/api/orders/menu-items/:menuItemId/availability` - Check ingredient stock
  - Query params: `quantity` (default: 1)
  - Response: Availability status with unavailable ingredients list
  - Calls RPC: `get_menu_item_availability`

##### Get Stock Status
- **GET** `/api/orders/inventory/stock-status` (Admin only) - View ingredient stock levels
  - Query: `ingredient_stock_status` view

##### Get Stock Alerts
- **GET** `/api/orders/inventory/alerts` (Admin only) - Get active stock alerts
  - Query: `active_stock_alerts` view

##### Check Order Availability
- **POST** `/api/orders/:orderId/check-availability` - Validate all items can be prepared
  - Checks each order item's ingredients
  - Response: Summary of available/unavailable items

##### Ingredient Validation (Enhanced)
- **GET** `/api/orders/:orderId/ingredient-validation` - Comprehensive ingredient check
  - Validates entire order
  - Response: Detailed validation with ingredient summary
  - Tracks: unavailable, low-stock, sufficient ingredients

##### Check Quantity Increase
- **POST** `/api/orders/:orderId/check-quantity-increase` - Check impact of quantity changes
  - Body: `item_updates` array with `item_id` and `new_quantity`
  - Response: Availability of each increase

##### Get Ingredient Summary
- **GET** `/api/orders/:orderId/ingredient-summary` - Total ingredients needed
  - Aggregates all ingredients across order items
  - Calculates shortages
  - Returns: Sorted by shortage amount
  - Includes menu item breakdown for each ingredient

##### Create Discount
- **POST** `/api/orders/discounts` (Admin only) - Create new discount
  - Body: `code`, `name`, `discount_type`, `discount_value`, `minimum_order_amount`, `maximum_discount_amount`, `valid_until`
  - Code is automatically uppercased
  - Default valid duration: 1 year

##### Apply Discount to Order
- **POST** `/api/orders/:orderId/discounts` - Apply discount code
  - Body: `discount_code`
  - Validation:
    - Discount must exist and be active
    - Order subtotal must meet minimum
    - Calculates discount amount (percentage or fixed)
    - Applies max discount cap if set

##### Get Single Discount
- **GET** `/api/orders/discounts/:id` (Admin only)

##### Update Discount
- **PUT** `/api/orders/discounts/:id` (Admin only)
  - Updateable fields: code, name, description, discount_type, discount_value, minimum_order_amount, maximum_discount_amount, is_active, valid_until, usage_limit

##### Delete Discount
- **DELETE** `/api/orders/discounts/:id` (Admin only) - Soft delete

##### Get Payment Status
- **GET** `/api/orders/:orderId/payment-status` - Check full payment history
  - Returns:
    - Order details
    - Latest payment record
    - PayMongo status if applicable
    - Full payment history

##### Get Order Receipt
- **GET** `/api/orders/:orderId/receipt` - Generate complete receipt
  - Includes:
    - Order details with customer info
    - All order items with prices
    - Payment information
    - Order status history
    - Summary totals

##### Sync PayMongo Payment
- **POST** `/api/orders/:orderId/sync-payment` - Manual payment status check
  - Checks PayMongo for latest status
  - Updates order payment status if changed
  - Response: Status comparison (old vs new)

#### **ADMIN ENDPOINTS**

##### Delete Order
- **DELETE** `/api/orders/:orderId` (Admin only)
  - Query param: `force` (optional, for completed orders)
  - Validations:
    - Cannot delete paid orders (requires refund)
    - Cannot delete completed orders without force=true
  - Logic: Hard delete for unpaid/cancelled, soft delete otherwise

##### Bulk Delete Orders
- **DELETE** `/api/orders/bulk/delete` (Admin only)
  - Body: `orderIds` array, `force` boolean
  - Limit: Max 50 orders per request
  - Response: Deletion count and failures

##### Cancel Order
- **PUT** `/api/orders/:orderId/cancel` (Admin only)
  - Body: `reason` (optional)
  - Validations:
    - Cannot cancel completed orders
    - Cannot cancel paid orders
  - Creates status history entry

#### **KITCHEN ENDPOINTS** (Role: `kitchenOrAdmin`)

##### Get Kitchen Orders
- **GET** `/api/orders/kitchen/orders`
  - Returns: All orders for kitchen display
  - Typically filtered to show: pending, preparing, ready

##### Update Order Status
- **PUT** `/api/orders/:orderId/status`
  - Body: `status` (required), `notes` (optional)
  - Valid statuses: pending, preparing, ready, completed, cancelled
  - Creates audit trail entry
  - Response: Updated order object

##### Get Status History
- **GET** `/api/orders/:orderId/history`
  - Returns: Complete status change timeline
  - Includes: status, notes, user who changed, timestamp

---

### 2. MENU ROUTES (`menuRoutes.ts`) - 765 Lines

#### Get Menu Items
- **GET** `/api/menus` - Fetch paginated menu items
  - Query params: `page`, `limit`, `category`, `available`, `featured`, `search`
  - Filtering: Only returns `is_active = true` items
  - Response: Paginated with total count and pages
  - Relations: Includes creator and updater user info

#### Get Categories
- **GET** `/api/menus/categories` - List menu categories
  - Returns: All categories

#### Get Items with Categories
- **GET** `/api/menus/items-with-categories` - Joined query
  - Returns: Menu items with category details

#### Create Category
- **POST** `/api/menus/categories`
  - Body: `name` (required), `description`, `image_url`, `sort_order`, `is_active`
  - Response: Created category

#### Update Category
- **PUT** `/api/menus/categories/:id`
  - Body: Partial update of any field

#### Delete Category
- **DELETE** `/api/menus/categories/:id` - Soft delete (sets is_active to false)

#### Create Menu Item
- **POST** `/api/menus/:categoryId` - Create with image upload
  - Body: `name`, `description`, `price`, `prep_time`, `is_available`, `is_featured`, `calories`, `allergens` (array)
  - Supports: Image upload via multipart/form-data
  - Stores: Image file, MIME type, alt text
  - Response: Full menu item with image URL

#### Get Menu Item
- **GET** `/api/menus/:id`
  - Includes: Related ingredients, creator/updater info

#### Update Menu Item
- **PUT** `/api/menus/:id`
  - Supports partial updates including image replacement

#### Delete Menu Item
- **DELETE** `/api/menus/:id` - Soft delete

#### Ingredient Management for Menu Items
- **POST** `/api/menus/:menuItemId/ingredients` - Add ingredients
  - Body: Array of `{ ingredient_id, quantity_required, unit, is_optional }`

- **PUT** `/api/menus/:menuItemId/ingredients/:ingredientId` - Update ingredient
- **DELETE** `/api/menus/:menuItemId/ingredients/:ingredientId` - Remove ingredient

#### Image Management
- **POST** `/api/menus/:id/upload-image` - Upload/replace image
- **GET** `/api/menus/:id/image` - Get image file directly

---

### 3. INVENTORY ROUTES (`inventoryRoutes.ts`) - 659 Lines

#### Get Ingredients
- **GET** `/api/inventory` - List all ingredients
  - Returns: All active ingredients

#### Get Ingredient by ID
- **GET** `/api/inventory/ingredients/:id`

#### Create Ingredient
- **POST** `/api/inventory/ingredients` (Admin only)
  - Body: `name`, `description`, `unit`, `current_stock`, `min_stock_threshold`, `max_stock_threshold`, `cost_per_unit`, `supplier`, `category`, `storage_location`, `expiry_date`
  - Validation: name and unit required

#### Update Ingredient
- **PUT** `/api/inventory/ingredients/:id` (Admin only)

#### Delete Ingredient
- **DELETE** `/api/inventory/ingredients/:id` (Admin only)

#### Adjust Stock
- **POST** `/api/inventory/ingredients/:id/adjust-stock`
  - Body: `quantity`, `reason`, `reference_number` (optional), `notes` (optional)
  - Creates stock movement record for audit trail

#### Get Stock Movements
- **GET** `/api/inventory/stock-movements`
  - Query params: `ingredient_id`, `movement_type`, `date_from`, `date_to`
  - Returns: Audit trail of all stock changes

#### Get Stock Alerts
- **GET** `/api/inventory/stock-alerts`
  - Query params: `ingredient_id`, `alert_type`, `is_resolved`

#### Resolve Alert
- **PUT** `/api/inventory/stock-alerts/:id/resolve`
  - Records who resolved and when

#### Get Low Stock Items
- **GET** `/api/inventory/low-stock` (Admin only)
  - Returns: Items where current_stock <= min_threshold

#### Bulk Stock Update
- **POST** `/api/inventory/bulk-adjust` (Admin only)
  - Body: Array of `{ ingredient_id, quantity, reason }`
  - Batch operation with validation

---

### 4. EMPLOYEE ROUTES (`employeeRoutes.ts`)
- **GET** `/api/employees` - List all employees
  - Returns: All user_profiles with role != 'customer'

---

### 5. CUSTOMER ROUTES (`customerRoutes.ts`)
- **GET** `/api/customers` - List customers
  - Paginated query

---

## Role-Based Access Control (RBAC)

### Middleware: `authMiddleware.ts`

#### Roles Defined:
1. **cashier** - POS operations, order creation, payment processing
2. **kitchen** - Order preparation, status updates
3. **admin** - Full system access
4. **customer** - (Appears to be for frontend, not API)

#### Endpoint Protection:

| Middleware | Endpoints |
|-----------|-----------|
| `cashierOrAdmin` | Create/read/update orders, add items, apply discounts, check availability |
| `kitchenOrAdmin` | Update order status, view kitchen orders, status history |
| `adminOnly` | Delete orders, create/edit discounts, manage ingredients, payment methods |

---

## Key Features Summary

### 1. Order Management
- ✅ Create orders (dine-in/takeout)
- ✅ Add/remove items with ingredient validation
- ✅ Track order status (pending → preparing → ready → completed)
- ✅ Bulk operations (search, delete)
- ✅ Status history audit trail

### 2. Inventory Management
- ✅ Track ingredient stock levels
- ✅ Min/max thresholds with alerts
- ✅ Stock movement audit trail
- ✅ Expiry date tracking
- ✅ Real-time availability checks before order confirmation

### 3. Payment Processing
- ✅ Multiple payment methods (cash, GCash, card, PayMongo QR)
- ✅ PayMongo integration with QR code generation
- ✅ Payment status tracking
- ✅ Offline payment recording
- ✅ Manual payment sync capability
- ✅ Payment history per order

### 4. Kitchen Operations
- ✅ Dedicated kitchen orders view
- ✅ Real-time status updates
- ✅ Order status history
- ✅ Ingredient requirements per order
- ✅ Preparation time tracking

### 5. Discount Management
- ✅ Percentage and fixed-amount discounts
- ✅ Minimum order threshold
- ✅ Usage limits and expiry dates
- ✅ Maximum discount caps
- ✅ Per-order discount tracking

### 6. Menu Management
- ✅ Categories with sorting
- ✅ Menu items with images (file + URL storage)
- ✅ Ingredients mapping with quantities
- ✅ Allergen tracking
- ✅ Featured/available flags
- ✅ Popularity counter

### 7. Advanced Ingredient Checking
- ✅ Real-time availability validation
- ✅ Multi-item order validation
- ✅ Shortage amount calculation
- ✅ Stock summary by ingredient
- ✅ Quantity increase impact analysis

---

## Data Flow Examples

### Example 1: Complete Order to Payment Flow

```
1. Cashier creates order
   POST /api/orders → Creates pending order

2. Cashier adds items
   POST /api/orders/:id/items → System checks ingredients
   Response: If ingredients insufficient → Error
   
3. Cashier validates entire order
   GET /api/orders/:id/ingredient-validation → Full validation report
   
4. Cashier completes order (all items added)
   POST /api/orders/:id/check-availability → Final validation
   
5. Payment - CASH PATH
   PUT /api/orders/:id/payment → Set status to 'paid'
   
6. Payment - ONLINE PATH (PayMongo)
   POST /api/orders/:id/paymongo-payment → Create payment intent
   Response: { qrCodeUrl, qrCodeData, expiresAt }
   Frontend: Display QR code to customer
   Customer scans and pays
   PayMongo webhook: Updates payment record and order status
   
7. Order confirmed
   Kitchen sees updated order in /api/orders/kitchen/orders
   
8. Kitchen updates status
   PUT /api/orders/:id/status → Changes to 'preparing'
   Then: 'ready'
   Then: 'completed'
   
9. Receipt generation
   GET /api/orders/:id/receipt → Full receipt with all details
```

### Example 2: Inventory Stock Check Flow

```
1. Check single menu item availability
   GET /api/orders/menu-items/:id/availability?quantity=2
   RPC: get_menu_item_availability(menu_item_id, quantity)
   
2. Response includes:
   - is_available: boolean
   - unavailable_ingredients: [{ ingredient_name, required, available }]
   - stock_summary: { sufficient_count, low_stock_count, out_of_stock_count }
   - max_available_quantity: how many can be made
   
3. For entire order:
   GET /api/orders/:id/ingredient-validation
   Loops through all items and aggregates results
```

---

## Technical Observations

### Strengths
✅ Comprehensive role-based access control
✅ Real-time ingredient availability checking
✅ Multiple payment method support with PayMongo integration
✅ Detailed audit trails (status history, stock movements)
✅ Soft delete support for data preservation
✅ Image storage with both file and URL options
✅ Pagination support on list endpoints
✅ Flexible filtering and search capabilities
✅ Batch operations (bulk delete, bulk stock adjust)

### Potential Improvements
⚠️ **Duplicate Payment Table**: `paymongo_payments` table appears redundant with `payments` table
⚠️ **Inventory Locking**: No mention of stock reservation/locking during order preparation
⚠️ **Transaction Atomicity**: May need DB transactions for simultaneous orders depleting same ingredient
⚠️ **Error Handling**: Consider circuit breaker pattern for PayMongo API calls
⚠️ **Rate Limiting**: No mention of rate limits on API endpoints
⚠️ **Search Indexing**: Full-text search might benefit from DB indexing as data scales
⚠️ **Real-time Updates**: No WebSocket support mentioned for kitchen display updates

---

## Authentication & Security Patterns

### Token-Based (JWT likely)
- User authentication via auth routes (not analyzed)
- Role embedded in token
- Middleware validates token and role

### Password Management
- `password_hash` stored in user_profiles
- `password_reset_token` with expiration for reset flow
- `email_verification_token` for email verification

### Soft Deletes
- `is_active` flag on users, ingredients, menu items, menu categories
- Prevents hard deletion of critical data
- Data still queryable when needed

---

## Database Query Optimization Recommendations

### RPC Functions Used
1. `get_menu_item_availability(p_menu_item_id, p_quantity)` - Complex calculation
2. Possibly views: `ingredient_stock_status`, `active_stock_alerts`

### Missing Indexes (Likely Needed)
- `orders.created_by`, `orders.order_number`, `orders.status`, `orders.payment_status`
- `order_items.order_id`, `order_items.menu_item_id`
- `stock_movements.ingredient_id`, `stock_movements.created_at`
- `payments.payment_intent_id`, `payments.order_id`
- `user_profiles.username`, `user_profiles.role`

---

## API Summary Statistics

| Category | Count |
|----------|-------|
| Total Endpoints | 60+ |
| GET Endpoints | ~22 |
| POST Endpoints | ~15 |
| PUT Endpoints | ~12 |
| DELETE Endpoints | ~5 |
| Admin-Only | ~12 |
| Kitchen-Only | ~3 |
| Cashier/Admin | ~35 |
| Public (No Auth) | ~3 |

---

## Deployment Considerations

1. **Environment Variables Needed**:
   - Supabase URL and Keys
   - PayMongo API Keys
   - JWT Secret
   - Database connection string

2. **Database Setup**:
   - Run all migrations
   - Create RPC functions
   - Set up views for performance
   - Create necessary indexes
   - Configure RLS policies

3. **File Storage**:
   - Configure Supabase storage buckets:
     - `menu-item-images`
     - `user-avatars` (if applicable)

4. **Monitoring**:
   - Log all payment transactions
   - Monitor PayMongo webhook delivery
   - Track inventory depletion
   - Alert on low stock

