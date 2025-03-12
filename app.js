
require('dotenv').config();
const express = require("express");
const { rateLimiterMiddleware } = require("./middleware/RateLimiterRedis");
const { authenticatePusher } = require("./middleware/pusherAuth");
const routes = require("./routes");
const session = require("cookie-session");
const { invalidateAllCaches } = require("./utils/cacheUtils");

const app = express();
const cors = require("cors");

const port = process.env.PORT || 8000;

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

// Pusher authentication route
app.use("/api/v1/pusher/auth", authenticatePusher);

// All API routes
app.use("/api/v1", routes);

app.listen(port, () => {
  console.log(`Work-Tracker backend app listening on port ${port}`);
});

// invalidateAllCaches();
