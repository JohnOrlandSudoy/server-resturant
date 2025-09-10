# PayMongo Integration Guide

## Overview

This guide covers the implementation of PayMongo payment integration with QR Ph support for the Restaurant POS system. The integration allows customers to pay using Philippine banks and e-wallets like GCash, Maya, and other QR Ph-compatible services.

## Features

- ✅ **QR Ph Integration** - Generate dynamic QR codes for Philippine payment systems
- ✅ **Payment Intent Management** - Create and track payment intents
- ✅ **Webhook Support** - Real-time payment status updates
- ✅ **Order Integration** - Link payments to restaurant orders
- ✅ **Security** - Webhook signature validation and input sanitization
- ✅ **Test Mode** - Sandbox environment for development
- ✅ **Frontend Demo** - Complete HTML/JS demo for testing

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Express API    │    │   PayMongo      │
│   (QR Display)  │◄──►│   (Payment       │◄──►│   (Payment      │
│                 │    │    Routes)       │    │    Gateway)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │   Supabase DB    │
                       │   (Order Data)   │
                       └──────────────────┘
```

## Installation & Setup

### 1. Install Dependencies

```bash
npm install paymongo
```

### 2. Environment Configuration

Add the following to your `.env` file:

```env
# PayMongo Configuration
PAYMONGO_SECRET_KEY=sk_test_your_paymongo_secret_key_here
PAYMONGO_PUBLIC_KEY=pk_test_your_paymongo_public_key_here
PAYMONGO_TEST_MODE=true
PAYMONGO_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### 3. Get PayMongo API Keys

1. Sign up at [PayMongo Dashboard](https://dashboard.paymongo.com/)
2. Navigate to **API Keys** section
3. Copy your **Secret Key** and **Public Key**
4. For webhooks, create a webhook endpoint and copy the secret

## API Endpoints

### Payment Routes (`/api/payments`)

#### 1. Create Payment Intent
```http
POST /api/payments/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 10000,           // Amount in centavos (10000 = PHP 100.00)
  "orderId": "uuid",         // Optional: Link to order
  "description": "Payment",  // Optional: Payment description
  "metadata": {}             // Optional: Additional data
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment intent created successfully",
  "data": {
    "paymentIntentId": "pi_xxx",
    "qrCodeUrl": "https://...",
    "qrCodeData": "base64...",
    "status": "awaiting_payment_method",
    "amount": 10000,
    "currency": "PHP",
    "expiresAt": "2024-01-01T12:15:00.000Z"
  }
}
```

#### 2. Get Payment Status
```http
GET /api/payments/status/:paymentIntentId
Authorization: Bearer <token>
```

#### 3. Create Payment for Order
```http
POST /api/payments/order/:orderId
Authorization: Bearer <token>
Content-Type: application/json

{
  "description": "Order payment",
  "metadata": {}
}
```

#### 4. PayMongo Webhook
```http
POST /api/payments/webhook
Content-Type: application/json
PayMongo-Signature: <signature>

{
  "id": "evt_xxx",
  "type": "payment_intent.succeeded",
  "data": {
    "id": "pi_xxx",
    "attributes": {
      "status": "succeeded",
      "amount": 10000,
      "currency": "PHP"
    }
  }
}
```

### Order Routes Integration

#### Create PayMongo Payment for Order
```http
POST /api/orders/:orderId/paymongo-payment
Authorization: Bearer <token>
Content-Type: application/json

{
  "description": "Order payment",
  "metadata": {}
}
```

## Frontend Integration

### 1. Basic QR Code Display

```html
<!DOCTYPE html>
<html>
<head>
    <title>PayMongo QR Payment</title>
</head>
<body>
    <div id="payment-container">
        <h2>Scan QR Code to Pay</h2>
        <img id="qr-code" alt="QR Code">
        <div id="payment-info"></div>
        <div id="status">Waiting for payment...</div>
    </div>

    <script>
        async function createPayment(amount) {
            const response = await fetch('/api/payments/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({
                    amount: amount * 100, // Convert to centavos
                    description: 'Restaurant Order Payment'
                })
            });

            const result = await response.json();
            
            if (result.success) {
                // Display QR code
                document.getElementById('qr-code').src = result.data.qrCodeUrl;
                document.getElementById('payment-info').innerHTML = 
                    `Amount: PHP ${(result.data.amount / 100).toFixed(2)}`;
                
                // Start polling for status
                pollPaymentStatus(result.data.paymentIntentId);
            }
        }

        async function pollPaymentStatus(paymentIntentId) {
            const interval = setInterval(async () => {
                const response = await fetch(`/api/payments/status/${paymentIntentId}`, {
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                
                const result = await response.json();
                
                if (result.data.status === 'succeeded') {
                    document.getElementById('status').textContent = 'Payment successful!';
                    clearInterval(interval);
                }
            }, 3000);
        }
    </script>
</body>
</html>
```

### 2. Demo Page

Access the complete demo at: `http://localhost:3000/public/paymongo-demo.html`

## Testing

### 1. Local Testing

1. **Start the server:**
   ```bash
   npm start
   ```

2. **Open demo page:**
   ```
   http://localhost:3000/public/paymongo-demo.html
   ```

3. **Test payment flow:**
   - Enter amount (e.g., 100.00)
   - Click "Generate QR Code"
   - Use PayMongo test cards or QR codes

### 2. Webhook Testing with ngrok

1. **Install ngrok:**
   ```bash
   npm install -g ngrok
   ```

2. **Expose local server:**
   ```bash
   ngrok http 3000
   ```

3. **Configure webhook in PayMongo:**
   - URL: `https://your-ngrok-url.ngrok.io/api/payments/webhook`
   - Events: `payment_intent.succeeded`, `payment_intent.payment_failed`

4. **Test webhook:**
   ```bash
   curl -X POST https://your-ngrok-url.ngrok.io/api/payments/webhook \
     -H "Content-Type: application/json" \
     -H "PayMongo-Signature: test" \
     -d '{"id":"evt_test","type":"payment_intent.succeeded","data":{"id":"pi_test","attributes":{"status":"succeeded","amount":10000,"currency":"PHP"}}}'
   ```

### 3. Test Cards & QR Codes

**PayMongo Test Mode:**
- Use test API keys (starts with `sk_test_` and `pk_test_`)
- Test QR codes work with PayMongo test environment
- No real money is charged

**Test Amounts:**
- Minimum: PHP 1.00 (100 centavos)
- Maximum: PHP 100,000.00 (10,000,000 centavos)

## Security Considerations

### 1. Webhook Security

```typescript
// Validate webhook signature
const signature = req.headers['paymongo-signature'];
const payload = JSON.stringify(req.body);

if (!paymongoService().validateWebhookSignature(payload, signature)) {
  return res.status(401).json({ error: 'Invalid signature' });
}
```

### 2. Input Validation

```typescript
// Validate amount
if (amount < 100 || amount > 10000000) {
  return res.status(400).json({
    error: 'Amount must be between PHP 1.00 and PHP 100,000.00'
  });
}
```

### 3. Environment Variables

- Never commit API keys to version control
- Use different keys for test and production
- Rotate keys regularly

## Error Handling

### Common Errors

1. **Invalid Amount:**
   ```json
   {
     "success": false,
     "error": "Amount must be between PHP 1.00 (100 centavos) and PHP 100,000.00 (10,000,000 centavos)"
   }
   ```

2. **Order Not Found:**
   ```json
   {
     "success": false,
         "error": "Order not found"
   }
   ```

3. **Payment Already Paid:**
   ```json
   {
     "success": false,
     "error": "Order is already paid"
   }
   ```

### Error Response Format

```json
{
  "success": false,
  "error": "Error message",
  "details": "Additional error details (optional)"
}
```

## Production Deployment

### 1. Environment Setup

```env
# Production PayMongo Configuration
PAYMONGO_SECRET_KEY=sk_live_your_live_secret_key
PAYMONGO_PUBLIC_KEY=pk_live_your_live_public_key
PAYMONGO_TEST_MODE=false
PAYMONGO_WEBHOOK_SECRET=whsec_your_production_webhook_secret
```

### 2. HTTPS Requirement

- PayMongo requires HTTPS in production
- Use SSL certificates (Let's Encrypt recommended)
- Update webhook URLs to use HTTPS

### 3. Webhook Configuration

1. **Set webhook URL in PayMongo dashboard:**
   ```
   https://yourdomain.com/api/payments/webhook
   ```

2. **Configure events:**
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.cancelled`

### 4. Monitoring

- Monitor webhook delivery in PayMongo dashboard
- Set up logging for payment events
- Implement retry logic for failed webhooks

## Troubleshooting

### 1. QR Code Not Displaying

- Check if `qrCodeUrl` is returned in API response
- Verify PayMongo API key is correct
- Ensure test mode is properly configured

### 2. Webhook Not Receiving Events

- Verify webhook URL is accessible
- Check webhook signature validation
- Ensure HTTPS is used in production

### 3. Payment Status Not Updating

- Check webhook endpoint is working
- Verify order ID in payment metadata
- Check database connection

### 4. Common Issues

| Issue | Solution |
|-------|----------|
| "Invalid API key" | Check PAYMONGO_SECRET_KEY format |
| "QR code not generated" | Verify payment method creation |
| "Webhook signature invalid" | Check PAYMONGO_WEBHOOK_SECRET |
| "Order not found" | Verify order exists in database |

## Support & Resources

- **PayMongo Documentation:** [developers.paymongo.com](https://developers.paymongo.com/)
- **API Reference:** [developers.paymongo.com/reference](https://developers.paymongo.com/reference)
- **Webhook Guide:** [developers.paymongo.com/docs/webhooks](https://developers.paymongo.com/docs/webhooks)
- **QR Ph Documentation:** [developers.paymongo.com/docs/qr-ph](https://developers.paymongo.com/docs/qr-ph)

## Changelog

### v1.0.0 (Initial Implementation)
- ✅ PayMongo SDK integration
- ✅ QR Ph payment method support
- ✅ Payment intent creation and management
- ✅ Webhook event handling
- ✅ Order integration
- ✅ Frontend demo page
- ✅ Test mode support
- ✅ Security validation
- ✅ Error handling
- ✅ Documentation

---

**Note:** This integration is designed for Philippine market with QR Ph support. Ensure compliance with local payment regulations and PayMongo's terms of service.
