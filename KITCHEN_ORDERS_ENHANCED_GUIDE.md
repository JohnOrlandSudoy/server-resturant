# 🍳 Enhanced Kitchen Orders System

## 🎯 **What's New**

The kitchen orders endpoint now provides **complete order information** including:
- ✅ **Menu items** with full details
- ✅ **Ingredients** needed for each item
- ✅ **Stock levels** and availability
- ✅ **Prep time calculations**
- ✅ **Priority scoring**
- ✅ **Low stock warnings**

## 🔧 **Updated Endpoint**

### **GET /api/orders/kitchen/orders**

**Authentication**: Requires `kitchenOrAdmin` middleware

**Response Structure**:
```json
{
  "success": true,
  "data": [
    {
      "id": "order-uuid",
      "order_number": "ORD-20250910-0004",
      "customer_name": "Walk-in Customer",
      "customer_phone": "+639123456789",
      "order_type": "dine_in",
      "status": "pending",
      "payment_status": "unpaid",
      "payment_method": "cash",
      "subtotal": 5.60,
      "discount_amount": 0,
      "tax_amount": 0,
      "total_amount": 5.60,
      "special_instructions": "hvjvuycffzx",
      "table_number": "8",
      "estimated_prep_time": 15,
      "actual_prep_time": null,
      "created_at": "2024-09-10T22:51:31Z",
      "updated_at": "2024-09-10T22:51:31Z",
      "completed_at": null,
      "order_items": [
        {
          "id": "item-uuid",
          "menu_item_id": "menu-uuid",
          "quantity": 1,
          "unit_price": 5.60,
          "total_price": 5.60,
          "customizations": "{\"size\":\"large\"}",
          "special_instructions": "No onions",
          "created_at": "2024-09-10T22:51:31Z",
          "menu_items": {
            "id": "menu-uuid",
            "name": "Classic Burger",
            "description": "Beef patty with lettuce, tomato, and special sauce",
            "price": 5.60,
            "prep_time": 15,
            "is_available": true,
            "calories": 450,
            "allergens": ["gluten", "dairy"],
            "menu_item_ingredients": [
              {
                "id": "ingredient-relation-uuid",
                "quantity_required": 1,
                "unit": "pieces",
                "is_optional": false,
                "ingredients": {
                  "id": "ingredient-uuid",
                  "name": "Beef Patty",
                  "description": "Fresh ground beef patty",
                  "unit": "pieces",
                  "current_stock": 25,
                  "min_stock_threshold": 10,
                  "max_stock_threshold": 50,
                  "cost_per_unit": 2.50,
                  "supplier": "Fresh Meat Co.",
                  "category": "Protein",
                  "storage_location": "Freezer A",
                  "expiry_date": "2024-09-15",
                  "is_active": true
                }
              },
              {
                "id": "ingredient-relation-uuid-2",
                "quantity_required": 2,
                "unit": "pieces",
                "is_optional": false,
                "ingredients": {
                  "id": "ingredient-uuid-2",
                  "name": "Burger Bun",
                  "description": "Sesame seed bun",
                  "unit": "pieces",
                  "current_stock": 5,
                  "min_stock_threshold": 20,
                  "max_stock_threshold": 100,
                  "cost_per_unit": 0.50,
                  "supplier": "Bakery Fresh",
                  "category": "Bread",
                  "storage_location": "Pantry B",
                  "expiry_date": "2024-09-12",
                  "is_active": true
                }
              }
            ]
          }
        }
      ],
      "kitchen_metadata": {
        "total_items": 1,
        "estimated_total_prep_time": 15,
        "priority": "MEDIUM",
        "ingredients_needed": [
          {
            "id": "ingredient-uuid",
            "name": "Beef Patty",
            "description": "Fresh ground beef patty",
            "unit": "pieces",
            "required_quantity": 1,
            "current_stock": 25,
            "min_stock_threshold": 10,
            "max_stock_threshold": 50,
            "cost_per_unit": 2.50,
            "supplier": "Fresh Meat Co.",
            "category": "Protein",
            "storage_location": "Freezer A",
            "expiry_date": "2024-09-15",
            "is_optional": false,
            "is_low_stock": false,
            "is_out_of_stock": false
          },
          {
            "id": "ingredient-uuid-2",
            "name": "Burger Bun",
            "description": "Sesame seed bun",
            "unit": "pieces",
            "required_quantity": 2,
            "current_stock": 5,
            "min_stock_threshold": 20,
            "max_stock_threshold": 100,
            "cost_per_unit": 0.50,
            "supplier": "Bakery Fresh",
            "category": "Bread",
            "storage_location": "Pantry B",
            "expiry_date": "2024-09-12",
            "is_optional": false,
            "is_low_stock": true,
            "is_out_of_stock": false
          }
        ],
        "low_stock_ingredients": [
          {
            "id": "ingredient-uuid-2",
            "name": "Burger Bun",
            "current_stock": 5,
            "min_stock_threshold": 20,
            "required_quantity": 2,
            "is_out_of_stock": false
          }
        ],
        "has_low_stock": true,
        "has_out_of_stock": false,
        "can_prepare": true
      }
    }
  ]
}
```

## 🍳 **Kitchen Features**

### **1. Complete Order Information**
- ✅ **Customer details** (name, phone, table number)
- ✅ **Order type** (dine_in, takeout)
- ✅ **Special instructions** (order-level and item-level)
- ✅ **Payment status** (for priority handling)

### **2. Menu Item Details**
- ✅ **Item name and description**
- ✅ **Individual prep time**
- ✅ **Customizations** (size, extras, etc.)
- ✅ **Allergen information**
- ✅ **Calorie count**

### **3. Ingredient Management**
- ✅ **Required ingredients** for each item
- ✅ **Quantity needed** (calculated per order)
- ✅ **Current stock levels**
- ✅ **Storage locations**
- ✅ **Supplier information**
- ✅ **Expiry dates**

### **4. Smart Kitchen Features**
- ✅ **Priority scoring** (HIGH/MEDIUM/LOW)
- ✅ **Total prep time** calculation
- ✅ **Low stock warnings**
- ✅ **Out of stock alerts**
- ✅ **Can prepare** status

## 🎯 **Priority System**

### **HIGH Priority** (Red):
- Orders older than 30 minutes
- Orders with total prep time > 20 minutes
- Orders with out of stock ingredients

### **MEDIUM Priority** (Yellow):
- Orders older than 15 minutes
- Orders with total prep time > 10 minutes
- Orders with low stock ingredients

### **LOW Priority** (Green):
- New orders (< 15 minutes)
- Orders with total prep time < 10 minutes
- All ingredients in stock

## 🚨 **Stock Management**

### **Low Stock Warning**:
```json
{
  "has_low_stock": true,
  "low_stock_ingredients": [
    {
      "name": "Burger Bun",
      "current_stock": 5,
      "min_stock_threshold": 20,
      "required_quantity": 2
    }
  ]
}
```

### **Out of Stock Alert**:
```json
{
  "has_out_of_stock": true,
  "can_prepare": false,
  "low_stock_ingredients": [
    {
      "name": "Beef Patty",
      "current_stock": 0,
      "is_out_of_stock": true
    }
  ]
}
```

## 🔧 **Frontend Integration**

### **Kitchen Dashboard Display**:

```javascript
// Example frontend usage
const kitchenOrders = await fetch('/api/orders/kitchen/orders');

kitchenOrders.data.forEach(order => {
  // Display order card
  console.log(`Order: ${order.order_number}`);
  console.log(`Customer: ${order.customer_name}`);
  console.log(`Table: ${order.table_number}`);
  console.log(`Priority: ${order.kitchen_metadata.priority}`);
  console.log(`Prep Time: ${order.kitchen_metadata.estimated_total_prep_time} min`);
  
  // Display items
  order.order_items.forEach(item => {
    console.log(`- ${item.quantity}x ${item.menu_items.name}`);
    console.log(`  Prep: ${item.menu_items.prep_time} min`);
    console.log(`  Special: ${item.special_instructions}`);
  });
  
  // Display ingredients needed
  order.kitchen_metadata.ingredients_needed.forEach(ingredient => {
    console.log(`- ${ingredient.required_quantity} ${ingredient.unit} ${ingredient.name}`);
    console.log(`  Stock: ${ingredient.current_stock} (${ingredient.storage_location})`);
    if (ingredient.is_low_stock) {
      console.log(`  ⚠️ LOW STOCK!`);
    }
  });
  
  // Display warnings
  if (order.kitchen_metadata.has_low_stock) {
    console.log('⚠️ Some ingredients are low in stock');
  }
  if (order.kitchen_metadata.has_out_of_stock) {
    console.log('❌ Some ingredients are out of stock - Cannot prepare');
  }
});
```

## 📊 **Kitchen Workflow**

### **1. Order Received**:
- Kitchen sees new order with HIGH/MEDIUM/LOW priority
- All items and ingredients are listed
- Prep time is calculated automatically

### **2. Preparation Planning**:
- Check ingredient availability
- Note storage locations
- Plan preparation sequence

### **3. Stock Management**:
- Low stock warnings for reordering
- Out of stock alerts for substitutions
- Expiry date monitoring

### **4. Quality Control**:
- Allergen information available
- Special instructions highlighted
- Customizations clearly marked

## 🧪 **Testing the Enhanced Endpoint**

### **Test Request**:
```bash
GET /api/orders/kitchen/orders
Authorization: Bearer <kitchen-token>
```

### **Expected Results**:
- ✅ Orders with complete item details
- ✅ Ingredients with stock information
- ✅ Priority calculations
- ✅ Low stock warnings
- ✅ Prep time estimates

### **Error Handling**:
- ✅ Graceful handling of missing ingredients
- ✅ Fallback for incomplete menu item data
- ✅ Proper error logging

## 🎯 **Benefits for Kitchen Staff**

1. **Complete Information**: See exactly what to prepare
2. **Stock Awareness**: Know what ingredients are available
3. **Priority Management**: Focus on urgent orders first
4. **Efficiency**: All details in one place
5. **Quality Control**: Allergen and customization info
6. **Inventory Management**: Low stock alerts

**The kitchen dashboard will now show complete order information with all menu items and ingredients!** 🚀
