const { client: redisClient } = require("../db");

// Helper function to safely interact with Redis
async function safeRedisOperation(operation) {
  try {
    return await operation();
  } catch (error) {
    console.error("Redis operation failed:", error);
    return null;
  }
}

// Function to invalidate all caches
async function invalidateAllCaches() {
  try {
    // Get all keys
    const keys = await safeRedisOperation(() => redisClient.keys("*"));

    if (keys && keys.length > 0) {
      // Delete all keys
      const result = await safeRedisOperation(() => redisClient.del(keys));
      console.log(`Successfully invalidated ${result} cache entries`);
      return {
        success: true,
        message: `Invalidated ${result} cache entries`,
      };
    }

    return {
      success: true,
      message: "No cache entries to invalidate",
    };
  } catch (error) {
    console.error("Failed to invalidate caches:", error);
    return {
      success: false,
      message: "Failed to invalidate caches",
      error: error.message,
    };
  }
}

module.exports = {
  invalidateAllCaches,
  safeRedisOperation,
};
