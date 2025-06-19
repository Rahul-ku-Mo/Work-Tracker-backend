const express = require("express");
const router = express.Router();

const userRouter = require("./userRoutes");
const boardRouter = require("./boardRoutes");
const authRouter = require("./authRoutes");
const commentRouter = require("./commentRoutes");
const columnRouter = require("./columnRoutes");
const cardRouter = require("./cardRoutes");
const notificationRouter = require("./notificationRoutes");
const teamRouter = require("./teamRoutes");
const aiRouter = require("./ai.routes");
const { authenticateToken } = require("../utils/validation");
const userController = require("../controllers/userController");
const onboardingController = require("../controllers/onboarding.controller");
const awsRouter = require("./aws.routes");
const analyticsRouter = require("./analytics.routes");
const timeEntryRouter = require("./timeEntry.routes");
const billingRouter = require("./billing.routes");
const notesRouter = require("./notes.routes");

// Auth routes
router.use("/", authRouter);

// Public billing routes (must be before auth middleware)
router.use("/billing", billingRouter);

// AWS routes with their own auth middleware
router.use("/aws", awsRouter);

// Protected routes
router.use(authenticateToken);

//middleware to check the user exist or not!
router.use(userController.checkUserExists);

// Onboarding status check
router.get("/auth/onboarding", onboardingController.checkOnboarding);

router.use("/users", userRouter);
router.use("/boards", boardRouter);
router.use("/columns", columnRouter);
router.use("/cards", cardRouter);
router.use("/comments", commentRouter);
router.use("/notifications", notificationRouter);
router.use("/teams", teamRouter);
router.use("/ai", aiRouter);
router.use("/analytics", analyticsRouter);
router.use("/time-entries", timeEntryRouter);
router.use("/notes", notesRouter);

module.exports = router;
