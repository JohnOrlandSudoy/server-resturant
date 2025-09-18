require('dotenv').config();
const { supabaseService } = require('./dist/services/supabaseService');

async function debugTokenVerification() {
  try {
    console.log('🔍 Debugging Token Verification...\n');

    // Step 1: Create a new token
    console.log('1. Creating new password reset token...');
    const forgotResult = await supabaseService().createPasswordResetToken('johnorlandsudoy49@gmail.com');
    console.log('Forgot password result:', JSON.stringify(forgotResult, null, 2));
    
    if (!forgotResult.success) {
      console.log('❌ Failed to create password reset token');
      return;
    }

    const token = forgotResult.data.token;
    const expiresAt = forgotResult.data.expiresAt;
    console.log(`✅ Token created: ${token}`);
    console.log(`✅ Expires at: ${expiresAt}`);
    console.log(`✅ Current time: ${new Date().toISOString()}\n`);

    // Step 2: Wait a moment and then verify
    console.log('2. Waiting 2 seconds before verification...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 3: Test token verification
    console.log('3. Testing token verification...');
    const verifyResult = await supabaseService().verifyPasswordResetToken(token);
    console.log('Verify token result:', JSON.stringify(verifyResult, null, 2));
    
    if (!verifyResult.success) {
      console.log('❌ Token verification failed');
      console.log('This means the token is either:');
      console.log('- Not found in the database');
      console.log('- Already marked as used');
      console.log('- Expired (but we just created it)');
      console.log('- There\'s an issue with the database function');
      return;
    }

    console.log('✅ Token verification successful\n');

    // Step 4: Test password reset
    console.log('4. Testing password reset...');
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

debugTokenVerification();
