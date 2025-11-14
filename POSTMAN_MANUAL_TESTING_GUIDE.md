# 📮 Postman Manual Testing Guide - Admin Sales API

## ✅ Setup Instructions

### Step 1: Import Collection into Postman

1. **Open Postman**
2. Click **"Import"** (top-left)
3. Select **"File"** tab
4. Choose **`POSTMAN_ADMIN_SALES_API_COLLECTION.json`**
5. Click **"Import"**
6. Collection will appear in left sidebar

---

## 🔑 Configure Variables

### Before Testing:

1. Click on collection: **"Admin Sales API - Manual Testing"**
2. Go to **"Variables"** tab
3. Update these variables:

| Variable | Value | Example |
|----------|-------|---------|
| `baseUrl` | Your server URL | `http://localhost:3000` or `https://your-domain.com` |
| `adminToken` | Your JWT admin token | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

**To get admin token:**
1. Login as admin user
2. Copy JWT from response
3. Paste into `adminToken` variable

---

## 🧪 Test Endpoints (6 Main Tests)

### Test 1️⃣: Best Sellers This Week

**Endpoint:** `GET /api/admin/sales/best-sellers`

**Steps:**
1. Find "**1️⃣ Best Sellers This Week**" in collection
2. Click **"Send"**
3. Check response (should show top 10 items)

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "rank": 1,
      "menu_item_id": "uuid-123",
      "menu_item_name": "Fried Chicken",
      "total_quantity": 45,
      "total_revenue": "2250.00",
      "average_daily_sales": "321.43"
    },
    {
      "rank": 2,
      "menu_item_id": "uuid-456",
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

**Tests Included:**
- ✅ Status code is 200
- ✅ Response is JSON
- ✅ Success flag is true
- ✅ Data array contains items
- ✅ Items have required fields (rank, menu_item_name, total_quantity, total_revenue)
- ✅ Week and year are present

**What to Look For:**
- Is data sorted by quantity (rank 1 has highest)?
- Are revenue amounts numeric?
- Is week number correct?

---

### Test 2️⃣: Best Sellers By Specific Week

**Endpoint:** `GET /api/admin/sales/best-sellers/week`

**Query Parameters:**
- `week` - ISO week number (1-53)
- `year` - Year (e.g., 2025)

**Steps:**
1. Find "**2️⃣ Best Sellers By Specific Week**"
2. Update variables if needed:
   - `testWeek`: Change to different week (e.g., 44, 43)
   - `testYear`: Change year if needed (e.g., 2024)
3. Click **"Send"**

**Try Different Values:**
```
Option A: Week 45, Year 2025 (current)
Option B: Week 44, Year 2025 (previous)
Option C: Week 1, Year 2025 (early year)
Option D: Week 52, Year 2024 (previous year)
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "rank": 1,
      "menu_item_name": "...",
      "total_quantity": 45,
      "total_revenue": "2250.00"
    }
  ],
  "week": 45,
  "year": 2025
}
```

**Tests Included:**
- ✅ Status code is 200
- ✅ Success flag is true
- ✅ Data is array
- ✅ Week matches query parameter
- ✅ Year matches query parameter

**What to Look For:**
- Does week number match your query?
- Is data different from test 1 if you change the week?

---

### Test 3️⃣: Sales Records - Paginated with Filters

**Endpoint:** `GET /api/admin/sales/records`

**Query Parameters (Optional):**
- `page` - Page number (default: 1)
- `limit` - Records per page (default: 50, max: 500)
- `paymentStatus` - paid, unpaid, refunded
- `paymentMethod` - cash, gcash, card, paymongo
- `startDate` - YYYY-MM-DD
- `endDate` - YYYY-MM-DD

**Steps:**
1. Find "**3️⃣ Sales Records - Paginated with Filters**"
2. Default shows page 1 with 10 records, filtered by `paymentStatus=paid`
3. Click **"Send"**

**Test Different Combinations:**

**Test A: Default Pagination**
```
page=1, limit=10, paymentStatus=paid
Expected: First 10 paid sales records
```

**Test B: Different Page**
1. Click **"Params"** tab
2. Change `page` to `2`
3. Click **"Send"**
```
page=2, limit=10
Expected: Records 11-20
```

**Test C: Different Limit**
1. Change `limit` to `20`
2. Click **"Send"**
```
page=1, limit=20
Expected: First 20 records
```

**Test D: Filter by Payment Method**
1. Find `paymentMethod` row
2. Click **"Disable"** checkbox to enable it
3. Change value to one of: `cash`, `gcash`, `card`, `paymongo`
4. Click **"Send"**
```
paymentStatus=paid, paymentMethod=cash
Expected: Only cash payment records
```

**Test E: Filter by Date Range**
1. Enable `startDate` and `endDate` checkboxes
2. Set dates (e.g., 2025-01-01 to 2025-01-31)
3. Click **"Send"**
```
startDate=2025-01-01, endDate=2025-01-31
Expected: Records from January only
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "order_number": "ORD-00123",
      "menu_item_name": "Fried Chicken",
      "quantity": 2,
      "unit_price": "250.00",
      "total_amount": "500.00",
      "discount_amount": "0",
      "payment_status": "paid",
      "payment_method": "cash",
      "sale_date": "2025-01-15",
      "sale_time": "14:30:00"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 150,
    "totalPages": 15
  }
}
```

**Tests Included:**
- ✅ Status code is 200
- ✅ Pagination info present
- ✅ Data array exists
- ✅ Records have required fields
- ✅ Data array length ≤ limit

**What to Look For:**
- Does `limit` match array length?
- Does `totalPages` = ceil(total / limit)?
- Do filters actually reduce record count?
- Does payment_status always match filter (if filtered)?

---

### Test 4️⃣: Sales Records by Date Range

**Endpoint:** `GET /api/admin/sales/records/range`

**Query Parameters (Required):**
- `startDate` - YYYY-MM-DD
- `endDate` - YYYY-MM-DD

**Steps:**
1. Find "**4️⃣ Sales Records by Date Range**"
2. Default shows last 30 days
3. Click **"Send"**

**Test Different Date Ranges:**

**Test A: Last 30 Days (Default)**
```
Automatically calculates 30 days back from today
Click Send
Expected: Sales from past month
```

**Test B: Last 7 Days**
1. Click **"Pre-request Script"** tab to see how dates are calculated
2. Or manually update `rangeStartDate` and `rangeEndDate` variables
3. Set dates to 7 days apart
4. Click **"Send"**

**Test C: Specific Month**
1. Update variables:
   - `rangeStartDate`: `2025-01-01`
   - `rangeEndDate`: `2025-01-31`
2. Click **"Send"**
```
Expected: January sales only
```

**Test D: Single Day**
1. Set both dates to same day:
   - `rangeStartDate`: `2025-01-15`
   - `rangeEndDate`: `2025-01-15`
2. Click **"Send"**
```
Expected: Sales from that day only
```

**Test E: Quarter**
1. Set dates for entire quarter:
   - `rangeStartDate`: `2025-01-01`
   - `rangeEndDate`: `2025-03-31`
2. Click **"Send"**
```
Expected: Q1 sales
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "order_number": "ORD-00123",
      "sale_date": "2025-01-15",
      "menu_item_name": "Fried Chicken",
      "quantity": 2,
      "total_amount": "500.00",
      "payment_method": "cash"
    }
  ],
  "startDate": "2025-01-01",
  "endDate": "2025-01-31"
}
```

**Tests Included:**
- ✅ Status code is 200
- ✅ Response includes date range
- ✅ Data is array
- ✅ All sales within date range
- ✅ Dates match query parameters

**What to Look For:**
- Are all `sale_date` values within the range?
- Does date order make sense?
- Is record count reasonable for the date range?

---

### Test 5️⃣: Daily Sales Summary

**Endpoint:** `GET /api/admin/sales/summary`

**Query Parameters (Optional):**
- `date` - YYYY-MM-DD (defaults to today)

**Steps:**
1. Find "**5️⃣ Daily Sales Summary**"
2. Default shows today's date
3. Click **"Send"**

**Test Different Dates:**

**Test A: Today (Default)**
```
date = today's date (auto-calculated)
Expected: Today's sales total
```

**Test B: Yesterday**
1. Update `summaryDate` variable:
   - Calculate yesterday's date
   - Format as YYYY-MM-DD
   - Paste into variable
2. Click **"Send"**

**Test C: Specific Date**
1. Set `summaryDate` to a date with known data:
   - `2025-01-15` (if you have test data)
2. Click **"Send"**

**Test D: No Data**
1. Set date to a date with no sales (e.g., far past or future)
2. Should return null or empty data
3. Click **"Send"**

**Expected Response (200 OK):**
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
    "top_selling_item_name": "Fried Chicken",
    "top_selling_item_qty": 15
  },
  "date": "2025-01-15"
}
```

**Tests Included:**
- ✅ Status code is 200
- ✅ Summary includes all required fields
- ✅ Numeric fields are numbers
- ✅ Net revenue = total - discount

**What to Look For:**
- Does `net_revenue` = `total_revenue` - `total_discount`?
- Do payment method totals sum to `total_revenue`?
- Is `average_order_value` = `total_revenue` / `total_orders`?
- Does `top_selling_item_qty` make sense?

---

### Test 6️⃣: Revenue Analytics

**Endpoint:** `GET /api/admin/sales/analytics/revenue`

**Query Parameters (Required):**
- `startDate` - YYYY-MM-DD
- `endDate` - YYYY-MM-DD

**Steps:**
1. Find "**6️⃣ Revenue Analytics**"
2. Default shows current month
3. Click **"Send"**

**Test Different Periods:**

**Test A: This Month (Default)**
```
startDate = 1st of current month
endDate = today
Expected: Month-to-date revenue breakdown
```

**Test B: Last 7 Days**
1. Update `analyticsStart` and `analyticsEnd` to 7 days apart
2. Click **"Send"**

**Test C: Last 30 Days**
1. Calculate 30 days back from today
2. Update variables
3. Click **"Send"**

**Test D: Last Quarter**
1. Set dates for 90-day period
2. Click **"Send"**

**Test E: Year-to-Date**
1. Set `analyticsStart` to `2025-01-01`
2. Set `analyticsEnd` to today
3. Click **"Send"**

**Expected Response (200 OK):**
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
    },
    "2025-01-02": {
      "revenue": "1200.00",
      "discount": "60.00",
      "net": "1140.00"
    }
  },
  "byPaymentMethod": {
    "cash": "12500.00",
    "gcash": "7500.00",
    "card": "5000.00",
    "paymongo": "0.00"
  }
}
```

**Tests Included:**
- ✅ Status code is 200
- ✅ Summary has required fields
- ✅ ByDate breakdown exists
- ✅ ByPaymentMethod breakdown exists
- ✅ Net revenue calculation correct

**What to Look For:**
- Does `summary.netRevenue` = `summary.totalRevenue` - `summary.totalDiscount`?
- Does sum of `byPaymentMethod` = `summary.totalRevenue`?
- Does sum of daily `net` values = `summary.netRevenue`?
- Are payment methods reasonable (cash > others typically)?

---

## ❌ Error Testing (3 Tests)

### Test 1: Unauthorized (No Token)

**Purpose:** Verify authentication is required

**Steps:**
1. Find "**❌ Test - Unauthorized (No Token)**"
2. This request has NO authorization header
3. Click **"Send"**

**Expected Response (401 or 403):**
```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Only administrators can access this endpoint"
}
```

**What to Look For:**
- Status is 401, 403, or 400 ✅
- Error message explains unauthorized ✅

---

### Test 2: Invalid Date Format

**Purpose:** Verify date validation

**Steps:**
1. Find "**❌ Test - Invalid Date Format**"
2. Uses invalid dates: `invalid` and `also-invalid`
3. Click **"Send"**

**Expected Response (400 or 500):**
```json
{
  "success": false,
  "error": "Invalid date format",
  "message": "Dates must be in YYYY-MM-DD format"
}
```

**What to Look For:**
- Status is 400 or 500 ✅
- Error message explains what went wrong ✅

---

### Test 3: Missing Required Parameters

**Purpose:** Verify parameter validation

**Steps:**
1. Find "**❌ Test - Missing Required Parameters**"
2. Endpoint `/records/range` called WITHOUT startDate/endDate
3. Click **"Send"**

**Expected Response (400):**
```json
{
  "success": false,
  "error": "Missing required parameters",
  "message": "startDate and endDate parameters are required"
}
```

**What to Look For:**
- Status is 400 ✅
- Error explains which parameters are required ✅

---

## 🧪 Testing Checklist

### Authentication ✅
- [ ] Test 1 (Best Sellers) returns 200 with token
- [ ] Error Test 1 (No Token) returns 401/403
- [ ] All tests pass with valid token
- [ ] All tests fail with invalid token

### Endpoints ✅
- [ ] Test 1: Best Sellers This Week - Returns top 10
- [ ] Test 2: Best Sellers By Week - Works with different weeks
- [ ] Test 3: Sales Records - Pagination works
- [ ] Test 3: Sales Records - Filters work
- [ ] Test 4: Records by Date Range - Date filtering works
- [ ] Test 5: Daily Summary - Shows daily totals
- [ ] Test 6: Revenue Analytics - Shows breakdown

### Data Quality ✅
- [ ] Rankings are in descending order
- [ ] Pagination calculations correct (totalPages, etc.)
- [ ] Dates are in correct format (YYYY-MM-DD)
- [ ] Numeric values are actual numbers
- [ ] Revenue calculations are correct
- [ ] Discount calculations are correct

### Error Handling ✅
- [ ] Invalid dates return error
- [ ] Missing parameters return 400
- [ ] Unauthorized returns 403
- [ ] Error messages are helpful
- [ ] No 500 errors (except bugs)

### Performance ✅
- [ ] Response time < 2 seconds
- [ ] Large limits (500) still responsive
- [ ] Date ranges don't timeout
- [ ] Concurrent requests work

---

## 📊 Response Time Benchmarks

| Endpoint | Typical Response | Good | Excellent |
|----------|-----------------|------|-----------|
| Best Sellers | < 500ms | < 1s | < 500ms |
| Sales Records | < 1s | < 2s | < 1s |
| Date Range | < 2s | < 3s | < 2s |
| Daily Summary | < 500ms | < 1s | < 500ms |
| Revenue Analytics | < 2s | < 3s | < 2s |

---

## 🐛 Troubleshooting

### Problem: "Invalid Bearer token"
**Solution:**
1. Get new admin JWT token from login
2. Update `adminToken` variable
3. Try again

### Problem: "baseUrl not found"
**Solution:**
1. Make sure server is running
2. Check `baseUrl` variable matches your server
3. Try: `http://localhost:3000` or `http://127.0.0.1:3000`

### Problem: "No data returned"
**Solution:**
1. Make sure you have test data
2. Try different date range
3. Complete a test order first
4. Check server logs

### Problem: "Status 500 Internal Error"
**Solution:**
1. Check server console for error
2. Verify database connection
3. Check service code for bugs
4. Review error message in response

### Problem: "Tests failing"
**Solution:**
1. Read test output in "Tests" tab
2. Check response structure matches expected
3. Verify data types (number vs string)
4. Fix calculations if wrong

---

## 💾 Exporting Results

### Export Test Results:
1. Complete all tests
2. Click **"..."** menu (top-right)
3. Select **"Export"**
4. Save as `.json` file
5. Share with team

### Generate Report:
1. Run collection
2. Click **"Run"** button
3. Set iterations/delays
4. Click **"Run Collection"**
5. View summary report
6. Export results

---

## 🚀 Best Practices

1. **Always Set Token First**
   - Update `adminToken` before running tests
   - Use a valid admin JWT

2. **Test in Order**
   - Start with simple tests (Best Sellers)
   - Move to complex tests (Analytics)
   - Test errors last

3. **Verify Data**
   - Check calculations are correct
   - Verify dates are in range
   - Ensure rankings make sense

4. **Use Variables**
   - Don't hardcode dates
   - Use Postman variables
   - Makes tests reusable

5. **Check Tests Tab**
   - Always review test results
   - Check which assertions passed/failed
   - Read error messages

6. **Monitor Performance**
   - Note response times
   - Check for timeouts
   - Identify slow endpoints

---

## 📝 Notes

- All times are in UTC
- Dates must be YYYY-MM-DD format
- Bearer token must be valid admin JWT
- Base URL must have protocol (http:// or https://)
- Max pagination limit is 500 records

---

**Happy Testing! 🎉**

