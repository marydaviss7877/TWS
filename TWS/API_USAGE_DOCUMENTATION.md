# TWS API Inventory and Usage Documentation

## Purpose

This document explains:

1. How many APIs are present in this project
2. Which APIs exist (grouped clearly)
3. Where these APIs are used in the codebase

---

## Executive Summary

- Total backend route handlers (`router.get/post/put/patch/delete`): **973**
- Total backend route files with handlers: **84**
- Top-level API mount points in backend bootstrapping (`/api/...` prefixes in `backend/src/app.js`): **73**
- Swagger-documented APIs in `backend/swagger.json`: **13 paths / 20 operations**  
(documentation is smaller than actual implemented surface)
- Frontend files that include `/api/` path usage: **118**
- Frontend files that call `fetch(...)` or `axios...`: **92**

---

## Counting Method (What was measured)

### Backend API count

- Counted only Express route handler declarations:
  - `router.get(...)`
  - `router.post(...)`
  - `router.put(...)`
  - `router.patch(...)`
  - `router.delete(...)`
- Scan scope: `backend/src/modules/**/*.js`
- Result: **973 handlers**

### Backend mount points

- Counted route prefixes mounted in `backend/src/app.js` using:
  - `app.use('/api/...', ...)`
  - `safeUse('/api/...', ...)`
  - `safeBizUse('/api/...', ...)`
- Result: **73 mounted API prefixes**

### Frontend API usage

- Scanned `frontend/src/**/*.{js,jsx,ts,tsx}`
- Checked for:
  - `'/api/'` literal usage
  - `fetch(...)`
  - `axios...`

---

## Backend API Inventory

## 1) By HTTP Method

- `GET`: **488**
- `POST`: **305**
- `PUT`: **57**
- `PATCH`: **48**
- `DELETE`: **75**

## 2) By Module

- `business`: **354**
- `tenant`: **308**
- `admin`: **152**
- `core`: **62**
- `auth`: **49**
- `integration`: **36**
- `monitoring`: **12**

## 3) Major API Prefixes Mounted in App

These are the main mounted prefixes from `backend/src/app.js`.

- Auth and user:
  - `/api/auth`
  - `/api/users`
  - `/api/signup`
  - `/api/email`
  - `/api/sessions`
  - `/api/tenant-auth`
- Admin:
  - `/api/admin`
  - `/api/supra-admin`
  - `/api/admin/moderation`
  - `/api/admin/attendance-panel`
  - `/api/supra-admin/sessions`
  - `/api/supra-admin/tenant-erp`
- Tenant:
  - `/api/tenant/management`
  - `/api/tenant/:tenantSlug/dashboard`
  - `/api/tenant/switching`
  - `/api/tenant/:tenantSlug/organization`
  - `/api/tenant/:tenantSlug/software-house`
  - `/api/tenant/:tenantSlug/permissions`
  - `/api/tenant/:tenantSlug/roles`
  - `/api/tenant/:tenantSlug/departments`
  - `/api/tenant/:tenantSlug/department-access`
  - `/api/tenant/:tenantSlug/audit`
  - plus single route: `/api/tenant/:tenantSlug/info`
- Core:
  - `/api/health`
  - `/api/metrics`
  - `/api/logs`
  - `/api/security`
  - `/api/compliance`
  - `/api/files`
  - `/api/notifications`
  - `/api/webhooks`
- Business:
  - `/api/employees`
  - `/api/attendance`
  - `/api/attendance-integration`
  - `/api/payroll`
  - `/api/finance`
  - `/api/billing`
  - `/api/projects`
  - `/api/project-access`
  - `/api/tasks`
  - `/api/teams`
  - `/api/time-tracking`
  - `/api/sprints`
  - `/api/development-metrics`
  - `/api/clients`
  - `/api/client-portal`
  - `/api/nucleus-templates`
  - `/api/nucleus-pm`
  - `/api/nucleus-analytics`
  - `/api/nucleus-batch`
  - `/api/boards`
  - `/api/cards`
  - `/api/lists`
  - `/api/workspaces`
  - `/api/templates`
  - `/api/erp-management`
  - `/api/erp-templates`
  - `/api/master-erp`
  - `/api/form-management`
  - `/api/resources`
  - `/api/sales`
  - `/api/partners`
  - `/api/software-house-roles`
- Monitoring and integration:
  - `/api/system-monitoring`
  - `/api/standalone-monitoring`
  - `/api/integrations`
  - `/api/timezone`
  - `/api/default-contacts`

## 4) Highest-volume Route Files (Most handlers)

- `backend/src/modules/tenant/routes/organization.js`: **73**
- `backend/src/modules/admin/routes/supraAdmin.js`: **56**
- `backend/src/modules/tenant/routes/projects.js`: **54**
- `backend/src/modules/business/routes/attendance.js`: **44**
- `backend/src/modules/business/routes/finance.js`: **38**
- `backend/src/modules/tenant/routes/softwareHouse.js`: **29**
- `backend/src/modules/tenant/routes/documents.js`: **27**
- `backend/src/modules/tenant/erp/software-house/softwareHouse.js`: **26**
- `backend/src/modules/auth/routes/sessions.js`: **20**
- `backend/src/modules/business/routes/payroll.js`: **20**

---

## Where APIs Are Used (Frontend and App Layer)

## 1) Frontend distribution (files containing API usage patterns)

- `features/tenant`: **49 files**
- `features/admin`: **23 files**
- `features/employees`: **20 files**
- `shared`: **17 files**
- `features/projects`: **10 files**
- `app`: **3 files**
- `features/auth`: **2 files**
- `features/dashboard`: **2 files**

## 2) Core frontend API configuration and request layers

- Central endpoint config:
  - `frontend/src/app/config/api.js`
- Axios instance / auth helpers:
  - `frontend/src/shared/utils/axiosInstance.js`
  - `frontend/src/shared/utils/auth.js`
- Service-layer examples:
  - `frontend/src/shared/services/tenant/tenant-api.service.js`
  - `frontend/src/features/tenant/pages/tenant/org/projects/services/tenantProjectApiService.js`
  - `frontend/src/features/tenant/components/ClientPortal/clientPortalApi.js`
  - `frontend/src/features/projects/services/listApiService.js`

## 3) Direct page/component usage examples

- Tenant pages:
  - `frontend/src/features/tenant/pages/tenant/org/users/UserProfile.js`
  - `frontend/src/features/tenant/pages/tenant/org/settings/OrgProfile.js`
  - `frontend/src/features/tenant/pages/tenant/org/departments/DepartmentsList.js`
- Employee pages/components:
  - `frontend/src/features/employees/pages/Employees.js`
  - `frontend/src/features/employees/components/Attendance/AttendanceDashboard.js`
- Admin pages:
  - `frontend/src/features/admin/pages/SupraAdmin/tenants/TenantManagement.js`
  - `frontend/src/features/admin/pages/SupraAdmin/dashboard/SupraAdminDashboard.js`

---

## External / Third-party API Integrations

## 1) Email validation external APIs

File: `backend/src/services/integrations/email-validation.service.js`

- AbstractAPI (optional via `ABSTRACT_API_KEY`)
- EmailListVerify (optional via `EMAILLISTVERIFY_API_KEY`)

## 2) SMTP / email provider integration

File: `backend/src/services/integrations/email.service.js`

- Uses SMTP transport via Nodemailer
- Defaults to Gmail SMTP (`smtp.gmail.com`) unless overridden by environment config

---

## Swagger vs Real Implementation

- Swagger in `backend/swagger.json` currently lists:
  - **13 paths**
  - **20 operations**
- Actual implementation under route modules contains:
  - **973 route handlers**

### Recommendation

Update Swagger generation or documentation process so OpenAPI reflects module routes.  
Current Swagger is useful as a sample/reference, but not a complete inventory of live APIs.

---

## Quick Answer (for stakeholders)

If someone asks, "How many APIs are in this project?"

- Implemented backend API handlers: **973**
- Documented in Swagger: **20 operations**
- Frontend files using APIs: **118** (path references), **92** (actual fetch/axios calls)

