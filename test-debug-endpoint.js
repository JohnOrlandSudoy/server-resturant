/**
 * Debug the ingredient validation endpoint
 */

const API_BASE_URL = 'http://localhost:3000';
const AUTH_TOKEN = 'your-jwt-token-here'; // Update this
const TEST_ORDER_ID = '83aeeffc-3d87-4e84-94c8-23de37c57871';

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

async function testIngredientValidation() {
  console.log('🧪 Testing Ingredient Validation Endpoint...');
  console.log('================================================');
  
  if (AUTH_TOKEN === 'your-jwt-token-here') {
    console.log('❌ CONFIGURATION ERROR: Please update AUTH_TOKEN in the script');
    return;
  }
  
  try {
    // Test the ingredient validation endpoint
    const result = await makeRequest('GET', `/api/orders/${TEST_ORDER_ID}/ingredient-validation`);
    
    if (result.success) {
      console.log('✅ Ingredient Validation Test PASSED');
      console.log('📊 Response:', JSON.stringify(result.data, null, 2));
      
      const data = result.data.data;
      console.log('\n📋 Summary:');
      console.log(`   Order ID: ${data.order_id}`);
      console.log(`   Order Number: ${data.order_number}`);
      console.log(`   Customer: ${data.customer_name}`);
      console.log(`   Total Items: ${data.overall_validation.total_items}`);
      console.log(`   Available Items: ${data.overall_validation.available_items}`);
      console.log(`   Unavailable Items: ${data.overall_validation.unavailable_items}`);
      console.log(`   All Items Available: ${data.overall_validation.all_items_available}`);
      console.log(`   Item Details Count: ${data.item_details.length}`);
      
      if (data.item_details.length > 0) {
        console.log('\n📦 Item Details:');
        data.item_details.forEach((item, index) => {
          console.log(`   ${index + 1}. ${item.menu_item_name}`);
          console.log(`      Quantity: ${item.current_quantity}`);
          console.log(`      Available: ${item.is_available}`);
          console.log(`      Max Available: ${item.max_available_quantity}`);
        });
      } else {
        console.log('\n⚠️  No item details found - this indicates an issue with the validation logic');
      }
      
    } else {
      console.log('❌ Ingredient Validation Test FAILED');
      console.log(`Error: ${result.data?.error || result.error}`);
    }
    
  } catch (error) {
    console.log('❌ CRITICAL ERROR:', error.message);
  }
  
  console.log('\n================================================');
  console.log('📊 TEST COMPLETE');
  console.log('================================================');
}

// Run test if executed directly
if (typeof require !== 'undefined' && require.main === module) {
  testIngredientValidation().catch(error => {
    console.error('Test execution failed:', error.message);
    process.exit(1);
  });
}

console.log(`
📋 DEBUG TEST USAGE:

1. Update the AUTH_TOKEN in this file
2. Run this test: node test-debug-endpoint.js
3. Check the server logs for detailed debugging information

The test will help identify:
- If order items are being fetched correctly
- If the get_menu_item_availability function is working
- Why item_details array might be empty
`);
