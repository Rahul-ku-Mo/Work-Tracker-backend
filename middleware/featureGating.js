const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Feature limits for each plan
const PLAN_LIMITS = {
  free: {
    projects: 2,
    teamMembers: 3,
    tasksPerProject: 25,
    activityHistoryDays: 7,
    storageGB: 1,
    analytics: false,
    timeTracking: false,
    customFields: false,
    aiFeatures: false,
    prioritySupport: false
  },
  pro: {
    projects: -1, // unlimited
    teamMembers: 15,
    tasksPerProject: -1,
    activityHistoryDays: 90,
    storageGB: 50,
    analytics: true,
    timeTracking: true,
    customFields: true,
    aiFeatures: true,
    prioritySupport: false
  },
  enterprise: {
    projects: -1,
    teamMembers: -1,
    tasksPerProject: -1,
    activityHistoryDays: -1,
    storageGB: -1,
    analytics: true,
    timeTracking: true,
    customFields: true,
    aiFeatures: true,
    prioritySupport: true,
    apiAccess: true,
    ssoIntegration: true
  }
};

// Get user's current plan
const getUserPlan = async (userId) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscription: true
      }
    });

    if (!user || !user.subscription) {
      return 'free';
    }

    // Check if subscription is active
    const now = new Date();
    const periodEnd = new Date(user.subscription.currentPeriodEnd);
    
    if (user.subscription.status !== 'active' || now > periodEnd) {
      return 'free';
    }

    return user.subscription.plan;
  } catch (error) {
    console.error('Error getting user plan:', error);
    return 'free'; // Default to free on error
  }
};

// Check if feature is available for plan
const hasFeatureAccess = (plan, feature) => {
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  return limits[feature] === true;
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
        const projectCount = await prisma.board.count({
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
    const [projectCount, user] = await Promise.all([
      prisma.board.count({ where: { userId } }),
      prisma.user.findUnique({
        where: { id: userId },
        include: {
          team: {
            include: {
              members: true
            }
          }
        }
      })
    ]);
    
    const teamMemberCount = user?.team?.members?.length || 0;
    
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
        storageGB: {
          current: 0, // Implement storage tracking
          limit: limits.storageGB === -1 ? null : limits.storageGB
        }
      },
      features: {
        analytics: limits.analytics,
        timeTracking: limits.timeTracking,
        customFields: limits.customFields,
        aiFeatures: limits.aiFeatures,
        prioritySupport: limits.prioritySupport,
        apiAccess: limits.apiAccess || false,
        ssoIntegration: limits.ssoIntegration || false
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
  PLAN_LIMITS
}; 