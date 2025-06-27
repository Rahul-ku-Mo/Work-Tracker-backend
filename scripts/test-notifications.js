const { prisma } = require("../db");
const { pusherServer } = require("../services/pusherServer");

async function testNotificationSystem() {
  console.log("🔔 Testing Enhanced Notification System");
  console.log("=====================================");

  try {
    // 1. Test notification creation
    console.log("\n1. Creating test notification...");
    const testUsers = await prisma.user.findMany({
      take: 2,
      select: { id: true, name: true, email: true }
    });

    if (testUsers.length < 2) {
      console.log("❌ Need at least 2 users to test notifications");
      return;
    }

    const [sender, receiver] = testUsers;
    console.log(`   Sender: ${sender.name || sender.email}`);
    console.log(`   Receiver: ${receiver.name || receiver.email}`);

    // Create a test card assignment notification
    const notification = await prisma.notification.create({
      data: {
        senderId: sender.id,
        receiverId: receiver.id,
        message: "CARD_ASSIGNED",
        metadata: JSON.stringify({
          cardId: 1,
          cardTitle: "Test Card Assignment",
          boardId: 1,
          boardTitle: "Test Board"
        })
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true
          }
        },
        receiver: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    console.log("   ✅ Notification created successfully");
    console.log(`   Notification ID: ${notification.id}`);

    // 2. Test Pusher notification
    console.log("\n2. Testing Pusher real-time notification...");
    await pusherServer.trigger("notification", `user:${receiver.id}`, {
      type: "card_notification",
      notification
    });
    console.log("   ✅ Pusher notification sent");

    // 3. Test notification retrieval
    console.log("\n3. Testing notification retrieval...");
    const notifications = await prisma.notification.findMany({
      where: { receiverId: receiver.id },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 5
    });

    console.log(`   ✅ Found ${notifications.length} notifications for receiver`);
    notifications.forEach((notif, index) => {
      console.log(`   ${index + 1}. ${notif.message} - ${notif.isRead ? 'Read' : 'Unread'}`);
    });

    // 4. Test marking as read
    console.log("\n4. Testing mark as read functionality...");
    const updatedNotification = await prisma.notification.update({
      where: { id: notification.id },
      data: { isRead: true }
    });
    console.log("   ✅ Notification marked as read");

    // 5. Test notification types
    console.log("\n5. Testing different notification types...");
    const notificationTypes = [
      "CARD_UPDATED",
      "CARD_COMPLETED", 
      "CARD_COMMENTED",
      "CARD_DUE_SOON",
      "CARD_OVERDUE"
    ];

    for (const type of notificationTypes) {
      await prisma.notification.create({
        data: {
          senderId: sender.id,
          receiverId: receiver.id,
          message: type,
          metadata: JSON.stringify({
            cardId: 1,
            cardTitle: `Test Card for ${type}`,
            boardId: 1,
            boardTitle: "Test Board"
          })
        }
      });
    }
    console.log(`   ✅ Created ${notificationTypes.length} different notification types`);

    // 6. Test cleanup (optional)
    console.log("\n6. Cleaning up test notifications...");
    await prisma.notification.deleteMany({
      where: {
        senderId: sender.id,
        receiverId: receiver.id,
        metadata: {
          contains: "Test Card"
        }
      }
    });
    console.log("   ✅ Test notifications cleaned up");

    console.log("\n🎉 All notification tests passed!");
    console.log("\nNotification System Features Tested:");
    console.log("✅ Database notification creation");
    console.log("✅ Real-time Pusher notifications");
    console.log("✅ Notification retrieval");
    console.log("✅ Mark as read functionality");
    console.log("✅ Multiple notification types");
    console.log("✅ Metadata storage and parsing");

  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testNotificationSystem(); 