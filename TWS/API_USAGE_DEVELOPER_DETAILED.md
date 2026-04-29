# TWS API Usage (Developer Detailed)

## Scope

This is a developer-facing inventory of implemented APIs and where they are used.

- Backend scan scope: `backend/src/modules/**/*.js`
- Frontend scan scope: `frontend/src/**/*.{js,jsx,ts,tsx}`
- Handler definition counted: `router.get/post/put/patch/delete`

---

## High-Level Totals

- Backend route handlers: **973**
- Backend route files with handlers: **84**
- API mount prefixes in `backend/src/app.js` (non-commented): **68**
- Swagger inventory (`backend/swagger.json`): **13 paths / 20 operations**
- Frontend files with `/api/`: **118**
- Frontend files with `fetch(...)` or `axios...`: **92**

---

## Frontend API Usage Map

### Core API layers

- `frontend/src/app/config/api.js` (central endpoint config + request helper)
- `frontend/src/shared/utils/axiosInstance.js`
- `frontend/src/shared/utils/auth.js`
- `frontend/src/shared/services/tenant/tenant-api.service.js`

### Usage concentration by area

- `features/tenant`: 49 files
- `features/admin`: 23 files
- `features/employees`: 20 files
- `shared`: 17 files
- `features/projects`: 10 files
- `app`: 3 files
- `features/auth`: 2 files
- `features/dashboard`: 2 files

---

## Backend Route File Inventory

Format:  
`<path> -> total=<n> (GET=<n>, POST=<n>, PUT=<n>, PATCH=<n>, DELETE=<n>)`

### Tenant Module

- `backend/src/modules/tenant/routes/organization.js` -> total=73 (GET=36, POST=23, PUT=8, PATCH=4, DELETE=2)
- `backend/src/modules/tenant/routes/projects.js` -> total=54 (GET=17, POST=17, PUT=1, PATCH=9, DELETE=10)
- `backend/src/modules/tenant/routes/softwareHouse.js` -> total=29 (GET=14, POST=10, PUT=2, PATCH=1, DELETE=2)
- `backend/src/modules/tenant/routes/documents.js` -> total=27 (GET=10, POST=10, PUT=0, PATCH=3, DELETE=4)
- `backend/src/modules/tenant/erp/software-house/softwareHouse.js` -> total=26 (GET=14, POST=7, PUT=3, PATCH=1, DELETE=1)
- `backend/src/modules/tenant/routes/switching.js` -> total=13 (GET=6, POST=4, PUT=2, PATCH=0, DELETE=1)
- `backend/src/modules/tenant/routes/departments.js` -> total=12 (GET=8, POST=2, PUT=1, PATCH=0, DELETE=1)
- `backend/src/modules/tenant/routes/softwareHouseFinanceReads.js` -> total=11 (GET=11, POST=0, PUT=0, PATCH=0, DELETE=0)
- `backend/src/modules/tenant/routes/deliverables.js` -> total=9 (GET=3, POST=3, PUT=1, PATCH=0, DELETE=2)
- `backend/src/modules/tenant/routes/dashboard.js` -> total=8 (GET=7, POST=1, PUT=0, PATCH=0, DELETE=0)
- `backend/src/modules/tenant/routes/management.js` -> total=8 (GET=4, POST=3, PUT=1, PATCH=0, DELETE=0)
- `backend/src/modules/tenant/routes/changeRequests.js` -> total=7 (GET=3, POST=4, PUT=0, PATCH=0, DELETE=0)
- `backend/src/modules/tenant/routes/departmentAccess.js` -> total=7 (GET=2, POST=4, PUT=1, PATCH=0, DELETE=0)
- `backend/src/modules/tenant/routes/permissions.js` -> total=7 (GET=3, POST=2, PUT=1, PATCH=0, DELETE=1)
- `backend/src/modules/tenant/routes/roles.js` -> total=7 (GET=3, POST=2, PUT=1, PATCH=0, DELETE=1)
- `backend/src/modules/tenant/routes/approvals.js` -> total=5 (GET=2, POST=3, PUT=0, PATCH=0, DELETE=0)
- `backend/src/modules/tenant/routes/audit.js` -> total=1 (GET=1, POST=0, PUT=0, PATCH=0, DELETE=0)

### Business Module

- `backend/src/modules/business/routes/attendance.js` -> total=44 (GET=25, POST=17, PUT=1, PATCH=1, DELETE=0)
- `backend/src/modules/business/routes/finance.js` -> total=38 (GET=27, POST=10, PUT=1, PATCH=0, DELETE=0)
- `backend/src/modules/business/routes/payroll.js` -> total=20 (GET=13, POST=7, PUT=0, PATCH=0, DELETE=0)
- `backend/src/modules/business/routes/employees.js` -> total=19 (GET=6, POST=8, PUT=0, PATCH=4, DELETE=1)
- `backend/src/modules/business/erp/software-house/nucleusPM.js` -> total=16 (GET=5, POST=10, PUT=0, PATCH=1, DELETE=0)
- `backend/src/modules/business/routes/formManagement.js` -> total=13 (GET=6, POST=4, PUT=2, PATCH=0, DELETE=1)
- `backend/src/modules/business/routes/resources.js` -> total=13 (GET=3, POST=3, PUT=0, PATCH=4, DELETE=3)
- `backend/src/modules/business/routes/partners.js` -> total=11 (GET=5, POST=3, PUT=1, PATCH=0, DELETE=2)
- `backend/src/modules/business/routes/projects.js` -> total=11 (GET=7, POST=2, PUT=0, PATCH=1, DELETE=1)
- `backend/src/modules/business/routes/softwareHouseRoles.js` -> total=11 (GET=5, POST=3, PUT=1, PATCH=0, DELETE=2)
- `backend/src/modules/business/routes/projectAccess.js` -> total=10 (GET=5, POST=2, PUT=1, PATCH=1, DELETE=1)
- `backend/src/modules/business/routes/tasks.js` -> total=10 (GET=4, POST=3, PUT=0, PATCH=2, DELETE=1)
- `backend/src/modules/business/routes/erpTemplates.js` -> total=9 (GET=3, POST=4, PUT=1, PATCH=0, DELETE=1)
- `backend/src/modules/business/routes/sprints.js` -> total=9 (GET=3, POST=4, PUT=1, PATCH=0, DELETE=1)
- `backend/src/modules/business/routes/workspaces.js` -> total=9 (GET=3, POST=2, PUT=0, PATCH=2, DELETE=2)
- `backend/src/modules/business/erp/software-house/roles.js` -> total=8 (GET=3, POST=2, PUT=1, PATCH=0, DELETE=2)
- `backend/src/modules/business/routes/developmentMetrics.js` -> total=8 (GET=7, POST=1, PUT=0, PATCH=0, DELETE=0)
- `backend/src/modules/business/routes/nucleusAnalytics.js` -> total=8 (GET=8, POST=0, PUT=0, PATCH=0, DELETE=0)
- `backend/src/modules/business/routes/templates.js` -> total=8 (GET=3, POST=3, PUT=1, PATCH=0, DELETE=1)
- `backend/src/modules/business/erp/software-house/attendance.js` -> total=7 (GET=5, POST=2, PUT=0, PATCH=0, DELETE=0)
- `backend/src/modules/business/routes/attendanceIntegration.js` -> total=7 (GET=3, POST=4, PUT=0, PATCH=0, DELETE=0)
- `backend/src/modules/business/routes/cards.js` -> total=7 (GET=2, POST=2, PUT=0, PATCH=2, DELETE=1)
- `backend/src/modules/business/routes/clientPortal.js` -> total=7 (GET=5, POST=2, PUT=0, PATCH=0, DELETE=0)
- `backend/src/modules/business/routes/softwareHouseAttendance.js` -> total=7 (GET=5, POST=2, PUT=0, PATCH=0, DELETE=0)
- `backend/src/modules/business/routes/timeTracking.js` -> total=7 (GET=3, POST=2, PUT=1, PATCH=0, DELETE=1)
- `backend/src/modules/business/routes/clients.js` -> total=6 (GET=3, POST=1, PUT=0, PATCH=1, DELETE=1)
- `backend/src/modules/business/routes/masterERP.js` -> total=6 (GET=5, POST=1, PUT=0, PATCH=0, DELETE=0)
- `backend/src/modules/business/routes/boards.js` -> total=5 (GET=2, POST=1, PUT=0, PATCH=1, DELETE=1)
- `backend/src/modules/business/routes/nucleusBatch.js` -> total=5 (GET=0, POST=5, PUT=0, PATCH=0, DELETE=0)
- `backend/src/modules/business/routes/nucleusTemplates.js` -> total=5 (GET=3, POST=2, PUT=0, PATCH=0, DELETE=0)
- `backend/src/modules/business/routes/lists.js` -> total=3 (GET=0, POST=1, PUT=0, PATCH=1, DELETE=1)
- `backend/src/modules/business/routes/sales.js` -> total=3 (GET=3, POST=0, PUT=0, PATCH=0, DELETE=0)
- `backend/src/modules/business/routes/erpManagement.js` -> total=2 (GET=2, POST=0, PUT=0, PATCH=0, DELETE=0)
- `backend/src/modules/business/routes/billing.js` -> total=1 (GET=1, POST=0, PUT=0, PATCH=0, DELETE=0)
- `backend/src/modules/business/routes/teams.js` -> total=1 (GET=1, POST=0, PUT=0, PATCH=0, DELETE=0)

### Admin Module

- `backend/src/modules/admin/routes/supraAdmin.js` -> total=56 (GET=29, POST=13, PUT=6, PATCH=2, DELETE=6)
- `backend/src/modules/admin/routes/supra-admin/system.js` -> total=16 (GET=13, POST=2, PUT=1, PATCH=0, DELETE=0)
- `backend/src/modules/admin/routes/moderation.js` -> total=14 (GET=5, POST=7, PUT=0, PATCH=0, DELETE=2)
- `backend/src/modules/admin/routes/supra-admin/users.js` -> total=10 (GET=4, POST=3, PUT=0, PATCH=2, DELETE=1)
- `backend/src/modules/admin/routes/supraSessions.js` -> total=10 (GET=5, POST=4, PUT=0, PATCH=0, DELETE=1)
- `backend/src/modules/admin/routes/supra-admin/tenants.js` -> total=8 (GET=2, POST=0, PUT=3, PATCH=0, DELETE=3)
- `backend/src/modules/admin/routes/supraReports.js` -> total=8 (GET=5, POST=2, PUT=0, PATCH=0, DELETE=1)
- `backend/src/modules/admin/routes/attendancePanel.js` -> total=7 (GET=4, POST=3, PUT=0, PATCH=0, DELETE=0)
- `backend/src/modules/admin/routes/supra-admin/departments.js` -> total=7 (GET=2, POST=2, PUT=1, PATCH=0, DELETE=2)
- `backend/src/modules/admin/routes/supra-admin/access.js` -> total=6 (GET=2, POST=4, PUT=0, PATCH=0, DELETE=0)
- `backend/src/modules/admin/routes/supra-admin/billing.js` -> total=4 (GET=2, POST=1, PUT=1, PATCH=0, DELETE=0)
- `backend/src/modules/admin/routes/supra-admin/dashboard.js` -> total=3 (GET=3, POST=0, PUT=0, PATCH=0, DELETE=0)
- `backend/src/modules/admin/routes/supra-admin/masterErp.js` -> total=2 (GET=1, POST=1, PUT=0, PATCH=0, DELETE=0)
- `backend/src/modules/admin/routes/admin.js` -> total=1 (GET=1, POST=0, PUT=0, PATCH=0, DELETE=0)

### Auth Module

- `backend/src/modules/auth/routes/sessions.js` -> total=20 (GET=7, POST=9, PUT=2, PATCH=0, DELETE=2)
- `backend/src/modules/auth/routes/authentication.js` -> total=12 (GET=4, POST=8, PUT=0, PATCH=0, DELETE=0)
- `backend/src/modules/auth/routes/users.js` -> total=9 (GET=4, POST=1, PUT=0, PATCH=3, DELETE=1)
- `backend/src/modules/auth/routes/tenantAuth.js` -> total=8 (GET=2, POST=6, PUT=0, PATCH=0, DELETE=0)

### Core Module

- `backend/src/modules/core/routes/security.js` -> total=14 (GET=9, POST=2, PUT=3, PATCH=0, DELETE=0)
- `backend/src/modules/core/routes/compliance.js` -> total=13 (GET=8, POST=4, PUT=1, PATCH=0, DELETE=0)
- `backend/src/modules/core/routes/notifications.js` -> total=10 (GET=3, POST=3, PUT=2, PATCH=0, DELETE=2)
- `backend/src/modules/core/routes/files.js` -> total=9 (GET=5, POST=3, PUT=0, PATCH=0, DELETE=1)
- `backend/src/modules/core/routes/webhooks.js` -> total=8 (GET=3, POST=3, PUT=0, PATCH=1, DELETE=1)
- `backend/src/modules/core/routes/logs.js` -> total=3 (GET=1, POST=2, PUT=0, PATCH=0, DELETE=0)
- `backend/src/modules/core/routes/metrics.js` -> total=3 (GET=3, POST=0, PUT=0, PATCH=0, DELETE=0)
- `backend/src/modules/core/routes/health.js` -> total=2 (GET=2, POST=0, PUT=0, PATCH=0, DELETE=0)

### Integration Module

- `backend/src/modules/integration/routes/timezone.js` -> total=15 (GET=11, POST=4, PUT=0, PATCH=0, DELETE=0)
- `backend/src/modules/integration/routes/integrations.js` -> total=12 (GET=4, POST=5, PUT=2, PATCH=0, DELETE=1)
- `backend/src/modules/integration/routes/defaultContacts.js` -> total=9 (GET=4, POST=2, PUT=1, PATCH=1, DELETE=1)

### Monitoring Module

- `backend/src/modules/monitoring/routes/system.js` -> total=7 (GET=7, POST=0, PUT=0, PATCH=0, DELETE=0)
- `backend/src/modules/monitoring/routes/standalone.js` -> total=5 (GET=5, POST=0, PUT=0, PATCH=0, DELETE=0)

---

## Mounted API Prefixes in Backend Bootstrap

Source: `backend/src/app.js` (non-commented mounts)

- `/api/`
- `/api/admin`
- `/api/admin/attendance-panel`
- `/api/admin/moderation`
- `/api/attendance`
- `/api/attendance-integration`
- `/api/auth`
- `/api/billing`
- `/api/boards`
- `/api/cards`
- `/api/client-portal`
- `/api/clients`
- `/api/compliance`
- `/api/default-contacts`
- `/api/development-metrics`
- `/api/email`
- `/api/employees`
- `/api/erp-management`
- `/api/erp-templates`
- `/api/files`
- `/api/finance`
- `/api/form-management`
- `/api/health`
- `/api/integrations`
- `/api/lists`
- `/api/logs`
- `/api/master-erp`
- `/api/metrics`
- `/api/notifications`
- `/api/nucleus-analytics`
- `/api/nucleus-batch`
- `/api/nucleus-pm`
- `/api/nucleus-templates`
- `/api/partners`
- `/api/payroll`
- `/api/project-access`
- `/api/projects`
- `/api/resources`
- `/api/sales`
- `/api/security`
- `/api/sessions`
- `/api/signup`
- `/api/software-house-roles`
- `/api/sprints`
- `/api/standalone-monitoring`
- `/api/supra-admin`
- `/api/supra-admin/sessions`
- `/api/supra-admin/tenant-erp`
- `/api/system-monitoring`
- `/api/tasks`
- `/api/teams`
- `/api/templates`
- `/api/tenant-auth`
- `/api/tenant/:tenantSlug/audit`
- `/api/tenant/:tenantSlug/dashboard`
- `/api/tenant/:tenantSlug/department-access`
- `/api/tenant/:tenantSlug/departments`
- `/api/tenant/:tenantSlug/organization`
- `/api/tenant/:tenantSlug/permissions`
- `/api/tenant/:tenantSlug/roles`
- `/api/tenant/:tenantSlug/software-house`
- `/api/tenant/management`
- `/api/tenant/switching`
- `/api/time-tracking`
- `/api/timezone`
- `/api/users`
- `/api/webhooks`
- `/api/workspaces`

---

## External Integrations (Non-internal APIs)

### Email Validation APIs

File: `backend/src/services/integrations/email-validation.service.js`

- AbstractAPI (optional, via env key)
- EmailListVerify (optional, via env key)

### SMTP Email Provider

File: `backend/src/services/integrations/email.service.js`

- SMTP via Nodemailer
- Default host if configured: `smtp.gmail.com`

