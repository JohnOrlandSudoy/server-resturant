# 📋 **Order Flow Analysis - Complete System Overview**

## 🔄 **Order Creation to Kitchen Flow**

### **1. Order Creation Process**

#### **Step 1: Create Order** 
- **Endpoint**: `POST /api/orders/`
- **Access**: Cashier/Admin only
- **Required Data**:
  ```json
  {
    "customer_name": "John Doe",
    "customer_phone": "+639123456789",
    "order_type": "dine_in" | "takeout",
    "special_instructions": "Extra spicy",
    "table_number": "5", // Required for dine_in
    "estimated_prep_time": 15
  }
  ```

#### **Step 2: Add Menu Items to Order**
- **Endpoint**: `POST /api/orders/:orderId/items`
- **Access**: Cashier/Admin only
- **Required Data**:
  ```json
  {
    "menu_item_id": "uuid",
    "quantity": 2,
    "customizations": {"size": "large", "toppings": ["cheese", "pepperoni"]},
    "special_instructions": "Well done"
  }
  ```

### **2. Payment Processing**

#### **Cash Payment**
- **Endpoint**: `PUT /api/orders/:orderId/payment`
- **Data**:
  ```json
  {
    "payment_status": "paid",
    "payment_method": "cash"
  }
  ```

#### **Online Payment (PayMongo)**
- **Endpoint**: `POST /api/orders/:orderId/paymongo-payment`
- **Process**:
  1. Creates PayMongo payment intent
  2. Generates QR code for payment
  3. Updates order payment status to "pending"
  4. Stores payment record in `payments` table

### **3. Kitchen Preparation**

#### **Kitchen Order Retrieval**
- **Endpoint**: `GET /api/orders/kitchen/orders`
- **Access**: Kitchen/Admin only
- **Returns Complete Order Details**:

```json
{
  "success": true,
  "data": [
    {
      "id": "order-uuid",
      "order_number": "ORD-001",
      "customer_name": "John Doe",
      "customer_phone": "+639123456789",
      "order_type": "dine_in",
      "status": "pending",
      "payment_status": "paid",
      "payment_method": "cash",
      "subtotal": 150.00,
      "total_amount": 150.00,
      "special_instructions": "Extra spicy",
      "table_number": "5",
      "estimated_prep_time": 15,
      "created_at": "2024-01-15T10:30:00Z",
      "order_items": [
        {
          "id": "item-uuid",
          "menu_item_id": "menu-uuid",
          "quantity": 2,
          "unit_price": 75.00,
          "total_price": 150.00,
          "customizations": "{\"size\": \"large\"}",
          "special_instructions": "Well done",
          "menu_items": {
            "id": "menu-uuid",
            "name": "Beef Rice Bowl",
            "description": "Delicious beef with rice",
            "price": 75.00,
            "prep_time": 10,
            "calories": 450,
            "allergens": ["gluten"],
            "menu_item_ingredients": [
              {
                "id": "ingredient-relation-uuid",
                "quantity_required": 200,
                "unit": "grams",
                "is_optional": false,
                "ingredients": {
                  "id": "ingredient-uuid",
                  "name": "Beef",
                  "description": "Fresh beef",
                  "unit": "grams",
                  "current_stock": 5000,
                  "min_stock_threshold": 1000,
                  "cost_per_unit": 0.50,
                  "supplier": "Fresh Meat Co.",
                  "category": "Protein",
                  "storage_location": "Freezer A",
                  "expiry_date": "2024-01-20",
                  "is_active": true
                }
              }
            ]
          }
        }
      ]
    }
  ]
}
```

#### **Kitchen Status Updates**
- **Endpoint**: `PUT /api/orders/:orderId/status`
- **Access**: Kitchen/Admin only
- **Status Flow**: `pending` → `preparing` → `ready` → `completed`
- **Data**:
  ```json
  {
    "status": "preparing",
    "notes": "Started cooking"
  }
  ```

## 🗄️ **Database Schema Analysis**

### **Core Tables Structure**

#### **1. Orders Table**
```sql
CREATE TABLE public.orders (
  id uuid PRIMARY KEY,
  order_number varchar UNIQUE NOT NULL,
  customer_name varchar,
  customer_phone varchar,
  order_type varchar CHECK (order_type IN ('dine_in', 'takeout')),
  status varchar DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'completed', 'cancelled')),
  payment_status varchar DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'refunded', 'pending', 'failed', 'cancelled')),
  payment_method varchar CHECK (payment_method IN ('cash', 'gcash', 'card', 'paymongo', 'qrph')),
  subtotal numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  total_amount numeric DEFAULT 0,
  special_instructions text,
  table_number varchar,
  estimated_prep_time integer,
  actual_prep_time integer,
  created_by uuid NOT NULL,
  updated_by uuid,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  completed_at timestamp
);
```

#### **2. Order Items Table**
```sql
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES orders(id),
  menu_item_id uuid NOT NULL REFERENCES menu_items(id),
  quantity integer DEFAULT 1,
  unit_price numeric NOT NULL,
  total_price numeric NOT NULL,
  customizations text, -- JSON string
  special_instructions text,
  created_at timestamp DEFAULT now()
);
```

#### **3. Menu Items Table**
```sql
CREATE TABLE public.menu_items (
  id uuid PRIMARY KEY,
  name varchar NOT NULL,
  description text,
  price numeric NOT NULL,
  category_id uuid REFERENCES menu_categories(id),
  image_url varchar,
  prep_time integer DEFAULT 0,
  is_available boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  popularity integer DEFAULT 0,
  calories integer,
  allergens ARRAY, -- PostgreSQL array
  is_active boolean DEFAULT true,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
```

#### **4. Ingredients Table**
```sql
CREATE TABLE public.ingredients (
  id uuid PRIMARY KEY,
  name varchar UNIQUE NOT NULL,
  description text,
  unit varchar DEFAULT 'pieces',
  current_stock numeric DEFAULT 0,
  min_stock_threshold numeric DEFAULT 0,
  max_stock_threshold numeric,
  cost_per_unit numeric,
  supplier varchar,
  category varchar,
  storage_location varchar,
  expiry_date date,
  is_active boolean DEFAULT true,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
```

#### **5. Menu Item Ingredients (Junction Table)**
```sql
CREATE TABLE public.menu_item_ingredients (
  id uuid PRIMARY KEY,
  menu_item_id uuid NOT NULL REFERENCES menu_items(id),
  ingredient_id uuid NOT NULL REFERENCES ingredients(id),
  quantity_required numeric NOT NULL,
  unit varchar NOT NULL,
  is_optional boolean DEFAULT false,
  created_at timestamp DEFAULT now()
);
```

## 🍳 **Kitchen Information Available**

### **What Kitchen Staff Can See:**

1. **Customer Information**:
   - Customer name
   - Customer phone
   - Order type (dine-in/takeout)
   - Table number (for dine-in)

2. **Order Details**:
   - Order number
   - Order status
   - Payment status
   - Special instructions
   - Estimated prep time

3. **Menu Items with Full Details**:
   - Item name and description
   - Quantity ordered
   - Unit price and total price
   - Customizations (JSON format)
   - Item-specific special instructions
   - Prep time for each item
   - Calories and allergens

4. **Complete Ingredient Information**:
   - Ingredient name and description
   - Required quantity for each item
   - Unit of measurement
   - Current stock levels
   - Storage location
   - Expiry dates
   - Supplier information
   - Cost per unit

## 💳 **Payment Methods Supported**

### **Cash Payment**
- Direct payment at counter
- Immediate status update to "paid"
- No external processing required

### **Online Payment (PayMongo)**
- QR code generation
- Payment intent creation
- Webhook processing for status updates
- Support for multiple payment sources (GCash, GrabPay, etc.)

## 🔄 **Order Status Flow**

```
Order Created (pending) 
    ↓
Items Added
    ↓
Payment Processed
    ↓
Kitchen Receives (pending)
    ↓
Kitchen Starts (preparing)
    ↓
Kitchen Completes (ready)
    ↓
Order Delivered (completed)
```

## 📊 **Key Features**

### **✅ What's Working Well:**
1. **Complete Order Tracking** - Full audit trail from creation to completion
2. **Detailed Kitchen Information** - All necessary details for food preparation
3. **Flexible Payment Options** - Both cash and online payments
4. **Ingredient Management** - Complete ingredient tracking and stock management
5. **Customer Information** - Full customer details available to kitchen
6. **Customization Support** - JSON-based customizations for menu items
7. **Status History** - Complete order status change tracking

### **🔧 Areas for Enhancement:**
1. **Real-time Updates** - WebSocket integration for live kitchen updates
2. **Ingredient Deduction** - Automatic stock deduction when orders are placed
3. **Prep Time Calculation** - Dynamic prep time based on ingredients
4. **Kitchen Display** - Dedicated kitchen display interface
5. **Order Prioritization** - Priority system for urgent orders

## 🎯 **Summary**

Your system provides a comprehensive order management solution with:
- **Complete customer information** available to kitchen staff
- **Detailed menu items** with full ingredient breakdowns
- **Flexible payment processing** for both cash and online payments
- **Robust order tracking** from creation to completion
- **Rich ingredient management** with stock tracking capabilities

The kitchen staff have access to all necessary information including customer details, menu item specifications, ingredient requirements, and preparation instructions to efficiently fulfill orders.
