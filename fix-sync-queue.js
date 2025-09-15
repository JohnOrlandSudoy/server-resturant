const axios = require('axios');
const sqlite3 = require('better-sqlite3');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const DB_PATH = path.join(__dirname, 'data', 'local.db');

async function fixSyncQueue() {
  console.log('🔧 Fixing Sync Queue Issues...\n');
  
  try {
    // 1. Directly clear the sync queue from SQLite database
    console.log('1. Clearing sync queue from local database...');
    const db = new sqlite3.Database(DB_PATH);
    
    // Clear all sync queue items
    const clearResult = db.prepare('DELETE FROM sync_queue').run();
    console.log(`✅ Cleared ${clearResult.changes} items from sync queue`);
    
    // Clear any failed sync items
    const clearFailedResult = db.prepare('DELETE FROM sync_queue WHERE status = ?').run('failed');
    console.log(`✅ Cleared ${clearFailedResult.changes} failed items`);
    
    db.close();
    
    // 2. Login to API
    console.log('\n2. Logging in to API...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.data.token;
    console.log('✅ Login successful');
    
    // 3. Check sync queue via API
    console.log('\n3. Checking sync queue via API...');
    try {
      const queueResponse = await axios.get(`${BASE_URL}/api/sync/queue`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const queue = queueResponse.data.data;
      
      if (queue && queue.length > 0) {
        console.log(`⚠️ Still found ${queue.length} items in sync queue`);
        queue.forEach((item, index) => {
          console.log(`   ${index + 1}. ${item.operationType} on ${item.tableName} - Status: ${item.status}`);
        });
      } else {
        console.log('✅ Sync queue is now empty');
      }
    } catch (error) {
      console.log('❌ Failed to check sync queue:', error.message);
    }
    
    // 4. Check sync status
    console.log('\n4. Checking sync status...');
    try {
      const statusResponse = await axios.get(`${BASE_URL}/api/sync/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const status = statusResponse.data.data;
      
      console.log('📊 Sync Statistics:');
      console.log(`   Total items: ${status.totalItems || 0}`);
      console.log(`   Pending items: ${status.pendingItems || 0}`);
      console.log(`   Synced items: ${status.syncedItems || 0}`);
      console.log(`   Failed items: ${status.failedItems || 0}`);
    } catch (error) {
      console.log('❌ Failed to get sync status:', error.message);
    }
    
    // 5. Test with a new payment
    console.log('\n5. Testing with a new payment...');
    try {
      // Create test order
      const orderResponse = await axios.post(`${BASE_URL}/api/orders`, {
        customer_name: 'Fix Test Customer',
        customer_phone: '09123456789',
        order_type: 'dine_in',
        table_number: 'FIX1',
        special_instructions: 'Fix test order'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const orderId = orderResponse.data.data.id;
      console.log('✅ Test order created:', orderId);
      
      // Process offline payment
      const paymentResponse = await axios.post(`${BASE_URL}/api/offline-payments/process`, {
        orderId: orderId,
        paymentMethod: 'cash',
        amount: 50.00,
        notes: 'Fix test payment'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('✅ Test payment processed:', paymentResponse.data.data.paymentId);
      
      // Wait for sync
      console.log('\n6. Waiting for sync...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check sync queue again
      const queueResponse2 = await axios.get(`${BASE_URL}/api/sync/queue`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const queue2 = queueResponse2.data.data;
      
      if (queue2 && queue2.length > 0) {
        console.log(`📋 Found ${queue2.length} new items in sync queue`);
        queue2.forEach((item, index) => {
          console.log(`   ${index + 1}. ${item.operationType} on ${item.tableName}`);
          if (item.recordData && item.recordData.created_at) {
            console.log(`      ✅ Has created_at: ${item.recordData.created_at}`);
          } else {
            console.log(`      ❌ Missing created_at field`);
          }
        });
      } else {
        console.log('✅ Sync queue is empty (items may have been processed)');
      }
      
    } catch (error) {
      console.log('❌ Test payment failed:', error.response?.data || error.message);
    }
    
    console.log('\n🎉 Sync queue fix completed!');
    console.log('\n💡 If you still see sync errors, restart the server:');
    console.log('   1. Stop the server (Ctrl+C)');
    console.log('   2. Run: npm run dev');
    
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
  }
}

fixSyncQueue().catch(console.error);
