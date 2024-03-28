const express = require("express");
const { rateLimiterMiddleware } = require("./middleware/RateLimiterRedis");

const userRouter = require("./routes/userRoutes");
const boardRouter = require("./routes/boardRoutes");
const authRouter = require("./routes/authRoutes");
const commentRouter = require("./routes/commentRoutes");
const columnRouter = require("./routes/columnRoutes");
const cardRouter = require("./routes/cardRoutes");
const labelRouter = require("./routes/labelRoutes.js");
const organizationRouter = require("./routes/organizationRoutes");

const session = require("express-session");
const passport = require("passport");

const app = express();
const cors = require("cors");

const port = 8000 || process.env.PORT;

app.use(
  cors({
    origin: "*",
  })
);

app.use(express.json());

app.use(
  session({
    secret: "your-session-secret",
    resave: false,
    saveUninitialized: true,
  })
);

// Apply rate limiting to all requests
app.use(rateLimiterMiddleware);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

app.use("/api/v1", authRouter);

app.use("/api/v1/users", userRouter);
app.use("/api/v1/boards", boardRouter);
app.use("/api/v1/columns", columnRouter);
app.use("/api/v1/cards", cardRouter);
app.use("/api/v1/comments", commentRouter);
app.use("/api/v1/organizations", organizationRouter);

app.use("/api/v1/labels", labelRouter);

app.listen(port, () => {
  console.log(`Work-Tracker backend app listening on port ${port}`);
});
