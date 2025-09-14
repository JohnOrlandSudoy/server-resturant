// Test script for payment method toggle functionality
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const ENDPOINT = '/api/payments/admin/methods/paymongo/toggle';

// You'll need to get a valid JWT token from your login endpoint
const AUTH_TOKEN = 'YOUR_JWT_TOKEN_HERE'; // Replace with actual token

async function testPaymentToggle() {
  console.log('🧪 Testing Payment Method Toggle Functionality\n');

  try {
    // Test 1: Set paymongo to false (disable)
    console.log('📝 Test 1: Disabling PayMongo (set to false)');
    const disableResponse = await axios.put(`${BASE_URL}${ENDPOINT}`, {
      is_enabled: false
    }, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Disable Response:', JSON.stringify(disableResponse.data, null, 2));
    console.log('Status:', disableResponse.status);
    console.log('');

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 2: Set paymongo to true (enable)
    console.log('📝 Test 2: Enabling PayMongo (set to true)');
    const enableResponse = await axios.put(`${BASE_URL}${ENDPOINT}`, {
      is_enabled: true
    }, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Enable Response:', JSON.stringify(enableResponse.data, null, 2));
    console.log('Status:', enableResponse.status);
    console.log('');

    // Test 3: Try to set to the same value (should return success)
    console.log('📝 Test 3: Setting to same value (should return success)');
    const sameValueResponse = await axios.put(`${BASE_URL}${ENDPOINT}`, {
      is_enabled: true
    }, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Same Value Response:', JSON.stringify(sameValueResponse.data, null, 2));
    console.log('Status:', sameValueResponse.status);
    console.log('');

    // Test 4: Test with invalid boolean (should return error)
    console.log('📝 Test 4: Testing with invalid input (should return error)');
    try {
      const invalidResponse = await axios.put(`${BASE_URL}${ENDPOINT}`, {
        is_enabled: 'invalid'
      }, {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('❌ Invalid Input Response (unexpected success):', JSON.stringify(invalidResponse.data, null, 2));
    } catch (error) {
      console.log('✅ Invalid Input Response (expected error):', JSON.stringify(error.response?.data, null, 2));
      console.log('Status:', error.response?.status);
    }

    console.log('\n🎉 All tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      console.error('Status:', error.response.status);
    }
  }
}

// Helper function to get auth token (you'll need to implement this based on your auth system)
async function getAuthToken() {
  try {
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'admin', // Replace with your admin username
      password: 'admin123' // Replace with your admin password
    });
    
    return loginResponse.data.token; // Adjust based on your response structure
  } catch (error) {
    console.error('Failed to get auth token:', error.message);
    return null;
  }
}

// Run the test
async function runTest() {
  console.log('🔐 Getting authentication token...');
  const token = await getAuthToken();
  
  if (!token) {
    console.error('❌ Failed to get authentication token. Please check your credentials.');
    console.log('💡 You can manually set the AUTH_TOKEN variable in this script.');
    return;
  }
  
  // Update the token
  AUTH_TOKEN = token;
  console.log('✅ Authentication token obtained');
  
  await testPaymentToggle();
}

// Uncomment the line below to run the test automatically
// runTest();

// Or run the test manually with a pre-set token
if (AUTH_TOKEN !== 'YOUR_JWT_TOKEN_HERE') {
  testPaymentToggle();
} else {
  console.log('⚠️  Please set a valid AUTH_TOKEN or run runTest() to get one automatically');
}
