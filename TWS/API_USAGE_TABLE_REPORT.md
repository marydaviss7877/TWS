# TWS API Report (Table Version)

## Snapshot


| Metric                                                      | Value |
| ----------------------------------------------------------- | ----- |
| Backend route handlers (`router.get/post/put/patch/delete`) | 973   |
| Backend route files (with at least one handler)             | 84    |
| Non-commented mounted API prefixes in `backend/src/app.js`  | 68    |
| Swagger paths (`backend/swagger.json`)                      | 13    |
| Swagger operations (`backend/swagger.json`)                 | 20    |
| Frontend code files scanned (`frontend/src`)                | 420   |
| Frontend files containing `/api/`                           | 118   |
| Frontend files with `fetch(...)` or `axios...`              | 92    |


---

## Backend Method Distribution


| HTTP Method | Count   |
| ----------- | ------- |
| GET         | 488     |
| POST        | 305     |
| PUT         | 57      |
| PATCH       | 48      |
| DELETE      | 75      |
| **Total**   | **973** |


---

## Backend Module Distribution


| Module      | Route Handlers |
| ----------- | -------------- |
| business    | 354            |
| tenant      | 308            |
| admin       | 152            |
| core        | 62             |
| auth        | 49             |
| integration | 36             |
| monitoring  | 12             |
| **Total**   | **973**        |


---

## Top Route Files by Volume


| Route File                                                       | Total | GET | POST | PUT | PATCH | DELETE |
| ---------------------------------------------------------------- | ----- | --- | ---- | --- | ----- | ------ |
| `backend/src/modules/tenant/routes/organization.js`              | 73    | 36  | 23   | 8   | 4     | 2      |
| `backend/src/modules/admin/routes/supraAdmin.js`                 | 56    | 29  | 13   | 6   | 2     | 6      |
| `backend/src/modules/tenant/routes/projects.js`                  | 54    | 17  | 17   | 1   | 9     | 10     |
| `backend/src/modules/business/routes/attendance.js`              | 44    | 25  | 17   | 1   | 1     | 0      |
| `backend/src/modules/business/routes/finance.js`                 | 38    | 27  | 10   | 1   | 0     | 0      |
| `backend/src/modules/tenant/routes/softwareHouse.js`             | 29    | 14  | 10   | 2   | 1     | 2      |
| `backend/src/modules/tenant/routes/documents.js`                 | 27    | 10  | 10   | 0   | 3     | 4      |
| `backend/src/modules/tenant/erp/software-house/softwareHouse.js` | 26    | 14  | 7    | 3   | 1     | 1      |
| `backend/src/modules/auth/routes/sessions.js`                    | 20    | 7   | 9    | 2   | 0     | 2      |
| `backend/src/modules/business/routes/payroll.js`                 | 20    | 13  | 7    | 0   | 0     | 0      |


---

## Frontend API Usage by Area


| Area                 | Files with API usage patterns |
| -------------------- | ----------------------------- |
| `features/tenant`    | 49                            |
| `features/admin`     | 23                            |
| `features/employees` | 20                            |
| `shared`             | 17                            |
| `features/projects`  | 10                            |
| `app`                | 3                             |
| `features/auth`      | 2                             |
| `features/dashboard` | 2                             |


---

## Mounted Backend API Prefixes (App Bootstrapping)

These are non-commented API prefixes mounted in `backend/src/app.js`:


| Prefix                                      |
| ------------------------------------------- |
| `/api/`                                     |
| `/api/admin`                                |
| `/api/admin/attendance-panel`               |
| `/api/admin/moderation`                     |
| `/api/attendance`                           |
| `/api/attendance-integration`               |
| `/api/auth`                                 |
| `/api/billing`                              |
| `/api/boards`                               |
| `/api/cards`                                |
| `/api/client-portal`                        |
| `/api/clients`                              |
| `/api/compliance`                           |
| `/api/default-contacts`                     |
| `/api/development-metrics`                  |
| `/api/email`                                |
| `/api/employees`                            |
| `/api/erp-management`                       |
| `/api/erp-templates`                        |
| `/api/files`                                |
| `/api/finance`                              |
| `/api/form-management`                      |
| `/api/health`                               |
| `/api/integrations`                         |
| `/api/lists`                                |
| `/api/logs`                                 |
| `/api/master-erp`                           |
| `/api/metrics`                              |
| `/api/notifications`                        |
| `/api/nucleus-analytics`                    |
| `/api/nucleus-batch`                        |
| `/api/nucleus-pm`                           |
| `/api/nucleus-templates`                    |
| `/api/partners`                             |
| `/api/payroll`                              |
| `/api/project-access`                       |
| `/api/projects`                             |
| `/api/resources`                            |
| `/api/sales`                                |
| `/api/security`                             |
| `/api/sessions`                             |
| `/api/signup`                               |
| `/api/software-house-roles`                 |
| `/api/sprints`                              |
| `/api/standalone-monitoring`                |
| `/api/supra-admin`                          |
| `/api/supra-admin/sessions`                 |
| `/api/supra-admin/tenant-erp`               |
| `/api/system-monitoring`                    |
| `/api/tasks`                                |
| `/api/teams`                                |
| `/api/templates`                            |
| `/api/tenant-auth`                          |
| `/api/tenant/:tenantSlug/audit`             |
| `/api/tenant/:tenantSlug/dashboard`         |
| `/api/tenant/:tenantSlug/department-access` |
| `/api/tenant/:tenantSlug/departments`       |
| `/api/tenant/:tenantSlug/organization`      |
| `/api/tenant/:tenantSlug/permissions`       |
| `/api/tenant/:tenantSlug/roles`             |
| `/api/tenant/:tenantSlug/software-house`    |
| `/api/tenant/management`                    |
| `/api/tenant/switching`                     |
| `/api/time-tracking`                        |
| `/api/timezone`                             |
| `/api/users`                                |
| `/api/webhooks`                             |
| `/api/workspaces`                           |


---

## External API / Provider Integrations


| Integration Area | Providers / Targets                         | Location                                                                 |
| ---------------- | ------------------------------------------- | ------------------------------------------------------------------------ |
| Time tracking    | Harvest, Clockify, Toggl, Jira Tempo, Asana | `backend/src/services/integrations/time-tracking-integration.service.js` |
| Email validation | AbstractAPI, EmailListVerify                | `backend/src/services/integrations/email-validation.service.js`          |
| Email transport  | SMTP (default Gmail SMTP if configured)     | `backend/src/services/integrations/email.service.js`                     |
