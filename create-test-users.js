const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function createTestUsers() {
  console.log('👥 Creating test users for offline mode testing...\n');
  
  const testUsers = [
    {
      username: 'cashier',
      password: 'cashier123',
      email: 'cashier@test.com',
      firstName: 'Test',
      lastName: 'Cashier',
      role: 'cashier'
    },
    {
      username: 'kitchen',
      password: 'kitchen123',
      email: 'kitchen@test.com',
      firstName: 'Test',
      lastName: 'Kitchen',
      role: 'kitchen'
    }
  ];
  
  for (const user of testUsers) {
    try {
      console.log(`Creating ${user.role} user: ${user.username}...`);
      
      const response = await axios.post(`${BASE_URL}/api/auth/register`, user);
      
      if (response.data.success) {
        console.log(`✅ ${user.role.toUpperCase()}: ${user.username} created successfully`);
      } else {
        console.log(`⚠️ ${user.role.toUpperCase()}: ${user.username} - ${response.data.error}`);
      }
    } catch (error) {
      if (error.response?.status === 409) {
        console.log(`ℹ️ ${user.role.toUpperCase()}: ${user.username} already exists`);
      } else {
        console.log(`❌ ${user.role.toUpperCase()}: ${user.username} - ${error.response?.data?.error || error.message}`);
      }
    }
  }
  
  console.log('\n🎉 Test user creation completed!');
  console.log('You can now run: node test-offline-mode-complete.js');
}

createTestUsers().catch(console.error);
