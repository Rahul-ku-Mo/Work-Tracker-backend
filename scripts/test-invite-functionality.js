const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testInviteFunctionality() {
  try {
    console.log('🧪 Testing Invite Code Functionality...\n');

    // 1. Check if there are any teams with join codes
    const teamsWithCodes = await prisma.team.findMany({
      where: {
        joinCode: {
          not: null
        }
      },
      include: {
        captain: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        members: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    console.log(`✅ Found ${teamsWithCodes.length} teams with join codes:`);
    teamsWithCodes.forEach(team => {
      console.log(`   - ${team.name} (Code: ${team.joinCode}) - Captain: ${team.captain.name}`);
      console.log(`     Members: ${team.members.length}`);
    });

    // 2. Check if there are users not in teams
    const usersWithoutTeams = await prisma.user.findMany({
      where: {
        teamId: null
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });

    console.log(`\n✅ Found ${usersWithoutTeams.length} users without teams:`);
    usersWithoutTeams.forEach(user => {
      console.log(`   - ${user.name || user.email} (${user.role})`);
    });

    // 3. Test join code validation
    if (teamsWithCodes.length > 0) {
      const testTeam = teamsWithCodes[0];
      console.log(`\n🔍 Testing join code validation for team: ${testTeam.name}`);
      
      // Test valid join code
      const validCodeTest = await prisma.team.findUnique({
        where: { joinCode: testTeam.joinCode }
      });
      
      if (validCodeTest) {
        console.log(`   ✅ Valid join code test passed: ${testTeam.joinCode}`);
      } else {
        console.log(`   ❌ Valid join code test failed`);
      }

      // Test invalid join code
      const invalidCodeTest = await prisma.team.findUnique({
        where: { joinCode: 'INVALID123' }
      });
      
      if (!invalidCodeTest) {
        console.log(`   ✅ Invalid join code test passed: INVALID123 not found`);
      } else {
        console.log(`   ❌ Invalid join code test failed`);
      }
    }

    // 4. Check notification system
    const recentNotifications = await prisma.notification.findMany({
      where: {
        message: 'JOIN'
      },
      take: 5,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        sender: {
          select: {
            name: true,
            email: true
          }
        },
        receiver: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    console.log(`\n✅ Found ${recentNotifications.length} recent JOIN notifications:`);
    recentNotifications.forEach(notification => {
      console.log(`   - From: ${notification.sender.name} To: ${notification.receiver.name} (${notification.createdAt})`);
    });

    // 5. Summary
    console.log('\n📊 Summary:');
    console.log(`   - Teams with join codes: ${teamsWithCodes.length}`);
    console.log(`   - Users available to join: ${usersWithoutTeams.length}`);
    console.log(`   - Recent join notifications: ${recentNotifications.length}`);
    
    if (teamsWithCodes.length > 0 && usersWithoutTeams.length > 0) {
      console.log('\n✅ System is ready for invite code functionality!');
      console.log(`\n💡 To test manually:`);
      console.log(`   1. Use join code: ${teamsWithCodes[0].joinCode}`);
      console.log(`   2. Test with user: ${usersWithoutTeams[0]?.email || 'No available users'}`);
    } else {
      console.log('\n⚠️  System needs setup:');
      if (teamsWithCodes.length === 0) {
        console.log('   - No teams with join codes found');
      }
      if (usersWithoutTeams.length === 0) {
        console.log('   - No users available to join teams');
      }
    }

  } catch (error) {
    console.error('❌ Error testing invite functionality:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testInviteFunctionality(); 