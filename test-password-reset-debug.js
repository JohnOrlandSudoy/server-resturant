require('dotenv').config();
const { supabaseService } = require('./dist/services/supabaseService');

async function testPasswordResetFlow() {
  try {
    console.log('🔍 Testing Password Reset Flow...\n');

    // Step 1: Test forgot password
    console.log('1. Testing forgot password...');
    const forgotResult = await supabaseService().createPasswordResetToken('johnorlandsudoy49@gmail.com');
    console.log('Forgot password result:', JSON.stringify(forgotResult, null, 2));
    
    if (!forgotResult.success) {
      console.log('❌ Failed to create password reset token');
      return;
    }

    const token = forgotResult.data.token;
    console.log(`✅ Token created: ${token}\n`);

    // Step 2: Test token verification
    console.log('2. Testing token verification...');
    const verifyResult = await supabaseService().verifyPasswordResetToken(token);
    console.log('Verify token result:', JSON.stringify(verifyResult, null, 2));
    
    if (!verifyResult.success) {
      console.log('❌ Token verification failed');
      return;
    }

    console.log('✅ Token verification successful\n');

    // Step 3: Test password reset
    console.log('3. Testing password reset...');
    const resetResult = await supabaseService().resetPassword(token, 'newpassword123');
    console.log('Reset password result:', JSON.stringify(resetResult, null, 2));
    
    if (resetResult.success) {
      console.log('✅ Password reset successful');
    } else {
      console.log('❌ Password reset failed');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testPasswordResetFlow();
