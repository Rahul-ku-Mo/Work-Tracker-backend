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

// Security headers middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// Optimized CORS configuration - Pre-compute allowed origins
const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL,
  'https://app.pulseboard.co.in',
  'https://www.pulseboard.co.in',
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Use Set for O(1) lookup instead of O(n) indexOf
    if (ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      // Remove console.warn to reduce overhead
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: false, // Disable credentials to reduce preflight requests
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], // Remove OPTIONS (handled automatically)
  allowedHeaders: ['Content-Type', 'Authorization'], // Minimize headers
};

// Use CORS with options in production, optimized for development
if (process.env.NODE_ENV === 'production') {
  app.use(cors(corsOptions));
} else {
  app.use(cors({
    origin: "*",
    credentials: false // Disable credentials in development too
  }));
}

// Apply JSON parsing to all routes except webhooks
app.use('/api/v1/billing/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' })); // Add size limit

// Secure session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-session-secret-change-in-production",
    resave: false,
    saveUninitialized: false, // Changed to false for security
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  })
);

// Apply rate limiting to all requests
app.use(rateLimiterMiddleware);

// Pusher authentication route
app.use("/api/v1/pusher/auth", authenticatePusher);

// All API routes
app.use("/api/v1", routes);

app.listen(port, () => {
  console.log(`PulseBoard backend app listening on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// invalidateAllCaches();
