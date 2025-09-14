import { logger } from '../utils/logger';

/**
 * PayMongo Service for handling online payments with QR Ph integration
 * 
 * This service handles:
 * - Creating payment intents
 * - Generating QR Ph codes for Philippine banks/e-wallets
 * - Processing payment confirmations
 * - Webhook event handling
 * 
 * Documentation: https://developers.paymongo.com/
 */

export interface PaymentIntentData {
  amount: number; // Amount in centavos (e.g., 10000 = PHP 100.00)
  currency: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface PaymentMethodData {
  type: 'qrph';
  billing?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

export interface PaymentResult {
  success: boolean;
  data?: {
    paymentIntentId: string;
    qrCodeUrl?: string;
    qrCodeData?: string;
    status: string;
    amount: number;
    currency: string;
    expiresAt?: string;
    description?: string;
    metadata?: Record<string, any>;
    created_at?: number;
    updated_at?: number;
    cancelled_at?: string;
  };
  error?: string;
}

export interface WebhookEvent {
  id: string;
  type: string;
  data: {
    id: string;
    type: string;
    attributes: {
      type: string;
      status: string;
      amount: number;
      currency: string;
      description?: string;
      metadata?: Record<string, any>;
      created_at: number;
      updated_at: number;
      // Additional PayMongo webhook attributes
      fee?: number;
      net_amount?: number;
      external_reference_number?: string;
      failed_message?: string;
      failed_code?: string;
      [key: string]: any; // Allow additional properties
    };
  };
}

export class PayMongoService {
  private secretKey: string;
  private isTestMode: boolean;
  private baseUrl: string;

  constructor() {
    const secretKey = process.env['PAYMONGO_SECRET_KEY'];
    const isTestMode = process.env['PAYMONGO_TEST_MODE'] === 'true';
    const useMockMode = process.env['PAYMONGO_MOCK_MODE'] === 'true';

    // Only require secret key if NOT in mock mode
    if (!secretKey && !useMockMode) {
      throw new Error('PayMongo secret key is required. Set PAYMONGO_SECRET_KEY environment variable or enable PAYMONGO_MOCK_MODE=true for testing.');
    }

    this.secretKey = secretKey || 'mock_key';
    this.isTestMode = isTestMode;
    // Use test API for both test and live modes (PayMongo uses same endpoint)
    this.baseUrl = 'https://api.paymongo.com/v1';

    logger.info(`PayMongo service initialized in ${useMockMode ? 'MOCK' : (isTestMode ? 'TEST' : 'LIVE')} mode`, {
      hasSecretKey: !!secretKey,
      secretKeyPrefix: secretKey ? secretKey.substring(0, 10) + '...' : 'none',
      baseUrl: this.baseUrl,
      useMockMode,
      isTestMode
    });
  }

  private async makeRequest(endpoint: string, method: string = 'GET', data?: any): Promise<any> {
    // Only use mock mode if explicitly enabled
    const useMockMode = process.env['PAYMONGO_MOCK_MODE'] === 'true';
    
    if (useMockMode) {
      logger.info('Using MOCK mode for PayMongo API request');
      return this.mockRequest(endpoint, method, data);
    }

    // Use real PayMongo API by default
    logger.info('Using REAL PayMongo API request');

    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Authorization': `Basic ${Buffer.from(this.secretKey + ':').toString('base64')}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    const options: any = {
      method,
      headers
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }

    try {
      logger.info('Making PayMongo API request:', { url, method, hasData: !!data });
      
      const response = await fetch(url, options);
      const result: any = await response.json();

      logger.info('PayMongo API response:', { 
        status: response.status, 
        statusText: response.statusText,
        hasResult: !!result,
        resultKeys: result ? Object.keys(result) : []
      });

      if (!response.ok) {
        logger.error('PayMongo API error response:', { 
          status: response.status,
          statusText: response.statusText,
          result: result
        });
        throw new Error(`PayMongo API error: ${result.error?.message || result.message || `HTTP ${response.status}: ${response.statusText}`}`);
      }

      return result;
    } catch (error: any) {
      logger.error('PayMongo API request failed:', { 
        error: error?.message || 'Unknown error',
        url,
        method,
        hasData: !!data
      });
      throw error;
    }
  }

  /**
   * Mock request handler for testing purposes
   * Only used when PAYMONGO_MOCK_MODE=true is explicitly set
   * @param endpoint - API endpoint
   * @param method - HTTP method
   * @param data - Request data
   * @returns Mock response data
   */
  private async mockRequest(endpoint: string, method: string, data?: any): Promise<any> {
    logger.info('Using MOCK PayMongo response for testing', { endpoint, method });
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (endpoint === '/payment_intents' && method === 'POST') {
      const paymentIntentId = `pi_mock_${Date.now()}`;
      return {
        data: {
          id: paymentIntentId,
          type: 'payment_intent',
          attributes: {
            amount: data?.data?.attributes?.amount || 10000,
            currency: data?.data?.attributes?.currency || 'PHP',
            description: data?.data?.attributes?.description || 'Mock Payment',
            status: 'awaiting_payment_method',
            payment_method_allowed: ['qrph'],
            metadata: data?.data?.attributes?.metadata || {},
            created_at: Math.floor(Date.now() / 1000),
            updated_at: Math.floor(Date.now() / 1000)
          }
        }
      };
    }
    
    if (endpoint.includes('/payment_intents/') && endpoint.includes('/attach') && method === 'POST') {
      const paymentIntentId = endpoint.split('/')[2];
      return {
        data: {
          id: paymentIntentId,
          type: 'payment_intent',
          attributes: {
            amount: 10000,
            currency: 'PHP',
            status: 'awaiting_payment_method',
            payment_method_allowed: ['qrph'],
            next_action: {
              type: 'consume_qr',
              code: {
                id: `code_mock_${Date.now()}`,
                amount: 10000,
                label: 'Mock QR Ph Payment',
                // WARNING: This is a 1x1 pixel placeholder - not a real QR code
                image_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
              }
            },
            created_at: Math.floor(Date.now() / 1000),
            updated_at: Math.floor(Date.now() / 1000)
          }
        }
      };
    }
    
    if (endpoint.includes('/payment_intents/') && method === 'GET') {
      const paymentIntentId = endpoint.split('/')[2];
      return {
        data: {
          id: paymentIntentId,
          type: 'payment_intent',
          attributes: {
            amount: 10000,
            currency: 'PHP',
            status: 'awaiting_payment_method',
            payment_method_allowed: ['qrph'],
            created_at: Math.floor(Date.now() / 1000),
            updated_at: Math.floor(Date.now() / 1000)
          }
        }
      };
    }
    
    if (endpoint.includes('/payment_intents/') && endpoint.includes('/cancel') && method === 'POST') {
      const paymentIntentId = endpoint.split('/')[2];
      return {
        data: {
          id: paymentIntentId,
          type: 'payment_intent',
          attributes: {
            amount: 10000,
            currency: 'PHP',
            status: 'cancelled',
            payment_method_allowed: ['qrph'],
            created_at: Math.floor(Date.now() / 1000),
            updated_at: Math.floor(Date.now() / 1000)
          }
        }
      };
    }
    
    return { data: { id: 'mock_response', type: 'mock' } };
  }

  /**
   * Create a payment intent with specified amount
   * @param paymentData - Payment details including amount in centavos
   * @returns Payment intent result with QR code data
   */
  async createPaymentIntent(paymentData: PaymentIntentData): Promise<PaymentResult> {
    try {
      logger.info('Creating payment intent:', { 
        amount: paymentData.amount, 
        currency: paymentData.currency,
        testMode: this.isTestMode 
      });

      // Validate amount (minimum 1 peso = 100 centavos)
      if (paymentData.amount < 100) {
        return {
          success: false,
          error: 'Minimum payment amount is PHP 1.00 (100 centavos)'
        };
      }

      // Create payment intent via PayMongo API with QR Ph support
      const requestData = {
        data: {
          attributes: {
            amount: paymentData.amount,
            currency: paymentData.currency || 'PHP',
            description: paymentData.description,
            metadata: paymentData.metadata,
            payment_method_allowed: ['qrph'] // Enable QR Ph payment method
          }
        }
      };

      logger.info('Creating payment intent with data:', {
        amount: paymentData.amount,
        currency: paymentData.currency || 'PHP',
        description: paymentData.description,
        hasMetadata: !!paymentData.metadata,
        paymentMethodAllowed: ['qrph']
      });

      const paymentIntentResponse: any = await this.makeRequest('/payment_intents', 'POST', requestData);

      const paymentIntent = paymentIntentResponse.data;

      logger.info('Payment intent created:', { 
        id: paymentIntent.id, 
        status: paymentIntent.attributes.status 
      });

      // Create and attach QR Ph payment method
      const qrResult = await this.createQRPhPaymentMethod(paymentIntent.id);
      
      if (!qrResult.success) {
        return qrResult;
      }

      const result: PaymentResult = {
        success: true,
        data: {
          paymentIntentId: paymentIntent.id,
          status: paymentIntent.attributes.status,
          amount: paymentData.amount,
          currency: paymentData.currency || 'PHP',
          expiresAt: this.calculateExpirationTime()
        }
      };

      if (qrResult.data?.qrCodeUrl) {
        result.data!.qrCodeUrl = qrResult.data.qrCodeUrl;
      }
      if (qrResult.data?.qrCodeData) {
        result.data!.qrCodeData = qrResult.data.qrCodeData;
      }

      return result;

    } catch (error: any) {
      logger.error('Error creating payment intent:', error);
      return {
        success: false,
        error: error.message || 'Failed to create payment intent'
      };
    }
  }

  /**
   * Create QR Ph payment method and attach to payment intent
   * @param paymentIntentId - The payment intent ID
   * @returns QR code data for display
   */
  private async createQRPhPaymentMethod(paymentIntentId: string): Promise<PaymentResult> {
    try {
      logger.info('Creating QR Ph payment method for intent:', paymentIntentId);

      // Create QR Ph payment method
      const paymentMethodResponse: any = await this.makeRequest('/payment_methods', 'POST', {
        data: {
          attributes: {
            type: 'qrph'
          }
        }
      });

      const paymentMethod = paymentMethodResponse.data;
      logger.info('QR Ph payment method created:', { id: paymentMethod.id });

      // Attach payment method to payment intent
      const attachResponse: any = await this.makeRequest(`/payment_intents/${paymentIntentId}/attach`, 'POST', {
        data: {
          attributes: {
            payment_method: paymentMethod.id
          }
        }
      });

      const attachedPayment = attachResponse.data;
      logger.info('Payment method attached to intent:', { 
        intentId: paymentIntentId, 
        methodId: paymentMethod.id,
        status: attachedPayment.attributes.status 
      });

      // Extract QR code data from the next_action (PayMongo QR Ph approach)
      const qrCodeData = this.extractQRPhCodeData(attachedPayment);

      // Validate that we have QR code data for QR Ph payments
      if (!qrCodeData.url && !qrCodeData.data) {
        logger.error('Failed to extract QR code data from PayMongo response', {
          paymentIntentId,
          attachedPayment: {
            id: attachedPayment.id,
            hasAttributes: !!attachedPayment.attributes,
            hasNextAction: !!attachedPayment.attributes?.next_action,
            nextActionType: attachedPayment.attributes?.next_action?.type
          }
        });
        
        return {
          success: false,
          error: 'Failed to generate QR code for payment. Please try again or contact support.'
        };
      }

      const result: PaymentResult = {
        success: true,
        data: {
          paymentIntentId,
          status: attachedPayment.attributes.status,
          amount: attachedPayment.attributes.amount,
          currency: attachedPayment.attributes.currency
        }
      };

      if (qrCodeData.url) {
        result.data!.qrCodeUrl = qrCodeData.url;
        logger.info('QR code URL successfully extracted', {
          paymentIntentId,
          urlLength: qrCodeData.url.length
        });
      }
      if (qrCodeData.data) {
        result.data!.qrCodeData = qrCodeData.data;
        logger.info('QR code data successfully extracted', {
          paymentIntentId,
          dataLength: qrCodeData.data.length
        });
      }

      return result;

    } catch (error: any) {
      logger.error('Error creating QR Ph payment method:', error);
      return {
        success: false,
        error: error.message || 'Failed to create QR Ph payment method'
      };
    }
  }

  /**
   * Extract QR Ph code data from PayMongo attach response
   * Based on official PayMongo documentation: next_action.code.image_url
   * @param attachResponse - PayMongo attach response
   * @returns QR code URL and data
   */
  private extractQRPhCodeData(attachResponse: any): { url?: string; data?: string } {
    try {
      const attributes = attachResponse.attributes;
      
      // Check for next_action with QR Ph code (PayMongo official approach)
      if (attributes.next_action && attributes.next_action.type === 'consume_qr') {
        const code = attributes.next_action.code;
        
        if (code && code.image_url) {
          // PayMongo provides base64 image data
          const qrCodeData = code.image_url; // This is the base64 image string
          
          // Validate QR code data - ensure it's not the mock placeholder
          const isMockPlaceholder = qrCodeData === 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
          
          if (isMockPlaceholder) {
            logger.warn('Detected mock QR code placeholder - this indicates mock mode is active');
          }
          
          // Ensure proper base64 format
          const qrCodeUrl = qrCodeData.startsWith('data:image/png;base64,') 
            ? qrCodeData 
            : `data:image/png;base64,${qrCodeData}`;
          
          logger.info('Extracted QR Ph code from PayMongo next_action:', { 
            paymentIntentId: attachResponse.id,
            codeId: code.id,
            amount: code.amount,
            label: code.label,
            hasImageUrl: !!code.image_url,
            imageUrlLength: code.image_url ? code.image_url.length : 0,
            isMockPlaceholder,
            isValidQRCode: !isMockPlaceholder && code.image_url.length > 100
          });

          // Validate QR code quality
          if (!isMockPlaceholder && code.image_url.length < 100) {
            logger.warn('QR code data seems too short - may be invalid', {
              length: code.image_url.length,
              paymentIntentId: attachResponse.id
            });
          }

          return {
            url: qrCodeUrl,
            data: qrCodeData
          };
        } else {
          logger.warn('QR Ph code missing image_url in next_action.code', {
            paymentIntentId: attachResponse.id,
            hasCode: !!code,
            hasImageUrl: !!(code && code.image_url)
          });
        }
      }

      // Fallback: check for legacy QR code data
      const paymentMethod = attachResponse.payment_method;
      if (paymentMethod && paymentMethod.attributes) {
        const methodAttributes = paymentMethod.attributes;
        const qrCodeUrl = methodAttributes.qr_code_url || methodAttributes.qr_code;
        const qrCodeData = methodAttributes.qr_code_data || methodAttributes.qr_code;
        
        if (qrCodeUrl || qrCodeData) {
          logger.info('Extracted QR code from legacy payment method:', { 
            paymentIntentId: attachResponse.id,
            hasQrCodeUrl: !!qrCodeUrl,
            hasQrCodeData: !!qrCodeData
          });

          return {
            url: qrCodeUrl,
            data: qrCodeData
          };
        }
      }

      // No QR code data found - this is a critical error for QR Ph payments
      logger.error('No QR code data found in PayMongo response - QR Ph payment cannot proceed:', {
        paymentIntentId: attachResponse.id,
        hasNextAction: !!attributes.next_action,
        nextActionType: attributes.next_action?.type,
        hasCode: !!attributes.next_action?.code,
        hasImageUrl: !!(attributes.next_action?.code?.image_url),
        hasPaymentMethod: !!paymentMethod,
        responseStructure: {
          hasAttributes: !!attributes,
          hasNextAction: !!attributes.next_action,
          nextActionKeys: attributes.next_action ? Object.keys(attributes.next_action) : []
        }
      });

      return {};
    } catch (error) {
      logger.error('Error extracting QR Ph code data:', error);
      return {};
    }
  }

  /**
   * Retrieve payment intent status
   * @param paymentIntentId - The payment intent ID
   * @returns Current payment status
   */
  async getPaymentStatus(paymentIntentId: string): Promise<PaymentResult> {
    try {
      logger.info('Retrieving payment status for intent:', paymentIntentId);

      // Retrieve payment intent from PayMongo
      const response: any = await this.makeRequest(`/payment_intents/${paymentIntentId}`);
      const paymentIntent = response.data;

      logger.info('Payment intent retrieved:', {
        id: paymentIntent.id,
        status: paymentIntent.attributes.status,
        amount: paymentIntent.attributes.amount,
        currency: paymentIntent.attributes.currency
      });

      return {
        success: true,
        data: {
          paymentIntentId: paymentIntent.id,
          status: paymentIntent.attributes.status,
          amount: paymentIntent.attributes.amount,
          currency: paymentIntent.attributes.currency,
          description: paymentIntent.attributes.description,
          metadata: paymentIntent.attributes.metadata,
          created_at: paymentIntent.attributes.created_at,
          updated_at: paymentIntent.attributes.updated_at
        }
      };

    } catch (error: any) {
      logger.error('Error retrieving payment status:', error);
      return {
        success: false,
        error: error.message || 'Failed to retrieve payment status'
      };
    }
  }

  /**
   * Cancel a payment intent
   * @param paymentIntentId - The payment intent ID to cancel
   * @returns Cancellation result
   */
  async cancelPaymentIntent(paymentIntentId: string): Promise<PaymentResult> {
    try {
      logger.info('Cancelling payment intent:', paymentIntentId);

      // Cancel payment intent via PayMongo API
      const response: any = await this.makeRequest(`/payment_intents/${paymentIntentId}/cancel`, 'POST');

      const paymentIntent = response.data;

      logger.info('Payment intent cancelled:', {
        id: paymentIntent.id,
        status: paymentIntent.attributes.status
      });

      return {
        success: true,
        data: {
          paymentIntentId: paymentIntent.id,
          status: paymentIntent.attributes.status,
          amount: paymentIntent.attributes.amount,
          currency: paymentIntent.attributes.currency,
          cancelled_at: new Date().toISOString()
        }
      };

    } catch (error: any) {
      logger.error('Error cancelling payment intent:', error);
      return {
        success: false,
        error: error.message || 'Failed to cancel payment intent'
      };
    }
  }

  /**
   * Process webhook event from PayMongo
   * @param event - Webhook event data
   * @returns Processing result
   */
  async processWebhookEvent(event: WebhookEvent): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info('Processing webhook event:', { 
        id: event.id, 
        type: event.type,
        dataId: event.data.id 
      });

      const { type, data } = event;
      const { attributes } = data;

      switch (type) {
        case 'payment.paid':
          await this.handlePaymentSuccess(data.id, attributes);
          break;
        
        case 'payment.failed':
          await this.handlePaymentFailure(data.id, attributes);
          break;
        
        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(data.id, attributes);
          break;
        
        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(data.id, attributes);
          break;
        
        case 'payment_intent.cancelled':
          await this.handlePaymentCancellation(data.id, attributes);
          break;
        
        case 'qrph.expired':
          await this.handleQRPhExpired(data.id, attributes);
          break;
        
        default:
          logger.info('Unhandled webhook event type:', type);
      }

      return { success: true };

    } catch (error: any) {
      logger.error('Error processing webhook event:', error);
      return {
        success: false,
        error: error.message || 'Failed to process webhook event'
      };
    }
  }

  /**
   * Handle successful payment
   * @param paymentIntentId - Payment intent ID
   * @param attributes - Payment attributes
   */
  private async handlePaymentSuccess(paymentIntentId: string, attributes: any): Promise<void> {
    logger.info('Payment succeeded:', { 
      paymentIntentId, 
      amount: attributes.amount,
      currency: attributes.currency 
    });

    // Update order status in database
    // This will be implemented in the order service
    // await this.updateOrderPaymentStatus(paymentIntentId, 'paid');
  }

  /**
   * Handle payment intent succeeded
   * @param paymentIntentId - Payment intent ID
   * @param attributes - Payment intent attributes
   */
  private async handlePaymentIntentSucceeded(paymentIntentId: string, attributes: any): Promise<void> {
    logger.info('Payment intent succeeded:', { 
      paymentIntentId, 
      amount: attributes.amount,
      currency: attributes.currency 
    });

    // Update order status in database
    // This will be implemented in the order service
    // await this.updateOrderPaymentStatus(paymentIntentId, 'paid');
  }

  /**
   * Handle payment intent failed
   * @param paymentIntentId - Payment intent ID
   * @param attributes - Payment intent attributes
   */
  private async handlePaymentIntentFailed(paymentIntentId: string, attributes: any): Promise<void> {
    logger.info('Payment intent failed:', { 
      paymentIntentId, 
      amount: attributes.amount,
      currency: attributes.currency,
      failedCode: attributes.failed_code,
      failedMessage: attributes.failed_message
    });

    // Update order status in database
    // await this.updateOrderPaymentStatus(paymentIntentId, 'failed');
  }

  /**
   * Handle failed payment
   * @param paymentIntentId - Payment intent ID
   * @param attributes - Payment attributes
   */
  private async handlePaymentFailure(paymentIntentId: string, attributes: any): Promise<void> {
    logger.info('Payment failed:', { 
      paymentIntentId, 
      amount: attributes.amount,
      currency: attributes.currency 
    });

    // Update order status in database
    // await this.updateOrderPaymentStatus(paymentIntentId, 'failed');
  }

  /**
   * Handle cancelled payment
   * @param paymentIntentId - Payment intent ID
   * @param attributes - Payment attributes
   */
  private async handlePaymentCancellation(paymentIntentId: string, attributes: any): Promise<void> {
    logger.info('Payment cancelled:', { 
      paymentIntentId, 
      amount: attributes.amount,
      currency: attributes.currency 
    });

    // Update order status in database
    // await this.updateOrderPaymentStatus(paymentIntentId, 'cancelled');
  }

  /**
   * Handle expired QR Ph code
   * @param paymentIntentId - Payment intent ID
   * @param attributes - Payment attributes
   */
  private async handleQRPhExpired(paymentIntentId: string, attributes: any): Promise<void> {
    logger.info('QR Ph code expired:', { 
      paymentIntentId, 
      amount: attributes.amount,
      currency: attributes.currency 
    });

    // Update order status in database - QR code expired, revert to awaiting payment
    // await this.updateOrderPaymentStatus(paymentIntentId, 'awaiting_payment_method');
  }

  /**
   * Calculate QR code expiration time (30 minutes from now - PayMongo standard)
   * @returns ISO string of expiration time
   */
  private calculateExpirationTime(): string {
    const expirationTime = new Date();
    expirationTime.setMinutes(expirationTime.getMinutes() + 30); // 30 minutes (PayMongo standard)
    return expirationTime.toISOString();
  }

  /**
   * Validate webhook signature (for production security)
   * @param payload - Raw webhook payload
   * @param signature - Webhook signature header
   * @returns Validation result
   */
  validateWebhookSignature(payload: string, signature: string): boolean {
    // Implement webhook signature validation
    // This is important for production security
    // PayMongo provides signature validation in their webhook documentation
    
    if (this.isTestMode) {
      // Skip validation in test mode
      return true;
    }

    // TODO: Implement proper signature validation
    // const expectedSignature = crypto
    //   .createHmac('sha256', process.env.PAYMONGO_WEBHOOK_SECRET!)
    //   .update(payload)
    //   .digest('hex');
    
    return true; // Placeholder
  }

  /**
   * Get test mode status
   * @returns Whether service is in test mode
   */
  isInTestMode(): boolean {
    return this.isTestMode;
  }

  /**
   * Check if service is in mock mode
   * @returns Whether service is using mock responses
   */
  isInMockMode(): boolean {
    return process.env['PAYMONGO_MOCK_MODE'] === 'true';
  }

  /**
   * Get service configuration status
   * @returns Service configuration information
   */
  getServiceStatus(): { 
    isTestMode: boolean; 
    isMockMode: boolean; 
    hasSecretKey: boolean; 
    baseUrl: string; 
  } {
    return {
      isTestMode: this.isTestMode,
      isMockMode: this.isInMockMode(),
      hasSecretKey: !!this.secretKey && this.secretKey !== 'mock_key',
      baseUrl: this.baseUrl
    };
  }
}

// Export singleton instance
let _paymongoService: PayMongoService | null = null;

export const paymongoService = (): PayMongoService => {
  if (!_paymongoService) {
    _paymongoService = new PayMongoService();
  }
  return _paymongoService;
};
