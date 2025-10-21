const express = require("express");
const router = express.Router();

const userRouter = require("./userRoutes");
const workspaceRouter = require("./workspace.routes");
const authRouter = require("./authRoutes");
const commentRouter = require("./commentRoutes");
const columnRouter = require("./column.routes");
const cardRouter = require("./cardRoutes");
const notificationRouter = require("./notification.routes");
const teamRouter = require("./team.routes");
const aiRouter = require("./ai.routes");
const { authenticateToken } = require("../utils/validation");
const userController = require("../controllers/userController");
const onboardingController = require("../controllers/onboarding.controller");
const awsRouter = require("./aws.routes");
const analyticsRouter = require("./analytics.routes");
const timeEntryRouter = require("./timeEntry.routes");
const billingRouter = require("./billing.routes");
const notesRouter = require("./notes.routes");
const feedbackRouter = require("./feedback.routes");
const projectRouter = require("./project.routes");
const labelRouter = require("./label.routes");
const milestoneRouter = require("./milestone.routes");

// Auth routes
router.use("/", authRouter);

// Public billing routes (must be before auth middleware)
router.use("/billing", billingRouter);

// Public feedback routes (no auth required)
router.use("/", feedbackRouter);

// AWS routes with their own auth middleware
router.use("/aws", awsRouter);

// Protected routes
router.use(authenticateToken);

//middleware to check the user exist or not!
router.use(userController.checkUserExists);

// Onboarding status check
router.get("/auth/onboarding", onboardingController.checkOnboarding);

router.use("/users", userRouter);
router.use("/workspaces", workspaceRouter);
// Columns are now managed through workspace routes: /workspaces/:teamId/:slug/columns
router.use("/columns", columnRouter);
router.use("/cards", cardRouter);
router.use("/comments", commentRouter);
router.use("/notifications", notificationRouter);
router.use("/teams", teamRouter);
router.use("/ai", aiRouter);
router.use("/analytics", analyticsRouter);
router.use("/time-entries", timeEntryRouter);
router.use("/notes", notesRouter);
router.use("/projects", projectRouter);
router.use("/labels", labelRouter);
router.use("/milestones", milestoneRouter);

module.exports = router;
