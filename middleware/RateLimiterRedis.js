const { RateLimiterRedis } = require("rate-limiter-flexible");
const { client } = require("../db");

const rateLimiter = new RateLimiterRedis({
  points: 100, // Number of requests
  duration: 10 * 60, // Per  minutes
  storeClient: client,
});

exports.rateLimiterMiddleware = (req, res, next) => {
  if (req.url === "/api/v1/users") {
    rateLimiter
      .consume(req.ip, 2)
      .then(() => {
        next();
      })
      .catch(() => {
        res.status(429).json({ status: 429, message: "Too Many Requests" });
      });
  } else {
    next();
  }
};
