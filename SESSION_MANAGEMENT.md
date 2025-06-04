# Session Management in Tasky

## Overview

Tasky now includes robust session management that allows users to stay logged in for up to **7 days** without needing to re-authenticate, even when opening new tabs or browser windows.

## Features

### 🔒 Persistent Authentication

- Users stay logged in for 7 days after their initial sign-in
- Sessions persist across browser tabs, windows, and restarts
- Automatic session restoration when returning to the app

### 🔄 Activity-Based Session Extension

- User activity automatically refreshes session expiration
- Sessions are refreshed every 30 minutes while the app is active
- Activity includes mouse movement, clicks, typing, and scrolling

### ⚠️ Session Expiry Warnings

- Users receive warnings when their session is about to expire (within 24 hours)
- Toast notifications with "Extend Now" action buttons
- Visual indicators in the navigation bar when session is near expiry

### 🛡️ Session Status Display

- Real-time session status in the user dropdown menu
- Days remaining counter with color-coded indicators
- Green: Session active (>1 day remaining)
- Orange: Session expiring soon (≤1 day remaining)

### 🔧 Manual Session Extension

- "Extend Session" button available when session is near expiry
- Resets the 7-day timer when clicked
- Useful for users who want to proactively extend their session

## Technical Implementation

### Session Storage

- Sessions are stored in browser's `localStorage`
- Session data includes user ID, email, display name, and timestamps
- Automatic cleanup of expired sessions

### Session Validation

- Sessions are validated on every app load
- Expired sessions are automatically cleared
- Real-time validation ensures security

### Firebase Integration

- Leverages Firebase Auth's built-in persistence
- Enhanced with custom session tracking
- Seamless integration with existing authentication flow

## User Experience

### First-Time Sign-In

1. User signs in with Google
2. Session is created with 7-day expiration
3. Welcome message confirms 7-day validity

### Returning Users

1. App automatically detects valid session
2. User is signed in without manual intervention
3. Welcome back message shows remaining session time

### Session Near Expiry

1. Warning notifications appear 24 hours before expiry
2. Session status changes to orange in navigation
3. "Extend Session" button becomes available

### Session Expiry

1. Expired sessions are automatically cleared
2. User is redirected to landing page
3. Next sign-in creates a fresh 7-day session

## Configuration

### Session Duration

- Default: 7 days (604,800,000 milliseconds)
- Configurable in `src/lib/sessionService.ts`
- Warning threshold: 1 day before expiry

### Activity Detection

- Events monitored: mouse, keyboard, scroll, touch
- Throttled to refresh every 5 minutes maximum
- Prevents excessive session updates

### Storage Keys

- Main session: `tasky_user_session`
- Automatic cleanup of invalid sessions

## Security Considerations

### Session Security

- Sessions are validated on every use
- Expired sessions are immediately cleared
- No sensitive data stored in session

### Privacy

- Only necessary user data is stored locally
- Sessions respect Firebase Auth security rules
- Automatic cleanup prevents data accumulation

## Benefits

### For Users

- ✅ No repeated sign-ins for 7 days
- ✅ Seamless experience across tabs/windows
- ✅ Clear visibility of session status
- ✅ Control over session extension

### For Developers

- ✅ Reduced authentication friction
- ✅ Better user retention
- ✅ Comprehensive session monitoring
- ✅ Extensible session management system

## Troubleshooting

### Session Not Persisting

- Check if localStorage is enabled
- Verify Firebase Auth configuration
- Clear browser data and re-sign in

### Session Expiring Too Soon

- Ensure user activity is being detected
- Check for JavaScript errors in console
- Verify session service implementation

### Multiple Tab Issues

- Firebase handles multiple tabs gracefully
- Session state is synchronized across tabs
- One tab's activity extends session for all tabs

## Development Notes

### Key Files

- `src/lib/sessionService.ts` - Core session management
- `src/lib/AuthContext.tsx` - Authentication provider with session integration
- `src/lib/firebase.ts` - Firebase configuration with persistence
- `src/components/NavBar.tsx` - Session status UI

### Testing Session Management

1. Sign in and close browser
2. Reopen and verify automatic sign-in
3. Wait for session warning (or modify threshold for testing)
4. Test manual session extension

### Future Enhancements

- [ ] Remember me checkbox for longer sessions
- [ ] Session activity analytics
- [ ] Device management for sessions
- [ ] Concurrent session limits
