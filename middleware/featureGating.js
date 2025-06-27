const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
        
      case 'imageUploads':
        // Count images uploaded by this user (S3 keys in user's folder)
        const imageCount = await prisma.imageUpload.count({
          where: { userId }
        });
        currentUsage = imageCount;
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
      }),
      // Get task count across all user's projects
      prisma.card.count({
        where: {
          column: {
            board: {
              userId: userId
            }
          }
        }
      })
    ]);
    
    // Get storage usage (approximate from attachments)
    let storageUsed = 0;
    try {
      const cardsWithAttachments = await prisma.card.findMany({
        where: {
          column: {
            board: {
              userId: userId
            }
          },
          attachments: {
            isEmpty: false
          }
        },
        select: {
          attachments: true
        }
      });
      
      // Estimate storage based on number of attachments (rough estimate: 500KB per attachment)
      const totalAttachments = cardsWithAttachments.reduce((sum, card) => sum + card.attachments.length, 0);
      storageUsed = totalAttachments * 0.5 / 1024; // Convert MB to GB
    } catch (error) {
      console.error('Error calculating storage:', error);
      storageUsed = 0;
    }

    const teamMemberCount = user?.team?.members?.length || 0;
    
    // Calculate max tasks per project
    let maxTasksPerProject = 0;
    if (projectCount > 0) {
      try {
        const projectTaskCounts = await prisma.board.findMany({
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
        storageGB: {
          current: Math.round(storageUsed * 100) / 100, // Round to 2 decimals (already in GB)
          limit: limits.storageGB === -1 ? null : limits.storageGB
        },
        imageUploads: {
          current: taskCount, // Use task count as proxy for content created
          limit: limits.imageUploads === -1 ? null : limits.imageUploads
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
  PLAN_LIMITS
}; 