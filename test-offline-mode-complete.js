const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3000';
const TEST_USERS = {
  admin: { username: 'admin', password: 'admin123' },
  cashier: { username: 'cashier', password: 'cashier123' },
  kitchen: { username: 'kitchen', password: 'kitchen123' }
};

// Test results tracking
const testResults = {
  admin: { passed: 0, failed: 0, tests: [] },
  cashier: { passed: 0, failed: 0, tests: [] },
  kitchen: { passed: 0, failed: 0, tests: [] }
};

// Utility functions
async function login(role) {
  const user = TEST_USERS[role];
  if (!user) {
    throw new Error(`Test user for role ${role} not found`);
  }
  
  const response = await axios.post(`${BASE_URL}/api/auth/login`, {
    username: user.username,
    password: user.password
  });
  
  if (!response.data.success) {
    throw new Error(`Login failed for ${role}: ${response.data.error}`);
  }
  
  return response.data.data.token;
}

async function makeRequest(method, url, data = null, token = null) {
  const config = {
    method,
    url: `${BASE_URL}${url}`,
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  if (data) {
    config.data = data;
  }
  
  return await axios(config);
}

function logTest(role, testName, success, error = null) {
  const result = { testName, success, error };
  testResults[role].tests.push(result);
  
  if (success) {
    testResults[role].passed++;
    console.log(`✅ ${role.toUpperCase()}: ${testName}`);
  } else {
    testResults[role].failed++;
    console.log(`❌ ${role.toUpperCase()}: ${testName} - ${error}`);
  }
}

// Test functions
async function testAdminFeatures(token) {
  console.log('\n🔧 Testing ADMIN Features...');
  
  try {
    // 1. Order Management - Create order
    const orderData = {
      customer_name: 'Admin Test Customer',
      customer_phone: '09123456789',
      order_type: 'dine_in',
      table_number: 'A1',
      special_instructions: 'Admin test order'
    };
    
    const createOrderResponse = await makeRequest('POST', '/api/orders', orderData, token);
    logTest('admin', 'Create Order', createOrderResponse.data.success);
    
    const orderId = createOrderResponse.data.data?.id;
    
    // 2. Order Management - View orders
    const getOrdersResponse = await makeRequest('GET', '/api/orders', null, token);
    logTest('admin', 'View All Orders', getOrdersResponse.data.success);
    
    // 3. Payment Processing - Process offline payment
    if (orderId) {
      const paymentData = {
        orderId: orderId,
        paymentMethod: 'cash',
        amount: 150.00,
        notes: 'Admin test payment'
      };
      
      const paymentResponse = await makeRequest('POST', '/api/offline-payments/process', paymentData, token);
      logTest('admin', 'Process Offline Payment', paymentResponse.data.success);
    }
    
    // 4. Menu Management - Get menu items
    const menuResponse = await makeRequest('GET', '/api/menu', null, token);
    logTest('admin', 'View Menu Items', menuResponse.data.success);
    
    // 5. Inventory Management - Get ingredients
    const inventoryResponse = await makeRequest('GET', '/api/inventory', null, token);
    logTest('admin', 'View Inventory', inventoryResponse.data.success);
    
    // 6. User Management - Get profile
    const profileResponse = await makeRequest('GET', '/api/auth/profile', null, token);
    logTest('admin', 'View User Profile', profileResponse.data.success);
    
    // 7. System Configuration - Get payment methods
    const paymentMethodsResponse = await makeRequest('GET', '/api/offline-payments/methods', null, token);
    logTest('admin', 'View Payment Methods', paymentMethodsResponse.data.success);
    
    // 8. Sync Management - Get sync status
    const syncStatusResponse = await makeRequest('GET', '/api/sync/status', null, token);
    logTest('admin', 'View Sync Status', syncStatusResponse.data.success);
    
    // 9. Offline Status - Get offline status
    const offlineStatusResponse = await makeRequest('GET', '/health/offline');
    logTest('admin', 'View Offline Status', offlineStatusResponse.data.status === 'healthy');
    
  } catch (error) {
    logTest('admin', 'Admin Features Test', false, error.message);
  }
}

async function testCashierFeatures(token) {
  console.log('\n💰 Testing CASHIER Features...');
  
  try {
    // 1. Order Creation - Create new order
    const orderData = {
      customer_name: 'Cashier Test Customer',
      customer_phone: '09123456788',
      order_type: 'takeout',
      special_instructions: 'Cashier test order'
    };
    
    const createOrderResponse = await makeRequest('POST', '/api/orders', orderData, token);
    logTest('cashier', 'Create Order', createOrderResponse.data.success);
    
    const orderId = createOrderResponse.data.data?.id;
    
    // 2. Order Management - View order details
    if (orderId) {
      const orderDetailResponse = await makeRequest('GET', `/api/orders/${orderId}`, null, token);
      logTest('cashier', 'View Order Details', orderDetailResponse.data.success);
    }
    
    // 3. Payment Processing - Process cash payment
    if (orderId) {
      const cashPaymentData = {
        orderId: orderId,
        paymentMethod: 'cash',
        amount: 200.00,
        notes: 'Cash payment test'
      };
      
      const cashPaymentResponse = await makeRequest('POST', '/api/offline-payments/process', cashPaymentData, token);
      logTest('cashier', 'Process Cash Payment', cashPaymentResponse.data.success);
      
      // 4. Receipt Generation
      if (cashPaymentResponse.data.success) {
        const paymentId = cashPaymentResponse.data.data.paymentId;
        const receiptResponse = await makeRequest('GET', `/api/offline-payments/receipt/${paymentId}`, null, token);
        logTest('cashier', 'Generate Receipt', receiptResponse.data.success);
      }
    }
    
    // 5. Payment Processing - Process GCash payment
    if (orderId) {
      const gcashPaymentData = {
        orderId: orderId,
        paymentMethod: 'gcash',
        amount: 100.00,
        notes: 'GCash payment test'
      };
      
      const gcashPaymentResponse = await makeRequest('POST', '/api/offline-payments/process', gcashPaymentData, token);
      logTest('cashier', 'Process GCash Payment', gcashPaymentResponse.data.success);
    }
    
    // 6. Payment Processing - Process card payment
    if (orderId) {
      const cardPaymentData = {
        orderId: orderId,
        paymentMethod: 'card',
        amount: 75.00,
        notes: 'Card payment test'
      };
      
      const cardPaymentResponse = await makeRequest('POST', '/api/offline-payments/process', cardPaymentData, token);
      logTest('cashier', 'Process Card Payment', cardPaymentResponse.data.success);
    }
    
    // 7. Payment History - View payment history
    if (orderId) {
      const paymentHistoryResponse = await makeRequest('GET', `/api/offline-payments/order/${orderId}/history`, null, token);
      logTest('cashier', 'View Payment History', paymentHistoryResponse.data.success);
    }
    
    // 8. Menu Access - View menu items
    const menuResponse = await makeRequest('GET', '/api/menu', null, token);
    logTest('cashier', 'View Menu Items', menuResponse.data.success);
    
    // 9. Customer Management - Get profile (as customer management)
    const profileResponse = await makeRequest('GET', '/api/auth/profile', null, token);
    logTest('cashier', 'View User Profile', profileResponse.data.success);
    
    // 10. Available Payment Methods
    const paymentMethodsResponse = await makeRequest('GET', '/api/offline-payments/methods', null, token);
    logTest('cashier', 'View Available Payment Methods', paymentMethodsResponse.data.success);
    
  } catch (error) {
    logTest('cashier', 'Cashier Features Test', false, error.message);
  }
}

async function testKitchenFeatures(token) {
  console.log('\n👨‍🍳 Testing KITCHEN Features...');
  
  try {
    // 1. Order Viewing - Get kitchen orders
    const kitchenOrdersResponse = await makeRequest('GET', '/api/orders/kitchen/orders', null, token);
    logTest('kitchen', 'View Kitchen Orders', kitchenOrdersResponse.data.success);
    
    // 2. Create a test order first (if no orders exist)
    const orderData = {
      customer_name: 'Kitchen Test Customer',
      customer_phone: '09123456787',
      order_type: 'dine_in',
      table_number: 'B2',
      special_instructions: 'Kitchen test order - extra spicy'
    };
    
    const createOrderResponse = await makeRequest('POST', '/api/orders', orderData, token);
    logTest('kitchen', 'Create Test Order', createOrderResponse.data.success);
    
    const orderId = createOrderResponse.data.data?.id;
    
    // 3. Status Updates - Update order status to preparing
    if (orderId) {
      const statusUpdateData = {
        status: 'preparing',
        notes: 'Started cooking'
      };
      
      const statusUpdateResponse = await makeRequest('PUT', `/api/orders/${orderId}/status`, statusUpdateData, token);
      logTest('kitchen', 'Update Status to Preparing', statusUpdateResponse.data.success);
    }
    
    // 4. Status Updates - Update order status to ready
    if (orderId) {
      const statusUpdateData = {
        status: 'ready',
        notes: 'Order ready for pickup'
      };
      
      const statusUpdateResponse = await makeRequest('PUT', `/api/orders/${orderId}/status`, statusUpdateData, token);
      logTest('kitchen', 'Update Status to Ready', statusUpdateResponse.data.success);
    }
    
    // 5. Status Updates - Update order status to completed
    if (orderId) {
      const statusUpdateData = {
        status: 'completed',
        notes: 'Order completed and served'
      };
      
      const statusUpdateResponse = await makeRequest('PUT', `/api/orders/${orderId}/status`, statusUpdateData, token);
      logTest('kitchen', 'Update Status to Completed', statusUpdateResponse.data.success);
    }
    
    // 6. Order History - View order status history
    if (orderId) {
      const orderHistoryResponse = await makeRequest('GET', `/api/orders/${orderId}/history`, null, token);
      logTest('kitchen', 'View Order Status History', orderHistoryResponse.data.success);
    }
    
    // 7. Menu Access - View menu items and ingredients
    const menuResponse = await makeRequest('GET', '/api/menu', null, token);
    logTest('kitchen', 'View Menu Items', menuResponse.data.success);
    
    // 8. Special Instructions - View order with special instructions
    if (orderId) {
      const orderDetailResponse = await makeRequest('GET', `/api/orders/${orderId}`, null, token);
      logTest('kitchen', 'View Order Special Instructions', orderDetailResponse.data.success);
    }
    
    // 9. Prep Time Tracking - Update estimated prep time
    if (orderId) {
      const prepTimeData = {
        estimated_prep_time: 15
      };
      
      const prepTimeResponse = await makeRequest('PUT', `/api/orders/${orderId}`, prepTimeData, token);
      logTest('kitchen', 'Update Estimated Prep Time', prepTimeResponse.data.success);
    }
    
    // 10. User Profile - View kitchen user profile
    const profileResponse = await makeRequest('GET', '/api/auth/profile', null, token);
    logTest('kitchen', 'View User Profile', profileResponse.data.success);
    
  } catch (error) {
    logTest('kitchen', 'Kitchen Features Test', false, error.message);
  }
}

async function testOfflineMode() {
  console.log('\n📡 Testing OFFLINE MODE Features...');
  
  try {
    // 1. Offline Status Check
    const offlineStatusResponse = await makeRequest('GET', '/health/offline');
    logTest('admin', 'Offline Status Check', offlineStatusResponse.data.status === 'healthy');
    
    // 2. Sync Status Check
    const adminToken = await login('admin');
    const syncStatusResponse = await makeRequest('GET', '/api/sync/status', null, adminToken);
    logTest('admin', 'Sync Status Check', syncStatusResponse.data.success);
    
    // 3. Payment Methods Availability
    const paymentMethodsResponse = await makeRequest('GET', '/api/offline-payments/methods', null, adminToken);
    logTest('admin', 'Payment Methods Available', paymentMethodsResponse.data.success);
    
    console.log('\n📊 Offline Mode Status:');
    console.log(`   Online Status: ${offlineStatusResponse.data.offline.isOnline ? '🟢 Online' : '🟡 Offline'}`);
    console.log(`   Network Mode: ${offlineStatusResponse.data.offline.networkMode.mode}`);
    console.log(`   Pending Sync: ${offlineStatusResponse.data.offline.pendingSyncCount}`);
    console.log(`   Database Ready: ${offlineStatusResponse.data.database.ready ? '✅' : '❌'}`);
    
  } catch (error) {
    logTest('admin', 'Offline Mode Test', false, error.message);
  }
}

// Main test function
async function runAllTests() {
  console.log('🧪 COMPREHENSIVE OFFLINE MODE TEST SUITE');
  console.log('==========================================');
  
  try {
    // Test offline mode features first
    await testOfflineMode();
    
    // Test each role
    for (const role of ['admin', 'cashier', 'kitchen']) {
      try {
        const token = await login(role);
        
        switch (role) {
          case 'admin':
            await testAdminFeatures(token);
            break;
          case 'cashier':
            await testCashierFeatures(token);
            break;
          case 'kitchen':
            await testKitchenFeatures(token);
            break;
        }
      } catch (error) {
        logTest(role, 'Login', false, error.message);
      }
    }
    
    // Print summary
    console.log('\n📊 TEST RESULTS SUMMARY');
    console.log('=======================');
    
    for (const role of ['admin', 'cashier', 'kitchen']) {
      const results = testResults[role];
      const total = results.passed + results.failed;
      const percentage = total > 0 ? Math.round((results.passed / total) * 100) : 0;
      
      console.log(`\n${role.toUpperCase()}:`);
      console.log(`   ✅ Passed: ${results.passed}`);
      console.log(`   ❌ Failed: ${results.failed}`);
      console.log(`   📊 Success Rate: ${percentage}%`);
      
      if (results.failed > 0) {
        console.log(`   🔍 Failed Tests:`);
        results.tests.filter(t => !t.success).forEach(test => {
          console.log(`      - ${test.testName}: ${test.error}`);
        });
      }
    }
    
    // Overall summary
    const totalPassed = Object.values(testResults).reduce((sum, r) => sum + r.passed, 0);
    const totalFailed = Object.values(testResults).reduce((sum, r) => sum + r.failed, 0);
    const totalTests = totalPassed + totalFailed;
    const overallPercentage = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;
    
    console.log(`\n🎯 OVERALL RESULTS:`);
    console.log(`   ✅ Total Passed: ${totalPassed}`);
    console.log(`   ❌ Total Failed: ${totalFailed}`);
    console.log(`   📊 Overall Success Rate: ${overallPercentage}%`);
    
    if (overallPercentage >= 90) {
      console.log(`\n🎉 EXCELLENT! Your offline mode is working perfectly!`);
    } else if (overallPercentage >= 70) {
      console.log(`\n👍 GOOD! Most features are working, but some issues need attention.`);
    } else {
      console.log(`\n⚠️ NEEDS WORK! Several features are not working properly.`);
    }
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
  }
}

// Run the tests
runAllTests().catch(console.error);
