// Debug PayMongo Configuration
// Run this with: node debug-paymongo-config.js

require('dotenv').config();

console.log('=== PayMongo Configuration Debug ===');
console.log('PAYMONGO_SECRET_KEY:', process.env.PAYMONGO_SECRET_KEY ? 'SET' : 'NOT SET');
console.log('PAYMONGO_TEST_MODE:', process.env.PAYMONGO_TEST_MODE);
console.log('PAYMONGO_MOCK_MODE:', process.env.PAYMONGO_MOCK_MODE);

if (process.env.PAYMONGO_SECRET_KEY) {
  console.log('Secret Key Prefix:', process.env.PAYMONGO_SECRET_KEY.substring(0, 10) + '...');
  console.log('Is Test Key:', process.env.PAYMONGO_SECRET_KEY.startsWith('sk_test_'));
  console.log('Is Live Key:', process.env.PAYMONGO_SECRET_KEY.startsWith('sk_live_'));
}

console.log('\n=== Expected Behavior ===');
if (process.env.PAYMONGO_MOCK_MODE === 'true') {
  console.log('❌ MOCK MODE: Payments will NOT appear in PayMongo wallet');
  console.log('❌ MOCK MODE: No real transactions will be processed');
} else {
  console.log('✅ REAL MODE: Payments should appear in PayMongo wallet');
  console.log('✅ REAL MODE: Real transactions will be processed');
}

console.log('\n=== Recommendations ===');
if (process.env.PAYMONGO_MOCK_MODE === 'true') {
  console.log('1. Set PAYMONGO_MOCK_MODE=false for real payments');
  console.log('2. Ensure PAYMONGO_SECRET_KEY is set correctly');
  console.log('3. Use test keys (sk_test_) for testing');
}
