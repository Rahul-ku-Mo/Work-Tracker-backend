const express = require("express");
const router = express.Router();
const analyticsController = require("../controllers/analytics.controller");
const analyticsMiddleware = require("../middleware/analytics.middleware");

// Apply middleware to validate time range for all analytics routes
router.use(analyticsMiddleware.validateTimeRange);

// Card analytics routes
router.get("/card/:cardId", analyticsController.getCardAnalytics);

// Team analytics routes
router.get("/team/:teamId", analyticsController.getTeamAnalytics);

// Board analytics routes
router.get("/board/:boardId", analyticsController.getBoardAnalytics);

// Performance metrics routes
router.post("/metrics", analyticsController.updatePerformanceMetrics);

module.exports = router;