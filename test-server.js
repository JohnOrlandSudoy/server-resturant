const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testServer() {
  console.log('🧪 Testing AdminRestu Server...\n');

  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health check passed:', healthResponse.data);
    console.log('');

    // Test authentication endpoint
    console.log('2. Testing authentication endpoint...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    console.log('✅ Login successful:', loginResponse.data.message);
    console.log('');

    // Test protected endpoint with token
    console.log('3. Testing protected endpoint...');
    const token = loginResponse.data.data.token;
    const ordersResponse = await axios.get(`${BASE_URL}/api/orders`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('✅ Protected endpoint accessible');
    console.log('');

    console.log('🎉 All tests passed! Server is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    console.log('\n💡 Make sure the server is running on port 3000');
  }
}

// Run test if server is available
testServer();
