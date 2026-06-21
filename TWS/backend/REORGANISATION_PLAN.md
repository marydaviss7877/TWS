# Backend Reorganisation Plan
Analysis date: 2026-04-29

---

## Current State Summary

### What already exists / already done
- `backend/src/config/`   — 19 files ✅ already here
- `backend/src/controllers/` — 2 files ✅ already here
- `backend/src/services/`  — ~100 files ✅ already here
- `backend/src/routes/`   — 17 files (thin wrappers + a few real files)
- `backend/src/modules/`  — module-level routes still live here

### Git status note
Several files from the OLD root locations (`backend/config/`, `backend/controllers/`,
`backend/services/`) show as deleted in git status (some staged `D `, some unstaged ` D`).
The files themselves are gone from disk — the src/ versions are canonical.

---

## BATCH A — Root folders → /src  (STATUS: ALREADY DONE ON DISK)

The three root directories no longer exist on disk:
- `backend/config/`       → already at `backend/src/config/`
- `backend/controllers/`  → already at `backend/src/controllers/`
- `backend/services/`     → already at `backend/src/services/`

### Action needed before closing Batch A
1. Grep for any remaining imports pointing to old root paths:
   - `require('./config/`  or `require('../config/`  (from root-level files)
   - `require('./controllers/`
   - `require('./services/`
2. Run: `node -e "require('./server')"` — must pass with zero errors.
3. Stage the unstaged deletions: `git add -u` (or specific files).

### Known good: server.js
All imports in server.js already use `./src/...` paths. No broken references found
during analysis.

---

## BATCH B — Consolidate module routes into /src/routes/

### Current architecture (thin-wrapper pattern)
```
server.js
  └── src/routes/auth.routes.js          ← just re-exports modules/auth/routes
        └── src/modules/auth/routes/index.js
              ├── authentication.js
              ├── users.js
              ├── sessions.js
              └── tenantAuth.js
```

### Target architecture
```
server.js
  └── src/routes/auth.routes.js          ← imports sub-files directly
        ├── src/routes/auth/authentication.js   (moved)
        ├── src/routes/auth/users.js            (moved)
        ├── src/routes/auth/sessions.js         (moved)
        └── src/routes/auth/tenantAuth.js       (moved)
  (src/modules/auth/routes/ directory DELETED)
```

### Module inventory

#### auth (4 sub-files)
Old: `src/modules/auth/routes/`
Files: authentication.js, users.js, sessions.js, tenantAuth.js
Index exports: { authentication, users, sessions, tenantAuth }
Target wrapper: `src/routes/auth.routes.js`

#### admin (8 sub-files + supra-admin/ sub-dir)
Old: `src/modules/admin/routes/`
Files: admin.js, attendancePanel.js, moderation.js, supraReports.js,
       supraSessions.js, supraTenantERP.js
Sub-dir: supra-admin/ (access.js, billing.js, dashboard.js, departments.js,
         index.js, masterErp.js, shared.js, system.js, tenants.js, users.js)
Index exports: { admin, supraAdmin, moderation, attendancePanel, supraSessions, supraTenantERP }
Target wrapper: `src/routes/admin.routes.js`

#### business (30+ sub-files + erp/ sub-dir)
Old: `src/modules/business/routes/`
Files: attendance.js, attendanceIntegration.js, billing.js, boards.js, cards.js,
       clientPortal.js, clients.js, developmentMetrics.js, employees.js,
       erpManagement.js, erpTemplates.js, finance.js, formManagement.js,
       index.js, lists.js, masterERP.js, nucleusAnalytics.js, nucleusBatch.js,
       nucleusTemplates.js, partners.js, payroll.js, projectAccess.js,
       resources.js, sales.js, softwareHouseAttendance.js, sprints.js,
       tasks.js, teams.js, templates.js, timeTracking.js, workspaces.js
ERP sub-dir: erp/software-house/ (index.js, nucleusPM.js)
NOTE: business/routes/index.js already imports from:
  - ../../../routes/projects.routes      (cross-reference — keep as-is)
  - ../../../routes/softwareHouseRoles.routes (cross-reference — keep as-is)
Target wrapper: `src/routes/business.routes.js`

#### tenant (12 sub-files + erp/ sub-dir)
Old: `src/modules/tenant/routes/`
Files: approvals.js, audit.js, billing.js, changeRequests.js, dashboard.js,
       deliverables.js, departmentAccess.js, departments.js, documents.js,
       labResults.js, management.js, organization.js, permissions.js, roles.js,
       softwareHouse.js, softwareHouseFinanceReads.js, softwareHouseFinanceWrites.js,
       switching.js
ERP sub-dir: erp/software-house/ (index.js, softwareHouse.js)
Index exports: { management, dashboard, switching, organization, softwareHouse,
               permissions, roles, departments, departmentAccess, audit }
Target wrapper: `src/routes/tenant.module.routes.js`

#### core (8 sub-files)
Old: `src/modules/core/routes/`
Files: compliance.js, files.js, health.js, logs.js, metrics.js,
       notifications.js, security.js, webhooks.js
Index exports: { health, metrics, logs, security, compliance, files, notifications, webhooks }
Target wrapper: `src/routes/core.module.routes.js`

#### integration (3 sub-files)
Old: `src/modules/integration/routes/`
Files: defaultContacts.js, integrations.js, timezone.js
Index exports: { integrations, timezone, defaultContacts }
Target wrapper: `src/routes/integration.routes.js`

#### monitoring (2 sub-files)
Old: `src/modules/monitoring/routes/`
Files: standalone.js, system.js
Index exports: { system, standalone }
Target wrapper: `src/routes/monitoring.routes.js`

### Step-by-step execution for each module
1. Create `src/routes/[module]/` directory
2. Copy each sub-file there (update relative imports: depth changes from
   `src/modules/[module]/routes/` to `src/routes/[module]/`)
3. Replace `src/routes/[module].routes.js` thin wrapper with direct require calls
4. Grep entire project for any import of `modules/[module]/routes` → update to `routes/[module]`
5. Delete `src/modules/[module]/routes/` directory
6. Run `node -e "require('./server')"` after each module

### Import depth change (CRITICAL)
Moving a file from `src/modules/auth/routes/authentication.js`
                to `src/routes/auth/authentication.js`

Old depth to reach `src/`: go up 3 levels (`../../..`)
New depth to reach `src/`: go up 2 levels (`../..`)

Every relative import inside the moved files must be audited:
- `../../models/` → `../../models/`  (same — both 2 levels to src/)
  Wait: old = `src/modules/auth/routes/` → up 3 = `src/`
        new = `src/routes/auth/`         → up 2 = `src/`
So ALL `../../` refs in old files become `../../` refs still — NO CHANGE if they were
already going up 3 to reach src-level items.

Double-check:
  old `../../../models/users-auth/User`  (3 ups from modules/auth/routes/)
  new `../../models/users-auth/User`     (2 ups from routes/auth/)
  → YES, one fewer `../` for any import that was going to `src/` root level.

---

## BATCH C — Move tests out of src

### Test files to move

| Source | Destination | Files |
|--------|-------------|-------|
| `src/modules/auth/__tests__/` | `tests/auth/` | 4 files |
| `src/modules/tenant/__tests__/` | `tests/tenant/` | 2 files |
| `src/services/tenant/__tests__/` | `tests/services/tenant/` | 7 files |

Empty __tests__ dirs (can just delete):
- `src/middleware/auth/__tests__/`
- `src/modules/tenant/routes/__tests__/`
- `src/services/documentHub/__tests__/`
- `src/services/hr/__tests__/`
- `src/services/__tests__/`

### Test files (auth — 4)
- critical-workflow-access.integration.test.js
- login.nosql-injection.security.test.js
- role-aware-workflows.integration.test.js
- route-level-critical-workflows.integration.test.js

### Test files (tenant — 2)
- settings-access.middleware.test.js
- settings-general-route-access.integration.test.js

### Test files (services/tenant — 7)
(need to list — search `src/services/tenant/__tests__/`)

### Jest config changes needed (package.json)
Current jest config:
```json
"setupFilesAfterEnv": ["<rootDir>/src/tests/setup.js"],
"globalTeardown": "<rootDir>/src/tests/teardown.js",
"collectCoverageFrom": ["src/**/*.js", "!src/tests/**", "!src/migrations/**"]
```

After Batch C:
- `setupFilesAfterEnv` and `globalTeardown` paths stay the same (setup.js/teardown.js stay in src/tests/)
- `collectCoverageFrom` — add `!tests/**` exclusion if needed
- Test match pattern: Jest default finds `**/__tests__/**/*.js` AND `**/*.test.js`
  — new location `tests/` at backend root will be found automatically

Also check `package.json` scripts:
```
"test:hr": "jest --runTestsByPath src/modules/tenant/routes/__tests__/... src/services/hr/__tests__/..."
```
→ These paths need updating after the move.

---

## BATCH D — Root scripts → backend/scripts/

### Files at backend/ root to move to backend/scripts/
All standalone diagnostic/utility scripts (NOT server.js, package.json, etc.):

- auto-fix-imports.js
- check-admin-credentials.js
- debug-auth-routes.js
- debug-routes.js
- diagnose-server-issue.js        ← currently modified (M in git status)
- find-all-import-errors.js
- fix-all-imports.js
- fix-config-imports.js
- fix-imports-comprehensive.js
- fix-middleware-paths.js
- fix-remaining-middleware.js
- healthcheck.js
- seed.js
- test-all-routes.js
- test-server-startup.js
- test-supraadmin-login.js
- test-tenant-creation.js

### Files to NOT move (keep at backend/ root)
- server.js         (main entry point — package.json "main": "server.js")
- package.json
- .env / .env.template / env.production.template
- .eslintrc.json
- jsconfig.json
- railway.toml
- healthcheck.js    (CHECK: is this referenced by railway.toml healthcheck?)
- swagger.json
- grafana-dashboard.json
- start-*.bat / start-*.sh
- set-redis-disabled.ps1
- route-audit-report.json / simple-route-analysis.json (data files)
- Redis-old.msi

### Verify before moving: check if any script is imported by server or src/
- Run grep for each filename across src/ before moving.
- These are standalone scripts — none should be imported.

---

## POST-ALL-BATCHES CHECKLIST
1. Run full test suite: `npm test`
2. Run: `node -e "require('./server')"`
3. Print `backend/src/` tree
4. Confirm standard layout:
   ```
   backend/src/
   ├── config/
   ├── controllers/
   ├── jobs/
   ├── middleware/
   ├── migrations/
   ├── models/
   ├── routes/          ← replaces modules/*/routes/
   ├── services/
   ├── tests/
   ├── types/
   ├── utils/
   ├── validators/
   └── workers/
   ```
   NOTE: `src/modules/` will still contain non-route files (erp sub-dirs, index.js)
   unless those are also relocated.

---

## Key files to re-read when resuming
- `backend/server.js`                         (entry point — already reviewed)
- `backend/src/routes/index.js`               (centralized route mount — already reviewed)
- `backend/src/modules/business/routes/index.js` (cross-references to src/routes/ — already reviewed)
- `backend/package.json`                      (jest config — already reviewed)
- Each module's `routes/index.js`             (all reviewed above)
