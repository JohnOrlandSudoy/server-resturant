const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testSyncDebug() {
  console.log('🧪 Testing Sync Error Reproduction...\n');
  
  try {
    // 1. Login
    console.log('1. Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.data.token;
    console.log('✅ Login successful');
    
    // 2. Create a test order
    console.log('\n2. Creating test order...');
    const orderResponse = await axios.post(`${BASE_URL}/api/orders`, {
      customer_name: 'Sync Test Customer',
      customer_phone: '09123456789',
      order_type: 'dine_in',
      table_number: 'TEST1',
      special_instructions: 'Sync test order'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const orderId = orderResponse.data.data.id;
    console.log('✅ Order created:', orderId);
    
    // 3. Process offline payment
    console.log('\n3. Processing offline payment...');
    const paymentResponse = await axios.post(`${BASE_URL}/api/offline-payments/process`, {
      orderId: orderId,
      paymentMethod: 'cash',
      amount: 100.00,
      notes: 'Sync test payment'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Payment processed:', paymentResponse.data.data.paymentId);
    
    // 4. Wait a moment for sync to trigger
    console.log('\n4. Waiting for sync to trigger...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 5. Check sync queue
    console.log('\n5. Checking sync queue...');
    const queueResponse = await axios.get(`${BASE_URL}/api/sync/queue`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const queue = queueResponse.data.data;
    
    if (queue && queue.length > 0) {
      console.log(`📋 Found ${queue.length} items in sync queue`);
      
      // Look for offline_payments items
      const paymentItems = queue.filter(item => item.tableName === 'offline_payments');
      if (paymentItems.length > 0) {
        console.log(`💳 Found ${paymentItems.length} offline_payments items:`);
        paymentItems.forEach((item, index) => {
          console.log(`   ${index + 1}. ${item.operationType} - Status: ${item.status}`);
          console.log(`      Record Data:`, JSON.stringify(item.recordData, null, 2));
        });
      }
    } else {
      console.log('✅ Sync queue is empty (items may have been processed)');
    }
    
    // 6. Force sync to see the error
    console.log('\n6. Forcing sync to see the error...');
    try {
      const syncResponse = await axios.post(`${BASE_URL}/api/sync/force-sync`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Force sync completed:', syncResponse.data.message);
    } catch (error) {
      console.log('❌ Force sync failed:', error.response?.data || error.message);
    }
    
    // 7. Check sync status again
    console.log('\n7. Checking final sync status...');
    const statusResponse = await axios.get(`${BASE_URL}/api/sync/status`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const status = statusResponse.data.data;
    
    console.log('📊 Final Sync Statistics:');
    console.log(`   Total items: ${status.totalItems}`);
    console.log(`   Pending items: ${status.pendingItems}`);
    console.log(`   Synced items: ${status.syncedItems}`);
    console.log(`   Failed items: ${status.failedItems}`);
    
    if (status.failedItems > 0) {
      console.log('\n❌ There are failed sync items. Check the server logs for details.');
    } else {
      console.log('\n✅ All items synced successfully!');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testSyncDebug().catch(console.error);
