# 💰 Real Money Payment Testing Guide (GCash)

## 🚨 **IMPORTANT: Money Safety**

**✅ Money goes directly to YOUR PayMongo wallet - NOT LOST!**

When customer pays via GCash QR:
1. Customer scans QR → Opens GCash app
2. Customer pays in GCash → **Money goes to YOUR PayMongo wallet**
3. PayMongo processes → Sends webhook to your server
4. Your server updates order → Marks as paid automatically

## 🔧 **Environment Setup for Real Payments**

### **Required Environment Variables:**
```env
PAYMONGO_SECRET_KEY=sk_live_...  # Your LIVE secret key (starts with sk_live_)
PAYMONGO_TEST_MODE=false         # Set to false for real payments
PAYMONGO_MOCK_MODE=false         # Set to false for real payments
```

### **PayMongo Dashboard Setup:**
1. **Login to PayMongo Dashboard**
2. **Get your LIVE secret key** (starts with `sk_live_`)
3. **Configure webhook URL**: `https://yourdomain.com/api/payments/webhook`
4. **Enable webhook events**: `payment.paid`, `payment.failed`, `qrph.expired`

## 🧪 **Testing Steps with Real Money**

### **Step 1: Create Order**
**POST** `http://localhost:3000/api/orders`
```json
{
  "customer_name": "Test Customer",
  "customer_phone": "+639123456789",
  "order_type": "dine_in",
  "table_number": "5",
  "special_instructions": "Real money test"
}
```

### **Step 2: Add Items**
**POST** `http://localhost:3000/api/orders/{orderId}/items`
```json
{
  "menu_item_id": "your-menu-item-id",
  "quantity": 1,
  "special_instructions": "Test item"
}
```

### **Step 3: Create PayMongo Payment**
**POST** `http://localhost:3000/api/orders/{orderId}/paymongo-payment`
```json
{
  "description": "Real money test payment",
  "metadata": {
    "test": "real_money",
    "customer_phone": "+639123456789"
  }
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "paymentIntentId": "pi_live_1234567890",
    "status": "awaiting_payment_method",
    "amount": 100,  // PHP 1.00 (100 centavos)
    "currency": "PHP",
    "qrCodeUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "order": {
      "paymentStatus": "pending",
      "paymentMethod": "paymongo"
    }
  }
}
```

### **Step 4: Customer Payment Process**
1. **Display QR code** to customer
2. **Customer scans QR** with GCash app
3. **Customer pays** in GCash app
4. **Money goes to YOUR PayMongo wallet**
5. **PayMongo sends webhook** to your server
6. **Order automatically marked as paid**

### **Step 5: Check Payment Status**
**GET** `http://localhost:3000/api/orders/{orderId}/payment-status`

**Expected Response (After Payment):**
```json
{
  "success": true,
  "data": {
    "order": {
      "paymentStatus": "paid",
      "paymentMethod": "paymongo"
    },
    "latestPayment": {
      "paymentStatus": "paid",
      "paidAt": "2024-01-15T10:30:00Z"
    },
    "paymongoStatus": {
      "status": "succeeded"
    }
  }
}
```

### **Step 6: Get Receipt**
**GET** `http://localhost:3000/api/orders/{orderId}/receipt`

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "order": {
      "orderNumber": "ORD-001",
      "customerName": "Test Customer",
      "totalAmount": 1.00,
      "paymentStatus": "paid",
      "paymentMethod": "paymongo"
    },
    "payment": {
      "amount": 100,
      "paymentStatus": "paid",
      "paidAt": "2024-01-15T10:30:00Z",
      "externalReferenceNumber": "ABC123"
    },
    "summary": {
      "isPaid": true,
      "totalAmount": 1.00
    }
  }
}
```

## 🔍 **Verification Steps**

### **1. Check PayMongo Dashboard**
- Login to your PayMongo dashboard
- Look for the payment transaction
- Verify amount and status
- Check that money is in your wallet

### **2. Check Your Database**
```sql
-- Check order status
SELECT order_number, payment_status, payment_method, total_amount 
FROM public.orders 
WHERE id = 'your-order-id';

-- Check payment record
SELECT payment_intent_id, payment_status, amount, paid_at 
FROM public.payments 
WHERE order_id = 'your-order-id';
```

### **3. Check Server Logs**
```bash
tail -f logs/combined.log | grep -E "(payment|webhook|PayMongo)"
```

Look for:
- `"Creating PayMongo payment for order"`
- `"Received PayMongo webhook"`
- `"Order payment status updated from webhook"`

## 🚨 **Safety Checklist**

### **Before Testing:**
- ✅ Use LIVE PayMongo secret key (`sk_live_...`)
- ✅ Set `PAYMONGO_TEST_MODE=false`
- ✅ Set `PAYMONGO_MOCK_MODE=false`
- ✅ Test with small amount first (PHP 1.00)
- ✅ Verify webhook URL is accessible
- ✅ Check PayMongo dashboard configuration

### **During Testing:**
- ✅ Monitor server logs
- ✅ Check PayMongo dashboard for transactions
- ✅ Verify webhook is received
- ✅ Confirm order status updates

### **After Testing:**
- ✅ Verify money in PayMongo wallet
- ✅ Check order marked as paid
- ✅ Generate receipt
- ✅ Test manual sync if needed

## 🔧 **Troubleshooting**

### **If Payment Not Showing in PayMongo:**
1. Check environment variables
2. Verify secret key is LIVE key
3. Check PayMongo dashboard
4. Use manual sync endpoint

### **If Webhook Not Received:**
1. Check webhook URL configuration
2. Verify server is accessible
3. Check server logs
4. Use manual sync as backup

### **If Order Not Marked as Paid:**
1. Check webhook processing
2. Use manual sync endpoint
3. Check database records
4. Verify payment status

## 📱 **Complete API Endpoints**

### **Payment Flow Endpoints:**
1. **Create Order**: `POST /api/orders`
2. **Add Items**: `POST /api/orders/{orderId}/items`
3. **Create Payment**: `POST /api/orders/{orderId}/paymongo-payment`
4. **Check Status**: `GET /api/orders/{orderId}/payment-status`
5. **Get Receipt**: `GET /api/orders/{orderId}/receipt`
6. **Manual Sync**: `POST /api/orders/{orderId}/sync-payment`

### **Webhook Endpoint:**
- **Webhook**: `POST /api/payments/webhook` (automatic)

## 💡 **Tips for Real Money Testing**

1. **Start Small**: Test with PHP 1.00 first
2. **Monitor Logs**: Watch server logs during payment
3. **Check Dashboard**: Verify in PayMongo dashboard
4. **Test Webhook**: Ensure webhook is received
5. **Backup Sync**: Use manual sync if webhook fails
6. **Generate Receipt**: Test receipt endpoint

## 🎯 **Success Indicators**

✅ **Payment created successfully**  
✅ **QR code generated**  
✅ **Customer can scan and pay**  
✅ **Money appears in PayMongo wallet**  
✅ **Webhook received and processed**  
✅ **Order marked as paid automatically**  
✅ **Receipt generated successfully**  

**Your money is safe and goes directly to your PayMongo wallet!** 🚀

