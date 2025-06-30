const { PrismaClient } = require('@prisma/client');
const paddleService = require('../services/paddleService');

const prisma = new PrismaClient();

async function testPaddleCustomerCreation() {
  try {
    console.log('🧪 Testing Paddle Customer Creation...\n');

    // Test data
    const testUser = {
      email: 'test-paddle-customer@example.com',
      name: 'Test Paddle Customer',
      userId: 'test-user-id-' + Date.now()
    };

    console.log('📝 Test user data:', testUser);

    // Test creating a customer
    console.log('\n🔄 Creating Paddle customer...');
    const customerId = await paddleService.createCustomer(testUser);
    
    console.log('✅ Paddle customer created successfully!');
    console.log('📋 Customer ID:', customerId);

    // Test creating the same customer again (should handle duplicates gracefully)
    console.log('\n🔄 Testing duplicate customer creation...');
    try {
      const duplicateCustomerId = await paddleService.createCustomer(testUser);
      console.log('✅ Duplicate customer handled gracefully');
      console.log('📋 Duplicate Customer ID:', duplicateCustomerId);
    } catch (error) {
      console.log('⚠️  Expected error for duplicate customer:', error.message);
    }

    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testPaddleCustomerCreation(); 