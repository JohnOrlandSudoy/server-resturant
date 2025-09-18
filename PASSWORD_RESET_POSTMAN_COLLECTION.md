# 🔐 Password Reset & Email Verification - Postman Collection

## **Environment Variables**
Set these in your Postman environment:
```
base_url: http://localhost:3000/api/auth
token: (will be set after login)
```

## **1. Check Email Service Status**
```http
GET {{base_url}}/email-status
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "isConfigured": true,
    "hasSmtpHost": true,
    "hasSmtpPort": true,
    "hasSmtpUser": true,
    "hasSmtpPass": true
  }
}
```

## **2. Request Password Reset**
```http
POST {{base_url}}/forgot-password
Content-Type: application/json

{
  "email": "admin@restaurant.com"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "If the email exists, a password reset link has been sent",
  "data": {
    "expiresAt": "2024-01-16T15:30:00.000Z",
    "token": "abc123..." // Only in development mode
  }
}
```

## **3. Reset Password**
```http
POST {{base_url}}/reset-password
Content-Type: application/json

{
  "token": "{{reset_token}}",
  "newPassword": "newpassword123"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Password reset successfully",
  "data": {
    "userId": "user-id",
    "username": "admin"
  }
}
```

## **4. Verify Email**
```http
POST {{base_url}}/verify-email
Content-Type: application/json

{
  "token": "{{verification_token}}"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Email verified successfully",
  "data": {
    "userId": "user-id",
    "username": "admin",
    "email": "admin@restaurant.com"
  }
}
```

## **5. Resend Email Verification**
```http
POST {{base_url}}/resend-verification
Content-Type: application/json

{
  "email": "admin@restaurant.com"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Verification email sent successfully",
  "data": {
    "expiresAt": "2024-01-17T15:30:00.000Z",
    "token": "xyz789..." // Only in development mode
  }
}
```

## **6. Change Password (Authenticated)**
```http
POST {{base_url}}/change-password
Content-Type: application/json
Authorization: Bearer {{token}}

{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword123"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

## **7. Login (Test New Password)**
```http
POST {{base_url}}/login
Content-Type: application/json

{
  "username": "admin",
  "password": "newpassword123"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user-id",
      "username": "admin",
      "email": "admin@restaurant.com",
      "firstName": "Admin",
      "lastName": "User",
      "role": "admin",
      "phone": null,
      "avatarUrl": null
    }
  }
}
```

## **Error Testing**

### **Invalid Email Format**
```http
POST {{base_url}}/forgot-password
Content-Type: application/json

{
  "email": "invalid-email"
}
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Invalid email format"
}
```

### **Invalid Reset Token**
```http
POST {{base_url}}/reset-password
Content-Type: application/json

{
  "token": "invalid_token",
  "newPassword": "newpassword123"
}
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Invalid or expired token"
}
```

### **Weak Password**
```http
POST {{base_url}}/reset-password
Content-Type: application/json

{
  "token": "{{reset_token}}",
  "newPassword": "123"
}
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Password must be at least 8 characters long"
}
```

### **Missing Token**
```http
POST {{base_url}}/reset-password
Content-Type: application/json

{
  "newPassword": "newpassword123"
}
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Token and new password are required"
}
```

## **Testing Workflow**

### **Complete Password Reset Flow:**
1. **Check email service status** - Ensure email is configured
2. **Request password reset** - Send reset request
3. **Check email** - Look for reset link (or use token from dev mode)
4. **Reset password** - Use token to set new password
5. **Login with new password** - Verify reset worked

### **Complete Email Verification Flow:**
1. **Resend verification** - Request verification email
2. **Check email** - Look for verification link (or use token from dev mode)
3. **Verify email** - Use token to verify email
4. **Check user profile** - Verify email_verified is true

## **Environment Setup**

### **Development Mode:**
- Tokens are returned in API responses for testing
- Email service can be disabled
- Use tokens directly from API responses

### **Production Mode:**
- Tokens are only sent via email
- Email service must be configured
- Check email inbox for reset/verification links

## **Email Templates**

The system sends professional HTML emails with:
- **Password Reset**: Blue theme with security warnings
- **Email Verification**: Green theme with welcome message
- **Responsive design** for mobile and desktop
- **Security information** and expiration times

## **Security Features**

- ✅ **Token expiration** (1 hour for reset, 24 hours for verification)
- ✅ **One-time use tokens** (marked as used after consumption)
- ✅ **Secure token generation** (32-byte random hex)
- ✅ **Password strength validation** (minimum 8 characters)
- ✅ **Email format validation**
- ✅ **Rate limiting protection** (via Supabase)
- ✅ **Audit logging** (all actions logged)

## **Troubleshooting**

### **Email Not Sending:**
1. Check SMTP configuration in environment variables
2. Verify email service status endpoint
3. Check server logs for email errors
4. Ensure SMTP credentials are correct

### **Token Issues:**
1. Verify token hasn't expired
2. Check if token was already used
3. Ensure token is copied correctly (no extra spaces)
4. Check database for token status

### **Database Issues:**
1. Run the `supabase-auth-integration.sql` script
2. Verify all functions are created
3. Check RLS policies are enabled
4. Ensure proper permissions are granted
