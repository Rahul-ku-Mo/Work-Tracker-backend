const axios = require('axios');

// Test configuration
const BASE_URL = process.env.API_URL || 'http://localhost:5000/api/v1';
const TEST_USER_EMAIL = 'john.doe@company.com';
const TEST_USER_PASSWORD = 'password@123';

async function testNotificationAPIs() {
  try {
    console.log('🧪 Testing Notification APIs...\n');

    // Step 1: Login to get access token
    console.log('1. Logging in to get access token...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD
    });

    if (loginResponse.status !== 200) {
      console.error('❌ Login failed');
      return;
    }

    const accessToken = loginResponse.data.data.accessToken;
    const userId = loginResponse.data.data.user.id;
    console.log('✅ Login successful');
    console.log(`   User ID: ${userId}`);
    console.log(`   Access Token: ${accessToken.substring(0, 20)}...`);

    const headers = {
      Authorization: `Bearer ${accessToken}`
    };

    // Step 2: Test fetching notifications
    console.log('\n2. Testing fetch notifications...');
    try {
      const notificationsResponse = await axios.get(`${BASE_URL}/notifications`, { headers });
      console.log('✅ Fetch notifications successful');
      console.log(`   Notifications count: ${notificationsResponse.data.data.notifications.length}`);
    } catch (error) {
      console.error('❌ Fetch notifications failed:', error.response?.data || error.message);
    }

    // Step 3: Test getting unread count
    console.log('\n3. Testing unread count...');
    try {
      const countResponse = await axios.get(`${BASE_URL}/notifications/${userId}/count`, { headers });
      console.log('✅ Unread count successful');
      console.log(`   Unread count: ${countResponse.data.data.count}`);
    } catch (error) {
      console.error('❌ Unread count failed:', error.response?.data || error.message);
    }

    // Step 4: Test with user ID route
    console.log('\n4. Testing notifications with user ID...');
    try {
      const userNotificationsResponse = await axios.get(`${BASE_URL}/notifications/${userId}`, { headers });
      console.log('✅ User notifications successful');
      console.log(`   Notifications count: ${userNotificationsResponse.data.data.notifications.length}`);
    } catch (error) {
      console.error('❌ User notifications failed:', error.response?.data || error.message);
    }

    // Step 5: Test mark all as read
    console.log('\n5. Testing mark all as read...');
    try {
      const markAllResponse = await axios.put(`${BASE_URL}/notifications/${userId}/read-all`, {}, { headers });
      console.log('✅ Mark all as read successful');
      console.log(`   Response: ${markAllResponse.data.message}`);
    } catch (error) {
      console.error('❌ Mark all as read failed:', error.response?.data || error.message);
    }

    console.log('\n🎉 Notification API tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  }
}

// Run the test
testNotificationAPIs(); 