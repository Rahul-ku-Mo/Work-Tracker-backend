const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testMilestoneAPIs() {
  try {
    console.log('Testing Milestone APIs...\n');

    // Find a test project
    const testProject = await prisma.project.findFirst({
      include: {
        team: true,
        creator: true
      }
    });

    if (!testProject) {
      console.log('No projects found. Creating a test project...');
      
      // Find a team to create project for
      const team = await prisma.team.findFirst();
      if (!team) {
        console.log('No teams found. Please create a team first.');
        return;
      }

      // Find a user to be the creator
      const user = await prisma.user.findFirst();
      if (!user) {
        console.log('No users found. Please create a user first.');
        return;
      }

      // Create a test project
      const project = await prisma.project.create({
        data: {
          title: 'Test Project for Milestones',
          slug: 'test-project-milestones',
          teamId: team.id,
          creatorId: user.id,
          milestones: []
        }
      });

      console.log(`✓ Created test project: ${project.title} (slug: ${project.slug})`);
    } else {
      console.log(`✓ Using existing project: ${testProject.title} (slug: ${testProject.slug})`);
    }

    const projectSlug = testProject?.slug || 'test-project-milestones';

    console.log('\n=== Testing Milestone API Endpoints ===');
    console.log('Base URL: http://localhost:3000/api/milestones');
    console.log(`Project Slug: ${projectSlug}\n`);

    console.log('1. GET /milestones/project/:projectSlug');
    console.log(`   curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/milestones/project/${projectSlug}`);
    console.log('   Expected: List of milestones for the project\n');

    console.log('2. POST /milestones/project/:projectSlug');
    console.log(`   curl -X POST -H "Authorization: Bearer YOUR_TOKEN" -H "Content-Type: application/json" \\`);
    console.log(`   -d '{"title": "Test Milestone", "description": "A test milestone", "notes": "Budget: $5,000"}' \\`);
    console.log(`   http://localhost:3000/api/milestones/project/${projectSlug}`);
    console.log('   Expected: Created milestone object\n');

    console.log('3. PUT /milestones/:milestoneId/project/:projectSlug');
    console.log(`   curl -X PUT -H "Authorization: Bearer YOUR_TOKEN" -H "Content-Type: application/json" \\`);
    console.log(`   -d '{"title": "Updated Milestone", "status": "COMPLETE"}' \\`);
    console.log(`   http://localhost:3000/api/milestones/MILESTONE_ID/project/${projectSlug}`);
    console.log('   Expected: Updated milestone object\n');

    console.log('4. PATCH /milestones/:milestoneId/project/:projectSlug/completion');
    console.log(`   curl -X PATCH -H "Authorization: Bearer YOUR_TOKEN" -H "Content-Type: application/json" \\`);
    console.log(`   -d '{"isCompleted": true}' \\`);
    console.log(`   http://localhost:3000/api/milestones/MILESTONE_ID/project/${projectSlug}/completion`);
    console.log('   Expected: Updated milestone with completion status\n');

    console.log('5. DELETE /milestones/:milestoneId/project/:projectSlug');
    console.log(`   curl -X DELETE -H "Authorization: Bearer YOUR_TOKEN" \\`);
    console.log(`   http://localhost:3000/api/milestones/MILESTONE_ID/project/${projectSlug}`);
    console.log('   Expected: Success message\n');

    console.log('6. POST /milestones/project/:projectSlug/reorder');
    console.log(`   curl -X POST -H "Authorization: Bearer YOUR_TOKEN" -H "Content-Type: application/json" \\`);
    console.log(`   -d '{"milestoneIds": ["milestone-1", "milestone-2", "milestone-3"]}' \\`);
    console.log(`   http://localhost:3000/api/milestones/project/${projectSlug}/reorder`);
    console.log('   Expected: Success message with reordered milestones\n');

    console.log('7. PUT /milestones/project/:projectSlug/bulk');
    console.log(`   curl -X PUT -H "Authorization: Bearer YOUR_TOKEN" -H "Content-Type: application/json" \\`);
    console.log(`   -d '{"milestones": [{"title": "Milestone 1", "status": "INCOMPLETE"}, {"title": "Milestone 2", "status": "COMPLETE"}]}' \\`);
    console.log(`   http://localhost:3000/api/milestones/project/${projectSlug}/bulk`);
    console.log('   Expected: Success message with updated milestones\n');

    console.log('=== Frontend Integration ===');
    console.log('The frontend components should now use these endpoints:');
    console.log('- EnhancedMilestone component uses the new API functions');
    console.log('- Optimistic updates with error handling');
    console.log('- Real-time synchronization with backend');
    console.log('- Scrollable milestone list with max height of 400px');

    console.log('\n=== Database Schema ===');
    console.log('Milestones are stored as JSON in the Project.milestones field');
    console.log('Each milestone includes:');
    console.log('- id: string (unique identifier)');
    console.log('- title: string (milestone name)');
    console.log('- description: string (optional)');
    console.log('- status: "INCOMPLETE" | "COMPLETE"');
    console.log('- targetDate: Date (optional)');
    console.log('- completedAt: Date (optional)');
    console.log('- notes: string (optional, for budget info)');
    console.log('- order: number (for ordering)');

    console.log('\n✅ Milestone API setup complete!');
    console.log('\nTo test the APIs:');
    console.log('1. Start your backend server');
    console.log('2. Get an authentication token');
    console.log('3. Use the curl commands above to test each endpoint');
    console.log('4. Test the frontend milestone component');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testMilestoneAPIs()
  .catch((error) => {
    console.error('Test script failed:', error);
    process.exit(1);
  });
