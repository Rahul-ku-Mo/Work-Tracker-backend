const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billing.controller');
const { authenticateToken } = require('../utils/validation'); // Use the correct auth middleware

// Public webhook endpoint (no auth required)
router.post('/webhook', express.raw({ type: 'application/json' }), billingController.handleWebhook);

// Get available plans (public)
router.get('/plans', billingController.getPlans);

// Protected routes (require authentication)
router.use(authenticateToken); // Apply auth middleware to all routes below

// Get user's subscription status
router.get('/subscription', billingController.getSubscriptionStatus);

// Create subscription (from Paddle checkout completed)
router.post('/subscription', billingController.createSubscription);

// Update subscription (upgrade/downgrade)
router.patch('/subscription', billingController.updateSubscription);

// Cancel subscription
router.post('/cancel-subscription', billingController.cancelSubscription);

// Create billing portal session
router.post('/billing-portal', billingController.createBillingPortalSession);

// Get usage statistics
router.get('/usage-stats', billingController.getUsageStatistics);

// Test Paddle configuration (protected - for debugging when authenticated)
router.get('/test-paddle-config', billingController.testPaddleConfig);

// Fix missing subscription IDs (utility method - for maintenance)
router.post('/fix-missing-subscription-ids', billingController.fixMissingSubscriptionIds);

module.exports = router; 