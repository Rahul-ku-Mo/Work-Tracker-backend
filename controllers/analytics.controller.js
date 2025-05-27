const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper function to get time period range
const getTimeRange = (timeRange) => {
  const now = new Date();
  switch (timeRange) {
    case 'day':
      return {
        start: new Date(now.setHours(0, 0, 0, 0)),
        end: new Date(now.setHours(23, 59, 59, 999))
      };
    case 'week':
      const startWeek = new Date(now);
      startWeek.setDate(now.getDate() - now.getDay());
      startWeek.setHours(0, 0, 0, 0);
      return { start: startWeek, end: now };
    case 'month':
      const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: startMonth, end: now };
    case 'quarter':
      const quarter = Math.floor(now.getMonth() / 3);
      const startQuarter = new Date(now.getFullYear(), quarter * 3, 1);
      return { start: startQuarter, end: now };
    default:
      return { start: new Date(0), end: now };
  }
};

const analyticsController = {
  // Get card analytics
  async getCardAnalytics(req, res) {
    try {
      const { cardId } = req.params;
      const { timeRange = 'week' } = req.query;
      const { start, end } = getTimeRange(timeRange);

      const timeEntries = await prisma.timeEntry.findMany({
        where: {
          cardId: parseInt(cardId),
          date: {
            gte: start,
            lte: end
          }
        },
        include: {
          activityType: true,
          user: {
            select: {
              id: true,
              name: true,
              imageUrl: true
            }
          }
        }
      });

      // Calculate time distribution by activity type
      const timeDistribution = timeEntries.reduce((acc, entry) => {
        const activity = entry.activityType.name;
        acc[activity] = (acc[activity] || 0) + entry.hours;
        return acc;
      }, {});

      // Calculate peak productivity times
      const productivityByHour = timeEntries.reduce((acc, entry) => {
        const hour = new Date(entry.date).getHours();
        if (entry.isProductiveTime) {
          acc[hour] = (acc[hour] || 0) + entry.hours;
        }
        return acc;
      }, {});

      const peakHour = Object.entries(productivityByHour)
        .sort(([, a], [, b]) => b - a)[0];

      // Generate insights based on time distribution
      const insights = [];
      const recommendations = [];

      // Insight 1: Peak productivity time
      if (peakHour) {
        insights.push({
          title: "Peak Productivity Time",
          description: `Team is most productive between ${peakHour[0]}:00 and ${parseInt(peakHour[0]) + 1}:00`,
          impact: "high"
        });
      }

      // Insight 2: Activity distribution
      const mainActivity = Object.entries(timeDistribution)
        .sort(([, a], [, b]) => b - a)[0];
      if (mainActivity) {
        insights.push({
          title: "Main Activity Focus",
          description: `${mainActivity[0]} accounts for ${((mainActivity[1] / timeEntries.reduce((sum, entry) => sum + entry.hours, 0)) * 100).toFixed(1)}% of total time`,
          impact: "medium"
        });
      }

      // Recommendation 1: Time management
      if (timeEntries.length > 0) {
        const avgHoursPerDay = timeEntries.reduce((sum, entry) => sum + entry.hours, 0) / 7;
        if (avgHoursPerDay > 8) {
          recommendations.push({
            title: "Time Management",
            description: "Consider breaking down tasks into smaller chunks to maintain sustainable work hours",
            priority: "high"
          });
        }
      }

      // Recommendation 2: Activity balance
      if (Object.keys(timeDistribution).length > 0) {
        const activityBalance = Object.values(timeDistribution).reduce((sum, val) => sum + val, 0) / Object.keys(timeDistribution).length;
        if (activityBalance < 0.3) {
          recommendations.push({
            title: "Activity Balance",
            description: "Consider diversifying activities to improve overall productivity",
            priority: "medium"
          });
        }
      }

      return res.json({
        success: true,
        data: {
          timeEntries,
          timeDistribution,
          peakProductivity: {
            hour: peakHour?.[0],
            value: peakHour?.[1]
          },
          totalHours: timeEntries.reduce((sum, entry) => sum + entry.hours, 0),
          insights,
          recommendations
        }
      });
    } catch (error) {
      console.error('Error in getCardAnalytics:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch card analytics'
      });
    }
  },

  // Get team analytics
  async getTeamAnalytics(req, res) {
    try {
      const { teamId } = req.params;
      const { timeRange = 'week' } = req.query;
      const { start, end } = getTimeRange(timeRange);

      const teamMetrics = await prisma.performanceMetric.findMany({
        where: {
          teamId,
          date: {
            gte: start,
            lte: end
          }
        }
      });

      const teamMembers = await prisma.user.findMany({
        where: {
          teamId
        },
        select: {
          id: true,
          name: true,
          imageUrl: true,
          efficiency: true,
          timeEntries: {
            where: {
              date: {
                gte: start,
                lte: end
              }
            }
          },
          assignedCards: {
            where: {
              completedAt: {
                gte: start,
                lte: end
              }
            }
          }
        }
      });

      const memberPerformance = teamMembers.map(member => ({
        id: member.id,
        name: member.name,
        imageUrl: member.imageUrl,
        efficiency: member.efficiency,
        tasksCompleted: member.assignedCards.length,
        totalHours: member.timeEntries.reduce((sum, entry) => sum + entry.hours, 0),
        avgTimePerTask: member.assignedCards.length > 0 
          ? member.timeEntries.reduce((sum, entry) => sum + entry.hours, 0) / member.assignedCards.length 
          : 0
      }));

      return res.json({
        success: true,
        data: {
          teamMetrics,
          memberPerformance
        }
      });
    } catch (error) {
      console.error('Error in getTeamAnalytics:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch team analytics'
      });
    }
  },

  // Get board analytics
  async getBoardAnalytics(req, res) {
    try {
      const { boardId } = req.params;
      const { timeRange = 'week' } = req.query;
      const { start, end } = getTimeRange(timeRange);

      const sprints = await prisma.sprint.findMany({
        where: {
          boardId: parseInt(boardId),
          startDate: {
            gte: start
          },
          endDate: {
            lte: end
          }
        },
        include: {
          cards: true
        }
      });

      const cards = await prisma.card.findMany({
        where: {
          column: {
            boardId: parseInt(boardId)
          },
          createdAt: {
            gte: start,
            lte: end
          }
        },
        include: {
          timeEntries: {
            include: {
              activityType: true
            }
          }
        }
      });

      // Calculate completion rates
      const completedCards = cards.filter(card => card.completedAt);
      const onTimeCards = completedCards.filter(card => card.isOnTime);
      
      const completionRates = {
        total: cards.length,
        completed: completedCards.length,
        onTime: onTimeCards.length,
        delayed: completedCards.length - onTimeCards.length
      };

      // Calculate velocity
      const velocity = sprints.map(sprint => ({
        name: sprint.name,
        planned: sprint.plannedPoints,
        completed: sprint.completedPoints || 0,
        efficiency: sprint.efficiency
      }));

      return res.json({
        success: true,
        data: {
          completionRates,
          velocity,
          totalCards: cards.length,
          averageTimePerCard: cards.length > 0 
            ? cards.reduce((sum, card) => sum + (card.actualHours || 0), 0) / cards.length 
            : 0
        }
      });
    } catch (error) {
      console.error('Error in getBoardAnalytics:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch board analytics'
      });
    }
  },

  // Update performance metrics
  async updatePerformanceMetrics(req, res) {
    try {
      const { metricType, value, target, notes, userId, teamId, sprintId } = req.body;

      const metric = await prisma.performanceMetric.create({
        data: {
          metricType,
          value,
          target,
          notes,
          date: new Date(),
          userId,
          teamId,
          sprintId
        }
      });

      return res.json({
        success: true,
        data: metric
      });
    } catch (error) {
      console.error('Error in updatePerformanceMetrics:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update performance metrics'
      });
    }
  }
};


module.exports = analyticsController; 