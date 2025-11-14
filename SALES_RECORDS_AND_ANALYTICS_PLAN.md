# Sales Records & Best-Selling Menu Analytics - Complete Plan

**Date:** November 14, 2025  
**Goal:** Track all sales with date/time and provide real-time best-selling menu insights  
**Status:** Planning Phase

---

## 📊 PART 1: CURRENT STATE ANALYSIS

### What You Already Have ✅

From your Supabase schema:

```sql
orders (
  id, order_number, customer_name, order_type, status,
  payment_status, payment_method, subtotal, discount_amount,
  tax_amount, total_amount,
  created_at, updated_at, completed_at  ← Timestamps exist!
)

order_items (
  id, order_id, menu_item_id, quantity, unit_price, total_price,
  customizations, special_instructions, created_at
)

menu_items (
  id, name, price, prep_time, is_available, calories, allergens
)
```

**✅ Good News:** You already have:
- Order timestamps (`created_at`, `completed_at`)
- Item-level tracking (quantity, price)
- Menu item linkage
- Payment method tracking

### What's Missing ❌

For complete sales analytics, you need:

1. **Aggregated sales view** (denormalized for fast queries)
2. **Time-based grouping** (hourly, daily, weekly bucketing)
3. **Best-seller calculation logic** (quantity vs revenue rankings)
4. **Sales summary table** (for caching/performance)

---

## 🗄️ PART 2: DATABASE SCHEMA ADDITIONS

### New Table 1: `sales_records` (Denormalized for Analytics)

```sql
CREATE TABLE public.sales_records (
  -- Primary Key
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Sale Identification
  order_id uuid NOT NULL REFERENCES orders(id),
  order_number character varying NOT NULL,
  order_item_id uuid NOT NULL REFERENCES order_items(id),
  
  -- Menu Item Details
  menu_item_id uuid NOT NULL REFERENCES menu_items(id),
  menu_item_name character varying NOT NULL,
  
  -- Quantity & Pricing
  quantity_sold integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL,
  total_price numeric NOT NULL,
  discount_amount numeric DEFAULT 0,
  
  -- Sales Details
  payment_method character varying,                    -- cash|gcash|card|paymongo|qrph
  payment_status character varying,                    -- paid|unpaid|refunded|cancelled
  
  -- Timestamps (Multiple dimensions for flexible reporting)
  sale_date date NOT NULL,                            -- For grouping by date
  sale_time time NOT NULL,                            -- For grouping by time
  hour_bucket integer,                                 -- 0-23 for hourly analysis
  day_of_week integer,                                 -- 0-6 (Sun-Sat)
  week_of_year integer,                                -- 1-52
  month integer,                                       -- 1-12
  year integer,                                        -- 2025, 2026, etc.
  
  -- Timestamps (Standard)
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  -- Tracking
  created_by uuid REFERENCES user_profiles(id),
  
  -- Indexes for performance
  CONSTRAINT sales_records_pkey PRIMARY KEY (id)
);

-- Indexes for fast queries
CREATE INDEX idx_sales_records_sale_date ON sales_records(sale_date);
CREATE INDEX idx_sales_records_menu_item_id ON sales_records(menu_item_id);
CREATE INDEX idx_sales_records_hour_bucket ON sales_records(hour_bucket);
CREATE INDEX idx_sales_records_payment_method ON sales_records(payment_method);
CREATE INDEX idx_sales_records_day_of_week ON sales_records(day_of_week);
CREATE INDEX idx_sales_records_week_of_year ON sales_records(week_of_year);
```

---

### New Table 2: `daily_sales_summary` (Aggregated for Dashboard)

```sql
CREATE TABLE public.daily_sales_summary (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Date
  summary_date date NOT NULL UNIQUE,
  day_of_week integer,
  
  -- Sales Totals
  total_orders integer NOT NULL DEFAULT 0,
  total_items_sold integer NOT NULL DEFAULT 0,
  total_revenue numeric NOT NULL DEFAULT 0,
  total_discount_given numeric DEFAULT 0,
  total_tax_collected numeric DEFAULT 0,
  
  -- Payment Methods
  cash_total numeric DEFAULT 0,
  gcash_total numeric DEFAULT 0,
  card_total numeric DEFAULT 0,
  paymongo_total numeric DEFAULT 0,
  
  -- Order Types
  dine_in_count integer DEFAULT 0,
  takeout_count integer DEFAULT 0,
  
  -- Order Status
  completed_count integer DEFAULT 0,
  cancelled_count integer DEFAULT 0,
  pending_count integer DEFAULT 0,
  
  -- Metrics
  average_order_value numeric DEFAULT 0,
  average_items_per_order numeric DEFAULT 0,
  
  -- Timestamps
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT daily_sales_summary_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_daily_sales_summary_date ON daily_sales_summary(summary_date);
```

---

### New Table 3: `weekly_best_sellers` (Pre-calculated for Performance)

```sql
CREATE TABLE public.weekly_best_sellers (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Week Identification
  week_number integer NOT NULL,
  year integer NOT NULL,
  week_start_date date NOT NULL,
  week_end_date date NOT NULL,
  
  -- Menu Item
  menu_item_id uuid NOT NULL REFERENCES menu_items(id),
  menu_item_name character varying NOT NULL,
  menu_item_price numeric NOT NULL,
  
  -- Sales Metrics
  total_quantity_sold integer NOT NULL,
  total_revenue numeric NOT NULL,
  total_orders_with_item integer NOT NULL,
  
  -- Rankings
  rank_by_quantity integer,                           -- 1st, 2nd, 3rd...
  rank_by_revenue integer,
  
  -- Timestamps
  calculated_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT weekly_best_sellers_pkey PRIMARY KEY (id),
  CONSTRAINT unique_week_item UNIQUE (year, week_number, menu_item_id)
);

CREATE INDEX idx_weekly_best_sellers_week ON weekly_best_sellers(year, week_number);
CREATE INDEX idx_weekly_best_sellers_item ON weekly_best_sellers(menu_item_id);
```

---

### New Table 4: `hourly_sales_summary` (For Real-time Dashboard)

```sql
CREATE TABLE public.hourly_sales_summary (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Time Bucket
  summary_date date NOT NULL,
  hour_bucket integer NOT NULL,                        -- 0-23
  timestamp_start timestamp with time zone NOT NULL,
  
  -- Metrics
  total_orders integer DEFAULT 0,
  total_items_sold integer DEFAULT 0,
  total_revenue numeric DEFAULT 0,
  
  -- Popular Items (Top 3)
  top_item_1_id uuid,
  top_item_1_name character varying,
  top_item_1_quantity integer,
  
  top_item_2_id uuid,
  top_item_2_name character varying,
  top_item_2_quantity integer,
  
  top_item_3_id uuid,
  top_item_3_name character varying,
  top_item_3_quantity integer,
  
  -- Timestamps
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT hourly_sales_summary_pkey PRIMARY KEY (id),
  CONSTRAINT unique_hour UNIQUE (summary_date, hour_bucket)
);

CREATE INDEX idx_hourly_sales_summary_date_hour ON hourly_sales_summary(summary_date, hour_bucket);
```

---

## 🔄 PART 3: DATA FLOW - HOW SALES ARE RECORDED

### When Order is Completed (Status = 'completed')

```
Order Completion
    ↓
Trigger: Insert into sales_records for each order_item
    ↓
Calculate time dimensions:
  - sale_date = today
  - sale_time = current_time
  - hour_bucket = extract hour from created_at
  - day_of_week = extract dow from created_at
  - week_of_year = extract week from created_at
  - month = extract month
  - year = extract year
    ↓
Store: menu_item_id, quantity, price, payment_method
    ↓
Optional: Update daily_sales_summary table (aggregate view)
```

---

## 🌐 PART 4: API ENDPOINTS DESIGN

### GROUP A: SALES RECORDS ENDPOINTS

#### Endpoint 1.1: POST /api/sales/record
**Purpose:** Manually create sales record (or triggered automatically on order completion)  
**Middleware:** `kitchenOrAdmin` or `cashierOrAdmin`  
**Request Body:**
```json
{
  "order_id": "uuid",
  "order_item_id": "uuid",
  "menu_item_id": "uuid",
  "quantity_sold": 2,
  "unit_price": 250.00,
  "total_price": 500.00,
  "payment_method": "paymongo",
  "payment_status": "paid",
  "notes": "Completed order"
}
```
**Response:**
```json
{
  "success": true,
  "message": "Sales record created",
  "data": {
    "id": "uuid",
    "order_number": "ORD-001",
    "menu_item_name": "Fried Chicken",
    "quantity_sold": 2,
    "total_price": 500.00,
    "sale_date": "2025-11-14",
    "sale_time": "14:30:45",
    "hour_bucket": 14,
    "payment_method": "paymongo"
  }
}
```
**DB:** Inserts into `sales_records`

---

#### Endpoint 1.2: GET /api/sales/records
**Purpose:** Get all sales records with filtering and pagination  
**Middleware:** `cashierOrAdmin`  
**Query Params:**
```
date_from?: string         (YYYY-MM-DD)
date_to?: string           (YYYY-MM-DD)
menu_item_id?: uuid
payment_method?: string    (cash|paymongo|gcash|card)
limit?: number             (default: 100)
offset?: number            (default: 0)
```
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "order_id": "uuid",
      "order_number": "ORD-001",
      "menu_item_id": "uuid",
      "menu_item_name": "Fried Chicken",
      "quantity_sold": 2,
      "unit_price": 250.00,
      "total_price": 500.00,
      "payment_method": "paymongo",
      "payment_status": "paid",
      "sale_date": "2025-11-14",
      "sale_time": "14:30:45",
      "created_at": "2025-11-14T14:30:45Z"
    }
  ],
  "pagination": { "total": 500, "limit": 100, "offset": 0 }
}
```

---

#### Endpoint 1.3: GET /api/sales/records/:id
**Purpose:** Get single sales record details  
**Response:** Single sales_record object

---

#### Endpoint 1.4: GET /api/sales/by-date/:date
**Purpose:** Get all sales for a specific date (YYYY-MM-DD)  
**Query Params:**
```
group_by?: string  (none|hour|payment_method|menu_item)
```
**Response:**
```json
{
  "success": true,
  "data": {
    "date": "2025-11-14",
    "total_records": 45,
    "total_revenue": 5420.00,
    "total_items_sold": 78,
    "records": [ /* sales_records array */ ],
    "summary": {
      "by_hour": {
        "10": { "count": 5, "revenue": 450 },
        "11": { "count": 8, "revenue": 720 },
        ...
      },
      "by_payment_method": {
        "cash": { "count": 20, "revenue": 2100 },
        "paymongo": { "count": 25, "revenue": 3320 }
      }
    }
  }
}
```

---

#### Endpoint 1.5: GET /api/sales/by-time-range
**Purpose:** Get sales within date range with aggregation  
**Query Params:**
```
date_from: string          (YYYY-MM-DD) - REQUIRED
date_to: string            (YYYY-MM-DD) - REQUIRED
group_by?: string          (date|hour|payment_method|menu_item)
limit?: number
```
**Response:**
```json
{
  "success": true,
  "data": {
    "period": {
      "from": "2025-11-07",
      "to": "2025-11-14",
      "days": 8
    },
    "totals": {
      "total_records": 360,
      "total_revenue": 42800.50,
      "total_items_sold": 625,
      "total_orders": 85,
      "average_order_value": 504.71
    },
    "grouped_data": [
      {
        "date": "2025-11-14",
        "revenue": 5420.00,
        "items_sold": 78,
        "orders": 10
      }
    ]
  }
}
```

---

#### Endpoint 1.6: GET /api/sales/daily-summary
**Purpose:** Get pre-calculated daily summary dashboard data  
**Query Params:**
```
date?: string     (YYYY-MM-DD, default: today)
limit?: number    (number of days to return, default: 30)
```
**Response:**
```json
{
  "success": true,
  "data": {
    "summaries": [
      {
        "id": "uuid",
        "summary_date": "2025-11-14",
        "day_of_week": "Friday",
        "total_orders": 10,
        "total_items_sold": 78,
        "total_revenue": 5420.00,
        "total_discount": 180.00,
        "average_order_value": 542.00,
        "payment_breakdown": {
          "cash": 1200.00,
          "paymongo": 3220.00,
          "gcash": 1000.00
        },
        "order_type_breakdown": {
          "dine_in": 6,
          "takeout": 4
        }
      }
    ]
  }
}
```

---

### GROUP B: BEST-SELLING MENU ENDPOINTS

#### Endpoint 2.1: GET /api/sales/best-sellers/this-week
**Purpose:** Get best-selling items for current week  
**Query Params:**
```
rank_by?: string   (quantity|revenue) - default: quantity
limit?: number     (default: 10)
```
**Response:**
```json
{
  "success": true,
  "data": {
    "week": {
      "week_number": 46,
      "year": 2025,
      "start_date": "2025-11-10",
      "end_date": "2025-11-16",
      "days_elapsed": 5
    },
    "ranking_by": "quantity",
    "best_sellers": [
      {
        "rank": 1,
        "menu_item_id": "uuid",
        "menu_item_name": "Fried Chicken",
        "menu_item_price": 250.00,
        "total_quantity_sold": 87,
        "total_revenue": 21750.00,
        "total_orders": 23,
        "average_per_order": 3.78,
        "revenue_percentage": 22.5,
        "growth_vs_last_week": "+15%"
      },
      {
        "rank": 2,
        "menu_item_id": "uuid",
        "menu_item_name": "Grilled Fish",
        "menu_item_price": 320.00,
        "total_quantity_sold": 64,
        "total_revenue": 20480.00,
        "total_orders": 18,
        "average_per_order": 3.56,
        "revenue_percentage": 21.1,
        "growth_vs_last_week": "-5%"
      }
      // ... more items
    ],
    "summary": {
      "total_items_sold": 625,
      "total_revenue": 96800.50,
      "top_5_revenue_percentage": 68.5,
      "number_of_unique_items": 35
    }
  }
}
```

---

#### Endpoint 2.2: GET /api/sales/best-sellers/last-week
**Purpose:** Get best-selling items for last 7 days (previous week)  
**Same params and response as 2.1**

---

#### Endpoint 2.3: GET /api/sales/best-sellers/range
**Purpose:** Get best sellers for custom date range  
**Query Params:**
```
date_from: string      (YYYY-MM-DD) - REQUIRED
date_to: string        (YYYY-MM-DD) - REQUIRED
rank_by?: string       (quantity|revenue) - default: quantity
limit?: number         (default: 10)
```
**Response:** Same as 2.1 but with custom date range

---

#### Endpoint 2.4: GET /api/sales/best-sellers/by-hour/:date
**Purpose:** Get best sellers for each hour of a specific day  
**Params:**
```
date: string (YYYY-MM-DD) - REQUIRED in URL
limit?: number (default: 5 items per hour)
```
**Response:**
```json
{
  "success": true,
  "data": {
    "date": "2025-11-14",
    "hourly_breakdown": [
      {
        "hour": 10,
        "time_range": "10:00 - 10:59",
        "total_items": 34,
        "total_revenue": 850.00,
        "top_items": [
          {
            "rank": 1,
            "menu_item_name": "Breakfast Special",
            "quantity": 12,
            "revenue": 420.00
          },
          {
            "rank": 2,
            "menu_item_name": "Coffee",
            "quantity": 8,
            "revenue": 240.00
          }
        ]
      },
      {
        "hour": 11,
        "time_range": "11:00 - 11:59",
        "total_items": 56,
        "total_revenue": 1420.00,
        "top_items": [ /* ... */ ]
      }
    ]
  }
}
```

---

#### Endpoint 2.5: GET /api/sales/best-sellers/comparison
**Purpose:** Compare best sellers across different periods  
**Query Params:**
```
period1_from: string   (YYYY-MM-DD) - REQUIRED
period1_to: string     (YYYY-MM-DD) - REQUIRED
period2_from: string   (YYYY-MM-DD) - REQUIRED
period2_to: string     (YYYY-MM-DD) - REQUIRED
limit?: number         (default: 10)
```
**Response:**
```json
{
  "success": true,
  "data": {
    "period1": {
      "from": "2025-11-07",
      "to": "2025-11-13",
      "best_sellers": [ /* array */ ]
    },
    "period2": {
      "from": "2025-11-14",
      "to": "2025-11-20",
      "best_sellers": [ /* array */ ]
    },
    "comparison": [
      {
        "menu_item_name": "Fried Chicken",
        "period1_rank": 1,
        "period1_quantity": 87,
        "period2_rank": 2,
        "period2_quantity": 64,
        "change": -26,
        "change_percentage": "-29.9%"
      }
    ]
  }
}
```

---

#### Endpoint 2.6: GET /api/sales/best-sellers/trending
**Purpose:** Get trending items (gaining popularity this week vs last week)  
**Query Params:**
```
limit?: number (default: 10)
metric?: string (growth_percentage|absolute_increase) - default: growth_percentage
```
**Response:**
```json
{
  "success": true,
  "data": {
    "this_week": { "start": "2025-11-10", "end": "2025-11-16" },
    "last_week": { "start": "2025-11-03", "end": "2025-11-09" },
    "trending_up": [
      {
        "rank": 1,
        "menu_item_name": "New Spicy Burger",
        "last_week_quantity": 0,
        "this_week_quantity": 45,
        "growth": "+Infinity%",
        "status": "NEW_ITEM"
      },
      {
        "rank": 2,
        "menu_item_name": "Caesar Salad",
        "last_week_quantity": 32,
        "this_week_quantity": 54,
        "growth": "+68.75%",
        "absolute_increase": 22
      }
    ],
    "trending_down": [
      {
        "rank": 1,
        "menu_item_name": "Grilled Fish",
        "last_week_quantity": 64,
        "this_week_quantity": 44,
        "decline": "-31.25%",
        "absolute_decrease": 20
      }
    ]
  }
}
```

---

### GROUP C: ANALYTICS ENDPOINTS

#### Endpoint 3.1: GET /api/sales/revenue-analytics
**Purpose:** Revenue trends and patterns  
**Query Params:**
```
date_from: string (YYYY-MM-DD) - REQUIRED
date_to: string (YYYY-MM-DD) - REQUIRED
group_by?: string (date|hour|day_of_week|week)
```
**Response:**
```json
{
  "success": true,
  "data": {
    "period": { "from": "2025-11-07", "to": "2025-11-14" },
    "total_revenue": 42800.50,
    "average_daily_revenue": 5350.06,
    "highest_revenue_day": { "date": "2025-11-14", "revenue": 5420.00 },
    "lowest_revenue_day": { "date": "2025-11-10", "revenue": 4200.00 },
    "by_date": [
      { "date": "2025-11-07", "revenue": 4800.00, "orders": 9 },
      { "date": "2025-11-08", "revenue": 5100.00, "orders": 10 }
    ],
    "by_payment_method": {
      "cash": { "revenue": 18900.00, "percentage": 44.1 },
      "paymongo": { "revenue": 16200.00, "percentage": 37.8 },
      "gcash": { "revenue": 7700.50, "percentage": 18.0 }
    },
    "by_order_type": {
      "dine_in": { "revenue": 32100.00, "percentage": 74.9, "orders": 60 },
      "takeout": { "revenue": 10700.50, "percentage": 25.0, "orders": 25 }
    }
  }
}
```

---

#### Endpoint 3.2: GET /api/sales/payment-analytics
**Purpose:** Payment method analysis  
**Query Params:**
```
date_from: string (YYYY-MM-DD)
date_to: string (YYYY-MM-DD)
```
**Response:**
```json
{
  "success": true,
  "data": {
    "payment_methods": [
      {
        "method": "cash",
        "total_transactions": 45,
        "total_revenue": 18900.00,
        "percentage": 44.1,
        "average_transaction": 420.00,
        "success_rate": 100
      },
      {
        "method": "paymongo",
        "total_transactions": 35,
        "total_revenue": 16200.00,
        "percentage": 37.8,
        "average_transaction": 462.86,
        "success_rate": 98.5
      }
    ]
  }
}
```

---

## 💻 PART 5: SERVICE LAYER IMPLEMENTATION

### File: `src/services/salesService.ts` (New File)

```typescript
import { supabaseService } from './supabaseService';
import { logger } from '../utils/logger';
import { ApiResponse } from '../types';

export class SalesService {
  private supabase = supabaseService();

  // ===== SALES RECORD OPERATIONS =====

  async createSalesRecord(data: {
    order_id: string;
    order_item_id: string;
    menu_item_id: string;
    menu_item_name: string;
    quantity_sold: number;
    unit_price: number;
    total_price: number;
    payment_method?: string;
    payment_status?: string;
    created_by: string;
  }): Promise<ApiResponse<any>> {
    try {
      // Calculate time dimensions
      const now = new Date();
      const timeData = {
        sale_date: now.toISOString().split('T')[0],
        sale_time: now.toTimeString().split(' ')[0],
        hour_bucket: now.getHours(),
        day_of_week: now.getDay(),
        week_of_year: this.getWeekNumber(now),
        month: now.getMonth() + 1,
        year: now.getFullYear()
      };

      const insertData = {
        ...data,
        ...timeData
      };

      const { data: result, error } = await this.supabase.getClient()
        .from('sales_records')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        logger.error('Create sales record error:', error);
        return { success: false, error: 'Failed to create sales record' };
      }

      return { success: true, data: result };
    } catch (error) {
      logger.error('Sales record error:', error);
      return { success: false, error: 'Failed to create sales record' };
    }
  }

  async getSalesRecords(
    dateFrom?: string,
    dateTo?: string,
    menuItemId?: string,
    paymentMethod?: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<ApiResponse<any[]>> {
    try {
      let query = this.supabase.getClient()
        .from('sales_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (dateFrom) query = query.gte('sale_date', dateFrom);
      if (dateTo) query = query.lte('sale_date', dateTo);
      if (menuItemId) query = query.eq('menu_item_id', menuItemId);
      if (paymentMethod) query = query.eq('payment_method', paymentMethod);

      query = query.range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) {
        return { success: false, error: 'Failed to fetch sales records' };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      logger.error('Get sales records error:', error);
      return { success: false, error: 'Failed to fetch sales records' };
    }
  }

  async getSalesByDate(date: string, groupBy?: string): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await this.supabase.getClient()
        .from('sales_records')
        .select('*')
        .eq('sale_date', date)
        .order('sale_time', { ascending: true });

      if (error) {
        return { success: false, error: 'Failed to fetch sales' };
      }

      const records = data || [];

      // Calculate summary
      const summary = {
        date,
        total_records: records.length,
        total_revenue: records.reduce((sum, r) => sum + r.total_price, 0),
        total_items_sold: records.reduce((sum, r) => sum + r.quantity_sold, 0),
        records,
        summary: this.groupSalesByHourAndMethod(records, groupBy)
      };

      return { success: true, data: summary };
    } catch (error) {
      logger.error('Get sales by date error:', error);
      return { success: false, error: 'Failed to fetch sales' };
    }
  }

  async getBestSellersThisWeek(
    rankBy: string = 'quantity',
    limit: number = 10
  ): Promise<ApiResponse<any>> {
    try {
      const weekData = this.getCurrentWeekDates();

      const { data, error } = await this.supabase.getClient()
        .from('sales_records')
        .select('*')
        .gte('sale_date', weekData.startDate)
        .lte('sale_date', weekData.endDate);

      if (error) {
        return { success: false, error: 'Failed to fetch best sellers' };
      }

      const aggregated = this.aggregateBestSellers(data || [], rankBy, limit);

      return {
        success: true,
        data: {
          week: weekData,
          ranking_by: rankBy,
          best_sellers: aggregated,
          summary: this.calculateBestSellersSummary(aggregated, data || [])
        }
      };
    } catch (error) {
      logger.error('Get best sellers error:', error);
      return { success: false, error: 'Failed to fetch best sellers' };
    }
  }

  async getBestSellersLastWeek(
    rankBy: string = 'quantity',
    limit: number = 10
  ): Promise<ApiResponse<any>> {
    try {
      const weekData = this.getLastWeekDates();

      const { data, error } = await this.supabase.getClient()
        .from('sales_records')
        .select('*')
        .gte('sale_date', weekData.startDate)
        .lte('sale_date', weekData.endDate);

      if (error) {
        return { success: false, error: 'Failed to fetch best sellers' };
      }

      const aggregated = this.aggregateBestSellers(data || [], rankBy, limit);

      return {
        success: true,
        data: {
          week: weekData,
          ranking_by: rankBy,
          best_sellers: aggregated
        }
      };
    } catch (error) {
      logger.error('Get best sellers last week error:', error);
      return { success: false, error: 'Failed to fetch best sellers' };
    }
  }

  async getBestSellersByDateRange(
    dateFrom: string,
    dateTo: string,
    rankBy: string = 'quantity',
    limit: number = 10
  ): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await this.supabase.getClient()
        .from('sales_records')
        .select('*')
        .gte('sale_date', dateFrom)
        .lte('sale_date', dateTo);

      if (error) {
        return { success: false, error: 'Failed to fetch best sellers' };
      }

      const aggregated = this.aggregateBestSellers(data || [], rankBy, limit);
      const totalRevenue = (data || []).reduce((sum, r) => sum + r.total_price, 0);

      return {
        success: true,
        data: {
          period: { from: dateFrom, to: dateTo },
          ranking_by: rankBy,
          best_sellers: aggregated.map((item, index) => ({
            ...item,
            revenue_percentage: ((item.total_revenue / totalRevenue) * 100).toFixed(1)
          }))
        }
      };
    } catch (error) {
      logger.error('Get best sellers by range error:', error);
      return { success: false, error: 'Failed to fetch best sellers' };
    }
  }

  // ===== HELPER FUNCTIONS =====

  private aggregateBestSellers(records: any[], rankBy: string, limit: number) {
    const aggregated = new Map();

    records.forEach(record => {
      const key = record.menu_item_id;
      if (!aggregated.has(key)) {
        aggregated.set(key, {
          menu_item_id: record.menu_item_id,
          menu_item_name: record.menu_item_name,
          menu_item_price: record.unit_price,
          total_quantity_sold: 0,
          total_revenue: 0,
          total_orders: new Set()
        });
      }

      const item = aggregated.get(key);
      item.total_quantity_sold += record.quantity_sold;
      item.total_revenue += record.total_price;
      item.total_orders.add(record.order_id);
    });

    let sorted = Array.from(aggregated.values());

    if (rankBy === 'revenue') {
      sorted = sorted.sort((a, b) => b.total_revenue - a.total_revenue);
    } else {
      sorted = sorted.sort((a, b) => b.total_quantity_sold - a.total_quantity_sold);
    }

    return sorted.slice(0, limit).map((item, index) => ({
      ...item,
      rank: index + 1,
      total_orders: item.total_orders.size,
      average_per_order: (item.total_quantity_sold / item.total_orders.size).toFixed(2)
    }));
  }

  private getCurrentWeekDates() {
    const now = new Date();
    const first = now.getDate() - now.getDay() + 1;
    const startDate = new Date(now.setDate(first)).toISOString().split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];

    return {
      week_number: this.getWeekNumber(now),
      year: now.getFullYear(),
      start_date: startDate,
      end_date: endDate
    };
  }

  private getLastWeekDates() {
    const now = new Date();
    now.setDate(now.getDate() - 7);
    const first = now.getDate() - now.getDay() + 1;
    const startDate = new Date(now.setDate(first)).toISOString().split('T')[0];
    
    const endDate = new Date(now.setDate(now.getDate() + 6)).toISOString().split('T')[0];

    return {
      week_number: this.getWeekNumber(now),
      year: now.getFullYear(),
      start_date: startDate,
      end_date: endDate
    };
  }

  private getWeekNumber(date: Date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  private groupSalesByHourAndMethod(records: any[], groupBy?: string) {
    if (groupBy === 'hour') {
      const byHour = new Map();
      records.forEach(r => {
        const hour = parseInt(r.sale_time.split(':')[0]);
        if (!byHour.has(hour)) {
          byHour.set(hour, { count: 0, revenue: 0 });
        }
        const hourData = byHour.get(hour);
        hourData.count += 1;
        hourData.revenue += r.total_price;
      });
      return Object.fromEntries(byHour);
    }

    if (groupBy === 'payment_method') {
      const byMethod = new Map();
      records.forEach(r => {
        const method = r.payment_method || 'unknown';
        if (!byMethod.has(method)) {
          byMethod.set(method, { count: 0, revenue: 0 });
        }
        const methodData = byMethod.get(method);
        methodData.count += 1;
        methodData.revenue += r.total_price;
      });
      return Object.fromEntries(byMethod);
    }

    return {};
  }

  private calculateBestSellersSummary(bestSellers: any[], allRecords: any[]) {
    const totalItemsSold = allRecords.reduce((sum, r) => sum + r.quantity_sold, 0);
    const totalRevenue = allRecords.reduce((sum, r) => sum + r.total_price, 0);
    const top5Revenue = bestSellers.slice(0, 5).reduce((sum, item) => sum + item.total_revenue, 0);

    return {
      total_items_sold: totalItemsSold,
      total_revenue: totalRevenue,
      top_5_revenue_percentage: ((top5Revenue / totalRevenue) * 100).toFixed(1),
      number_of_unique_items: allRecords.length
    };
  }
}

export const salesService = (): SalesService => {
  return new SalesService();
};
```

---

## 🛣️ PART 6: ROUTE IMPLEMENTATION

### File: `src/routes/salesRoutes.ts` (New File)

```typescript
import { Router, Request, Response } from 'express';
import { salesService } from '../services/salesService';
import { cashierOrAdmin, adminOnly, kitchenOrAdmin } from '../middleware/authMiddleware';
import { logger } from '../utils/logger';

const router = Router();

// ===== SALES RECORDS =====

router.post('/record', cashierOrAdmin, async (req: Request, res: Response) => {
  try {
    const {
      order_id,
      order_item_id,
      menu_item_id,
      menu_item_name,
      quantity_sold,
      unit_price,
      total_price,
      payment_method,
      payment_status
    } = req.body;

    if (!order_id || !menu_item_id || !quantity_sold || !unit_price || !total_price) {
      return res.status(400).json({
        success: false,
        error: 'Required fields: order_id, menu_item_id, quantity_sold, unit_price, total_price'
      });
    }

    const result = await salesService().createSalesRecord({
      order_id,
      order_item_id,
      menu_item_id,
      menu_item_name,
      quantity_sold,
      unit_price,
      total_price,
      payment_method,
      payment_status,
      created_by: req.user.id
    });

    if (!result.success) {
      return res.status(500).json(result);
    }

    return res.status(201).json({
      success: true,
      message: 'Sales record created',
      data: result.data
    });

  } catch (error) {
    logger.error('Create sales record error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create sales record' });
  }
});

router.get('/records', cashierOrAdmin, async (req: Request, res: Response) => {
  try {
    const {
      date_from,
      date_to,
      menu_item_id,
      payment_method,
      limit = '100',
      offset = '0'
    } = req.query;

    const result = await salesService().getSalesRecords(
      date_from as string,
      date_to as string,
      menu_item_id as string,
      payment_method as string,
      parseInt(limit as string),
      parseInt(offset as string)
    );

    if (!result.success) {
      return res.status(500).json(result);
    }

    return res.json({
      success: true,
      data: result.data,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      }
    });

  } catch (error) {
    logger.error('Get sales records error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch sales records' });
  }
});

router.get('/by-date/:date', cashierOrAdmin, async (req: Request, res: Response) => {
  try {
    const { date } = req.params;
    const { group_by } = req.query;

    const result = await salesService().getSalesByDate(date, group_by as string);

    if (!result.success) {
      return res.status(500).json(result);
    }

    return res.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    logger.error('Get sales by date error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch sales' });
  }
});

// ===== BEST SELLERS =====

router.get('/best-sellers/this-week', async (req: Request, res: Response) => {
  try {
    const { rank_by = 'quantity', limit = '10' } = req.query;

    const result = await salesService().getBestSellersThisWeek(
      rank_by as string,
      parseInt(limit as string)
    );

    if (!result.success) {
      return res.status(500).json(result);
    }

    return res.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    logger.error('Get best sellers this week error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch best sellers' });
  }
});

router.get('/best-sellers/last-week', async (req: Request, res: Response) => {
  try {
    const { rank_by = 'quantity', limit = '10' } = req.query;

    const result = await salesService().getBestSellersLastWeek(
      rank_by as string,
      parseInt(limit as string)
    );

    if (!result.success) {
      return res.status(500).json(result);
    }

    return res.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    logger.error('Get best sellers last week error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch best sellers' });
  }
});

router.get('/best-sellers/range', async (req: Request, res: Response) => {
  try {
    const { date_from, date_to, rank_by = 'quantity', limit = '10' } = req.query;

    if (!date_from || !date_to) {
      return res.status(400).json({
        success: false,
        error: 'date_from and date_to query parameters are required'
      });
    }

    const result = await salesService().getBestSellersByDateRange(
      date_from as string,
      date_to as string,
      rank_by as string,
      parseInt(limit as string)
    );

    if (!result.success) {
      return res.status(500).json(result);
    }

    return res.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    logger.error('Get best sellers range error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch best sellers' });
  }
});

export default router;
```

---

## 🔌 PART 7: INTEGRATION STEPS

### Step 1: Add Route Registration
In your main `app.ts` or `server.ts`:

```typescript
import salesRoutes from './routes/salesRoutes';

app.use('/api/sales', salesRoutes);
```

### Step 2: Trigger Sales Record Creation
In `orderRoutes.ts`, when order completes:

```typescript
// After order status is set to 'completed':
const orderItems = await supabaseService().getOrderItems(orderId);

for (const item of orderItems) {
  await salesService().createSalesRecord({
    order_id: orderId,
    order_item_id: item.id,
    menu_item_id: item.menu_item_id,
    menu_item_name: item.menu_item_name,
    quantity_sold: item.quantity,
    unit_price: item.unit_price,
    total_price: item.total_price,
    payment_method: order.payment_method,
    payment_status: order.payment_status,
    created_by: req.user.id
  });
}
```

### Step 3: Add Database Migrations
Run these SQL scripts against your Supabase database

---

## 📈 PART 8: FRONTEND USAGE EXAMPLES

### Example: Get Best Sellers This Week
```bash
curl -X GET "http://localhost:3000/api/sales/best-sellers/this-week?rank_by=revenue&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Example: Get Sales for Specific Date
```bash
curl -X GET "http://localhost:3000/api/sales/by-date/2025-11-14?group_by=hour" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Example: Get Best Sellers for Custom Range
```bash
curl -X GET "http://localhost:3000/api/sales/best-sellers/range?date_from=2025-11-07&date_to=2025-11-14&rank_by=quantity&limit=15" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## ✅ IMPLEMENTATION CHECKLIST

- [ ] Create SQL migrations for 4 new tables
- [ ] Create `salesService.ts` with aggregation logic
- [ ] Create `salesRoutes.ts` with 8 endpoints
- [ ] Add route registration in main app
- [ ] Add trigger to create sales records on order completion
- [ ] Test all endpoints with sample data
- [ ] Add indexes to sales_records table for performance
- [ ] Consider caching for best-sellers (Redis if available)
- [ ] Add permissions/middleware to all endpoints
- [ ] Document endpoints in your API docs

---

## 🎯 PRIORITY RANKING

**Immediate (Phase 1):**
1. SQL migrations for sales_records table
2. Basic salesService methods
3. 3 main endpoints: POST /record, GET /this-week, GET /range

**Short Term (Phase 2):**
4. Daily summary table + refresh logic
5. Analytics endpoints
6. Trending calculations

**Future (Phase 3):**
7. Weekly best sellers table auto-calculation
8. Caching/performance optimization
9. Advanced reporting

