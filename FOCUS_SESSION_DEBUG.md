# Focus Session Data Persistence - Debug Guide

## 🚨 Issue: Focus Session Data Lost After Cache Clear

We've implemented comprehensive improvements to ensure focus session data persists to Firebase properly and survives cache clearing.

## ✅ Improvements Made

### 1. **Enhanced Firebase Configuration**

- ✅ Added offline persistence with IndexedDB
- ✅ Better error handling for persistence failures
- ✅ Console logging for persistence status

### 2. **Robust Authentication Handling**

- ✅ Enhanced auth state monitoring
- ✅ Better user ID validation
- ✅ Detailed logging for auth state changes

### 3. **Focus Session Service Improvements**

- ✅ Added data verification after creation
- ✅ Added data verification after ending sessions
- ✅ Enhanced error handling and logging
- ✅ Debug functions to check session data

### 4. **Focus Mode Component Enhancements**

- ✅ Better authentication checks before operations
- ✅ Session verification at start and end
- ✅ Comprehensive error logging with emojis
- ✅ Debug data calls for troubleshooting

### 5. **Task Detail Page Debugging**

- ✅ Added debug button to check focus session data
- ✅ Enhanced error handling for data retrieval
- ✅ Better user feedback for authentication issues

## 🔍 How to Debug Focus Session Issues

### Step 1: Check Browser Console

Look for these log messages:

- 🚀 **Session Start**: "Starting focus session for user: [userID]"
- ✅ **Session Created**: "Focus session created with ID: [sessionID]"
- 🏁 **Session End**: "Ending focus session: [sessionID]"
- ✅ **Session Completed**: "Focus session ended successfully"

### Step 2: Use Debug Button

1. Go to any task detail page
2. Click the "Debug Data" button in the Focus Sessions tab
3. Check the browser console for detailed session information

### Step 3: Check Authentication

Look for these authentication logs:

- 🔐 **Auth State**: "Auth state changed: User authenticated/not authenticated"
- 👤 **User Info**: "User ID: [userID]"

### Step 4: Verify Firebase Persistence

Check console for:

- ✅ **Persistence Enabled**: "Firebase offline persistence enabled"
- ⚠️ **Persistence Warning**: "Firebase persistence failed: Multiple tabs open"

## 🐛 Common Issues and Solutions

### Issue 1: "User not authenticated"

**Solution**: Make sure you're signed in. Clear cookies and sign in again.

### Issue 2: "Focus session not found in Firebase"

**Solution**: Check internet connection. The session might not have been created due to network issues.

### Issue 3: "Multiple tabs open" persistence warning

**Solution**: Close other tabs with the same app open, or ignore (data will still sync).

### Issue 4: Data appears but disappears after cache clear

**Solution**: This indicates the data was stored locally but not synced to Firebase. Check the verification logs.

## 📊 Testing Steps

### Test 1: Basic Session Persistence

1. Start a focus session
2. Complete the session
3. Check the task detail page shows the session
4. Clear browser cache
5. Reload and check if session data still appears

### Test 2: Network Interruption

1. Start a focus session
2. Disconnect internet
3. Try to end the session
4. Reconnect internet
5. Check if data syncs properly

### Test 3: Multiple Devices

1. Start session on Device A
2. Complete session
3. Open app on Device B
4. Check if session appears on Device B

## 🔧 Advanced Debugging

### Firebase Console Check

1. Go to Firebase Console
2. Navigate to Firestore Database
3. Check the `focusSessions` collection
4. Verify your sessions are stored with correct user IDs

### Network Tab Check

1. Open browser DevTools
2. Go to Network tab
3. Start/end a focus session
4. Look for Firebase API calls
5. Check if they return 200 status codes

## 📝 Expected Console Output

When everything works correctly, you should see:

```
🚀 Starting focus session for user: [userID]
🔍 Debugging focus session data for user: [userID]
📊 Total focus sessions found: [number]
🔥 Creating focus session...
✅ Focus session created with ID: [sessionID]
✅ Focus session verified in Firebase: {...}
💾 Task intention saved successfully
🔥 User streak updated: {...}
🏁 Ending focus session: [sessionID] for user: [userID]
⏱️ Session duration: [minutes] minutes
🍅 Completed pomodoros: [number]
✅ Focus session ended successfully. Duration: [minutes] minutes
📊 Total focus sessions found: [number + 1]
```

## 🚀 Next Steps

If focus session data is still being lost after implementing these improvements:

1. **Check the console logs** - they will show exactly where the process is failing
2. **Use the Debug Data button** - it provides immediate insight into stored sessions
3. **Verify Firebase Rules** - ensure your Firestore security rules allow read/write
4. **Check Internet Connection** - intermittent connectivity can cause sync issues

The enhanced error handling and logging will now clearly show where any issues occur in the focus session data flow.
