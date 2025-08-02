const axios = require('axios');

// Test configuration
const BASE_URL = process.env.API_URL || 'http://localhost:5000/api/v1';
const TEST_USER_EMAIL = 'john.doe@company.com';
const TEST_USER_PASSWORD = 'password@123';
const MENTIONED_USER_EMAIL = 'jane.smith@company.com';

async function testMentionNotifications() {
  try {
    console.log('🧪 Testing Mention Notifications...\n');

    // Step 1: Login as the user who will create the mention
    console.log('1. Logging in as mention creator...');
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

    const headers = {
      Authorization: `Bearer ${accessToken}`
    };

    // Step 2: Get user's workspaces to find a column
    console.log('\n2. Getting user workspaces...');
    const workspacesResponse = await axios.get(`${BASE_URL}/workspaces`, { headers });
    
    if (workspacesResponse.status !== 200 || !workspacesResponse.data.data.length) {
      console.error('❌ No workspaces found');
      return;
    }

    const workspace = workspacesResponse.data.data[0];
    console.log(`✅ Found workspace: ${workspace.title}`);

    // Step 3: Get columns from the workspace
    console.log('\n3. Getting workspace columns...');
    const columnsResponse = await axios.get(`${BASE_URL}/columns?workspaceId=${workspace.id}`, { headers });
    
    if (columnsResponse.status !== 200 || !columnsResponse.data.data.length) {
      console.error('❌ No columns found');
      return;
    }

    const column = columnsResponse.data.data[0];
    console.log(`✅ Found column: ${column.title}`);

    // Step 4: Create a card with a mention
    console.log('\n4. Creating card with mention...');
    const cardData = {
      title: 'Test Card with Mention',
      description: 'This is a test card that mentions @janesmith in the description',
      labels: ['test'],
      attachments: [],
      dueDate: null,
      priority: 'MEDIUM',
      storyPoints: 3,
      order: 1,
      projectId: null,
      assigneeIds: []
    };

    const createCardResponse = await axios.post(
      `${BASE_URL}/cards?columnId=${column.id}`,
      cardData,
      { headers }
    );

    if (createCardResponse.status !== 201) {
      console.error('❌ Card creation failed:', createCardResponse.data);
      return;
    }

    const card = createCardResponse.data.data;
    console.log(`✅ Card created: ${card.title}`);
    console.log(`   Card ID: ${card.id}`);

    // Step 5: Wait a moment for mention processing
    console.log('\n5. Waiting for mention processing...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 6: Check if notification was created for the mentioned user
    console.log('\n6. Checking for mention notifications...');
    
    // Login as the mentioned user to check their notifications
    const mentionedUserLoginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: MENTIONED_USER_EMAIL,
      password: TEST_USER_PASSWORD
    });

    if (mentionedUserLoginResponse.status !== 200) {
      console.error('❌ Mentioned user login failed');
      return;
    }

    const mentionedUserToken = mentionedUserLoginResponse.data.data.accessToken;
    const mentionedUserId = mentionedUserLoginResponse.data.data.user.id;
    
    const mentionedUserHeaders = {
      Authorization: `Bearer ${mentionedUserToken}`
    };

    const notificationsResponse = await axios.get(`${BASE_URL}/notifications`, mentionedUserHeaders);
    
    if (notificationsResponse.status === 200) {
      const notifications = notificationsResponse.data.data.notifications || [];
      const mentionNotifications = notifications.filter(n => 
        n.message === 'MENTION' && 
        n.contentType === 'task' && 
        n.contentId === card.id.toString()
      );
      
      if (mentionNotifications.length > 0) {
        console.log('✅ Mention notification found!');
        console.log(`   Notification ID: ${mentionNotifications[0].id}`);
        console.log(`   Message: ${mentionNotifications[0].message}`);
        console.log(`   Content Type: ${mentionNotifications[0].contentType}`);
        console.log(`   Content ID: ${mentionNotifications[0].contentId}`);
      } else {
        console.log('❌ No mention notification found');
        console.log('   Available notifications:', notifications.map(n => ({
          id: n.id,
          message: n.message,
          contentType: n.contentType,
          contentId: n.contentId
        })));
      }
    } else {
      console.error('❌ Failed to fetch notifications');
    }

    // Step 7: Test updating the card with a new mention
    console.log('\n7. Testing card update with new mention...');
    const updateData = {
      description: 'Updated description that mentions @alexchen and @davidb'
    };

    const updateCardResponse = await axios.put(
      `${BASE_URL}/cards/${card.id}`,
      updateData,
      { headers }
    );

    if (updateCardResponse.status !== 200) {
      console.error('❌ Card update failed:', updateCardResponse.data);
      return;
    }

    console.log('✅ Card updated successfully');

    // Step 8: Wait and check for new mention notifications
    console.log('\n8. Waiting for updated mention processing...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    const updatedNotificationsResponse = await axios.get(`${BASE_URL}/notifications`, mentionedUserHeaders);
    
    if (updatedNotificationsResponse.status === 200) {
      const updatedNotifications = updatedNotificationsResponse.data.data.notifications || [];
      const updatedMentionNotifications = updatedNotifications.filter(n => 
        n.message === 'MENTION' && 
        n.contentType === 'task' && 
        n.contentId === card.id.toString()
      );
      
      console.log(`✅ Found ${updatedMentionNotifications.length} mention notifications for this card`);
    }

    console.log('\n🎉 Mention notification tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  }
}

// Run the test
testMentionNotifications(); 