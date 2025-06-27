const express = require("express");
const router = express.Router();
const analyticsController = require("../controllers/analytics.controller");
const analyticsMiddleware = require("../middleware/analytics.middleware");
const { requireFeature } = require("../middleware/featureGating");

// Apply middleware to validate time range and analytics feature access
router.use(analyticsMiddleware.validateTimeRange);
router.use(requireFeature('analytics'));

// Card analytics routes
router.get("/card/:cardId", analyticsController.getCardAnalytics);
router.get("/card/:cardId/time-data", analyticsController.getCardTimeData);
router.get("/card/:cardId/performance-comparison", analyticsController.getCardPerformanceComparison);

// Team analytics routes
router.get("/team/:teamId", analyticsController.getTeamAnalytics);

// Board analytics routes
router.get("/board/:boardId", analyticsController.getBoardAnalytics);

// Performance metrics routes
router.post("/metrics", analyticsController.updatePerformanceMetrics);

module.exports = router;