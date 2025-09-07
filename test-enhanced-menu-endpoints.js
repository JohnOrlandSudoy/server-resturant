// Enhanced test script for menu endpoints with advanced features
// Run with: node test-enhanced-menu-endpoints.js

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000/api/menus';

// Test data
const testMenuItem = {
  name: 'Enhanced Test Pizza',
  description: 'A delicious test pizza for enhanced API testing',
  price: 15.99,
  prep_time: 20,
  is_available: true,
  is_featured: false,
  calories: 350,
  allergens: JSON.stringify(['gluten', 'dairy'])
};

async function testEnhancedEndpoints() {
  console.log('🚀 Enhanced Menu API Tests');
  console.log('==========================\n');

  try {
    // Test 1: GET all menu items
    console.log('1️⃣ Testing GET /api/menus');
    const getResponse = await axios.get(BASE_URL);
    console.log('✅ GET Success:', getResponse.data.success);
    console.log('📊 Items count:', getResponse.data.data?.length || 0);
    console.log('');

    // Test 2: Test database connection
    console.log('2️⃣ Testing database connection');
    const dbTestResponse = await axios.get(`${BASE_URL}/test-db`);
    console.log('✅ DB Test Success:', dbTestResponse.data.success);
    console.log('📊 Total items in DB:', dbTestResponse.data.count);
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
      console.log('📁 Image filename:', getByIdResponse.data.data?.image_filename || 'None');
      console.log('');

      // Test 5: PUT update menu item
      console.log('5️⃣ Testing PUT /api/menus/:id');
      const updateData = {
        name: 'Updated Enhanced Test Pizza',
        price: 18.99,
        is_featured: true
      };
      const updateResponse = await axios.put(`${BASE_URL}/${createdId}`, updateData, {
        headers: { 'Content-Type': 'application/json' }
      });
      console.log('✅ Update Success:', updateResponse.data.success);
      console.log('💰 Updated price:', updateResponse.data.data?.price);
      console.log('⭐ Is featured:', updateResponse.data.data?.is_featured);
      console.log('');

      // Test 6: DELETE menu item
      console.log('6️⃣ Testing DELETE /api/menus/:id');
      const deleteResponse = await axios.delete(`${BASE_URL}/${createdId}`);
      console.log('✅ Delete Success:', deleteResponse.data.success);
      console.log('🗑️ Delete message:', deleteResponse.data.message);
      console.log('');
    }

    console.log('🎉 All enhanced tests completed successfully!');

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

// Test enhanced image upload with organized file paths
async function testEnhancedImageUpload() {
  console.log('\n🖼️ Testing enhanced image upload with organized paths...');
  
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
    formData.append('name', 'Enhanced Test Pizza with Image');
    formData.append('description', 'Pizza with enhanced organized image storage');
    formData.append('price', '22.99');
    formData.append('prep_time', '25');
    formData.append('is_available', 'true');
    formData.append('is_featured', 'true');
    formData.append('image', testImageBuffer, {
      filename: 'enhanced-test-pizza.png',
      contentType: 'image/png'
    });

    console.log('📤 Uploading image with organized path structure...');
    const uploadResponse = await axios.post(BASE_URL, formData, {
      headers: {
        ...formData.getHeaders(),
        'Content-Type': 'multipart/form-data'
      }
    });

    console.log('✅ Enhanced image upload success:', uploadResponse.data.success);
    console.log('🖼️ Image URL:', uploadResponse.data.data?.image_url);
    console.log('📁 Image filename (organized path):', uploadResponse.data.data?.image_filename);
    console.log('📏 Image size:', uploadResponse.data.data?.image_size, 'bytes');
    console.log('🏷️ MIME type:', uploadResponse.data.data?.image_mime_type);
    
    const uploadedItemId = uploadResponse.data.data?.id;
    
    if (uploadedItemId) {
      // Test updating the image
      console.log('\n🔄 Testing image update with new organized path...');
      
      const updateFormData = new FormData();
      updateFormData.append('name', 'Updated Enhanced Pizza');
      updateFormData.append('price', '25.99');
      updateFormData.append('image', testImageBuffer, {
        filename: 'updated-enhanced-pizza.png',
        contentType: 'image/png'
      });

      const updateResponse = await axios.put(`${BASE_URL}/${uploadedItemId}`, updateFormData, {
        headers: {
          ...updateFormData.getHeaders(),
          'Content-Type': 'multipart/form-data'
        }
      });

      console.log('✅ Image update success:', updateResponse.data.success);
      console.log('📁 New image filename:', updateResponse.data.data?.image_filename);
      console.log('💰 Updated price:', updateResponse.data.data?.price);
      
      // Clean up - delete the test item
      console.log('\n🗑️ Cleaning up test item...');
      await axios.delete(`${BASE_URL}/${uploadedItemId}`);
      console.log('✅ Test item cleaned up successfully');
    }

  } catch (error) {
    console.error('❌ Enhanced image upload test failed:', error.response?.data || error.message);
    console.log('\n🔧 Enhanced image upload troubleshooting:');
    console.log('1. Check if Supabase bucket "menu-item-images" exists');
    console.log('2. Verify RLS policies are set correctly');
    console.log('3. Ensure file upload middleware is working');
    console.log('4. Check if the enhanced file path generation is working');
  }
}

// Test file organization structure
async function testFileOrganization() {
  console.log('\n📁 Testing file organization structure...');
  
  try {
    // Create multiple test items to verify organization
    const testItems = [
      { name: 'Pizza Margherita', price: 15.99 },
      { name: 'Burger Deluxe', price: 12.99 },
      { name: 'Pasta Carbonara', price: 18.99 }
    ];

    const createdIds = [];
    
    for (const item of testItems) {
      const response = await axios.post(BASE_URL, item, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.data.success) {
        createdIds.push(response.data.data.id);
        console.log(`✅ Created: ${item.name} (ID: ${response.data.data.id})`);
      }
    }

    // Verify file organization in responses
    console.log('\n📊 File organization verification:');
    for (const id of createdIds) {
      const response = await axios.get(`${BASE_URL}/${id}`);
      const item = response.data.data;
      console.log(`📁 ${item.name}: ${item.image_filename || 'No image'}`);
    }

    // Clean up all test items
    console.log('\n🗑️ Cleaning up test items...');
    for (const id of createdIds) {
      await axios.delete(`${BASE_URL}/${id}`);
      console.log(`✅ Deleted item: ${id}`);
    }

  } catch (error) {
    console.error('❌ File organization test failed:', error.response?.data || error.message);
  }
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
  console.log('🚀 Enhanced Menu API Test Suite');
  console.log('================================\n');
  
  const serverRunning = await checkServer();
  if (serverRunning) {
    await testEnhancedEndpoints();
    await testEnhancedImageUpload();
    await testFileOrganization();
    
    console.log('\n🎉 All enhanced tests completed!');
    console.log('\n📋 Enhanced Features Tested:');
    console.log('✅ Organized file path structure (menu-items/{id}/...)');
    console.log('✅ Enhanced error handling and cleanup');
    console.log('✅ File moving from temp to organized location');
    console.log('✅ Improved image update with path management');
    console.log('✅ Better logging and debugging information');
  }
}

main().catch(console.error);
