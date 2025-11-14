import express, { Request, Response } from 'express';
import { authMiddleware, adminOnly } from '../middleware/authMiddleware';
import { SalesService } from '../services/salesService';

const router = express.Router();

// Apply authentication for all admin sales routes, then use role-based middleware per-route
router.use(authMiddleware);

// Helper: ISO week number (used when week/year query params are omitted)
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * ============================================================================
 * ADMIN-ONLY SALES ANALYTICS API ROUTES
 * ============================================================================
 * All routes require adminOnly middleware for authorization
 * Handles best sellers, sales records, and revenue analytics
 */

/**
 * GET /api/admin/sales/best-sellers
 * Get best-selling menu items for the current week
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "rank": 1,
 *       "menu_item_id": "uuid",
 *       "menu_item_name": "Fried Chicken",
 *       "total_quantity": 45,
 *       "total_revenue": "2250.00",
 *       "average_daily_sales": "321.43"
 *     },
 *     ...
 *   ],
 *   "week": 45,
 *   "year": 2025
 * }
 */
router.get('/best-sellers', adminOnly, async (req: Request, res: Response) => {
  try {
    const result = await SalesService.getBestSellersThisWeek();
    return res.json(result);
  } catch (error) {
    console.error('Error fetching best sellers:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch best sellers',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/admin/sales/best-sellers?week=45&year=2025
 * Get best-selling menu items for a specific week
 * 
 * Query Parameters:
 * - week: number (ISO week number, 1-53)
 * - year: number (e.g., 2025)
 * 
 * Response: Same as above
 */
router.get('/best-sellers/week', adminOnly, async (req: Request, res: Response) => {
  try {
    const { week, year } = req.query;

    // If week/year are not provided, fallback to current week/year
    if (!week && !year) {
      const result = await SalesService.getBestSellersThisWeek();
      return res.json(result);
    }

    // Allow partial params: default missing one to current week/year
    const now = new Date();
    const currentWeek = getWeekNumber(now);
    const currentYear = now.getFullYear();

    const weekNumber = week ? parseInt(week as string) : currentWeek;
    const yearNumber = year ? parseInt(year as string) : currentYear;

    const result = await SalesService.getBestSellersByWeek(weekNumber, yearNumber);
    return res.json(result);
  } catch (error) {
    console.error('Error fetching best sellers by week:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch best sellers',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/admin/sales/records
 * Get all sales records with pagination and filtering
 * 
 * Query Parameters:
 * - page: number (default: 1)
 * - limit: number (default: 50, max: 500)
 * - startDate: string (YYYY-MM-DD)
 * - endDate: string (YYYY-MM-DD)
 * - paymentStatus: string (paid, unpaid, refunded)
 * - paymentMethod: string (cash, gcash, card, paymongo)
 * - menuItemId: string (uuid)
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "id": "uuid",
 *       "order_id": "uuid",
 *       "order_number": "ORD-001",
 *       "menu_item_id": "uuid",
 *       "menu_item_name": "Fried Chicken",
 *       "quantity": 2,
 *       "unit_price": "250.00",
 *       "total_amount": "500.00",
 *       "discount_amount": "0",
 *       "net_amount": "500.00",
 *       "payment_status": "paid",
 *       "payment_method": "cash",
 *       "sale_date": "2025-01-15",
 *       "sale_time": "14:30:00",
 *       "created_at": "2025-01-15T14:30:00+00:00"
 *     },
 *     ...
 *   ],
 *   "pagination": {
 *     "page": 1,
 *     "limit": 50,
 *     "total": 1250,
 *     "totalPages": 25
 *   }
 * }
 */
router.get('/records', adminOnly, async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 50,
      startDate,
      endDate,
      paymentStatus,
      paymentMethod,
      menuItemId,
    } = req.query;

    // Validate limit
    const parsedLimit = Math.min(parseInt(limit as string) || 50, 500);

    const result = await SalesService.getSalesRecords(
      parseInt(page as string) || 1,
      parsedLimit,
      {
        startDate: startDate as string,
        endDate: endDate as string,
        paymentStatus: paymentStatus as string,
        paymentMethod: paymentMethod as string,
        menuItemId: menuItemId as string,
      }
    );

    return res.json(result);
  } catch (error) {
    console.error('Error fetching sales records:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch sales records',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/admin/sales/records/range?startDate=2025-01-01&endDate=2025-01-31
 * Get sales records for a specific date range
 * 
 * Query Parameters:
 * - startDate: string (YYYY-MM-DD, required)
 * - endDate: string (YYYY-MM-DD, required)
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": [...],
 *   "startDate": "2025-01-01",
 *   "endDate": "2025-01-31"
 * }
 */
router.get('/records/range', adminOnly, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters',
        message: 'startDate and endDate are required',
      });
    }

    const result = await SalesService.getSalesRecordsByDateRange(
      startDate as string,
      endDate as string
    );

    return res.json(result);
  } catch (error) {
    console.error('Error fetching sales records by date range:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch sales records',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/admin/sales/summary
 * Get daily sales summary
 * 
 * Query Parameters:
 * - date: string (YYYY-MM-DD, optional, defaults to today)
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "sale_date": "2025-01-15",
 *     "total_orders": 25,
 *     "total_items_sold": 87,
 *     "total_revenue": "5250.00",
 *     "total_discount": "250.00",
 *     "net_revenue": "5000.00",
 *     "cash_sales": "2500.00",
 *     "gcash_sales": "1500.00",
 *     "card_sales": "1000.00",
 *     "paymongo_sales": "250.00",
 *     "average_order_value": "210.00",
 *     "top_selling_item_id": "uuid",
 *     "top_selling_item_name": "Fried Chicken",
 *     "top_selling_item_qty": 35
 *   },
 *   "date": "2025-01-15"
 * }
 */
router.get('/summary', adminOnly, async (req: Request, res: Response) => {
  try {
    const { date } = req.query;

    const result = await SalesService.getDailySalesSummary(date as string);

    return res.json(result);
  } catch (error) {
    console.error('Error fetching daily sales summary:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch sales summary',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/admin/sales/analytics/revenue?startDate=2025-01-01&endDate=2025-01-31
 * Get revenue analytics for a date range
 * 
 * Query Parameters:
 * - startDate: string (YYYY-MM-DD, required)
 * - endDate: string (YYYY-MM-DD, required)
 * 
 * Response:
 * {
 *   "success": true,
 *   "summary": {
 *     "startDate": "2025-01-01",
 *     "endDate": "2025-01-31",
 *     "totalRevenue": "25000.00",
 *     "totalDiscount": "1250.00",
 *     "netRevenue": "23750.00"
 *   },
 *   "byDate": {
 *     "2025-01-01": {
 *       "revenue": "1000.00",
 *       "discount": "50.00",
 *       "net": "950.00"
 *     },
 *     ...
 *   },
 *   "byPaymentMethod": {
 *     "cash": "12500.00",
 *     "gcash": "7500.00",
 *     "card": "5000.00"
 *   }
 * }
 */
router.get('/analytics/revenue', adminOnly, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters',
        message: 'startDate and endDate are required',
      });
    }

    const result = await SalesService.getRevenueAnalytics(
      startDate as string,
      endDate as string
    );

    return res.json(result);
  } catch (error) {
    console.error('Error fetching revenue analytics:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch revenue analytics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/admin/sales/daily-summary?date=2025-01-15
 * Calculate and get daily sales summary
 * 
 * Query Parameters:
 * - date: string (YYYY-MM-DD, optional, defaults to today)
 * 
 * Response: Same as /summary endpoint
 */
router.get('/daily-summary', adminOnly, async (req: Request, res: Response) => {
  try {
    const { date } = req.query;

    const result = await SalesService.calculateDailySummary(date as string);

    return res.json(result);
  } catch (error) {
    console.error('Error calculating daily summary:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to calculate daily summary',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Catch-all for any undefined sales admin routes under this router
// Returns a consistent JSON structure required by manual testing
router.all('*', (req: Request, res: Response) => {
  return res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl || req.path,
  });
});

export default router;
