# HOTFIX: MCP API Key Disappearing After 5 Seconds

## Problem

When creating an MCP API key:
1. Key appears in the list ✅
2. After ~5 seconds, key disappears ❌

## Root Cause

In `web/src/pages/MCPSettingsPage.tsx`, the `createApiKey` function:

1. Creates key and adds to state with **full key** ✅
2. Calls `setTimeout(() => loadApiKeys(), 500)` ❌
3. `loadApiKeys()` fetches from backend
4. Backend returns **masked key** (`***abc123`) without `key_suffix` field
5. Frontend tries to match with localStorage but **fails**
6. Key gets replaced with masked version or removed

## Quick Fix (Current Deployed Code)

### Option 1: Remove the setTimeout (Recommended)

**File**: `web/src/pages/MCPSettingsPage.tsx`

**Find** (around line 220):
```typescript
// Add to state immediately with full key
setApiKeys(prev => [newKeyEntry, ...prev])

// Reload from backend after a short delay to get the backend's view
// This ensures we have the key_suffix field from backend
setTimeout(() => {
  loadApiKeys()
}, 500)
```

**Replace with**:
```typescript
// Add to state immediately with full key
setApiKeys(prev => [newKeyEntry, ...prev])

// Don't reload from backend - the key is already in state with full value
// Reloading causes the key to be replaced with masked version
console.log(`✅ Added new key "${response.name}" to state`)
```

### Option 2: Fix the Matching Logic

If you want to keep the reload, fix the `extractKeySuffix` function to handle the newly created key:

**File**: `web/src/pages/MCPSettingsPage.tsx`

**Find** (around line 60):
```typescript
const extractKeySuffix = (apiKey: string): string => {
  // If it's already masked (***suffix), extract the suffix directly
  if (apiKey.includes('***')) {
    const suffix = apiKey.split('***')[1] || ''
    return suffix
  }
  // ... rest of function
}
```

**Add after the masked check**:
```typescript
const extractKeySuffix = (apiKey: string): string => {
  // If it's already masked (***suffix), extract the suffix directly
  if (apiKey.includes('***')) {
    const suffix = apiKey.split('***')[1] || ''
    return suffix
  }
  
  // If it's a full key (starts with thanos_mcp_), extract suffix
  if (apiKey.startsWith('thanos_mcp_')) {
    const tokenPart = apiKey.split('_').pop() || ''
    return tokenPart.length >= 8 ? tokenPart.slice(-8) : tokenPart
  }
  
  // ... rest of function
}
```

## Proper Fix (Deploy Backend + Frontend)

The proper fix requires deploying both backend and frontend changes:

### Backend Change

**File**: `lambdas/mcp_keys_handler/app.py`

Already fixed in the codebase - returns `api_key_full` and `key_suffix` fields.

### Frontend Change

**File**: `web/src/pages/MCPSettingsPage_fixed.tsx`

Already fixed - doesn't reload from backend after creating key.

## Testing

### Test the Quick Fix

1. Apply Option 1 (remove setTimeout)
2. Rebuild frontend: `cd web && npm run build`
3. Deploy frontend
4. Create a new API key
5. **Verify**: Key stays in the list ✅
6. Reload page
7. **Verify**: Key still in the list ✅

### Test the Proper Fix

1. Deploy backend: `cd infra && terraform apply`
2. Deploy frontend with fixed file
3. Create a new API key
4. **Verify**: Key stays in the list ✅
5. Reload page
6. **Verify**: Key still in the list ✅
7. Check browser console for logs showing `api_key_full` received

## Why This Happens

### Current Flow (Broken)

```
1. User creates key
   ↓
2. Backend returns full key: "thanos_mcp_abc123def456..."
   ↓
3. Frontend adds to state with full key ✅
   ↓
4. Frontend stores in localStorage by suffix "def456..."
   ↓
5. setTimeout triggers after 500ms
   ↓
6. loadApiKeys() fetches from backend
   ↓
7. Backend returns masked key: "***def456..."
   ↓
8. Backend doesn't return key_suffix field ❌
   ↓
9. Frontend tries to extract suffix from "***def456..."
   ↓
10. Extraction might fail or return wrong suffix
   ↓
11. localStorage lookup fails ❌
   ↓
12. Key replaced with masked version or removed
```

### Fixed Flow

```
1. User creates key
   ↓
2. Backend returns full key: "thanos_mcp_abc123def456..."
   ↓
3. Frontend adds to state with full key ✅
   ↓
4. Frontend stores in localStorage by suffix "def456..."
   ↓
5. No reload - key stays in state ✅
   ↓
6. On page reload, loadApiKeys() fetches from backend
   ↓
7. Backend returns api_key_full + key_suffix ✅
   ↓
8. Frontend matches by key_suffix ✅
   ↓
9. Key restored from localStorage or api_key_full ✅
```

## Immediate Action

**Apply Option 1 (Quick Fix) NOW**:

```bash
# Edit the file
code web/src/pages/MCPSettingsPage.tsx

# Find line ~220 and remove the setTimeout block

# Rebuild
cd web
npm run build

# Deploy
# (your deployment method)
```

This will fix the immediate issue. Then deploy the proper fix when ready.

## Verification

After applying the fix:

1. Create a new API key
2. **Check**: Key appears in list
3. **Wait 10 seconds**
4. **Check**: Key still in list ✅
5. **Check browser console**: Should see "✅ Added new key..." log
6. **Check localStorage**: Should contain the key
7. Reload page
8. **Check**: Key still in list (may be masked if backend not updated)

## Summary

- **Problem**: setTimeout reloads keys from backend, replacing full key with masked one
- **Quick Fix**: Remove the setTimeout call
- **Proper Fix**: Deploy backend that returns api_key_full + key_suffix
- **Impact**: High - users can't use MCP without persistent keys
- **Urgency**: Critical - apply quick fix immediately
