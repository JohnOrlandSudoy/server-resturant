# 🔐 Render Environment Variables Setup

## **📋 Required Environment Variables for Production**

Copy these environment variables to your Render dashboard:

### **🌐 Server Configuration**
```bash
NODE_ENV=production
PORT=10000
```

### **🔑 JWT Configuration**
```bash
JWT_SECRET=your-super-secure-jwt-secret-key-here-change-this-in-production
```
**⚠️ Important:** Generate a strong, random JWT secret for production!

### **🗄️ Supabase Configuration**
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

### **💳 PayMongo Configuration**
```bash
PAYMONGO_SECRET_KEY=sk_test_your-paymongo-secret-key
PAYMONGO_PUBLIC_KEY=pk_test_your-paymongo-public-key
PAYMONGO_WEBHOOK_SECRET=your-paymongo-webhook-secret
```

### **🌍 Frontend Configuration**
```bash
FRONTEND_URL=https://your-frontend-domain.com
CORS_ORIGIN=https://your-frontend-domain.com
```

### **📧 Email Configuration (Optional)**
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## **🔧 How to Set Environment Variables in Render**

### **Step 1: Access Environment Tab**
1. Go to your Render dashboard
2. Select your web service
3. Click on **"Environment"** tab

### **Step 2: Add Variables**
1. Click **"Add Environment Variable"**
2. Enter the **Key** (e.g., `NODE_ENV`)
3. Enter the **Value** (e.g., `production`)
4. Click **"Save Changes"**

### **Step 3: Deploy**
1. After adding all variables, click **"Manual Deploy"**
2. Select **"Deploy latest commit"**
3. Wait for deployment to complete

## **🔑 How to Get Your Keys**

### **Supabase Keys:**
1. Go to [supabase.com](https://supabase.com)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** → `SUPABASE_ANON_KEY`
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY`

### **PayMongo Keys:**
1. Go to [paymongo.com](https://paymongo.com)
2. Login to your account
3. Go to **Developers** → **API Keys**
4. Copy:
   - **Secret Key** → `PAYMONGO_SECRET_KEY`
   - **Public Key** → `PAYMONGO_PUBLIC_KEY`
5. Set up webhook secret → `PAYMONGO_WEBHOOK_SECRET`

### **JWT Secret:**
Generate a strong JWT secret:
```bash
# Option 1: Use online generator
# Visit: https://generate-secret.vercel.app/64

# Option 2: Use Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Option 3: Use OpenSSL
openssl rand -hex 64
```

## **✅ Environment Variables Checklist**

Before deploying, ensure you have:

- [ ] `NODE_ENV=production`
- [ ] `PORT=10000`
- [ ] `JWT_SECRET` (strong, random string)
- [ ] `SUPABASE_URL` (your Supabase project URL)
- [ ] `SUPABASE_ANON_KEY` (Supabase anon key)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (Supabase service role key)
- [ ] `PAYMONGO_SECRET_KEY` (PayMongo secret key)
- [ ] `PAYMONGO_PUBLIC_KEY` (PayMongo public key)
- [ ] `PAYMONGO_WEBHOOK_SECRET` (PayMongo webhook secret)
- [ ] `FRONTEND_URL` (your frontend domain)
- [ ] `CORS_ORIGIN` (same as frontend URL)
- [ ] `SMTP_HOST` (if using email features)
- [ ] `SMTP_PORT` (if using email features)
- [ ] `SMTP_USER` (if using email features)
- [ ] `SMTP_PASS` (if using email features)

## **🔒 Security Best Practices**

### **1. Keep Secrets Secret**
- ✅ Never commit environment variables to Git
- ✅ Use Render's environment variable system
- ✅ Rotate keys regularly
- ✅ Use different keys for different environments

### **2. Strong Passwords**
- ✅ Use long, random strings for JWT secrets
- ✅ Use strong passwords for email accounts
- ✅ Enable 2FA on all service accounts

### **3. Access Control**
- ✅ Limit who has access to environment variables
- ✅ Use service accounts where possible
- ✅ Monitor access logs

## **🚨 Common Issues**

### **1. Missing Environment Variables**
**Error:** `Error: SUPABASE_URL is required`
**Solution:** Add the missing environment variable in Render dashboard

### **2. Invalid Keys**
**Error:** `Invalid API key`
**Solution:** Verify the key is correct and has proper permissions

### **3. CORS Issues**
**Error:** `CORS policy blocked`
**Solution:** Update `CORS_ORIGIN` to match your frontend domain

### **4. Database Connection Issues**
**Error:** `Failed to connect to database`
**Solution:** Check Supabase URL and keys, ensure database is accessible

## **📊 Testing Environment Variables**

After setting up environment variables, test your deployment:

```bash
# Health check
curl https://your-app.onrender.com/api/health

# Test authentication
curl -X POST https://your-app.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "test", "password": "test"}'

# Test menu endpoint
curl https://your-app.onrender.com/api/menus
```

## **🔄 Updating Environment Variables**

To update environment variables:

1. Go to Render dashboard
2. Select your service
3. Go to **Environment** tab
4. Edit the variable value
5. Click **"Save Changes"**
6. Trigger a new deployment

**Note:** Some changes require a restart to take effect.
