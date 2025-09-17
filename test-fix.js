/**
 * Test the fix for menu items without ingredients
 */

// Configuration
const API_BASE_URL = 'http://localhost:3000';
const AUTH_TOKEN = 'your-jwt-token-here'; // Update this
const TEST_MENU_ITEM_ID = 'b23d9602-e150-4a67-a320-6f7f24c5d62b'; // The problematic menu item
const TEST_ORDER_ID = '57c4fd0e-4db4-4a44-8a1a-dd19d3466228'; // Your order ID

async function makeRequest(method, endpoint, data = null) {
  const url = `${API_BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AUTH_TOKEN}`
    }
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  try {
    const response = await fetch(url, options);
    const result = await response.json();
    return { status: response.status, success: response.ok, data: result };
  } catch (error) {
    return { status: 0, success: false, error: error.message };
  }
}

async function testMenuItemAvailability() {
  console.log('🧪 Testing Menu Item Availability...');
  
  const result = await makeRequest('GET', `/api/orders/menu-items/${TEST_MENU_ITEM_ID}/availability?quantity=1`);
  
  if (result.success) {
    console.log('✅ Menu Item Availability Test PASSED');
    const data = result.data.data;
    console.log(`📊 Menu Item: ${data.menu_item_name}`);
    console.log(`📊 Requested Quantity: ${data.requested_quantity}`);
    console.log(`📊 Is Available: ${data.is_available}`);
    console.log(`📊 Max Available Quantity: ${data.max_available_quantity}`);
    console.log(`📊 Stock Summary:`, data.stock_summary);
    
    if (data.stock_summary?.no_ingredients_required) {
      console.log('ℹ️  This menu item requires no ingredients');
    }
    
    if (data.unavailable_ingredients && data.unavailable_ingredients.length > 0) {
      console.log('⚠️  Unavailable Ingredients:');
      data.unavailable_ingredients.forEach(ing => {
        console.log(`   - ${ing.ingredient_name}: Required ${ing.required_quantity}, Available ${ing.available_stock}`);
      });
    }
  } else {
    console.log('❌ Menu Item Availability Test FAILED');
    console.log(`Error: ${result.data?.error || result.error}`);
  }
  
  return result;
}

async function testAddOrderItem() {
  console.log('🧪 Testing Add Order Item...');
  
  const orderItemData = {
    menu_item_id: TEST_MENU_ITEM_ID,
    quantity: 1
  };
  
  const result = await makeRequest('POST', `/api/orders/${TEST_ORDER_ID}/items`, orderItemData);
  
  if (result.success) {
    console.log('✅ Add Order Item Test PASSED');
    console.log('📊 Item added successfully');
    console.log('📊 Response:', result.data);
  } else {
    console.log('❌ Add Order Item Test FAILED');
    console.log(`Error: ${result.data?.error || result.error}`);
    
    if (result.data?.details) {
      console.log('📊 Error Details:');
      console.log(`   Max Available Quantity: ${result.data.details.max_available_quantity}`);
      console.log(`   Stock Summary:`, result.data.details.stock_summary);
      
      if (result.data.details.unavailable_ingredients) {
        console.log('   Unavailable Ingredients:');
        result.data.details.unavailable_ingredients.forEach(ing => {
          console.log(`     - ${ing.ingredient_name}: Need ${ing.required_quantity}, Have ${ing.available_stock}`);
        });
      }
    }
  }
  
  return result;
}

async function runTest() {
  console.log('🚀 Testing Fix for Menu Items Without Ingredients');
  console.log('================================================');
  console.log('');
  
  if (AUTH_TOKEN === 'your-jwt-token-here') {
    console.log('❌ CONFIGURATION ERROR: Please update AUTH_TOKEN in the script');
    return;
  }
  
  try {
    await testMenuItemAvailability();
    console.log('');
    await testAddOrderItem();
    
  } catch (error) {
    console.log('❌ CRITICAL ERROR:', error.message);
  }
  
  console.log('');
  console.log('================================================');
  console.log('📊 TEST COMPLETE');
  console.log('================================================');
}

// Run test if executed directly
if (typeof require !== 'undefined' && require.main === module) {
  runTest().catch(error => {
    console.error('Test execution failed:', error.message);
    process.exit(1);
  });
}

console.log(`
📋 QUICK FIX TEST USAGE:

1. First, run the fix script in Supabase:
   - Execute fix-menu-items-without-ingredients.sql in Supabase SQL editor

2. Update the AUTH_TOKEN in this file

3. Run this test: node test-fix.js

The test will verify:
- Menu item availability checking works for items without ingredients
- Order item creation succeeds for items without ingredients
- Proper error handling and messaging
`);

