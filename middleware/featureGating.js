const { prisma } = require('../db'); // Use singleton instance

// Simple in-memory cache for user plans (5 minute TTL)
const userPlanCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

// Feature limits for each plan
const PLAN_LIMITS = {
  free: {
    projects: 2, // 1-2 projects for free users
    workspacesPerProject: 5, // 5 workspaces per project
    teamMembers: 15,
    cardsPerWorkspace: 100, // 100 cards per workspace
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
    projects: 10, // 10 projects for pro users
    workspacesPerProject: 15, // 15 workspaces per project
    teamMembers: 100,
    cardsPerWorkspace: -1, // unlimited cards per workspace
    activityHistoryDays: 30,
    storageGB: 10,
    trialDays: -1, // no trial limit
    analytics: true,
    timeTracking: true,
    customFields: true,
    aiFeatures: true,
    prioritySupport: false
  },
  team: {
    projects: 25, // 25 projects for team users
    workspacesPerProject: 30, // 30 workspaces per project
    teamMembers: 250,
    cardsPerWorkspace: -1, // unlimited cards per workspace
    activityHistoryDays: 90,
    storageGB: 50,
    trialDays: -1, // no trial limit
    analytics: true,
    timeTracking: true,
    customFields: true,
    aiFeatures: true,
    prioritySupport: true
  },
  enterprise: {
    projects: -1, // unlimited projects
    workspacesPerProject: -1, // unlimited workspaces per project
    teamMembers: -1, // unlimited team members
    cardsPerWorkspace: -1, // unlimited cards per workspace
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
const isWithinLimits = async (userId, plan, limitType, contextData = {}) => {
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  const limit = limits[limitType];
  
  if (limit === -1) return true; // Unlimited
  if (limit === false) return false; // Not allowed
  
  // Get current usage
  let currentUsage = 0;
  
  try {
    switch (limitType) {
      case 'projects':
        // Count projects where user is the lead
        const projectCount = await prisma.project.count({
          where: {
            leadId: userId
          }
        });
        console.log("project-count::", projectCount);
        currentUsage = projectCount;
        break;
        
      case 'workspacesPerProject':
        // Check workspaces for a specific project
        if (!contextData.projectId) {
          console.error('projectId is required for workspacesPerProject limit check');
          return false;
        }
        
        const workspaceCount = await prisma.workspace.count({
          where: {
            projectId: contextData.projectId
          }
        });
        console.log(`workspace-count for project ${contextData.projectId}::`, workspaceCount);
        currentUsage = workspaceCount;
        break;
        
      case 'teamMembers':
        // Count all unique users across team memberships and project memberships
        const teamMembership = await prisma.teamMember.findFirst({
          where: { userId: userId },
          include: {
            team: {
              include: {
                teamMembers: true,
                projects: {
                  include: {
                    members: true
                  }
                }
              }
            }
          }
        });
        
        if (teamMembership?.team) {
          const uniqueMembers = new Set();
          
          // Add team admins
          teamMembership.team.teamMembers.forEach(tm => {
            uniqueMembers.add(tm.userId);
          });
          
          // Add project members
          teamMembership.team.projects.forEach(project => {
            project.members.forEach(pm => {
              uniqueMembers.add(pm.userId);
            });
          });
          
          currentUsage = uniqueMembers.size;
        } else {
          currentUsage = 0;
        }
        break;
        
      case 'cardsPerWorkspace':
        // Check cards for a specific workspace
        if (!contextData.workspaceId) {
          console.error('workspaceId is required for cardsPerWorkspace limit check');
          return false;
        }
        
        const cardCount = await prisma.card.count({
          where: {
            column: {
              workspaceId: contextData.workspaceId
            }
          }
        });
        console.log(`card-count for workspace ${contextData.workspaceId}::`, cardCount);
        currentUsage = cardCount;
        break;
        
      case 'storageGB':
        // Use actual storage usage from ImageUpload table
        currentUsage = await getStorageUsage(userId);
        break;
        
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
      const userId = req.user?.userId
      
      
      if (!userId) {
        return res.status(401).json({
          status: 401,
          message: 'Authentication required'
        });
      }

      const plan = await getUserPlan(userId);
      
      // Extract context data based on limit type
      const contextData = {};
      if (limitType === 'workspacesPerProject') {
        // For workspace creation, get projectId from request body
        contextData.projectId = req.body.projectId;
      } else if (limitType === 'cardsPerWorkspace') {
        // For card creation, get workspaceId from column
        if (req.body.columnId) {
          // Need to fetch workspace from column
          const column = await prisma.column.findUnique({
            where: { id: req.body.columnId },
            select: { workspaceId: true }
          });
          contextData.workspaceId = column?.workspaceId;
        }
      }
      
      const withinLimits = await isWithinLimits(userId, plan, limitType, contextData);

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
    const [projectCount, teamMembership, taskCount] = await Promise.all([
      // Count projects where user is lead
      prisma.project.count({
        where: {
          leadId: userId
        }
      }),
      prisma.teamMember.findFirst({
        where: { userId: userId },
        include: {
          team: {
            include: {
              teamMembers: true,
              projects: {
                include: {
                  members: true
                }
              }
            }
          }
        }
      }),
      // Get task count across all user's workspaces
      prisma.card.count({
        where: {
          column: {
            workspace: {
              members: {
                some: {
                  userId: userId
                }
              }
            }
          }
        }
      })
    ]);
    
    // Get actual storage usage from ImageUpload table
    const storageUsed = await getStorageUsage(userId);

    // Count all unique team members (team admins + project members)
    let teamMemberCount = 0;
    if (teamMembership?.team) {
      const uniqueMembers = new Set();
      
      // Add team admins
      teamMembership.team.teamMembers.forEach(tm => {
        uniqueMembers.add(tm.userId);
      });
      
      // Add project members
      teamMembership.team.projects.forEach(project => {
        project.members.forEach(pm => {
          uniqueMembers.add(pm.userId);
        });
      });
      
      teamMemberCount = uniqueMembers.size;
    }
    
    // Calculate max cards per workspace
    let maxCardsPerWorkspace = 0;
    if (projectCount > 0) {
      try {
        const workspaceCardCounts = await prisma.workspace.findMany({
          where: { 
            members: {
              some: {
                userId: userId
              }
            }
          },
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
        
        maxCardsPerWorkspace = Math.max(...workspaceCardCounts.map(workspace => 
          workspace.columns.reduce((sum, column) => sum + column._count.cards, 0)
        ), 0);
      } catch (error) {
        console.error('Error calculating max cards per workspace:', error);
        maxCardsPerWorkspace = 0;
      }
    }
    
    return {
      plan,
      usage: {
        projects: {
          current: projectCount,
          limit: limits.projects === -1 ? null : limits.projects
        },
        workspacesPerProject: {
          current: null, // This would be calculated per project
          limit: limits.workspacesPerProject === -1 ? null : limits.workspacesPerProject
        },
        teamMembers: {
          current: teamMemberCount,
          limit: limits.teamMembers === -1 ? null : limits.teamMembers
        },
        cardsPerWorkspace: {
          current: maxCardsPerWorkspace,
          limit: limits.cardsPerWorkspace === -1 ? null : limits.cardsPerWorkspace
        },
        totalCards: {
          current: taskCount,
          limit: null // Total cards are usually unlimited
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