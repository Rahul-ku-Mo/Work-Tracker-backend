require('dotenv').config();
const axios = require('axios');

const API_BASE_URL = process.env.BACKEND_URL || 'http://localhost:3000';

async function testFeedbackSystem() {
  console.log('🧪 Testing Feedback & Support System...\n');

  try {
    // Test 1: Feedback submission with email
    console.log('1. Testing feedback submission (feature request with email)...');
    try {
      const feedbackResponse = await axios.post(`${API_BASE_URL}/feedback`, {
        type: 'feature',
        description: 'Test feature request - Please add dark mode to the analytics dashboard',
        email: 'test@example.com',
        allowContact: true,
        rating: 5
      });
      
      if (feedbackResponse.status === 200) {
        console.log('✅ Feedback submission successful');
        console.log(`   Message: ${feedbackResponse.data.message}`);
        console.log(`   Confirmation sent: ${feedbackResponse.data.data.confirmationSent}`);
      }
    } catch (error) {
      console.log('❌ Feedback submission failed:', error.response?.data?.message || error.message);
    }

    console.log();

    // Test 2: Anonymous feedback submission  
    console.log('2. Testing anonymous feedback submission (bug report)...');
    try {
      const anonymousFeedbackResponse = await axios.post(`${API_BASE_URL}/feedback`, {
        type: 'bug',
        description: 'Test bug report - Cards are not dragging properly in Safari browser',
        email: '',
        allowContact: false
      });
      
      if (anonymousFeedbackResponse.status === 200) {
        console.log('✅ Anonymous feedback submission successful');
        console.log(`   Message: ${anonymousFeedbackResponse.data.message}`);
      }
    } catch (error) {
      console.log('❌ Anonymous feedback submission failed:', error.response?.data?.message || error.message);
    }

    console.log();

    // Test 3: Support request submission
    console.log('3. Testing support request submission...');
    try {
      const supportResponse = await axios.post(`${API_BASE_URL}/support`, {
        name: 'John Doe',
        email: 'john@example.com',
        description: 'Test support request - I need help setting up team permissions for my workspace'
      });
      
      if (supportResponse.status === 200) {
        console.log('✅ Support request submission successful');
        console.log(`   Message: ${supportResponse.data.message}`);
        console.log(`   Reference: ${supportResponse.data.data.reference}`);
      }
    } catch (error) {
      console.log('❌ Support request submission failed:', error.response?.data?.message || error.message);
    }

    console.log();

    // Test 4: Invalid feedback submission (missing fields)
    console.log('4. Testing invalid feedback submission (validation)...');
    try {
      const invalidResponse = await axios.post(`${API_BASE_URL}/feedback`, {
        type: '',
        description: ''
      });
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Validation working correctly');
        console.log(`   Error message: ${error.response.data.message}`);
      } else {
        console.log('❌ Unexpected error:', error.response?.data?.message || error.message);
      }
    }

    console.log();

    // Test 5: Invalid support request (missing email)
    console.log('5. Testing invalid support request (validation)...');
    try {
      const invalidSupportResponse = await axios.post(`${API_BASE_URL}/support`, {
        name: 'John Doe',
        description: 'Test message'
      });
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Support validation working correctly');
        console.log(`   Error message: ${error.response.data.message}`);
      } else {
        console.log('❌ Unexpected error:', error.response?.data?.message || error.message);
      }
    }

    console.log('\n🎉 Feedback & Support System testing completed!');
    console.log('\n📧 Note: Check your email inbox for confirmation messages');
    console.log('💡 Tip: To test with real emails, update the test email addresses in this script');

  } catch (error) {
    console.error('❌ Error during feedback system testing:', error.message);
  }
}

// Check if server is running
async function checkServerHealth() {
  try {
    const response = await axios.get(`${API_BASE_URL}/health`);
    return true;
  } catch (error) {
    console.log('⚠️  Backend server not running. Please start the server first with: npm start');
    console.log(`   Expected server URL: ${API_BASE_URL}`);
    return false;
  }
}

// Run the tests
(async () => {
  console.log(`🔗 Testing against: ${API_BASE_URL}`);
  console.log('📋 Testing Feedback & Support endpoints...\n');
  
  const serverRunning = await checkServerHealth();
  if (serverRunning) {
    await testFeedbackSystem();
  }
})(); 