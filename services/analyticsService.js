const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class AnalyticsService {
  
  // Calculate team performance metrics for a given time period
  async calculateTeamPerformance(teamId, timeRange = 'week') {
    const { start, end } = this.getTimeRange(timeRange);
    
    // Get all team members and their performance data
    const teamMembers = await prisma.user.findMany({
      where: { teamId },
      include: {
        timeEntries: {
          where: {
            startTime: { gte: start, lte: end }
          },
          include: { card: true }
        },
        assignedCards: {
          where: {
            updatedAt: { gte: start, lte: end }
          }
        }
      }
    });

    // Calculate individual member metrics
    const memberPerformance = teamMembers.map(member => {
      const completedTasks = member.assignedCards.filter(card => card.completedAt).length;
      const totalHours = member.timeEntries.reduce((sum, entry) => sum + (entry.totalDuration || 0), 0) / 3600;
      const avgTimePerTask = completedTasks > 0 ? totalHours / completedTasks : 0;
      
      // Calculate efficiency based on multiple factors
      const efficiency = this.calculateUserEfficiency(member, timeRange);
      
      return {
        id: member.id,
        name: member.name,
        role: this.getUserRole(member),
        avatar: member.name?.split(' ').map(n => n[0]).join('') || 'U',
        tasksCompleted: completedTasks,
        avgTime: parseFloat(avgTimePerTask.toFixed(2)),
        efficiency,
        trend: this.calculateTrend(member.id, timeRange)
      };
    });

    // Calculate team-wide metrics
    const teamStats = await this.calculateTeamStats(teamId, timeRange);
    const velocityData = await this.calculateVelocityData(teamId, timeRange);
    const completionRateData = await this.calculateCompletionRates(teamId, timeRange);

    return {
      memberPerformance,
      teamStats,
      velocityData,
      completionRateData
    };
  }

  // Calculate individual user efficiency score
  calculateUserEfficiency(user, timeRange) {
    const timeEntries = user.timeEntries || [];
    const assignedCards = user.assignedCards || [];
    
    if (timeEntries.length === 0) return 75; // Default score
    
    // Factors for efficiency calculation
    const completionRate = assignedCards.length > 0 ? 
      (assignedCards.filter(card => card.completedAt).length / assignedCards.length) * 100 : 50;
    
    const avgSessionTime = timeEntries.length > 0 ? 
      timeEntries.reduce((sum, entry) => sum + (entry.totalDuration || 0), 0) / timeEntries.length / 3600 : 2;
    
    // Optimal session time is between 1.5-3 hours
    const sessionEfficiency = avgSessionTime >= 1.5 && avgSessionTime <= 3 ? 100 : 
      avgSessionTime < 1.5 ? 70 + (avgSessionTime / 1.5) * 30 : 
      100 - Math.min((avgSessionTime - 3) * 10, 40);
    
    // Time consistency (working regularly vs sporadic)
    const workingDays = new Set(timeEntries.map(entry => 
      new Date(entry.startTime).toDateString()
    )).size;
    const consistencyScore = Math.min(workingDays * 20, 100);
    
    // Weighted average
    const efficiency = (completionRate * 0.4 + sessionEfficiency * 0.3 + consistencyScore * 0.3);
    
    return Math.round(Math.min(Math.max(efficiency, 0), 100));
  }

  // Calculate team statistics
  async calculateTeamStats(teamId, timeRange) {
    const { start, end } = this.getTimeRange(timeRange);
    const { start: prevStart, end: prevEnd } = this.getTimeRange(timeRange, true); // Previous period
    
    // Current period metrics
    const currentCards = await prisma.card.findMany({
      where: {
        assignees: { some: { teamId } },
        updatedAt: { gte: start, lte: end }
      },
      include: { timeEntries: true }
    });
    
    // Previous period metrics for trend calculation
    const previousCards = await prisma.card.findMany({
      where: {
        assignees: { some: { teamId } },
        updatedAt: { gte: prevStart, lte: prevEnd }
      },
      include: { timeEntries: true }
    });

    const currentCompleted = currentCards.filter(card => card.completedAt).length;
    const currentOnTime = currentCards.filter(card => card.isOnTime).length;
    const currentTotalTime = currentCards.reduce((sum, card) => 
      sum + card.timeEntries.reduce((cardSum, entry) => cardSum + (entry.totalDuration || 0), 0), 0) / 3600;
    
    const previousCompleted = previousCards.filter(card => card.completedAt).length;
    const previousOnTime = previousCards.filter(card => card.isOnTime).length;
    const previousTotalTime = previousCards.reduce((sum, card) => 
      sum + card.timeEntries.reduce((cardSum, entry) => cardSum + (entry.totalDuration || 0), 0), 0) / 3600;

    // Calculate trends
    const velocityTrend = this.calculatePercentageChange(currentCompleted, previousCompleted);
    const completionRateTrend = this.calculatePercentageChange(
      currentCards.length > 0 ? (currentOnTime / currentCards.length) * 100 : 0,
      previousCards.length > 0 ? (previousOnTime / previousCards.length) * 100 : 0
    );
    const avgTimeTrend = this.calculatePercentageChange(
      currentCards.length > 0 ? currentTotalTime / currentCards.length : 0,
      previousCards.length > 0 ? previousTotalTime / previousCards.length : 0
    );

    // Team efficiency calculation
    const teamMembers = await prisma.user.findMany({
      where: { teamId },
      include: { timeEntries: { where: { startTime: { gte: start, lte: end } } } }
    });
    
    const teamEfficiency = teamMembers.length > 0 ? 
      teamMembers.reduce((sum, member) => sum + this.calculateUserEfficiency(member, timeRange), 0) / teamMembers.length : 0;

    return {
      velocity: currentCompleted,
      velocityTrend,
      completionRate: currentCards.length > 0 ? Math.round((currentOnTime / currentCards.length) * 100) : 0,
      completionRateTrend,
      avgCompletionTime: currentCards.length > 0 ? parseFloat((currentTotalTime / currentCards.length).toFixed(1)) : 0,
      avgCompletionTimeTrend: avgTimeTrend,
      teamEfficiency: Math.round(teamEfficiency),
      teamEfficiencyTrend: 3 // This should be calculated from historical data
    };
  }

  // Calculate velocity data for charts
  async calculateVelocityData(teamId, timeRange) {
    const periods = this.getPeriods(timeRange);
    
    const velocityData = await Promise.all(periods.map(async (period) => {
      const cards = await prisma.card.findMany({
        where: {
          assignees: { some: { teamId } },
          updatedAt: { gte: period.start, lte: period.end }
        }
      });
      
      const planned = cards.length;
      const completed = cards.filter(card => card.completedAt).length;
      
      return {
        [timeRange === 'day' ? 'hour' : timeRange === 'week' ? 'week' : timeRange === 'month' ? 'month' : 'quarter']: period.label,
        planned,
        completed
      };
    }));

    return velocityData;
  }

  // Calculate completion rates for pie chart
  async calculateCompletionRates(teamId, timeRange) {
    const { start, end } = this.getTimeRange(timeRange);
    
    const cards = await prisma.card.findMany({
      where: {
        assignees: { some: { teamId } },
        updatedAt: { gte: start, lte: end }
      }
    });

    const total = cards.length;
    const completed = cards.filter(card => card.completedAt).length;
    const onTime = cards.filter(card => card.isOnTime).length;
    const delayed = completed - onTime;
    const overdue = total - completed;

    return [
      { name: "On Time", value: total > 0 ? Math.round((onTime / total) * 100) : 0 },
      { name: "Delayed", value: total > 0 ? Math.round((delayed / total) * 100) : 0 },
      { name: "Overdue", value: total > 0 ? Math.round((overdue / total) * 100) : 0 }
    ];
  }

  // Generate AI-powered team insights
  async generateTeamInsights(teamId, performanceData, timeRange) {
    const insights = [];
    const { memberPerformance, teamStats, velocityData } = performanceData;

    // Velocity insights
    if (teamStats.velocityTrend > 10) {
      insights.push(`Team velocity has increased by ${teamStats.velocityTrend}% - excellent momentum!`);
    } else if (teamStats.velocityTrend < -10) {
      insights.push(`Team velocity has decreased by ${Math.abs(teamStats.velocityTrend)}% - may need attention`);
    }

    // Top performer insights
    const topPerformer = memberPerformance.reduce((top, current) => 
      current.efficiency > top.efficiency ? current : top
    );
    if (topPerformer.efficiency > 90) {
      insights.push(`${topPerformer.name} has exceptional efficiency (${topPerformer.efficiency}%) with ${topPerformer.avgTime}h avg task time`);
    }

    // Team balance insights
    const efficiencySpread = Math.max(...memberPerformance.map(m => m.efficiency)) - 
                            Math.min(...memberPerformance.map(m => m.efficiency));
    if (efficiencySpread > 30) {
      insights.push(`Wide efficiency gap detected (${efficiencySpread}%) - consider knowledge sharing sessions`);
    }

    // Completion rate insights
    if (teamStats.completionRate > 90) {
      insights.push(`Outstanding completion rate (${teamStats.completionRate}%) - team consistently meets deadlines`);
    } else if (teamStats.completionRate < 70) {
      insights.push(`Completion rate (${teamStats.completionRate}%) below target - review sprint planning accuracy`);
    }

    return insights.slice(0, 4);
  }

  // Generate AI-powered team recommendations
  async generateTeamRecommendations(teamId, performanceData, timeRange) {
    const recommendations = [];
    const { memberPerformance, teamStats } = performanceData;

    // Efficiency recommendations
    const lowPerformers = memberPerformance.filter(m => m.efficiency < 70);
    if (lowPerformers.length > 0) {
      recommendations.push(`Provide additional support to ${lowPerformers.length} team member(s) with efficiency below 70%`);
    }

    // Session time recommendations
    const longSessions = memberPerformance.filter(m => m.avgTime > 4);
    if (longSessions.length > 0) {
      recommendations.push(`Encourage shorter work sessions for better focus - ${longSessions.length} member(s) averaging >4h per task`);
    }

    // Velocity recommendations
    if (teamStats.velocityTrend < 0) {
      recommendations.push("Consider sprint retrospective to identify and address velocity blockers");
    }

    // Completion time recommendations
    if (teamStats.avgCompletionTime > 6) {
      recommendations.push("Break down large tasks into smaller chunks to improve completion times");
    }

    // Collaboration recommendations
    const soloWorkers = memberPerformance.filter(m => m.tasksCompleted > 5 && m.efficiency < 80);
    if (soloWorkers.length > 1) {
      recommendations.push("Implement pair programming or code reviews to boost team collaboration and efficiency");
    }

    return recommendations.slice(0, 4);
  }

  // Helper methods
  getTimeRange(timeRange, previous = false) {
    const now = new Date();
    const offset = previous ? 1 : 0;
    
    switch (timeRange) {
      case 'day':
        const day = new Date(now);
        day.setDate(now.getDate() - offset);
        return {
          start: new Date(day.setHours(0, 0, 0, 0)),
          end: new Date(day.setHours(23, 59, 59, 999))
        };
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay() - (offset * 7));
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        return { start: weekStart, end: weekEnd };
      case 'month':
        const monthStart = new Date(now.getFullYear(), now.getMonth() - offset, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1 - offset, 0);
        monthEnd.setHours(23, 59, 59, 999);
        return { start: monthStart, end: monthEnd };
      default:
        return { start: new Date(0), end: now };
    }
  }

  getPeriods(timeRange) {
    const periods = [];
    const now = new Date();
    
    switch (timeRange) {
      case 'day':
        // Show hourly periods for today
        for (let i = 8; i >= 0; i--) {
          const start = new Date(now);
          start.setHours(9 + (8 - i), 0, 0, 0); // 9 AM to 5 PM
          const end = new Date(start);
          end.setHours(start.getHours() + 1, 0, 0, 0);
          
          periods.push({
            label: `${start.getHours()}:00`,
            start,
            end
          });
        }
        break;
        
      case 'week':
        // Show last 5 weeks
        for (let i = 4; i >= 0; i--) {
          const start = new Date(now);
          start.setDate(now.getDate() - (i * 7) - now.getDay());
          start.setHours(0, 0, 0, 0);
          const end = new Date(start);
          end.setDate(start.getDate() + 6);
          end.setHours(23, 59, 59, 999);
          
          periods.push({
            label: `Week ${5 - i}`,
            start,
            end
          });
        }
        break;
        
      case 'month':
        // Show last 6 months
        for (let i = 5; i >= 0; i--) {
          const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
          end.setHours(23, 59, 59, 999);
          
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                             'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          
          periods.push({
            label: monthNames[start.getMonth()],
            start,
            end
          });
        }
        break;
        
      case 'quarter':
        // Show last 4 quarters
        for (let i = 3; i >= 0; i--) {
          const quarterStart = Math.floor((now.getMonth() - (i * 3)) / 3) * 3;
          const year = now.getFullYear() - Math.floor((now.getMonth() - (i * 3)) / 12);
          const adjustedQuarter = ((quarterStart % 12) + 12) % 12;
          
          const start = new Date(year, adjustedQuarter, 1);
          const end = new Date(year, adjustedQuarter + 3, 0);
          end.setHours(23, 59, 59, 999);
          
          periods.push({
            label: `Q${Math.floor(adjustedQuarter / 3) + 1} ${year}`,
            start,
            end
          });
        }
        break;
        
      default:
        break;
    }
    
    return periods;
  }

  calculatePercentageChange(current, previous) {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  calculateTrend(userId, timeRange) {
    // This would compare current period vs previous period
    // For now, returning random trend for demo
    return Math.random() > 0.5 ? 'up' : 'down';
  }

  getUserRole(user) {
    // Extract role from user data or default mapping
    if (user.email?.includes('qa')) return 'QA Engineer';
    if (user.email?.includes('backend')) return 'Backend Developer';
    if (user.email?.includes('frontend')) return 'Frontend Developer';
    if (user.email?.includes('design')) return 'UI/UX Designer';
    if (user.email?.includes('fullstack')) return 'Full-Stack Developer';
    if (user.email?.includes('devops')) return 'DevOps Engineer';
    if (user.email?.includes('product')) return 'Product Manager';
    if (user.email?.includes('security')) return 'Security Engineer';
    if (user.email?.includes('captain')) return 'Team Lead';
    
    // Fallback based on name patterns
    if (user.name?.toLowerCase().includes('captain') || user.name?.toLowerCase().includes('lead')) return 'Team Lead';
    
    return 'Developer';
  }
}

module.exports = new AnalyticsService(); 