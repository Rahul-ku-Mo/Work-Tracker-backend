const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billing.controller');
const auth = require('../middleware/auth'); // Assuming you have auth middleware

// Public webhook endpoint (no auth required)
router.post('/webhook', express.raw({ type: 'application/json' }), billingController.handleWebhook);

// Get available plans (public)
router.get('/plans', billingController.getPlans);

// Protected routes (require authentication)
router.use(auth); // Apply auth middleware to all routes below

// Get user's subscription status
router.get('/subscription', billingController.getSubscriptionStatus);

// Create checkout session for subscription
router.post('/create-checkout-session', billingController.createCheckoutSession);

// Create billing portal session
router.post('/create-portal-session', billingController.createBillingPortalSession);

// Cancel subscription
router.post('/cancel-subscription', billingController.cancelSubscription);

// Reactivate subscription
router.post('/reactivate-subscription', billingController.reactivateSubscription);

// Get usage statistics
router.get('/usage-stats', billingController.getUsageStatistics);

module.exports = router; 