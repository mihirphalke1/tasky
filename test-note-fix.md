# Quick Note Fix Test Guide

## Issue Fixed

- **Problem**: Quick notes from the Notes page were appearing as task notes instead of general notes
- **Root Cause**: Missing `isGeneral` field in database and incorrect field calculation

## Changes Made

### 1. Database Schema Fix

- Updated `addNote()` function to explicitly set `isGeneral: !taskId`
- Fixed `getNotes()` functions to handle backward compatibility

### 2. Real-time Listener Fix

- Fixed NotesPage listener to calculate `isGeneral` for existing notes

### 3. Enhanced Debugging

- Added console logging to track note creation
- Improved toast messages for clarity

## Test Steps

### From Notes Page:

1. Navigate to `/notes`
2. Click "Quick Note" button (bottom right)
3. Verify dialog shows "General note" with gray dot
4. Write a test note and save
5. Check console logs for proper data structure
6. Verify note appears in "General" tab
7. Verify toast says "General note saved!"

### From Focus Mode:

1. Navigate to `/focus`
2. Start a focus session
3. Press `Cmd/Ctrl + Ctrl + N` for quick note
4. Verify dialog shows task link with blue dot
5. Save note and verify it appears in "Tasks" tab

### Console Output Should Show:

```
Saving note with: {
  userId: "user123",
  content: "Test note",
  currentTaskId: undefined,  // undefined for general notes
  isGeneral: true
}

Creating note with data: {
  userId: "user123",
  content: "Test note",
  taskId: null,
  isGeneral: true,
  createdAt: Timestamp
}
```

## Expected Behavior

- ✅ General notes show gray dot and "General note" text
- ✅ Task notes show blue dot and task name
- ✅ Notes appear in correct tabs
- ✅ Toast messages are accurate
- ✅ No visual glitches or incorrect categorization
