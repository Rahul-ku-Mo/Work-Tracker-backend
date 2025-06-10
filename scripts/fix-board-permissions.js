const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixBoardPermissions() {
  try {
    console.log('🔧 Fixing board permissions...');

    // Get all teams with their members
    const teams = await prisma.team.findMany({
      include: {
        members: true
      }
    });

    console.log(`Found ${teams.length} teams`);

    for (const team of teams) {
      console.log(`\n👥 Processing team: ${team.name} (${team.members.length} members)`);

      // Get all boards created by team members
      const teamMemberIds = team.members.map(member => member.id);
      
      const boards = await prisma.board.findMany({
        where: {
          userId: {
            in: teamMemberIds
          }
        },
        include: {
          members: true,
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      });

      console.log(`Found ${boards.length} boards created by team members`);

      for (const board of boards) {
        console.log(`\n📋 Processing board: ${board.title} (created by ${board.user.name || board.user.email})`);

        // Ensure board creator has admin access
        const creatorAccess = await prisma.boardUser.findUnique({
          where: {
            boardId_userId: {
              boardId: board.id,
              userId: board.userId
            }
          }
        });

        if (!creatorAccess) {
          await prisma.boardUser.create({
            data: {
              boardId: board.id,
              userId: board.userId,
              role: 'ADMIN'
            }
          });
          console.log(`  ✅ Added creator as ADMIN`);
        } else {
          console.log(`  ✓ Creator already has access (${creatorAccess.role})`);
        }

        // Add all team members to this board if they don't have access
        for (const member of team.members) {
          if (member.id === board.userId) continue; // Skip creator

          const memberAccess = await prisma.boardUser.findUnique({
            where: {
              boardId_userId: {
                boardId: board.id,
                userId: member.id
              }
            }
          });

          if (!memberAccess) {
            await prisma.boardUser.create({
              data: {
                boardId: board.id,
                userId: member.id,
                role: 'MEMBER'
              }
            });
            console.log(`  ✅ Added ${member.name || member.email} as MEMBER`);
          } else {
            console.log(`  ✓ ${member.name || member.email} already has access (${memberAccess.role})`);
          }
        }
      }
    }

    console.log('\n🎉 Board permissions fixed successfully!');
  } catch (error) {
    console.error('❌ Error fixing board permissions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixBoardPermissions(); 