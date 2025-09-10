# PayMongo Frontend Integration Guide

## 🚀 Overview
This guide shows how to integrate PayMongo QR Ph payments into your restaurant frontend application.

## 📋 Prerequisites
- Order management system with existing order creation flow
- Authentication system with JWT tokens
- API base URL: `http://localhost:3000/api`

## 🔧 API Endpoints

### 1. Create PayMongo Payment for Order
```http
POST /api/orders/{orderId}/paymongo-payment
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "description": "Payment for Order #ORD-20250910-0003",
  "metadata": {
    "customer_phone": "09123456789",
    "table_number": "5"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "PayMongo payment intent created for order",
  "data": {
    "paymentIntentId": "pi_test_1757473090382",
    "status": "awaiting_payment_method",
    "amount": 2240,
    "currency": "PHP",
    "expiresAt": "2025-09-10T03:13:10.595Z",
    "qrCodeUrl": "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=pi_test_1757473090382",
    "qrCodeData": "base64_encoded_qr_data_for_pi_test_1757473090382",
    "order": {
      "id": "8120cd22-5630-4720-af21-4c8169f8ae75",
      "orderNumber": "ORD-20250910-0003",
      "totalAmount": 22.4,
      "customerName": "test paymong pay"
    }
  }
}
```

### 2. Check Payment Status
```http
GET /api/payments/status/{paymentIntentId}
Authorization: Bearer {jwt_token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "paymentIntentId": "pi_test_1757473090382",
    "status": "awaiting_payment_method",
    "amount": 2240,
    "currency": "PHP"
  }
}
```

## 🎨 Frontend Implementation

### 1. HTML Structure
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PayMongo Payment</title>
    <style>
        .payment-container {
            max-width: 500px;
            margin: 0 auto;
            padding: 20px;
            font-family: Arial, sans-serif;
        }
        .qr-code-container {
            text-align: center;
            margin: 20px 0;
        }
        .qr-code {
            max-width: 300px;
            border: 2px solid #ddd;
            border-radius: 8px;
        }
        .payment-info {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .status-indicator {
            padding: 10px;
            border-radius: 5px;
            margin: 10px 0;
            font-weight: bold;
        }
        .status-awaiting { background: #fff3cd; color: #856404; }
        .status-paid { background: #d4edda; color: #155724; }
        .status-failed { background: #f8d7da; color: #721c24; }
        .btn {
            background: #007bff;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            margin: 5px;
        }
        .btn:hover { background: #0056b3; }
        .btn:disabled { background: #6c757d; cursor: not-allowed; }
    </style>
</head>
<body>
    <div class="payment-container">
        <h2>PayMongo QR Payment</h2>
        
        <div class="payment-info">
            <h3>Order Details</h3>
            <p><strong>Order Number:</strong> <span id="orderNumber">-</span></p>
            <p><strong>Customer:</strong> <span id="customerName">-</span></p>
            <p><strong>Amount:</strong> ₱<span id="totalAmount">0.00</span></p>
        </div>

        <div id="statusIndicator" class="status-indicator status-awaiting">
            Generating QR Code...
        </div>

        <div class="qr-code-container" id="qrCodeContainer" style="display: none;">
            <h3>Scan QR Code to Pay</h3>
            <img id="qrCodeImage" class="qr-code" alt="QR Code">
            <p><small>Scan with GCash, Maya, or your bank app</small></p>
            <p><small>Expires at: <span id="expiresAt">-</span></small></p>
        </div>

        <div class="controls">
            <button id="checkStatusBtn" class="btn" onclick="checkPaymentStatus()">
                Check Payment Status
            </button>
            <button id="cancelBtn" class="btn" onclick="cancelPayment()" style="background: #dc3545;">
                Cancel Payment
            </button>
        </div>

        <div id="paymentResult" style="display: none;">
            <h3>Payment Result</h3>
            <p id="resultMessage"></p>
        </div>
    </div>

    <script src="paymongo-payment.js"></script>
</body>
</html>
```

### 2. JavaScript Implementation
```javascript
// paymongo-payment.js
class PayMongoPayment {
    constructor() {
        this.apiBaseUrl = 'http://localhost:3000/api';
        this.paymentIntentId = null;
        this.orderId = null;
        this.statusCheckInterval = null;
        this.token = localStorage.getItem('authToken'); // Get from your auth system
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Auto-check status every 5 seconds
        this.statusCheckInterval = setInterval(() => {
            if (this.paymentIntentId) {
                this.checkPaymentStatus();
            }
        }, 5000);
    }

    async createPayment(orderId, description = null, metadata = {}) {
        try {
            this.orderId = orderId;
            
            const response = await fetch(`${this.apiBaseUrl}/orders/${orderId}/paymongo-payment`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    description: description || `Payment for Order #${orderId}`,
                    metadata: metadata
                })
            });

            const result = await response.json();

            if (result.success) {
                this.paymentIntentId = result.data.paymentIntentId;
                this.displayPaymentData(result.data);
                this.updateStatus('awaiting_payment_method', 'Awaiting payment...');
                return result.data;
            } else {
                throw new Error(result.error || 'Failed to create payment');
            }
        } catch (error) {
            console.error('Payment creation error:', error);
            this.updateStatus('error', `Error: ${error.message}`);
            throw error;
        }
    }

    displayPaymentData(paymentData) {
        // Update order information
        document.getElementById('orderNumber').textContent = paymentData.order.orderNumber;
        document.getElementById('customerName').textContent = paymentData.order.customerName;
        document.getElementById('totalAmount').textContent = paymentData.order.totalAmount.toFixed(2);

        // Display QR code
        if (paymentData.qrCodeUrl) {
            const qrContainer = document.getElementById('qrCodeContainer');
            const qrImage = document.getElementById('qrCodeImage');
            
            qrImage.src = paymentData.qrCodeUrl;
            qrContainer.style.display = 'block';
        }

        // Display expiration time
        if (paymentData.expiresAt) {
            const expiresAt = new Date(paymentData.expiresAt);
            document.getElementById('expiresAt').textContent = expiresAt.toLocaleString();
        }
    }

    async checkPaymentStatus() {
        if (!this.paymentIntentId) return;

        try {
            const response = await fetch(`${this.apiBaseUrl}/payments/status/${this.paymentIntentId}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            const result = await response.json();

            if (result.success) {
                const status = result.data.status;
                this.updateStatus(status, this.getStatusMessage(status));
                
                // Handle different statuses
                switch (status) {
                    case 'succeeded':
                        this.handlePaymentSuccess();
                        break;
                    case 'payment_failed':
                        this.handlePaymentFailure();
                        break;
                    case 'cancelled':
                        this.handlePaymentCancellation();
                        break;
                }
            }
        } catch (error) {
            console.error('Status check error:', error);
        }
    }

    updateStatus(status, message) {
        const statusIndicator = document.getElementById('statusIndicator');
        statusIndicator.textContent = message;
        
        // Remove all status classes
        statusIndicator.className = 'status-indicator';
        
        // Add appropriate status class
        switch (status) {
            case 'awaiting_payment_method':
                statusIndicator.classList.add('status-awaiting');
                break;
            case 'succeeded':
                statusIndicator.classList.add('status-paid');
                break;
            case 'payment_failed':
            case 'cancelled':
                statusIndicator.classList.add('status-failed');
                break;
        }
    }

    getStatusMessage(status) {
        const statusMessages = {
            'awaiting_payment_method': 'Awaiting payment...',
            'succeeded': 'Payment successful! ✅',
            'payment_failed': 'Payment failed ❌',
            'cancelled': 'Payment cancelled ❌'
        };
        return statusMessages[status] || status;
    }

    handlePaymentSuccess() {
        this.showResult('Payment successful! Your order is being processed.', 'success');
        this.clearStatusCheck();
        
        // Redirect to success page or update UI
        setTimeout(() => {
            window.location.href = '/orders/success';
        }, 3000);
    }

    handlePaymentFailure() {
        this.showResult('Payment failed. Please try again.', 'error');
        this.clearStatusCheck();
    }

    handlePaymentCancellation() {
        this.showResult('Payment was cancelled.', 'warning');
        this.clearStatusCheck();
    }

    showResult(message, type) {
        const resultDiv = document.getElementById('paymentResult');
        const messageP = document.getElementById('resultMessage');
        
        messageP.textContent = message;
        resultDiv.style.display = 'block';
        
        // Hide QR code
        document.getElementById('qrCodeContainer').style.display = 'none';
    }

    clearStatusCheck() {
        if (this.statusCheckInterval) {
            clearInterval(this.statusCheckInterval);
            this.statusCheckInterval = null;
        }
    }

    async cancelPayment() {
        if (!this.paymentIntentId) return;

        try {
            const response = await fetch(`${this.apiBaseUrl}/payments/cancel/${this.paymentIntentId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            const result = await response.json();
            
            if (result.success) {
                this.updateStatus('cancelled', 'Payment cancelled');
                this.clearStatusCheck();
            }
        } catch (error) {
            console.error('Cancel payment error:', error);
        }
    }
}

// Global functions for HTML onclick handlers
let paymentHandler = null;

function initializePayment(orderId, description, metadata) {
    paymentHandler = new PayMongoPayment();
    return paymentHandler.createPayment(orderId, description, metadata);
}

function checkPaymentStatus() {
    if (paymentHandler) {
        paymentHandler.checkPaymentStatus();
    }
}

function cancelPayment() {
    if (paymentHandler) {
        paymentHandler.cancelPayment();
    }
}

// Example usage
document.addEventListener('DOMContentLoaded', function() {
    // Get order ID from URL or other source
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('orderId');
    
    if (orderId) {
        initializePayment(orderId);
    }
});
```

### 3. React Component Example
```jsx
import React, { useState, useEffect, useRef } from 'react';

const PayMongoPayment = ({ orderId, onPaymentSuccess, onPaymentError }) => {
    const [paymentData, setPaymentData] = useState(null);
    const [status, setStatus] = useState('initializing');
    const [error, setError] = useState(null);
    const statusCheckRef = useRef(null);

    const apiBaseUrl = 'http://localhost:3000/api';
    const token = localStorage.getItem('authToken');

    useEffect(() => {
        if (orderId) {
            createPayment();
        }
        
        return () => {
            if (statusCheckRef.current) {
                clearInterval(statusCheckRef.current);
            }
        };
    }, [orderId]);

    const createPayment = async () => {
        try {
            setStatus('creating');
            
            const response = await fetch(`${apiBaseUrl}/orders/${orderId}/paymongo-payment`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    description: `Payment for Order #${orderId}`
                })
            });

            const result = await response.json();

            if (result.success) {
                setPaymentData(result.data);
                setStatus('awaiting_payment_method');
                startStatusCheck(result.data.paymentIntentId);
            } else {
                throw new Error(result.error);
            }
        } catch (err) {
            setError(err.message);
            setStatus('error');
            onPaymentError?.(err);
        }
    };

    const startStatusCheck = (paymentIntentId) => {
        statusCheckRef.current = setInterval(async () => {
            try {
                const response = await fetch(`${apiBaseUrl}/payments/status/${paymentIntentId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                const result = await response.json();
                
                if (result.success) {
                    const newStatus = result.data.status;
                    setStatus(newStatus);
                    
                    if (newStatus === 'succeeded') {
                        clearInterval(statusCheckRef.current);
                        onPaymentSuccess?.(result.data);
                    } else if (newStatus === 'payment_failed' || newStatus === 'cancelled') {
                        clearInterval(statusCheckRef.current);
                        onPaymentError?.(new Error(`Payment ${newStatus}`));
                    }
                }
            } catch (err) {
                console.error('Status check error:', err);
            }
        }, 5000);
    };

    const getStatusMessage = (status) => {
        const messages = {
            'initializing': 'Initializing payment...',
            'creating': 'Creating payment intent...',
            'awaiting_payment_method': 'Awaiting payment...',
            'succeeded': 'Payment successful! ✅',
            'payment_failed': 'Payment failed ❌',
            'cancelled': 'Payment cancelled ❌',
            'error': 'Error occurred'
        };
        return messages[status] || status;
    };

    const getStatusClass = (status) => {
        const classes = {
            'awaiting_payment_method': 'status-awaiting',
            'succeeded': 'status-paid',
            'payment_failed': 'status-failed',
            'cancelled': 'status-failed',
            'error': 'status-failed'
        };
        return classes[status] || '';
    };

    if (error) {
        return (
            <div className="payment-error">
                <h3>Payment Error</h3>
                <p>{error}</p>
                <button onClick={() => window.location.reload()}>Retry</button>
            </div>
        );
    }

    return (
        <div className="paymongo-payment">
            <h2>PayMongo QR Payment</h2>
            
            {paymentData && (
                <div className="payment-info">
                    <h3>Order Details</h3>
                    <p><strong>Order Number:</strong> {paymentData.order.orderNumber}</p>
                    <p><strong>Customer:</strong> {paymentData.order.customerName}</p>
                    <p><strong>Amount:</strong> ₱{paymentData.order.totalAmount.toFixed(2)}</p>
                </div>
            )}

            <div className={`status-indicator ${getStatusClass(status)}`}>
                {getStatusMessage(status)}
            </div>

            {paymentData?.qrCodeUrl && status === 'awaiting_payment_method' && (
                <div className="qr-code-container">
                    <h3>Scan QR Code to Pay</h3>
                    <img 
                        src={paymentData.qrCodeUrl} 
                        alt="QR Code" 
                        className="qr-code"
                    />
                    <p><small>Scan with GCash, Maya, or your bank app</small></p>
                    {paymentData.expiresAt && (
                        <p><small>Expires at: {new Date(paymentData.expiresAt).toLocaleString()}</small></p>
                    )}
                </div>
            )}

            {status === 'succeeded' && (
                <div className="payment-success">
                    <h3>Payment Successful!</h3>
                    <p>Your order is being processed.</p>
                </div>
            )}
        </div>
    );
};

export default PayMongoPayment;
```

## 🔄 Integration with Order Flow

### 1. Order Creation Flow
```javascript
// After creating an order
async function createOrderAndPayment(orderData) {
    try {
        // 1. Create order
        const orderResponse = await fetch('/api/orders', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });
        
        const orderResult = await orderResponse.json();
        
        if (orderResult.success) {
            const orderId = orderResult.data.id;
            
            // 2. Redirect to payment page
            window.location.href = `/payment?orderId=${orderId}`;
        }
    } catch (error) {
        console.error('Order creation error:', error);
    }
}
```

### 2. Payment Page Integration
```javascript
// payment.html
const urlParams = new URLSearchParams(window.location.search);
const orderId = urlParams.get('orderId');

if (orderId) {
    const paymentHandler = new PayMongoPayment();
    paymentHandler.createPayment(orderId);
}
```

## 🎯 Key Features

1. **Automatic Status Polling**: Checks payment status every 5 seconds
2. **QR Code Display**: Shows QR code for scanning
3. **Real-time Updates**: Updates UI based on payment status
4. **Error Handling**: Handles various error scenarios
5. **Expiration Handling**: Shows expiration time
6. **Mobile Responsive**: Works on mobile devices

## 🔒 Security Considerations

1. **JWT Authentication**: All API calls require valid JWT tokens
2. **HTTPS in Production**: Use HTTPS for production deployments
3. **Token Storage**: Store JWT tokens securely
4. **Input Validation**: Validate all user inputs
5. **Error Messages**: Don't expose sensitive information in error messages

## 📱 Mobile Optimization

1. **Responsive Design**: Ensure QR code is visible on mobile
2. **Touch-friendly**: Make buttons touch-friendly
3. **Auto-zoom**: Prevent auto-zoom on input focus
4. **Viewport Meta**: Include proper viewport meta tag

## 🧪 Testing

1. **Test with Different Amounts**: Test various payment amounts
2. **Test Status Updates**: Verify status polling works
3. **Test Error Scenarios**: Test network errors, invalid tokens
4. **Test Mobile**: Test on actual mobile devices
5. **Test QR Scanning**: Test with actual QR code scanning apps

This implementation provides a complete PayMongo integration for your restaurant frontend!
