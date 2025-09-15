const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function clearSyncQueue() {
  console.log('🧹 Clearing Sync Queue...\n');
  
  try {
    // Login
    console.log('1. Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.data.token;
    console.log('✅ Login successful');
    
    // Clear failed items
    console.log('\n2. Clearing failed sync items...');
    try {
      const clearResponse = await axios.delete(`${BASE_URL}/api/sync/failed-items`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Cleared failed items:', clearResponse.data.message);
    } catch (error) {
      console.log('❌ Failed to clear failed items:', error.message);
    }
    
    // Clear legacy items
    console.log('\n3. Clearing legacy sync items...');
    try {
      const legacyResponse = await axios.post(`${BASE_URL}/api/sync/clear-legacy`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Cleared legacy items:', legacyResponse.data.message);
    } catch (error) {
      console.log('❌ Failed to clear legacy items:', error.message);
    }
    
    // Check sync queue
    console.log('\n4. Checking sync queue...');
    try {
      const queueResponse = await axios.get(`${BASE_URL}/api/sync/queue`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const queue = queueResponse.data.data;
      
      if (queue && queue.length > 0) {
        console.log(`⚠️ Still found ${queue.length} items in sync queue`);
        console.log('These items need to be manually cleared from the database.');
      } else {
        console.log('✅ Sync queue is now empty');
      }
    } catch (error) {
      console.log('❌ Failed to check sync queue:', error.message);
    }
    
    console.log('\n🎯 SOLUTION:');
    console.log('The sync queue still contains old items with missing timestamp fields.');
    console.log('To fix this completely:');
    console.log('1. Stop the server (Ctrl+C)');
    console.log('2. Delete the local database file: data/local.db');
    console.log('3. Restart the server: npm run dev');
    console.log('4. The server will recreate the database with proper structure');
    
  } catch (error) {
    console.error('❌ Clear failed:', error.message);
  }
}

clearSyncQueue().catch(console.error);
