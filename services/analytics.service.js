const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const analyticsService = {
  async calculateEfficiency(userId, timeRange) {
    const { start, end } = getTimeRange(timeRange);
    
    const userCards = await prisma.card.findMany({
      where: {
        assignees: {
          some: {
            id: userId
          }
        },
        completedAt: {
          gte: start,
          lte: end
        }
      }
    });

    const totalCards = userCards.length;
    const onTimeCards = userCards.filter(card => card.isOnTime).length;
    
    return totalCards > 0 ? Math.round((onTimeCards / totalCards) * 100) : null;
  },

  async updateUserEfficiency(userId) {
    const efficiency = await this.calculateEfficiency(userId, 'month');
    
    if (efficiency !== null) {
      await prisma.user.update({
        where: { id: userId },
        data: { efficiency }
      });
    }

    return efficiency;
  },

  async calculateSprintMetrics(sprintId) {
    const sprint = await prisma.sprint.findUnique({
      where: { id: sprintId },
      include: {
        cards: true
      }
    });

    if (!sprint) return null;

    const completedPoints = sprint.cards
      .filter(card => card.completedAt)
      .reduce((sum, card) => sum + (card.estimatedHours || 0), 0);

    const efficiency = sprint.plannedPoints > 0 
      ? (completedPoints / sprint.plannedPoints) * 100 
      : null;

    await prisma.sprint.update({
      where: { id: sprintId },
      data: {
        completedPoints,
        efficiency
      }
    });

    return { completedPoints, efficiency };
  }
};

module.exports = analyticsService; 