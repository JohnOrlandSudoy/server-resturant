# 🚀 Render Deployment Guide for AdminRestu Backend

## **📋 Prerequisites**

Before deploying to Render, make sure you have:

1. ✅ **GitHub Repository** - Your code pushed to GitHub
2. ✅ **Render Account** - Sign up at [render.com](https://render.com)
3. ✅ **Supabase Project** - Your database and authentication setup
4. ✅ **PayMongo Account** - For payment processing
5. ✅ **Domain Name** (optional) - For custom domain

## **🔧 Step 1: Prepare Your Repository**

### **1.1 Push to GitHub**
```bash
# Make sure all files are committed
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

### **1.2 Verify Required Files**
Make sure these files are in your repository:
- ✅ `render.yaml` - Render configuration
- ✅ `package.json` - Updated with production scripts
- ✅ `tsconfig.json` - TypeScript configuration
- ✅ `env.production.example` - Environment variables template

## **🌐 Step 2: Deploy to Render**

### **2.1 Create New Web Service**

1. **Go to Render Dashboard**
   - Visit [dashboard.render.com](https://dashboard.render.com)
   - Click **"New +"** → **"Web Service"**

2. **Connect GitHub Repository**
   - Click **"Connect GitHub"**
   - Select your repository: `adminrestu-server`
   - Click **"Connect"**

3. **Configure Service Settings**
   ```
   Name: adminrestu-backend
   Environment: Node
   Region: Oregon (US West)
   Branch: main
   Root Directory: (leave empty)
   Build Command: npm install && npm run build
   Start Command: npm start
   ```

### **2.2 Set Environment Variables**

In the Render dashboard, go to **"Environment"** tab and add:

#### **🔐 Required Environment Variables:**

```bash
# Server Configuration
NODE_ENV=production
PORT=10000

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-key-here

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# PayMongo Configuration
PAYMONGO_SECRET_KEY=sk_test_your-paymongo-secret-key
PAYMONGO_PUBLIC_KEY=pk_test_your-paymongo-public-key
PAYMONGO_WEBHOOK_SECRET=your-paymongo-webhook-secret

# Frontend Configuration
FRONTEND_URL=https://your-frontend-domain.com
CORS_ORIGIN=https://your-frontend-domain.com

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

#### **🔑 How to Get Your Keys:**

**Supabase Keys:**
1. Go to [supabase.com](https://supabase.com)
2. Select your project
3. Go to **Settings** → **API**
4. Copy **Project URL** and **anon public** key
5. Copy **service_role** key (keep this secret!)

**PayMongo Keys:**
1. Go to [paymongo.com](https://paymongo.com)
2. Login to your account
3. Go to **Developers** → **API Keys**
4. Copy **Secret Key** and **Public Key**
5. Set up webhook secret

## **🚀 Step 3: Deploy and Test**

### **3.1 Deploy**
1. Click **"Create Web Service"**
2. Wait for deployment to complete (5-10 minutes)
3. Your service will be available at: `https://adminrestu-backend.onrender.com`

### **3.2 Test Your Deployment**

#### **Health Check:**
```bash
curl https://adminrestu-backend.onrender.com/api/health
```

#### **Test Authentication:**
```bash
curl -X POST https://adminrestu-backend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "your-username",
    "password": "your-password"
  }'
```

#### **Test Menu Endpoints:**
```bash
curl https://adminrestu-backend.onrender.com/api/menus
```

## **🔧 Step 4: Configure PayMongo Webhooks**

### **4.1 Set Webhook URL**
1. Go to PayMongo Dashboard
2. Navigate to **Webhooks**
3. Add new webhook:
   ```
   URL: https://adminrestu-backend.onrender.com/api/payments/webhook
   Events: payment.paid, payment.failed, payment_intent.succeeded
   ```

### **4.2 Update Frontend Configuration**
Update your frontend to use the new backend URL:
```javascript
const API_BASE_URL = 'https://adminrestu-backend.onrender.com';
```

## **📊 Step 5: Monitor and Maintain**

### **5.1 Render Dashboard Features**
- **Logs** - View real-time application logs
- **Metrics** - Monitor CPU, memory, and response times
- **Environment** - Manage environment variables
- **Deployments** - View deployment history

### **5.2 Health Monitoring**
Your app includes a health check endpoint:
```
GET /api/health
```

### **5.3 Automatic Deployments**
- Render automatically deploys when you push to your main branch
- You can also trigger manual deployments from the dashboard

## **🛠️ Troubleshooting**

### **Common Issues:**

#### **1. Build Failures**
```bash
# Check build logs in Render dashboard
# Common fixes:
- Ensure all dependencies are in package.json
- Check TypeScript compilation errors
- Verify file paths and imports
```

#### **2. Environment Variable Issues**
```bash
# Verify all required environment variables are set
# Check for typos in variable names
# Ensure sensitive keys are properly configured
```

#### **3. Database Connection Issues**
```bash
# Verify Supabase URL and keys
# Check network connectivity
# Ensure database is accessible from Render
```

#### **4. CORS Issues**
```bash
# Update CORS_ORIGIN to match your frontend domain
# Check FRONTEND_URL configuration
```

### **Debug Commands:**
```bash
# Check service status
curl https://adminrestu-backend.onrender.com/api/health

# View logs in Render dashboard
# Go to your service → Logs tab

# Test specific endpoints
curl https://adminrestu-backend.onrender.com/api/menus
```

## **💰 Render Pricing**

### **Free Tier:**
- ✅ 750 hours/month
- ✅ Automatic deployments
- ✅ Custom domains
- ✅ SSL certificates
- ⚠️ Service sleeps after 15 minutes of inactivity

### **Paid Plans:**
- **Starter ($7/month)** - Always on, no sleep
- **Standard ($25/month)** - Better performance
- **Pro ($85/month)** - High availability

## **🔒 Security Best Practices**

### **1. Environment Variables**
- ✅ Never commit secrets to Git
- ✅ Use Render's environment variable system
- ✅ Rotate keys regularly
- ✅ Use strong JWT secrets

### **2. Database Security**
- ✅ Use Supabase RLS policies
- ✅ Limit database access
- ✅ Monitor database usage

### **3. API Security**
- ✅ Use HTTPS (automatic with Render)
- ✅ Implement rate limiting
- ✅ Validate all inputs
- ✅ Use proper authentication

## **📈 Performance Optimization**

### **1. Database Optimization**
- ✅ Use database indexes
- ✅ Optimize queries
- ✅ Use connection pooling

### **2. Caching**
- ✅ Implement Redis caching (upgrade plan)
- ✅ Cache static data
- ✅ Use CDN for assets

### **3. Monitoring**
- ✅ Set up alerts
- ✅ Monitor response times
- ✅ Track error rates

## **🎉 Deployment Complete!**

Your AdminRestu backend is now deployed on Render! 

### **Next Steps:**
1. ✅ Test all endpoints
2. ✅ Configure PayMongo webhooks
3. ✅ Update frontend to use new URL
4. ✅ Set up monitoring and alerts
5. ✅ Configure custom domain (optional)

### **Your Live API:**
```
Base URL: https://adminrestu-backend.onrender.com
Health Check: https://adminrestu-backend.onrender.com/api/health
```

**🎊 Congratulations! Your restaurant management system is now live on the internet!**
