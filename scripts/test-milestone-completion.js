const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testMilestoneCompletion() {
  try {
    console.log('Testing milestone completion functionality...\n');

    // Create a test project with milestones
    const testProject = await prisma.project.create({
      data: {
        title: 'Test Milestone Project',
        slug: 'test-milestone-project-' + Date.now(),
        teamId: 'test-team-id', // You'll need to replace with actual team ID
        creatorId: 'test-user-id', // You'll need to replace with actual user ID
        milestones: [
          {
            id: 'milestone-1',
            milestoneValue: 'Setup development environment',
            isCompletedMilestone: false
          },
          {
            id: 'milestone-2',
            milestoneValue: 'Implement core features',
            isCompletedMilestone: false
          },
          {
            id: 'milestone-3',
            milestoneValue: 'Testing and deployment',
            isCompletedMilestone: false
          }
        ]
      }
    });

    console.log('✅ Created test project with milestones:');
    console.log('Project:', testProject.title);
    console.log('Milestones:', testProject.milestones);
    console.log('');

    // Test updating milestone completion
    const updatedMilestones = testProject.milestones.map(milestone => {
      if (milestone.id === 'milestone-1') {
        return {
          ...milestone,
          isCompletedMilestone: true
        };
      }
      return milestone;
    });

    const updatedProject = await prisma.project.update({
      where: { id: testProject.id },
      data: { milestones: updatedMilestones }
    });

    console.log('✅ Updated first milestone to completed:');
    console.log('Updated milestones:', updatedProject.milestones);
    console.log('');

    // Clean up
    await prisma.project.delete({
      where: { id: testProject.id }
    });

    console.log('✅ Test completed successfully and cleaned up!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  testMilestoneCompletion();
}

module.exports = { testMilestoneCompletion }; 