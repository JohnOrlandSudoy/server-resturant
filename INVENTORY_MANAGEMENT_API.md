# Inventory Management API Documentation

## Overview
The Inventory Management API provides comprehensive real-time monitoring of ingredient stock, automatic menu availability updates, and complete audit trails for all stock movements. All endpoints require admin role authentication.

## Authentication
All endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Base URL
```
http://localhost:3000/api/inventory
```

---

## 🗄️ Database Schema

### Core Tables
- **`ingredients`** - Stock levels, thresholds, costs, suppliers
- **`stock_movements`** - Track in/out/adjustments/spoilage
- **`menu_item_ingredients`** - Link menu items to required ingredients
- **`stock_alerts`** - Low stock notifications and alerts

### Automatic Features
- **Stock Updates** - Automatic stock level updates when movements are recorded
- **Menu Availability** - Automatic toggle when ingredients are low/out of stock
- **Alerts** - Generated when stock falls below thresholds
- **Audit Trail** - Complete history of all stock changes

---

## 📦 Ingredients Management

### List All Ingredients
```http
GET /api/inventory/
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "61eec24c-050e-4497-9e66-b147c48420f8",
      "name": "Chicken Breast",
      "description": "Fresh chicken breast",
      "unit": "kg",
      "current_stock": 10.5,
      "min_stock_threshold": 2.0,
      "max_stock_threshold": 20.0,
      "cost_per_unit": 180.00,
      "supplier": "Fresh Foods Co.",
      "category": "meat",
      "storage_location": "freezer",
      "expiry_date": "2024-01-15",
      "is_active": true,
      "created_at": "2024-01-01T10:00:00Z",
      "updated_at": "2024-01-01T10:00:00Z"
    }
  ]
}
```

### Get Ingredient by ID
```http
GET /api/inventory/ingredients/:id
```

**Example:**
```http
GET /api/inventory/ingredients/61eec24c-050e-4497-9e66-b147c48420f8
```

### Create New Ingredient
```http
POST /api/inventory/ingredients
```

**Request Body:**
```json
{
  "name": "Chicken Breast",
  "description": "Fresh chicken breast",
  "unit": "kg",
  "current_stock": 10.5,
  "min_stock_threshold": 2.0,
  "max_stock_threshold": 20.0,
  "cost_per_unit": 180.00,
  "supplier": "Fresh Foods Co.",
  "category": "meat",
  "storage_location": "freezer",
  "expiry_date": "2024-01-15"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Ingredient created successfully",
  "data": {
    "id": "61eec24c-050e-4497-9e66-b147c48420f8",
    "name": "Chicken Breast",
    "unit": "kg",
    "current_stock": 10.5,
    "min_stock_threshold": 2.0,
    "is_active": true,
    "created_at": "2024-01-01T10:00:00Z"
  }
}
```

### Update Ingredient
```http
PUT /api/inventory/ingredients/:id
```

**Request Body:**
```json
{
  "current_stock": 8.5,
  "min_stock_threshold": 3.0,
  "cost_per_unit": 185.00
}
```

### Delete Ingredient (Soft Delete)
```http
DELETE /api/inventory/ingredients/:id
```

---

## 📊 Stock Movements

### Get Stock Movements
```http
GET /api/inventory/movements?page=1&limit=50&ingredient_id=61eec24c-050e-4497-9e66-b147c48420f8
```

**Query Parameters:**
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 50)
- `ingredient_id` (optional) - Filter by specific ingredient

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "movement-123",
      "ingredient_id": "61eec24c-050e-4497-9e66-b147c48420f8",
      "movement_type": "out",
      "quantity": 0.5,
      "reason": "Used for cooking",
      "reference_number": "ORDER-001",
      "notes": "Chicken Adobo preparation",
      "performed_by": "admin-user-id",
      "created_at": "2024-01-01T14:30:00Z",
      "ingredient": {
        "name": "Chicken Breast",
        "unit": "kg"
      },
      "performed_by_user": {
        "username": "admin",
        "first_name": "Admin",
        "last_name": "User"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1,
    "totalPages": 1
  }
}
```

### Record Stock Movement
```http
POST /api/inventory/movements
```

**Request Body:**
```json
{
  "ingredient_id": "61eec24c-050e-4497-9e66-b147c48420f8",
  "movement_type": "out",
  "quantity": 0.5,
  "reason": "Used for cooking",
  "reference_number": "ORDER-001",
  "notes": "Chicken Adobo preparation"
}
```

**Movement Types:**
- `in` - Stock received
- `out` - Stock used/consumed
- `adjustment` - Manual stock adjustment
- `spoilage` - Stock spoiled/wasted

**Response:**
```json
{
  "success": true,
  "message": "Stock movement recorded successfully",
  "data": {
    "id": "movement-123",
    "ingredient_id": "61eec24c-050e-4497-9e66-b147c48420f8",
    "movement_type": "out",
    "quantity": 0.5,
    "reason": "Used for cooking",
    "performed_by": "admin-user-id",
    "created_at": "2024-01-01T14:30:00Z"
  }
}
```

---

## 🔗 Menu-Ingredient Linking

### Get Menu Item Ingredients
```http
GET /api/inventory/menu-items/:menuItemId/ingredients
```

**Example:**
```http
GET /api/inventory/menu-items/menu-item-123/ingredients
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "link-123",
      "menu_item_id": "menu-item-123",
      "ingredient_id": "61eec24c-050e-4497-9e66-b147c48420f8",
      "quantity_required": 0.3,
      "unit": "kg",
      "is_optional": false,
      "created_at": "2024-01-01T10:00:00Z",
      "ingredient": {
        "name": "Chicken Breast",
        "unit": "kg",
        "current_stock": 10.5,
        "min_stock_threshold": 2.0
      }
    }
  ]
}
```

### Link Ingredient to Menu Item
```http
POST /api/inventory/menu-items/:menuItemId/ingredients
```

**Request Body:**
```json
{
  "ingredient_id": "61eec24c-050e-4497-9e66-b147c48420f8",
  "quantity_required": 0.3,
  "unit": "kg",
  "is_optional": false
}
```

### Update Ingredient Link
```http
PUT /api/inventory/menu-items/ingredients/:linkId
```

**Request Body:**
```json
{
  "quantity_required": 0.4,
  "unit": "kg",
  "is_optional": false
}
```

### Unlink Ingredient from Menu Item
```http
DELETE /api/inventory/menu-items/ingredients/:linkId
```

---

## 🚨 Stock Alerts

### Get Stock Alerts
```http
GET /api/inventory/alerts?resolved=false
```

**Query Parameters:**
- `resolved` (optional) - Filter by resolved status (`true`, `false`, or omit for all)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "alert-123",
      "ingredient_id": "61eec24c-050e-4497-9e66-b147c48420f8",
      "alert_type": "low_stock",
      "current_stock": 1.5,
      "threshold_value": 2.0,
      "message": "Low stock alert: Chicken Breast has 1.5 kg remaining (threshold: 2.0 kg)",
      "is_resolved": false,
      "created_at": "2024-01-01T15:00:00Z",
      "ingredient": {
        "name": "Chicken Breast",
        "unit": "kg"
      }
    }
  ]
}
```

### Resolve Stock Alert
```http
PUT /api/inventory/alerts/:alertId/resolve
```

**Response:**
```json
{
  "success": true,
  "message": "Stock alert resolved successfully",
  "data": {
    "id": "alert-123",
    "is_resolved": true,
    "resolved_by": "admin-user-id",
    "resolved_at": "2024-01-01T16:00:00Z"
  }
}
```

---

## 📈 Reports

### Inventory Status Report
```http
GET /api/inventory/reports/inventory
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "61eec24c-050e-4497-9e66-b147c48420f8",
      "name": "Chicken Breast",
      "unit": "kg",
      "current_stock": 10.5,
      "min_stock_threshold": 2.0,
      "max_stock_threshold": 20.0,
      "cost_per_unit": 180.00,
      "category": "meat",
      "storage_location": "freezer",
      "stock_status": "In Stock",
      "is_active": true
    }
  ]
}
```

### Menu Availability Report
```http
GET /api/inventory/reports/menu-availability
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "menu-item-123",
      "name": "Chicken Adobo",
      "menu_available": true,
      "total_ingredients": 4,
      "available_ingredients": 4,
      "ingredient_status": "All ingredients available"
    }
  ]
}
```

---

## 🧪 Sample Test Workflow

### 1. Login and Get Token
```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

### 2. Create an Ingredient
```http
POST http://localhost:3000/api/inventory/ingredients
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Chicken Breast",
  "description": "Fresh chicken breast",
  "unit": "kg",
  "current_stock": 10.5,
  "min_stock_threshold": 2.0,
  "cost_per_unit": 180.00,
  "category": "meat",
  "storage_location": "freezer"
}
```

### 3. Record Stock Movement (Usage)
```http
POST http://localhost:3000/api/inventory/movements
Authorization: Bearer <token>
Content-Type: application/json

{
  "ingredient_id": "61eec24c-050e-4497-9e66-b147c48420f8",
  "movement_type": "out",
  "quantity": 0.5,
  "reason": "Used for cooking",
  "notes": "Chicken Adobo preparation"
}
```

### 4. Link Ingredient to Menu Item
```http
POST http://localhost:3000/api/inventory/menu-items/menu-item-123/ingredients
Authorization: Bearer <token>
Content-Type: application/json

{
  "ingredient_id": "61eec24c-050e-4497-9e66-b147c48420f8",
  "quantity_required": 0.3,
  "unit": "kg",
  "is_optional": false
}
```

### 5. Check Stock Alerts
```http
GET http://localhost:3000/api/inventory/alerts?resolved=false
Authorization: Bearer <token>
```

### 6. View Inventory Report
```http
GET http://localhost:3000/api/inventory/reports/inventory
Authorization: Bearer <token>
```

---

## 🔄 Automatic Features

### Stock Level Updates
When you record a stock movement, the ingredient's `current_stock` is automatically updated:
- `in` movements increase stock
- `out` and `spoilage` movements decrease stock
- `adjustment` movements set stock to the specified quantity

### Menu Availability Updates
When ingredient stock changes, the system automatically:
- Checks all menu items that use that ingredient
- Updates menu item `is_available` status based on stock levels
- Ensures menu items are unavailable if any required ingredient is out of stock

### Low Stock Alerts
The system automatically creates alerts when:
- Stock falls below the minimum threshold
- Stock reaches zero (out of stock)
- Alerts can be resolved by admins

### Audit Trail
Every stock movement is recorded with:
- Who performed the action
- When it was performed
- What type of movement
- Reason and notes
- Reference numbers for tracking

---

## 🚨 Error Responses

### Authentication Error
```json
{
  "success": false,
  "error": "Access token required"
}
```

### Validation Error
```json
{
  "success": false,
  "error": "Name and unit are required"
}
```

### Not Found Error
```json
{
  "success": false,
  "error": "Ingredient not found"
}
```

### Server Error
```json
{
  "success": false,
  "error": "Failed to create ingredient"
}
```

---

## 📝 Notes

- All timestamps are in ISO 8601 format (UTC)
- All monetary values are in the base currency (e.g., PHP)
- Stock quantities support decimal values for precise measurements
- The system automatically handles stock level calculations
- Menu availability is updated in real-time based on ingredient stock
- All operations require admin role authentication
- Soft deletes are used for ingredients (sets `is_active` to false)
