// Payment Gateway Integration Services
// This file contains the integration logic for bKash and Nagad payment gateways

export interface PaymentConfig {
  amount: number;
  orderId: string;
  phoneNumber: string;
  description: string;
}

export interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  paymentUrl?: string;
  error?: string;
}

// bKash Payment Integration
export class BkashPaymentService {
  private baseUrl: string;
  private appKey: string;
  private appSecret: string;
  private username: string;
  private password: string;
  private isSandbox: boolean;

  constructor() {
    // These should be stored in environment variables in production
    this.isSandbox = true; // Set to false for production
    this.baseUrl = this.isSandbox 
      ? 'https://tokenized.sandbox.bka.sh/v1.2.0-beta'
      : 'https://tokenized.pay.bka.sh/v1.2.0-beta';
    
    // Replace with your actual bKash credentials
    this.appKey = process.env.BKASH_APP_KEY || 'your_bkash_app_key';
    this.appSecret = process.env.BKASH_APP_SECRET || 'your_bkash_app_secret';
    this.username = process.env.BKASH_USERNAME || 'your_bkash_username';
    this.password = process.env.BKASH_PASSWORD || 'your_bkash_password';
  }

  async getToken(): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/tokenized/checkout/token/grant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'accept': 'application/json',
          'username': this.username,
          'password': this.password,
        },
        body: JSON.stringify({
          app_key: this.appKey,
          app_secret: this.appSecret,
        }),
      });

      const data = await response.json();
      
      if (data.statusCode === '0000') {
        return data.id_token;
      } else {
        throw new Error(data.statusMessage || 'Failed to get bKash token');
      }
    } catch (error) {
      console.error('bKash token error:', error);
      throw error;
    }
  }

  async createPayment(config: PaymentConfig): Promise<PaymentResponse> {
    try {
      const token = await this.getToken();

      const response = await fetch(`${this.baseUrl}/tokenized/checkout/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'accept': 'application/json',
          'authorization': token,
          'x-app-key': this.appKey,
        },
        body: JSON.stringify({
          mode: '0011', // checkout mode
          payerReference: config.phoneNumber,
          callbackURL: 'https://yourapp.com/api/bkash/callback',
          amount: config.amount.toString(),
          currency: 'BDT',
          intent: 'sale',
          merchantInvoiceNumber: config.orderId,
        }),
      });

      const data = await response.json();

      if (data.statusCode === '0000') {
        return {
          success: true,
          transactionId: data.paymentID,
          paymentUrl: data.bkashURL,
        };
      } else {
        return {
          success: false,
          error: data.statusMessage || 'Failed to create bKash payment',
        };
      }
    } catch (error) {
      console.error('bKash payment creation error:', error);
      return {
        success: false,
        error: 'Network error occurred',
      };
    }
  }

  async executePayment(paymentId: string): Promise<PaymentResponse> {
    try {
      const token = await this.getToken();

      const response = await fetch(`${this.baseUrl}/tokenized/checkout/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'accept': 'application/json',
          'authorization': token,
          'x-app-key': this.appKey,
        },
        body: JSON.stringify({
          paymentID: paymentId,
        }),
      });

      const data = await response.json();

      if (data.statusCode === '0000') {
        return {
          success: true,
          transactionId: data.trxID,
        };
      } else {
        return {
          success: false,
          error: data.statusMessage || 'Failed to execute bKash payment',
        };
      }
    } catch (error) {
      console.error('bKash payment execution error:', error);
      return {
        success: false,
        error: 'Network error occurred',
      };
    }
  }

  async queryPayment(paymentId: string): Promise<any> {
    try {
      const token = await this.getToken();

      const response = await fetch(`${this.baseUrl}/tokenized/checkout/payment/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'accept': 'application/json',
          'authorization': token,
          'x-app-key': this.appKey,
        },
        body: JSON.stringify({
          paymentID: paymentId,
        }),
      });

      return await response.json();
    } catch (error) {
      console.error('bKash query error:', error);
      throw error;
    }
  }
}

// Nagad Payment Integration
export class NagadPaymentService {
  private baseUrl: string;
  private merchantId: string;
  private merchantPrivateKey: string;
  private nagadPublicKey: string;
  private isSandbox: boolean;

  constructor() {
    // These should be stored in environment variables in production
    this.isSandbox = true; // Set to false for production
    this.baseUrl = this.isSandbox 
      ? 'http://sandbox.mynagad.com:10080/remote-payment-gateway-1.0/api/dfs'
      : 'https://api.mynagad.com/api/dfs';
    
    // Replace with your actual Nagad credentials
    this.merchantId = process.env.NAGAD_MERCHANT_ID || 'your_nagad_merchant_id';
    this.merchantPrivateKey = process.env.NAGAD_PRIVATE_KEY || 'your_nagad_private_key';
    this.nagadPublicKey = process.env.NAGAD_PUBLIC_KEY || 'nagad_public_key';
  }

  private generateSignature(data: string): string {
    // In a real implementation, you would use proper RSA signing here
    // This is a placeholder - implement actual RSA-SHA256 signature
    return Buffer.from(data).toString('base64');
  }

  async createPayment(config: PaymentConfig): Promise<PaymentResponse> {
    try {
      const timestamp = Date.now().toString();
      const orderId = config.orderId;
      
      // Step 1: Initialize payment
      const initData = {
        merchantId: this.merchantId,
        orderId: orderId,
        amount: config.amount.toString(),
        currencyCode: '050', // BDT
        challenge: this.generateRandomString(40),
      };

      const initResponse = await fetch(`${this.baseUrl}/check-out/initialize/${this.merchantId}/${orderId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-KM-Api-Version': 'v-0.2.0',
          'X-KM-IP-V4': '127.0.0.1',
          'X-KM-Client-Type': 'PC_WEB',
        },
        body: JSON.stringify(initData),
      });

      const initResult = await initResponse.json();

      if (initResult.status === 'Success') {
        // Step 2: Complete payment initialization
        const completeData = {
          merchantId: this.merchantId,
          orderId: orderId,
          currencyCode: '050',
          amount: config.amount.toString(),
          challenge: initResult.challenge,
        };

        const completeResponse = await fetch(`${this.baseUrl}/check-out/complete/${initResult.paymentReferenceId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-KM-Api-Version': 'v-0.2.0',
            'X-KM-IP-V4': '127.0.0.1',
            'X-KM-Client-Type': 'PC_WEB',
          },
          body: JSON.stringify(completeData),
        });

        const completeResult = await completeResponse.json();

        if (completeResult.status === 'Success') {
          return {
            success: true,
            transactionId: completeResult.paymentReferenceId,
            paymentUrl: completeResult.callBackUrl,
          };
        } else {
          return {
            success: false,
            error: completeResult.message || 'Failed to complete Nagad payment initialization',
          };
        }
      } else {
        return {
          success: false,
          error: initResult.message || 'Failed to initialize Nagad payment',
        };
      }
    } catch (error) {
      console.error('Nagad payment creation error:', error);
      return {
        success: false,
        error: 'Network error occurred',
      };
    }
  }

  async verifyPayment(paymentRefId: string): Promise<PaymentResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/verify/payment/${paymentRefId}`, {
        method: 'GET',
        headers: {
          'X-KM-Api-Version': 'v-0.2.0',
          'X-KM-IP-V4': '127.0.0.1',
          'X-KM-Client-Type': 'PC_WEB',
        },
      });

      const data = await response.json();

      if (data.status === 'Success') {
        return {
          success: true,
          transactionId: data.issuerPaymentRefNo,
        };
      } else {
        return {
          success: false,
          error: data.message || 'Payment verification failed',
        };
      }
    } catch (error) {
      console.error('Nagad payment verification error:', error);
      return {
        success: false,
        error: 'Network error occurred',
      };
    }
  }

  private generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

// Payment Gateway Factory
export class PaymentGatewayFactory {
  static createGateway(gatewayName: string) {
    switch (gatewayName.toLowerCase()) {
      case 'bkash':
        return new BkashPaymentService();
      case 'nagad':
        return new NagadPaymentService();
      default:
        throw new Error(`Unsupported payment gateway: ${gatewayName}`);
    }
  }
}

// Payment utilities
export const PaymentUtils = {
  formatCurrency: (amount: number): string => {
    return `৳${amount.toLocaleString()}`;
  },

  validatePhoneNumber: (phone: string): boolean => {
    const bangladeshiPhoneRegex = /^(\+88)?01[3-9]\d{8}$/;
    return bangladeshiPhoneRegex.test(phone);
  },

  generateOrderId: (): string => {
    return `ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },

  isPaymentExpired: (createdAt: string, expirationMinutes: number = 30): boolean => {
    const created = new Date(createdAt);
    const expiration = new Date(created.getTime() + expirationMinutes * 60000);
    return new Date() > expiration;
  },
};