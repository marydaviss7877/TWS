# Profile Editing, Saving & Profile Picture – Diagnostic and Fixes

## Scope

- **Tenant ERP**: User profile and profile picture (organization routes under `/api/tenant/:tenantSlug/organization`).
- **Platform / shared Settings**: Profile and password (AuthContext, `/api/users/profile`, `/api/auth/change-password`).
- **Roles**: Tenant users (admin, employees, managers, etc.) and platform users using the shared Settings page.

---

## Issues Found and Fixes Applied

### 1. Profile editing / saving

| Issue | Root cause | Fix |
|-------|------------|-----|
| **Tenant: context not updated after save** | After PATCH profile, `UserProfile.js` did not call any context updater, so navbar and other consumers still showed old name/photo until refresh. | `TenantAuthContext` now exposes `updateUser()`. `UserProfile.js` calls `updateUser(data.data.user)` after successful profile save and after profile picture upload. |
| **Tenant: duplicate guard in GET profile** | `organization.js` GET `/users/profile` had two identical `if (!user) return 404` checks. | Removed the duplicate check. |
| **Tenant: empty fullName allowed** | PATCH profile could set `fullName` to empty string, risking schema/UX issues. | Backend trims and validates: if `fullName` is provided it must be non-empty after trim; returns 400 otherwise. Other string fields are trimmed. |
| **Platform Settings: no profile API** | Shared `Settings.js` called `axios.patch('/users/profile')` but backend had no `/profile` route (only `/api/users/:id` with permissions). | Added GET and PATCH `/api/users/profile` in `backend/src/modules/auth/routes/users.js` (with `authenticateToken`), before the `/:id` route. |
| **Platform Settings: wrong API base** | Settings used plain `axios` and paths without `/api` prefix. | Switched to `axiosInstance` and `/api/users/profile`, `/api/auth/change-password`, etc. |
| **Platform Settings: profileData not synced from user** | Initial state used `user?.…` while `user` can load later; no `useEffect` to sync. | Added `useEffect` that sets `profileData` from `user` when `user` is available. |
| **Platform Settings: email editable** | Form allowed editing email; backend does not allow email update via profile. | Email field is disabled and helper text states it cannot be changed. PATCH payload only sends `fullName`, `phone`, `department`, `jobTitle`. |

### 2. Profile picture

| Issue | Root cause | Fix |
|-------|------------|-----|
| **Multer errors not returned as JSON** | When `fileFilter` called `cb(new Error('...'))` or file size exceeded limit, Multer passed error to `next(err)`; without handling, client could get non-JSON or generic 500. | Wrapped `profilePicUpload.single('profilePic')` in a middleware that catches errors and responds with `400` and JSON body (`message` for file type/size). |
| **Tenant: context not updated after picture upload** | After POST profile picture, only local `profileData` was updated; context `user` was not, so navbar/avatar could stay stale. | After successful upload, `UserProfile.js` calls `updateUser({ profilePicUrl: newUrl })` and updates local state. |

### 3. State and context

| Issue | Root cause | Fix |
|-------|------------|-----|
| **TenantAuthContext user missing profile fields** | When setting `user` from `mainUser` or `tenantData.owner`, only basic fields were set; `profilePicUrl`, `phone`, `department`, `jobTitle` were omitted. | All `setUser` call sites in `TenantAuthContext.js` now include `profilePicUrl`, `phone`, `department`, `jobTitle` (and `_id` where needed). |
| **TenantAuthContext had no updateUser** | No way for profile page to push updated user into context. | Added `updateUser(userData)` that merges into current `user` and exposed it in the context value. |

---

## Files Changed

- **Backend**
  - `TWS/backend/src/modules/tenant/routes/organization.js`
    - GET `/users/profile`: removed duplicate `if (!user)`.
    - PATCH `/users/profile`: trim and validate `fullName` (reject empty); trim `phone`, `department`, `jobTitle`.
    - POST `/users/profile/picture`: multer wrapped so file/size errors return 400 JSON.
  - `TWS/backend/src/modules/auth/routes/users.js`
    - Added GET `/profile` and PATCH `/profile` (authenticateToken, current user only), placed before `/:id`.
- **Frontend**
  - `TWS/frontend/src/app/providers/TenantAuthContext.js`
    - Added `updateUser`.
    - Extended all `setUser` payloads with `profilePicUrl`, `phone`, `department`, `jobTitle`, `_id` where applicable.
  - `TWS/frontend/src/features/tenant/pages/tenant/org/users/UserProfile.js`
    - Uses `updateUser` from `useTenantAuth()`; calls it after profile save and after picture upload with the returned user / `profilePicUrl`.
  - `TWS/frontend/src/shared/pages/Settings.js`
    - Uses `axiosInstance` and `/api/users/profile`, `/api/auth/change-password`, etc.
    - Syncs `profileData` from `user` in `useEffect`.
    - Profile PATCH sends only `fullName`, `phone`, `department`, `jobTitle`; email field disabled.

---

## Verification Checklist

- **Tenant profile**
  - Edit profile (name, phone, department, job title) → Save → UI and navbar show new data without refresh.
  - Upload profile picture → picture and navbar avatar update without refresh.
  - Invalid image type/size → 400 with clear JSON message.
- **Platform Settings** (when used with AuthContext and `/api/users`)
  - Open Settings → profile form shows current user data after load.
  - Update profile → success and context updated.
  - Change password → POST to `/api/auth/change-password` succeeds.
  - Email is read-only.

---

## Preventive Safeguards

- **Backend**
  - Profile PATCH (tenant and platform) trims strings and rejects empty `fullName`.
  - Profile picture: file type and size errors return 400 JSON with a clear message.
- **Frontend**
  - Settings syncs `profileData` from `user` when `user` is available.
  - Profile and picture updates update both local state and context so all consumers (e.g. navbar) stay in sync.

---

## Regression / Notes

- **Auth users GET/PATCH `/profile`**: Only apply to users in the `User` model. If the logged-in identity is TWSAdmin/SupraAdmin, `User.findById(req.user._id)` can be null and the API returns 404; that is acceptable until profile support for those roles is added.
- **Settings notifications/system**: Endpoints `/api/users/notifications` and `/api/settings/system` are called from Settings; if they do not exist yet, those tabs will still show errors until implemented.
- **EmployeeProfileView** (employee portal) uses `useAuth()` and a different API (`/api/tenant/.../employees`); it was not changed in this pass.
