# 🔄 **Automatic Payment Flow After PayMongo Payment Creation**

## **📋 Complete Flow Analysis**

After creating a PayMongo payment using:
```
POST {{base_url}}/api/orders/{{ORDER_ID}}/paymongo-payment
```

Here's what happens when the payment becomes **automatically paid**:

---

## **🚀 Step-by-Step Automatic Payment Process**

### **1. Initial Payment Creation**
```typescript
POST /api/orders/:orderId/paymongo-payment
```

**What happens:**
- ✅ Order validation (exists, not already paid)
- ✅ Amount calculation (peso → centavos)
- ✅ PayMongo payment intent creation
- ✅ QR code generation
- ✅ Payment record stored in `payments` table
- ✅ Order status updated to `payment_status: 'pending'`

**Response includes:**
```json
{
  "success": true,
  "data": {
    "paymentIntentId": "pi_xxx",
    "qrCodeUrl": "data:image/png;base64,...",
    "qrCodeData": "base64_qr_data",
    "status": "awaiting_payment_method",
    "amount": 10000,
    "currency": "PHP",
    "expiresAt": "2025-01-14T01:30:00.000Z"
  }
}
```

---

### **2. Customer Payment Process**
- 👤 **Customer scans QR code** with mobile banking app
- 💳 **Payment processed** through PayMongo
- 🔔 **PayMongo sends webhook** to your system

---

### **3. Automatic Webhook Processing**
```typescript
POST /api/payments/webhook
```

**Webhook Events Handled:**
- `payment.paid` → Mark as paid
- `payment_intent.succeeded` → Mark as paid
- `payment.failed` → Mark as failed
- `payment_intent.payment_failed` → Mark as failed
- `payment_intent.cancelled` → Mark as cancelled
- `qrph.expired` → Revert to pending

**Automatic Updates:**
1. **Order Payment Status** → `orders.payment_status = 'paid'`
2. **Payment Record** → `payments.payment_status = 'paid'`
3. **Payment Timestamps** → `paid_at`, `fee_amount`, `net_amount`
4. **Webhook Events** → Stored in `webhook_events` array

---

### **4. Database Updates (Automatic)**

#### **A. Order Table Updates:**
```sql
UPDATE orders SET 
  payment_status = 'paid',
  payment_method = 'paymongo',
  updated_at = now()
WHERE id = 'order_id';
```

#### **B. Payment Record Updates:**
```sql
UPDATE payments SET 
  status = 'succeeded',
  payment_status = 'paid',
  payment_id = 'payment_intent_id',
  paid_at = now(),
  fee_amount = 0,
  net_amount = amount,
  external_reference_number = 'ref_number',
  webhook_events = [...],
  paymongo_response = {...}
WHERE payment_intent_id = 'pi_xxx';
```

---

## **📊 Available Endpoints After Payment**

### **1. Check Payment Status**
```bash
GET /api/payments/status/:paymentIntentId
```
**Returns:**
```json
{
  "success": true,
  "data": {
    "paymentIntentId": "pi_xxx",
    "status": "succeeded",
    "amount": 10000,
    "currency": "PHP"
  }
}
```

### **2. Get Order Receipt**
```bash
GET /api/orders/:orderId/receipt
```
**Returns complete receipt with:**
- ✅ **Order Details**: Items, quantities, prices, total
- ✅ **Payment Details**: Method, transaction ID, timestamps
- ✅ **Customer Info**: Name, phone, table number
- ✅ **Status History**: Order progression timeline
- ✅ **Payment Summary**: Fees, net amount, reference numbers

### **3. Get Payment History**
```bash
GET /api/payments/order/:orderId/history
```
**Returns:**
```json
{
  "success": true,
  "data": {
    "order": { "id": "...", "orderNumber": "12345" },
    "payments": [
      {
        "id": "payment_id",
        "paymentIntentId": "pi_xxx",
        "amount": 10000,
        "status": "succeeded",
        "paymentStatus": "paid",
        "paymentMethod": "paymongo",
        "paidAt": "2025-01-14T01:15:00.000Z",
        "feeAmount": 0,
        "netAmount": 10000
      }
    ],
    "summary": {
      "totalPayments": 1,
      "successfulPayments": 1,
      "totalAmount": 10000
    }
  }
}
```

### **4. Manual Payment Sync (Backup)**
```bash
POST /api/orders/:orderId/sync-payment
```
**Use when webhooks fail:**
- 🔄 Checks PayMongo API directly
- 🔄 Updates order and payment status
- 🔄 Syncs latest payment data

---

## **🎯 What Happens Next (Business Logic)**

### **After Payment is Marked as Paid:**

#### **1. Order Status Progression:**
```
pending → preparing → ready → completed
```

#### **2. Kitchen Workflow:**
- 📋 Order appears in kitchen dashboard
- 👨‍🍳 Kitchen staff can start preparation
- ⏰ Estimated prep time calculated
- 🔔 Status updates sent to frontend

#### **3. Customer Experience:**
- ✅ Payment confirmation
- 📱 Order status notifications
- 🧾 Receipt generation
- ⏳ Preparation tracking

#### **4. Inventory Management:**
- 📦 Stock deduction (if configured)
- 📊 Sales analytics updated
- 💰 Revenue tracking

---

## **🔧 Manual Override Options**

### **If Webhook Fails:**
```bash
# Manual sync
POST /api/orders/:orderId/sync-payment

# Manual payment status update
PUT /api/orders/:orderId/payment
{
  "payment_status": "paid",
  "payment_method": "paymongo"
}
```

### **If Payment Issues:**
```bash
# Cancel payment
POST /api/payments/:paymentIntentId/cancel

# Check payment status
GET /api/payments/status/:paymentIntentId
```

---

## **📱 Frontend Integration Points**

### **1. Real-time Updates:**
- 🔔 WebSocket notifications for payment status
- 📊 Order status dashboard updates
- 💳 Payment confirmation UI

### **2. Receipt Generation:**
- 🧾 Print receipt functionality
- 📧 Email receipt option
- 📱 Digital receipt display

### **3. Order Management:**
- 📋 Kitchen order queue
- ⏰ Preparation time tracking
- 🎯 Order completion workflow

---

## **🛡️ Error Handling & Recovery**

### **Webhook Failures:**
- 🔄 Automatic retry mechanism
- 📝 Webhook event logging
- 🔧 Manual sync endpoint

### **Payment Issues:**
- ❌ Failed payment handling
- 🔄 Retry payment options
- 💰 Refund processing

### **System Recovery:**
- 🔍 Payment status verification
- 📊 Data consistency checks
- 🔧 Manual intervention tools

---

## **📈 Monitoring & Analytics**

### **Payment Metrics:**
- 💰 Total revenue tracking
- 📊 Payment method analytics
- ⏱️ Payment processing times
- 🔄 Success/failure rates

### **Order Analytics:**
- 📋 Order completion rates
- ⏰ Average preparation times
- 👥 Customer satisfaction metrics

---

## **🎯 Summary**

**After PayMongo payment creation, the system automatically:**

1. ✅ **Processes webhooks** → Updates payment status
2. ✅ **Updates database** → Order and payment records
3. ✅ **Enables receipt generation** → Complete order details
4. ✅ **Triggers business workflow** → Kitchen preparation
5. ✅ **Provides monitoring** → Payment and order tracking
6. ✅ **Handles errors** → Manual sync and recovery options

**The payment flow is fully automated with comprehensive error handling and manual override capabilities!**
