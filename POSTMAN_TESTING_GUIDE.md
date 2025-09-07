# Postman Testing Guide for Menu Items API

This guide shows how to test your menu item endpoints using Postman.

## 🚀 Setup

### 1. Base URL
```
http://localhost:3000/api/menus
```

### 2. Headers (if authentication is required)
```
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
```

## 📋 Test Cases

### 1. GET All Menu Items
**Method:** `GET`  
**URL:** `http://localhost:3000/api/menus`  
**Headers:** None required  
**Query Parameters (optional):**
- `page=1`
- `limit=10`
- `category=category_id`
- `available=true`
- `featured=true`
- `search=pizza`

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Pizza Margherita",
      "description": "Classic pizza with tomato and mozzarella",
      "price": 12.99,
      "image_url": "https://...",
      "image_filename": "menu-1234567890-pizza.jpg",
      "is_available": true,
      "is_featured": false
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

### 2. GET Menu Item by ID
**Method:** `GET`  
**URL:** `http://localhost:3000/api/menus/{menu_item_id}`  
**Example:** `http://localhost:3000/api/menus/123e4567-e89b-12d3-a456-426614174000`

### 3. GET Menu Categories
**Method:** `GET`  
**URL:** `http://localhost:3000/api/menus/categories`

### 4. POST Create Menu Item (Without Image)
**Method:** `POST`  
**URL:** `http://localhost:3000/api/menus`  
**Headers:**
```
Content-Type: application/json
```
**Body (JSON):**
```json
{
  "name": "Test Pizza",
  "description": "A delicious test pizza",
  "price": 15.99,
  "category_id": "category-uuid-here",
  "prep_time": 20,
  "is_available": true,
  "is_featured": false,
  "calories": 350,
  "allergens": ["gluten", "dairy"]
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Menu item created successfully",
  "data": {
    "id": "new-uuid",
    "name": "Test Pizza",
    "price": 15.99,
    "image_url": null,
    "image_filename": null,
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### 5. POST Create Menu Item (With Image Upload)
**Method:** `POST`  
**URL:** `http://localhost:3000/api/menus`  
**Headers:**
```
Content-Type: multipart/form-data
```
**Body (form-data):**
- `name`: `Test Pizza with Image`
- `description`: `Pizza with uploaded image`
- `price`: `18.99`
- `category_id`: `category-uuid-here`
- `prep_time`: `25`
- `is_available`: `true`
- `is_featured`: `true`
- `calories`: `400`
- `allergens`: `["gluten", "dairy"]`
- `image`: `[Select File]` (Choose a JPG/PNG image)

**Expected Response:**
```json
{
  "success": true,
  "message": "Menu item created successfully",
  "data": {
    "id": "new-uuid",
    "name": "Test Pizza with Image",
    "price": 18.99,
    "image_url": "https://your-project.supabase.co/storage/v1/object/public/menu-item-images/menu-1234567890-pizza.jpg",
    "image_filename": "menu-1234567890-pizza.jpg",
    "image_mime_type": "image/jpeg",
    "image_size": 245760,
    "image_alt_text": "Test Pizza with Image"
  }
}
```

### 6. PUT Update Menu Item
**Method:** `PUT`  
**URL:** `http://localhost:3000/api/menus/{menu_item_id}`  
**Headers:**
```
Content-Type: multipart/form-data
```
**Body (form-data):**
- `name`: `Updated Pizza Name`
- `price`: `20.99`
- `is_featured`: `true`
- `image`: `[Select New File]` (Optional - new image)

### 7. DELETE Menu Item
**Method:** `DELETE`  
**URL:** `http://localhost:3000/api/menus/{menu_item_id}`  
**Headers:** None required

**Expected Response:**
```json
{
  "success": true,
  "message": "Menu item deleted successfully"
}
```

## 🧪 Test Scenarios

### Scenario 1: Basic CRUD Operations
1. **Create** a menu item without image
2. **Read** the created item
3. **Update** the item with new data
4. **Delete** the item

### Scenario 2: Image Upload Testing
1. **Create** menu item with image
2. **Verify** image URL is accessible
3. **Update** with new image
4. **Verify** old image is cleaned up

### Scenario 3: Error Handling
1. **Create** item with invalid data (missing name/price)
2. **Upload** invalid file type (non-image)
3. **Update** non-existent item
4. **Delete** non-existent item

## 🔍 Debug Endpoints

### Test Database Connection
**Method:** `GET`  
**URL:** `http://localhost:3000/api/menus/test-db`

### Debug All Menu Items
**Method:** `GET`  
**URL:** `http://localhost:3000/api/menus/debug/all`

## 📝 Postman Collection Setup

### 1. Create New Collection
- Name: "Restaurant Menu API"
- Add environment variables:
  - `base_url`: `http://localhost:3000/api/menus`
  - `menu_item_id`: `{{menu_item_id}}`

### 2. Pre-request Scripts
Add this to set dynamic values:
```javascript
// Generate random menu item data
pm.environment.set("random_name", "Test Item " + Math.random().toString(36).substr(2, 9));
pm.environment.set("random_price", (Math.random() * 50 + 5).toFixed(2));
```

### 3. Tests Scripts
Add this to save response data:
```javascript
// Save menu item ID for other requests
if (pm.response.code === 201 && pm.response.json().data?.id) {
    pm.environment.set("menu_item_id", pm.response.json().data.id);
}

// Test response structure
pm.test("Response has success field", function () {
    pm.expect(pm.response.json()).to.have.property("success");
});

pm.test("Success is true", function () {
    pm.expect(pm.response.json().success).to.be.true;
});
```

## 🚨 Common Issues & Solutions

### Issue 1: "Failed to upload image"
**Solution:** 
- Check if Supabase bucket `menu-item-images` exists
- Verify RLS policies are set correctly
- Ensure file size is under 5MB

### Issue 2: "Invalid file type"
**Solution:**
- Only upload: JPG, PNG, WebP, GIF files
- Check file extension and MIME type

### Issue 3: "Menu item not found"
**Solution:**
- Verify the menu item ID exists
- Check if item was soft-deleted (is_active = false)

### Issue 4: "Database error"
**Solution:**
- Check Supabase connection
- Verify table schema matches
- Check RLS policies

## 📊 Expected File Structure in Bucket

After successful uploads, your Supabase bucket should contain:
```
menu-item-images/
├── menu-1234567890-pizza.jpg
├── menu-1234567891-burger.png
├── menu-1234567892-pasta.webp
└── ...
```

## 🔧 Environment Variables for Postman

Create these environment variables:
- `base_url`: `http://localhost:3000/api/menus`
- `supabase_url`: `https://your-project.supabase.co`
- `jwt_token`: `your-jwt-token-here`
- `category_id`: `your-category-uuid-here`

## 📈 Performance Testing

### Load Testing with Postman Runner
1. Create collection with multiple requests
2. Use Postman Runner to execute 100+ requests
3. Monitor response times and error rates
4. Test concurrent image uploads

### Image Upload Stress Test
1. Upload multiple large images simultaneously
2. Test with different file types and sizes
3. Monitor bucket storage usage
4. Check for memory leaks or timeouts
