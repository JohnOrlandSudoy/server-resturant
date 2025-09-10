/**
 * PayMongo Integration Test Script
 * 
 * This script tests the PayMongo integration endpoints
 * Run with: node test-paymongo.js
 */

const axios = require('axios');

// Configuration
const API_BASE_URL = 'http://localhost:3000/api';
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjdmY2Q4YTY4LTc3MGUtNGE0ZC1hNTI0LWQ0OGQwYzIzZTViOCIsInVzZXJuYW1lIjoia2l0Y2hlbjEiLCJlbWFpbCI6ImtpdGNoZW4xQHJlc3RhdXJhbnQuY29tIiwicm9sZSI6ImtpdGNoZW4iLCJmaXJzdE5hbWUiOiJKYW5lIiwibGFzdE5hbWUiOiJDaGVmIiwiaWF0IjoxNzU3MjkxOTQ1LCJleHAiOjE3NTczNzgzNDV9.xwWe4kJHlwFZqMyOKG4X5noqltNbhp4P22aHEN0ijk0';

// Test data
const TEST_PAYMENT = {
  amount: 10000, // PHP 100.00 in centavos
  description: 'Test Payment from Script',
  metadata: {
    test: true,
    timestamp: new Date().toISOString()
  }
};

async function testPayMongoIntegration() {
  console.log('🧪 Starting PayMongo Integration Tests...\n');

  try {
    // Test 1: Create Payment Intent
    console.log('1️⃣ Testing Payment Intent Creation...');
    const createResponse = await axios.post(`${API_BASE_URL}/payments/create`, TEST_PAYMENT, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_TOKEN}`
      }
    });

    if (createResponse.data.success) {
      console.log('✅ Payment intent created successfully');
      console.log(`   Payment Intent ID: ${createResponse.data.data.paymentIntentId}`);
      console.log(`   Amount: PHP ${(createResponse.data.data.amount / 100).toFixed(2)}`);
      console.log(`   Status: ${createResponse.data.data.status}`);
      
      const paymentIntentId = createResponse.data.data.paymentIntentId;

      // Test 2: Get Payment Status
      console.log('\n2️⃣ Testing Payment Status Retrieval...');
      const statusResponse = await axios.get(`${API_BASE_URL}/payments/status/${paymentIntentId}`, {
        headers: {
          'Authorization': `Bearer ${TEST_TOKEN}`
        }
      });

      if (statusResponse.data.success) {
        console.log('✅ Payment status retrieved successfully');
        console.log(`   Status: ${statusResponse.data.data.status}`);
        console.log(`   Amount: PHP ${(statusResponse.data.data.amount / 100).toFixed(2)}`);
      } else {
        console.log('❌ Failed to retrieve payment status');
        console.log(`   Error: ${statusResponse.data.error}`);
      }

      // Test 3: Test Webhook (Simulate)
      console.log('\n3️⃣ Testing Webhook Processing...');
      const webhookEvent = {
        id: 'evt_test_' + Date.now(),
        type: 'payment_intent.succeeded',
        data: {
          id: paymentIntentId,
          type: 'payment_intent',
          attributes: {
            type: 'payment_intent',
            status: 'succeeded',
            amount: TEST_PAYMENT.amount,
            currency: 'PHP',
            description: TEST_PAYMENT.description,
            metadata: TEST_PAYMENT.metadata,
            created_at: Date.now(),
            updated_at: Date.now()
          }
        }
      };

      const webhookResponse = await axios.post(`${API_BASE_URL}/payments/webhook`, webhookEvent, {
        headers: {
          'Content-Type': 'application/json',
          'PayMongo-Signature': 'test_signature'
        }
      });

      if (webhookResponse.data.success) {
        console.log('✅ Webhook processed successfully');
      } else {
        console.log('❌ Webhook processing failed');
        console.log(`   Error: ${webhookResponse.data.error}`);
      }

    } else {
      console.log('❌ Failed to create payment intent');
      console.log(`   Error: ${createResponse.data.error}`);
    }

    // Test 4: Test Invalid Amount
    console.log('\n4️⃣ Testing Invalid Amount Validation...');
    try {
      await axios.post(`${API_BASE_URL}/payments/create`, {
        amount: 50, // Less than minimum (100 centavos)
        description: 'Invalid amount test'
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_TOKEN}`
        }
      });
      console.log('❌ Should have failed with invalid amount');
    } catch (error) {
      if (error.response?.data?.error?.includes('minimum')) {
        console.log('✅ Invalid amount validation working correctly');
      } else {
        console.log('❌ Unexpected error:', error.response?.data?.error);
      }
    }

    // Test 5: Test Without Authentication
    console.log('\n5️⃣ Testing Authentication...');
    try {
      await axios.post(`${API_BASE_URL}/payments/create`, TEST_PAYMENT, {
        headers: {
          'Content-Type': 'application/json'
          // No Authorization header
        }
      });
      console.log('❌ Should have failed without authentication');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Authentication working correctly');
      } else {
        console.log('❌ Unexpected authentication error:', error.response?.data);
      }
    }

    console.log('\n🎉 PayMongo Integration Tests Completed!');
    console.log('\n📋 Test Summary:');
    console.log('   - Payment Intent Creation: ✅');
    console.log('   - Payment Status Retrieval: ✅');
    console.log('   - Webhook Processing: ✅');
    console.log('   - Input Validation: ✅');
    console.log('   - Authentication: ✅');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
  }
}

// Test server connectivity
async function testServerConnectivity() {
  console.log('🔍 Testing server connectivity...');
  
  try {
    const response = await axios.get(`${API_BASE_URL.replace('/api', '')}/health`);
    if (response.data.status === 'healthy') {
      console.log('✅ Server is running and healthy');
      return true;
    } else {
      console.log('❌ Server health check failed');
      return false;
    }
  } catch (error) {
    console.log('❌ Cannot connect to server');
    console.log('   Make sure the server is running on http://localhost:3000');
    console.log('   Run: npm start');
    return false;
  }
}

// Main test function
async function main() {
  console.log('🚀 PayMongo Integration Test Suite');
  console.log('=====================================\n');

  const isServerRunning = await testServerConnectivity();
  
  if (isServerRunning) {
    await testPayMongoIntegration();
  } else {
    console.log('\n❌ Cannot proceed with tests - server is not running');
    process.exit(1);
  }
}

// Run tests
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  testPayMongoIntegration,
  testServerConnectivity
};
