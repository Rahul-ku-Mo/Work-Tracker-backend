const express = require("express");
const feedbackController = require("../controllers/feedback.controller");

const router = express.Router();

// Public routes - no authentication required for feedback/support
router.post("/feedback", feedbackController.submitFeedback);
router.post("/support", feedbackController.submitSupportRequest);

module.exports = router; 