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
      environment: process.env.PADDLE_ENVIRONMENT || 'production',
    });
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

  // Get subscriptions by customer ID
  async getSubscriptionsByCustomerId(customerId) {
    try {
      const subscriptions = await this.paddle.subscriptions.list();

      console.log("Paddle subscriptions", subscriptions);
      return subscriptions.data || [];
    } catch (error) {
      console.error('Failed to get subscriptions by customer ID:', error);
      throw new Error(`Failed to get subscriptions: ${error.message}`);
    }
  }

  // Find and get the latest active subscription for a customer
  async getLatestSubscriptionForCustomer(customerId) {
    try {
      const subscriptions = await this.getSubscriptionsByCustomerId(customerId);

      
      if (!subscriptions || subscriptions.length === 0) {
        return null;
      }

      // Find the most recent active subscription
      const activeSubscription = subscriptions
        .filter(sub => sub.status === 'active' || sub.status === 'trialing')
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

      return activeSubscription || null;
    } catch (error) {
      console.error('Failed to get latest subscription for customer:', error);
      throw new Error(`Failed to get customer subscription: ${error.message}`);
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

  // Verify webhook signature
  verifyWebhookSignature(requestBody, signature) {
    try {
      const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;
      if (!webhookSecret) {
        console.error('PADDLE_WEBHOOK_SECRET not configured');
        return false;
      }

      if (!signature || !requestBody) {
        console.error('Missing signature or request body');
        return false;
      }

      // Remove 'Paddle ' prefix from signature if present
      const cleanSignature = signature.replace('Paddle ', '').trim();
      
      // Create HMAC signature
      const hmac = crypto.createHmac('sha256', webhookSecret);
      hmac.update(requestBody, 'utf8');
      const expectedSignature = hmac.digest('hex');
      
      // Ensure both signatures are the same length before comparing
      if (cleanSignature.length !== expectedSignature.length) {
        console.error('Signature length mismatch:', {
          received: cleanSignature.length,
          expected: expectedSignature.length
        });
        return false;
      }
      
      // Compare signatures securely
      return crypto.timingSafeEqual(
        Buffer.from(cleanSignature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      console.error('Webhook verification failed:', error);
      return false;
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