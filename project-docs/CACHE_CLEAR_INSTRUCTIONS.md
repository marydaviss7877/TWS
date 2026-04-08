# Cache Clear Instructions - ProjectClientPortalSettings Error

## Issue
ESLint is reporting an error about `ProjectClientPortalSettings` on line 337, but the file has been cleaned and no longer contains this reference. This is likely a **stale cache issue**.

## Solution

### Option 1: Clear Webpack/ESLint Cache (Recommended)

```bash
cd TWS/frontend

# Stop the dev server (Ctrl+C if running)

# Clear cache directories
Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .eslintcache -ErrorAction SilentlyContinue

# Restart dev server
npm start
```

### Option 2: Full Clean Install

```bash
cd TWS/frontend

# Stop the dev server (Ctrl+C if running)

# Remove node_modules and cache
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .eslintcache -ErrorAction SilentlyContinue

# Reinstall dependencies
npm install

# Restart dev server
npm start
```

### Option 3: Hard Refresh Browser

If the error persists after clearing cache:
1. Open browser DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

## Verification

After clearing cache, verify the file is clean:

```bash
# Check for any references to ProjectClientPortalSettings
Select-String -Path "src\features\tenant\pages\tenant\org\projects\ProjectDashboard.js" -Pattern "ProjectClientPortalSettings"
```

Should return: **No matches found**

## File Status

✅ **File is clean** - No references to `ProjectClientPortalSettings` exist in the codebase
✅ **Linter shows no errors** - Current file state is correct
⚠️ **Cache needs clearing** - Webpack/ESLint cache is stale

---

**The error should disappear after clearing the cache and restarting the dev server.**
