const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function assignCardsToMembers() {
  try {
    console.log('🚀 Starting card assignment to team members...');

    // Get all cards
    const cards = await prisma.card.findMany({
      include: {
        assignees: true,
      },
    });

    // Get all team members
    const teamMembers = await prisma.user.findMany({
      where: {
        role: 'USER', // Only regular users, not admins
      },
    });

    if (teamMembers.length === 0) {
      console.log('❌ No team members found. Please run the seed-team-members script first.');
      return;
    }

    console.log(`✅ Found ${cards.length} cards and ${teamMembers.length} team members`);

    // Assign cards to members randomly
    for (const card of cards) {
      // Skip if card already has assignees
      if (card.assignees.length > 0) {
        console.log(`⚠️  Card "${card.title}" already has assignees, skipping...`);
        continue;
      }

      // Randomly select a team member
      const randomMember = teamMembers[Math.floor(Math.random() * teamMembers.length)];

      try {
        await prisma.card.update({
          where: { id: card.id },
          data: {
            assignees: {
              connect: { id: randomMember.id },
            },
          },
        });

        console.log(`✅ Assigned "${card.title}" to ${randomMember.name || randomMember.email}`);
      } catch (error) {
        console.error(`❌ Error assigning card ${card.id}:`, error.message);
      }
    }

    // Get final summary
    const updatedCards = await prisma.card.findMany({
      include: {
        assignees: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const assignedCards = updatedCards.filter(card => card.assignees.length > 0);

    console.log('🎉 Card assignment completed successfully!');
    console.log(`
📊 Assignment Summary:
- Total Cards: ${updatedCards.length}
- Assigned Cards: ${assignedCards.length}
- Unassigned Cards: ${updatedCards.length - assignedCards.length}

📋 Assigned Cards:
${assignedCards.map(card => 
  `  - "${card.title}" → ${card.assignees.map(a => a.name || a.email).join(', ')}`
).join('\n')}

🚀 Your cards are now assigned to team members!
    `);

  } catch (error) {
    console.error('❌ Error assigning cards to members:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the assignment function
if (require.main === module) {
  assignCardsToMembers()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { assignCardsToMembers }; 