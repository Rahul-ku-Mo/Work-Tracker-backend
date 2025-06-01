const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const analyticsService = require('../services/analyticsService');

// Helper function to calculate time worked within a specific range
const calculateTimeInRange = (timeEntries, rangeStart, rangeEnd) => {
  let totalMinutes = 0;
  
  timeEntries.forEach(entry => {
    const entryStart = new Date(entry.startTime);
    const entryEnd = entry.endTime ? new Date(entry.endTime) : new Date();
    
    // Check if there's any overlap between entry and range
    const overlapStart = new Date(Math.max(entryStart.getTime(), rangeStart.getTime()));
    const overlapEnd = new Date(Math.min(entryEnd.getTime(), rangeEnd.getTime()));
    
    if (overlapStart < overlapEnd) {
      // For completed entries, use totalDuration proportionally
      if (entry.endTime && entry.totalDuration > 0) {
        const entryDurationMs = entryEnd.getTime() - entryStart.getTime();
        const overlapDurationMs = overlapEnd.getTime() - overlapStart.getTime();
        const overlapRatio = overlapDurationMs / entryDurationMs;
        totalMinutes += (entry.totalDuration * overlapRatio) / 60; // Convert seconds to minutes
      } 
      // For active entries, calculate based on actual time if lastResumeTime exists
      else if (!entry.endTime && entry.lastResumeTime) {
        const activeStart = new Date(entry.lastResumeTime);
        const activeOverlapStart = new Date(Math.max(activeStart.getTime(), rangeStart.getTime()));
        const activeOverlapEnd = new Date(Math.min(new Date().getTime(), rangeEnd.getTime()));
        
        if (activeOverlapStart < activeOverlapEnd) {
          const activeMinutes = (activeOverlapEnd.getTime() - activeOverlapStart.getTime()) / (1000 * 60);
          totalMinutes += activeMinutes;
        }
        
        // Also add the accumulated totalDuration if it falls in range
        if (entry.totalDuration > 0) {
          totalMinutes += entry.totalDuration / 60;
        }
      }
      // Fallback: calculate based on time range overlap
      else {
        const overlapMinutes = (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60);
        totalMinutes += overlapMinutes;
      }
    }
  });
  
  return totalMinutes;
};

// AI-powered insights generator
const generateInsights = (timeEntries, aggregatedData, timeRange) => {
  const insights = [];
  const totalHours = timeEntries.reduce((sum, entry) => sum + (entry.totalDuration || 0), 0) / 3600;
  const card = timeEntries[0]?.card;
  const uniqueUsers = [...new Set(timeEntries.map(entry => entry.user.name))];
  
  // Productivity pattern analysis
  if (timeRange === 'day' && aggregatedData.length > 0) {
    const peakHour = aggregatedData.reduce((max, curr) => curr.time > max.time ? curr : max);
    if (peakHour.time > 0) {
      insights.push(`Peak productivity at ${peakHour.period} with ${peakHour.time}h of focused work`);
    }
    
    const morningWork = aggregatedData.slice(0, 2).reduce((sum, d) => sum + d.time, 0);
    const afternoonWork = aggregatedData.slice(4, 8).reduce((sum, d) => sum + d.time, 0);
    
    if (morningWork > afternoonWork * 1.5) {
      insights.push("Strong morning productivity - consider scheduling complex tasks early");
    } else if (afternoonWork > morningWork * 1.5) {
      insights.push("Afternoon momentum detected - optimal for deep work sessions");
    }
  }
  
  if (timeRange === 'week') {
    const weekdayWork = aggregatedData.slice(1, 6).reduce((sum, d) => sum + d.time, 0);
    const weekendWork = aggregatedData[0].time + aggregatedData[6].time;
    
    if (weekendWork > weekdayWork * 0.3) {
      insights.push("Significant weekend work detected - consider workload redistribution");
    }
    
    // Find most productive day
    const maxDay = aggregatedData.reduce((max, curr) => curr.time > max.time ? curr : max);
    if (maxDay.time > 0) {
      insights.push(`${maxDay.period} shows highest engagement (${maxDay.time}h) - optimal for challenging tasks`);
    }
    
    // Consistency analysis
    const workingDays = aggregatedData.filter(d => d.time > 0).length;
    if (workingDays >= 5) {
      insights.push("Excellent consistency - working on 5+ days maintains momentum");
    } else if (workingDays <= 2) {
      insights.push("Sporadic work pattern - consider more regular engagement");
    }
  }
  
  // Progress vs estimation analysis
  if (card?.estimatedHours && totalHours > 0) {
    const progressRatio = totalHours / card.estimatedHours;
    if (progressRatio > 1.5) {
      insights.push(`Task complexity exceeded estimates by ${((progressRatio - 1) * 100).toFixed(0)}% - scope may have expanded`);
    } else if (progressRatio < 0.5) {
      insights.push(`Efficient execution - completed in ${(progressRatio * 100).toFixed(0)}% of estimated time`);
    }
  }
  
  // Collaboration insights
  if (uniqueUsers.length > 1) {
    insights.push(`Collaborative effort by ${uniqueUsers.length} team members enhances knowledge sharing`);
  } else if (timeEntries.length > 10) {
    insights.push("Extended solo work detected - consider pair programming or code reviews");
  }
  
  // Task age analysis
  if (card?.createdAt) {
    const taskAge = (new Date() - new Date(card.createdAt)) / (1000 * 60 * 60 * 24);
    if (taskAge > 14 && totalHours < 8) {
      insights.push("Long-running task with minimal time investment - may need prioritization");
    } else if (taskAge < 2 && totalHours > 8) {
      insights.push("Rapid progress on new task - excellent momentum and focus");
    }
  }
  
  return insights.slice(0, 4); // Limit to top 4 insights
};

// AI-powered recommendations generator  
const generateRecommendations = (timeEntries, aggregatedData, timeRange) => {
  const recommendations = [];
  const totalHours = timeEntries.reduce((sum, entry) => sum + (entry.totalDuration || 0), 0) / 3600;
  const card = timeEntries[0]?.card;
  const avgSessionDuration = timeEntries.length > 0 ? totalHours / timeEntries.length : 0;
  
  // Time management recommendations
  if (avgSessionDuration < 0.5) {
    recommendations.push("Consider longer focus sessions (1-2 hours) to reduce context switching overhead");
  } else if (avgSessionDuration > 4) {
    recommendations.push("Break down work into shorter sessions to maintain peak concentration");
  }
  
  // Schedule optimization
  if (timeRange === 'day') {
    const lowActivityPeriods = aggregatedData.filter(d => d.time === 0).length;
    if (lowActivityPeriods > 6) {
      recommendations.push("Schedule task work during natural energy peaks for better efficiency");
    }
    
    const lateWork = aggregatedData.slice(-2).reduce((sum, d) => sum + d.time, 0);
    if (lateWork > 1) {
      recommendations.push("Consider shifting late-day work to morning hours for improved focus");
    }
  }
  
  if (timeRange === 'week') {
    const inconsistentDays = aggregatedData.filter(d => d.time > 0 && d.time < 1).length;
    if (inconsistentDays > 3) {
      recommendations.push("Establish minimum daily commitment (1-2 hours) for steady progress");
    }
    
    // Weekend work analysis
    const weekendHours = aggregatedData[0].time + aggregatedData[6].time;
    if (weekendHours > 4) {
      recommendations.push("Redistribute weekend work to weekdays for better work-life balance");
    }
  }
  
  // Estimation improvement
  if (card?.estimatedHours && totalHours > 0) {
    const ratio = totalHours / card.estimatedHours;
    if (ratio > 1.3) {
      recommendations.push("Future similar tasks: add 30-40% buffer time for unexpected complexity");
    } else if (ratio < 0.7) {
      recommendations.push("Estimation skills are strong - consider taking on additional scope");
    }
  }
  
  // Priority-based recommendations
  if (card?.priority === 'high' && totalHours < 2) {
    recommendations.push("High-priority task needs more attention - consider daily standups or progress reviews");
  } else if (card?.priority === 'low' && totalHours > 8) {
    recommendations.push("Significant time on low-priority task - review backlog prioritization");
  }
  
  // Collaboration recommendations
  const uniqueUsers = [...new Set(timeEntries.map(entry => entry.user.name))];
  if (uniqueUsers.length === 1 && totalHours > 6) {
    recommendations.push("Consider knowledge sharing sessions to reduce single-person dependency");
  }
  
  // Momentum recommendations
  const recentEntries = timeEntries.filter(entry => {
    const entryDate = new Date(entry.startTime);
    return (new Date() - entryDate) < (3 * 24 * 60 * 60 * 1000); // Last 3 days
  });
  
  if (recentEntries.length === 0 && timeEntries.length > 0) {
    recommendations.push("Task has been idle for 3+ days - schedule a quick re-engagement session");
  } else if (recentEntries.length > 5) {
    recommendations.push("Great momentum! Consider documenting progress to maintain context");
  }
  
  return recommendations.slice(0, 4); // Limit to top 4 recommendations
};

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

  // Get enhanced team analytics with AI insights
  async getTeamAnalytics(req, res) {
    try {
      const { teamId } = req.params;
      const { timeRange = 'week' } = req.query;

      // Get comprehensive team performance data
      const performanceData = await analyticsService.calculateTeamPerformance(teamId, timeRange);
      
      // Generate AI-powered insights and recommendations
      const insights = await analyticsService.generateTeamInsights(teamId, performanceData, timeRange);
      const recommendations = await analyticsService.generateTeamRecommendations(teamId, performanceData, timeRange);

      return res.json({
        success: true,
        data: {
          ...performanceData,
          insights,
          recommendations,
          timeRange
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
  },

  // Get card time data aggregated by time range
  async getCardTimeData(req, res) {
    try {
      const { cardId } = req.params;
      const { timeRange = 'week' } = req.query;
      
      // Get all time entries for this card
      const timeEntries = await prisma.timeEntry.findMany({
        where: {
          cardId: parseInt(cardId)
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              imageUrl: true
            }
          },
          card: {
            select: {
              title: true,
              estimatedHours: true,
              priority: true,
              createdAt: true
            }
          }
        },
        orderBy: {
          startTime: 'desc'
        }
      });

      // Calculate time data based on range
      let aggregatedData = [];
      const now = new Date();

      switch (timeRange) {
        case 'day':
          // Show hourly data for today (working hours 9 AM to 6 PM)
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const workingHours = Array.from({ length: 10 }, (_, i) => 9 + i); // 9 AM to 6 PM

          aggregatedData = workingHours.map(hour => {
            const hourStart = new Date(today);
            hourStart.setHours(hour, 0, 0, 0);
            const hourEnd = new Date(today);
            hourEnd.setHours(hour + 1, 0, 0, 0);

            const hoursWorked = calculateTimeInRange(timeEntries, hourStart, hourEnd);
            
            return {
              period: `${hour}:00`,
              time: parseFloat((hoursWorked / 60).toFixed(2)) // Convert minutes to hours
            };
          });
          break;

        case 'week':
          // Show daily data for the past 7 days
          const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          
          aggregatedData = Array.from({ length: 7 }, (_, i) => {
            const dayDate = new Date(now);
            dayDate.setDate(now.getDate() - (6 - i));
            dayDate.setHours(0, 0, 0, 0);
            
            const dayEnd = new Date(dayDate);
            dayEnd.setHours(23, 59, 59, 999);

            const hoursWorked = calculateTimeInRange(timeEntries, dayDate, dayEnd);
            
            return {
              period: days[dayDate.getDay()],
              time: parseFloat((hoursWorked / 60).toFixed(2))
            };
          });
          break;

        case 'month':
          // Show data for every 5 days over the past 30 days
          const periods = Array.from({ length: 6 }, (_, i) => {
            const periodEnd = new Date(now);
            periodEnd.setDate(now.getDate() - (i * 5));
            periodEnd.setHours(23, 59, 59, 999);
            
            const periodStart = new Date(periodEnd);
            periodStart.setDate(periodEnd.getDate() - 4);
            periodStart.setHours(0, 0, 0, 0);

            const hoursWorked = calculateTimeInRange(timeEntries, periodStart, periodEnd);
            
            return {
              period: `${periodStart.getDate()}-${periodEnd.getDate()}`,
              time: parseFloat((hoursWorked / 60).toFixed(2))
            };
          }).reverse();

          aggregatedData = periods;
          break;

        case 'quarter':
          // Show monthly data for the past 3 months
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          
          aggregatedData = Array.from({ length: 3 }, (_, i) => {
            const monthDate = new Date(now.getFullYear(), now.getMonth() - (2 - i), 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - (2 - i) + 1, 0);
            monthEnd.setHours(23, 59, 59, 999);

            // If it's the current month, use current date as end
            if (i === 2) {
              monthEnd.setTime(now.getTime());
            }

            const hoursWorked = calculateTimeInRange(timeEntries, monthDate, monthEnd);
            
            return {
              period: months[monthDate.getMonth()],
              time: parseFloat((hoursWorked / 60).toFixed(2))
            };
          });
          break;

        default:
          aggregatedData = [];
      }

      // Generate AI-powered insights and recommendations
      const insights = generateInsights(timeEntries, aggregatedData, timeRange);
      const recommendations = generateRecommendations(timeEntries, aggregatedData, timeRange);

      return res.json({
        success: true,
        data: {
          timeRange,
          cardTimeData: aggregatedData,
          totalEntries: timeEntries.length,
          totalTime: parseFloat((timeEntries.reduce((sum, entry) => {
            return sum + (entry.totalDuration || 0);
          }, 0) / 3600).toFixed(2)), // Convert seconds to hours
          insights,
          recommendations
        }
      });

    } catch (error) {
      console.error('Error in getCardTimeData:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch card time data'
      });
    }
  },

  // Get card performance comparison data
  async getCardPerformanceComparison(req, res) {
    try {
      const { cardId } = req.params;
      
      // Get the specific card with all related data
      const card = await prisma.card.findUnique({
        where: { id: parseInt(cardId) },
        include: {
          timeEntries: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  imageUrl: true,
                  efficiency: true
                }
              }
            }
          },
          assignees: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
              efficiency: true
            }
          },
          column: {
            select: {
              title: true
            }
          }
        }
      });

      if (!card) {
        return res.status(404).json({
          success: false,
          error: 'Card not found'
        });
      }

      // Calculate total time spent on this card
      const totalTimeSeconds = card.timeEntries.reduce((sum, entry) => sum + (entry.totalDuration || 0), 0);
      const totalHours = totalTimeSeconds / 3600;

      // Calculate time efficiency
      const estimatedHours = card.estimatedHours || 8; // Default estimate
      let timeEfficiency = 100; // Default to 100%
      let efficiencyPercentage = 0;
      let isUnderBudget = true;
      let displayEfficiency = 100; // For progress bar display
      
      if (totalHours > 0) {
        timeEfficiency = (estimatedHours / totalHours) * 100;
        isUnderBudget = timeEfficiency >= 100;
        efficiencyPercentage = Math.abs(100 - Math.round(timeEfficiency));
        
        // Cap the efficiency at reasonable bounds for display
        if (timeEfficiency > 1000) {
          timeEfficiency = 1000;
          efficiencyPercentage = 900;
        }
        
        // Create a display-friendly efficiency for progress bars (0-100%)
        if (isUnderBudget) {
          displayEfficiency = 100; // Always show full bar when under budget
        } else {
          displayEfficiency = Math.max(Math.min(timeEfficiency, 100), 10); // Cap between 10-100%
        }
      }

      // Determine complexity based on estimated hours and actual time
      let complexity = 'Medium';
      if (estimatedHours <= 4) complexity = 'Low';
      else if (estimatedHours >= 12) complexity = 'High';

      // Calculate complexity score (1-3)
      const complexityScore = complexity === 'High' ? 3 : complexity === 'Medium' ? 2 : 1;
      
      // Get average complexity for similar cards
      const similarCards = await prisma.card.findMany({
        where: {
          priority: card.priority,
          id: { not: card.id }
        },
        include: {
          timeEntries: true
        }
      });

      const avgComplexityScore = similarCards.length > 0 
        ? similarCards.reduce((sum, c) => {
            const est = c.estimatedHours || 8;
            return sum + (est <= 4 ? 1 : est >= 12 ? 3 : 2);
          }, 0) / similarCards.length 
        : 2;

      // Calculate completion status
      const isCompleted = card.completedAt !== null;
      const isOnTime = card.isOnTime === true;
      
      let daysEarly = 0;
      let daysLate = 0;
      
      if (card.dueDate && card.completedAt) {
        const dueDateMs = new Date(card.dueDate).getTime();
        const completedMs = new Date(card.completedAt).getTime();
        const diffDays = Math.ceil((dueDateMs - completedMs) / (1000 * 60 * 60 * 24));
        
        if (diffDays > 0) {
          daysEarly = diffDays;
        } else {
          daysLate = Math.abs(diffDays);
        }
      }

      // Get assignee performance data
      const assigneePerformance = card.assignees.map(assignee => {
        const userTimeEntries = card.timeEntries.filter(entry => entry.user.id === assignee.id);
        const userHours = userTimeEntries.reduce((sum, entry) => sum + (entry.totalDuration || 0), 0) / 3600;
        
        return {
          id: assignee.id,
          name: assignee.name,
          imageUrl: assignee.imageUrl,
          efficiency: assignee.efficiency || 85,
          hoursWorked: parseFloat(userHours.toFixed(2)),
          trend: assignee.efficiency > 80 ? 'up' : 'down',
          role: analyticsController.getUserRole(assignee) // Use the correct reference
        };
      });

      // Find similar cards for comparison context
      const similarCardsData = await prisma.card.findMany({
        where: {
          priority: card.priority,
          estimatedHours: {
            gte: estimatedHours - 2,
            lte: estimatedHours + 2
          },
          id: { not: card.id }
        },
        take: 5,
        include: {
          timeEntries: true
        }
      });

      const comparisonData = {
        cardId: card.id,
        title: card.title,
        priority: card.priority,
        status: card.column.title,
        
        // Time efficiency data
        timeEfficiency: {
          estimatedHours,
          actualHours: parseFloat(totalHours.toFixed(2)),
          efficiency: Math.round(timeEfficiency),
          displayEfficiency: Math.round(displayEfficiency),
          isUnderBudget,
          efficiencyPercentage,
          label: isUnderBudget ? 'UNDER BUDGET' : 'OVER BUDGET'
        },
        
        // Complexity data
        complexity: {
          level: complexity,
          score: complexityScore,
          avgScore: parseFloat(avgComplexityScore.toFixed(1)),
          comparisonPercentage: Math.abs(Math.round((complexityScore - avgComplexityScore) * 33)),
          isHigherThanAverage: complexityScore > avgComplexityScore
        },
        
        // Completion data
        completion: {
          isCompleted,
          isOnTime,
          daysEarly,
          daysLate,
          status: isOnTime ? 'On Time' : 'Delayed'
        },
        
        // Assignee data
        assignees: assigneePerformance,
        
        // Similar cards context
        similarCardsCount: similarCardsData.length,
        
        // Additional metrics
        createdAt: card.createdAt,
        completedAt: card.completedAt,
        dueDate: card.dueDate
      };

      return res.json({
        success: true,
        data: comparisonData
      });

    } catch (error) {
      console.error('Error in getCardPerformanceComparison:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch card performance comparison data'
      });
    }
  },

  getUserRole(user) {
    // Extract role from user data or default mapping
    if (user.email?.includes('qa')) return 'QA Engineer';
    if (user.email?.includes('backend')) return 'Backend Developer';
    if (user.email?.includes('frontend')) return 'Frontend Developer';
    if (user.email?.includes('design')) return 'UI/UX Designer';
    return 'Developer';
  }
};


module.exports = analyticsController; 