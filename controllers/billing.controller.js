const { PrismaClient } = require("@prisma/client");
const { getUsageStats } = require("../middleware/featureGating");
const paddleService = require("../services/paddleService");
const prisma = new PrismaClient();

class BillingController {

  // Get user's subscription status
  async getSubscriptionStatus(req, res) {
    try {
      const userId = req.user.userId;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          subscription: true,
        },
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // For users without subscription, return free plan
      if (!user.subscription) {
        return res.json({
          plan: "free",
          status: "active",
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
        });
      }

      // Convert enum values to lowercase for frontend compatibility
      const planMapping = {
        FREE: "free",
        PRO: "pro",
        ENTERPRISE: "enterprise",
        TEAM: "team"
      };

      res.json({
        plan: planMapping[user.subscription.plan] || "free",
        status: user.subscription.status || "active",
        currentPeriodEnd: user.subscription.currentPeriodEnd,
        cancelAtPeriodEnd: user.subscription.cancelAtPeriodEnd || false,
        subscriptionId: user.subscription.paddleSubscriptionId,
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

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { subscription: true },
      });

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

  // Reactivate subscription
  async reactivateSubscription(req, res) {
    try {
      const userId = req.user.userId;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { subscription: true },
      });

      // If subscription ID is missing, try to fetch it from Paddle
      if (!user.subscription?.paddleSubscriptionId && user.paddleCustomerId) {
        console.log("Missing subscription ID for reactivation, attempting to fetch from Paddle...");
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
            console.log(`Found and updated subscription ID for reactivation: ${paddleSubscription.id}`);
          }
        } catch (error) {
          console.error("Error fetching subscription ID for reactivation:", error);
        }
      }

      if (!user?.subscription?.paddleSubscriptionId) {
        return res.status(400).json({ error: "No subscription found" });
      }

      await paddleService.resumeSubscription(
        user.subscription.paddleSubscriptionId
      );

      // Update local subscription status
      await prisma.subscription.update({
        where: { userId },
        data: { cancelAtPeriodEnd: false },
      });

      res.json({ message: "Subscription reactivated successfully" });
    } catch (error) {
      console.error("Error reactivating subscription:", error);
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
      const body = req.body;

      // Verify webhook signature
      if (!paddleService.verifyWebhookSignature(body, signature)) {
        return res.status(400).json({ error: "Invalid webhook signature" });
      }

      const event = JSON.parse(body);

      switch (event.event_type) {
        case "checkout.session.completed":
          await this.handleCheckoutCompleted(event.data);
          break;
        case "subscription.canceled":
          await this.handleSubscriptionCanceled(event.data);
          break;

        case "subscription.paused":
          await this.handleSubscriptionPaused(event.data);
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

  async handleSubscriptionCanceled(data) {
    try {
      await prisma.subscription.update({
        where: { paddleSubscriptionId: data.id },
        data: {
          status: "canceled",
          cancelAtPeriodEnd: true,
        },
      });

      console.log(`Subscription canceled: ${data.id}`);
    } catch (error) {
      console.error("Error handling subscription canceled:", error);
    }
  }

  async handleSubscriptionPaused(data) {
    try {
      await prisma.subscription.update({
        where: { paddleSubscriptionId: data.id },
        data: { status: "paused" },
      });

      console.log(`Subscription paused: ${data.id}`);
    } catch (error) {
      console.error("Error handling subscription paused:", error);
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

      console.log(`Subscription resumed: ${data.id}`);
    } catch (error) {
      console.error("Error handling subscription resumed:", error);
    }
  }

  // Create subscription from frontend (for Paddle checkout completed events)
  async createSubscription(req, res) {
    try {
      const { priceId, customerId, email, billingCycle, status } = req.body;

      if (!priceId || !customerId || !email || !billingCycle || !status) {
        return res.status(400).json({
          error:
            "Missing required fields: priceId, customerId, email, billingCycle, status",
        });
      }

      if (status !== "completed") {
        return res.status(400).json({
          error: "Subscription can only be created with completed status",
        });
      }

      // Determine plan based on price ID
      let plan = "FREE";
      if (priceId === process.env.PADDLE_PRICE_ID_PRO) {
        plan = "PRO";
      } else if (priceId === process.env.PADDLE_PRICE_ID_BUSINESS) {
        plan = "ENTERPRISE";
      }

      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        return res.status(404).json({
          error: "User not found",
        });
      }

      const userId = user.id;

      // Calculate billing period dates
      const currentDate = new Date();
      const currentPeriodStart = new Date(currentDate);
      const nextBillingDate = new Date(currentDate);
      
      if (billingCycle === "monthly") {
        nextBillingDate.setMonth(currentDate.getMonth() + 1);
      } else if (billingCycle === "yearly") {
        nextBillingDate.setFullYear(currentDate.getFullYear() + 1);
      }



      // Get the Paddle subscription ID by fetching subscriptions for this customer
      let paddleSubscriptionId = null;
      try {
        console.log(`Fetching subscription for customer: ${customerId}`);
        const paddleSubscription = await paddleService.getLatestSubscriptionForCustomer(customerId);
        
        if (paddleSubscription) {
          paddleSubscriptionId = paddleSubscription.id;
          console.log(`Found subscription ID: ${paddleSubscriptionId}`);
        } else {
          console.warn(`No active subscription found for customer: ${customerId}`);
        }
      } catch (error) {
        console.error('Error fetching Paddle subscription:', error);
        // Continue without subscription ID - it can be updated later
      }

      // Create or update subscription
      const subscription = await prisma.subscription.upsert({
        where: { userId },
        update: {
          plan,
          status: "active",
          currentPeriodStart,
          currentPeriodEnd: nextBillingDate,
          cancelAtPeriodEnd: false,
          paddleSubscriptionId, // Update with the actual subscription ID
        },
        create: {
          userId,
          plan,
          status: "active",
          currentPeriodStart,
          currentPeriodEnd: nextBillingDate,
          cancelAtPeriodEnd: false,
          paddleSubscriptionId, // Set the actual subscription ID
        },
      });

      // Convert enum value to lowercase for frontend compatibility
      const planMapping = {
        FREE: "free",
        PRO: "pro",
        ENTERPRISE: "enterprise",
        TEAM: "team"
      };

      console.log(
        `Subscription created/updated for user ${userId}: ${planMapping[plan] || "free"} (${billingCycle}) with Paddle ID: ${paddleSubscriptionId}`
      );

      await prisma.user.update({
        where: { id: userId },
        data: { paddleCustomerId: customerId },
      });

      
      res.status(201).json({
        message: "Subscription created successfully",
        subscription: {
          plan: planMapping[plan] || "free",
          status: "active",
          billingCycle,
          nextBillingDate: nextBillingDate.toISOString(),
        },
      });
    } catch (error) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ error: error.message });
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

      // If subscription ID is missing, try to fetch it from Paddle
      if (!user.subscription?.paddleSubscriptionId && user.paddleCustomerId) {
        console.log("Missing subscription ID, attempting to fetch from Paddle...");
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
            console.log(`Found and updated subscription ID: ${paddleSubscription.id}`);
          }
        } catch (error) {
          console.error("Error fetching subscription ID:", error);
        }
      }

      if (!user.subscription?.paddleSubscriptionId) {
        return res.status(400).json({ error: "No active subscription found" });
      }

      // Determine the new plan based on price ID
      let newPlan = "FREE";
      if (newPriceId === process.env.PADDLE_PRICE_ID_PRO) {
        newPlan = "PRO";
      } else if (newPriceId === process.env.PADDLE_PRICE_ID_BUSINESS) {
        newPlan = "ENTERPRISE";
      }

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
      const planMapping = {
        FREE: "free",
        PRO: "pro",
        ENTERPRISE: "enterprise",
        TEAM: "team"
      };

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

  // Create billing portal session
  async createBillingPortalSession(req, res) {
    try {
      const { returnUrl } = req.body;
      const userId = req.user.userId;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { paddleCustomerId: true },
      });

      if (!user?.paddleCustomerId) {
        return res.status(400).json({ error: "No billing account found" });
      }

      const portalUrl = await paddleService.getCustomerPortalUrl(
        user.paddleCustomerId,
        returnUrl || `${process.env.FRONTEND_URL}/billing`
      );

      res.json({ url: portalUrl });
    } catch (error) {
      console.error("Error creating billing portal session:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // Test Paddle configuration (development only)
  async testPaddleConfig(req, res) {
    try {
      const config = {
        hasApiKey: !!process.env.PADDLE_API_KEY_SB,
        environment: process.env.PADDLE_ENVIRONMENT_SB || "sandbox",
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

  // Fix missing subscription IDs (utility method)
  async fixMissingSubscriptionIds(req, res) {
    try {
      // Find all subscriptions with null paddleSubscriptionId but have paddleCustomerId
      const usersWithMissingSubIds = await prisma.user.findMany({
        where: {
          paddleCustomerId: {
            not: null,
          },
          subscription: {
            paddleSubscriptionId: null,
            status: "active",
          },
        },
        include: {
          subscription: true,
        },
      });

      console.log(`Found ${usersWithMissingSubIds.length} users with missing subscription IDs`);

      const fixedCount = [];

      for (const user of usersWithMissingSubIds) {
        try {
          console.log(`Fixing subscription ID for user ${user.id} with customer ID ${user.paddleCustomerId}`);
          
          const paddleSubscription = await paddleService.getLatestSubscriptionForCustomer(user.paddleCustomerId);
          
          if (paddleSubscription) {
            await prisma.subscription.update({
              where: { userId: user.id },
              data: { paddleSubscriptionId: paddleSubscription.id },
            });
            
            fixedCount.push({
              userId: user.id,
              email: user.email,
              subscriptionId: paddleSubscription.id,
            });
            
            console.log(`Fixed subscription ID for user ${user.id}: ${paddleSubscription.id}`);
          } else {
            console.warn(`No active subscription found for customer ${user.paddleCustomerId}`);
          }
        } catch (error) {
          console.error(`Error fixing subscription for user ${user.id}:`, error);
        }
      }

      res.json({
        message: `Fixed ${fixedCount.length} subscription IDs`,
        fixed: fixedCount,
        totalProcessed: usersWithMissingSubIds.length,
      });
    } catch (error) {
      console.error("Error fixing missing subscription IDs:", error);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new BillingController();
