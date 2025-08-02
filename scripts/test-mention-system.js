const { PrismaClient } = require('@prisma/client');
const { processMentions, getMentionsForContent, getMentionsForUser } = require('../utils/mentionUtils');

const prisma = new PrismaClient();

async function testMentionSystem() {
  try {
    console.log('🧪 Testing Mention System...\n');

    // 1. Create a test user
    const testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        username: 'testuser',
        name: 'Test User',
        password: 'hashedpassword'
      }
    });

    console.log('✅ Created test user:', testUser.username);

    // 2. Create another user to mention
    const mentionedUser = await prisma.user.create({
      data: {
        email: 'mentioned@example.com',
        username: 'john_doe',
        name: 'John Doe',
        password: 'hashedpassword'
      }
    });

    console.log('✅ Created mentioned user:', mentionedUser.username);

    // 3. Create a test card with mentions
    const testCard = await prisma.card.create({
      data: {
        title: 'Test Card with @john_doe mention',
        description: 'This is a test card that mentions @john_doe in the description. Please review this @john_doe.',
        order: 1,
        columnId: 1, // Make sure this column exists
        creatorId: testUser.id
      }
    });

    console.log('✅ Created test card:', testCard.title);

    // 4. Process mentions in the card
    const contentToCheck = `${testCard.title} ${testCard.description}`;
    const mentionResult = await processMentions('task', testCard.id, contentToCheck, testUser.id);
    
    console.log('✅ Processed mentions:', mentionResult);

    // 5. Get mentions for the card
    const cardMentions = await getMentionsForContent('task', testCard.id);
    console.log('✅ Mentions for card:', cardMentions.length, 'mentions found');

    // 6. Get mentions for the user
    const userMentions = await getMentionsForUser(mentionedUser.id);
    console.log('✅ Mentions for user:', userMentions.length, 'mentions found');

    // 7. Check notifications
    const notifications = await prisma.notification.findMany({
      where: {
        receiverId: mentionedUser.id,
        type: 'mention'
      },
      include: {
        sender: {
          select: { username: true, name: true }
        }
      }
    });

    console.log('✅ Notifications created:', notifications.length);
    notifications.forEach(notification => {
      console.log(`   - ${notification.sender.name} mentioned you in a task`);
    });

    // 8. Test updating mentions
    console.log('\n🔄 Testing mention updates...');
    
    const updatedContent = 'Updated card content with @john_doe and @newuser mentions';
    const updateResult = await processMentions('task', testCard.id, updatedContent, testUser.id);
    console.log('✅ Updated mentions result:', updateResult);

    // 9. Clean up
    console.log('\n🧹 Cleaning up test data...');
    
    await prisma.notification.deleteMany({
      where: {
        receiverId: mentionedUser.id
      }
    });

    await prisma.mention.deleteMany({
      where: {
        contentId: testCard.id.toString()
      }
    });

    await prisma.card.delete({
      where: { id: testCard.id }
    });

    await prisma.user.delete({
      where: { id: mentionedUser.id }
    });

    await prisma.user.delete({
      where: { id: testUser.id }
    });

    console.log('✅ Test data cleaned up');

    console.log('\n🎉 Mention system test completed successfully!');

  } catch (error) {
    console.error('❌ Error testing mention system:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testMentionSystem(); 