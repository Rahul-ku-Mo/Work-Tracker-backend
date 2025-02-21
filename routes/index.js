const express = require("express");
const router = express.Router();

const userRouter = require("./userRoutes");
const boardRouter = require("./boardRoutes");
const authRouter = require("./authRoutes");
const commentRouter = require("./commentRoutes");
const columnRouter = require("./columnRoutes");
const cardRouter = require("./cardRoutes");
const notificationRouter = require("./notificationRoutes");
const aiRouter = require("./ai.routes");
const { authenticateToken } = require("../utils/validation");
const userController = require("../controllers/userController");

// Auth routes
router.use("/", authRouter);

// Protected routes
router.use(authenticateToken);

//middleware to check the user exist or not!
router.use(userController.checkUserExists);

router.use("/users", userRouter);
router.use("/boards", boardRouter);
router.use("/columns", columnRouter);
router.use("/cards", cardRouter);
router.use("/comments", commentRouter);
router.use("/notifications", notificationRouter);
router.use("/ai", aiRouter);

module.exports = router;
