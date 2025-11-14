<!-- COPY-PASTE INTEGRATION SNIPPETS -->

# 🔧 Copy-Paste Integration Code

Use these code snippets to integrate the Admin Sales API into your existing codebase.

---

## Step 1: Update Main App File

**File:** `src/app.ts` or `src/index.ts`

**Find this section:**
```typescript
import orderRoutes from './routes/orderRoutes';
import paymentRoutes from './routes/paymentRoutes';
import offlinePaymentRoutes from './routes/offlinePaymentRoutes';

app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/offline-payments', offlinePaymentRoutes);
```

**Replace with:**
```typescript
import orderRoutes from './routes/orderRoutes';
import paymentRoutes from './routes/paymentRoutes';
import offlinePaymentRoutes from './routes/offlinePaymentRoutes';
import adminSalesRoutes from './routes/adminSalesRoutes'; // ✅ ADD THIS

app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/offline-payments', offlinePaymentRoutes);
app.use('/api/admin/sales', adminSalesRoutes); // ✅ ADD THIS
```

---

## Step 2: Update Order Routes

**File:** `src/routes/orderRoutes.ts`

**Add import at the top:**
```typescript
import { SalesService } from '../services/salesService'; // ✅ ADD THIS
```

**Find the route handler where order status is set to 'completed':**

This is likely in a PUT endpoint like `/orders/:orderId/status` or similar.

**Add this code after the order status is updated to 'completed':**

```typescript
// ✅ ADD THIS ENTIRE BLOCK
// After setting status to 'completed', create sales records
if (newStatus === 'completed') {
  try {
    // Get full order details including items
    const { data: fullOrder, error: fetchError } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        customer_name,
        order_type,
        payment_method,
        payment_status,
        discount_amount,
        order_items (
          menu_item_id,
          menu_item_name,
          quantity,
          unit_price,
          total_price
        )
      `)
      .eq('id', orderId)
      .single();

    if (!fetchError && fullOrder && fullOrder.order_items) {
      // Create sales record for each item in the order
      for (const item of fullOrder.order_items) {
        try {
          await SalesService.createSalesRecord(
            fullOrder.id,
            fullOrder.order_number,
            item.menu_item_id,
            item.menu_item_name || 'Unknown Item',
            item.quantity,
            item.unit_price,
            item.total_price,
            fullOrder.discount_amount || 0,
            fullOrder.customer_name,
            fullOrder.order_type,
            fullOrder.payment_method,
            fullOrder.payment_status,
            userId // or whatever variable holds the current user ID
          );
        } catch (recordError) {
          console.error('Error creating sales record for item:', item.menu_item_id, recordError);
          // Continue processing other items even if one fails
        }
      }
      console.log(`Created ${fullOrder.order_items.length} sales records for order ${fullOrder.order_number}`);
    }
  } catch (error) {
    console.error('Error processing sales records for completed order:', error);
    // Don't fail the order completion if sales record creation fails
  }
}
```

---

## Step 3: Verify Middleware

**File:** `src/middleware/authMiddleware.ts`

**Check if this function exists. If not, add it:**

```typescript
import { Request, Response, NextFunction } from 'express';

export const adminOnly = (req: Request, res: Response, next: NextFunction) => {
  // Assumes user is attached to request by JWT middleware
  const user = (req as any).user;
  
  if (!user || user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Unauthorized',
      message: 'Only administrators can access this endpoint',
      required_role: 'admin',
      user_role: user?.role || 'none'
    });
  }
  
  next();
};

// You may already have these, just verify:
export const kitchenOrAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  if (!user || (user.role !== 'kitchen' && user.role !== 'admin')) {
    return res.status(403).json({
      success: false,
      error: 'Unauthorized',
      message: 'Kitchen or admin access required'
    });
  }
  next();
};

export const cashierOrAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  if (!user || (user.role !== 'cashier' && user.role !== 'admin')) {
    return res.status(403).json({
      success: false,
      error: 'Unauthorized',
      message: 'Cashier or admin access required'
    });
  }
  next();
};
```

---

## Step 4: Run SQL Migration

**File:** `ADMIN_SALES_API_SQL.sql`

Steps:
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Click "New Query"
4. Copy the entire contents of `ADMIN_SALES_API_SQL.sql`
5. Paste into the editor
6. Click "Run"

**Verify success:**
```sql
-- Run this query to verify tables were created
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('sales_records', 'daily_sales_summary', 'weekly_best_sellers', 'hourly_sales_summary');
```

Should return 4 rows.

---

## Testing the Integration

### Test 1: Create a test order and mark as completed

```bash
# This will trigger sales record creation
curl -X PUT "http://localhost:3000/api/orders/{orderId}/status" \
  -H "Authorization: Bearer {adminToken}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "completed",
    "notes": "Order completed successfully"
  }'
```

### Test 2: Get best sellers

```bash
curl -X GET "http://localhost:3000/api/admin/sales/best-sellers" \
  -H "Authorization: Bearer {adminToken}"
```

### Test 3: Get sales records

```bash
curl -X GET "http://localhost:3000/api/admin/sales/records?limit=10" \
  -H "Authorization: Bearer {adminToken}"
```

### Test 4: Get revenue analytics

```bash
curl -X GET "http://localhost:3000/api/admin/sales/analytics/revenue?startDate=2025-01-01&endDate=2025-01-31" \
  -H "Authorization: Bearer {adminToken}"
```

---

## Postman Collection

**Create a new collection in Postman:**

```json
{
  "info": {
    "name": "Admin Sales API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Best Sellers This Week",
      "request": {
        "auth": {
          "type": "bearer",
          "bearer": [
            {
              "key": "token",
              "value": "{{adminToken}}",
              "type": "string"
            }
          ]
        },
        "method": "GET",
        "header": [],
        "url": {
          "raw": "{{baseUrl}}/api/admin/sales/best-sellers",
          "host": ["{{baseUrl}}"],
          "path": ["api", "admin", "sales", "best-sellers"]
        }
      }
    },
    {
      "name": "Best Sellers Specific Week",
      "request": {
        "auth": {
          "type": "bearer",
          "bearer": [
            {
              "key": "token",
              "value": "{{adminToken}}",
              "type": "string"
            }
          ]
        },
        "method": "GET",
        "header": [],
        "url": {
          "raw": "{{baseUrl}}/api/admin/sales/best-sellers/week?week=45&year=2025",
          "host": ["{{baseUrl}}"],
          "path": ["api", "admin", "sales", "best-sellers", "week"],
          "query": [
            {
              "key": "week",
              "value": "45"
            },
            {
              "key": "year",
              "value": "2025"
            }
          ]
        }
      }
    },
    {
      "name": "Sales Records",
      "request": {
        "auth": {
          "type": "bearer",
          "bearer": [
            {
              "key": "token",
              "value": "{{adminToken}}",
              "type": "string"
            }
          ]
        },
        "method": "GET",
        "header": [],
        "url": {
          "raw": "{{baseUrl}}/api/admin/sales/records?page=1&limit=50&paymentStatus=paid",
          "host": ["{{baseUrl}}"],
          "path": ["api", "admin", "sales", "records"],
          "query": [
            {
              "key": "page",
              "value": "1"
            },
            {
              "key": "limit",
              "value": "50"
            },
            {
              "key": "paymentStatus",
              "value": "paid"
            },
            {
              "key": "startDate",
              "value": "2025-01-01",
              "disabled": true
            },
            {
              "key": "endDate",
              "value": "2025-01-31",
              "disabled": true
            }
          ]
        }
      }
    },
    {
      "name": "Sales by Date Range",
      "request": {
        "auth": {
          "type": "bearer",
          "bearer": [
            {
              "key": "token",
              "value": "{{adminToken}}",
              "type": "string"
            }
          ]
        },
        "method": "GET",
        "header": [],
        "url": {
          "raw": "{{baseUrl}}/api/admin/sales/records/range?startDate=2025-01-01&endDate=2025-01-31",
          "host": ["{{baseUrl}}"],
          "path": ["api", "admin", "sales", "records", "range"],
          "query": [
            {
              "key": "startDate",
              "value": "2025-01-01"
            },
            {
              "key": "endDate",
              "value": "2025-01-31"
            }
          ]
        }
      }
    },
    {
      "name": "Daily Summary",
      "request": {
        "auth": {
          "type": "bearer",
          "bearer": [
            {
              "key": "token",
              "value": "{{adminToken}}",
              "type": "string"
            }
          ]
        },
        "method": "GET",
        "header": [],
        "url": {
          "raw": "{{baseUrl}}/api/admin/sales/summary?date=2025-01-15",
          "host": ["{{baseUrl}}"],
          "path": ["api", "admin", "sales", "summary"],
          "query": [
            {
              "key": "date",
              "value": "2025-01-15"
            }
          ]
        }
      }
    },
    {
      "name": "Revenue Analytics",
      "request": {
        "auth": {
          "type": "bearer",
          "bearer": [
            {
              "key": "token",
              "value": "{{adminToken}}",
              "type": "string"
            }
          ]
        },
        "method": "GET",
        "header": [],
        "url": {
          "raw": "{{baseUrl}}/api/admin/sales/analytics/revenue?startDate=2025-01-01&endDate=2025-01-31",
          "host": ["{{baseUrl}}"],
          "path": ["api", "admin", "sales", "analytics", "revenue"],
          "query": [
            {
              "key": "startDate",
              "value": "2025-01-01"
            },
            {
              "key": "endDate",
              "value": "2025-01-31"
            }
          ]
        }
      }
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000"
    },
    {
      "key": "adminToken",
      "value": "your_admin_jwt_token_here"
    }
  ]
}
```

Save this as JSON and import into Postman.

---

## Troubleshooting Checklist

- [ ] Service file is in `src/services/salesService.ts`
- [ ] Route file is in `src/routes/adminSalesRoutes.ts`
- [ ] Import added to main app.ts
- [ ] Routes registered with `app.use()`
- [ ] Middleware `adminOnly` exists and is imported
- [ ] SQL migration run in Supabase
- [ ] 4 new tables visible in Supabase
- [ ] Integration code added to orderRoutes.ts
- [ ] Code compiles without TypeScript errors
- [ ] Tests with admin token work
- [ ] Tests with non-admin token return 403

---

## What's Next?

Once integrated:
1. ✅ Complete orders and sales records auto-create
2. ✅ Admins can view best sellers
3. ✅ Admins can view detailed sales records
4. ✅ Revenue analytics available
5. Build admin dashboard UI
6. Add data visualizations (charts, graphs)
7. Set up daily/weekly reports

