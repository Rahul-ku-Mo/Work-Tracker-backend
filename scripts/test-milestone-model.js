const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testMilestoneModel() {
  try {
    console.log('Testing the new Milestone model...\n');

    // Test 1: Create a test project
    console.log('1. Creating a test project...');
    const testProject = await prisma.project.create({
      data: {
        title: 'Test Project for Milestones',
        slug: 'test-project-milestones',
        summary: 'A test project to verify milestone functionality',
        teamId: 'test-team-id', // You'll need to provide a valid team ID
        creatorId: 'test-creator-id', // You'll need to provide a valid user ID
      }
    });
    console.log(`   ✓ Created project: ${testProject.title} (ID: ${testProject.id})`);

    // Test 2: Create milestones with different statuses
    console.log('\n2. Creating milestones...');
    
    const milestone1 = await prisma.milestone.create({
      data: {
        title: 'Project Planning',
        description: 'Define project requirements and create roadmap',
        status: 'COMPLETE',
        targetDate: new Date('2024-10-01'),
        completedAt: new Date('2024-09-28'),
        notes: 'Budget: $2,000 - Completed planning phase ahead of schedule',
        order: 1,
        projectId: testProject.id
      }
    });
    console.log(`   ✓ Created completed milestone: ${milestone1.title}`);

    const milestone2 = await prisma.milestone.create({
      data: {
        title: 'Development Phase',
        description: 'Implement core functionality',
        status: 'INCOMPLETE',
        targetDate: new Date('2024-11-15'),
        notes: 'Budget: $10,000 - Development team of 3 developers',
        order: 2,
        projectId: testProject.id
      }
    });
    console.log(`   ✓ Created incomplete milestone: ${milestone2.title}`);

    const milestone3 = await prisma.milestone.create({
      data: {
        title: 'Testing & Deployment',
        description: 'Quality assurance and production deployment',
        status: 'INCOMPLETE',
        targetDate: new Date('2024-12-01'),
        notes: 'Budget: $5,000 - Automated testing, manual QA, and deployment',
        order: 3,
        projectId: testProject.id
      }
    });
    console.log(`   ✓ Created incomplete milestone: ${milestone3.title}`);

    // Test 3: Query milestones with project
    console.log('\n3. Querying milestones with project...');
    const projectWithMilestones = await prisma.project.findUnique({
      where: { id: testProject.id },
      include: {
        milestones: {
          orderBy: { order: 'asc' }
        }
      }
    });

    console.log(`   Project: ${projectWithMilestones.title}`);
    console.log(`   Total milestones: ${projectWithMilestones.milestones.length}`);
    projectWithMilestones.milestones.forEach((milestone, index) => {
      console.log(`   ${index + 1}. ${milestone.title} (${milestone.status}) - Target: ${milestone.targetDate?.toDateString() || 'No date'}`);
      if (milestone.notes) {
        console.log(`      Notes: ${milestone.notes}`);
      }
    });

    // Test 4: Update milestone status
    console.log('\n4. Updating milestone status...');
    const updatedMilestone = await prisma.milestone.update({
      where: { id: milestone2.id },
      data: {
        status: 'COMPLETE',
        completedAt: new Date()
      }
    });
    console.log(`   ✓ Updated milestone "${updatedMilestone.title}" to COMPLETE`);

    // Test 5: Query by status
    console.log('\n5. Querying milestones by status...');
    const completedMilestones = await prisma.milestone.findMany({
      where: {
        projectId: testProject.id,
        status: 'COMPLETE'
      }
    });
    console.log(`   Completed milestones: ${completedMilestones.length}`);

    const incompleteMilestones = await prisma.milestone.findMany({
      where: {
        projectId: testProject.id,
        status: 'INCOMPLETE'
      }
    });
    console.log(`   Incomplete milestones: ${incompleteMilestones.length}`);

    // Test 6: Cleanup
    console.log('\n6. Cleaning up test data...');
    await prisma.milestone.deleteMany({
      where: { projectId: testProject.id }
    });
    await prisma.project.delete({
      where: { id: testProject.id }
    });
    console.log('   ✓ Cleaned up test data');

    console.log('\n✅ All tests passed! The Milestone model is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    // Cleanup on error
    try {
      await prisma.milestone.deleteMany({
        where: { 
          project: {
            title: 'Test Project for Milestones'
          }
        }
      });
      await prisma.project.deleteMany({
        where: { title: 'Test Project for Milestones' }
      });
      console.log('   ✓ Cleaned up test data after error');
    } catch (cleanupError) {
      console.error('   ✗ Failed to cleanup test data:', cleanupError.message);
    }
    
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testMilestoneModel()
  .catch((error) => {
    console.error('Test script failed:', error);
    process.exit(1);
  });
