# 📊 Admin Sales API - Architecture & Integration

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Admin Dashboard                              │
│              (Frontend - React, Vue, etc.)                       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    HTTP GET Requests
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
    GET /best-sellers   GET /records       GET /analytics/revenue
         │                   │                   │
         └───────────────────┼───────────────────┘
                             │
                     adminOnly Middleware
                      (Auth Check: Admin?)
                             │
                             ▼
         ┌─────────────────────────────────────────┐
         │      AdminSalesRoutes                   │
         │  (src/routes/adminSalesRoutes.ts)      │
         ├─────────────────────────────────────────┤
         │ ✓ GET /best-sellers                    │
         │ ✓ GET /best-sellers/week               │
         │ ✓ GET /records                         │
         │ ✓ GET /records/range                   │
         │ ✓ GET /summary                         │
         │ ✓ GET /analytics/revenue               │
         └────────────────┬────────────────────────┘
                          │
            ┌─────────────┴─────────────┐
            │                           │
            ▼                           ▼
     ┌──────────────────┐      ┌──────────────────┐
     │  SalesService   │      │ Middleware Auth  │
     │  (8 methods)    │      │                  │
     └────────┬────────┘      └──────────────────┘
              │
              ▼
     ┌──────────────────────────────────────┐
     │    Supabase PostgreSQL Database      │
     ├──────────────────────────────────────┤
     │ • sales_records                      │
     │ • daily_sales_summary                │
     │ • weekly_best_sellers                │
     │ • hourly_sales_summary               │
     │ • orders (existing)                  │
     │ • order_items (existing)             │
     │ • menu_items (existing)              │
     └──────────────────────────────────────┘
```

---

## Data Flow: Creating a Sales Record

```
Order Completed
    │
    ▼
orderRoutes.ts
    │
    ├─ Set order.status = 'completed'
    │
    └─ Call SalesService.createSalesRecord()
         │
         ├─ Extract order details
         ├─ Calculate date/time dimensions
         │  (hour, day_of_week, week_number, etc.)
         │
         └─ INSERT into sales_records table
              │
              ▼
         Sales Record Created
         (Timestamped, categorized)
```

---

## Data Flow: Getting Best Sellers

```
Admin clicks "Best Sellers"
    │
    ▼
Frontend sends:
GET /api/admin/sales/best-sellers
    │
    ▼
adminSalesRoutes
    │
    └─ Verify user is admin
    │
    └─ Call SalesService.getBestSellersThisWeek()
         │
         └─ Query sales_records table
             │
             ├─ Filter by: week_number, year_number
             ├─ Filter by: payment_status = 'paid'
             │
             ├─ GROUP BY menu_item_id
             ├─ SUM(quantity, total_amount)
             │
             ├─ Sort by quantity DESC
             ├─ LIMIT 10
             │
             └─ Add rankings
                  │
                  ▼
             Return [
               { rank: 1, menu_item_name: "Fried Chicken", total_quantity: 45, ... },
               { rank: 2, menu_item_name: "Adobo", total_quantity: 38, ... },
               ...
             ]
```

---

## Integration Points in Your App

### 1. Main App File (`app.ts` or `index.ts`)

**Location:** Top-level Express app setup

```typescript
// ✓ ADD THIS
import adminSalesRoutes from './routes/adminSalesRoutes';

// ... other imports and setup ...

// ✓ ADD THIS ROUTE REGISTRATION
app.use('/api/admin/sales', adminSalesRoutes);

// ✓ Keep existing routes
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
```

### 2. Order Routes (`src/routes/orderRoutes.ts`)

**Location:** In the endpoint that marks order as 'completed'

```typescript
// ✓ ADD THIS IMPORT
import { SalesService } from '../services/salesService';

// ... in your route handler, after setting status to 'completed' ...

const newStatus = 'completed';

// Existing code to update order status
const { data: updatedOrder, error } = await supabase
  .from('orders')
  .update({ status: newStatus, updated_by: userId })
  .eq('id', orderId)
  .select()
  .single();

// ✓ ADD THIS BLOCK
if (!error && newStatus === 'completed') {
  // Get full order details with items
  const { data: fullOrder } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', orderId)
    .single();

  // Create sales record for each item
  if (fullOrder && fullOrder.order_items) {
    for (const item of fullOrder.order_items) {
      try {
        await SalesService.createSalesRecord(
          fullOrder.id,
          fullOrder.order_number,
          item.menu_item_id,
          item.menu_item_name || 'Unknown',
          item.quantity,
          item.unit_price,
          item.total_price,
          fullOrder.discount_amount || 0,
          fullOrder.customer_name,
          fullOrder.order_type,
          fullOrder.payment_method,
          fullOrder.payment_status,
          userId // recorded_by
        );
      } catch (salesError) {
        console.error('Error creating sales record:', salesError);
        // Don't let this error fail the order completion
      }
    }
  }
}
```

### 3. Middleware (`src/middleware/authMiddleware.ts`)

**Verify this exists:**

```typescript
import { Request, Response, NextFunction } from 'express';

export const adminOnly = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user; // Attached by your JWT middleware
  
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

---

## File Structure After Implementation

```
project-root/
├── src/
│   ├── middleware/
│   │   └── authMiddleware.ts          (verify exists)
│   ├── services/
│   │   ├── supabaseService.ts         (existing)
│   │   ├── paymongoService.ts         (existing)
│   │   └── salesService.ts            ✓ NEW
│   ├── routes/
│   │   ├── orderRoutes.ts             (UPDATE to call SalesService)
│   │   ├── paymentRoutes.ts           (existing)
│   │   ├── offlinePaymentRoutes.ts    (existing)
│   │   └── adminSalesRoutes.ts        ✓ NEW
│   ├── app.ts                         (UPDATE to register route)
│   └── index.ts                       (entry point)
│
├── ADMIN_SALES_API_SQL.sql            ✓ NEW - Run in Supabase
├── ADMIN_SALES_SQL_QUERIES.sql        ✓ NEW - Reference queries
├── ADMIN_SALES_API_README.md          ✓ NEW - Quick reference
├── ADMIN_SALES_API_IMPLEMENTATION_GUIDE.md ✓ NEW - Full guide
└── package.json                       (existing)
```

---

## Request/Response Examples

### Example 1: Best Sellers

**Request:**
```http
GET /api/admin/sales/best-sellers HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "rank": 1,
      "menu_item_id": "550e8400-e29b-41d4-a716-446655440000",
      "menu_item_name": "Fried Chicken",
      "total_quantity": 45,
      "total_revenue": "2250.00",
      "average_daily_sales": "321.43"
    },
    {
      "rank": 2,
      "menu_item_id": "550e8400-e29b-41d4-a716-446655440001",
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

### Example 2: Sales Records

**Request:**
```http
GET /api/admin/sales/records?page=1&limit=5&paymentStatus=paid HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440010",
      "order_id": "550e8400-e29b-41d4-a716-446655440000",
      "order_number": "ORD-00123",
      "menu_item_id": "550e8400-e29b-41d4-a716-446655440000",
      "menu_item_name": "Fried Chicken",
      "quantity": 2,
      "unit_price": "250.00",
      "total_amount": "500.00",
      "discount_amount": "0.00",
      "net_amount": "500.00",
      "customer_name": "John Doe",
      "order_type": "dine_in",
      "payment_method": "cash",
      "payment_status": "paid",
      "sale_date": "2025-01-15",
      "sale_time": "14:30:00",
      "created_at": "2025-01-15T14:30:45.123456+00:00"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 5,
    "total": 150,
    "totalPages": 30
  }
}
```

---

## Error Handling

### Missing Authorization Header
```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Only administrators can access this endpoint"
}
```

### Missing Query Parameters
```json
{
  "success": false,
  "error": "Missing required parameters",
  "message": "startDate and endDate are required"
}
```

### Database Error
```json
{
  "success": false,
  "error": "Failed to fetch best sellers",
  "message": "Failed to connect to database"
}
```

---

## Environment Requirements

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_KEY=your_service_key_here (if needed)
```

---

## Testing Checklist

- [ ] SQL migration runs without errors
- [ ] 4 new tables appear in Supabase
- [ ] Routes are registered in app.ts
- [ ] Service file is in correct location
- [ ] Order completes and sales record is created
- [ ] Admin can access `/api/admin/sales/best-sellers`
- [ ] Non-admin gets 403 Unauthorized
- [ ] Best sellers query returns correct data
- [ ] Sales records pagination works
- [ ] Date range filtering works
- [ ] Revenue analytics calculates correctly

---

## Performance Tips

1. **Use date range filters** - Always filter by date when possible
2. **Leverage indexes** - They're created automatically in migration
3. **Cache results** - Best sellers don't change hourly
4. **Limit page size** - Default 50, max 500 records
5. **Composite queries** - Combine filters to reduce data

---

## Next Steps

1. ✅ Run SQL migration in Supabase
2. ✅ Copy service and route files
3. ✅ Register routes in app.ts
4. ✅ Add integration code to orderRoutes.ts
5. ✅ Test endpoints
6. ✅ Build admin dashboard UI

