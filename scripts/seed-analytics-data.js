const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedAnalyticsData() {
  try {
    console.log('🚀 Starting analytics data seeding...');

    // Create team captain first
    const captain = await prisma.user.upsert({
      where: { id: 'captain-1' },
      update: {},
      create: {
        id: 'captain-1',
        email: 'captain@example.com',
        name: 'Alex Rodriguez',
        efficiency: 92,
        role: 'USER'
      }
    });

    console.log('✅ Captain created:', captain.name);

    // Create a sample team
    const team = await prisma.team.upsert({
      where: { id: 'team-1' },
      update: {},
      create: {
        id: 'team-1',
        name: 'Development Team Alpha',
        joinCode: 'ALPHA2024',
        captainId: captain.id
      }
    });

    console.log('✅ Team created:', team.name);

    // Update captain to be part of the team
    await prisma.user.update({
      where: { id: captain.id },
      data: { teamId: team.id }
    });

    // Create team members with varying performance profiles
    const teamMembers = [
      {
        id: 'user-1',
        email: 'sarah.frontend@example.com',
        name: 'Sarah Chen',
        efficiency: 89,
        role: 'Frontend Developer'
      },
      {
        id: 'user-2',
        email: 'mike.backend@example.com',
        name: 'Mike Johnson',
        efficiency: 76,
        role: 'Backend Developer'
      },
      {
        id: 'user-3',
        email: 'emma.qa@example.com',
        name: 'Emma Wilson',
        efficiency: 94,
        role: 'QA Engineer'
      },
      {
        id: 'user-4',
        email: 'david.design@example.com',
        name: 'David Kim',
        efficiency: 81,
        role: 'UI/UX Designer'
      }
    ];

    for (const member of teamMembers) {
      await prisma.user.upsert({
        where: { id: member.id },
        update: {},
        create: {
          id: member.id,
          email: member.email,
          name: member.name,
          teamId: team.id,
          efficiency: member.efficiency,
          role: 'USER'
        }
      });
    }

    console.log('✅ Team members created');

    // Create a sample board
    const board = await prisma.board.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        title: 'Product Development Board',
        userId: captain.id,
        colorId: 'blue',
        colorValue: '#3b82f6',
        colorName: 'Blue'
      }
    });

    // Create columns
    const columns = [
      { title: 'Backlog', order: 1 },
      { title: 'In Progress', order: 2 },
      { title: 'Review', order: 3 },
      { title: 'Done', order: 4 }
    ];

    const createdColumns = [];
    for (const col of columns) {
      // Check if column already exists
      let column = await prisma.column.findFirst({
        where: {
          boardId: board.id,
          order: col.order
        }
      });

      if (!column) {
        column = await prisma.column.create({
          data: {
            title: col.title,
            order: col.order,
            boardId: board.id
          }
        });
      }
      createdColumns.push(column);
    }

    console.log('✅ Board and columns created');

    // Create cards with realistic data
    const cards = [
      {
        title: 'User Authentication System',
        description: 'Implement OAuth 2.0 authentication',
        priority: 'high',
        estimatedHours: 12,
        assigneeId: 'user-2', // Mike (Backend)
        columnId: createdColumns[3].id, // Done
        completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        isOnTime: true
      },
      {
        title: 'Dashboard UI Components',
        description: 'Create reusable dashboard components',
        priority: 'medium',
        estimatedHours: 8,
        assigneeId: 'user-1', // Sarah (Frontend)
        columnId: createdColumns[3].id, // Done
        completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        isOnTime: true
      },
      {
        title: 'API Integration Tests',
        description: 'Comprehensive API testing suite',
        priority: 'high',
        estimatedHours: 6,
        assigneeId: 'user-3', // Emma (QA)
        columnId: createdColumns[2].id, // Review
        completedAt: null,
        isOnTime: null
      },
      {
        title: 'Mobile App Wireframes',
        description: 'Design mobile app user flows',
        priority: 'medium',
        estimatedHours: 10,
        assigneeId: 'user-4', // David (Design)
        columnId: createdColumns[1].id, // In Progress
        completedAt: null,
        isOnTime: null
      },
      {
        title: 'Database Optimization',
        description: 'Optimize slow queries and indexing',
        priority: 'low',
        estimatedHours: 15,
        assigneeId: 'user-2', // Mike (Backend)
        columnId: createdColumns[1].id, // In Progress
        completedAt: null,
        isOnTime: null
      },
      {
        title: 'User Onboarding Flow',
        description: 'Design and implement user onboarding',
        priority: 'medium',
        estimatedHours: 9,
        assigneeId: 'user-1', // Sarah (Frontend)
        columnId: createdColumns[0].id, // Backlog
        completedAt: null,
        isOnTime: null
      }
    ];

    const createdCards = [];
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const createdCard = await prisma.card.create({
        data: {
          title: card.title,
          description: card.description,
          order: i + 1,
          priority: card.priority,
          estimatedHours: card.estimatedHours,
          columnId: card.columnId,
          creatorId: captain.id,
          completedAt: card.completedAt,
          isOnTime: card.isOnTime,
          assignees: {
            connect: { id: card.assigneeId }
          }
        }
      });
      createdCards.push(createdCard);
    }

    console.log('✅ Cards created');

    // Create realistic time entries for the past week
    const timeEntries = [];
    const now = new Date();
    
    // Generate time entries for completed cards
    for (const card of createdCards.slice(0, 2)) { // First 2 cards are completed
      const assignee = teamMembers.find(m => m.id === (card.title.includes('Authentication') ? 'user-2' : 'user-1'));
      
      // Create multiple work sessions over several days
      for (let day = 0; day < 5; day++) {
        const workDate = new Date(now.getTime() - (day + 2) * 24 * 60 * 60 * 1000);
        
        // 1-3 sessions per day
        const sessionsPerDay = Math.floor(Math.random() * 3) + 1;
        
        for (let session = 0; session < sessionsPerDay; session++) {
          const sessionStart = new Date(workDate);
          sessionStart.setHours(9 + session * 3, Math.floor(Math.random() * 60), 0, 0);
          
          const sessionEnd = new Date(sessionStart);
          sessionEnd.setTime(sessionStart.getTime() + (1 + Math.random() * 2) * 60 * 60 * 1000); // 1-3 hours
          
          const timeEntry = await prisma.timeEntry.create({
            data: {
              userId: assignee ? (card.title.includes('Authentication') ? 'user-2' : 'user-1') : 'user-1',
              cardId: card.id,
              startTime: sessionStart,
              endTime: sessionEnd,
              totalDuration: Math.floor((sessionEnd.getTime() - sessionStart.getTime()) / 1000),
              isPaused: false
            }
          });
          timeEntries.push(timeEntry);
        }
      }
    }

    // Create time entries for in-progress cards
    for (const card of createdCards.slice(2, 5)) { // Cards 3-5 are in progress
      const assigneeMap = {
        'API Integration Tests': 'user-3',
        'Mobile App Wireframes': 'user-4',
        'Database Optimization': 'user-2'
      };
      
      const assigneeId = assigneeMap[card.title] || 'user-1';
      
      // Create fewer sessions for in-progress work
      for (let day = 0; day < 3; day++) {
        const workDate = new Date(now.getTime() - day * 24 * 60 * 60 * 1000);
        
        const sessionStart = new Date(workDate);
        sessionStart.setHours(10 + day, Math.floor(Math.random() * 60), 0, 0);
        
        const sessionEnd = new Date(sessionStart);
        sessionEnd.setTime(sessionStart.getTime() + (0.5 + Math.random() * 2.5) * 60 * 60 * 1000); // 0.5-3 hours
        
        const timeEntry = await prisma.timeEntry.create({
          data: {
            userId: assigneeId,
            cardId: card.id,
            startTime: sessionStart,
            endTime: sessionEnd,
            totalDuration: Math.floor((sessionEnd.getTime() - sessionStart.getTime()) / 1000),
            isPaused: false
          }
        });
        timeEntries.push(timeEntry);
      }
    }

    console.log('✅ Time entries created:', timeEntries.length);

    // Create performance snapshots for trend analysis
    for (let day = 0; day < 7; day++) {
      const snapshotDate = new Date(now.getTime() - day * 24 * 60 * 60 * 1000);
      
      await prisma.teamPerformanceSnapshot.create({
        data: {
          teamId: team.id,
          date: snapshotDate,
          velocity: Math.floor(12 + Math.random() * 8), // 12-20 story points
          velocityTrend: -5 + Math.random() * 15, // -5% to +10%
          completionRate: 75 + Math.random() * 20, // 75-95%
          completionRateTrend: -3 + Math.random() * 10, // -3% to +7%
          avgCompletionTime: 4 + Math.random() * 6, // 4-10 hours
          avgCompletionTimeTrend: -10 + Math.random() * 15, // -10% to +5%
          teamEfficiency: 78 + Math.random() * 17, // 78-95%
          teamEfficiencyTrend: -2 + Math.random() * 8 // -2% to +6%
        }
      });
    }

    console.log('✅ Performance snapshots created');

    // Create user performance history
    const allUsers = [captain, ...teamMembers.map(m => ({ id: m.id }))];
    for (const user of allUsers) {
      for (let day = 0; day < 7; day++) {
        const historyDate = new Date(now.getTime() - day * 24 * 60 * 60 * 1000);
        
        await prisma.userPerformanceHistory.create({
          data: {
            userId: user.id,
            date: historyDate,
            tasksCompleted: Math.floor(Math.random() * 3), // 0-2 tasks per day
            hoursWorked: 2 + Math.random() * 6, // 2-8 hours
            avgSessionTime: 1 + Math.random() * 3, // 1-4 hours
            efficiencyScore: 70 + Math.random() * 25, // 70-95%
            productivityRating: 3 + Math.random() * 2, // 3-5 rating
            productivityTrend: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)]
          }
        });
      }
    }

    console.log('✅ User performance history created');

    console.log('🎉 Analytics data seeding completed successfully!');
    console.log(`
📊 Created:
- 1 Team (${team.name})
- 5 Team Members (including captain)
- 1 Board with 4 columns
- 6 Cards with varying priorities and states
- ${timeEntries.length} Time Entries across multiple work sessions
- 7 Team Performance Snapshots
- 35 User Performance History records (7 days × 5 users)

🚀 Your analytics dashboard is now ready with realistic data!
    `);

  } catch (error) {
    console.error('❌ Error seeding analytics data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
if (require.main === module) {
  seedAnalyticsData()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { seedAnalyticsData }; 