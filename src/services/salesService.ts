import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (supabase) return supabase;

  const url = process.env['SUPABASE_URL'];
  const key = process.env['SUPABASE_ANON_KEY'];

  if (!url || !key) {
    // Do not throw during module load; throw when a method actually needs the client
    throw new Error('Supabase client not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY in environment.');
  }

  supabase = createClient(url, key);
  return supabase;
}

/**
 * Sales Service - Admin Analytics
 * Handles best sellers, sales records, and revenue analytics
 */
export class SalesService {
  /**
   * Create a sales record when an order is completed
   * Called from orderRoutes after order status is set to 'completed'
   */
  static async createSalesRecord(
    orderId: string,
    orderNumber: string,
    menuItemId: string,
    menuItemName: string,
    quantity: number,
    unitPrice: number,
    totalAmount: number,
    discountAmount: number,
    customerName: string | null,
    orderType: string,
    paymentMethod: string,
    paymentStatus: string,
    recordedBy: string
  ) {
    try {
      const db = getSupabaseClient();
      const saleDate = new Date();
      const saleTime = saleDate.toLocaleTimeString('en-US', { hour12: false });

      const { data, error } = await db
        .from('sales_records')
        .insert({
          order_id: orderId,
          order_number: orderNumber,
          menu_item_id: menuItemId,
          menu_item_name: menuItemName,
          quantity,
          unit_price: unitPrice,
          total_amount: totalAmount,
          discount_amount: discountAmount,
          net_amount: totalAmount - discountAmount,
          customer_name: customerName,
          order_type: orderType,
          payment_method: paymentMethod,
          payment_status: paymentStatus,
          sale_date: saleDate.toISOString().split('T')[0],
          sale_time: saleTime,
          hour_of_day: saleDate.getHours(),
          day_of_week: saleDate.getDay(),
          week_number: getWeekNumber(saleDate),
          month_number: saleDate.getMonth() + 1,
          year_number: saleDate.getFullYear(),
          recorded_by: recordedBy,
        })
        .select();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error creating sales record:', error);
      throw error;
    }
  }

  /**
   * Get best sellers for the current week
   * Returns top 10 best-selling menu items this week with rank
   */
  static async getBestSellersThisWeek() {
    try {
      const db = getSupabaseClient();
      const now = new Date();
      const weekNumber = getWeekNumber(now);
      const yearNumber = now.getFullYear();

      const { data, error } = await db
        .from('sales_records')
        .select(
          `
          menu_item_id,
          menu_item_name,
          quantity,
          total_amount
        `
        )
        .eq('week_number', weekNumber)
        .eq('year_number', yearNumber)
        .eq('payment_status', 'paid');

      if (error) throw error;

      // Aggregate data
      const aggregated = new Map<string, any>();
      data.forEach((record: any) => {
        const key = record.menu_item_id;
        const qty = Number(record.quantity) || 0;
        const amt = Number(record.total_amount) || 0;
        if (!aggregated.has(key)) {
          aggregated.set(key, {
            menu_item_id: record.menu_item_id,
            menu_item_name: record.menu_item_name,
            total_quantity: 0,
            total_revenue: 0,
          });
        }
        const item = aggregated.get(key);
        item.total_quantity += qty;
        item.total_revenue += amt;
      });

      // Convert to array, sort by quantity, and add rank
      const bestSellers = Array.from(aggregated.values())
        .sort((a: any, b: any) => b.total_quantity - a.total_quantity)
        .slice(0, 10)
        .map((item: any, index: number) => ({
          rank: index + 1,
          menu_item_id: item.menu_item_id,
          menu_item_name: item.menu_item_name,
          total_quantity: item.total_quantity,
          total_revenue: item.total_revenue.toFixed(2),
          average_daily_sales: (item.total_quantity / 7).toFixed(2),
        }));

      return { success: true, data: bestSellers, week: weekNumber, year: yearNumber };
    } catch (error) {
      console.error('Error getting best sellers this week:', error);
      throw error;
    }
  }

  /**
   * Get best sellers for a specific week
   */
  static async getBestSellersByWeek(weekNumber: number, yearNumber: number) {
    try {
      const db = getSupabaseClient();
      const { data, error } = await db
        .from('sales_records')
        .select(
          `
          menu_item_id,
          menu_item_name,
          quantity,
          total_amount
        `
        )
        .eq('week_number', weekNumber)
        .eq('year_number', yearNumber)
        .eq('payment_status', 'paid');

      if (error) throw error;

      // Aggregate data
      const aggregated = new Map<string, any>();
      data.forEach((record: any) => {
        const key = record.menu_item_id;
        const qty = Number(record.quantity) || 0;
        const amt = Number(record.total_amount) || 0;
        if (!aggregated.has(key)) {
          aggregated.set(key, {
            menu_item_id: record.menu_item_id,
            menu_item_name: record.menu_item_name,
            total_quantity: 0,
            total_revenue: 0,
          });
        }
        const item = aggregated.get(key);
        item.total_quantity += qty;
        item.total_revenue += amt;
      });

      // Convert to array, sort by quantity, and add rank
      const bestSellers = Array.from(aggregated.values())
        .sort((a: any, b: any) => b.total_quantity - a.total_quantity)
        .map((item: any, index: number) => ({
          rank: index + 1,
          menu_item_id: item.menu_item_id,
          menu_item_name: item.menu_item_name,
          total_quantity: item.total_quantity,
          total_revenue: item.total_revenue.toFixed(2),
          average_daily_sales: (item.total_quantity / 7).toFixed(2),
        }));

      return { success: true, data: bestSellers, week: weekNumber, year: yearNumber };
    } catch (error) {
      console.error('Error getting best sellers by week:', error);
      throw error;
    }
  }

  /**
   * Get all sales records with pagination and filtering
   */
  static async getSalesRecords(
    page: number = 1,
    limit: number = 50,
    filters?: {
      startDate?: string;
      endDate?: string;
      paymentStatus?: string;
      paymentMethod?: string;
      menuItemId?: string;
    }
  ) {
    try {
      const db = getSupabaseClient();
      let query = db
        .from('sales_records')
        .select('*', { count: 'exact' });

      if (filters?.startDate) {
        query = query.gte('sale_date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('sale_date', filters.endDate);
      }
      if (filters?.paymentStatus) {
        query = query.eq('payment_status', filters.paymentStatus);
      }
      if (filters?.paymentMethod) {
        query = query.eq('payment_method', filters.paymentMethod);
      }
      if (filters?.menuItemId) {
        query = query.eq('menu_item_id', filters.menuItemId);
      }

      const offset = (page - 1) * limit;
      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      // Format monetary fields for each record
      const formatted = (data || []).map((r: any) => ({
        ...r,
        unit_price: (Number(r.unit_price) || 0).toFixed(2),
        total_amount: (Number(r.total_amount) || 0).toFixed(2),
        discount_amount: (Number(r.discount_amount) || 0).toFixed(2),
        net_amount: (Number(r.net_amount) || 0).toFixed(2),
      }));

      return {
        success: true,
        data: formatted,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil((count || 0) / limit),
        },
      };
    } catch (error) {
      console.error('Error getting sales records:', error);
      throw error;
    }
  }

  /**
   * Get sales records for a date range
   */
  static async getSalesRecordsByDateRange(startDate: string, endDate: string) {
    try {
      const db = getSupabaseClient();
      const { data, error } = await db
        .from('sales_records')
        .select('*')
        .gte('sale_date', startDate)
        .lte('sale_date', endDate)
        .eq('payment_status', 'paid')
        .order('sale_date', { ascending: false });

      if (error) throw error;

      const formatted = (data || []).map((r: any) => ({
        ...r,
        unit_price: (Number(r.unit_price) || 0).toFixed(2),
        total_amount: (Number(r.total_amount) || 0).toFixed(2),
        discount_amount: (Number(r.discount_amount) || 0).toFixed(2),
        net_amount: (Number(r.net_amount) || 0).toFixed(2),
      }));

      return { success: true, data: formatted, startDate, endDate };
    } catch (error) {
      console.error('Error getting sales records by date range:', error);
      throw error;
    }
  }

  /**
   * Get daily sales summary
   */
  static async getDailySalesSummary(date?: string) {
    try {
      const db = getSupabaseClient();
      const targetDate = date || new Date().toISOString().split('T')[0];

      const { data, error } = await db
        .from('daily_sales_summary')
        .select('*')
        .eq('sale_date', targetDate)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      const result = data || null;
      if (result) {
        // Format numeric fields if present
        if (result.total_revenue !== undefined) result.total_revenue = Number(result.total_revenue).toFixed(2);
        if (result.total_discount !== undefined) result.total_discount = Number(result.total_discount).toFixed(2);
        if (result.net_revenue !== undefined) result.net_revenue = Number(result.net_revenue).toFixed(2);
        if (result.average_order_value !== undefined) result.average_order_value = Number(result.average_order_value).toFixed(2);
      }

      return { success: true, data: result, date: targetDate };
    } catch (error) {
      console.error('Error getting daily sales summary:', error);
      throw error;
    }
  }

  /**
   * Calculate daily sales summary from raw records
   * Run this to populate daily_sales_summary table
   */
  static async calculateDailySummary(date?: string) {
    try {
      const db = getSupabaseClient();
      const targetDate = date || new Date().toISOString().split('T')[0];

      const { data, error } = await db
        .from('sales_records')
        .select('*')
        .eq('sale_date', targetDate)
        .eq('payment_status', 'paid');

      if (error) throw error;

      if (!data || data.length === 0) {
        return { success: true, data: null, message: 'No sales records for this date' };
      }

      // Aggregate data
      const aggregated = new Map();
      let totalOrders = new Set();
      let totalItems = 0;
      let totalRevenue = 0;
      let totalDiscount = 0;
      let paymentMethods: any = {};

      data.forEach((record: any) => {
        totalOrders.add(record.order_id);
        totalItems += record.quantity;
        totalRevenue += record.total_amount;
        totalDiscount += record.discount_amount;

        // Payment method breakdown
        if (!paymentMethods[record.payment_method]) {
          paymentMethods[record.payment_method] = 0;
        }
        paymentMethods[record.payment_method] += record.total_amount;

        // Track top item
        if (!aggregated.has(record.menu_item_id)) {
          aggregated.set(record.menu_item_id, {
            menu_item_id: record.menu_item_id,
            menu_item_name: record.menu_item_name,
            quantity: 0,
          });
        }
        aggregated.get(record.menu_item_id).quantity += record.quantity;
      });

      const topItem = Array.from(aggregated.values()).sort(
        (a: any, b: any) => b.quantity - a.quantity
      )[0];

      const netRevenue = totalRevenue - totalDiscount;
      const averageOrderValue = totalRevenue / totalOrders.size;

      const summary = {
        sale_date: targetDate,
        total_orders: totalOrders.size,
        total_items_sold: totalItems,
        total_revenue: totalRevenue.toFixed(2),
        total_discount: totalDiscount.toFixed(2),
        net_revenue: netRevenue.toFixed(2),
        cash_sales: (paymentMethods['cash'] || 0).toFixed(2),
        gcash_sales: (paymentMethods['gcash'] || 0).toFixed(2),
        card_sales: (paymentMethods['card'] || 0).toFixed(2),
        paymongo_sales: (paymentMethods['paymongo'] || 0).toFixed(2),
        average_order_value: averageOrderValue ? averageOrderValue.toFixed(2) : '0.00',
        top_selling_item_id: topItem?.menu_item_id || null,
        top_selling_item_name: topItem?.menu_item_name || null,
        top_selling_item_qty: topItem?.quantity || 0,
      };

      return { success: true, data: summary };
    } catch (error) {
      console.error('Error calculating daily summary:', error);
      throw error;
    }
  }

  /**
   * Get revenue analytics for date range
   */
  static async getRevenueAnalytics(startDate: string, endDate: string) {
    try {
      const db = getSupabaseClient();
      const { data, error } = await db
        .from('sales_records')
        .select('sale_date, payment_method, payment_status, total_amount, discount_amount')
        .gte('sale_date', startDate)
        .lte('sale_date', endDate);

      if (error) throw error;

      // Aggregate by date and payment method
      const byDate: any = {};
      const byMethod: any = {};
      let totalRevenue = 0;
      let totalDiscount = 0;

      data.forEach((record: any) => {
        if (record.payment_status === 'paid') {
          totalRevenue += record.total_amount;
          totalDiscount += record.discount_amount;

          // By date
          if (!byDate[record.sale_date]) {
            byDate[record.sale_date] = { revenue: 0, discount: 0, net: 0 };
          }
          byDate[record.sale_date].revenue += record.total_amount;
          byDate[record.sale_date].discount += record.discount_amount;
          byDate[record.sale_date].net = byDate[record.sale_date].revenue - byDate[record.sale_date].discount;

          // By method
          if (!byMethod[record.payment_method]) {
            byMethod[record.payment_method] = 0;
          }
          byMethod[record.payment_method] += record.total_amount;
        }
      });

      return {
        success: true,
        summary: {
          startDate,
          endDate,
          totalRevenue: totalRevenue.toFixed(2),
          totalDiscount: totalDiscount.toFixed(2),
          netRevenue: (totalRevenue - totalDiscount).toFixed(2),
        },
        byDate: Object.keys(byDate).reduce((acc: any, k) => {
          acc[k] = {
            revenue: byDate[k].revenue.toFixed(2),
            discount: byDate[k].discount.toFixed(2),
            net: byDate[k].net.toFixed(2),
          };
          return acc;
        }, {}),
        byPaymentMethod: Object.keys(byMethod).reduce((acc: any, k) => {
          acc[k] = Number(byMethod[k]).toFixed(2);
          return acc;
        }, {}),
      };
    } catch (error) {
      console.error('Error getting revenue analytics:', error);
      throw error;
    }
  }
}

/**
 * Helper function to get ISO week number
 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
