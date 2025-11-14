# 🎯 Admin Sales API - Quick Reference

## 📦 What You Got

Everything you need to display **best sellers** and **sales records** to admins only:

### Files Created:
1. **`ADMIN_SALES_API_SQL.sql`** - SQL migration (run in Supabase)
2. **`src/services/salesService.ts`** - Service layer (8 methods)
3. **`src/routes/adminSalesRoutes.ts`** - Express routes (6 endpoints)
4. **`ADMIN_SALES_SQL_QUERIES.sql`** - 12 ready-to-run queries
5. **`ADMIN_SALES_API_IMPLEMENTATION_GUIDE.md`** - Complete setup guide

---

## ⚡ 30-Second Setup

### 1️⃣ Run SQL Migration
- Open Supabase SQL Editor
- Paste contents of `ADMIN_SALES_API_SQL.sql`
- Click Run ✓

### 2️⃣ Register Routes
In your `app.ts` or `index.ts`:
```typescript
import adminSalesRoutes from './routes/adminSalesRoutes';
app.use('/api/admin/sales', adminSalesRoutes);
```

### 3️⃣ Trigger Sales Records
In `orderRoutes.ts`, when order completes:
```typescript
import { SalesService } from '../services/salesService';
await SalesService.createSalesRecord(...);
```

---

## 🔑 API Endpoints (Admin Only)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/admin/sales/best-sellers` | GET | Top 10 items this week |
| `/api/admin/sales/best-sellers/week?week=45&year=2025` | GET | Top items specific week |
| `/api/admin/sales/records` | GET | Paginated sales records |
| `/api/admin/sales/records/range?startDate=2025-01-01&endDate=2025-01-31` | GET | Sales by date range |
| `/api/admin/sales/summary?date=2025-01-15` | GET | Daily summary |
| `/api/admin/sales/analytics/revenue?startDate=2025-01-01&endDate=2025-01-31` | GET | Revenue breakdown |

---

## 💾 Database Tables

| Table | Purpose | Records |
|-------|---------|---------|
| `sales_records` | Individual item sales | Millions |
| `daily_sales_summary` | Daily aggregates | 365/year |
| `weekly_best_sellers` | Weekly rankings | 52/year |
| `hourly_sales_summary` | Hourly breakdown | 24/day |

---

## 🚀 Alternative: Use SQL Queries Only

**Don't want new tables?** Run queries in `ADMIN_SALES_SQL_QUERIES.sql` directly on existing tables.

Example - Best sellers this week:
```sql
SELECT 
  ROW_NUMBER() OVER (ORDER BY SUM(oi.quantity) DESC) as rank,
  mi.name as menu_item_name,
  SUM(oi.quantity) as total_quantity,
  SUM(oi.total_price) as total_revenue
FROM order_items oi
INNER JOIN orders o ON oi.order_id = o.id
INNER JOIN menu_items mi ON oi.menu_item_id = mi.id
WHERE EXTRACT(WEEK FROM o.created_at) = EXTRACT(WEEK FROM CURRENT_DATE)
  AND o.status = 'completed'
  AND o.payment_status = 'paid'
GROUP BY mi.name
ORDER BY total_quantity DESC LIMIT 10;
```

---

## 🔒 Security

✅ All endpoints require `adminOnly` middleware
✅ Only paid orders counted
✅ User role validation
✅ No customer PII exposed

---

## ✨ Features

- ✅ Best sellers ranking (this week, specific week, this month)
- ✅ Sales records with full details (quantity, price, method, status)
- ✅ Daily aggregations (total revenue, orders, items)
- ✅ Revenue by payment method breakdown
- ✅ Hourly sales analysis
- ✅ Date range filtering
- ✅ Pagination support (up to 500 records/page)
- ✅ Category performance tracking
- ✅ Week-over-week comparison
- ✅ Customer insights (top spenders)

---

## 📖 Need Help?

Read **`ADMIN_SALES_API_IMPLEMENTATION_GUIDE.md`** for:
- Detailed setup steps
- Full API documentation with examples
- Integration instructions
- Troubleshooting guide
- Security best practices

---

## 🧪 Test It

```bash
# Get best sellers this week
curl -X GET "http://localhost:3000/api/admin/sales/best-sellers" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Get sales records
curl -X GET "http://localhost:3000/api/admin/sales/records?limit=10" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

**You're all set! 🎉**
