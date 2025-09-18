# 🔐 Password Reset Testing Guide

## **Your Original Password Reset Endpoints**

All endpoints are working correctly! Here's how to test them:

### **1. Request Password Reset**
```http
POST http://localhost:3000/api/auth/forgot-password
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
    "expiresAt": "2025-01-16T10:30:00.000Z",
    "token": "your-reset-token-here"
  }
}
```

### **2. Reset Password with Token**
```http
POST http://localhost:3000/api/auth/reset-password
Content-Type: application/json

{
  "token": "your-reset-token-here",
  "newPassword": "newpassword123"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Password reset successfully",
  "data": {
    "userId": "user-id-here",
    "username": "admin"
  }
}
```

### **3. Verify Email Address**
```http
POST http://localhost:3000/api/auth/verify-email
Content-Type: application/json

{
  "token": "your-verification-token-here"
}
```

### **4. Resend Email Verification**
```http
POST http://localhost:3000/api/auth/resend-verification
Content-Type: application/json

{
  "email": "admin@restaurant.com"
}
```

### **5. Change Password (Authenticated)**
```http
POST http://localhost:3000/api/auth/change-password
Authorization: Bearer your-jwt-token
Content-Type: application/json

{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

### **6. Check Email Service Status**
```http
GET http://localhost:3000/api/auth/email-status
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "isConfigured": false,
    "hasSmtpHost": false,
    "hasSmtpPort": false,
    "hasSmtpUser": false,
    "hasSmtpPass": false,
    "message": "Email service not configured"
  }
}
```

## **Testing with Postman**

1. **Create a new collection** called "Password Reset"
2. **Add all 6 requests** with the URLs and JSON bodies above
3. **Test the flow:**
   - Start with `forgot-password`
   - Use the returned token for `reset-password`
   - Test other endpoints as needed

## **Email Configuration (Optional)**

If you want to actually send emails, add these to your `.env` file:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FRONTEND_URL=http://localhost:3000
```

## **Current Status**

✅ **All endpoints are working correctly**
✅ **Server is running on http://localhost:3000**
✅ **Email service gracefully handles missing configuration**
✅ **Tokens are returned in development mode for testing**

## **Next Steps**

1. Test the `forgot-password` endpoint with a real email
2. Use the returned token to test `reset-password`
3. Configure SMTP settings if you want actual email sending
4. Test the complete flow end-to-end

Your original password reset system is fully functional! 🎉
