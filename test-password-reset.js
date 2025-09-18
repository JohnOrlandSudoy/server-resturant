const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/auth';

// Test configuration
const testConfig = {
  email: 'admin@restaurant.com', // Use an existing user's email
  newPassword: 'newpassword123',
  invalidToken: 'invalid_token_12345'
};

async function testPasswordResetFlow() {
  console.log('🔐 Testing Password Reset Flow\n');

  try {
    // Test 1: Check email service status
    console.log('1️⃣ Checking email service status...');
    const emailStatus = await axios.get(`${BASE_URL}/email-status`);
    console.log('✅ Email service status:', emailStatus.data.data);
    console.log('');

    // Test 2: Request password reset
    console.log('2️⃣ Requesting password reset...');
    const forgotResponse = await axios.post(`${BASE_URL}/forgot-password`, {
      email: testConfig.email
    });
    console.log('✅ Forgot password response:', forgotResponse.data);
    
    const resetToken = forgotResponse.data.data?.token;
    if (!resetToken) {
      console.log('⚠️ No reset token received. Check email service configuration.');
      return;
    }
    console.log('');

    // Test 3: Verify reset token
    console.log('3️⃣ Verifying reset token...');
    try {
      const verifyResponse = await axios.post(`${BASE_URL}/reset-password`, {
        token: resetToken,
        newPassword: testConfig.newPassword
      });
      console.log('✅ Password reset successful:', verifyResponse.data);
    } catch (error) {
      console.log('❌ Password reset failed:', error.response?.data || error.message);
    }
    console.log('');

    // Test 4: Test with invalid token
    console.log('4️⃣ Testing with invalid token...');
    try {
      await axios.post(`${BASE_URL}/reset-password`, {
        token: testConfig.invalidToken,
        newPassword: testConfig.newPassword
      });
    } catch (error) {
      console.log('✅ Invalid token correctly rejected:', error.response?.data?.error);
    }
    console.log('');

    // Test 5: Test email verification flow
    console.log('5️⃣ Testing email verification...');
    try {
      const verifyEmailResponse = await axios.post(`${BASE_URL}/resend-verification`, {
        email: testConfig.email
      });
      console.log('✅ Email verification sent:', verifyEmailResponse.data);
    } catch (error) {
      console.log('❌ Email verification failed:', error.response?.data || error.message);
    }
    console.log('');

    // Test 6: Test change password (requires authentication)
    console.log('6️⃣ Testing change password (requires login first)...');
    try {
      // First login to get token
      const loginResponse = await axios.post(`${BASE_URL}/login`, {
        username: 'admin',
        password: 'admin123'
      });
      
      const token = loginResponse.data.data.token;
      
      // Then change password
      const changePasswordResponse = await axios.post(`${BASE_URL}/change-password`, {
        currentPassword: 'admin123',
        newPassword: 'newadminpassword123'
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('✅ Password changed successfully:', changePasswordResponse.data);
    } catch (error) {
      console.log('❌ Change password failed:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

async function testEmailVerificationFlow() {
  console.log('\n📧 Testing Email Verification Flow\n');

  try {
    // Test 1: Resend verification email
    console.log('1️⃣ Resending verification email...');
    const resendResponse = await axios.post(`${BASE_URL}/resend-verification`, {
      email: testConfig.email
    });
    console.log('✅ Verification email sent:', resendResponse.data);
    
    const verificationToken = resendResponse.data.data?.token;
    if (!verificationToken) {
      console.log('⚠️ No verification token received. Check email service configuration.');
      return;
    }
    console.log('');

    // Test 2: Verify email with token
    console.log('2️⃣ Verifying email with token...');
    try {
      const verifyResponse = await axios.post(`${BASE_URL}/verify-email`, {
        token: verificationToken
      });
      console.log('✅ Email verified successfully:', verifyResponse.data);
    } catch (error) {
      console.log('❌ Email verification failed:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('❌ Email verification test failed:', error.response?.data || error.message);
  }
}

async function runAllTests() {
  console.log('🚀 Starting Password Reset and Email Verification Tests\n');
  console.log('=' .repeat(60));
  
  await testPasswordResetFlow();
  await testEmailVerificationFlow();
  
  console.log('\n' + '=' .repeat(60));
  console.log('✅ All tests completed!');
  console.log('\n📝 Notes:');
  console.log('- If email service is not configured, tokens will be returned in development mode');
  console.log('- Check your email for password reset and verification links');
  console.log('- In production, ensure SMTP settings are properly configured');
}

// Run tests
runAllTests().catch(console.error);
