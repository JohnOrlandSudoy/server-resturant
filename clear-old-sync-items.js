const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function clearOldSyncItems() {
  console.log('🧹 Clearing old sync items...\n');
  
  try {
    // Login
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.data.token;
    console.log('✅ Login successful');
    
    // Clear failed items
    console.log('\n1. Clearing failed sync items...');
    const clearResponse = await axios.delete(`${BASE_URL}/api/sync/failed-items`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Cleared failed items:', clearResponse.data.message);
    
    // Clear legacy items
    console.log('\n2. Clearing legacy sync items...');
    const legacyResponse = await axios.post(`${BASE_URL}/api/sync/clear-legacy`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Cleared legacy items:', legacyResponse.data.message);
    
    // Check sync queue
    console.log('\n3. Checking sync queue after cleanup...');
    const queueResponse = await axios.get(`${BASE_URL}/api/sync/queue`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const queue = queueResponse.data.data;
    
    if (queue && queue.length > 0) {
      console.log(`📋 Found ${queue.length} items in sync queue:`);
      queue.forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.operationType} on ${item.tableName} - Status: ${item.status}`);
      });
    } else {
      console.log('✅ Sync queue is now empty');
    }
    
    // Force sync to test
    console.log('\n4. Testing sync with clean queue...');
    const syncResponse = await axios.post(`${BASE_URL}/api/sync/force-sync`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Force sync completed:', syncResponse.data.message);
    
    console.log('\n🎉 Cleanup completed! The sync error should now be resolved.');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error.response?.data || error.message);
  }
}

clearOldSyncItems().catch(console.error);
