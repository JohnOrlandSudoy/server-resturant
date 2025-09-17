# 🧪 **Postman Test Collection - Ingredient Stock Management**

## **Setup Instructions**

### **1. Environment Variables**
Set these in your Postman environment:
```
base_url: http://localhost:3000
auth_token: YOUR_JWT_TOKEN
menu_item_id: f86c5c73-ccfc-451e-8383-ff69db8a15d9
order_id: bbbc1667-e2a2-4766-bfdd-7e77e1c8075a
```

---

## **🔍 Stock Management Endpoints**

### **1. Check Menu Item Availability**
```http
GET {{base_url}}/api/orders/menu-items/{{menu_item_id}}/availability?quantity=2
Authorization: Bearer {{auth_token}}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "menu_item_id": "f86c5c73-ccfc-451e-8383-ff69db8a15d9",
    "menu_item_name": "COKE MISMO",
    "requested_quantity": 2,
    "is_available": true,
    "unavailable_ingredients": [],
    "max_available_quantity": 50,
    "stock_summary": {
      "out_of_stock_count": 0,
      "low_stock_count": 0,
      "sufficient_count": 2,
      "total_ingredients": 2
    }
  }
}
```

### **2. Get Stock Status (Admin Only)**
```http
GET {{base_url}}/api/orders/inventory/stock-status
Authorization: Bearer {{auth_token}}
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "ingredient-uuid",
      "name": "Beef",
      "current_stock": 5000,
      "min_stock_threshold": 1000,
      "max_stock_threshold": 10000,
      "unit": "grams",
      "stock_status": "sufficient",
      "stock_percentage": 100,
      "supplier": "Fresh Meat Co.",
      "category": "Protein"
    }
  ]
}
```

### **3. Get Active Stock Alerts (Admin Only)**
```http
GET {{base_url}}/api/orders/inventory/alerts
Authorization: Bearer {{auth_token}}
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "alert-uuid",
      "alert_type": "low_stock",
      "message": "Beef is running low. Current: 500 grams, Minimum: 1000 grams",
      "current_stock": 500,
      "threshold_value": 1000,
      "ingredient_name": "Beef",
      "unit": "grams",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### **4. Check Order Availability Before Checkout**
```http
POST {{base_url}}/api/orders/{{order_id}}/check-availability
Authorization: Bearer {{auth_token}}
Content-Type: application/json
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "order_id": "bbbc1667-e2a2-4766-bfdd-7e77e1c8075a",
    "can_checkout": true,
    "has_unavailable_items": false,
    "items": [
      {
        "order_item_id": "item-uuid",
        "menu_item_id": "f86c5c73-ccfc-451e-8383-ff69db8a15d9",
        "menu_item_name": "COKE MISMO",
        "quantity": 2,
        "is_available": true,
        "unavailable_ingredients": [],
        "max_available_quantity": 50,
        "stock_summary": {
          "out_of_stock_count": 0,
          "low_stock_count": 0,
          "sufficient_count": 1,
          "total_ingredients": 1
        }
      }
    ],
    "summary": {
      "total_items": 1,
      "available_items": 1,
      "unavailable_items": 0
    }
  }
}
```

---

## **🛒 Enhanced Order Item Tests**

### **5. Add Order Item with Ingredient Validation**
```http
POST {{base_url}}/api/orders/{{order_id}}/items
Authorization: Bearer {{auth_token}}
Content-Type: application/json

{
  "menu_item_id": "{{menu_item_id}}",
  "quantity": 10,
  "customizations": {
    "size": "large",
    "toppings": ["cheese", "pepperoni"]
  },
  "special_instructions": "Extra crispy"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Item added to order successfully",
  "data": {
    "id": "new-item-uuid",
    "order_id": "{{order_id}}",
    "menu_item_id": "{{menu_item_id}}",
    "quantity": 10,
    "unit_price": 20,
    "total_price": 200
  }
}
```

**Failure Response (Insufficient Ingredients):**
```json
{
  "success": false,
  "error": "Insufficient ingredients: Beef, Rice",
  "details": {
    "unavailable_ingredients": [
      {
        "ingredient_id": "beef-uuid",
        "ingredient_name": "Beef",
        "required_quantity": 2000,
        "available_stock": 500,
        "shortage_amount": 1500,
        "stock_status": "out_of_stock"
      }
    ],
    "max_available_quantity": 2,
    "stock_summary": {
      "out_of_stock_count": 1,
      "low_stock_count": 0,
      "sufficient_count": 1,
      "total_ingredients": 2
    }
  }
}
```

### **6. Update Order Item Quantity with Validation**
```http
PUT {{base_url}}/api/orders/items/{{order_item_id}}
Authorization: Bearer {{auth_token}}
Content-Type: application/json

{
  "quantity": 15,
  "special_instructions": "Updated quantity"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Order item updated successfully",
  "data": {
    "id": "{{order_item_id}}",
    "quantity": 15,
    "total_price": 300
  }
}
```

**Failure Response (Insufficient Additional Ingredients):**
```json
{
  "success": false,
  "error": "Insufficient ingredients for additional quantity: Beef",
  "details": {
    "unavailable_ingredients": [
      {
        "ingredient_id": "beef-uuid",
        "ingredient_name": "Beef",
        "required_quantity": 1000,
        "available_stock": 200,
        "shortage_amount": 800,
        "stock_status": "low_stock"
      }
    ],
    "max_available_quantity": 1,
    "current_quantity": 10,
    "requested_quantity": 15,
    "additional_needed": 5,
    "stock_summary": {
      "out_of_stock_count": 0,
      "low_stock_count": 1,
      "sufficient_count": 1,
      "total_ingredients": 2
    }
  }
}
```

---

## **🧪 Test Scenarios**

### **Scenario 1: Normal Order Flow**
1. **Create Order** → Get `order_id`
2. **Check Menu Item Availability** → Verify ingredients are sufficient
3. **Add Order Item** → Should succeed if ingredients available
4. **Check Order Availability** → Should show `can_checkout: true`
5. **Process Payment** → Complete the order

### **Scenario 2: Insufficient Stock**
1. **Create Order** → Get `order_id`
2. **Add Order Item with Large Quantity** → Should fail with ingredient details
3. **Check Stock Status** → See which ingredients are low/out
4. **Check Stock Alerts** → See active alerts
5. **Try Smaller Quantity** → Should succeed

### **Scenario 3: Stock Depletion**
1. **Add Multiple Items** → Gradually deplete stock
2. **Check Stock Status** → Monitor stock levels
3. **Check Stock Alerts** → See new alerts created
4. **Try Adding More Items** → Should fail when stock depleted

### **Scenario 4: Quantity Updates**
1. **Add Order Item** → With small quantity
2. **Update Quantity** → Increase quantity
3. **Check Validation** → Should validate additional ingredients needed
4. **Try Excessive Quantity** → Should fail if insufficient stock

---

## **📊 Expected Behaviors**

### **✅ Success Cases:**
- Menu items with sufficient ingredients can be added
- Stock is automatically deducted when items are added
- Stock alerts are created when thresholds are reached
- Quantity updates validate additional ingredients needed

### **❌ Failure Cases:**
- Adding items when ingredients are out of stock
- Increasing quantity beyond available ingredients
- Checkout when any items are unavailable

### **🚨 Alert Triggers:**
- Stock falls below minimum threshold
- Stock reaches zero
- Multiple items deplete the same ingredient

---

## **🔧 Troubleshooting**

### **Common Issues:**

1. **"Menu item is not available"**
   - Check if menu item `is_available` and `is_active` are true
   - Verify menu item exists in database

2. **"Insufficient ingredients"**
   - Check ingredient stock levels
   - Verify `menu_item_ingredients` table has correct quantities
   - Check if ingredients are active

3. **"Function not found"**
   - Run `ingredient-stock-management.sql` in Supabase
   - Verify all functions and triggers are created

4. **"Permission denied"**
   - Check user role (Admin for inventory endpoints)
   - Verify JWT token is valid

### **Database Setup:**
1. Run `ingredient-stock-management.sql` in Supabase SQL Editor
2. Verify all functions are created successfully
3. Test with sample data

This comprehensive test suite will verify that your ingredient stock management system is working correctly! 🎉
