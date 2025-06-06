// Initialize Stripe with proper error handling
let stripe = null;

if (process.env.STRIPE_SECRET_KEY) {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
} else {
  console.warn('⚠️  STRIPE_SECRET_KEY not found in environment variables. Stripe functionality will be disabled.');
}

class StripeService {
  // Check if Stripe is properly initialized
  _checkStripeInitialized() {
    if (!stripe) {
      throw new Error('Stripe is not properly configured. Please set STRIPE_SECRET_KEY in your environment variables.');
    }
  }

  // Create a new Stripe customer
  async createCustomer(email, name, metadata = {}) {
    this._checkStripeInitialized();
    try {
      const customer = await stripe.customers.create({
        email,
        name,
        metadata
      });
      return customer;
    } catch (error) {
      console.error('Error creating Stripe customer:', error);
      throw new Error('Failed to create customer');
    }
  }

  // Create a checkout session for subscription
  async createCheckoutSession(customerId, priceId, successUrl, cancelUrl, metadata = {}) {
    this._checkStripeInitialized();
    try {
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata,
        allow_promotion_codes: true,
        billing_address_collection: 'required',
        subscription_data: {
          metadata,
        },
      });
      return session;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw new Error('Failed to create checkout session');
    }
  }

  // Create a billing portal session
  async createBillingPortalSession(customerId, returnUrl) {
    this._checkStripeInitialized();
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });
      return session;
    } catch (error) {
      console.error('Error creating billing portal session:', error);
      throw new Error('Failed to create billing portal session');
    }
  }

  // Get customer by ID
  async getCustomer(customerId) {
    this._checkStripeInitialized();
    try {
      const customer = await stripe.customers.retrieve(customerId);
      return customer;
    } catch (error) {
      console.error('Error retrieving customer:', error);
      throw new Error('Failed to retrieve customer');
    }
  }

  // Get subscription by ID
  async getSubscription(subscriptionId) {
    this._checkStripeInitialized();
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      return subscription;
    } catch (error) {
      console.error('Error retrieving subscription:', error);
      throw new Error('Failed to retrieve subscription');
    }
  }

  // Cancel subscription
  async cancelSubscription(subscriptionId) {
    this._checkStripeInitialized();
    try {
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
      return subscription;
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw new Error('Failed to cancel subscription');
    }
  }

  // Reactivate subscription
  async reactivateSubscription(subscriptionId) {
    this._checkStripeInitialized();
    try {
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
      });
      return subscription;
    } catch (error) {
      console.error('Error reactivating subscription:', error);
      throw new Error('Failed to reactivate subscription');
    }
  }

  // Construct webhook event
  constructWebhookEvent(body, signature, endpointSecret) {
    this._checkStripeInitialized();
    try {
      return stripe.webhooks.constructEvent(body, signature, endpointSecret);
    } catch (error) {
      console.error('Error constructing webhook event:', error);
      throw new Error('Invalid webhook signature');
    }
  }
}

module.exports = new StripeService(); 