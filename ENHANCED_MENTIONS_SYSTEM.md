# Enhanced Mention Processing System

## Overview

The Enhanced Mention Processing System implements a diff-based approach to mention detection with real-time Pusher notifications. This system ensures that users are only notified when they are newly mentioned, avoiding duplicate notifications.

## Key Features

### 🔍 **Diff-Based Detection**
- Compares new mentions with existing mentions
- Only notifies newly mentioned users
- Removes mentions that are no longer in content
- Prevents duplicate notifications

### ⚡ **Real-Time Notifications**
- Uses Pusher for instant notifications
- Sends notifications to user-specific channels
- Includes rich context (author name, content title)
- Supports multiple content types (tasks, projects, notes)

### 🗄️ **Database Integration**
- Stores mention records for tracking
- Maintains notification history
- Supports content type categorization
- Handles user relationships

## Architecture

### Core Components

1. **Enhanced Mention Utils** (`utils/enhancedMentionUtils.js`)
   - Main processing logic
   - Diff calculation
   - Pusher notification sending
   - Database operations

2. **Card Controller Integration** (`controllers/card.controller.js`)
   - Calls mention processing on card creation/update
   - Provides author and content context
   - Handles error gracefully

3. **Pusher Integration** (`services/pusherServer.js`)
   - Real-time notification delivery
   - User-specific channels
   - Authentication handling

### Database Models

#### Mention Model
```prisma
model Mention {
  id           String   @id @default(cuid())
  mentionedId  String   // User being mentioned
  contentType  String   // "task", "project", "note"
  contentId    String   // ID of task or project (as string)
  createdAt    DateTime @default(now())
  mentionedUser User @relation(fields: [mentionedId], references: [id], onDelete: Cascade)
  
  @@unique([mentionedId, contentType, contentId])
  @@index([contentType, contentId])
  @@index([contentId])
}
```

#### Notification Model
```prisma
model Notification {
  id           Int      @id @default(autoincrement())
  senderId     String
  receiverId   String
  message      Message
  metadata     String?
  isRead       Boolean  @default(false)
  readAt       DateTime?
  type         String?  // 'mention', 'card_assigned', etc.
  title        String?
  contentType  String?  // 'task', 'project', 'note'
  contentId    String?  // ID of the content being referenced
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  receiver     User     @relation("receiver", fields: [receiverId], references: [id])
  sender       User     @relation("sender", fields: [senderId], references: [id])
}
```

## Processing Flow

### 1. Content Creation/Update
```
User creates/updates content with @mentions
    ↓
Card controller calls mention processing
    ↓
Extract mentions from content
    ↓
Query existing mentions from database
    ↓
Calculate diff (new mentions - existing mentions)
    ↓
Create notifications for new mentions only
    ↓
Send Pusher notifications
    ↓
Store mention records
```

### 2. Diff Calculation
```javascript
// Step 1: Parse new content → extract new_mentions[]
const newMentions = extractMentionsFromContent(newContent);

// Step 2: Query DB → get old_mentions[] for this content
const existingMentions = await getExistingMentions(contentType, contentId);
const existingUsernames = existingMentions.map(m => m.mentionedUser.username);

// Step 3: Calculate diff → notify_users = new_mentions - old_mentions
const newlyMentioned = newMentions.filter(username => 
  !existingUsernames.includes(username)
);

// Step 4: Remove mentions no longer in content
const removedMentions = existingUsernames.filter(username => 
  !newMentions.includes(username)
);
```

## API Functions

### `processMentionsWithDiff(contentType, contentId, newContent, authorId, authorName, contentTitle)`
- **Purpose**: Process mentions for new content
- **Parameters**:
  - `contentType`: Type of content ("task", "project", "note")
  - `contentId`: ID of the content
  - `newContent`: Content text to parse
  - `authorId`: ID of the author
  - `authorName`: Name of the author
  - `contentTitle`: Title of the content
- **Returns**: Object with success status and notification count

### `updateMentionsWithDiff(contentType, contentId, newContent, authorId, authorName, contentTitle)`
- **Purpose**: Update mentions when content is modified
- **Parameters**: Same as processMentionsWithDiff
- **Returns**: Object with success status, new notifications, and removed mentions

### `getMentionsForContent(contentType, contentId)`
- **Purpose**: Get all mentions for specific content
- **Returns**: Array of mention records with user details

### `getMentionsForUser(userId)`
- **Purpose**: Get all content where a user is mentioned
- **Returns**: Array of mention records

## Pusher Integration

### Channel Structure
- **User-specific channels**: `user-{userId}`
- **Event type**: `notification`
- **Data structure**:
```javascript
{
  type: 'mention',
  title: 'You were mentioned',
  message: 'John Doe mentioned you in Task Title',
  notificationId: 123,
  contentType: 'task',
  contentId: '456',
  authorName: 'John Doe',
  contentTitle: 'Task Title',
  timestamp: '2024-01-01T12:00:00.000Z'
}
```

### Authentication
- Uses existing Pusher authentication middleware
- Route: `/api/v1/pusher/auth`
- Middleware: `middleware/pusherAuth.js`

## Error Handling

### Graceful Degradation
- Mention processing errors don't fail card operations
- Logs errors for debugging
- Continues with card creation/update
- Returns error information for monitoring

### Error Types
1. **Database errors**: Connection issues, constraint violations
2. **Pusher errors**: Network issues, authentication failures
3. **User lookup errors**: Invalid usernames, missing users
4. **Content parsing errors**: Malformed content

## Testing

### Test Script
Run the test script to verify the system:
```bash
node scripts/test-enhanced-mentions.js
```

### Test Scenarios
1. **Initial mention processing**: New content with mentions
2. **Adding mentions**: Update content with new mentions
3. **Removing mentions**: Update content removing mentions
4. **No mentions**: Content without mentions
5. **Duplicate mentions**: Same mentions in updated content

## Performance Considerations

### Database Optimization
- Indexes on `contentType`, `contentId`, `mentionedId`
- Unique constraints prevent duplicate mentions
- Efficient queries with proper joins

### Pusher Optimization
- User-specific channels reduce unnecessary traffic
- Batch processing for multiple notifications
- Error handling prevents notification spam

### Memory Management
- Efficient regex parsing
- Set operations for diff calculation
- Proper cleanup of test data

## Security

### Input Validation
- Sanitize usernames before lookup
- Validate content type values
- Check user permissions for content access

### Authentication
- Verify author permissions
- Validate user existence
- Check content ownership

## Monitoring

### Logging
- Detailed console logs for debugging
- Error tracking for failed operations
- Performance metrics for processing time

### Metrics
- Number of mentions processed
- Notification delivery success rate
- Processing time per operation
- Error rates by operation type

## Future Enhancements

### Planned Features
1. **Mention suggestions**: Auto-complete for usernames
2. **Mention analytics**: Track mention patterns
3. **Bulk operations**: Process multiple content items
4. **Advanced filtering**: Filter mentions by content type
5. **Mention history**: Track mention changes over time

### Scalability Improvements
1. **Caching**: Cache user lookups
2. **Queue processing**: Background mention processing
3. **Batch notifications**: Group multiple notifications
4. **Rate limiting**: Prevent notification spam

## Usage Examples

### Card Creation
```javascript
// In card controller
await processMentionsWithDiff(
  'task',
  card.id,
  `${title} ${description}`,
  req.user.userId,
  author.name,
  title
);
```

### Card Update
```javascript
// In card controller
await updateMentionsWithDiff(
  'task',
  cardId,
  `${title} ${description}`,
  userId,
  author.name,
  title
);
```

### Frontend Integration
```javascript
// Subscribe to user notifications
const channel = pusher.subscribe(`user-${userId}`);
channel.bind('notification', (data) => {
  // Handle real-time notification
  showNotification(data);
});
```

## Troubleshooting

### Common Issues
1. **No notifications sent**: Check Pusher configuration
2. **Duplicate notifications**: Verify diff calculation
3. **Missing mentions**: Check regex pattern
4. **Database errors**: Verify schema and constraints

### Debug Steps
1. Check console logs for processing details
2. Verify database records exist
3. Test Pusher connection
4. Validate user permissions
5. Check content parsing

This enhanced mention system provides a robust, scalable solution for real-time mention notifications with efficient diff-based processing and comprehensive error handling. 