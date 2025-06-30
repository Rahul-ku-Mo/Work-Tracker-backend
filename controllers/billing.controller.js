const { PrismaClient } = require("@prisma/client");
const { getUsageStats } = require("../middleware/featureGating");
const paddleService = require("../services/paddleService");
const prisma = new PrismaClient();

class BillingController {

  // Helper methods to eliminate repetitive code
  getPlanMapping() {
    return {
      FREE: "free",
      PRO: "pro",
      ENTERPRISE: "enterprise",
      TEAM: "team"
    };
  }

  async getUserWithSubscription(userId) {
    return await prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });
  }

  async getSubscriptionByPaddleId(paddleSubscriptionId) {
    return await prisma.subscription.findUnique({
      where: { paddleSubscriptionId },
      include: { user: true },
    });
  }

  determinePlanFromPriceId(priceId) {
    if (priceId === process.env.PADDLE_PRICE_ID_PRO) {
      return "PRO";
    } else if (priceId === process.env.PADDLE_PRICE_ID_BUSINESS) {
      return "ENTERPRISE";
    }
    return "FREE";
  }

  async updateSubscriptionStatus(paddleSubscriptionId, statusData) {
    return await prisma.subscription.update({
      where: { paddleSubscriptionId },
      data: statusData,
    });
  }

  async updateUserAccess(userId, isPaidUser) {
    return await prisma.user.update({
      where: { id: userId },
      data: { isPaidUser },
    });
  }

  // Get user's subscription status with access control
  async getSubscriptionStatus(req, res) {
    try {
      const userId = req.user.userId;
      const user = await this.getUserWithSubscription(userId);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // For users without subscription, return free plan
      if (!user.subscription) {
        return res.json({
          plan: "free",
          status: "active",
          currentPeriodStart: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          accessRestricted: false,
        });
      }

      const planMapping = this.getPlanMapping();
      const isAccessRestricted = user.subscription.status === "past_due" || 
                                user.subscription.status === "canceled";

      res.json({
        plan: planMapping[user.subscription.plan] || "free",
        status: user.subscription.status || "active",
        currentPeriodStart: user.subscription.currentPeriodStart,
        currentPeriodEnd: user.subscription.currentPeriodEnd,
        cancelAtPeriodEnd: user.subscription.cancelAtPeriodEnd || false,
        subscriptionId: user.subscription.paddleSubscriptionId,
        accessRestricted: isAccessRestricted,
        trialExpired: user.subscription.status === "past_due" && !user.isPaidUser,
      });
    } catch (error) {
      console.error("Error getting subscription status:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // Cancel subscription
  async cancelSubscription(req, res) {
    try {
      const userId = req.user.userId;
      const user = await this.getUserWithSubscription(userId);

      // If subscription ID is missing, try to fetch it from Paddle
      if (!user.subscription?.paddleSubscriptionId && user.paddleCustomerId) {
        console.log("Missing subscription ID for cancellation, attempting to fetch from Paddle...");
        try {
          const paddleSubscription = await paddleService.getLatestSubscriptionForCustomer(user.paddleCustomerId);
          if (paddleSubscription) {
            // Update the subscription with the found ID
            await prisma.subscription.update({
              where: { userId },
              data: { paddleSubscriptionId: paddleSubscription.id },
            });
            // Refresh user data
            const updatedUser = await prisma.user.findUnique({
              where: { id: userId },
              include: { subscription: true },
            });
            user.subscription = updatedUser.subscription;
            console.log(`Found and updated subscription ID for cancellation: ${paddleSubscription.id}`);
          }
        } catch (error) {
          console.error("Error fetching subscription ID for cancellation:", error);
        }
      }

      if (!user?.subscription?.paddleSubscriptionId) {
        return res.status(400).json({ error: "No active subscription found" });
      }

      await paddleService.cancelSubscription(
        user.subscription.paddleSubscriptionId
      );

      // Update local subscription status
      await prisma.subscription.update({
        where: { userId },
        data: { cancelAtPeriodEnd: true },
      });

      res.json({ message: "Subscription canceled successfully" });
    } catch (error) {
      console.error("Error canceling subscription:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // Get available plans
  async getPlans(req, res) {
    try {
      const plans = [
        {
          id: "free",
          name: "Free Trial",
          description: "Perfect for trying out PulseBoard",
          price: 0,
          currency: "usd",
          interval: "month",
          trialDays: 14,
          features: [
            "5 projects",
            "15 team members",
            "100 tasks per project",
            "1GB storage",
            "Basic task management",
            "7-day activity history",
            "Community support",
            "14-day free trial",
          ],
          limits: {
            projects: 5,
            members: 15,
            tasksPerProject: 100,
            storageGB: 1,
            activityHistoryDays: 7,
          },
          popular: false,
        },
        {
          id: "pro",
          name: "Professional",
          description: "For growing teams and businesses",
          price: 9.99,
          currency: "usd",
          interval: "month",
          paddlePrice: process.env.PADDLE_PRICE_ID_PRO,
          features: [
            "15 projects",
            "100 team members",
            "Unlimited tasks",
            "10GB storage",
            "Advanced task management",
            "Team collaboration features",
            "30-day activity history",
            "Priority email support",
            "Advanced analytics",
            "Custom project templates",
          ],
          limits: {
            projects: 15,
            members: 100,
            tasksPerProject: -1, // unlimited
            storageGB: 10,
            activityHistoryDays: 30,
          },
          popular: true,
        },
        {
          id: "enterprise",
          name: "Business",
          description: "For larger teams with advanced needs",
          price: 29.99,
          currency: "usd",
          interval: "month",
          paddlePrice: process.env.PADDLE_PRICE_ID_BUSINESS,
          features: [
            "Unlimited projects",
            "Unlimited team members",
            "Unlimited tasks",
            "100GB storage",
            "Full feature access",
            "Advanced team collaboration",
            "Unlimited activity history",
            "24/7 phone & email support",
            "Advanced analytics & reporting",
            "Custom integrations",
            "SSO & advanced security",
            "Dedicated account manager",
          ],
          limits: {
            projects: -1, // unlimited
            members: -1, // unlimited
            tasksPerProject: -1, // unlimited
            storageGB: 100,
            activityHistoryDays: -1, // unlimited
          },
          popular: false,
        },
      ];

      res.json(plans);
    } catch (error) {
      console.error("Error getting plans:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // Handle Paddle webhooks
  async handleWebhook(req, res) {
    try {
      const signature = req.headers["paddle-signature"];
      // Convert Buffer to string for signature verification and JSON parsing
      const bodyString = req.body.toString('utf8');
      
      // Verify webhook signature
      if (!paddleService.verifyWebhookSignature(bodyString, signature)) {
        return res.status(400).json({ error: "Invalid webhook signature" });
      }

      const event = JSON.parse(bodyString);

      switch (event.event_type) {
        case "checkout.session.completed":
          await this.handleCheckoutCompleted(event.data);
          break;
        case "subscription.canceled":
          await this.handleSubscriptionCanceled(event.data);
          break;
        case "subscription.created":
          await this.handleSubscriptionCreated(event.data);
          break;
        case "subscription.past_due":
          await this.handleSubscriptionPastDue(event.data);
          break;
        case "transaction.payment_failed":
          await this.handlePaymentFailed(event.data);
          break;
        case "transaction.past_due":
          await this.handleTransactionPastDue(event.data);
          break;
        case "transaction.completed":
          await this.handleTransactionCompleted(event.data);
          break;
        case "subscription.resumed":
          await this.handleSubscriptionResumed(event.data);
          break;

        default:
          console.log(`Unhandled webhook event: ${event.event_type}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error("Error handling webhook:", error);
      res.status(500).json({ error: error.message });
    }
  }

  async handleSubscriptionCreated(data) {
   try {
     const newSubscriptionId = data.id;
     const customerId = data.customer_id;

     const user = await prisma.user.findUnique({
      where: { paddleCustomerId: customerId },
     });

     if (!user) {
      console.log("User not found for customer:", customerId);
      return;
     }

     // Determine plan based on subscription items
     let plan = "PRO"; // Default fallback
     if (data.items && data.items.length > 0) {
       const priceId = data.items[0].price.id;
       plan = this.determinePlanFromPriceId(priceId);
     }

     // Get billing period dates
     const currentPeriodStart = new Date(data.current_billing_period?.starts_at || data.started_at);
     const currentPeriodEnd = new Date(data.current_billing_period?.ends_at || data.next_billed_at);

     await prisma.subscription.upsert({
      where: { userId: user.id },
      update: { 
        paddleSubscriptionId: newSubscriptionId, 
        status: data.status || "active",
        plan: plan,
        currentPeriodStart: currentPeriodStart,
        currentPeriodEnd: currentPeriodEnd,
        cancelAtPeriodEnd: false
      },
      create: {
        userId: user.id,
        paddleSubscriptionId: newSubscriptionId,
        status: data.status || "active",
        plan: plan,
        currentPeriodStart: currentPeriodStart,
        currentPeriodEnd: currentPeriodEnd,
        cancelAtPeriodEnd: false
      }
     });

     console.log(`Subscription created successfully: ${newSubscriptionId} (Plan: ${plan})`);
   } catch (error) {
     console.error("Error handling subscription created:", error);
   }
  }

  async handleSubscriptionCanceled(data) {
    try {
      await prisma.subscription.update({
        where: { paddleSubscriptionId: data.id },
        data: {
          status: "canceled",
          cancelAtPeriodEnd: true,
        },
      });

      // Revoke user's paid access
      await this.revokeUserAccess(data.id, "Subscription canceled");

      console.log(`Subscription canceled: ${data.id}`);
    } catch (error) {
      console.error("Error handling subscription canceled:", error);
    }
  }

  async handlePaymentFailed(data) {
    try {
      console.log(`Payment failed for transaction: ${data.id}`);
      
      // If this is related to a subscription, revoke access
      if (data.subscription_id) {
        await prisma.subscription.update({
          where: { paddleSubscriptionId: data.subscription_id },
          data: {
            status: "past_due",
          },
        });

        await this.revokeUserAccess(data.subscription_id, "Payment failed");
        console.log(`Access revoked for subscription ${data.subscription_id} due to payment failure`);
      }
    } catch (error) {
      console.error("Error handling payment failed:", error);
    }
  }

  async handleTransactionPastDue(data) {
    try {
      console.log(`Transaction past due: ${data.id}`);
      
      // If this is related to a subscription, revoke access
      if (data.subscription_id) {
        await prisma.subscription.update({
          where: { paddleSubscriptionId: data.subscription_id },
          data: {
            status: "past_due",
          },
        });

        await this.revokeUserAccess(data.subscription_id, "Transaction past due");
        console.log(`Access revoked for subscription ${data.subscription_id} due to past due transaction`);
      }
    } catch (error) {
      console.error("Error handling transaction past due:", error);
    }
  }

  async handleSubscriptionPastDue(data) {
    try {
      await prisma.subscription.update({
        where: { paddleSubscriptionId: data.id },
        data: {
          status: "past_due",
        },
      });

      await this.revokeUserAccess(data.id, "Subscription past due");
      console.log(`Subscription past due: ${data.id}`);
    } catch (error) {
      console.error("Error handling subscription past due:", error);
    }
    }

  async handleTransactionCompleted(data) {
    try {
      console.log(`Transaction completed: ${data.id}`);
      
      // If this is related to a subscription, restore access
      if (data.subscription_id) {
        await prisma.subscription.update({
          where: { paddleSubscriptionId: data.subscription_id },
          data: {
            status: "active",
          },
        });

        await this.restoreUserAccess(data.subscription_id, "Payment completed");
        console.log(`Access restored for subscription ${data.subscription_id} - payment completed`);
      }
    } catch (error) {
      console.error("Error handling transaction completed:", error);
    }
  }

  async handleSubscriptionResumed(data) {
    try {
      await prisma.subscription.update({
        where: { paddleSubscriptionId: data.id },
        data: {
          status: "active",
          cancelAtPeriodEnd: false,
        },
      });

      await this.restoreUserAccess(data.id, "Subscription resumed");
      console.log(`Subscription resumed: ${data.id}`);
    } catch (error) {
      console.error("Error handling subscription resumed:", error);
    }
  }

  // Helper method to revoke user access
  async revokeUserAccess(subscriptionId, reason) {
    try {
      const subscription = await this.getSubscriptionByPaddleId(subscriptionId);

      if (!subscription) {
        console.log(`No subscription found for ID: ${subscriptionId}`);
        return;
      }

      await this.updateUserAccess(subscription.userId, false);
      console.log(`✅ Access revoked for user ${subscription.user.email} - Reason: ${reason}`);
    } catch (error) {
      console.error("Error revoking user access:", error);
    }
  }

  // Helper method to restore user access
  async restoreUserAccess(subscriptionId, reason) {
    try {
      const subscription = await this.getSubscriptionByPaddleId(subscriptionId);

      if (!subscription) {
        console.log(`No subscription found for ID: ${subscriptionId}`);
        return;
      }

      await this.updateUserAccess(subscription.userId, true);
      console.log(`✅ Access restored for user ${subscription.user.email} - Reason: ${reason}`);
    } catch (error) {
      console.error("Error restoring user access:", error);
    }
  }


  // Get usage statistics for current user
  async getUsageStatistics(req, res) {
    try {
      const userId = req.user.userId;
      const stats = await getUsageStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error getting usage statistics:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // Upgrade or downgrade subscription
  async updateSubscription(req, res) {
    try {
      const { newPriceId, prorationBillingMode = 'prorated_immediately' } = req.body;
      const userId = req.user.userId;


      if (!newPriceId) {
        return res.status(400).json({ error: "New price ID is required" });
      }

      // Get user's current subscription
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { subscription: true },
      });
      console.log("User subscription", user.subscription);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (!user.subscription?.paddleSubscriptionId) {
        return res.status(404).json({ error: "No active subscription found" });
      }

      // Determine the new plan based on price ID
      const newPlan = this.determinePlanFromPriceId(newPriceId);

      // Update subscription in Paddle
      console.log("Updating subscription in Paddle");
      const updatedSubscription = await paddleService.updateSubscription(
        user.subscription.paddleSubscriptionId,
        newPriceId,
        prorationBillingMode
      );

      console.log("Updated subscription in Paddle", updatedSubscription);

      // Update local subscription record
      await prisma.subscription.update({
        where: { userId },
        data: {
          plan: newPlan,
          status: "active",
          cancelAtPeriodEnd: false,
          // Keep the current period dates as Paddle manages them
        },
      });

      // Convert enum value to lowercase for frontend compatibility
      const planMapping = this.getPlanMapping();

      console.log(
        `Subscription updated for user ${userId}: ${planMapping[newPlan] || "free"}`
      );

      res.json({
        message: "Subscription updated successfully",
        subscription: {
          plan: planMapping[newPlan] || "free",
          status: "active",
          subscriptionId: user.subscription.paddleSubscriptionId,
        },
      });
    } catch (error) {
      console.error("Error updating subscription:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // Test Paddle configuration (development only)
  async testPaddleConfig(req, res) {
    try {
      const config = {
        hasApiKey: !!process.env.PADDLE_API_KEY,
        environment: process.env.PADDLE_ENVIRONMENT || "sandbox",
        hasProPriceId: !!process.env.PADDLE_PRICE_ID_PRO,
        hasBusinessPriceId: !!process.env.PADDLE_PRICE_ID_BUSINESS,
        frontendUrl: process.env.FRONTEND_URL,
        proPriceId: process.env.PADDLE_PRICE_ID_PRO || "NOT_SET",
        businessPriceId: process.env.PADDLE_PRICE_ID_BUSINESS || "NOT_SET",
      };

      console.log("🧪 Paddle Configuration Test:", config);

      if (!config.hasApiKey) {
        return res.status(500).json({
          error: "Paddle API key not configured",
          config,
        });
      }

      // Try to make a simple API call to test connection
      const connectionTest = await paddleService.testConnection();
      config.paddleApiWorking = connectionTest.success;
      if (!connectionTest.success) {
        config.paddleError = connectionTest.error;
        config.paddleErrorCode = connectionTest.code;
        config.paddleErrorDetail = connectionTest.detail;
      }

      res.json({
        message: "Paddle configuration test",
        config,
        recommendations: [
          !config.hasApiKey && "Set PADDLE_API_KEY environment variable",
          !config.hasProPriceId &&
            "Set PADDLE_PRICE_ID_PRO environment variable",
          !config.hasBusinessPriceId &&
            "Set PADDLE_PRICE_ID_BUSINESS environment variable",
          !config.frontendUrl && "Set FRONTEND_URL environment variable",
          !config.paddleApiWorking &&
            "Check if Paddle API key is valid and has correct permissions",
        ].filter(Boolean),
      });
    } catch (error) {
      console.error("Error testing Paddle config:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // Create Paddle customer for existing users who don't have one
  async createCustomerForExistingUser(req, res) {
    try {
      const userId = req.user.userId;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          paddleCustomerId: true
        }
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // If user already has a Paddle customer ID, return it
      if (user.paddleCustomerId) {
        return res.json({
          message: "User already has a Paddle customer ID",
          paddleCustomerId: user.paddleCustomerId
        });
      }

      // Create Paddle customer
      const paddleCustomerId = await paddleService.createCustomer({
        email: user.email,
        name: user.name,
        userId: user.id
      });

      // Update user with Paddle customer ID
      await prisma.user.update({
        where: { id: userId },
        data: { paddleCustomerId }
      });

      console.log(`✅ Created Paddle customer ${paddleCustomerId} for existing user ${user.email}`);

      res.json({
        message: "Paddle customer created successfully",
        paddleCustomerId
      });
    } catch (error) {
      console.error("Error creating Paddle customer for existing user:", error);
      res.status(500).json({ error: error.message });
    }
  }
}

// Create the controller instance
const billingController = new BillingController();

// Bind all methods to ensure they're accessible with correct context
billingController.getSubscriptionStatus = billingController.getSubscriptionStatus.bind(billingController);
billingController.cancelSubscription = billingController.cancelSubscription.bind(billingController);
billingController.getPlans = billingController.getPlans.bind(billingController);
billingController.handleWebhook = billingController.handleWebhook.bind(billingController);
billingController.getUsageStatistics = billingController.getUsageStatistics.bind(billingController);
billingController.updateSubscription = billingController.updateSubscription.bind(billingController);
billingController.testPaddleConfig = billingController.testPaddleConfig.bind(billingController);
billingController.createCustomerForExistingUser = billingController.createCustomerForExistingUser.bind(billingController);

module.exports = billingController;
