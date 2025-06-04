const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testToggleUser() {
  try {
    console.log('🚀 Testing toggle user functionality...');

    // Get a test user to toggle
    const testUser = await prisma.user.findFirst({
      where: {
        email: 'alice.johnson@test.com'
      },
      include: {
        team: true
      }
    });

    if (!testUser) {
      console.log('❌ Test user not found. Please run add-test-users.js first.');
      return;
    }

    console.log(`✅ Found test user: ${testUser.name} (${testUser.email})`);
    console.log(`Current status: ${testUser.isActive ? 'Active' : 'Inactive'}`);

    // Get team captain/admin
    const admin = await prisma.user.findFirst({
      where: {
        role: 'ADMIN'
      },
      include: {
        captainOf: true,
        team: true
      }
    });

    if (!admin) {
      console.log('❌ No admin user found.');
      return;
    }

    console.log(`✅ Found admin: ${admin.name || admin.email}`);
    console.log(`Admin role: ${admin.role}`);
    console.log(`Is team captain: ${admin.captainOf ? 'Yes' : 'No'}`);

    // Toggle user status
    const newStatus = !testUser.isActive;
    console.log(`🔄 Toggling user status to: ${newStatus ? 'Active' : 'Inactive'}`);

    const updatedUser = await prisma.user.update({
      where: { id: testUser.id },
      data: { isActive: newStatus },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        department: true,
        efficiency: true
      }
    });

    console.log(`✅ User status updated successfully!`);
    console.log(`User: ${updatedUser.name} (${updatedUser.email})`);
    console.log(`New status: ${updatedUser.isActive ? 'Active' : 'Inactive'}`);

    // Test the authorization logic
    const canModify = admin.role === 'ADMIN' || 
                     (admin.captainOf && admin.captainOf.id === testUser.teamId);

    console.log('\n📋 Authorization Check:');
    console.log(`Admin can modify user: ${canModify ? 'Yes' : 'No'}`);
    console.log(`Admin role check: ${admin.role === 'ADMIN' ? 'Pass' : 'Fail'}`);
    console.log(`Team captain check: ${admin.captainOf && admin.captainOf.id === testUser.teamId ? 'Pass' : 'Fail'}`);

  } catch (error) {
    console.error('❌ Error testing toggle user:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testToggleUser(); 