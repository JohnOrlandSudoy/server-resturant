// Simple test script for menu endpoints
// Run with: node test-menu-endpoints.js

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000/api/menus';

// Test data
const testMenuItem = {
  name: 'Test Pizza',
  description: 'A delicious test pizza for API testing',
  price: 15.99,
  prep_time: 20,
  is_available: true,
  is_featured: false,
  calories: 350,
  allergens: JSON.stringify(['gluten', 'dairy'])
};

async function testEndpoints() {
  console.log('🧪 Starting Menu API Tests...\n');

  try {
    // Test 1: GET all menu items
    console.log('1️⃣ Testing GET /api/menus');
    const getResponse = await axios.get(BASE_URL);
    console.log('✅ GET Success:', getResponse.data.success);
    console.log('📊 Items count:', getResponse.data.data?.length || 0);
    console.log('');

    // Test 2: GET categories
    console.log('2️⃣ Testing GET /api/menus/categories');
    const categoriesResponse = await axios.get(`${BASE_URL}/categories`);
    console.log('✅ Categories Success:', categoriesResponse.data.success);
    console.log('📂 Categories count:', categoriesResponse.data.data?.length || 0);
    console.log('');

    // Test 3: POST create menu item (without image)
    console.log('3️⃣ Testing POST /api/menus (without image)');
    const createResponse = await axios.post(BASE_URL, testMenuItem, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log('✅ Create Success:', createResponse.data.success);
    console.log('🆔 Created ID:', createResponse.data.data?.id);
    const createdId = createResponse.data.data?.id;
    console.log('');

    if (createdId) {
      // Test 4: GET specific menu item
      console.log('4️⃣ Testing GET /api/menus/:id');
      const getByIdResponse = await axios.get(`${BASE_URL}/${createdId}`);
      console.log('✅ Get by ID Success:', getByIdResponse.data.success);
      console.log('📝 Item name:', getByIdResponse.data.data?.name);
      console.log('');

      // Test 5: PUT update menu item
      console.log('5️⃣ Testing PUT /api/menus/:id');
      const updateData = {
        name: 'Updated Test Pizza',
        price: 18.99,
        is_featured: true
      };
      const updateResponse = await axios.put(`${BASE_URL}/${createdId}`, updateData, {
        headers: { 'Content-Type': 'application/json' }
      });
      console.log('✅ Update Success:', updateResponse.data.success);
      console.log('💰 Updated price:', updateResponse.data.data?.price);
      console.log('');

      // Test 6: DELETE menu item
      console.log('6️⃣ Testing DELETE /api/menus/:id');
      const deleteResponse = await axios.delete(`${BASE_URL}/${createdId}`);
      console.log('✅ Delete Success:', deleteResponse.data.success);
      console.log('🗑️ Delete message:', deleteResponse.data.message);
      console.log('');
    }

    // Test 7: Test database connection
    console.log('7️⃣ Testing database connection');
    const dbTestResponse = await axios.get(`${BASE_URL}/test-db`);
    console.log('✅ DB Test Success:', dbTestResponse.data.success);
    console.log('📊 Total items in DB:', dbTestResponse.data.count);
    console.log('');

    console.log('🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 500) {
      console.log('\n🔧 Troubleshooting tips:');
      console.log('1. Make sure your server is running on port 3000');
      console.log('2. Check if Supabase connection is working');
      console.log('3. Verify the menu_items table exists');
      console.log('4. Check server logs for detailed error messages');
    }
  }
}

// Test image upload (optional - requires a test image file)
async function testImageUpload() {
  console.log('\n🖼️ Testing image upload...');
  
  try {
    // Create a simple test image (1x1 pixel PNG)
    const testImageBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
      0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0x0F, 0x00, 0x00,
      0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
      0x42, 0x60, 0x82
    ]);

    const formData = new FormData();
    formData.append('name', 'Test Pizza with Image');
    formData.append('description', 'Pizza with uploaded test image');
    formData.append('price', '20.99');
    formData.append('prep_time', '25');
    formData.append('is_available', 'true');
    formData.append('is_featured', 'true');
    formData.append('image', testImageBuffer, {
      filename: 'test-pizza.png',
      contentType: 'image/png'
    });

    const uploadResponse = await axios.post(BASE_URL, formData, {
      headers: {
        ...formData.getHeaders(),
        'Content-Type': 'multipart/form-data'
      }
    });

    console.log('✅ Image upload success:', uploadResponse.data.success);
    console.log('🖼️ Image URL:', uploadResponse.data.data?.image_url);
    console.log('📁 Image filename:', uploadResponse.data.data?.image_filename);
    
    // Clean up - delete the test item
    if (uploadResponse.data.data?.id) {
      await axios.delete(`${BASE_URL}/${uploadResponse.data.data.id}`);
      console.log('🗑️ Test item cleaned up');
    }

  } catch (error) {
    console.error('❌ Image upload test failed:', error.response?.data || error.message);
    console.log('\n🔧 Image upload troubleshooting:');
    console.log('1. Check if Supabase bucket "menu-item-images" exists');
    console.log('2. Verify RLS policies are set correctly');
    console.log('3. Ensure file upload middleware is working');
  }
}

// Run tests
async function runAllTests() {
  await testEndpoints();
  
  // Uncomment the line below to test image upload
  // await testImageUpload();
}

// Check if server is running
async function checkServer() {
  try {
    await axios.get('http://localhost:3000/api/menus/test-db');
    return true;
  } catch (error) {
    console.log('❌ Server is not running on http://localhost:3000');
    console.log('Please start your server first with: npm start');
    return false;
  }
}

// Main execution
async function main() {
  console.log('🚀 Menu API Test Suite');
  console.log('=====================\n');
  
  const serverRunning = await checkServer();
  if (serverRunning) {
    await runAllTests();
  }
}

main().catch(console.error);
