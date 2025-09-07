# 🍽️ Menu API Testing Guide - Postman Collection

## 📋 Overview
This guide covers all menu-related endpoints including menu items and categories with comprehensive testing scenarios.

## 🔐 Authentication Setup
**All endpoints require authentication.** Add this header to all requests:
```
Authorization: Bearer {your-jwt-token}
```

## 📊 Menu Items Endpoints

### 1. **GET** `/api/menus` - Get All Menu Items
**Description:** Retrieve all menu items with optional filtering and pagination

#### Basic Request:
```http
GET http://localhost:3000/api/menus
Authorization: Bearer {your-token}
```

#### With Query Parameters:
```http
GET http://localhost:3000/api/menus?page=1&limit=10&available=true&featured=true&search=chicken
Authorization: Bearer {your-token}
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)
- `category` (optional): Filter by category ID
- `available` (optional): Filter by availability (true/false)
- `featured` (optional): Filter by featured items (true/false)
- `search` (optional): Search by name

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Chicken Adobo",
      "description": "Traditional Filipino dish",
      "price": 150.00,
      "category_id": "uuid",
      "prep_time": 30,
      "is_available": true,
      "is_featured": false,
      "calories": 350,
      "allergens": ["soy"],
      "creator": {
        "id": "uuid",
        "username": "admin",
        "first_name": "Admin",
        "last_name": "User",
        "role": "admin"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

### 2. **GET** `/api/menus/:id` - Get Menu Item by ID
**Description:** Retrieve a specific menu item by its ID

```http
GET http://localhost:3000/api/menus/{menu-item-id}
Authorization: Bearer {your-token}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Chicken Adobo",
    "description": "Traditional Filipino dish",
    "price": 150.00,
    "category_id": "uuid",
    "prep_time": 30,
    "is_available": true,
    "is_featured": false,
    "calories": 350,
    "allergens": ["soy"],
    "image_url": "https://...",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

### 3. **POST** `/api/menus` - Create Menu Item
**Description:** Create a new menu item with optional image upload

#### Option A: With Image Upload (Form Data)
```http
POST http://localhost:3000/api/menus
Authorization: Bearer {your-token}
Content-Type: multipart/form-data

Body (form-data):
- name: "Chicken Adobo"
- description: "Traditional Filipino dish with soy sauce and vinegar"
- price: 150.00
- category_id: {category-uuid}
- prep_time: 30
- is_available: true
- is_featured: false
- calories: 350
- allergens: ["soy", "garlic"]
- image: [Select file - JPEG, PNG, WebP, or GIF, max 5MB]
```

**Image Upload Features:**
- ✅ **File Type Validation**: Only JPEG, PNG, WebP, and GIF allowed
- ✅ **File Size Limit**: Maximum 5MB per file
- ✅ **Automatic Cleanup**: Failed uploads are automatically cleaned up
- ✅ **Unique Filenames**: Prevents filename conflicts
- ✅ **Alt Text**: Automatically uses menu item name as alt text
- ✅ **Supabase Storage**: Files stored in `menu-images` bucket

#### Option B: With External Image URL (JSON)
```http
POST http://localhost:3000/api/menus
Authorization: Bearer {your-token}
Content-Type: application/json

{
  "name": "Chicken Adobo",
  "description": "Traditional Filipino dish with soy sauce and vinegar",
  "price": 150.00,
  "category_id": "category-uuid-here",
  "prep_time": 30,
  "is_available": true,
  "is_featured": false,
  "calories": 350,
  "allergens": ["soy", "garlic"],
  "image_url": "https://example.com/chicken-adobo.jpg"
}
```

**Required Fields:**
- `name` (string): Menu item name
- `price` (number): Price (must be > 0)

**Optional Fields:**
- `description` (string): Item description
- `category_id` (uuid): Category ID
- `prep_time` (number): Preparation time in minutes
- `is_available` (boolean): Availability status
- `is_featured` (boolean): Featured status
- `calories` (number): Calorie count
- `allergens` (array): List of allergens
- `image_url` (string): External image URL
- `image` (file): Image file upload

**Expected Response:**
```json
{
  "success": true,
  "message": "Menu item created successfully",
  "data": {
    "id": "new-uuid",
    "name": "Chicken Adobo",
    "description": "Traditional Filipino dish with soy sauce and vinegar",
    "price": 150.00,
    "category_id": "category-uuid",
    "prep_time": 30,
    "is_available": true,
    "is_featured": false,
    "calories": 350,
    "allergens": ["soy", "garlic"],
    "image_url": "https://...",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

### 4. **PUT** `/api/menus/:id` - Update Menu Item
**Description:** Update an existing menu item with optional image update

#### Option A: Update with New Image Upload (Form Data)
```http
PUT http://localhost:3000/api/menus/{menu-item-id}
Authorization: Bearer {your-token}
Content-Type: multipart/form-data

Body (form-data):
- name: "Updated Chicken Adobo"
- description: "Updated description"
- price: 160.00
- prep_time: 35
- is_featured: true
- calories: 380
- image: [Select new file - JPEG, PNG, WebP, or GIF, max 5MB]
```

#### Option B: Update with External Image URL (JSON)
```http
PUT http://localhost:3000/api/menus/{menu-item-id}
Authorization: Bearer {your-token}
Content-Type: application/json

{
  "name": "Updated Chicken Adobo",
  "description": "Updated description",
  "price": 160.00,
  "prep_time": 35,
  "is_featured": true,
  "calories": 380,
  "image_url": "https://example.com/new-chicken-adobo.jpg"
}
```

#### Option C: Update Without Image Changes (JSON)
```http
PUT http://localhost:3000/api/menus/{menu-item-id}
Authorization: Bearer {your-token}
Content-Type: application/json

{
  "name": "Updated Chicken Adobo",
  "description": "Updated description",
  "price": 160.00,
  "prep_time": 35,
  "is_featured": true,
  "calories": 380
}
```

**Image Update Features:**
- ✅ **Old Image Cleanup**: Automatically removes old images when updating
- ✅ **Same Validation**: Same file type and size restrictions as creation
- ✅ **Rollback Protection**: Failed updates clean up new uploads
- ✅ **External URL Support**: Can switch between file upload and external URLs

**Expected Response:**
```json
{
  "success": true,
  "message": "Menu item updated successfully",
  "data": {
    "id": "menu-item-id",
    "name": "Updated Chicken Adobo",
    "description": "Updated description",
    "price": 160.00,
    "prep_time": 35,
    "is_featured": true,
    "calories": 380,
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

### 5. **DELETE** `/api/menus/:id` - Delete Menu Item
**Description:** Soft delete a menu item (sets is_active to false) and clean up associated image

```http
DELETE http://localhost:3000/api/menus/{menu-item-id}
Authorization: Bearer {your-token}
```

**Delete Features:**
- ✅ **Soft Delete**: Sets `is_active` to false instead of hard delete
- ✅ **Image Cleanup**: Automatically removes associated image from storage
- ✅ **Safe Operation**: Image cleanup failure doesn't prevent deletion

**Expected Response:**
```json
{
  "success": true,
  "message": "Menu item deleted successfully"
}
```

## 📂 Menu Categories Endpoints

### 6. **GET** `/api/menus/categories` - Get All Categories
**Description:** Retrieve all menu categories

```http
GET http://localhost:3000/api/menus/categories
Authorization: Bearer {your-token}
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Main Dishes",
      "description": "Hearty main course items",
      "image_url": "https://...",
      "sort_order": 1,
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 7. **POST** `/api/menus/categories` - Create Category
**Description:** Create a new menu category

```http
POST http://localhost:3000/api/menus/categories
Authorization: Bearer {your-token}
Content-Type: application/json

{
  "name": "Desserts",
  "description": "Sweet treats and desserts",
  "image_url": "https://example.com/desserts.jpg",
  "sort_order": 5,
  "is_active": true
}
```

**Required Fields:**
- `name` (string): Category name

**Optional Fields:**
- `description` (string): Category description
- `image_url` (string): Category image URL
- `sort_order` (number): Display order
- `is_active` (boolean): Active status

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "new-category-uuid",
    "name": "Desserts",
    "description": "Sweet treats and desserts",
    "image_url": "https://example.com/desserts.jpg",
    "sort_order": 5,
    "is_active": true,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

### 8. **PUT** `/api/menus/categories/:id` - Update Category
**Description:** Update an existing menu category

```http
PUT http://localhost:3000/api/menus/categories/{category-id}
Authorization: Bearer {your-token}
Content-Type: application/json

{
  "name": "Updated Desserts",
  "description": "Updated sweet treats",
  "sort_order": 6
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "category-id",
    "name": "Updated Desserts",
    "description": "Updated sweet treats",
    "sort_order": 6,
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

### 9. **DELETE** `/api/menus/categories/:id` - Delete Category
**Description:** Soft delete a menu category

```http
DELETE http://localhost:3000/api/menus/categories/{category-id}
Authorization: Bearer {your-token}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Category deleted successfully"
}
```

## 🔍 Special Endpoints

### 10. **GET** `/api/menus/items-with-categories` - Get Items with Categories
**Description:** Get menu items with their category information joined

```http
GET http://localhost:3000/api/menus/items-with-categories
Authorization: Bearer {your-token}
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Chicken Adobo",
      "price": 150.00,
      "category_name": "Main Dishes",
      "category_description": "Hearty main course items"
    }
  ]
}
```

### 11. **GET** `/api/menus/debug/all` - Debug All Items
**Description:** Debug endpoint to get all menu items without joins

```http
GET http://localhost:3000/api/menus/debug/all
Authorization: Bearer {your-token}
```

### 12. **GET** `/api/menus/test-db` - Test Database Connection
**Description:** Test database connectivity and basic queries

```http
GET http://localhost:3000/api/menus/test-db
Authorization: Bearer {your-token}
```

## 🧪 Testing Scenarios

### Scenario 1: Complete CRUD Flow
1. **Create Category** → POST `/api/menus/categories`
2. **Create Menu Item** → POST `/api/menus` (using category ID)
3. **Get Menu Item** → GET `/api/menus/{id}`
4. **Update Menu Item** → PUT `/api/menus/{id}`
5. **Get All Items** → GET `/api/menus`
6. **Delete Menu Item** → DELETE `/api/menus/{id}`

### Scenario 2: Filtering and Search
1. **Get All Items** → GET `/api/menus`
2. **Filter by Category** → GET `/api/menus?category={category-id}`
3. **Filter Available Items** → GET `/api/menus?available=true`
4. **Search Items** → GET `/api/menus?search=chicken`
5. **Combined Filters** → GET `/api/menus?available=true&featured=true&search=chicken`

### Scenario 3: Image Upload Testing
1. **Create Item with File Upload** → POST `/api/menus` (form-data with image)
2. **Create Item with External URL** → POST `/api/menus` (JSON with image_url)
3. **Update Item with New File** → PUT `/api/menus/{id}` (form-data with new image)
4. **Update Item with External URL** → PUT `/api/menus/{id}` (JSON with new image_url)
5. **Update Item Without Image Change** → PUT `/api/menus/{id}` (JSON without image fields)
6. **Delete Item** → DELETE `/api/menus/{id}` (verify image cleanup)

### Scenario 4: Image Upload Error Testing
1. **Invalid File Type** → POST `/api/menus` (upload .txt file)
2. **File Too Large** → POST `/api/menus` (upload >5MB image)
3. **Invalid File Extension** → POST `/api/menus` (upload .bmp file)
4. **Corrupted File** → POST `/api/menus` (upload corrupted image)

## ❌ Error Testing

### Test Invalid Data:
```json
// Missing required fields
{
  "description": "Missing name and price"
}

// Invalid price
{
  "name": "Test Item",
  "price": -10
}

// Invalid category ID
{
  "name": "Test Item",
  "price": 100,
  "category_id": "invalid-uuid"
}
```

### Test Image Upload Errors:
```http
# Invalid file type (should return 400)
POST http://localhost:3000/api/menus
Content-Type: multipart/form-data
Body: name=Test&price=100&image=[upload .txt file]

# File too large (should return 400)
POST http://localhost:3000/api/menus
Content-Type: multipart/form-data
Body: name=Test&price=100&image=[upload >5MB file]

# Invalid file extension (should return 400)
POST http://localhost:3000/api/menus
Content-Type: multipart/form-data
Body: name=Test&price=100&image=[upload .bmp file]
```

### Test Non-existent Resources:
```http
GET http://localhost:3000/api/menus/non-existent-id
PUT http://localhost:3000/api/menus/non-existent-id
DELETE http://localhost:3000/api/menus/non-existent-id
```

## 📝 Postman Collection Setup

### Environment Variables:
Create a Postman environment with:
- `base_url`: `http://localhost:3000`
- `auth_token`: `{your-jwt-token}`
- `category_id`: `{category-uuid}`
- `menu_item_id`: `{menu-item-uuid}`

### Pre-request Scripts:
Add this to automatically set the Authorization header:
```javascript
pm.request.headers.add({
    key: 'Authorization',
    value: 'Bearer ' + pm.environment.get('auth_token')
});
```

### Tests Scripts:
Add basic response validation:
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has success field", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('success');
});
```

## 🚀 Quick Start Testing

1. **Get Authentication Token** (from auth endpoints)
2. **Create a Category** first
3. **Create Menu Items** using the category
4. **Test All CRUD Operations**
5. **Test Filtering and Search**
6. **Test Image Uploads**

## 📊 Expected Response Times
- GET requests: < 500ms
- POST/PUT requests: < 1000ms
- DELETE requests: < 500ms
- Image uploads: < 3000ms (depending on file size)

## 🔧 Troubleshooting

### Common Issues:
1. **401 Unauthorized**: Check JWT token validity
2. **400 Bad Request**: Validate required fields and data types
3. **404 Not Found**: Verify resource IDs exist
4. **500 Server Error**: Check server logs for detailed errors

### Debug Steps:
1. Use `/api/menus/test-db` to verify database connection
2. Use `/api/menus/debug/all` to check raw data
3. Check server logs in `logs/error.log`
4. Verify Supabase connection and RLS policies

---

**Happy Testing! 🎉**
