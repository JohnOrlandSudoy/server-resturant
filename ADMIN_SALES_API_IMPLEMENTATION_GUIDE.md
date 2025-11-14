<!-- ADMIN SALES API - COMPLETE IMPLEMENTATION GUIDE -->

# Admin Sales API - Complete Implementation Guide

## Overview

This guide provides everything needed to implement admin-only endpoints for displaying **best sellers** and **sales records** with optional SQL queries to run directly on your Supabase database.

---

## 📋 What You're Getting

### Option A: Database Tables + TypeScript Service + Express Routes
- ✅ 4 SQL tables (sales_records, daily_sales_summary, weekly_best_sellers, hourly_sales_summary)
- ✅ Complete SalesService with 8 methods
- ✅ Admin-only routes with 6 endpoints
- ✅ Full integration into your Express app

### Option B: Direct SQL Queries Only
- ✅ 12 pre-written SQL queries
- ✅ Run directly on existing tables (no new tables needed)
- ✅ Instant best sellers and sales analytics

---

## 🚀 Quick Start - 3 Steps

### Step 1: Create Database Tables (SQL Migration)
**File:** `ADMIN_SALES_API_SQL.sql`

1. Open Supabase Dashboard → SQL Editor
2. Create new query
3. Copy entire contents of `ADMIN_SALES_API_SQL.sql`
4. Click "Run"
5. Verify all 4 tables are created:
   ```sql
   SELECT tablename FROM pg_tables WHERE schemaname = 'public' 
   AND tablename IN ('sales_records', 'daily_sales_summary', 'weekly_best_sellers', 'hourly_sales_summary');
   ```

### Step 2: Create SalesService
**File:** `src/services/salesService.ts`

This file is already created. It contains:
- `createSalesRecord()` - Called when order completes
- `getBestSellersThisWeek()` - Get top 10 items this week
- `getBestSellersByWeek()` - Get top 10 items for specific week
- `getSalesRecords()` - Paginated sales records with filters
- `getSalesRecordsByDateRange()` - Records between two dates
- `getDailySalesSummary()` - Daily totals
- `calculateDailySummary()` - Calculate and aggregate daily stats
- `getRevenueAnalytics()` - Revenue breakdown by date and method

### Step 3: Create Admin Routes
**File:** `src/routes/adminSalesRoutes.ts`

This file is already created. It contains 6 admin-only endpoints.

**Then register in your main app file (e.g., `app.ts` or `index.ts`):**

```typescript
import adminSalesRoutes from './routes/adminSalesRoutes';

// Add after other route registrations
app.use('/api/admin/sales', adminSalesRoutes);
```

---

## 🔌 Integration Steps

### Step 1: Update orderRoutes.ts to Trigger Sales Records
When an order is marked as "completed", create a sales record:

**Location in orderRoutes.ts:** After status update to 'completed'

```typescript
import { SalesService } from '../services/salesService';

// In the route handler where order status is set to 'completed':
if (newStatus === 'completed') {
  // Get order details
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', orderId)
    .single();

  if (!orderError && order) {
    // Create sales record for each item
    for (const item of order.order_items) {
      try {
        await SalesService.createSalesRecord(
          order.id,
          order.order_number,
          item.menu_item_id,
          item.menu_item_name || 'Unknown Item',
          item.quantity,
          item.unit_price,
          item.total_price,
          order.discount_amount || 0,
          order.customer_name,
          order.order_type,
          order.payment_method,
          order.payment_status,
          updatedBy
        );
      } catch (error) {
        console.error('Error creating sales record:', error);
        // Don't fail the order update if sales record fails
      }
    }
  }
}
```

### Step 2: Ensure adminOnly Middleware Exists

**File:** `src/middleware/authMiddleware.ts`

Verify this middleware exists:

```typescript
export const adminOnly = (req: Request, res: Response, next: NextFunction) => {
  const user = req.user; // Assumes user is attached by auth middleware
  
  if (!user || user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Unauthorized',
      message: 'Only administrators can access this endpoint'
    });
  }
  
  next();
};
```

If it doesn't exist, create it in `src/middleware/authMiddleware.ts`.

---

## 📚 API Endpoints

All endpoints require `adminOnly` authentication.

### 1. Get Best Sellers This Week
```
GET /api/admin/sales/best-sellers
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "rank": 1,
      "menu_item_id": "uuid",
      "menu_item_name": "Fried Chicken",
      "total_quantity": 45,
      "total_revenue": "2250.00",
      "average_daily_sales": "321.43"
    }
  ],
  "week": 45,
  "year": 2025
}
```

### 2. Get Best Sellers by Week
```
GET /api/admin/sales/best-sellers/week?week=45&year=2025
```

**Query Parameters:**
- `week` (required) - ISO week number (1-53)
- `year` (required) - Year (e.g., 2025)

### 3. Get All Sales Records
```
GET /api/admin/sales/records?page=1&limit=50&startDate=2025-01-01&endDate=2025-01-31&paymentStatus=paid
```

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Records per page (default: 50, max: 500)
- `startDate` - Filter by start date (YYYY-MM-DD)
- `endDate` - Filter by end date (YYYY-MM-DD)
- `paymentStatus` - Filter by status (paid, unpaid, refunded)
- `paymentMethod` - Filter by method (cash, gcash, card, paymongo)
- `menuItemId` - Filter by menu item

### 4. Get Sales Records by Date Range
```
GET /api/admin/sales/records/range?startDate=2025-01-01&endDate=2025-01-31
```

### 5. Get Daily Sales Summary
```
GET /api/admin/sales/summary?date=2025-01-15
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sale_date": "2025-01-15",
    "total_orders": 25,
    "total_items_sold": 87,
    "total_revenue": "5250.00",
    "total_discount": "250.00",
    "net_revenue": "5000.00",
    "cash_sales": "2500.00",
    "gcash_sales": "1500.00",
    "card_sales": "1000.00",
    "paymongo_sales": "250.00",
    "average_order_value": "210.00"
  },
  "date": "2025-01-15"
}
```

### 6. Get Revenue Analytics
```
GET /api/admin/sales/analytics/revenue?startDate=2025-01-01&endDate=2025-01-31
```

**Response:**
```json
{
  "success": true,
  "summary": {
    "startDate": "2025-01-01",
    "endDate": "2025-01-31",
    "totalRevenue": "25000.00",
    "totalDiscount": "1250.00",
    "netRevenue": "23750.00"
  },
  "byDate": {
    "2025-01-01": {
      "revenue": "1000.00",
      "discount": "50.00",
      "net": "950.00"
    }
  },
  "byPaymentMethod": {
    "cash": "12500.00",
    "gcash": "7500.00"
  }
}
```

---

## 📊 SQL Queries (Alternative Approach)

If you prefer to use SQL queries directly without creating the new tables, use the queries in **`ADMIN_SALES_SQL_QUERIES.sql`**.

**These queries work on existing tables:**

1. **Best Sellers This Week** - Top 10 items
2. **Best Sellers by Week** - Specific week
3. **Best Sellers This Month** - Monthly ranking
4. **All Sales Records** - Complete sales ledger
5. **Sales by Date Range** - Custom date filter
6. **Daily Sales Summary** - Total sales per day
7. **Hourly Sales Summary** - Sales by hour
8. **Revenue by Payment Method** - Payment breakdown
9. **Category Performance** - Top categories
10. **Week-over-Week Comparison** - Week comparison
11. **Sales by Category Daily** - Category daily tracking
12. **Top Customers** - High-value customers

**Example: Get Best Sellers This Week**
```sql
-- Paste this in Supabase SQL Editor
SELECT 
  ROW_NUMBER() OVER (ORDER BY SUM(oi.quantity) DESC) as rank,
  oi.menu_item_id,
  mi.name as menu_item_name,
  SUM(oi.quantity) as total_quantity,
  SUM(oi.total_price) as total_revenue
FROM order_items oi
INNER JOIN orders o ON oi.order_id = o.id
INNER JOIN menu_items mi ON oi.menu_item_id = mi.id
WHERE 
  EXTRACT(WEEK FROM o.created_at::date) = EXTRACT(WEEK FROM CURRENT_DATE)
  AND EXTRACT(YEAR FROM o.created_at::date) = EXTRACT(YEAR FROM CURRENT_DATE)
  AND o.status = 'completed'
  AND o.payment_status = 'paid'
GROUP BY oi.menu_item_id, mi.name
ORDER BY total_quantity DESC
LIMIT 10;
```

---

## 🔒 Security Notes

✅ All endpoints require `adminOnly` middleware
✅ All data filtered by `payment_status = 'paid'` to exclude pending/failed orders
✅ User role validation on every request
✅ No sensitive customer information exposed without proper authorization

---

## 📁 Files Created

| File | Purpose | Required? |
|------|---------|-----------|
| `ADMIN_SALES_API_SQL.sql` | SQL migration script | ✅ Yes (for new tables) |
| `src/services/salesService.ts` | Service layer with aggregation logic | ✅ Yes (for API endpoints) |
| `src/routes/adminSalesRoutes.ts` | Admin-only route handlers | ✅ Yes (for API endpoints) |
| `ADMIN_SALES_SQL_QUERIES.sql` | Direct SQL queries | ❌ Optional (alternative to API) |

---

## 🧪 Testing

### Test Best Sellers Endpoint
```bash
curl -X GET "http://localhost:3000/api/admin/sales/best-sellers" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Test Sales Records Endpoint
```bash
curl -X GET "http://localhost:3000/api/admin/sales/records?limit=10" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Test Revenue Analytics
```bash
curl -X GET "http://localhost:3000/api/admin/sales/analytics/revenue?startDate=2025-01-01&endDate=2025-01-31" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## ✅ Implementation Checklist

- [ ] Copy `ADMIN_SALES_API_SQL.sql` to Supabase SQL Editor and run it
- [ ] Verify 4 new tables are created in Supabase
- [ ] File `src/services/salesService.ts` is placed in correct directory
- [ ] File `src/routes/adminSalesRoutes.ts` is placed in correct directory
- [ ] Register routes in main app file: `app.use('/api/admin/sales', adminSalesRoutes);`
- [ ] Verify `adminOnly` middleware exists in `src/middleware/authMiddleware.ts`
- [ ] Update `orderRoutes.ts` to call `SalesService.createSalesRecord()` when order completes
- [ ] Test each endpoint with admin token
- [ ] Verify data is being recorded in `sales_records` table
- [ ] Test SQL queries in Supabase SQL Editor (optional)

---

## 🐛 Troubleshooting

### Sales records not being created
- Check that order status is actually being set to 'completed'
- Verify the integration code in orderRoutes.ts is in place
- Check browser console/server logs for errors

### Endpoints return 403 Unauthorized
- Verify the token you're using has admin role
- Check that `adminOnly` middleware is correctly checking user role

### Query returns no results
- Verify orders have `status = 'completed'` and `payment_status = 'paid'`
- Check date range is correct
- Ensure test data exists in orders table

### Performance issues
- Add indexes to sales_records table (already included in migration script)
- Use date range filters to limit query size
- Consider using weekly_best_sellers table instead of calculating weekly aggregates

---

## 📞 Support

For questions about:
- **SQL Setup**: Check ADMIN_SALES_API_SQL.sql for DDL comments
- **API Usage**: See endpoint documentation above
- **Integration**: See Integration Steps section
- **Queries**: Check ADMIN_SALES_SQL_QUERIES.sql for examples

---

## 📝 Version Info

- Created: 2025-01-15
- Node.js: 14+
- TypeScript: 4.5+
- Supabase: Latest
- Express: 4.17+

