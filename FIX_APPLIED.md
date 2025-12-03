# ✅ FIX APPLIED: MCP API Key Disappearing Issue

## What Was Fixed

**File**: `web/src/pages/MCPSettingsPage.tsx`

**Change**: Removed the `setTimeout(() => loadApiKeys(), 500)` call that was causing keys to disappear.

**Before**:
```typescript
setApiKeys(prev => [newKeyEntry, ...prev])

// Reload from backend after a short delay to get the backend's view
// This ensures we have the key_suffix field from backend
setTimeout(() => {
  loadApiKeys()
}, 500)
```

**After**:
```typescript
setApiKeys(prev => [newKeyEntry, ...prev])

// Don't reload from backend - the key is already in state with full value
// Reloading causes the key to be replaced with masked version from backend
console.log(`✅ Added new key "${response.name}" to state with full key`)
```

## Next Steps

### 1. Rebuild Frontend
```bash
cd web
npm run build
```

### 2. Deploy Frontend
Deploy the `web/dist/` directory to your hosting platform.

### 3. Test the Fix

#### Test 1: Create Key
1. Login to the frontend
2. Go to MCP Settings → API Keys tab
3. Enter a key name (e.g., "Test Key")
4. Click "Generate API Key"
5. ✅ **Expected**: Full key appears in green alert
6. ✅ **Expected**: Key appears in "Your API Keys" list below
7. ⏱️ **Wait 10 seconds**
8. ✅ **Expected**: Key is STILL in the list (not disappeared!)

#### Test 2: Persistence
1. Copy the full key from the green alert
2. Reload the page (F5)
3. Go back to MCP Settings → API Keys
4. ✅ **Expected**: Key is still in the list
5. ✅ **Expected**: May show as masked (`thanos_mcp_***abc123`) or full key

#### Test 3: Config Generation
1. Click the "Config" button next to the key
2. ✅ **Expected**: Config copied to clipboard
3. Paste into a text editor
4. ✅ **Expected**: Contains full API key (not "YOUR_API_KEY_HERE")

#### Test 4: Browser Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. Create a new API key
4. ✅ **Expected**: See log: "✅ Added new key "Your Key Name" to state with full key"
5. ✅ **Expected**: See log: "✅ Stored API key: ..." with details

#### Test 5: localStorage
1. Open browser DevTools (F12)
2. Go to Application → Local Storage
3. Find key: `thanos_mcp_api_keys`
4. ✅ **Expected**: JSON object with key suffixes as keys
5. ✅ **Expected**: Full keys as values
6. Example:
   ```json
   {
     "abc12345": "thanos_mcp_full_key_here...",
     "def67890": "thanos_mcp_another_key..."
   }
   ```

## What This Fixes

### Before (Broken)
```
1. User creates key
2. Key added to state with full value ✅
3. After 500ms, loadApiKeys() called
4. Backend returns masked key (***abc123)
5. Backend doesn't return key_suffix field
6. Frontend can't match with localStorage
7. Key disappears or becomes masked ❌
```

### After (Fixed)
```
1. User creates key
2. Key added to state with full value ✅
3. Key stored in localStorage ✅
4. No reload - key stays in state ✅
5. On page reload, loadApiKeys() restores from localStorage ✅
```

## Additional Improvements (Optional)

After verifying the fix works, you can deploy the complete solution:

### Deploy Backend Changes
```bash
# Package Lambda functions
make package

# Deploy infrastructure
cd infra
terraform apply

# Get MCP server URL
terraform output mcp_server_url
```

**Backend improvement**: Returns `api_key_full` and `key_suffix` fields for better key management.

### Deploy Frontend Improvements
```bash
# Use the improved version
mv web/src/pages/MCPSettingsPage_fixed.tsx web/src/pages/MCPSettingsPage.tsx

# Rebuild
cd web
npm run build

# Deploy
```

**Frontend improvements**:
- Simplified localStorage logic
- Better error handling
- Clear warnings when full key unavailable
- Consistent suffix extraction

## Verification Checklist

- [ ] Frontend rebuilt (`npm run build`)
- [ ] Frontend deployed
- [ ] Can create API key
- [ ] Key appears in list
- [ ] Key stays in list after 10 seconds ✅
- [ ] Key persists after page reload
- [ ] Config generation works
- [ ] localStorage contains keys
- [ ] Browser console shows success logs

## Troubleshooting

### Key Still Disappears
**Check**:
1. Did you rebuild the frontend? (`npm run build`)
2. Did you deploy the new build?
3. Clear browser cache and try again
4. Check browser console for errors

### Key Shows as Masked After Reload
**This is expected** if backend hasn't been updated yet.
- The key is still stored in localStorage
- Config generation will still work
- Deploy backend changes to fix this

### Config Shows "YOUR_API_KEY_HERE"
**Cause**: Full key not in localStorage
**Solution**: 
1. Create a new key
2. Copy it immediately from the green alert
3. Don't reload the page before copying

## Success Criteria

✅ You'll know it's working when:
1. Keys don't disappear after creation
2. Keys persist across page reloads
3. Config generation includes full key
4. Browser console shows success logs
5. localStorage contains full keys

## Support

If you encounter issues:
1. Check browser console for errors
2. Check localStorage for stored keys
3. Verify the fix was applied correctly
4. Review `HOTFIX_MCP_KEY_DISAPPEARING.md` for details

---

**Status**: ✅ FIX APPLIED  
**File Modified**: `web/src/pages/MCPSettingsPage.tsx`  
**Next Step**: Rebuild and deploy frontend  
**Expected Result**: Keys will no longer disappear after 5 seconds
