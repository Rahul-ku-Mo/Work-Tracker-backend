const { processMentionsWithDiff, updateMentionsWithDiff, getMentionsForContent } = require('../utils/enhancedMentionUtils');
const { prisma } = require('../db');

async function testEnhancedMentions() {
  try {
    console.log('🧪 Testing Enhanced Mention Processing System...\n');

    // Test data
    const testContent = "Hey @johndoe and @janesmith, please review this task. Also @alexchen should help.";
    const updatedContent = "Hey @johndoe and @janesmith, please review this task. Also @alexchen and @davidb should help.";
    const testAuthorId = "test-author-id";
    const testAuthorName = "Test User";
    const testContentTitle = "Test Card";
    const testContentId = 999999; // Use a high number to avoid conflicts

    console.log('1. Testing initial mention processing...');
    const result1 = await processMentionsWithDiff(
      'task',
      testContentId,
      testContent,
      testAuthorId,
      testAuthorName,
      testContentTitle
    );
    console.log('   Result:', result1);

    console.log('\n2. Testing mention update (adding new mentions)...');
    const result2 = await updateMentionsWithDiff(
      'task',
      testContentId,
      updatedContent,
      testAuthorId,
      testAuthorName,
      testContentTitle
    );
    console.log('   Result:', result2);

    console.log('\n3. Testing mention retrieval...');
    const mentions = await getMentionsForContent('task', testContentId);
    console.log('   Mentions found:', mentions.length);
    mentions.forEach(mention => {
      console.log(`   - ${mention.mentionedUser.username} (${mention.mentionedUser.name})`);
    });

    console.log('\n4. Testing mention update (removing mentions)...');
    const result3 = await updateMentionsWithDiff(
      'task',
      testContentId,
      "Hey @johndoe, please review this task.",
      testAuthorId,
      testAuthorName,
      testContentTitle
    );
    console.log('   Result:', result3);

    console.log('\n5. Final mention state...');
    const finalMentions = await getMentionsForContent('task', testContentId);
    console.log('   Final mentions found:', finalMentions.length);
    finalMentions.forEach(mention => {
      console.log(`   - ${mention.mentionedUser.username} (${mention.mentionedUser.name})`);
    });

    // Cleanup test data
    console.log('\n6. Cleaning up test data...');
    await prisma.mention.deleteMany({
      where: {
        contentId: testContentId.toString()
      }
    });
    await prisma.notification.deleteMany({
      where: {
        contentId: testContentId.toString()
      }
    });

    console.log('\n✅ Enhanced mention processing test completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Initial mentions: ${result1.newNotifications}`);
    console.log(`   - Added mentions: ${result2.newNotifications}`);
    console.log(`   - Removed mentions: ${result3.removedMentions || 0}`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testEnhancedMentions(); 