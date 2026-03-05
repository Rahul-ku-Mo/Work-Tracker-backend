const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

// Dummy users data with realistic names and roles
const dummyUsers = [
  {
    name: "John Doe",
    email: "john.doe@company.com",
    username: "johndoe",
    department: "Engineering",
    role: "USER"
  },
  {
    name: "Jane Smith",
    email: "jane.smith@company.com",
    username: "janesmith",
    department: "Design",
    role: "USER"
  },
  {
    name: "Mike Johnson",
    email: "mike.johnson@company.com",
    username: "mikej",
    department: "Product",
    role: "USER"
  },
  {
    name: "Sarah Wilson",
    email: "sarah.wilson@company.com",
    username: "sarahw",
    department: "Marketing",
    role: "USER"
  },
  {
    name: "Alex Chen",
    email: "alex.chen@company.com",
    username: "alexchen",
    department: "Engineering",
    role: "USER"
  },
  {
    name: "Emily Davis",
    email: "emily.davis@company.com",
    username: "emilyd",
    department: "QA",
    role: "USER"
  },
  {
    name: "David Brown",
    email: "david.brown@company.com",
    username: "davidb",
    department: "Engineering",
    role: "USER"
  },
  {
    name: "Lisa Anderson",
    email: "lisa.anderson@company.com",
    username: "lisaa",
    department: "Design",
    role: "USER"
  },
  {
    name: "Robert Taylor",
    email: "robert.taylor@company.com",
    username: "robertt",
    department: "Product",
    role: "USER"
  },
  {
    name: "Maria Garcia",
    email: "maria.garcia@company.com",
    username: "mariag",
    department: "Marketing",
    role: "USER"
  },
  {
    name: "James Wilson",
    email: "james.wilson@company.com",
    username: "jamesw",
    department: "Engineering",
    role: "USER"
  },
  {
    name: "Jennifer Lee",
    email: "jennifer.lee@company.com",
    username: "jenniferl",
    department: "Design",
    role: "USER"
  },
  {
    name: "Christopher Martinez",
    email: "christopher.martinez@company.com",
    username: "chrism",
    department: "Product",
    role: "USER"
  },
  {
    name: "Amanda Thompson",
    email: "amanda.thompson@company.com",
    username: "amandat",
    department: "Marketing",
    role: "USER"
  },
  {
    name: "Daniel Rodriguez",
    email: "daniel.rodriguez@company.com",
    username: "danielr",
    department: "Engineering",
    role: "USER"
  }
];

async function createDummyUsers() {
  try {
    console.log('🚀 Creating dummy users for team...\n');

    // Hash the common password
    const hashedPassword = await bcrypt.hash('password@123', 10);
    console.log('✅ Password hashed successfully');

    // Get the first team (assuming there's at least one team)
    const team = await prisma.team.findFirst({
      include: {
        teamMembers: true
      }
    });

    if (!team) {
      console.error('❌ No team found. Please create a team first.');
      return;
    }

    console.log(`📋 Found team: ${team.name} (ID: ${team.id})`);
    console.log(`👥 Current members: ${team.teamMembers.length}\n`);

    const createdUsers = [];
    const failedUsers = [];

    // Create each dummy user
    for (const userData of dummyUsers) {
      try {
        // Check if user already exists
        const existingUser = await prisma.user.findFirst({
          where: {
            OR: [
              { email: userData.email },
              { username: userData.username }
            ]
          }
        });

        if (existingUser) {
          console.log(`⚠️  User ${userData.name} already exists, skipping...`);
          continue;
        }

        // Create the user
        const user = await prisma.user.create({
          data: {
            ...userData,
            password: hashedPassword,
            isActive: true
          }
        });

        // Create TeamMember record to associate user with team
        await prisma.teamMember.create({
          data: {
            teamId: team.id,
            userId: user.id,
            role: 'MEMBER'
          }
        });

        createdUsers.push(user);
        console.log(`✅ Created user: ${user.name} (${user.email})`);

      } catch (error) {
        console.error(`❌ Failed to create user ${userData.name}:`, error.message);
        failedUsers.push(userData);
      }
    }

    // Summary
    console.log('\n📊 Summary:');
    console.log(`✅ Successfully created: ${createdUsers.length} users`);
    console.log(`❌ Failed to create: ${failedUsers.length} users`);
    console.log(`👥 Total team members now: ${team.teamMembers.length + createdUsers.length}`);

    if (createdUsers.length > 0) {
      console.log('\n👤 Created users:');
      createdUsers.forEach(user => {
        console.log(`   - ${user.name} (${user.email}) - @${user.username}`);
      });
    }

    if (failedUsers.length > 0) {
      console.log('\n❌ Failed users:');
      failedUsers.forEach(user => {
        console.log(`   - ${user.name} (${user.email})`);
      });
    }

    console.log('\n🔑 All users have password: password@123');
    console.log('🎉 Dummy users creation completed!');

  } catch (error) {
    console.error('❌ Error creating dummy users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createDummyUsers(); 