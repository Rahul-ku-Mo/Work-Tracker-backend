const { PrismaClient } = require('@prisma/client');
const { generateUniqueSlug } = require('./utils/slugUtils');

const prisma = new PrismaClient();

async function testProjectSlug() {
  try {
    console.log('Testing project slug functionality...');
    
    // Check if there are any existing projects
    const existingProjects = await prisma.project.findMany({
      take: 5,
      select: {
        id: true,
        title: true,
        slug: true,
        teamId: true
      }
    });
    
    console.log('Existing projects:', existingProjects);
    
    // Test creating a new project with slug
    const testTitle = 'Test Project for Slug Routing';
    const slug = await generateUniqueSlug(testTitle, async (slug) => {
      const existing = await prisma.project.findFirst({
        where: { slug }
      });
      return !!existing;
    });
    
    console.log('Generated slug:', slug);
    
    // Test finding project by slug
    if (existingProjects.length > 0) {
      const firstProject = existingProjects[0];
      const foundBySlug = await prisma.project.findUnique({
        where: { slug: firstProject.slug }
      });
      
      console.log('Found project by slug:', foundBySlug ? 'SUCCESS' : 'FAILED');
    }
    
    console.log('Slug test completed successfully!');
  } catch (error) {
    console.error('Error testing project slug:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testProjectSlug(); 