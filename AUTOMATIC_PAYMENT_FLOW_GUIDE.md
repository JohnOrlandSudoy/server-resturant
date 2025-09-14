# 🚀 Automatic PayMongo Payment Flow Guide

## 📋 Overview

Your `orderRoutes.ts` has been updated to automatically handle PayMongo payments and mark orders as paid when payments succeed. Here's how the complete flow works:

## 🔄 Complete Payment Flow

### **Step 1: Create Order Payment**
```http
POST /api/orders/{orderId}/paymongo-payment
Authorization: Bearer {token}
Content-Type: application/json

{
  "description": "Payment for Order #12345",
  "metadata": {
    "customer_phone": "+639123456789"
  }
}
```

**What happens:**
1. ✅ Creates PayMongo payment intent
2. ✅ Generates QR Ph code
3. ✅ Stores payment record in database
4. ✅ Updates order payment status to `pending`
5. ✅ Returns QR code for customer to scan

### **Step 2: Customer Payment**
- Customer scans QR code with their bank/e-wallet app
- Customer completes payment in their app
- PayMongo processes the payment

### **Step 3: Automatic Webhook Processing**
```http
POST /api/payments/webhook
Content-Type: application/json
PayMongo-Signature: {signature}

{
  "id": "evt_123",
  "type": "payment.paid",
  "data": {
    "id": "pi_123",
    "attributes": {
      "status": "succeeded",
      "amount": 10000,
      "metadata": {
        "orderId": "order_123"
      }
    }
  }
}
```

**What happens automatically:**
1. ✅ Webhook received and validated
2. ✅ Payment record updated with success status
3. ✅ **Order payment status automatically changed to `paid`**
4. ✅ Order payment method set to `paymongo`
5. ✅ All timestamps recorded (paid_at, etc.)

## 🆕 New Endpoints Added

### **1. Check Payment Status**
```http
GET /api/orders/{orderId}/payment-status
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "order": {
      "id": "order_123",
      "orderNumber": "ORD-001",
      "paymentStatus": "paid",
      "paymentMethod": "paymongo",
      "totalAmount": 100.00
    },
    "latestPayment": {
      "paymentIntentId": "pi_123",
      "status": "succeeded",
      "paymentStatus": "paid",
      "amount": 10000,
      "paidAt": "2024-01-15T10:30:00Z"
    },
    "paymongoStatus": {
      "paymentIntentId": "pi_123",
      "status": "succeeded",
      "amount": 10000,
      "currency": "PHP"
    },
    "paymentHistory": [...]
  }
}
```

### **2. Manual Payment Sync**
```http
POST /api/orders/{orderId}/sync-payment
Authorization: Bearer {token}
```

**Use this when:**
- Webhook failed to process
- Need to manually check payment status
- Payment appears successful but order still shows pending

**Response:**
```json
{
  "success": true,
  "message": "Payment status synced successfully",
  "data": {
    "order": {
      "id": "order_123",
      "orderNumber": "ORD-001",
      "oldPaymentStatus": "pending",
      "newPaymentStatus": "paid",
      "paymentMethod": "paymongo"
    },
    "paymongoStatus": {
      "status": "succeeded",
      "amount": 10000
    },
    "wasUpdated": true
  }
}
```

## 🧪 Testing the Flow

### **Test 1: Complete Payment Flow**
1. Create an order
2. Add items to the order
3. Create PayMongo payment: `POST /api/orders/{orderId}/paymongo-payment`
4. Check payment status: `GET /api/orders/{orderId}/payment-status`
5. Verify order shows `payment_status: "pending"`

### **Test 2: Webhook Simulation**
1. Use PayMongo test webhook or simulate payment success
2. Send webhook to: `POST /api/payments/webhook`
3. Check order status: `GET /api/orders/{orderId}`
4. Verify order shows `payment_status: "paid"`

### **Test 3: Manual Sync**
1. If webhook fails, use manual sync
2. Call: `POST /api/orders/{orderId}/sync-payment`
3. Check if order status updates correctly

## 🔧 Environment Setup

### **Required Environment Variables**
```env
PAYMONGO_SECRET_KEY=sk_test_...  # Your PayMongo secret key
PAYMONGO_TEST_MODE=true          # Set to false for live mode
PAYMONGO_MOCK_MODE=false         # Set to false for real payments
```

### **Database Setup**
Make sure you've run the payment table migration:
```sql
-- Run this in your Supabase SQL editor
\i SQL_folder/payments-table-migration.sql
```

## 🚨 Troubleshooting

### **Issue: Payment shows success but order still pending**
**Solution:** Use manual sync endpoint
```http
POST /api/orders/{orderId}/sync-payment
```

### **Issue: No payment records in database**
**Solution:** Check if payment record creation is working
```sql
SELECT * FROM public.payments WHERE order_id = 'your_order_id';
```

### **Issue: Webhook not received**
**Solution:** 
1. Check PayMongo webhook configuration
2. Ensure webhook URL is accessible: `https://yourdomain.com/api/payments/webhook`
3. Use manual sync as backup

### **Issue: Mock mode enabled**
**Solution:** Check environment variables
```bash
node debug-paymongo-config.js
```

## 📊 Monitoring

### **Check Logs**
```bash
tail -f logs/combined.log | grep -E "(payment|webhook|PayMongo)"
```

### **Key Log Messages to Look For**
- `"Creating PayMongo payment for order:"`
- `"Payment intent created for order:"`
- `"Received PayMongo webhook:"`
- `"Order payment status updated from webhook:"`
- `"Payment status synced for order:"`

## 🎯 Success Indicators

✅ **Order automatically marked as paid when:**
- PayMongo webhook received with `payment.paid` event
- Payment intent status is `succeeded`
- Order payment status changes from `pending` to `paid`
- Payment method set to `paymongo`
- `paid_at` timestamp recorded

✅ **Payment history visible when:**
- Payment records stored in `payments` table
- Order linked to payment via `order_id`
- Webhook events recorded in `webhook_events` array

## 🔄 Complete API Flow Summary

1. **Create Order** → `POST /api/orders`
2. **Add Items** → `POST /api/orders/{orderId}/items`
3. **Create Payment** → `POST /api/orders/{orderId}/paymongo-payment`
4. **Customer Pays** → QR code scan
5. **Webhook Received** → `POST /api/payments/webhook`
6. **Order Auto-Updated** → `payment_status: "paid"`
7. **Check Status** → `GET /api/orders/{orderId}/payment-status`

Your orders will now automatically be marked as paid when PayMongo payments succeed! 🎉
