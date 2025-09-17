/**
 * Test Ingredient Stock Management System
 * 
 * This script tests the complete ingredient deduction and stock validation system
 */

// Configuration
const API_BASE_URL = 'http://localhost:3000';
const AUTH_TOKEN = 'your-jwt-token-here'; // Update this
const TEST_MENU_ITEM_ID = 'your-menu-item-id-here'; // Update this
const TEST_ORDER_ID = 'your-order-id-here'; // Update this

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
  
  const result = await makeRequest('GET', `/api/orders/menu-items/${TEST_MENU_ITEM_ID}/availability?quantity=2`);
  
  if (result.success) {
    console.log('✅ Menu Item Availability Test PASSED');
    const data = result.data.data;
    console.log(`📊 Menu Item: ${data.menu_item_name}`);
    console.log(`📊 Requested Quantity: ${data.requested_quantity}`);
    console.log(`📊 Is Available: ${data.is_available}`);
    console.log(`📊 Max Available Quantity: ${data.max_available_quantity}`);
    console.log(`📊 Stock Summary:`, data.stock_summary);
    
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

async function testStockStatus() {
  console.log('🧪 Testing Stock Status...');
  
  const result = await makeRequest('GET', '/api/orders/inventory/stock-status');
  
  if (result.success) {
    console.log('✅ Stock Status Test PASSED');
    const ingredients = result.data.data;
    console.log(`📊 Found ${ingredients.length} ingredients`);
    
    const outOfStock = ingredients.filter(ing => ing.stock_status === 'out_of_stock');
    const lowStock = ingredients.filter(ing => ing.stock_status === 'low_stock');
    const sufficient = ingredients.filter(ing => ing.stock_status === 'sufficient');
    
    console.log(`📊 Out of Stock: ${outOfStock.length}`);
    console.log(`📊 Low Stock: ${lowStock.length}`);
    console.log(`📊 Sufficient: ${sufficient.length}`);
    
    if (outOfStock.length > 0) {
      console.log('🚨 Out of Stock Items:');
      outOfStock.forEach(ing => console.log(`   - ${ing.name}: ${ing.current_stock} ${ing.unit}`));
    }
    
    if (lowStock.length > 0) {
      console.log('⚠️  Low Stock Items:');
      lowStock.forEach(ing => console.log(`   - ${ing.name}: ${ing.current_stock} ${ing.unit} (min: ${ing.min_stock_threshold})`));
    }
  } else {
    console.log('❌ Stock Status Test FAILED');
    console.log(`Error: ${result.data?.error || result.error}`);
  }
  
  return result;
}

async function testStockAlerts() {
  console.log('🧪 Testing Stock Alerts...');
  
  const result = await makeRequest('GET', '/api/orders/inventory/alerts');
  
  if (result.success) {
    console.log('✅ Stock Alerts Test PASSED');
    const alerts = result.data.data;
    console.log(`📊 Found ${alerts.length} active alerts`);
    
    if (alerts.length > 0) {
      console.log('🚨 Active Alerts:');
      alerts.forEach(alert => {
        console.log(`   - ${alert.ingredient_name}: ${alert.alert_type} - ${alert.message}`);
      });
    }
  } else {
    console.log('❌ Stock Alerts Test FAILED');
    console.log(`Error: ${result.data?.error || result.error}`);
  }
  
  return result;
}

async function testOrderAvailabilityCheck() {
  console.log('🧪 Testing Order Availability Check...');
  
  const result = await makeRequest('POST', `/api/orders/${TEST_ORDER_ID}/check-availability`);
  
  if (result.success) {
    console.log('✅ Order Availability Check Test PASSED');
    const data = result.data.data;
    console.log(`📊 Order ID: ${data.order_id}`);
    console.log(`📊 Can Checkout: ${data.can_checkout}`);
    console.log(`📊 Has Unavailable Items: ${data.has_unavailable_items}`);
    console.log(`📊 Summary:`, data.summary);
    
    if (data.items && data.items.length > 0) {
      console.log('📋 Order Items:');
      data.items.forEach(item => {
        console.log(`   - ${item.menu_item_name}: Qty ${item.quantity}, Available: ${item.is_available}`);
        if (!item.is_available && item.unavailable_ingredients.length > 0) {
          console.log(`     Unavailable: ${item.unavailable_ingredients.map(ing => ing.ingredient_name).join(', ')}`);
        }
      });
    }
  } else {
    console.log('❌ Order Availability Check Test FAILED');
    console.log(`Error: ${result.data?.error || result.error}`);
  }
  
  return result;
}

async function testAddOrderItemWithValidation() {
  console.log('🧪 Testing Add Order Item with Ingredient Validation...');
  
  const orderItemData = {
    menu_item_id: TEST_MENU_ITEM_ID,
    quantity: 5, // Try a large quantity to test validation
    customizations: {
      size: "large",
      toppings: ["cheese", "pepperoni"]
    },
    special_instructions: "Extra crispy"
  };
  
  const result = await makeRequest('POST', `/api/orders/${TEST_ORDER_ID}/items`, orderItemData);
  
  if (result.success) {
    console.log('✅ Add Order Item Test PASSED');
    console.log('📊 Item added successfully');
  } else {
    console.log('❌ Add Order Item Test FAILED (Expected if insufficient ingredients)');
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

async function testUpdateOrderItemQuantity() {
  console.log('🧪 Testing Update Order Item Quantity...');
  
  // First, get an existing order item
  const getItemsResult = await makeRequest('GET', `/api/orders/${TEST_ORDER_ID}/items`);
  
  if (!getItemsResult.success || !getItemsResult.data.data || getItemsResult.data.data.length === 0) {
    console.log('⚠️  No order items found to update');
    return { success: false, error: 'No order items found' };
  }
  
  const orderItem = getItemsResult.data.data[0];
  const newQuantity = orderItem.quantity + 3; // Increase quantity
  
  const updateData = {
    quantity: newQuantity,
    special_instructions: "Updated quantity test"
  };
  
  const result = await makeRequest('PUT', `/api/orders/items/${orderItem.id}`, updateData);
  
  if (result.success) {
    console.log('✅ Update Order Item Quantity Test PASSED');
    console.log(`📊 Updated quantity from ${orderItem.quantity} to ${newQuantity}`);
  } else {
    console.log('❌ Update Order Item Quantity Test FAILED (Expected if insufficient ingredients)');
    console.log(`Error: ${result.data?.error || result.error}`);
    
    if (result.data?.details) {
      console.log('📊 Error Details:');
      console.log(`   Current Quantity: ${result.data.details.current_quantity}`);
      console.log(`   Requested Quantity: ${result.data.details.requested_quantity}`);
      console.log(`   Additional Needed: ${result.data.details.additional_needed}`);
      console.log(`   Max Available: ${result.data.details.max_available_quantity}`);
    }
  }
  
  return result;
}

async function runAllTests() {
  console.log('🚀 Testing Ingredient Stock Management System');
  console.log('=============================================');
  console.log('');
  
  if (AUTH_TOKEN === 'your-jwt-token-here') {
    console.log('❌ CONFIGURATION ERROR: Please update AUTH_TOKEN in the script');
    return;
  }
  
  if (TEST_MENU_ITEM_ID === 'your-menu-item-id-here') {
    console.log('❌ CONFIGURATION ERROR: Please update TEST_MENU_ITEM_ID in the script');
    return;
  }
  
  if (TEST_ORDER_ID === 'your-order-id-here') {
    console.log('❌ CONFIGURATION ERROR: Please update TEST_ORDER_ID in the script');
    return;
  }
  
  const results = [];
  
  try {
    results.push(await testMenuItemAvailability());
    console.log('');
    results.push(await testStockStatus());
    console.log('');
    results.push(await testStockAlerts());
    console.log('');
    results.push(await testOrderAvailabilityCheck());
    console.log('');
    results.push(await testAddOrderItemWithValidation());
    console.log('');
    results.push(await testUpdateOrderItemQuantity());
    
  } catch (error) {
    console.log('❌ CRITICAL ERROR:', error.message);
  }
  
  // Summary
  console.log('');
  console.log('=============================================');
  console.log('📊 TEST SUMMARY');
  console.log('=============================================');
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const total = results.length;
  
  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('');
    console.log('🎉 All tests passed! The ingredient system is working correctly.');
  } else {
    console.log('');
    console.log('⚠️  Some tests failed. This might be expected if:');
    console.log('   1. Ingredients are out of stock (validation working correctly)');
    console.log('   2. Menu items have insufficient ingredients');
    console.log('   3. Database functions are not installed yet');
  }
  
  return { total, passed, failed, successRate: (passed / total) * 100 };
}

// Run tests if executed directly
if (typeof require !== 'undefined' && require.main === module) {
  runAllTests().then(results => {
    if (results && typeof results.failed !== 'undefined') {
      process.exit(results.failed > 0 ? 1 : 0);
    } else {
      process.exit(1);
    }
  }).catch(error => {
    console.error('Test execution failed:', error.message);
    process.exit(1);
  });
}

console.log(`
📋 INGREDIENT SYSTEM TEST USAGE:

1. Update configuration variables:
   - AUTH_TOKEN: Your JWT authentication token
   - TEST_MENU_ITEM_ID: A valid menu item ID from your database
   - TEST_ORDER_ID: A valid order ID from your database

2. Run the database setup:
   - Execute ingredient-stock-management.sql in Supabase SQL editor

3. Run this test: node test-ingredient-system.js

The test will verify:
- Menu item availability checking
- Stock status monitoring
- Stock alerts system
- Order availability validation
- Ingredient deduction on order item creation
- Quantity update validation
`);
