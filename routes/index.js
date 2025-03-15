const express = require("express");
const router = express.Router();

const userRouter = require("./userRoutes");
const boardRouter = require("./boardRoutes");
const authRouter = require("./authRoutes");
const commentRouter = require("./commentRoutes");
const columnRouter = require("./columnRoutes");
const cardRouter = require("./cardRoutes");
const notificationRouter = require("./notificationRoutes");
const teamRouter = require("./team.routes");
const aiRouter = require("./ai.routes");
const { authenticateToken } = require("../utils/validation");
const userController = require("../controllers/userController");
const onboardingController = require("../controllers/onboarding.controller");
const awsRouter = require("./aws.routes");
// Auth routes
router.use("/", authRouter);

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
router.use("/aws", awsRouter);

module.exports = router;
