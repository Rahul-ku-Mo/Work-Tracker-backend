const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedTeamMembers() {
  try {
    console.log('🚀 Starting team members seeding...');

    // Find the first admin user (current user)
    const currentUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      include: { team: true, captainOf: true }
    });

    if (!currentUser) {
      console.log('❌ No admin user found. Please create an admin user first.');
      return;
    }

    console.log(`✅ Found admin user: ${currentUser.name || currentUser.email}`);

    let team;

    // Check if user already has a team (either as captain or member)
    if (currentUser.captainOf) {
      team = currentUser.captainOf;
      console.log(`✅ User is already captain of team: ${team.name}`);
    } else if (currentUser.team) {
      team = currentUser.team;
      console.log(`✅ User is already member of team: ${team.name}`);
    } else {
      // Create a new team with current user as captain
      const joinCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      
      team = await prisma.team.create({
        data: {
          name: 'Development Team',
          joinCode,
          captainId: currentUser.id,
          members: {
            connect: { id: currentUser.id }
          }
        }
      });
      
      console.log(`✅ Created new team: ${team.name} with join code: ${team.joinCode}`);
    }

    // Create team members with unique emails
    const teamMembers = [
      {
        email: 'sarah.frontend@pulseboard.dev',
        name: 'Sarah Chen',
        username: 'sarah_chen',
        role: 'Frontend Developer',
        imageUrl: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face'
      },
      {
        email: 'mike.backend@pulseboard.dev',
        name: 'Mike Johnson',
        username: 'mike_johnson',
        role: 'Backend Developer',
        imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face'
      },
      {
        email: 'emma.qa@pulseboard.dev',
        name: 'Emma Wilson',
        username: 'emma_wilson',
        role: 'QA Engineer',
        imageUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face'
      },
      {
        email: 'david.design@pulseboard.dev',
        name: 'David Kim',
        username: 'david_kim',
        role: 'UI/UX Designer',
        imageUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
      },
      {
        email: 'alex.fullstack@pulseboard.dev',
        name: 'Alex Rodriguez',
        username: 'alex_rodriguez',
        role: 'Full Stack Developer',
        imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face'
      }
    ];

    const createdMembers = [];

    for (const memberData of teamMembers) {
      try {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
          where: { email: memberData.email }
        });

        if (existingUser) {
          console.log(`⚠️  User ${memberData.email} already exists, skipping...`);
          
          // Check if they're already in the team
          const isInTeam = await prisma.team.findFirst({
            where: {
              id: team.id,
              members: { some: { id: existingUser.id } }
            }
          });

          if (!isInTeam) {
            // Add existing user to team
            await prisma.team.update({
              where: { id: team.id },
              data: {
                members: { connect: { id: existingUser.id } }
              }
            });
            console.log(`✅ Added existing user ${memberData.name} to team`);
          }
          
          createdMembers.push(existingUser);
          continue;
        }

        // Create new user
        const newUser = await prisma.user.create({
          data: {
            email: memberData.email,
            name: memberData.name,
            username: memberData.username,
            imageUrl: memberData.imageUrl,
            role: 'USER',
            teamId: team.id
          }
        });

        // Add to team members
        await prisma.team.update({
          where: { id: team.id },
          data: {
            members: { connect: { id: newUser.id } }
          }
        });

        createdMembers.push(newUser);
        console.log(`✅ Created and added ${memberData.name} to team`);
      } catch (error) {
        console.error(`❌ Error creating user ${memberData.email}:`, error.message);
      }
    }

    // Get final team with all members
    const finalTeam = await prisma.team.findUnique({
      where: { id: team.id },
      include: {
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            imageUrl: true
          }
        },
        captain: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    console.log('🎉 Team members seeding completed successfully!');
    console.log(`
📊 Team Summary:
- Team: ${finalTeam.name}
- Captain: ${finalTeam.captain.name || finalTeam.captain.email}
- Total Members: ${finalTeam.members.length}
- Join Code: ${team.joinCode}

👥 Team Members:
${finalTeam.members.map(member => `  - ${member.name} (${member.email})`).join('\n')}

🚀 Your team is now ready for collaboration!
    `);

  } catch (error) {
    console.error('❌ Error seeding team members:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
if (require.main === module) {
  seedTeamMembers()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { seedTeamMembers }; 