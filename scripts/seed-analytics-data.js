const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedAnalyticsData() {
  try {
    console.log('🌱 Starting to seed analytics data...');

    // Create team captain first
    const captain = await prisma.user.upsert({
      where: { id: 'captain-1' },
      update: {},
      create: {
        id: 'captain-1',
        email: 'captain@example.com',
        name: 'Alex Johnson',
        username: 'alexj',
        role: 'ADMIN',
        efficiency: 95,
        imageUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
      }
    });

    console.log('✅ Team captain created');

    // Create team
    const team = await prisma.team.upsert({
      where: { id: 'team-alpha' },
      update: {},
      create: {
        id: 'team-alpha',
        name: 'Alpha Development Team',
        captainId: captain.id,
        joinCode: 'ALPHA2024'
      }
    });

    console.log('✅ Team created');

    // Create extended team members with diverse roles and skill sets
    const teamMembers = [
      {
        id: 'user-1',
        email: 'sarah.chen@example.com',
        name: 'Sarah Chen',
        username: 'sarahc',
        role: 'USER',
        efficiency: 88,
        department: 'Engineering',
        imageUrl: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face'
      },
      {
        id: 'user-2', 
        email: 'mike.rodriguez@example.com',
        name: 'Mike Rodriguez',
        username: 'miker',
        role: 'USER',
        efficiency: 92,
        department: 'Engineering',
        imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face'
      },
      {
        id: 'user-3',
        email: 'emma.thompson@example.com', 
        name: 'Emma Thompson',
        username: 'emmat',
        role: 'USER',
        efficiency: 85,
        department: 'Quality Assurance',
        imageUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face'
      },
      {
        id: 'user-4',
        email: 'david.kim@example.com',
        name: 'David Kim', 
        username: 'davidk',
        role: 'USER',
        efficiency: 90,
        department: 'Design',
        imageUrl: 'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=150&h=150&fit=crop&crop=face'
      },
      {
        id: 'user-5',
        email: 'lisa.wang@example.com',
        name: 'Lisa Wang',
        username: 'lisaw',
        role: 'USER', 
        efficiency: 89,
        department: 'Product Management',
        imageUrl: 'https://images.unsplash.com/photo-1554151228-14d9def656e4?w=150&h=150&fit=crop&crop=face'
      },
      {
        id: 'user-6',
        email: 'james.brown@example.com',
        name: 'James Brown',
        username: 'jamesb',
        role: 'USER',
        efficiency: 86,
        department: 'DevOps', 
        imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face'
      },
      {
        id: 'user-7',
        email: 'ana.garcia@example.com',
        name: 'Ana Garcia',
        username: 'anag',
        role: 'USER',
        efficiency: 91,
        department: 'Engineering',
        imageUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face'
      },
      {
        id: 'user-8',
        email: 'tom.wilson@example.com',
        name: 'Tom Wilson',
        username: 'tomw',
        role: 'USER',
        efficiency: 87,
        department: 'Security',
        imageUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&h=150&fit=crop&crop=face'
      }
    ];

    // Create team members
    for (const member of teamMembers) {
      await prisma.user.upsert({
        where: { id: member.id },
        update: {},
        create: {
          id: member.id,
          email: member.email,
          name: member.name,
          username: member.username,
          teamId: team.id,
          efficiency: member.efficiency,
          role: member.role,
          department: member.department,
          imageUrl: member.imageUrl
        }
      });
    }

    console.log('✅ Team members created');

    // Create multiple boards with different access levels
    const boards = [
      {
        id: 1,
        title: 'Product Development Board',
        userId: captain.id,
        colorId: 'blue',
        colorValue: '#3b82f6',
        colorName: 'Blue'
      },
      {
        id: 2, 
        title: 'Design System Project',
        userId: 'user-4', // David Kim (Designer)
        colorId: 'purple',
        colorValue: '#8b5cf6',
        colorName: 'Purple'
      },
      {
        id: 3,
        title: 'Security Audit Board',
        userId: 'user-8', // Tom Wilson (Security)
        colorId: 'red',
        colorValue: '#ef4444',
        colorName: 'Red'
      },
      {
        id: 4,
        title: 'QA Testing Pipeline',
        userId: 'user-3', // Emma Thompson (QA)
        colorId: 'green',
        colorValue: '#22c55e',
        colorName: 'Green'
      }
    ];

    const createdBoards = [];
    for (const board of boards) {
      const createdBoard = await prisma.board.upsert({
        where: { id: board.id },
        update: {},
        create: board
      });
      createdBoards.push(createdBoard);
    }

    console.log('✅ Boards created');

    // Create board members with different roles
    const boardMemberships = [
      // Product Development Board - Everyone has access
      { boardId: 1, userId: captain.id, role: 'ADMIN' },
      { boardId: 1, userId: 'user-1', role: 'MEMBER' },
      { boardId: 1, userId: 'user-2', role: 'MEMBER' },
      { boardId: 1, userId: 'user-3', role: 'MEMBER' },
      { boardId: 1, userId: 'user-4', role: 'MEMBER' },
      { boardId: 1, userId: 'user-5', role: 'ADMIN' }, // Lisa is also admin
      
      // Design System Project - Design focused
      { boardId: 2, userId: 'user-4', role: 'ADMIN' },
      { boardId: 2, userId: captain.id, role: 'ADMIN' },
      { boardId: 2, userId: 'user-1', role: 'MEMBER' },
      { boardId: 2, userId: 'user-5', role: 'MEMBER' },
      
      // Security Audit Board - Security team only
      { boardId: 3, userId: 'user-8', role: 'ADMIN' },
      { boardId: 3, userId: captain.id, role: 'ADMIN' },
      { boardId: 3, userId: 'user-6', role: 'MEMBER' }, // DevOps has access
      
      // QA Testing Pipeline - QA focused
      { boardId: 4, userId: 'user-3', role: 'ADMIN' },
      { boardId: 4, userId: captain.id, role: 'ADMIN' },
      { boardId: 4, userId: 'user-1', role: 'MEMBER' },
      { boardId: 4, userId: 'user-2', role: 'MEMBER' },
      { boardId: 4, userId: 'user-7', role: 'MEMBER' },
    ];

    for (const membership of boardMemberships) {
      await prisma.boardUser.upsert({
        where: {
          boardId_userId: {
            boardId: membership.boardId,
            userId: membership.userId
          }
        },
        update: { role: membership.role },
        create: membership
      });
    }

    console.log('✅ Board memberships created');

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
- 8 Team Members (including captain)
- 4 Boards with varying access levels
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