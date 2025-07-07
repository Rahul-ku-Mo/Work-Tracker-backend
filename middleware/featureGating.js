const { prisma } = require('../db'); // Use singleton instance

// Simple in-memory cache for user plans (5 minute TTL)
const userPlanCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

// Feature limits for each plan
const PLAN_LIMITS = {
  free: {
    projects: 5,
    teamMembers: 15,
    tasksPerProject: 100,
    activityHistoryDays: 7,
    storageGB: 1,
    trialDays: 14,
    analytics: false,
    timeTracking: false,
    customFields: false,
    aiFeatures: false,
    prioritySupport: false
  },
  pro: {
    projects: 15,
    teamMembers: 100,
    tasksPerProject: -1, // unlimited
    activityHistoryDays: 30,
    storageGB: 10,
    trialDays: -1, // no trial limit
    analytics: true,
    timeTracking: true,
    customFields: true,
    aiFeatures: true,
    prioritySupport: false
  },
  enterprise: {
    projects: -1, // unlimited
    teamMembers: -1, // unlimited
    tasksPerProject: -1, // unlimited
    activityHistoryDays: -1, // unlimited
    storageGB: 100,
    trialDays: -1, // no trial limit
    analytics: true,
    timeTracking: true,
    customFields: true,
    aiFeatures: true,
    prioritySupport: true
  }
};

// Get user's current plan with caching
const getUserPlan = async (userId) => {
  // Check cache first
  const cacheKey = `user_plan_${userId}`;
  const cached = userPlanCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.plan;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscription: {
          select: {
            plan: true,
            status: true,
            currentPeriodEnd: true
          }
        }
      }
    });

    if (!user || !user.subscription) {
      // Cache the result
      userPlanCache.set(cacheKey, {
        plan: 'free',
        timestamp: Date.now()
      });
      return 'free';
    }

    // Check if subscription is active
    const now = new Date();
    const periodEnd = new Date(user.subscription.currentPeriodEnd);
    
    if (user.subscription.status !== 'active' || now > periodEnd) {
      // Cache the result
      userPlanCache.set(cacheKey, {
        plan: 'free',
        timestamp: Date.now()
      });
      return 'free';
    }

    // Convert database enum to lowercase for consistency
    const planMapping = {
      'FREE': 'free',
      'PRO': 'pro', 
      'ENTERPRISE': 'enterprise',
      'TEAM': 'team'
    };

    const plan = planMapping[user.subscription.plan] || 'free';
    
    // Cache the result
    userPlanCache.set(cacheKey, {
      plan,
      timestamp: Date.now()
    });
    
    return plan;
  } catch (error) {
    console.error('Error getting user plan:', error);
    return 'free'; // Default to free on error
  }
};

// Clear cache for a specific user (call this when subscription changes)
const clearUserPlanCache = (userId) => {
  const cacheKey = `user_plan_${userId}`;
  userPlanCache.delete(cacheKey);
};

// Clean up expired cache entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of userPlanCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      userPlanCache.delete(key);
    }
  }
}, 10 * 60 * 1000); // 10 minutes

// Check if feature is available for plan
const hasFeatureAccess = (plan, feature) => {
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  return limits[feature] === true;
};

// Get actual storage usage in GB from ImageUpload table
const getStorageUsage = async (userId) => {
  try {
    const result = await prisma.imageUpload.aggregate({
      where: { userId },
      _sum: {
        fileSize: true
      }
    });
    
    const totalBytes = result._sum.fileSize || 0;
    const totalGB = totalBytes / (1024 * 1024 * 1024); // Convert bytes to GB
    
    return totalGB;
  } catch (error) {
    console.error('Error calculating storage usage:', error);
    return 0;
  }
};

// Check if user is within limits
const isWithinLimits = async (userId, plan, limitType) => {
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  const limit = limits[limitType];
  
  if (limit === -1) return true; // Unlimited
  if (limit === false) return false; // Not allowed
  
  // Get current usage
  let currentUsage = 0;
  
  try {
    switch (limitType) {
      case 'projects':
        const projectCount = await prisma.workspace.count({
          where: { userId }
        });
        currentUsage = projectCount;
        break;
        
      case 'teamMembers':
        const user = await prisma.user.findUnique({
          where: { id: userId },
          include: {
            team: {
              include: {
                members: true
              }
            }
          }
        });
        currentUsage = user?.team?.members?.length || 0;
        break;
        
      case 'storageGB':
        // Use actual storage usage from ImageUpload table
        currentUsage = await getStorageUsage(userId);
        break;
        
      case 'tasksPerProject':
        // This would be checked per project
        return true; // Implement per-project check separately
        
      default:
        return true;
    }
    
    return currentUsage < limit;
  } catch (error) {
    console.error(`Error checking ${limitType} limits:`, error);
    return false;
  }
};

// Middleware to check feature access
const requireFeature = (featureName) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.userId || req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          status: 401,
          message: 'Authentication required'
        });
      }

      const plan = await getUserPlan(userId);
      
      if (!hasFeatureAccess(plan, featureName)) {
        return res.status(403).json({
          status: 403,
          message: `This feature requires a higher subscription plan`,
          feature: featureName,
          currentPlan: plan,
          upgradeRequired: true
        });
      }

      req.userPlan = plan;
      next();
    } catch (error) {
      console.error('Feature gating error:', error);
      res.status(500).json({
        status: 500,
        message: 'Error checking feature access'
      });
    }
  };
};

// Middleware to check usage limits
const requireWithinLimits = (limitType) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.userId || req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          status: 401,
          message: 'Authentication required'
        });
      }

      const plan = await getUserPlan(userId);
      const withinLimits = await isWithinLimits(userId, plan, limitType);
      
      if (!withinLimits) {
        const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
        return res.status(403).json({
          status: 403,
          message: `You've reached the ${limitType} limit for your current plan`,
          currentPlan: plan,
          limit: limits[limitType],
          upgradeRequired: true
        });
      }

      req.userPlan = plan;
      next();
    } catch (error) {
      console.error('Limit checking error:', error);
      res.status(500).json({
        status: 500,
        message: 'Error checking usage limits'
      });
    }
  };
};

// Get usage statistics for a user
const getUsageStats = async (userId) => {
  try {
    const plan = await getUserPlan(userId);
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
    
    // Get current usage
    const [projectCount, user, taskCount] = await Promise.all([
      prisma.workspace.count({ where: { userId } }),
      prisma.user.findUnique({
        where: { id: userId },
        include: {
          team: {
            include: {
              members: true
            }
          }
        }
      }),
      // Get task count across all user's projects
      prisma.card.count({
        where: {
          column: {
            workspace: {
              userId: userId
            }
          }
        }
      })
    ]);
    
    // Get actual storage usage from ImageUpload table
    const storageUsed = await getStorageUsage(userId);

    const teamMemberCount = user?.team?.members?.length || 0;
    
    // Calculate max tasks per project
    let maxTasksPerProject = 0;
    if (projectCount > 0) {
      try {
        const projectTaskCounts = await prisma.workspace.findMany({
          where: { userId },
          include: {
            columns: {
              include: {
                _count: {
                  select: { cards: true }
                }
              }
            }
          }
        });
        
        maxTasksPerProject = Math.max(...projectTaskCounts.map(project => 
          project.columns.reduce((sum, column) => sum + column._count.cards, 0)
        ), 0);
      } catch (error) {
        console.error('Error calculating max tasks per project:', error);
        maxTasksPerProject = 0;
      }
    }
    
    return {
      plan,
      usage: {
        projects: {
          current: projectCount,
          limit: limits.projects === -1 ? null : limits.projects
        },
        teamMembers: {
          current: teamMemberCount,
          limit: limits.teamMembers === -1 ? null : limits.teamMembers
        },
        tasksPerProject: {
          current: maxTasksPerProject,
          limit: limits.tasksPerProject === -1 ? null : limits.tasksPerProject
        },
        totalTasks: {
          current: taskCount,
          limit: null // Total tasks are usually unlimited
        },
        storageGB: {
          current: Math.round(storageUsed * 100) / 100, // Round to 2 decimals (already in GB)
          limit: limits.storageGB === -1 ? null : limits.storageGB
        }
      },
      features: {
        analytics: limits.analytics,
        timeTracking: limits.timeTracking,
        customFields: limits.customFields,
        aiFeatures: limits.aiFeatures,
        prioritySupport: limits.prioritySupport
      }
    };
  } catch (error) {
    console.error('Error getting usage stats:', error);
    throw error;
  }
};

module.exports = {
  getUserPlan,
  hasFeatureAccess,
  isWithinLimits,
  requireFeature,
  requireWithinLimits,
  getUsageStats,
  getStorageUsage,
  clearUserPlanCache,
  PLAN_LIMITS
}; 