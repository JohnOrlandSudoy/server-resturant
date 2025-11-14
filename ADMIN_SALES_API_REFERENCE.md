# 📱 Admin Sales API - Reference Card

## Quick Links to Files

| Purpose | File |
|---------|------|
| 🚀 Start Here | `ADMIN_SALES_API_README.md` |
| 🔧 Integration Steps | `ADMIN_SALES_API_INTEGRATION.md` |
| 📊 Architecture Diagram | `ADMIN_SALES_API_ARCHITECTURE.md` |
| 📖 Complete Guide | `ADMIN_SALES_API_IMPLEMENTATION_GUIDE.md` |
| 💾 SQL Migration | `ADMIN_SALES_API_SQL.sql` |
| 🔍 SQL Queries | `ADMIN_SALES_SQL_QUERIES.sql` |
| ⚙️ Service Code | `src/services/salesService.ts` |
| 🛣️ Routes Code | `src/routes/adminSalesRoutes.ts` |

---

## 🎯 Core Functionality

### Best Sellers
```
GET /api/admin/sales/best-sellers
GET /api/admin/sales/best-sellers/week?week=45&year=2025
```
Returns: Top 10 items ranked by quantity sold

### Sales Records
```
GET /api/admin/sales/records
GET /api/admin/sales/records?page=1&limit=50&paymentStatus=paid&startDate=2025-01-01&endDate=2025-01-31
GET /api/admin/sales/records/range?startDate=2025-01-01&endDate=2025-01-31
```
Returns: Individual sales records (paginated)

### Analytics
```
GET /api/admin/sales/summary?date=2025-01-15
GET /api/admin/sales/analytics/revenue?startDate=2025-01-01&endDate=2025-01-31
```
Returns: Daily totals and revenue breakdowns

---

## 🔐 Security

All endpoints require:
- ✅ Authentication token
- ✅ User role = `admin`
- ✅ Middleware: `adminOnly`

---

## 📦 What Gets Installed

### Database Tables
1. `sales_records` - Individual item sales
2. `daily_sales_summary` - Daily aggregates (optional)
3. `weekly_best_sellers` - Weekly rankings (optional)
4. `hourly_sales_summary` - Hourly breakdown (optional)

### TypeScript Files
1. `src/services/salesService.ts` - Business logic (8 methods)
2. `src/routes/adminSalesRoutes.ts` - API endpoints (6 routes)

### Integration Points
1. `app.ts` - Register routes
2. `orderRoutes.ts` - Trigger sales record creation
3. `authMiddleware.ts` - Verify `adminOnly` exists

---

## ⚡ 3-Step Installation

```bash
# Step 1: Run SQL in Supabase
# Copy ADMIN_SALES_API_SQL.sql → Supabase SQL Editor → Run

# Step 2: Copy files to your project
cp ADMIN_SALES_API_SQL.sql /your/project/
cp src/services/salesService.ts /your/project/src/services/
cp src/routes/adminSalesRoutes.ts /your/project/src/routes/

# Step 3: Update integration code
# - Add import in app.ts
# - Register route in app.ts
# - Add code to orderRoutes.ts
# See ADMIN_SALES_API_INTEGRATION.md for exact code
```

---

## 🧪 Test Endpoints

```bash
# Test best sellers
curl http://localhost:3000/api/admin/sales/best-sellers \
  -H "Authorization: Bearer {TOKEN}"

# Test sales records
curl "http://localhost:3000/api/admin/sales/records?limit=5" \
  -H "Authorization: Bearer {TOKEN}"

# Test revenue analytics
curl "http://localhost:3000/api/admin/sales/analytics/revenue?startDate=2025-01-01&endDate=2025-01-31" \
  -H "Authorization: Bearer {TOKEN}"
```

---

## 📊 Data Dimensions Tracked

For each sale, these values are recorded:
- `sale_date` - Date of sale (YYYY-MM-DD)
- `sale_time` - Time of sale (HH:MM:SS)
- `hour_of_day` - Hour (0-23)
- `day_of_week` - Day number (0-6)
- `week_number` - ISO week (1-53)
- `month_number` - Month (1-12)
- `year_number` - Year (YYYY)

Enables queries like:
- "Top sellers this week"
- "Sales by hour"
- "Monday vs Friday performance"
- "Year-over-year comparison"

---

## 🔄 Alternative: SQL Queries Only

Don't want TypeScript service/routes? Use raw SQL instead:

```sql
-- Copy from ADMIN_SALES_SQL_QUERIES.sql
-- Run directly in Supabase SQL Editor
-- 12 pre-written queries for common analytics
```

Benefits:
- ✅ No code changes needed
- ✅ Run immediately
- ✅ Works on existing tables
- ❌ No pagination
- ❌ No error handling

---

## 📈 Example Response: Best Sellers

```json
{
  "success": true,
  "data": [
    {
      "rank": 1,
      "menu_item_id": "uuid-1",
      "menu_item_name": "Fried Chicken",
      "total_quantity": 45,
      "total_revenue": "2250.00",
      "average_daily_sales": "321.43"
    },
    {
      "rank": 2,
      "menu_item_id": "uuid-2",
      "menu_item_name": "Adobo",
      "total_quantity": 38,
      "total_revenue": "1900.00",
      "average_daily_sales": "271.43"
    }
  ],
  "week": 45,
  "year": 2025
}
```

---

## 📊 Example Response: Daily Summary

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
    "average_order_value": "210.00",
    "top_selling_item_id": "uuid-1",
    "top_selling_item_name": "Fried Chicken",
    "top_selling_item_qty": 15
  },
  "date": "2025-01-15"
}
```

---

## 🛑 Common Errors & Solutions

| Error | Cause | Fix |
|-------|-------|-----|
| 403 Unauthorized | Non-admin token | Use admin token |
| Tables not found | SQL migration not run | Run ADMIN_SALES_API_SQL.sql in Supabase |
| Route not found | Not registered in app.ts | Add `app.use('/api/admin/sales', adminSalesRoutes);` |
| No records returned | No completed orders | Complete an order first |
| TypeError: SalesService is undefined | Import missing | Add `import { SalesService } from '../services/salesService';` |

---

## 📱 API Response Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success ✅ |
| 400 | Bad request (missing parameters) |
| 403 | Unauthorized (not admin) |
| 500 | Server error |

---

## 🎨 Metrics Available

### Best Sellers Metrics
- Rank by quantity
- Revenue per item
- Average daily sales
- Category breakdown

### Sales Records Metrics
- Individual transactions
- Payment method breakdown
- Discount analysis
- Time-based filtering

### Revenue Metrics
- Total revenue
- Net revenue (after discounts)
- Revenue by payment method
- Revenue by category
- Revenue by hour/day

---

## 🔌 Integration Checklist

- [ ] SQL migration script created in Supabase
- [ ] 4 tables visible in Supabase dashboard
- [ ] `salesService.ts` copied to `src/services/`
- [ ] `adminSalesRoutes.ts` copied to `src/routes/`
- [ ] Import added to `app.ts`
- [ ] Route registered: `app.use('/api/admin/sales', adminSalesRoutes);`
- [ ] `SalesService` imported in `orderRoutes.ts`
- [ ] Integration code added to order completion handler
- [ ] `adminOnly` middleware verified in `authMiddleware.ts`
- [ ] Project builds without errors
- [ ] API endpoints respond with data
- [ ] Non-admin token returns 403
- [ ] Pagination works
- [ ] Date filters work
- [ ] Authorization header required

---

## 📞 Support Resources

- 📖 **Full Guide:** `ADMIN_SALES_API_IMPLEMENTATION_GUIDE.md`
- 🏗️ **Architecture:** `ADMIN_SALES_API_ARCHITECTURE.md`
- 🔧 **Integration:** `ADMIN_SALES_API_INTEGRATION.md`
- 💾 **SQL Setup:** `ADMIN_SALES_API_SQL.sql`
- 🔍 **Query Examples:** `ADMIN_SALES_SQL_QUERIES.sql`

---

## 🚀 You're Ready!

All code is complete and ready to use. Just:

1. Run SQL migration ✅
2. Copy files ✅
3. Update integration code ✅
4. Test endpoints ✅

**Estimated time: 15-20 minutes**

