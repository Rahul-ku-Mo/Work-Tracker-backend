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

// Improved CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // In production, replace with your actual frontend domains
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'https://app.pulseboard.co.in'
    ].filter(Boolean);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

// Use CORS with options in production, allow all in development
if (process.env.NODE_ENV === 'production') {
  app.use(cors(corsOptions));
} else {
  app.use(cors({
    origin: "*",
    credentials: true
  }));
}

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
