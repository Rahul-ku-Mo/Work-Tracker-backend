const { PrismaClient } = require('@prisma/client');
const { getUsageStats } = require('../middleware/featureGating');
const paddleService = require('../services/paddleService');
const prisma = new PrismaClient();

class BillingController {
  // Create checkout session for subscription
  async createCheckoutSession(req, res) {
    try {
      const { priceId, successUrl, cancelUrl } = req.body;
      const userId = req.user.userId;

      if (!priceId) {
        return res.status(400).json({ error: 'Price ID is required' });
      }

      // Get or create user
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, paddleCustomerId: true }
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Create Paddle customer if not exists
      let customerId = user.paddleCustomerId;
      if (!customerId) {
        customerId = await paddleService.createCustomer({
          email: user.email,
          name: user.name || user.email.split('@')[0],
          userId: user.id
        });

        // Save customer ID to user
        await prisma.user.update({
          where: { id: userId },
          data: { paddleCustomerId: customerId }
        });
      }

      // Create checkout session
      const checkout = await paddleService.createCheckoutSession({
        priceId,
        customerId,
        successUrl: successUrl || `${process.env.FRONTEND_URL}/billing?success=true`,
        cancelUrl: cancelUrl || `${process.env.FRONTEND_URL}/billing?canceled=true`
      });
      res.json({ url: checkout.url });
    } catch (error) {
      console.error('Error creating checkout session:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Create billing portal session
  async createBillingPortalSession(req, res) {
    try {
      const { returnUrl } = req.body;
      const userId = req.user.userId;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { paddleCustomerId: true }
      });

      if (!user?.paddleCustomerId) {
        return res.status(400).json({ error: 'No billing account found' });
      }

      const portalUrl = await paddleService.getCustomerPortalUrl(
        user.paddleCustomerId,
        returnUrl || `${process.env.FRONTEND_URL}/billing`
      );

      res.json({ url: portalUrl });
    } catch (error) {
      console.error('Error creating billing portal session:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Get user's subscription status
  async getSubscriptionStatus(req, res) {
    try {
      const userId = req.user.userId;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          subscription: true
        }
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // For users without subscription, return free plan
      if (!user.subscription) {
        return res.json({
          plan: 'free',
          status: 'active',
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false
        });
      }

      res.json({
        plan: user.subscription.plan || 'free',
        status: user.subscription.status || 'active',
        currentPeriodEnd: user.subscription.currentPeriodEnd,
        cancelAtPeriodEnd: user.subscription.cancelAtPeriodEnd || false,
        subscriptionId: user.subscription.paddleSubscriptionId
      });
    } catch (error) {
      console.error('Error getting subscription status:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Cancel subscription
  async cancelSubscription(req, res) {
    try {
      const userId = req.user.userId;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { subscription: true }
      });

      if (!user?.subscription?.paddleSubscriptionId) {
        return res.status(400).json({ error: 'No active subscription found' });
      }

      await paddleService.cancelSubscription(user.subscription.paddleSubscriptionId);

      // Update local subscription status
      await prisma.subscription.update({
        where: { userId },
        data: { cancelAtPeriodEnd: true }
      });

      res.json({ message: 'Subscription canceled successfully' });
    } catch (error) {
      console.error('Error canceling subscription:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Reactivate subscription
  async reactivateSubscription(req, res) {
    try {
      const userId = req.user.userId;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { subscription: true }
      });

      if (!user?.subscription?.paddleSubscriptionId) {
        return res.status(400).json({ error: 'No subscription found' });
      }

      await paddleService.resumeSubscription(user.subscription.paddleSubscriptionId);

      // Update local subscription status
      await prisma.subscription.update({
        where: { userId },
        data: { cancelAtPeriodEnd: false }
      });

      res.json({ message: 'Subscription reactivated successfully' });
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
          trialDays: 14,
          features: [
            '5 projects',
            '15 team members',
            '100 tasks per project',
            '1GB storage',
            'Basic task management',
            '7-day activity history',
            'Community support',
            '14-day free trial'
          ],
          limits: {
            projects: 5,
            members: 15,
            tasksPerProject: 100,
            storageGB: 1,
            activityHistoryDays: 7
          },
          popular: false
        },
        {
          id: 'pro',
          name: 'Professional',
          description: 'For growing teams and businesses',
          price: 9.99,
          currency: 'usd',
          interval: 'month',
          paddlePrice: process.env.PADDLE_PRICE_ID_PRO,
          features: [
            '15 projects',
            '100 team members',
            'Unlimited tasks',
            '10GB storage',
            'Advanced task management',
            'Team collaboration features',
            '30-day activity history',
            'Priority email support',
            'Advanced analytics',
            'Custom project templates'
          ],
          limits: {
            projects: 15,
            members: 100,
            tasksPerProject: -1, // unlimited
            storageGB: 10,
            activityHistoryDays: 30
          },
          popular: true
        },
        {
          id: 'enterprise',
          name: 'Business',
          description: 'For larger teams with advanced needs',
          price: 29.99,
          currency: 'usd',
          interval: 'month',
          paddlePrice: process.env.PADDLE_PRICE_ID_BUSINESS,
          features: [
            'Unlimited projects',
            'Unlimited team members',
            'Unlimited tasks',
            '100GB storage',
            'Full feature access',
            'Advanced team collaboration',
            'Unlimited activity history',
            '24/7 phone & email support',
            'Advanced analytics & reporting',
            'Custom integrations',
            'SSO & advanced security',
            'Dedicated account manager'
          ],
          limits: {
            projects: -1, // unlimited
            members: -1, // unlimited
            tasksPerProject: -1, // unlimited
            storageGB: 100,
            activityHistoryDays: -1 // unlimited
          },
          popular: false
        }
      ];

      res.json(plans);
    } catch (error) {
      console.error('Error getting plans:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Handle Paddle webhooks
  async handleWebhook(req, res) {
    try {
      const signature = req.headers['paddle-signature'];
      const body = req.body;

      // Verify webhook signature
      if (!paddleService.verifyWebhookSignature(body, signature)) {
        return res.status(400).json({ error: 'Invalid webhook signature' });
      }

      const event = JSON.parse(body);

      switch (event.event_type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data);
          break;
        
        case 'subscription.created':
          await this.handleSubscriptionCreated(event.data);
          break;

        case 'subscription.updated':
          await this.handleSubscriptionUpdated(event.data);
          break;

        case 'subscription.canceled':
          await this.handleSubscriptionCanceled(event.data);
          break;

        case 'subscription.paused':
          await this.handleSubscriptionPaused(event.data);
          break;

        case 'subscription.resumed':
          await this.handleSubscriptionResumed(event.data);
          break;

        default:
          console.log(`Unhandled webhook event: ${event.event_type}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Error handling webhook:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Webhook handlers
  async handleCheckoutCompleted(data) {
    // Initial checkout completion - subscription will be created in separate event
    console.log('Checkout completed:', data.id);
  }

  async handleSubscriptionCreated(data) {
    try {
      const userId = data.custom_data?.user_id;
      if (!userId) {
        console.error('No user ID in subscription data');
        return;
      }

      // Determine plan based on price ID
      let plan = 'free';
      if (data.items?.length > 0) {
        const priceId = data.items[0].price.id;
        if (priceId === process.env.PADDLE_PRICE_ID_PRO) {
          plan = 'pro';
        } else if (priceId === process.env.PADDLE_PRICE_ID_BUSINESS) {
          plan = 'enterprise';
        }
      }

      // Create or update subscription
      await prisma.subscription.upsert({
        where: { userId },
        update: {
          plan,
          status: data.status,
          paddleSubscriptionId: data.id,
          currentPeriodEnd: new Date(data.current_billing_period?.ends_at),
          cancelAtPeriodEnd: false
        },
        create: {
          userId,
          plan,
          status: data.status,
          paddleSubscriptionId: data.id,
          currentPeriodEnd: new Date(data.current_billing_period?.ends_at),
          cancelAtPeriodEnd: false
        }
      });

      console.log(`Subscription created for user ${userId}: ${plan}`);
    } catch (error) {
      console.error('Error handling subscription created:', error);
    }
  }

  async handleSubscriptionUpdated(data) {
    try {
      await prisma.subscription.update({
        where: { paddleSubscriptionId: data.id },
        data: {
          status: data.status,
          currentPeriodEnd: new Date(data.current_billing_period?.ends_at)
        }
      });

      console.log(`Subscription updated: ${data.id}`);
    } catch (error) {
      console.error('Error handling subscription updated:', error);
    }
  }

  async handleSubscriptionCanceled(data) {
    try {
      await prisma.subscription.update({
        where: { paddleSubscriptionId: data.id },
        data: {
          status: 'canceled',
          cancelAtPeriodEnd: true
        }
      });

      console.log(`Subscription canceled: ${data.id}`);
    } catch (error) {
      console.error('Error handling subscription canceled:', error);
    }
  }

  async handleSubscriptionPaused(data) {
    try {
      await prisma.subscription.update({
        where: { paddleSubscriptionId: data.id },
        data: { status: 'paused' }
      });

      console.log(`Subscription paused: ${data.id}`);
    } catch (error) {
      console.error('Error handling subscription paused:', error);
    }
  }

  async handleSubscriptionResumed(data) {
    try {
      await prisma.subscription.update({
        where: { paddleSubscriptionId: data.id },
        data: { 
          status: 'active',
          cancelAtPeriodEnd: false
        }
      });

      console.log(`Subscription resumed: ${data.id}`);
    } catch (error) {
      console.error('Error handling subscription resumed:', error);
    }
  }

  // Get usage statistics for current user
  async getUsageStatistics(req, res) {
    try {
      const userId = req.user.userId;
      const stats = await getUsageStats(userId);
      res.json(stats);
    } catch (error) {
      console.error('Error getting usage statistics:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Test Paddle configuration (development only)
  async testPaddleConfig(req, res) {
    try {
      const config = {
        hasApiKey: !!process.env.PADDLE_API_KEY,
        environment: process.env.PADDLE_ENVIRONMENT || 'sandbox',
        hasProPriceId: !!process.env.PADDLE_PRICE_ID_PRO,
        hasBusinessPriceId: !!process.env.PADDLE_PRICE_ID_BUSINESS,
        frontendUrl: process.env.FRONTEND_URL,
        proPriceId: process.env.PADDLE_PRICE_ID_PRO || 'NOT_SET',
        businessPriceId: process.env.PADDLE_PRICE_ID_BUSINESS || 'NOT_SET'
      };

      console.log('🧪 Paddle Configuration Test:', config);

      if (!config.hasApiKey) {
        return res.status(500).json({ 
          error: 'Paddle API key not configured',
          config 
        });
      }

      // Try to make a simple API call to test connection
      try {
        await paddleService.paddle.products.list({ per_page: 1 });
        config.paddleApiWorking = true;
      } catch (error) {
        config.paddleApiWorking = false;
        config.paddleError = error.message;
      }

      res.json({
        message: 'Paddle configuration test',
        config,
        recommendations: [
          !config.hasApiKey && 'Set PADDLE_API_KEY environment variable',
          !config.hasProPriceId && 'Set PADDLE_PRICE_ID_PRO environment variable',
          !config.hasBusinessPriceId && 'Set PADDLE_PRICE_ID_BUSINESS environment variable',
          !config.frontendUrl && 'Set FRONTEND_URL environment variable',
          !config.paddleApiWorking && 'Check if Paddle API key is valid and has correct permissions'
        ].filter(Boolean)
      });
    } catch (error) {
      console.error('Error testing Paddle config:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new BillingController(); 