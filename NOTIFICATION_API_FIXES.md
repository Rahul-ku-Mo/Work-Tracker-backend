# Notification API Fixes

## Problem
The frontend notification APIs were throwing 404 errors because there was a mismatch between the frontend API calls and the backend routes.

## Issues Found

### 1. **Route Mismatch**
- **Frontend was calling:** `/notifications` (without user ID)
- **Backend expected:** `/notifications/:userId` (with user ID)

### 2. **HTTP Method Mismatch**
- **Frontend was using:** `PATCH` for marking notifications as read
- **Backend expected:** `PUT` for marking notifications as read

### 3. **Missing Routes**
- No route for getting current user's notifications without specifying user ID
- Missing proper error handling for user ID extraction

## Solutions Implemented

### 1. **Added New Route for Current User**
```javascript
// New route in notification.routes.js
router.get('/', authenticateToken, NotificationController.getCurrentUserNotifications);
```

### 2. **Added getCurrentUserNotifications Method**
```javascript
// New method in notification.controller.js
static async getCurrentUserNotifications(req, res) {
  const { userId } = req.user; // Gets user ID from auth middleware
  // ... rest of implementation
}
```

### 3. **Fixed markAsRead Method**
```javascript
// Fixed to get userId from req.user instead of req.body
const { userId } = req.user; // From auth middleware
```

### 4. **Updated Frontend APIs**
```typescript
// Updated to use simpler route without user ID
export const fetchNotifications = async (accessToken: string) => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_URL}/notifications`, // No user ID needed
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
};
```

## API Endpoints Now Available

### 1. **Get Current User's Notifications**
```
GET /api/v1/notifications
Authorization: Bearer <token>
```
- No user ID required
- Gets notifications for authenticated user
- Supports pagination and filtering

### 2. **Get User's Notifications (with user ID)**
```
GET /api/v1/notifications/:userId
Authorization: Bearer <token>
```
- Requires user ID in URL
- For admin access to other users' notifications

### 3. **Mark Notification as Read**
```
PUT /api/v1/notifications/:notificationId/read
Authorization: Bearer <token>
```
- Uses PUT method (not PATCH)
- User can only mark their own notifications as read

### 4. **Mark All Notifications as Read**
```
PUT /api/v1/notifications/:userId/read-all
Authorization: Bearer <token>
```
- Requires user ID in URL
- Marks all unread notifications as read

### 5. **Get Unread Count**
```
GET /api/v1/notifications/:userId/count
Authorization: Bearer <token>
```
- Returns count of unread notifications

### 6. **Delete Notification**
```
DELETE /api/v1/notifications/:notificationId
Authorization: Bearer <token>
```
- Deletes a specific notification

## Frontend Changes

### 1. **Updated NotificationApis.ts**
- Removed dependency on localStorage for user ID
- Uses simpler route for fetching notifications
- Better error handling and logging

### 2. **Fixed API Calls**
- `fetchNotifications`: Now uses `/notifications` route
- `markNotificationAsRead`: Uses PUT method
- `markAllNotificationsAsRead`: Still requires user ID for backward compatibility

## Testing

### Test Script Created
```bash
node scripts/test-notification-apis.js
```

This script tests:
1. Login with dummy user
2. Fetch notifications
3. Get unread count
4. Mark all as read
5. Error handling

## Error Handling

### 1. **Authentication Errors**
- Proper 401 responses for invalid tokens
- Clear error messages for missing authentication

### 2. **Authorization Errors**
- Users can only access their own notifications
- Proper 403 responses for unauthorized access

### 3. **Validation Errors**
- Proper 400 responses for invalid parameters
- Clear error messages for missing required fields

## Security Considerations

### 1. **User Isolation**
- Users can only access their own notifications
- Proper authorization checks in all endpoints

### 2. **Input Validation**
- Validates notification IDs
- Validates user IDs
- Prevents unauthorized access

### 3. **Rate Limiting**
- Existing rate limiting applies to notification endpoints
- Prevents abuse of notification APIs

## Migration Notes

### For Existing Code
- No breaking changes for most endpoints
- Frontend automatically uses new routes
- Backward compatibility maintained where possible

### For New Features
- Use the new `/notifications` route for current user
- Use `/notifications/:userId` for admin features
- Always use PUT for marking notifications as read

## Future Improvements

### 1. **Real-time Updates**
- Pusher integration for live notifications
- WebSocket support for instant updates

### 2. **Advanced Filtering**
- Filter by notification type
- Filter by date range
- Search within notifications

### 3. **Bulk Operations**
- Bulk mark as read
- Bulk delete notifications
- Bulk operations for admins

## Troubleshooting

### Common Issues

1. **404 Errors**
   - Check if server is running
   - Verify route paths are correct
   - Check authentication token

2. **403 Errors**
   - Verify user has proper permissions
   - Check if user ID matches authenticated user
   - Verify notification ownership

3. **500 Errors**
   - Check server logs for details
   - Verify database connection
   - Check for missing environment variables

### Debug Steps

1. **Check Server Status**
   ```bash
   curl http://localhost:5000/api/v1/auth/verify
   ```

2. **Test Authentication**
   ```bash
   curl -X POST http://localhost:5000/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password"}'
   ```

3. **Test Notifications**
   ```bash
   curl -X GET http://localhost:5000/api/v1/notifications \
     -H "Authorization: Bearer <token>"
   ```

The notification APIs should now work correctly without 404 errors! 