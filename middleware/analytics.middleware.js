const analyticsMiddleware = {
  validateTimeRange(req, res, next) {
    const { timeRange } = req.query;
    const validRanges = ["day", "week", "month", "quarter"];

    if (timeRange && !validRanges.includes(timeRange)) {
      return res.status(400).json({
        success: false,
        error: "Invalid time range. Must be one of: day, week, month, quarter",
      });
    }

    next();
  },
};

module.exports = analyticsMiddleware;
