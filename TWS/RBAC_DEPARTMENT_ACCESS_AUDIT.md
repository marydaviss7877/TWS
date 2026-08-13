# RBAC, Roles, Permissions, and Department Access Audit

## Audit conclusion — 2026-08-13

**Live/pre-remediation result: FAIL — the deployed access-control implementation is not safe for production sign-off.**

**Local remediation status: implemented, but not yet deployed or live-retested. Production sign-off remains blocked until the post-deployment matrix passes.**

Authentication and tenant isolation exist, and several negative checks correctly return `401`/`403`. However, the system does not have one consistently enforced RBAC source of truth. The live backend, permission projection, role-management UI, department-access model, and route middleware disagree with each other. This produces both unauthorized visibility and legitimate-access failures.

## Remediation implemented in this codebase — 2026-08-13

| Finding | Local status | Change |
|---|---|---|
| RBAC-001 | Fixed | Department grants now stay in the `department:*` namespace and no longer create Finance/HR/Settings/etc. permissions. |
| RBAC-002 | Fixed | `module:write` no longer satisfies `module:admin`. |
| RBAC-003/011 | Fixed for audited org pages | Users, Roles, Permissions and Department administration pages now have explicit page guards; access-control pills are role-aware. Backend checks remain authoritative. |
| RBAC-004/012 | Fixed | Role/Permission list and detail APIs are admin-only; public `/test` routes were removed. |
| RBAC-005/014 | Fixed | Department list, overview, direct-ID and legacy dashboard reads share HR authorization; non-admin results are intersected with active department membership. |
| RBAC-006 | Partial | Department routes and the reusable resource middleware are fail-closed. Every department-bearing HR/Finance/Project query still needs a model-by-model scope audit. |
| RBAC-007 | Partial | Permission projection now includes `admin`, `read_own`, `write_own`, Employees, Teams and Department, and audited pages have guards. Legacy hard-coded role maps elsewhere remain cleanup work. |
| RBAC-008/009 | Fixed | Only active `TenantUser` membership resolves permissions; same-org fallback authority was removed. Missing or pending membership grants nothing. |
| RBAC-010 | Open product decision | Department Access remains owner/admin-only. If HR or department heads should administer grants, define the exact delegated policy before widening it. |
| RBAC-013 | Fixed | Users (including the legacy dashboard list), Roles, Permissions and both catalogs now require organization administration authority. |
| RBAC-015/022 | Fixed | The mixed Projects/Tasks/Clients router now applies unified module read/write authorization to every route. Record/project membership filtering still needs deeper IDOR coverage. |
| RBAC-016 | Open | Audit resolver/route policy disagreement still needs a product decision and route test. No audit access was widened implicitly. |
| RBAC-017 | Fixed for new users | Selecting a real department during user creation creates active `TenantDepartmentAccess`. Fake hard-coded department choices were removed. Existing label-only users need migration/reassignment. |
| RBAC-018 | Fixed | Login submits the selected Admin/Employee/Client portal and the backend rejects a role/portal mismatch before issuing session cookies. |
| RBAC-019 | Deployment mismatch | The current source contains the expected route and its admin/client integration tests pass. The live `404` indicates the deployed server is behind or mounted differently; verify after deployment. |
| RBAC-020 | Fixed | Users can be assigned an active tenant-owned Core Role. The resolver reads that role dynamically, role edits invalidate affected caches, and assigned roles cannot be deleted. |
| RBAC-021 | Fixed | Per-user allow/deny overrides must exist in the active tenant/global Permission catalog. |
| RBAC-023 | Fixed | Manager is no longer rewritten to Project Manager in ERP middleware. |

Additional fixes:

- Tenant workspace info now imports the real Organization model, fixing the login-page workspace-name `500` in the current source.
- Organization role assignment rejects cross-tenant/inactive roles and prevents non-owners from assigning unrestricted `*:*` roles.
- Department resource middleware now denies non-admin users with zero memberships instead of treating missing membership as unrestricted access.

### Validation after remediation

- Portal-role, resolver, projection, catalog, sync and role-workflow tests: **9 suites, 37 tests passed**.
- Settings authorization integration: **1 suite, 3 tests passed** (client denied, employee denied, admin allowed).
- Frontend production build: **passed**. The repository has numerous pre-existing ESLint warnings; no compilation error was introduced.
- Node syntax checks passed for the changed backend route/resolver files.
- Live verification has **not** been rerun because these local changes are not deployed.

### Required depth before production sign-off

This needs a full authorization regression, not a short smoke test:

1. **Deploy and smoke (mandatory):** verify login portal mismatch, Users/Roles/Permissions denial, Projects denial, Department list/overview/direct-ID scope, Settings route, and custom-role assignment/cache refresh.
2. **Role matrix (mandatory):** execute all primary and HR/Finance sub-roles against read/write/delete/admin actions—approximately 120–180 positive and negative API assertions.
3. **Resource isolation (mandatory):** same-department, other-department, other-project, and other-tenant IDs for every sensitive list/detail/write route. Confirm filtering happens in database queries, not in the UI.
4. **State transitions (mandatory):** role grant/demotion, custom-role edit/removal, department grant/suspend/revoke/expiry, user pending/suspend/offboard, existing session, refresh, and fresh login.
5. **UI parity (mandatory):** for every transition, compare menu, direct page URL, buttons/actions, API result, and `/me/permissions` before and after.
6. **Residual code audit (recommended before sign-off):** remove or reconcile remaining legacy role maps and add department/project ownership filters to every model that carries those scopes.

The minimum acceptable exit condition is zero unauthorized `200` responses, zero cross-tenant/cross-department records, no stale removed access after cache invalidation, and matching UI/API behavior for every tested role.

### What is definitely wrong

1. **Department access is dangerously over-broad in the resolver.** A department-level `read`, `write`, or `admin` grant is converted into the same action for nearly every business module, including Finance, Payroll, HR, Settings, Audit, Sheets, and Portfolio. The department's own module and ID are ignored during this conversion. This is the highest-risk defect.
2. **Write can satisfy an admin permission check.** `hasPermission()` treats `module:write` as sufficient when the requested action is `admin`. The implication is reversed and may elevate writers into administrators wherever `admin` is checked.
3. **Users, Roles, and Permissions metadata leaks to ordinary roles.** Manager, Project Manager, HR Manager, and HR Executive all received `200` from the live Users, Roles, and Permissions list APIs.
4. **Department route protection is bypassable.** Manager and Project Manager received `403` from the department list, but `200` from department overview and a known department ID.
5. **Project permission is not enforced.** HR Manager and HR Executive had `projects.read = false` in `/me/permissions`, but the live Projects API returned `200`. Code confirms permission middleware was intentionally removed from this route.
6. **Created custom roles are not connected to enforcement.** The Roles page creates `Core Role` records, while live authorization resolves primary `TenantUser` roles, per-user overrides, and a different `TenantRole` model. There is no assignment path from the visible custom role to a user, so the role-management module gives a false impression of enforceable RBAC.
7. **Department label and Department Access are separate, unsynchronized systems.** Creating users with a department name did not create department-access membership; all tested non-owner users returned empty `departmentIds`.
8. **The same Manager is evaluated as two roles.** `verifyERPToken` rewrites `manager` to `project_manager` for route checks, while the unified permission resolver retains `manager`. Different middleware can therefore reach different authorization decisions for the same request identity.
9. **Frontend and backend authorization sources disagree.** The frontend contains multiple hard-coded role maps in addition to `/me/permissions`. Direct tenant pages are also mounted without consistent page guards. UI visibility cannot be trusted to reflect backend access.
10. **The Admin/Employee/Client selectors are not security gates.** Supplying the wrong portal still authenticates. The frontend silently changes the selection to match the returned role. This is acceptable only if described as navigation UX; it must not be presented as access isolation.
11. **Audit permission is inconsistent.** HR Manager receives `audit.read = true` from the resolver but `403` from the Audit endpoint, showing that the unified resolver is not actually unified.
12. **Public diagnostic endpoints exist.** Unauthenticated `/permissions/test` and `/roles/test` returned `200` and should not exist in production.
13. **Settings routing is broken.** `/organization/settings/general` returned `404` even for Admin, indicating frontend/backend route drift.
14. **Pending and fallback authorization are fail-open risks.** Pending TenantUser records participate in permission resolution, and active same-organization users without TenantUser records receive fallback base permissions. These paths can bypass tenant-specific metadata and need explicit threat-model validation.

### What worked correctly

- Owner authentication succeeded and owner permissions projected as full access.
- Unauthenticated protected Users/Roles/Permissions/Departments/Department Access list routes returned `401`.
- Admin received the expected broad module access.
- Manager and Project Manager were correctly denied Audit, Department Access administration, Employees, and Payroll.
- HR Executive was correctly denied Payroll; HR Manager was allowed Payroll.
- Non-admin roles were denied Department Access administration.
- Tenant user creation enforced the configured 10-user subscription limit with `403`.
- Login rate limiting constrained repeated account logins, as intended.
- Existing automated permission/catalog tests passed: 8 suites, 20 tests.

### Live coverage completed

- Fully tested: Owner, Admin, Manager, Project Manager, HR Manager, HR Executive.
- Created but not fully route-tested before conclusion: HR Payroll Officer, Finance Manager, Finance Accountant, Finance Analyst.
- Not created because of the 10-user subscription limit: Finance AP Officer, Finance AR Officer, Employee, Contractor, Client.
- The missing roles can be tested later using controlled role transitions; changing billing is not required.

### Subscription conclusion

The backend has no `premium` plan slug. Current seeded plans are Trial/Starter (10 users), Growth (30), Professional (75), and Enterprise (unlimited). Setting the tenant to an invented `premium` value could break feature gates because middleware looks up the exact plan slug. The organization subscription was not changed during this audit.

### Release recommendation

**Do not treat the Roles, Permissions, or Department Access modules as production-ready authorization controls. Do not release additional sensitive module access based on the current implementation.**

Required remediation order:

1. Remove cross-module expansion from department grants and enforce department IDs at every resource query.
2. Correct the write/admin implication and add negative middleware tests.
3. Choose one authoritative role/permission model; connect custom roles to user assignment or remove the misleading UI.
4. Add backend authorization to Users, Roles, Permissions, Department overview/detail, and Projects.
5. Remove the Manager → Project Manager rewrite and use the same role identity everywhere.
6. Make frontend navigation and route guards consume the server permission projection only.
7. Fix cache invalidation, pending/fallback behavior, portal messaging, diagnostic routes, and Settings path drift.
8. Run the complete role-transition, department, IDOR, cross-tenant, expiry, suspension, and revocation matrix before release.

### QA data created

Nine users labeled `RBAC QA` / `[RBAC-AUDIT-2026-08-13]` were created in tenant `fsmkfnlad`. Their passwords are intentionally not stored in this repository or report. These accounts should remain only if the next remediation/retest phase will start soon; otherwise remove them through the normal organization user-management flow.

## Objective

Verify that users in the organization owned/administered by `m.subhan6614@gmail.com` receive exactly the UI, API, route, record, department, and project access intended by their assigned role. This is an audit-first pass: findings are recorded before fixes are made.

## Rules of engagement

- Use dedicated QA identities, one per role/sub-role. Do not reuse the organization owner's account for negative tests.
- Use a non-production test organization or explicitly approved test data in production.
- Never commit passwords, invitation tokens, cookies, JWTs, or reset links. Store the credential ledger outside Git and share it out of band.
- Every authorization test must check both UI visibility and the underlying API/direct URL. A hidden menu is not a security control.
- For every role or department change, capture the state before the change, immediately after it, after refresh, after logout/login, and after cache/JWT expiry where applicable.
- Do not fix an issue during this phase. Record it with evidence, severity, expected behavior, actual behavior, and reproduction steps.

## Scope

### Pages

- `/users`, `/users/create`, `/users/:id`
- `/permissions`, `/permissions/create`
- `/roles`, `/roles/create`
- `/departments`, `/departments/create`
- `/departments/access`
- `/departments/:departmentId/dashboard`
- `/settings/*`, `/audit`, HR, Finance, Projects, Documents, Sheets, Portfolio, Analytics, Clients, Nucleus, Teams

### APIs

- `/api/tenant/:tenantSlug/permissions/*`
- `/api/tenant/:tenantSlug/roles/*`
- `/api/tenant/:tenantSlug/departments/*`
- `/api/tenant/:tenantSlug/department-access/*`
- `/api/tenant/:tenantSlug/organization/me/permissions`
- `/api/tenant/:tenantSlug/organization/permission-catalog`
- `/api/tenant/:tenantSlug/organization/role-catalog`
- All module APIs whose access changes with role/permission/department membership

### Security properties

- Authentication, role enforcement, permission enforcement, tenant isolation, department isolation, project/resource membership, IDOR resistance, stale-session behavior, cache invalidation, revocation, suspension, expiry, UI/API consistency, and audit logging.

## Current role inventory (from code)

### Organization primary roles

| Role | Base permission count | Notes |
|---|---:|---|
| `owner` | 1 | `*:*` wildcard |
| `admin` | 33 | Broad read/write, but not expressed as `*:admin` |
| `manager` | 18 | Includes Finance read and broad work modules |
| `project_manager` | 17 | Project write plus several read/write modules |
| `hr` | 0 | Resolved through HR sub-role; defaults to HR manager if unset |
| `finance` | 0 | Resolved through Finance sub-role; defaults to Finance manager if unset |
| `employee` | 14 | Includes own attendance/employee/payroll access plus Finance read |
| `contractor` | 9 | Includes attendance write and Finance read |
| `client` | 3 | Projects, Nucleus, Documents read |

### HR sub-roles

- `manager` (13 permissions)
- `executive` (8 permissions)
- `payroll_officer` (7 permissions)

### Finance sub-roles

- `manager` (8 permissions)
- `accountant` (5 permissions)
- `analyst` (3 permissions)
- `ap_officer` (3 permissions)
- `ar_officer` (3 permissions)

### Software House project-member roles

- `super_admin`, `project_manager`, `team_lead`, `developer`, `qa_tester`, `client`

These are a separate role system from organization primary roles and must not be treated as interchangeable merely because some names overlap.

## Before/after role and permission changes found in Git history

Baseline compared: introduction of the unified permission/role catalog on 2026-04-13 through the current tree.

### Added

- Primary `finance` role and five Finance sub-roles.
- `sheets` and `portfolio` access for admin, manager, project manager, and employee (client intentionally has no Sheets base access).
- Finance read access for manager, project manager, HR sub-roles, employee, and contractor.
- Finance write and payroll capabilities for Finance sub-roles.
- `employees:read_own` for employee and contractor.
- `attendance:write_own` for employee.
- Per-user deny overrides (`metadata.customFields.permissionOverrides.deny`).
- Legacy fallback that grants base permissions to an active same-organization User when no TenantUser record exists.
- Pending TenantUser rows are now considered by permission resolution.

### Removed

- No primary role was removed from the unified resolver in the inspected history.
- No existing HR sub-role was removed.

### UI behavior that must change with the additions

- Finance navigation and views should appear/disappear with Finance permissions, not only with the literal `finance` role.
- Sheets/Portfolio should appear for the newly entitled roles and remain absent for clients.
- Employee/contractor HR views must be self-only; the full employee roster must never be returned and hidden client-side.
- A deny override must remove the corresponding menu/action and must produce `403` from its API immediately after cache invalidation.
- Role changes must update menu, direct route behavior, API results, and cached permission projection consistently.

## Test identity matrix

Create one QA user per row. Suggested aliases use plus-addressing; confirm the mail provider accepts it before creating invitations.

| ID | Primary role | Sub-role | Department state | Expected high-level access |
|---|---|---|---|---|
| U01 | owner | — | all | Everything in tenant |
| U02 | admin | — | none | Broad admin; role/permission/department administration |
| U03 | manager | — | one department | Manager modules; only allowed department records |
| U04 | project_manager | — | one department/project | Assigned project resources; no tenant administration |
| U05 | hr | manager | HR | Full HR operations in allowed scope |
| U06 | hr | executive | HR | HR read/report subset |
| U07 | hr | payroll_officer | HR | Payroll operations; no unrelated writes |
| U08 | finance | manager | Finance | Finance + payroll management subset |
| U09 | finance | accountant | Finance | Accounting writes; no audit/admin-only access |
| U10 | finance | analyst | Finance | Finance/report/analytics read only |
| U11 | finance | ap_officer | Finance | AP-oriented writes only as enforced by endpoints |
| U12 | finance | ar_officer | Finance | AR-oriented writes only as enforced by endpoints |
| U13 | employee | — | one department | Own HR/payroll/attendance plus allowed work modules |
| U14 | contractor | — | expiring department grant | Limited work; expiry/revocation must close access |
| U15 | client | — | none | Client portal and assigned client resources only |
| U16 | employee | — | no department | Base-role-only control user |
| U17 | employee | — | two departments | Cross-department positive/negative record tests |
| U18 | suspended user | — | previously granted | No authenticated access |
| U19 | pending user | — | pending | Invitation-only behavior; no unintended ERP access |

Credential ledger fields (store outside the repository): test ID, email, user ID, role, sub-role, department IDs, project IDs, password or invite status, created timestamp, cleanup status.

## Core test procedure for every identity

1. Sign in and record returned role, tenant/org IDs, and `/organization/me/permissions` projection.
2. Record visible navigation, app grid, quick-add actions, buttons, row actions, and empty/error states.
3. Open every in-scope page by direct URL, including routes absent from navigation.
4. Replay every page's API as GET/POST/PUT/DELETE with valid IDs, another department's IDs, another tenant's IDs, and random IDs.
5. Verify denied requests return `401` or `403`, never `200` with data and never `404` as the only authorization mechanism.
6. Verify list endpoints filter at query/database level rather than returning excessive data for the UI to hide.
7. Verify create/update/delete operations do not succeed by changing role, org, tenant, user, department, or project identifiers in the request.
8. Check audit logs for grants, changes, revokes, suspensions, sensitive reads, and denied attempts where required.

## Role-change and department-change transition matrix

For each supported transition (`employee → manager`, `employee → hr`, `employee → finance`, `contractor → employee`, `client → employee`, and reverse/demotion cases):

1. Capture pre-change menu, routes, permissions response, and one allowed/denied API per module.
2. Change the role while the target user remains signed in.
3. Retest immediately in the existing session.
4. Refresh and retest.
5. Sign out/in and retest.
6. Confirm removed access is denied immediately, not only after a 15-minute cache/JWT window.
7. Confirm newly granted access appears without stale UI state.
8. Repeat for department grant, edit, suspend, revoke, expiry, and deny override.

## Department isolation tests

- User with Department A can list/read/write only Department A records.
- Replace a Department A resource ID with a valid Department B ID.
- Test users with no department, one department, multiple departments, expired access, suspended access, and revoked access.
- Confirm `read`, `write`, `admin`, and `accessLevel` do not accidentally expand into unrelated modules.
- Verify department membership never grants tenant settings, audit, payroll, Finance, or user-management access unless explicitly intended.
- Verify owner wildcard works, while non-owner department lists never contain `*`.
- Verify cleanup of expired grants invalidates cached permissions and active sessions.

## Initial findings from static inspection

| ID | Severity | Status | Finding |
|---|---|---|---|
| RBAC-001 | Critical | Confirmed in code; runtime reproduction pending | `deptPermsToModuleActions()` converts a department-level `read`, `write`, or `admin` grant into the same action across almost every module (including Finance, Payroll, HR, Settings, Audit, Sheets, Portfolio, Teams). The department ID is ignored. A single department grant can therefore become broad module access. |
| RBAC-002 | High | Confirmed in code; runtime reproduction pending | `hasPermission()` contains a reversed implication: a request for `admin` succeeds when the user has only `module:write`. This can turn write into admin wherever middleware checks the `admin` action. |
| RBAC-003 | High | Confirmed in code; runtime reproduction pending | Tenant UI routes for Users, Permissions, Roles, Departments, Department Access, and department dashboards are mounted without page-level authorization guards. Menu filtering may hide them, but direct URLs still render/fetch. |
| RBAC-004 | High | Confirmed in code; runtime reproduction pending | Roles and Permissions list/detail APIs require authentication but no owner/admin role. Any authenticated tenant user can query the DB-backed role and permission catalog. Their unauthenticated `/test` endpoints are also publicly reachable under the tenant route. |
| RBAC-005 | High | Confirmed in code; runtime reproduction pending | Department `GET /dashboard/overview` and `GET /:id` lack the `hr:read` middleware applied to `GET /`. An authenticated user may bypass the list restriction with overview or a known department ID (subject to the resource helper's tenant check). |
| RBAC-006 | High | Confirmed in code; design intent needs confirmation | Department permissions are stored with a department ID, but most protected APIs invoke `requireErpAccess` without `resourceDepartmentIdParam`; department scope is therefore commonly not enforced at the resource boundary. |
| RBAC-007 | Medium | Confirmed in code | Frontend authorization has multiple competing maps: unified tenant permissions, `AuthContext` hard-coded role permissions, and `useRoleBasedUI` hard-coded roles. They disagree with the backend and can produce stale/wrong UI after role changes. |
| RBAC-008 | High | Confirmed in code; runtime reproduction pending | Permission resolution treats `pending` TenantUser records as eligible. Unless all pending identities are prevented from authenticating elsewhere, an invited-but-unaccepted account can receive role/department permissions. |
| RBAC-009 | High | Confirmed in code; runtime reproduction pending | The legacy same-org fallback grants role base permissions when a TenantUser row is absent. This weakens fail-closed behavior and can bypass tenant-specific status, sub-role, deny override, and department metadata. |
| RBAC-010 | Medium | Confirmed in code | Department Access comments say CEO/HR/Department Head can administer access, but middleware permits only owner/admin/super_admin. Documentation, UX, and enforcement disagree. |
| RBAC-011 | Medium | Confirmed in code | Permission/Role pages expose create/import/delete controls based on route presence, not the current user's authorization. The backend blocks writes, but non-admin users can still see and attempt admin operations. |
| RBAC-012 | Medium | Confirmed in code | Existing automated tests validate resolver helpers and selected workflows, but there is no complete route matrix for roles, permissions, departments, department access, cross-tenant IDs, cache invalidation, and every primary/sub-role. |
| RBAC-013 | High | Confirmed live | Manager, Project Manager, HR Manager, and HR Executive can read `/organization/users`, `/roles`, and `/permissions` (`200`) despite lacking user/role administration permission. This exposes organization identity and access-control metadata. |
| RBAC-014 | High | Confirmed live | Manager and Project Manager receive `403` from `GET /departments` but `200` from `GET /departments/dashboard/overview` and `GET /departments/:knownId`. The list restriction is bypassable through sibling routes. |
| RBAC-015 | High | Confirmed live | HR Manager and HR Executive have `projects.read = false` in `/me/permissions`, but `GET /organization/projects` returns `200`. Route enforcement disagrees with the permission projection. |
| RBAC-016 | Medium | Confirmed live | HR Manager has `audit.read = true` in `/me/permissions`, but `GET /audit` returns `403`. This is under-access/UI inconsistency rather than data leakage, but proves the resolver is not the sole authorization source. |
| RBAC-017 | Medium | Confirmed live | Creating a user with a department name populates the legacy User field but does not create `TenantDepartmentAccess`; all tested non-owner users report empty `departmentIds`. Department labels and enforceable department membership are different systems. |
| RBAC-018 | Medium | Confirmed live | Admin/Employee/Client portal selection is not sent or enforced as an authentication boundary. Even when an explicitly wrong `portal` value is sent, login returns `200` and the user's actual role; the frontend silently realigns the selector. |
| RBAC-019 | Medium | Confirmed live | `/organization/settings/general` returned `404` for every tested role, including Admin, indicating frontend/backend route drift rather than permission denial. |
| RBAC-020 | High | Confirmed in code | The `/roles` module stores `models/core/Role` documents, but unified permission resolution reads primary `TenantUser.roles`, per-user custom permissions, and a separate per-user `TenantRole` model. No assignment path connects a created Core Role to a user. The visible “Create role + select permissions” control is therefore not an enforceable RBAC role. |
| RBAC-021 | Medium | Confirmed in code | User custom permission overrides accept any syntactically valid `resource:action` without verifying that the code exists in the enforced Permission catalog. This allows inert/misspelled permission state and makes UI configuration diverge silently from route behavior. |
| RBAC-022 | High | Confirmed in code/live | Project list enforcement was explicitly removed at the organization router and the project list itself checks only authentication. Consequently HR roles receive project data even when `/me/permissions` reports `projects.read = false`. Product intent and exposed permission UI must be reconciled. |
| RBAC-023 | High | Confirmed in code | `verifyERPToken` rewrites a TenantUser primary role of `manager` to `project_manager` for every ERP request, while permission resolution still uses the original `manager` role. Role-based middleware and permission-based middleware therefore evaluate the same user as two different roles, enabling unexpected route access and misleading audit/UI behavior. |

## Automated test evidence collected

- Current portal-role, resolver, projection, permission/role catalog, catalog sync and role-aware workflow suite: **9 suites passed, 37 tests passed**.
- Current Settings authorization integration: **1 suite passed, 3 tests passed**.
- The frontend production build completed successfully with pre-existing warnings.
- These tests cover important logic and selected middleware chains, but are not a substitute for the post-deployment role/resource matrix above.

## Blockers to live user-generation and browser verification

- No controllable browser is available in the current session; backend/API testing is available.
- The live target is `https://fsmkfnlad.housesbase.com` and tenant slug `fsmkfnlad`.
- Owner authentication was verified for `m.subhan6614@gmail.com` (password/token not stored in this document).
- The organization is subject to a 10-user limit. Owner + 9 QA users consume the current limit.
- Auth login is limited to 5 requests per 15 minutes per IP, so the nine-user login matrix must run in controlled batches.

## Live backend evidence (2026-08-13)

- Owner login: `200`, role `owner`, status `active`.
- Before QA creation: 1 user, 23 stored roles, 75 stored permissions, 13 active departments, 1 department-access record.
- Public tenant info endpoint returned `500`.
- Unauthenticated `/permissions/test` and `/roles/test` returned `200`; protected list endpoints returned `401`.
- All owner reads for Users, Roles, Permissions, catalogs, Departments, Department Access, and `/me/permissions` returned `200`.
- Nine labeled QA users were created: admin, manager, project manager, three HR sub-roles, and three Finance sub-roles.
- AP officer, AR officer, employee, contractor, and client creation returned `403 Usage limit exceeded for users`.
- The login API accepts and ignores an extra `portal` value. Admin/Employee/Client selectors are not backend authentication gates; the frontend automatically aligns the selector to the authenticated role.
- Gmail plus aliases cannot be used for QA users because backend normalization collapses them to the base Gmail address.
- Completed live matrices: Admin, Manager, Project Manager, HR Manager, HR Executive.
- Pending next login-rate window: HR Payroll Officer, Finance Manager, Finance Accountant, Finance Analyst.
- Admin: all tested protected module/admin reads returned `200`, except `/organization/settings/general` returned `404`.
- Manager and Project Manager: Audit, Department Access administration, Employees, Payroll, and Department list correctly returned `403`; Finance, Portfolio, Sheets, and Projects returned `200` in line with their base roles. However Users/Roles/Permissions and the department overview/direct-ID routes also returned `200`.
- HR Manager: Employees, Payroll, Departments, and Finance returned `200`; Department Access administration, Audit, Sheets, and Portfolio returned `403`. Projects unexpectedly returned `200` despite projected denial.
- HR Executive: Employees, Departments, and Finance returned `200`; Payroll, Audit, Department Access administration, Sheets, and Portfolio returned `403`. Projects unexpectedly returned `200` despite projected denial.

Live route-matrix testing is in progress. No subscription/billing entitlement has been changed and no application fix has been applied.

## Recommended depth and sequence

This area needs a deep audit, not a page-only smoke test. Recommended effort is 4–7 focused engineering days for one tester/developer, depending on the number of module APIs and whether production-like data is available:

1. **Day 1:** finalize intended access matrix, create QA tenant/users, capture baseline.
2. **Days 2–3:** UI/direct-route/API matrix for every primary role and sub-role.
3. **Day 4:** department, project, record ownership, IDOR, cross-tenant, expiry/revocation, and stale-session tests.
4. **Day 5:** role-change/demotion/cache tests and audit-log verification.
5. **Days 6–7:** add missing automated regression tests, retest findings after fixes, and produce release sign-off.

Minimum release gate: no Critical/High finding open; every sensitive route has explicit backend authorization; every role transition and department transition has an automated negative test; UI and `/me/permissions` are consistent after login, refresh, and revocation.
