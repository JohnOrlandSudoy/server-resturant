# 🔐 Supabase Password Reset Setup Guide

## **Current Status:**
✅ Server is running with graceful error handling  
⚠️ Supabase credentials need to be configured  

## **Step 1: Get Your Supabase Credentials**

1. **Go to your Supabase Dashboard:**
   - Visit: https://supabase.com/dashboard
   - Select your project: `italcjeomaybmbabgmmq`

2. **Get your credentials:**
   - Go to **Settings > API**
   - Copy your **Project URL** and **anon public** key

## **Step 2: Create .env File**

Create a `.env` file in your project root with:

```env
# Database Configuration
SUPABASE_URL=https://italcjeomaybmbabgmmq.supabase.co
SUPABASE_ANON_KEY=your_actual_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# JWT Configuration
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Email Configuration (for password reset and email verification)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password_here

# PayMongo Configuration
PAYMONGO_SECRET_KEY=sk_test_your_paymongo_secret_key_here
PAYMONGO_PUBLIC_KEY=pk_test_your_paymongo_public_key_here
PAYMONGO_WEBHOOK_SECRET=whsec_your_webhook_secret_here
PAYMONGO_MOCK_MODE=false

# Local Database (for offline mode)
LOCAL_DB_PATH=./data/local.db

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log
```

## **Step 3: Configure Supabase Auth**

1. **Enable Email Auth:**
   - Go to **Authentication > Settings**
   - Enable **Email** provider
   - Set **Site URL** to: `http://localhost:3000`
   - Add **Redirect URLs**: `http://localhost:3000/reset-password`

2. **Configure Email Templates:**
   - Go to **Authentication > Email Templates**
   - Customize the **Reset Password** template:

```html
<h2>Reset Password</h2>
<p>Follow this link to reset the password for your user:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
```

## **Step 4: Test the Setup**

### **Method 1: Using the Test Page**
1. Open: `http://localhost:3000/supabase-password-reset.html`
2. Enter email: `admin@restaurant.com`
3. Click "Send Password Reset Email"
4. Check your email for the reset link

### **Method 2: Using Postman**

**Send Password Reset Email:**
```http
POST http://localhost:3000/api/supabase-auth/forgot-password
Content-Type: application/json

{
  "email": "admin@restaurant.com"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Password reset email sent successfully. Please check your email for the reset link."
}
```

## **Current API Endpoints:**

- `POST /api/supabase-auth/forgot-password` - Send password reset email
- `POST /api/supabase-auth/reset-password` - Update password
- `GET /api/supabase-auth/user` - Get current user
- `POST /api/supabase-auth/signout` - Sign out

## **Benefits of This Approach:**

✅ **No custom email service needed** - Supabase handles everything  
✅ **Professional email templates** - Built-in HTML templates  
✅ **Automatic token management** - Supabase handles security  
✅ **Email delivery** - Reliable email sending  
✅ **Simple integration** - Just a few API calls  
✅ **Graceful error handling** - Server won't crash if not configured  

## **Next Steps:**

1. **Create the `.env` file** with your actual Supabase credentials
2. **Restart the server** to load the new environment variables
3. **Test the password reset flow** using the test page or Postman
4. **Configure your Supabase project** for email authentication

The server is now running and will show helpful error messages if Supabase is not configured! 🚀
