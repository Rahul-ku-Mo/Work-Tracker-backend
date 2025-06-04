const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function addTestUsers() {
  try {
    console.log('🚀 Starting to add test users...');

    // Find the first team (assuming there's at least one)
    const existingTeam = await prisma.team.findFirst({
      include: {
        members: true
      }
    });

    if (!existingTeam) {
      console.log('❌ No team found. Please create a team first.');
      return;
    }

    console.log(`✅ Found team: ${existingTeam.name}`);

    // Test users to add
    const testUsers = [
      {
        email: 'alice.johnson@test.com',
        username: 'alice_dev',
        name: 'Alice Johnson',
        password: 'password123',
        department: 'Frontend Development',
        role: 'USER',
        efficiency: 95,
        isActive: true
      },
      {
        email: 'bob.smith@test.com',
        username: 'bob_backend',
        name: 'Bob Smith',
        password: 'password123',
        department: 'Backend Development',
        role: 'USER',
        efficiency: 88,
        isActive: true
      },
      {
        email: 'carol.designer@test.com',
        username: 'carol_ui',
        name: 'Carol Chen',
        password: 'password123',
        department: 'UI/UX Design',
        role: 'USER',
        efficiency: 92,
        isActive: true
      },
      {
        email: 'david.tester@test.com',
        username: 'david_qa',
        name: 'David Rodriguez',
        password: 'password123',
        department: 'Quality Assurance',
        role: 'USER',
        efficiency: 89,
        isActive: true
      },
      {
        email: 'eve.manager@test.com',
        username: 'eve_pm',
        name: 'Eve Thompson',
        password: 'password123',
        department: 'Project Management',
        role: 'USER',
        efficiency: 94,
        isActive: true
      },
      {
        email: 'inactive.user@test.com',
        username: 'inactive_user',
        name: 'Inactive User',
        password: 'password123',
        department: 'Development',
        role: 'USER',
        efficiency: 75,
        isActive: false
      }
    ];

    const createdUsers = [];

    for (const userData of testUsers) {
      try {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
          where: { email: userData.email }
        });

        if (existingUser) {
          console.log(`⚠️  User ${userData.email} already exists, skipping...`);
          continue;
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(userData.password, 10);

        // Create the user
        const newUser = await prisma.user.create({
          data: {
            email: userData.email,
            username: userData.username,
            name: userData.name,
            password: hashedPassword,
            department: userData.department,
            role: userData.role,
            efficiency: userData.efficiency,
            isActive: userData.isActive,
            teamId: existingTeam.id
          }
        });

        createdUsers.push(newUser);
        console.log(`✅ Created user: ${newUser.name} (${newUser.email})`);

      } catch (error) {
        console.error(`❌ Error creating user ${userData.email}:`, error.message);
      }
    }

    // Get updated team info
    const updatedTeam = await prisma.team.findUnique({
      where: { id: existingTeam.id },
      include: {
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
            role: true,
            isActive: true,
            efficiency: true
          }
        }
      }
    });

    console.log('🎉 Test users added successfully!');
    console.log(`
📊 Team Summary:
- Team: ${updatedTeam.name}
- Total Members: ${updatedTeam.members.length}
- Active Members: ${updatedTeam.members.filter(m => m.isActive).length}
- Inactive Members: ${updatedTeam.members.filter(m => !m.isActive).length}

👥 Team Members:
${updatedTeam.members.map(member => 
  `  - ${member.name} (${member.email}) - ${member.department} - ${member.isActive ? '✅ Active' : '❌ Inactive'} - ${member.efficiency}% efficiency`
).join('\n')}

🔐 Test User Credentials:
All test users have the password: "password123"

🚀 You can now test team permissions and board access!
    `);

  } catch (error) {
    console.error('❌ Error adding test users:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
addTestUsers(); 