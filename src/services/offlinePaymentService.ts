import { DatabaseService } from './databaseService';
import { offlineService } from './offlineService';
import { logger } from '../utils/logger';
import { ApiResponse } from '../types';

export class OfflinePaymentService {
  private dbService: DatabaseService;

  constructor() {
    this.dbService = DatabaseService.getInstance();
  }

  // Process offline payment (cash, gcash, card)
  async processOfflinePayment(
    orderId: string,
    paymentMethod: string,
    amount: number,
    notes?: string,
    createdBy?: string
  ): Promise<ApiResponse<any>> {
    try {
      // Validate payment method
      const validOfflineMethods = ['cash', 'gcash', 'card'];
      if (!validOfflineMethods.includes(paymentMethod)) {
        return {
          success: false,
          error: `Invalid offline payment method. Must be one of: ${validOfflineMethods.join(', ')}`
        };
      }

      // Check if payment method is available offline
      const paymentMethodConfig = await this.dbService.getLocalPaymentMethod(paymentMethod);
      if (!paymentMethodConfig) {
        return {
          success: false,
          error: `Payment method ${paymentMethod} not configured for offline use`
        };
      }

      if (paymentMethodConfig.is_online === 1) {
        return {
          success: false,
          error: `Payment method ${paymentMethod} requires online connection`
        };
      }

      // Generate payment ID and receipt number
      const paymentId = this.generateUUID();
      const receiptNumber = this.generateReceiptNumber();

      // Create payment record
      const now = new Date().toISOString();
      const paymentData = {
        id: paymentId,
        order_id: orderId,
        payment_method: paymentMethod,
        amount: amount,
        currency: 'PHP',
        payment_status: 'paid',
        transaction_id: `OFFLINE_${paymentId}`,
        receipt_number: receiptNumber,
        notes: notes || null,
        metadata: {
          processed_offline: true,
          processed_at: now,
          network_status: offlineService.getIsOnline() ? 'online' : 'offline'
        },
        created_by: createdBy || 'system',
        created_at: now,
        updated_at: now
      };

      // Store payment locally
      await this.dbService.createLocalPayment(paymentData);

      // Update order payment status locally
      await this.updateOrderPaymentStatus(orderId, 'paid', paymentMethod);

      // Add to sync queue for later synchronization
      await this.addPaymentToSyncQueue(paymentData);

      logger.info(`Offline payment processed: ${paymentMethod} for order ${orderId}, amount: ${amount}`);

      return {
        success: true,
        data: {
          paymentId,
          receiptNumber,
          paymentMethod,
          amount,
          status: 'paid',
          processedOffline: true
        }
      };

    } catch (error) {
      logger.error('Offline payment processing failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get available offline payment methods
  async getAvailableOfflinePaymentMethods(): Promise<ApiResponse<any[]>> {
    try {
      const paymentMethods = await this.dbService.getLocalPaymentMethods();
      const offlineMethods = paymentMethods.filter(method => 
        method.is_enabled === 1 && 
        method.is_online === 0 && 
        method.is_active === 1
      );

      return {
        success: true,
        data: offlineMethods.map(method => ({
          method_key: method.method_key,
          method_name: method.method_name,
          method_description: method.method_description,
          icon_name: method.icon_name,
          color_code: method.color_code,
          display_order: method.display_order
        }))
      };
    } catch (error) {
      logger.error('Failed to get offline payment methods:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get payment history for an order
  async getOrderPaymentHistory(orderId: string): Promise<ApiResponse<any[]>> {
    try {
      const payments = await this.dbService.getLocalPayments(orderId);
      return {
        success: true,
        data: payments
      };
    } catch (error) {
      logger.error('Failed to get payment history:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Generate receipt for offline payment
  async generateOfflineReceipt(paymentId: string): Promise<ApiResponse<any>> {
    try {
      const payments = await this.dbService.getLocalPayments();
      const payment = payments.find(p => p.id === paymentId);

      if (!payment) {
        return {
          success: false,
          error: 'Payment not found'
        };
      }

      const receipt = {
        receiptNumber: payment.receipt_number,
        paymentId: payment.id,
        orderId: payment.order_id,
        paymentMethod: payment.payment_method,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.payment_status,
        transactionId: payment.transaction_id,
        processedAt: payment.created_at,
        notes: payment.notes,
        processedOffline: payment.metadata ? JSON.parse(payment.metadata).processed_offline : false
      };

      return {
        success: true,
        data: receipt
      };
    } catch (error) {
      logger.error('Failed to generate receipt:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Sync payment methods from cloud to local
  async syncPaymentMethodsFromCloud(): Promise<void> {
    try {
      if (!offlineService.getIsOnline()) {
        logger.warn('Cannot sync payment methods: offline');
        return;
      }

      // This would typically fetch from Supabase
      // For now, we'll create default offline payment methods
      const defaultMethods = [
        {
          id: 'cash-method',
          method_key: 'cash',
          method_name: 'Cash',
          method_description: 'Cash payment at the counter',
          is_enabled: true,
          is_online: false,
          requires_setup: false,
          display_order: 1,
          icon_name: 'cash',
          color_code: '#28a745',
          config_data: {},
          is_active: true,
          created_at: new Date().toISOString()
        },
        {
          id: 'gcash-method',
          method_key: 'gcash',
          method_name: 'GCash',
          method_description: 'GCash mobile payment',
          is_enabled: true,
          is_online: false,
          requires_setup: false,
          display_order: 2,
          icon_name: 'gcash',
          color_code: '#007bff',
          config_data: {},
          is_active: true,
          created_at: new Date().toISOString()
        },
        {
          id: 'card-method',
          method_key: 'card',
          method_name: 'Credit/Debit Card',
          method_description: 'Credit or debit card payment',
          is_enabled: true,
          is_online: false,
          requires_setup: false,
          display_order: 3,
          icon_name: 'credit-card',
          color_code: '#6c757d',
          config_data: {},
          is_active: true,
          created_at: new Date().toISOString()
        }
      ];

      for (const method of defaultMethods) {
        await this.dbService.syncPaymentMethodToLocal(method);
      }

      logger.info('Payment methods synced to local database');
    } catch (error) {
      logger.error('Failed to sync payment methods:', error);
    }
  }

  // Private helper methods
  private async updateOrderPaymentStatus(orderId: string, status: string, paymentMethod: string): Promise<void> {
    try {
      await this.dbService.run(
        'UPDATE orders SET payment_status = ?, payment_method = ?, updated_at = ? WHERE id = ?',
        [status, paymentMethod, new Date().toISOString(), orderId]
      );
    } catch (error) {
      logger.error('Failed to update order payment status:', error);
    }
  }

  private async addPaymentToSyncQueue(paymentData: any): Promise<void> {
    try {
      await this.dbService.addToSyncQueue({
        tableName: 'offline_payments',
        operationType: 'INSERT',
        recordId: paymentData.id,
        recordData: paymentData,
        localTimestamp: new Date().toISOString(),
        syncStatus: 'pending',
        retryCount: 0,
        createdBy: paymentData.created_by,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to add payment to sync queue:', error);
    }
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  private generateReceiptNumber(): string {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const time = now.getTime().toString().slice(-6);
    return `RCP${year}${month}${day}${time}`;
  }
}

export const offlinePaymentService = new OfflinePaymentService();
