const { Paddle } = require('@paddle/paddle-node-sdk');
const crypto = require('crypto');

class PaddleService {
  constructor() {
    // Ensure API key is properly formatted
    const apiKey = process.env.PADDLE_API_KEY;
    if (!apiKey) {
      throw new Error('PADDLE_API_KEY is required');
    }
    
    this.paddle = new Paddle(apiKey.trim(), {
      environment: process.env.PADDLE_ENVIRONMENT || 'sandbox',
    });
  }

  // Verify webhook signature
  verifyWebhookSignature(body, signature) {
    try {
      const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;
      if (!webhookSecret) {
        console.error('PADDLE_WEBHOOK_SECRET not configured');
        return false;
      }

      // Parse Paddle signature format: ts=timestamp;h1=signature
      const sigParts = signature.split(';');
      let timestamp, receivedSignature;
      
      for (const part of sigParts) {
        const [key, value] = part.split('=');
        if (key === 'ts') {
          timestamp = value;
        } else if (key === 'h1') {
          receivedSignature = value;
        }
      }

      if (!timestamp || !receivedSignature) {
        console.error('Invalid signature format');
        return false;
      }

      // Convert body to string if it's not already
      const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
      
      // Create the payload for verification: timestamp:body
      const payload = `${timestamp}:${bodyString}`;
      
      // Create HMAC signature
      const hmac = crypto.createHmac('sha256', webhookSecret);
      hmac.update(payload);
      const expectedSignature = hmac.digest('hex');
      
      // Compare signatures using constant-time comparison
      const isValid = crypto.timingSafeEqual(
        Buffer.from(receivedSignature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
      
      if (!isValid) {
        console.error('Webhook signature verification failed');
      }
      
      return isValid;
    } catch (error) {
      console.error('Error verifying webhook signature:', error);
      return false;
    }
  }

  // Create or get customer
  async createCustomer({ email, name, userId }) {
    try {
      const customer = await this.paddle.customers.create({
        name: name,
        email: email,
        custom_data: {
          user_id: userId
        }
      });

      return customer.id;
    } catch (error) {
      console.error('Paddle customer creation failed:', error);
      throw new Error(`Failed to create customer: ${error.message}`);
    }
  }

  // Get subscription details {correct}
  async getSubscription(subscriptionId) {
    try {
      return await this.paddle.subscriptions.get(subscriptionId);
    } catch (error) {
      console.error('Failed to get subscription:', error);
      throw new Error(`Failed to get subscription: ${error.message}`);
    }
  }

  // Cancel subscription {correct}
  async cancelSubscription(subscriptionId) {
    try {
      return await this.paddle.subscriptions.cancel(subscriptionId, {
        effective_from: 'next_billing_period'
      });
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      throw new Error(`Failed to cancel subscription: ${error.message}`);
    }
  }

  // Resume subscription {correct}
  async resumeSubscription(subscriptionId) {
    try {
      return await this.paddle.subscriptions.resume(subscriptionId);
    } catch (error) {
      console.error('Failed to resume subscription:', error);
      throw new Error(`Failed to resume subscription: ${error.message}`);
    }
  }

  // Update subscription with new price (upgrade/downgrade)
  async updateSubscription(subscriptionId, newPriceId, prorationBillingMode = 'prorated_immediately') {
    try {
      // First get the current subscription to preserve existing items
      const currentSubscription = await this.getSubscription(subscriptionId);
      
      // Create the new items array with the new price
      const items = [
        {
          price_id: newPriceId,
          quantity: 1
        }
      ];

      // Update the subscription
      const updatedSubscription = await this.paddle.subscriptions.update(subscriptionId, {
        proration_billing_mode: prorationBillingMode,
        items: items
      });

      return updatedSubscription;
    } catch (error) {
      console.error('Failed to update subscription:', error);
      throw new Error(`Failed to update subscription: ${error.message}`);
    }
  }

  // Get customer portal URL
  async getCustomerPortalUrl(customerId, returnUrl) {
    try {
      // In Paddle SDK v2, customer portal is created via the general API
      const portalSession = await this.paddle.customerPortalSessions.create({
        customer_id: customerId,
      });


      const url = portalSession.urls.general.overview;
      
      return url;
    } catch (error) {
      console.error('Failed to create portal session:', error);
      throw new Error(`Failed to create portal session: ${error.message}`);
    }
  }

  // Test API connection
  async testConnection() {
    try {
      await this.paddle.products.list({ per_page: 1 });
      return { success: true, message: 'API connection working' };
    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        code: error.code,
        detail: error.detail
      };
    }
  }
}

module.exports = new PaddleService(); 