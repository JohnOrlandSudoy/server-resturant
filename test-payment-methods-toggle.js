const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000/api/payments';

// Test configuration
const testConfig = {
    adminToken: 'your-admin-token-here', // Replace with actual admin token
    baseUrl: BASE_URL
};

async function testPaymentMethodsToggle() {
    console.log('🧪 Testing Payment Methods Toggle Functionality\n');

    try {
        // Step 1: Get all payment methods (Admin)
        console.log('📋 Step 1: Getting all payment methods...');
        const getAllResponse = await fetch(`${BASE_URL}/admin/methods`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${testConfig.adminToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!getAllResponse.ok) {
            throw new Error(`Failed to get payment methods: ${getAllResponse.status} ${getAllResponse.statusText}`);
        }

        const allMethods = await getAllResponse.json();
        console.log('✅ Payment methods retrieved:', allMethods.data?.length || 0, 'methods');
        
        if (allMethods.data && allMethods.data.length > 0) {
            allMethods.data.forEach(method => {
                console.log(`   - ${method.method_key}: ${method.method_name} (${method.is_enabled ? 'Enabled' : 'Disabled'})`);
            });
        }

        // Step 2: Get available payment methods (Public)
        console.log('\n📋 Step 2: Getting available payment methods (Public)...');
        const getAvailableResponse = await fetch(`${BASE_URL}/methods/available`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!getAvailableResponse.ok) {
            throw new Error(`Failed to get available payment methods: ${getAvailableResponse.status} ${getAvailableResponse.statusText}`);
        }

        const availableMethods = await getAvailableResponse.json();
        console.log('✅ Available payment methods:', availableMethods.data?.length || 0, 'methods');
        
        if (availableMethods.data && availableMethods.data.length > 0) {
            availableMethods.data.forEach(method => {
                console.log(`   - ${method.method_key}: ${method.method_name}`);
            });
        }

        // Step 3: Test toggling PayMongo
        console.log('\n🔄 Step 3: Testing PayMongo toggle...');
        
        // First, disable PayMongo
        console.log('   Disabling PayMongo...');
        const disableResponse = await fetch(`${BASE_URL}/admin/methods/paymongo/toggle`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${testConfig.adminToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ is_enabled: false })
        });

        if (!disableResponse.ok) {
            const errorText = await disableResponse.text();
            throw new Error(`Failed to disable PayMongo: ${disableResponse.status} ${errorText}`);
        }

        const disableResult = await disableResponse.json();
        console.log('✅ PayMongo disabled:', disableResult.message);

        // Check available methods again
        const checkDisabledResponse = await fetch(`${BASE_URL}/methods/available`);
        const checkDisabled = await checkDisabledResponse.json();
        const paymongoStillAvailable = checkDisabled.data?.find(m => m.method_key === 'paymongo');
        console.log('   PayMongo still in available methods:', paymongoStillAvailable ? 'Yes' : 'No');

        // Now, enable PayMongo
        console.log('   Enabling PayMongo...');
        const enableResponse = await fetch(`${BASE_URL}/admin/methods/paymongo/toggle`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${testConfig.adminToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ is_enabled: true })
        });

        if (!enableResponse.ok) {
            const errorText = await enableResponse.text();
            throw new Error(`Failed to enable PayMongo: ${enableResponse.status} ${errorText}`);
        }

        const enableResult = await enableResponse.json();
        console.log('✅ PayMongo enabled:', enableResult.message);

        // Check available methods again
        const checkEnabledResponse = await fetch(`${BASE_URL}/methods/available`);
        const checkEnabled = await checkEnabledResponse.json();
        const paymongoNowAvailable = checkEnabled.data?.find(m => m.method_key === 'paymongo');
        console.log('   PayMongo now in available methods:', paymongoNowAvailable ? 'Yes' : 'No');

        // Step 4: Test toggling Cash
        console.log('\n🔄 Step 4: Testing Cash toggle...');
        
        // Disable Cash
        console.log('   Disabling Cash...');
        const disableCashResponse = await fetch(`${BASE_URL}/admin/methods/cash/toggle`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${testConfig.adminToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ is_enabled: false })
        });

        if (!disableCashResponse.ok) {
            const errorText = await disableCashResponse.text();
            throw new Error(`Failed to disable Cash: ${disableCashResponse.status} ${errorText}`);
        }

        const disableCashResult = await disableCashResponse.json();
        console.log('✅ Cash disabled:', disableCashResult.message);

        // Enable Cash back
        console.log('   Enabling Cash...');
        const enableCashResponse = await fetch(`${BASE_URL}/admin/methods/cash/toggle`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${testConfig.adminToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ is_enabled: true })
        });

        if (!enableCashResponse.ok) {
            const errorText = await enableCashResponse.text();
            throw new Error(`Failed to enable Cash: ${enableCashResponse.status} ${errorText}`);
        }

        const enableCashResult = await enableCashResponse.json();
        console.log('✅ Cash enabled:', enableCashResult.message);

        // Step 5: Final verification
        console.log('\n📊 Step 5: Final verification...');
        const finalResponse = await fetch(`${BASE_URL}/admin/methods`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${testConfig.adminToken}`,
                'Content-Type': 'application/json'
            }
        });

        const finalMethods = await finalResponse.json();
        console.log('✅ Final payment methods status:');
        finalMethods.data?.forEach(method => {
            console.log(`   - ${method.method_key}: ${method.method_name} (${method.is_enabled ? '✅ Enabled' : '❌ Disabled'})`);
        });

        console.log('\n🎉 All payment method toggle tests completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        
        if (error.message.includes('Payment method not found')) {
            console.log('\n💡 Solution: Run the setup-payment-methods-config.sql script first!');
            console.log('   This will populate the payment_methods_config table with default payment methods.');
        }
        
        if (error.message.includes('401') || error.message.includes('403')) {
            console.log('\n💡 Solution: Make sure you have a valid admin token!');
            console.log('   Update the adminToken in the testConfig object.');
        }
    }
}

// Run the test
testPaymentMethodsToggle();
