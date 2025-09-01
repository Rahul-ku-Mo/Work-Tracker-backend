const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

// 12 dummy users - 1 admin + 11 regular users
const dummyUsers = [
  // Admin user
  {
    name: "Alex Morgan",
    email: "admin@pulseboard.dev",
    username: "alexmorgan_admin",
    department: "Administration",
    role: "ADMIN",
    efficiency: 98,
    company: "PulseBoard Inc",
    phoneNumber: "+1-555-0001",
    state: "California",
    address: "123 Admin Street",
    zipCode: "90210",
    isActive: true,
    isPaidUser: true
  },
  // Regular users
  {
    name: "Emma Thompson",
    email: "emma.thompson@pulseboard.dev",
    username: "emma_frontend",
    department: "Frontend Development",
    role: "USER",
    efficiency: 94,
    company: "PulseBoard Inc",
    phoneNumber: "+1-555-0002",
    state: "New York",
    address: "456 Developer Ave",
    zipCode: "10001",
    isActive: true,
    isPaidUser: true
  },
  {
    name: "Liam Rodriguez",
    email: "liam.rodriguez@pulseboard.dev",
    username: "liam_backend",
    department: "Backend Development",
    role: "USER",
    efficiency: 91,
    company: "PulseBoard Inc",
    phoneNumber: "+1-555-0003",
    state: "Texas",
    address: "789 Backend Blvd",
    zipCode: "73301",
    isActive: true,
    isPaidUser: true
  },
  {
    name: "Sophia Chen",
    email: "sophia.chen@pulseboard.dev",
    username: "sophia_design",
    department: "UI/UX Design",
    role: "USER",
    efficiency: 96,
    company: "PulseBoard Inc",
    phoneNumber: "+1-555-0004",
    state: "California",
    address: "321 Design Drive",
    zipCode: "94105",
    isActive: true,
    isPaidUser: true
  },
  {
    name: "Noah Williams",
    email: "noah.williams@pulseboard.dev",
    username: "noah_devops",
    department: "DevOps",
    role: "USER",
    efficiency: 89,
    company: "PulseBoard Inc",
    phoneNumber: "+1-555-0005",
    state: "Washington",
    address: "654 Cloud Lane",
    zipCode: "98101",
    isActive: true,
    isPaidUser: true
  },
  {
    name: "Olivia Johnson",
    email: "olivia.johnson@pulseboard.dev",
    username: "olivia_qa",
    department: "Quality Assurance",
    role: "USER",
    efficiency: 93,
    company: "PulseBoard Inc",
    phoneNumber: "+1-555-0006",
    state: "Florida",
    address: "987 Testing Trail",
    zipCode: "33101",
    isActive: true,
    isPaidUser: true
  },
  {
    name: "Ethan Davis",
    email: "ethan.davis@pulseboard.dev",
    username: "ethan_mobile",
    department: "Mobile Development",
    role: "USER",
    efficiency: 90,
    company: "PulseBoard Inc",
    phoneNumber: "+1-555-0007",
    state: "Illinois",
    address: "147 Mobile Way",
    zipCode: "60601",
    isActive: true,
    isPaidUser: true
  },
  {
    name: "Ava Martinez",
    email: "ava.martinez@pulseboard.dev",
    username: "ava_product",
    department: "Product Management",
    role: "USER",
    efficiency: 95,
    company: "PulseBoard Inc",
    phoneNumber: "+1-555-0008",
    state: "Colorado",
    address: "258 Product Plaza",
    zipCode: "80201",
    isActive: true,
    isPaidUser: true
  },
  {
    name: "Mason Brown",
    email: "mason.brown@pulseboard.dev",
    username: "mason_data",
    department: "Data Science",
    role: "USER",
    efficiency: 88,
    company: "PulseBoard Inc",
    phoneNumber: "+1-555-0009",
    state: "Oregon",
    address: "369 Data Drive",
    zipCode: "97201",
    isActive: true,
    isPaidUser: true
  },
  {
    name: "Isabella Garcia",
    email: "isabella.garcia@pulseboard.dev",
    username: "isabella_marketing",
    department: "Marketing",
    role: "USER",
    efficiency: 92,
    company: "PulseBoard Inc",
    phoneNumber: "+1-555-0010",
    state: "Nevada",
    address: "741 Marketing Mile",
    zipCode: "89101",
    isActive: true,
    isPaidUser: true
  },
  {
    name: "William Anderson",
    email: "william.anderson@pulseboard.dev",
    username: "william_security",
    department: "Security",
    role: "USER",
    efficiency: 87,
    company: "PulseBoard Inc",
    phoneNumber: "+1-555-0011",
    state: "Georgia",
    address: "852 Security Street",
    zipCode: "30301",
    isActive: true,
    isPaidUser: true
  },
  {
    name: "Mia Wilson",
    email: "mia.wilson@pulseboard.dev",
    username: "mia_freelancer",
    department: "Freelance",
    role: "USER",
    efficiency: 85,
    company: "Freelance",
    phoneNumber: "+1-555-0012",
    state: "Arizona",
    address: "963 Freelance Blvd",
    zipCode: "85001",
    isActive: false, // One inactive user for testing
    isPaidUser: false
  }
];

async function create12DummyUsers() {
  try {
    console.log('🚀 Creating 12 dummy users (1 admin + 11 users)...\n');

    // Hash the common password
    const hashedPassword = await bcrypt.hash('pulseboard123', 10);
    console.log('✅ Password hashed successfully');

    // Find or create a team first
    let team = await prisma.team.findFirst({
      include: {
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true
          }
        }
      }
    });

    if (!team) {
      console.log('📋 No team found, creating default team...');
      
      // We need a captain for the team, so we'll create the admin user first
      const adminData = dummyUsers[0]; // First user is admin
      
      // Check if admin already exists
      const existingAdmin = await prisma.user.findFirst({
        where: {
          OR: [
            { email: adminData.email },
            { username: adminData.username }
          ]
        }
      });

      let adminUser;
      if (existingAdmin) {
        console.log(`⚠️  Admin user ${adminData.name} already exists, using existing user...`);
        adminUser = existingAdmin;
      } else {
        adminUser = await prisma.user.create({
          data: {
            ...adminData,
            password: hashedPassword
          }
        });
        console.log(`✅ Created admin user: ${adminUser.name}`);
      }

      // Create team with admin as captain
      team = await prisma.team.create({
        data: {
          name: "PulseBoard Development Team",
          captainId: adminUser.id,
          teamImageUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=300",
          members: {
            connect: { id: adminUser.id }
          }
        },
        include: {
          members: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              isActive: true
            }
          }
        }
      });

      // Update admin user with teamId
      await prisma.user.update({
        where: { id: adminUser.id },
        data: { teamId: team.id }
      });

      console.log(`✅ Created team: ${team.name} with captain: ${adminUser.name}`);
    } else {
      console.log(`📋 Found existing team: ${team.name} (ID: ${team.id})`);
    }

    console.log(`👥 Current team members: ${team.members.length}\n`);

    const createdUsers = [];
    const skippedUsers = [];
    const failedUsers = [];

    // Create remaining users (skip admin if we already processed it)
    const usersToCreate = team.members.length === 1 ? dummyUsers.slice(1) : dummyUsers;

    for (const userData of usersToCreate) {
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
          skippedUsers.push(userData);
          continue;
        }

        // Create the user with team association
        const user = await prisma.user.create({
          data: {
            ...userData,
            password: hashedPassword,
            teamId: team.id
          }
        });

        createdUsers.push(user);
        console.log(`✅ Created user: ${user.name} (${user.role === 'ADMIN' ? '👑 Admin' : '👤 User'}) - ${user.email}`);

      } catch (error) {
        console.error(`❌ Failed to create user ${userData.name}:`, error.message);
        failedUsers.push(userData);
      }
    }

    // Get updated team info
    const updatedTeam = await prisma.team.findUnique({
      where: { id: team.id },
      include: {
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            department: true,
            role: true,
            isActive: true,
            efficiency: true,
            isPaidUser: true
          }
        },
        captain: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    // Summary
    console.log('\n🎉 Dummy users creation completed!\n');
    console.log('📊 SUMMARY:');
    console.log(`✅ Successfully created: ${createdUsers.length} users`);
    console.log(`⚠️  Skipped (already exist): ${skippedUsers.length} users`);
    console.log(`❌ Failed to create: ${failedUsers.length} users`);
    console.log(`👥 Total team members: ${updatedTeam.members.length}`);
    console.log(`👑 Team captain: ${updatedTeam.captain.name}\n`);

    console.log('👤 TEAM ROSTER:');
    const adminUsers = updatedTeam.members.filter(m => m.role === 'ADMIN');
    const regularUsers = updatedTeam.members.filter(m => m.role === 'USER');

    console.log(`\n👑 ADMINISTRATORS (${adminUsers.length}):`);
    adminUsers.forEach(user => {
      console.log(`   - ${user.name} (@${user.username}) - ${user.department} - ${user.isActive ? '✅ Active' : '❌ Inactive'} - ${user.efficiency}% efficiency`);
    });

    console.log(`\n👤 REGULAR USERS (${regularUsers.length}):`);
    regularUsers.forEach(user => {
      console.log(`   - ${user.name} (@${user.username}) - ${user.department} - ${user.isActive ? '✅ Active' : '❌ Inactive'} - ${user.efficiency}% efficiency`);
    });

    if (createdUsers.length > 0) {
      console.log('\n🆕 NEWLY CREATED USERS:');
      createdUsers.forEach(user => {
        console.log(`   - ${user.name} (${user.email}) - @${user.username} - ${user.role === 'ADMIN' ? '👑 Admin' : '👤 User'}`);
      });
    }

    if (skippedUsers.length > 0) {
      console.log('\n⚠️  SKIPPED USERS (already exist):');
      skippedUsers.forEach(user => {
        console.log(`   - ${user.name} (${user.email})`);
      });
    }

    if (failedUsers.length > 0) {
      console.log('\n❌ FAILED USERS:');
      failedUsers.forEach(user => {
        console.log(`   - ${user.name} (${user.email})`);
      });
    }

    console.log('\n🔑 LOGIN CREDENTIALS:');
    console.log('   Email: Use any user email from above');
    console.log('   Password: pulseboard123');
    console.log('\n🎯 ADMIN ACCESS:');
    console.log('   Email: admin@pulseboard.dev');
    console.log('   Password: pulseboard123');
    console.log('\n🚀 Ready to test the application with realistic user data!');

  } catch (error) {
    console.error('❌ Error creating dummy users:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  create12DummyUsers()
    .then(() => {
      console.log('\n✨ Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { create12DummyUsers };
