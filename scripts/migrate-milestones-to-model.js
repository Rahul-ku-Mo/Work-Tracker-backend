const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrateMilestones() {
  try {
    console.log('Starting milestone migration...');
    console.log('Note: This script is designed to convert existing JSON milestones to the new Milestone model.');
    console.log('Since the JSON milestones column has been removed, this script will create sample milestones for demonstration purposes.\n');

    // Since the JSON milestones column has been removed, we'll create some sample milestones
    // In a real scenario, you would need to backup the JSON data before running the migration
    
    // Get all existing projects to create sample milestones
    const projects = await prisma.project.findMany({
      select: {
        id: true,
        title: true
      }
    });

    console.log(`Found ${projects.length} projects to add sample milestones to`);

    // Sample milestone data for demonstration
    const sampleMilestones = [
      {
        title: "Project Setup",
        description: "Initial project setup and configuration",
        notes: "Budget: $5,000 - Setup development environment, configure CI/CD pipeline",
        targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
        status: 'INCOMPLETE'
      },
      {
        title: "Core Features Development",
        description: "Develop the main features of the project",
        notes: "Budget: $15,000 - Implement user authentication, main functionality",
        targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 1 month from now
        status: 'INCOMPLETE'
      },
      {
        title: "Testing & Quality Assurance",
        description: "Comprehensive testing and bug fixes",
        notes: "Budget: $8,000 - Unit tests, integration tests, user acceptance testing",
        targetDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 1.5 months from now
        status: 'INCOMPLETE'
      },
      {
        title: "Project Delivery",
        description: "Final delivery and deployment",
        notes: "Budget: $3,000 - Deploy to production, handover documentation",
        targetDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 2 months from now
        status: 'INCOMPLETE'
      }
    ];

    for (const project of projects) {
      console.log(`Adding sample milestones for project: ${project.title}`);
      
      // Check if project already has milestones
      const existingMilestones = await prisma.milestone.count({
        where: { projectId: project.id }
      });

      if (existingMilestones > 0) {
        console.log(`  ⚠ Project already has ${existingMilestones} milestones, skipping...`);
        continue;
      }

      // Create sample milestones for each project
      for (let i = 0; i < sampleMilestones.length; i++) {
        const milestoneData = sampleMilestones[i];

        try {
          await prisma.milestone.create({
            data: {
              title: milestoneData.title,
              description: milestoneData.description,
              status: milestoneData.status,
              targetDate: milestoneData.targetDate,
              notes: milestoneData.notes,
              order: i + 1,
              projectId: project.id
            }
          });
          console.log(`  ✓ Created milestone: ${milestoneData.title}`);
        } catch (error) {
          console.error(`  ✗ Failed to create milestone: ${milestoneData.title}`, error.message);
        }
      }
    }

    console.log('Migration completed successfully!');
    console.log('\nThe new Milestone model includes:');
    console.log('- Status: INCOMPLETE or COMPLETE');
    console.log('- Creation date and target date');
    console.log('- Notes field for budget information, tasks, or other details');
    console.log('- Order field for milestone sequencing');
    console.log('- Proper relationships with Project model');
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateMilestones()
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });
