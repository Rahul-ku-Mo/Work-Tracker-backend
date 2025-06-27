const { Paddle } = require('@paddle/paddle-node-sdk');

class PaddleService {
  constructor() {
    this.paddle = new Paddle({
      apiKey: process.env.PADDLE_API_KEY,
      environment: process.env.PADDLE_ENVIRONMENT || 'sandbox',
    });
  }

  // Create checkout session
  async createCheckoutSession({ priceId, customerId, successUrl, cancelUrl }) {
    try {
      const checkout = await this.paddle.checkout.create({
        items: [
          {
            price_id: priceId,
            quantity: 1
          }
        ],
        customer_id: customerId,
        success_url: successUrl,
        cancel_url: cancelUrl,
        payment_settings: {
          allowed_methods: ['card', 'paypal']
        }
      });

      return {
        id: checkout.id,
        url: checkout.url
      };
    } catch (error) {
      console.error('Paddle checkout creation failed:', error);
      throw new Error(`Failed to create checkout session: ${error.message}`);
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

  // Get subscription details
  async getSubscription(subscriptionId) {
    try {
      return await this.paddle.subscriptions.get(subscriptionId);
    } catch (error) {
      console.error('Failed to get subscription:', error);
      throw new Error(`Failed to get subscription: ${error.message}`);
    }
  }

  // Cancel subscription
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

  // Resume subscription
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
      return this.paddle.webhooks.verify(requestBody, signature, process.env.PADDLE_WEBHOOK_SECRET);
    } catch (error) {
      console.error('Webhook verification failed:', error);
      return false;
    }
  }

  // Get customer portal URL
  async getCustomerPortalUrl(customerId, returnUrl) {
    try {
      const portalSession = await this.paddle.customers.createPortalSession(customerId, {
        return_url: returnUrl
      });
      
      return portalSession.url;
    } catch (error) {
      console.error('Failed to create portal session:', error);
      throw new Error(`Failed to create portal session: ${error.message}`);
    }
  }
}

module.exports = new PaddleService(); 