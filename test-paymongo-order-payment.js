// Test script for PayMongo order payment endpoint
// Run with: node test-paymongo-order-payment.js

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000'; // Adjust if your server runs on different port
const TEST_TOKEN = 'your_test_token_here'; // Replace with actual token

async function testPayMongoOrderPayment() {
  console.log('🧪 Testing PayMongo Order Payment Endpoint');
  console.log('==========================================\n');

  try {
    // Step 1: Create a test order
    console.log('1️⃣ Creating test order...');
    const createOrderResponse = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_TOKEN}`
      },
      body: JSON.stringify({
        customer_name: 'Test Customer',
        customer_phone: '+639123456789',
        order_type: 'dine_in',
        table_number: '5',
        special_instructions: 'Test order for PayMongo payment'
      })
    });

    if (!createOrderResponse.ok) {
      throw new Error(`Failed to create order: ${createOrderResponse.statusText}`);
    }

    const orderData = await createOrderResponse.json();
    const orderId = orderData.data.id;
    console.log(`✅ Order created: ${orderId}`);
    console.log(`   Order Number: ${orderData.data.order_number}\n`);

    // Step 2: Add items to the order
    console.log('2️⃣ Adding items to order...');
    const addItemResponse = await fetch(`${BASE_URL}/api/orders/${orderId}/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_TOKEN}`
      },
      body: JSON.stringify({
        menu_item_id: 'your_menu_item_id_here', // Replace with actual menu item ID
        quantity: 2,
        special_instructions: 'Test item for payment'
      })
    });

    if (!addItemResponse.ok) {
      console.log('⚠️  Could not add items (menu item ID might not exist)');
      console.log('   Continuing with empty order for payment test...\n');
    } else {
      console.log('✅ Items added to order\n');
    }

    // Step 3: Create PayMongo payment
    console.log('3️⃣ Creating PayMongo payment...');
    const createPaymentResponse = await fetch(`${BASE_URL}/api/orders/${orderId}/paymongo-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_TOKEN}`
      },
      body: JSON.stringify({
        description: `Payment for Order #${orderData.data.order_number}`,
        metadata: {
          test: true,
          customer_phone: '+639123456789'
        }
      })
    });

    if (!createPaymentResponse.ok) {
      const errorData = await createPaymentResponse.json();
      throw new Error(`Failed to create payment: ${errorData.error || createPaymentResponse.statusText}`);
    }

    const paymentData = await createPaymentResponse.json();
    console.log('✅ PayMongo payment created successfully!');
    console.log(`   Payment Intent ID: ${paymentData.data.paymentIntentId}`);
    console.log(`   Amount: PHP ${paymentData.data.amount / 100}`);
    console.log(`   Status: ${paymentData.data.status}`);
    console.log(`   QR Code URL: ${paymentData.data.qrCodeUrl ? 'Generated' : 'Not generated'}\n`);

    // Step 4: Check payment status
    console.log('4️⃣ Checking payment status...');
    const statusResponse = await fetch(`${BASE_URL}/api/orders/${orderId}/payment-status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`
      }
    });

    if (!statusResponse.ok) {
      throw new Error(`Failed to check payment status: ${statusResponse.statusText}`);
    }

    const statusData = await statusResponse.json();
    console.log('✅ Payment status retrieved:');
    console.log(`   Order Payment Status: ${statusData.data.order.paymentStatus}`);
    console.log(`   Payment Method: ${statusData.data.order.paymentMethod}`);
    console.log(`   Latest Payment Status: ${statusData.data.latestPayment?.paymentStatus || 'None'}`);
    console.log(`   PayMongo Status: ${statusData.data.paymongoStatus?.status || 'Not checked'}\n`);

    // Step 5: Check if payment record was created in database
    console.log('5️⃣ Verifying database records...');
    console.log('   Check your Supabase dashboard:');
    console.log(`   - Orders table: Look for order ${orderId}`);
    console.log(`   - Payments table: Look for payment_intent_id ${paymentData.data.paymentIntentId}`);
    console.log(`   - Order should have payment_status: 'pending'`);
    console.log(`   - Order should have payment_method: 'paymongo'\n`);

    console.log('🎉 Test completed successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Check your PayMongo dashboard for the payment intent');
    console.log('2. Test QR code scanning (if in real mode)');
    console.log('3. Test webhook processing when payment succeeds');
    console.log('4. Use manual sync endpoint if webhook fails');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure your server is running');
    console.log('2. Check your authentication token');
    console.log('3. Verify PayMongo configuration');
    console.log('4. Check server logs for detailed errors');
  }
}

// Configuration check
console.log('🔧 Configuration Check');
console.log('======================');
console.log(`Base URL: ${BASE_URL}`);
console.log(`Token: ${TEST_TOKEN === 'your_test_token_here' ? '❌ NOT SET' : '✅ SET'}`);
console.log('');

if (TEST_TOKEN === 'your_test_token_here') {
  console.log('⚠️  Please update TEST_TOKEN in this script with a valid authentication token');
  console.log('   You can get a token by logging in through your auth endpoint');
  process.exit(1);
}

// Run the test
testPayMongoOrderPayment();
