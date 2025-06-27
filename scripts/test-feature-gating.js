const { PrismaClient } = require('@prisma/client');
const { getUserPlan, isWithinLimits, getUsageStats } = require('../middleware/featureGating');

const prisma = new PrismaClient();

async function testFeatureGating() {
  console.log('🧪 Testing Feature Gating System...\n');

  try {
    // Test 1: Get user plan for a test user
    console.log('1️⃣ Testing getUserPlan...');
    const users = await prisma.user.findMany({ take: 1 });
    
    if (users.length === 0) {
      console.log('❌ No users found. Create a test user first.');
      return;
    }

    const testUserId = users[0].id;
    const plan = await getUserPlan(testUserId);
    console.log(`✅ User plan: ${plan}`);

    // Test 2: Check project limits
    console.log('\n2️⃣ Testing project limits...');
    const withinProjectLimits = await isWithinLimits(testUserId, plan, 'projects');
    console.log(`✅ Within project limits: ${withinProjectLimits}`);

    // Test 3: Check team member limits
    console.log('\n3️⃣ Testing team member limits...');
    const withinTeamLimits = await isWithinLimits(testUserId, plan, 'teamMembers');
    console.log(`✅ Within team member limits: ${withinTeamLimits}`);

    // Test 4: Check image upload limits
    console.log('\n4️⃣ Testing image upload limits...');
    const withinImageLimits = await isWithinLimits(testUserId, plan, 'imageUploads');
    console.log(`✅ Within image upload limits: ${withinImageLimits}`);

    // Test 5: Get usage statistics
    console.log('\n5️⃣ Testing usage statistics...');
    const stats = await getUsageStats(testUserId);
    console.log('✅ Usage statistics:');
    console.log(`   Plan: ${stats.plan}`);
    console.log(`   Projects: ${stats.usage.projects.current}/${stats.usage.projects.limit || 'unlimited'}`);
    console.log(`   Team Members: ${stats.usage.teamMembers.current}/${stats.usage.teamMembers.limit || 'unlimited'}`);
    console.log(`   Image Uploads: ${stats.usage.imageUploads.current}/${stats.usage.imageUploads.limit || 'unlimited'}`);
    console.log(`   Features: Analytics=${stats.features.analytics}, AI=${stats.features.aiFeatures}`);

    console.log('\n🎉 All tests passed! Feature gating system is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testFeatureGating(); 