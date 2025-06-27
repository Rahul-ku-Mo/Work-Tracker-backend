const emailService = require('../services/emailService');
const { prisma } = require('../db');

async function testEmailService() {
  console.log('🧪 Testing Email Service...\n');

  try {
    // Test email connection
    console.log('1. Testing email connection...');
    const connectionTest = await emailService.testConnection();
    
    if (!connectionTest) {
      console.log('❌ Email service connection failed');
      console.log('Please check your SMTP configuration in .env file:');
      console.log('- SMTP_HOST');
      console.log('- SMTP_PORT');
      console.log('- SMTP_USER');
      console.log('- SMTP_PASS');
      return;
    }
    
    console.log('✅ Email service connection successful\n');

    // Get a test team for invitation
    console.log('2. Finding test team...');
    const team = await prisma.team.findFirst({
      where: {
        joinCode: {
          not: null
        }
      },
      include: {
        captain: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    if (!team) {
      console.log('❌ No team with join code found');
      return;
    }

    console.log(`✅ Found team: ${team.name} (Code: ${team.joinCode})\n`);

    // Test team invitation email (you can change this email)
    const testEmail = 'test@example.com'; // Change this to your test email
    console.log(`3. Testing team invitation email to ${testEmail}...`);
    
    try {
      await emailService.sendTeamInvitation(
        testEmail,
        team.name,
        team.joinCode,
        team.captain.name || team.captain.email,
        process.env.FRONTEND_URL || 'http://localhost:5173'
      );
      console.log('✅ Team invitation email sent successfully\n');
    } catch (emailError) {
      console.log('❌ Failed to send team invitation email:', emailError.message);
    }

    // Test board invitation email
    console.log(`4. Testing board invitation email to ${testEmail}...`);
    
    try {
      await emailService.sendBoardInvitation(
        testEmail,
        'Test Board',
        team.name,
        'http://localhost:5173/workspace/board/1',
        team.captain.name || team.captain.email,
        process.env.FRONTEND_URL || 'http://localhost:5173'
      );
      console.log('✅ Board invitation email sent successfully\n');
    } catch (emailError) {
      console.log('❌ Failed to send board invitation email:', emailError.message);
    }

    console.log('🎉 Email service testing completed!');
    console.log('\nNote: If you want to test with a real email, update the testEmail variable in this script.');

  } catch (error) {
    console.error('❌ Error during email service testing:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testEmailService(); 