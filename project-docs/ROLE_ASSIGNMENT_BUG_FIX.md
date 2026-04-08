# Role Assignment Bug Fix

**Date:** January 28, 2026  
**Issue:** Users logged in as `admin@tws.com` cannot assign `platform_billing` role  
**Status:** ✅ **FIXED**

---

## 🐛 Problem

When trying to create a user with `platform_billing` role, users logged in as `admin@tws.com` were getting a 403 Forbidden error:

```
You cannot assign role 'platform_billing'. Only platform_super_admin can assign all roles, and platform_admin can assign roles except platform_super_admin.
```

---

## 🔍 Root Cause

**Two issues were causing this:**

### Issue 1: Role Mapping Mismatch
- Authentication middleware sets TWSAdmin users' role to `'super_admin'` (without `platform_` prefix)
- `canAssignRole()` function only checked for `'platform_super_admin'` and `'platform_admin'`
- When `assignerRole` was `'super_admin'`, it didn't match either check, so it returned `false`

### Issue 2: Using Overridden Role Instead of Database Role
- `req.user.role` was being overridden to `'super_admin'` by auth middleware
- The actual role stored in the database (e.g., `'platform_admin'`) was not being used
- This caused incorrect permission checks

---

## ✅ Solution

### Fix 1: Map `'super_admin'` to `'platform_super_admin'` in `canAssignRole()`

**File:** `backend/src/middleware/auth/platformRBAC.js`

**Before:**
```javascript
static canAssignRole(assignerRole, targetRole) {
  if (assignerRole === 'platform_super_admin') {
    return true;
  }
  if (assignerRole === 'platform_admin') {
    return targetRole !== 'platform_super_admin';
  }
  return false;
}
```

**After:**
```javascript
static canAssignRole(assignerRole, targetRole) {
  // Normalize role: 'super_admin' maps to 'platform_super_admin'
  let effectiveAssignerRole = assignerRole;
  if (assignerRole === 'super_admin') {
    effectiveAssignerRole = 'platform_super_admin';
  }
  
  if (effectiveAssignerRole === 'platform_super_admin') {
    return true;
  }
  if (effectiveAssignerRole === 'platform_admin') {
    return targetRole !== 'platform_super_admin';
  }
  return false;
}
```

### Fix 2: Fetch Actual Role from Database

**File:** `backend/src/modules/admin/routes/supraAdmin.js`

**Before:**
```javascript
const assignerRole = req.user?.role;
```

**After:**
```javascript
// Get actual role from database (not overridden role from auth middleware)
// For TWSAdmin users, fetch the actual role from the database
let assignerRole = req.user?.role;
if (req.authContext?.type === 'tws_admin' && req.user?._id) {
  const actualAdmin = await TWSAdmin.findById(req.user._id).select('role');
  if (actualAdmin) {
    assignerRole = actualAdmin.role; // Use actual database role
  }
}
```

**Applied to:**
- `POST /api/supra-admin/admins` (line ~740)
- `POST /api/supra-admin/users` (line ~1007)
- `PATCH /api/supra-admin/users/:id` (line ~1216)

---

## 🎯 How It Works Now

1. **User logs in** as `admin@tws.com` with role `'platform_admin'` in database
2. **Auth middleware** overrides role to `'super_admin'` for portal access
3. **Route handler** fetches actual role (`'platform_admin'`) from database
4. **`canAssignRole()`** receives `'platform_admin'` and allows assigning `'platform_billing'`
5. **User creation succeeds** ✅

---

## ✅ Testing

After this fix, users with:
- ✅ `platform_super_admin` role → Can assign any role
- ✅ `platform_admin` role → Can assign any role except `platform_super_admin`
- ❌ Other roles → Cannot assign roles

---

## 📝 Files Modified

1. ✅ `backend/src/middleware/auth/platformRBAC.js`
   - Added role normalization in `canAssignRole()`

2. ✅ `backend/src/modules/admin/routes/supraAdmin.js`
   - Updated 3 routes to fetch actual role from database
   - `POST /api/supra-admin/admins`
   - `POST /api/supra-admin/users`
   - `PATCH /api/supra-admin/users/:id`

---

## 🚀 Status

✅ **FIXED** - Users can now assign roles according to their actual database role, not the overridden role from auth middleware.

---

**Fixed By:** Deep Dive Analysis & Bug Fix  
**Date:** January 28, 2026
