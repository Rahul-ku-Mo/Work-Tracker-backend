const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billing.controller');
const { authenticateToken } = require('../utils/validation'); // Use the correct auth middleware

// Public webhook endpoint (no auth required)
router.post('/webhook', billingController.handleWebhook);

// Get available plans (public)
router.get('/plans', billingController.getPlans);

// Protected routes (require authentication)
router.use(authenticateToken); // Apply auth middleware to all routes below

// Get user's subscription status
router.get('/subscription', billingController.getSubscriptionStatus);

// Update subscription (upgrade/downgrade)
router.patch('/subscription', billingController.updateSubscription);

// Cancel subscription
router.post('/cancel-subscription', billingController.cancelSubscription);

// Get usage statistics
router.get('/usage-stats', billingController.getUsageStatistics);

// Test Paddle configuration (protected - for debugging when authenticated)
router.get('/test-paddle-config', billingController.testPaddleConfig);

// Create Paddle customer for existing users (protected)
router.post('/create-customer', billingController.createCustomerForExistingUser);

module.exports = router; 