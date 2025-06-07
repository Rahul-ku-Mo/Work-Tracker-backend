const stripeService = require('../services/stripeService');
const { PrismaClient } = require('@prisma/client');
const { getUsageStats } = require('../middleware/featureGating');
const prisma = new PrismaClient();

class BillingController {
  // Create checkout session for subscription
  async createCheckoutSession(req, res) {
    try {
      const { priceId, successUrl, cancelUrl } = req.body;
      const userId = req.user.id;

      // Get or create Stripe customer
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      let customerId = user.stripeCustomerId;

      // Create Stripe customer if doesn't exist
      if (!customerId) {
        const customer = await stripeService.createCustomer(
          user.email,
          user.name,
          { userId: userId.toString() }
        );
        customerId = customer.id;

        // Update user with Stripe customer ID
        await prisma.user.update({
          where: { id: userId },
          data: { stripeCustomerId: customerId }
        });
      }

      // Create checkout session
      const session = await stripeService.createCheckoutSession(
        customerId,
        priceId,
        successUrl,
        cancelUrl,
        { userId: userId.toString() }
      );

      res.json({ sessionId: session.id, url: session.url });
    } catch (error) {
      console.error('Error creating checkout session:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Create billing portal session
  async createBillingPortalSession(req, res) {
    try {
      const { returnUrl } = req.body;
      const userId = req.user.id;

      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user || !user.stripeCustomerId) {
        return res.status(404).json({ error: 'No billing information found' });
      }

      const session = await stripeService.createBillingPortalSession(
        user.stripeCustomerId,
        returnUrl
      );

      res.json({ url: session.url });
    } catch (error) {
      console.error('Error creating billing portal session:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Get user's subscription status
  async getSubscriptionStatus(req, res) {
    try {
      const userId = req.user.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          subscription: true
        }
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // If no subscription, return free plan
      if (!user.subscription) {
        return res.json({
          plan: 'free',
          status: 'active',
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false
        });
      }

      // Get current subscription from Stripe
      const subscription = await stripeService.getSubscription(user.subscription.stripeSubscriptionId);

      res.json({
        plan: user.subscription.plan,
        status: subscription.status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        subscriptionId: subscription.id
      });
    } catch (error) {
      console.error('Error getting subscription status:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Cancel subscription
  async cancelSubscription(req, res) {
    try {
      const userId = req.user.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          subscription: true
        }
      });

      if (!user || !user.subscription) {
        return res.status(404).json({ error: 'No active subscription found' });
      }

      const subscription = await stripeService.cancelSubscription(user.subscription.stripeSubscriptionId);

      res.json({
        message: 'Subscription will be cancelled at the end of the current period',
        currentPeriodEnd: new Date(subscription.current_period_end * 1000)
      });
    } catch (error) {
      console.error('Error canceling subscription:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Reactivate subscription
  async reactivateSubscription(req, res) {
    try {
      const userId = req.user.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          subscription: true
        }
      });

      if (!user || !user.subscription) {
        return res.status(404).json({ error: 'No subscription found' });
      }

      const subscription = await stripeService.reactivateSubscription(user.subscription.stripeSubscriptionId);

      res.json({
        message: 'Subscription reactivated successfully',
        status: subscription.status
      });
    } catch (error) {
      console.error('Error reactivating subscription:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Get available plans
  async getPlans(req, res) {
    try {
      const plans = [
        {
          id: 'free',
          name: 'Free Trial',
          description: 'Perfect for trying out PulseBoard',
          price: 0,
          currency: 'usd',
          interval: 'month',
          features: [
            '2 projects',
            '3 team members',
            '25 tasks per project',
            '100 image uploads',
            'Basic task management',
            '7-day activity history',
            'Community support'
          ],
          limits: {
            projects: 2,
            teamMembers: 3,
            tasksPerProject: 25,
            activityHistoryDays: 7,
            storageGB: 1,
            imageUploads: 100, // ~50-100MB at average 500KB per image
            analytics: false,
            timeTracking: false,
            customFields: false,
            aiFeatures: false,
            prioritySupport: false
          }
        },
        {
          id: 'pro',
          name: 'Professional',
          description: 'For growing teams and small businesses',
          price: 12,
          currency: 'usd',
          interval: 'month',
          stripePrice: process.env.STRIPE_PRICE_ID_PRO,
          features: [
            '100 projects',
            '15 team members', 
            '500 tasks per project',
            '1,000 image uploads',
            'Advanced analytics & reporting',
            '90-day activity history',
            'Time tracking',
            'Custom fields',
            'AI-powered insights',
            'Email support'
          ],
          limits: {
            projects: 100,
            teamMembers: 15,
            tasksPerProject: 500,
            activityHistoryDays: 90,
            storageGB: 50,
            imageUploads: 1000, // ~500MB-1GB storage
            analytics: true,
            timeTracking: true,
            customFields: true,
            aiFeatures: true,
            prioritySupport: false
          }
        },
        {
          id: 'enterprise',
          name: 'Enterprise',
          description: 'For large teams and organizations',
          price: 25,
          currency: 'usd',
          interval: 'month',
          stripePrice: process.env.STRIPE_PRICE_ID_ENTERPRISE,
          features: [
            'Unlimited projects',
            'Unlimited team members',
            'Unlimited tasks',
            'Unlimited image uploads',
            'Advanced analytics & reporting',
            'Unlimited activity history',
            'Time tracking',
            'Custom fields',
            'AI-powered insights',
            'Advanced team management',
            'Priority support'
          ],
          limits: {
            projects: -1,
            teamMembers: -1,
            tasksPerProject: -1,
            activityHistoryDays: -1,
            storageGB: -1,
            imageUploads: -1, // Unlimited
            analytics: true,
            timeTracking: true,
            customFields: true,
            aiFeatures: true,
            prioritySupport: true
          }
        }
      ];

      res.json(plans);
    } catch (error) {
      console.error('Error getting plans:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Stripe webhook handler
  async handleWebhook(req, res) {
    try {
      const signature = req.headers['stripe-signature'];
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

      const event = stripeService.constructWebhookEvent(
        req.body,
        signature,
        endpointSecret
      );

      // Handle the event
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object);
          break;

        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object);
          break;

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object);
          break;

        default:
          console.log(`Unhandled event type ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Error handling webhook:', error);
      res.status(400).json({ error: error.message });
    }
  }

  // Handle successful checkout
  async handleCheckoutCompleted(session) {
    try {
      const userId = parseInt(session.metadata.userId);
      const subscriptionId = session.subscription;

      const subscription = await stripeService.getSubscription(subscriptionId);

      let plan = 'free';
      if (subscription.items.data[0].price.id === process.env.STRIPE_PRICE_ID_PRO) {
        plan = 'pro';
      }

      await prisma.subscription.upsert({
        where: { userId },
        update: {
          stripeSubscriptionId: subscriptionId,
          plan,
          status: subscription.status,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        },
        create: {
          userId,
          stripeSubscriptionId: subscriptionId,
          plan,
          status: subscription.status,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        }
      });

      console.log(`Subscription created/updated for user ${userId}`);
    } catch (error) {
      console.error('Error handling checkout completed:', error);
    }
  }

  // Handle successful payment
  async handlePaymentSucceeded(invoice) {
    try {
      const subscriptionId = invoice.subscription;
      const subscription = await stripeService.getSubscription(subscriptionId);

      await prisma.subscription.updateMany({
        where: { stripeSubscriptionId: subscriptionId },
        data: {
          status: subscription.status,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        }
      });

      console.log(`Payment succeeded for subscription ${subscriptionId}`);
    } catch (error) {
      console.error('Error handling payment succeeded:', error);
    }
  }

  // Handle subscription updated
  async handleSubscriptionUpdated(subscription) {
    try {
      await prisma.subscription.updateMany({
        where: { stripeSubscriptionId: subscription.id },
        data: {
          status: subscription.status,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        }
      });

      console.log(`Subscription updated: ${subscription.id}`);
    } catch (error) {
      console.error('Error handling subscription updated:', error);
    }
  }

  // Handle subscription deleted
  async handleSubscriptionDeleted(subscription) {
    try {
      await prisma.subscription.updateMany({
        where: { stripeSubscriptionId: subscription.id },
        data: {
          status: 'canceled'
        }
      });

      console.log(`Subscription deleted: ${subscription.id}`);
    } catch (error) {
      console.error('Error handling subscription deleted:', error);
    }
  }

  // Get usage statistics with plan limits
  async getUsageStatistics(req, res) {
    try {
      const userId = req.user.id;
      const stats = await getUsageStats(userId);
      
      res.json({
        status: 200,
        message: 'Usage statistics retrieved successfully',
        data: stats
      });
    } catch (error) {
      console.error('Error getting usage statistics:', error);
      res.status(500).json({ 
        status: 500,
        error: 'Failed to get usage statistics' 
      });
    }
  }
}

module.exports = new BillingController(); 