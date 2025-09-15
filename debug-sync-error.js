const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function debugSyncError() {
  console.log('🔍 Debugging Sync Error for offline_payments...\n');
  
  try {
    // 1. Check if server is running
    console.log('1. Checking server status...');
    try {
      const healthResponse = await axios.get(`${BASE_URL}/health/offline`);
      console.log('✅ Server is running');
      console.log('   Database ready:', healthResponse.data.database.ready);
      console.log('   Online status:', healthResponse.data.offline.isOnline);
    } catch (error) {
      console.log('❌ Server is not running. Please start the server first:');
      console.log('   npm run dev');
      return;
    }
    
    // 2. Login to get token
    console.log('\n2. Logging in to get authentication token...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    const token = loginResponse.data.data.token;
    console.log('✅ Authentication successful');
    
    // 3. Check sync queue
    console.log('\n3. Checking sync queue...');
    try {
      const queueResponse = await axios.get(`${BASE_URL}/api/sync/queue`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const queue = queueResponse.data.data;
      
      if (queue && queue.length > 0) {
        console.log(`📋 Found ${queue.length} items in sync queue:`);
        
        queue.forEach((item, index) => {
          console.log(`   ${index + 1}. ${item.operationType} on ${item.tableName}`);
          console.log(`      ID: ${item.id}`);
          console.log(`      Status: ${item.status}`);
          console.log(`      Created: ${item.createdAt}`);
          
          if (item.tableName === 'offline_payments') {
            console.log(`      Record Data:`, JSON.stringify(item.recordData, null, 2));
          }
        });
      } else {
        console.log('✅ Sync queue is empty');
      }
    } catch (error) {
      console.log('❌ Failed to get sync queue:', error.message);
    }
    
    // 4. Check sync status
    console.log('\n4. Checking sync status...');
    try {
      const statusResponse = await axios.get(`${BASE_URL}/api/sync/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const status = statusResponse.data.data;
      
      console.log('📊 Sync Statistics:');
      console.log(`   Total items: ${status.totalItems}`);
      console.log(`   Pending items: ${status.pendingItems}`);
      console.log(`   Synced items: ${status.syncedItems}`);
      console.log(`   Failed items: ${status.failedItems}`);
      console.log(`   Last sync: ${status.lastSyncTime || 'Never'}`);
    } catch (error) {
      console.log('❌ Failed to get sync status:', error.message);
    }
    
    // 5. Check offline payments table structure
    console.log('\n5. Checking offline payments data...');
    try {
      // Get payment methods
      const methodsResponse = await axios.get(`${BASE_URL}/api/offline-payments/methods`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('💳 Available payment methods:');
      methodsResponse.data.data.forEach(method => {
        console.log(`   - ${method.methodName} (${method.methodKey})`);
      });
      
    } catch (error) {
      console.log('❌ Failed to check payment methods:', error.message);
    }
    
    // 6. Try to clear failed items
    console.log('\n6. Attempting to clear failed sync items...');
    try {
      const clearResponse = await axios.delete(`${BASE_URL}/api/sync/failed-items`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Cleared failed items:', clearResponse.data.message);
    } catch (error) {
      console.log('❌ Failed to clear failed items:', error.message);
    }
    
    // 7. Check for legacy sync items
    console.log('\n7. Checking for legacy sync items...');
    try {
      const legacyResponse = await axios.post(`${BASE_URL}/api/sync/clear-legacy`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Legacy items cleared:', legacyResponse.data.message);
    } catch (error) {
      console.log('❌ Failed to clear legacy items:', error.message);
    }
    
    console.log('\n🎯 Debug Summary:');
    console.log('If you see "Unknown error" in the logs, it could be due to:');
    console.log('1. Data type mismatch between SQLite and PostgreSQL');
    console.log('2. Missing required fields in the record data');
    console.log('3. Constraint violations (foreign key, unique, etc.)');
    console.log('4. RLS (Row Level Security) policy blocking the insert');
    console.log('5. Network connectivity issues with Supabase');
    
    console.log('\n💡 Next Steps:');
    console.log('1. Check the server logs for more detailed error messages');
    console.log('2. Verify the offline_payments table structure in Supabase');
    console.log('3. Test a simple offline payment to see the exact error');
    
  } catch (error) {
    console.error('❌ Debug script failed:', error.message);
  }
}

debugSyncError().catch(console.error);
