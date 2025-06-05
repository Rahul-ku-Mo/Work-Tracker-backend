const { RateLimiterRedis } = require("rate-limiter-flexible");
const { client } = require("../db");

// General rate limiter
const rateLimiter = new RateLimiterRedis({
  points: 100, // Number of requests
  duration: 10 * 60, // Per 10 minutes
  storeClient: client,
});

// AI-specific rate limiter (more restrictive)
const aiRateLimiter = new RateLimiterRedis({
  points: 20, // 20 AI requests
  duration: 60 * 60, // Per hour
  storeClient: client,
  keyPrefix: 'ai_limit',
});

// Improve writing specific rate limiter (even more restrictive)
const improveWritingRateLimiter = new RateLimiterRedis({
  points: 10, // 10 improve writing requests
  duration: 60 * 60, // Per hour
  storeClient: client,
  keyPrefix: 'improve_writing_limit',
});

exports.rateLimiterMiddleware = (req, res, next) => {
  // Apply different rate limits based on endpoint
  if (req.url === "/api/v1/users") {
    rateLimiter
      .consume(req.ip, 2)
      .then(() => {
        next();
      })
      .catch(() => {
        res.status(429).json({ 
          status: 429, 
          message: "Too Many Requests. Please try again later." 
        });
      });
  } else if (req.url.includes("/api/v1/ai/improve-writing")) {
    // Most restrictive for improve writing
    improveWritingRateLimiter
      .consume(req.ip, 1)
      .then(() => {
        next();
      })
      .catch(() => {
        res.status(429).json({ 
          status: 429, 
          message: "AI improve writing rate limit exceeded. Please try again in an hour." 
        });
      });
  } else if (req.url.includes("/api/v1/ai/")) {
    // Restrictive for all AI endpoints
    aiRateLimiter
      .consume(req.ip, 1)
      .then(() => {
        next();
      })
      .catch(() => {
        res.status(429).json({ 
          status: 429, 
          message: "AI service rate limit exceeded. Please try again later." 
        });
      });
  } else {
    // General rate limiting for other endpoints
    rateLimiter
      .consume(req.ip, 1)
      .then(() => {
        next();
      })
      .catch(() => {
        res.status(429).json({ 
          status: 429, 
          message: "Too Many Requests. Please try again later." 
        });
      });
  }
};

// Export individual rate limiters for specific use
exports.aiRateLimiter = aiRateLimiter;
exports.improveWritingRateLimiter = improveWritingRateLimiter;
