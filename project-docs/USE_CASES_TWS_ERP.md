## TWS – Multi‑Tenant ERP
## Use Case Specifications (All Use Cases)

**Version:** 1.0  
**Date:** March 3, 2026  
**Scope:** Software House ERP (current active category)

---

### UC‑01 Tenant Registration & Provisioning (Self‑Serve)

- **Use Case ID**: UC‑01  
- **Use Case Name**: Tenant Registration & Provisioning (Self‑Serve)  
- **Scope**: TWS Multi‑Tenant ERP (Software House ERP)  
- **Level**: User goal  
- **Primary Actor**: New Registrant (future tenant owner)  
- **Supporting Actors**: Email Service (OTP, welcome email)  
- **Stakeholders & Interests**:  
  - **Registrant**: Wants an easy signup, verified email, and a ready‑to‑use workspace.  
  - **Platform Owner**: Wants verified tenants, consistent onboarding, default data seeded correctly.  
- **Preconditions**:  
  - System is online; MongoDB and email service available.  
  - User is not currently authenticated as a tenant user.  
- **Postconditions**:  
  - **Success**:  
    - New Software House tenant is created and active with a default organization.  
    - Tenant owner user exists and is linked via TenantUser with role `owner`.  
    - Default departments/teams/chart of accounts/sample project and onboarding tracker exist.  
    - Tenant owner has department access to all seeded departments.  
  - **Minimal guarantees**:  
    - If tenant creation/seeding fails, system rolls back or flags inconsistent state; no unusable tenant is left silently.  
- **Main Success Scenario (Basic Flow)**:  
  1. Registrant opens the Software House ERP signup page.  
  2. Registrant enters full name, email, and password and submits.  
  3. System validates input and checks that the email is not already registered.  
  4. System creates a user with status `pending_verification` and sends a 6‑digit OTP to the email.  
  5. System displays the OTP entry screen.  
  6. Registrant enters the OTP.  
  7. System validates the OTP (correct, not expired) and marks email as verified.  
  8. System shows the organization setup screen.  
  9. Registrant enters organization name and chooses a tenant slug.  
  10. System validates slug format and checks availability in real time.  
  11. Registrant submits the organization form.  
  12. System creates: tenant (Software House, trial plan), default organization, TenantUser(owner), seeded departments/teams/COA/sample employees/payroll/templates/sample project, and TenantDepartmentAccess for the owner on all departments.  
  13. System updates tenant status to `active`, creates an onboarding progress record, and sends a welcome email.  
  14. System redirects the owner to the tenant login/start page.  
- **Extensions (Alternative / Exception Flows)**:  
  - **2a. Invalid email format**  
    - 2a1. System rejects input and shows “Invalid email format”.  
    - 2a2. Registrant corrects email and resubmits.  
  - **3a. Email already registered**  
    - 3a1. System shows “Email already registered”.  
    - 3a2. Registrant can navigate to login or password reset.  
  - **4a. Email sending failure**  
    - 4a1. System logs the error and shows a generic message; user may retry later.  
  - **7a. Invalid or expired OTP**  
    - 7a1. System shows “Invalid or expired code”; offers resend (rate‑limited).  
  - **10a. Slug already taken**  
    - 10a1. System shows “Slug already taken, please choose another”; registrant chooses a new slug.  
  - **12a. Database or seeding failure**  
    - 12a1. System rolls back tenant state or marks tenant as inconsistent and alerts support; registrant sees a generic error.  
- **Special Requirements**:  
  - Slug is immutable once created (FR2).  
  - Default department access must ensure the owner is never blocked from seeded departments on first login (FR4, FR27).  
  - Signup and OTP verification are rate‑limited (FR3, §7.1).  

---

### UC‑02 User Authentication & Login

- **Use Case ID**: UC‑02  
- **Use Case Name**: User Authentication & Login  
- **Scope**: TWS Multi‑Tenant ERP  
- **Level**: User goal  
- **Primary Actor**: User (Supra Admin, Tenant User, or Client Portal User)  
- **Supporting Actors**: —  
- **Stakeholders & Interests**:  
  - **User**: Wants secure login and to land on the correct dashboard.  
  - **Platform Owner**: Wants secure, auditable access with tenant/department scoping.  
- **Preconditions**:  
  - User account exists (not hard‑deleted).  
  - For tenant users: associated tenant exists.  
- **Postconditions**:  
  - **Success**:  
    - User is authenticated; access token (JWT) and refresh token are issued.  
    - Token contains userId, tenantId/orgId, role, `hrSubRole` where applicable, `departmentIds`, and platform.  
    - Login event and last login timestamp are recorded.  
  - **Minimal guarantees**:  
    - On failure, failed attempt is recorded and rate‑limit counters updated.  
- **Main Success Scenario (Basic Flow)**:  
  1. User opens login page and selects login type (Supra Admin, Tenant/Company, Client Portal).  
  2. User enters email and password and submits.  
  3. System validates input syntax.  
  4. System looks up the user by email.  
  5. System verifies the password using bcrypt.  
  6. System checks that the user account is active and not suspended.  
  7. For tenant users, system checks that the tenant is active and not fully blocked.  
  8. System loads TenantUser for this user+tenant (if any) and resolves `role` and `hrSubRole`.  
  9. System loads active TenantDepartmentAccess records and collects `departmentIds`.  
  10. System determines `platform` from headers (web/mobile/portal).  
  11. System checks login rate limit (5 attempts per 15 minutes).  
  12. System generates an access token (15 minutes) and refresh token (7 days) with the required claims.  
  13. System stores/rotates the refresh token in the database.  
  14. System logs the login event in the appropriate audit log.  
  15. System redirects the user to the appropriate dashboard based on role and login type.  
- **Extensions (Alternative / Exception Flows)**:  
  - **4a/5a. Wrong email or password**  
    - 4a1. System increments failed‑login counter and shows “Incorrect email or password”.  
  - **6a. Account inactive or suspended**  
    - 6a1. System shows “Account is inactive/suspended, contact administrator/support”.  
  - **7a. Tenant inactive or read‑only**  
    - 7a1. System may block login or allow read‑only access with banner and redirect to billing per FR20.  
  - **11a. Rate limit exceeded**  
    - 11a1. System returns HTTP 429 with Retry‑After; user must wait.  
- **Special Requirements**:  
  - JWT, revocation list, and refresh flow must follow §7.5–7.6.  
  - Sensitive modules check revocation on each request (payroll, audit, finance reports, export).  
  - Mobile access to payroll, full finance reports, audit log, and bulk export must be blocked at route level with DESKTOP_ONLY (NFR3).  

---

### UC‑03 Software House Module Access

- **Use Case ID**: UC‑03  
- **Use Case Name**: Software House Module Access  
- **Scope**: TWS – Software House ERP  
- **Level**: User goal  
- **Primary Actor**: Tenant User (Tenant Admin, Manager, Employee, etc.)  
- **Supporting Actors**: —  
- **Stakeholders & Interests**:  
  - **Tenant Users**: Want to see only modules relevant to their job, without clutter.  
  - **Tenant Admin**: Wants module access controlled by roles and department access.  
- **Preconditions**:  
  - User is authenticated (UC‑02).  
  - Tenant is a Software House tenant and active.  
- **Postconditions**:  
  - **Success**:  
    - User sees a module menu filtered by role and department access.  
    - Unauthorized modules are hidden or return 403 on direct URL.  
  - **Minimal guarantees**:  
    - No cross‑tenant data is exposed.  
- **Main Success Scenario (Basic Flow)**:  
  1. User logs in and is directed to the tenant dashboard.  
  2. Frontend calls `GET /me/permissions` to fetch resolved modules/permissions (UPR).  
  3. System returns allowed modules and actions based on TenantUser role, `hrSubRole`, and `departmentIds`.  
  4. UI renders the Software House menu (Nucleus/Projects, HR, Finance, Time Tracking, Clients, Attendance, Document Hub, etc.) according to permissions.  
  5. User clicks a module (e.g., Nucleus).  
  6. System authorizes access using `requireErpAccess` and returns the module UI/data if allowed.  
  7. User performs module‑specific actions (which are detailed in other use cases, e.g., UC‑04, UC‑05, UC‑14).  
- **Extensions (Alternative / Exception Flows)**:  
  - **4a. No modules available** (e.g., user is client or heavily restricted)  
    - 4a1. UI shows only allowed items (e.g., Client Portal); everything else is hidden.  
  - **6a. User opens direct URL to a module without permission**  
    - 6a1. API returns 403 “Access denied”; UI shows an access denied page.  
- **Special Requirements**:  
  - Menus must be driven only by resolved permissions, not by static role checks in the UI.  
  - UPR must be the single source of truth for module visibility (FR27, §7.7).  

---

### UC‑04 Nucleus Project Management

- **Use Case ID**: UC‑04  
- **Use Case Name**: Nucleus Project Management  
- **Scope**: TWS – Software House ERP (Nucleus PM)  
- **Level**: User goal  
- **Primary Actor**: Project Manager (PM)  
- **Supporting Actors**: Developer/Team Member, Client (read‑only + change requests)  
- **Stakeholders & Interests**:  
  - **PM**: Wants structured project setup, deliverables, approvals, and analytics.  
  - **Developers**: Want clear deliverables and feedback.  
  - **Clients**: Want transparent project progress with ability to request changes.  
- **Preconditions**:  
  - Tenant is Software House and active.  
  - PM is authenticated and has access to Nucleus module.  
  - At least one workspace exists, or PM can create one.  
- **Postconditions**:  
  - **Success**:  
    - Projects exist within workspaces with configured departments, deliverables, and assigned team.  
    - Deliverables and change requests reflect correct statuses and history.  
    - Client portal shows updated, read‑only progress.  
  - **Minimal guarantees**:  
    - All state‑changing operations (create/update/approve/reject) are audit‑logged.  
- **Main Success Scenario (Basic Flow)**:  
  **A. Creating a project**  
  1. PM navigates to Nucleus section and selects or creates a workspace.  
  2. PM chooses “Create Project” and selects a template or blank.  
  3. System creates project with default phases/deliverables from template.  
  4. PM configures project metadata (name, description, timeline, budget, client, team).  
  5. PM adds departments; for each department selects a ProjectDepartmentConfig preset (dev/design/qa/pm/finance_observer/sales_observer).  
  6. System saves per‑department view/action config and initializes the project dashboard.  
  7. System notifies team members.  
  **B. Managing deliverables and approvals**  
  8. PM refines/adds deliverables with dates and dependencies.  
  9. System validates dates and renders Gantt chart.  
  10. Developers update deliverable status as they work.  
  11. PM submits deliverables into sequential approval workflow per configured approval roles.  
  12. Approvers review and approve/reject with comments.  
  13. On approval, deliverable becomes Approved; on rejection, status returns to In Progress/Revision, and assignee is notified.  
  **C. Change requests**  
  14. Client or team member creates a change request with description, effort, and impact.  
  15. System records request and notifies PM.  
  16. PM classifies it (Minor/Medium/Major/Scope) and routes approval: Team Lead, PM, CFO, CEO as per FR25.  
  17. Authority approves or rejects; on approval, system updates timeline/budget/deliverables; requester notified.  
  **D. Client portal**  
  18. Client logs in via tenant‑scoped client portal.  
  19. System shows read‑only Gantt view, deliverables, and invoices for that client only.  
- **Extensions (Alternative / Exception Flows)**:  
  - **9a. Invalid date dependencies**  
    - 9a1. System highlights conflicts and refuses to save.  
  - **12a. Unauthorized approver**  
    - 12a1. System blocks action and shows “You cannot approve this step”.  
  - **16a. PM is requester**  
    - 16a1. System enforces rule: PM cannot self‑approve; escalates to Department Head.  
- **Special Requirements**:  
  - Max resubmission attempts enforced with escalation (FR25).  
  - All Nucleus APIs must be tenant‑scoped (`/api/tenant/:tenantSlug/nucleus-pm`) and use UPR checks.  

---

### UC‑05 Department Management & Access

- **Use Case ID**: UC‑05  
- **Use Case Name**: Department Management & Access  
- **Scope**: TWS – Software House ERP (Tenant Organization)  
- **Level**: User goal  
- **Primary Actor**: Tenant Admin (CEO/Owner, HR Manager, Department Head)  
- **Supporting Actors**: —  
- **Stakeholders & Interests**:  
  - **CEO/HR**: Want central, auditable control of department structure and access.  
  - **Department Heads**: Want to manage access for their own department.  
  - **Employees/Contractors**: Want correct access, revoked when not needed.  
- **Preconditions**:  
  - Tenant is active and uses department‑based access.  
  - Actor is authenticated and permitted to manage departments/access.  
- **Postconditions**:  
  - **Success**:  
    - Department definitions are created/updated as requested.  
    - TenantDepartmentAccess entries are created/updated/revoked with correct status/expiry.  
    - Audit log entries exist for all changes.  
  - **Minimal guarantees**:  
    - On failure, previous access rights remain unchanged.  
- **Main Success Scenario (Basic Flow)**:  
  **A. Department CRUD**  
  1. Tenant Admin opens Departments page.  
  2. Admin creates a new department or edits existing one (name, hierarchy, head, settings).  
  3. System stores changes and updates any caches.  
  **B. Granting access**  
  4. Admin selects a department and opens “Manage Access”.  
  5. Admin searches for one or more users (employees/contractors).  
  6. Admin selects users, optionally sets an expiry date.  
  7. Admin confirms “Grant Access”.  
  8. System creates/updates TenantDepartmentAccess records and notifies each user.  
  9. System writes an audit entry.  
  **C. Revoking access**  
  10. Admin selects a user’s department access and chooses “Revoke” or “Emergency Revoke”.  
  11. System sets status to revoked, pushes user to revocation list (for token TTL), and notifies user/HR.  
  12. System writes an audit entry.  
- **Extensions (Alternative / Exception Flows)**:  
  - **4a. Department Head tries to manage department they don’t own**  
    - 4a1. System returns 403 “Access denied”; only CEO/HR can manage that department.  
  - **7a. No expiry for contractor**  
    - 7a1. System shows a warning and asks for confirmation.  
  - **11a. Scheduled expiry**  
    - 11a1. A cron job sets status to expired, adds user to revocation list, and sends notifications.  
- **Special Requirements**:  
  - All access changes must use `requireErpAccess` and follow rate limits (60 per 15 minutes).  
  - Department and access changes must be visible in tenant audit log (FR21, FR27).  

---

### UC‑06 Supra Admin Operations

- **Use Case ID**: UC‑06  
- **Use Case Name**: Supra Admin Operations (Platform Administration)  
- **Scope**: TWS Platform (all tenants)  
- **Level**: User goal  
- **Primary Actor**: Supra Admin (platform_super_admin, platform_admin, platform_billing)  
- **Supporting Actors**: —  
- **Stakeholders & Interests**:  
  - **Supra Admin**: Wants centralized control over tenants, billing, platform users, and health.  
  - **Platform Owner**: Wants safe operations without bypassing self‑serve signup rules.  
- **Preconditions**:  
  - User is authenticated as a platform admin (not just tenant user).  
- **Postconditions**:  
  - **Success**:  
    - Tenants, plans, invoices, platform users, and health data are updated as requested.  
    - Platform audit log contains all sensitive operations.  
  - **Minimal guarantees**:  
    - On error, tenant data is left in a consistent state or clearly flagged.  
- **Main Success Scenario (Basic Flow)**:  
  1. Supra Admin logs in via Supra Admin login path.  
  2. System displays Supra Admin dashboard (platform metrics, tenant counts, plan distribution).  
  3. Supra Admin opens Tenant Management and filters tenant list.  
  4. Supra Admin views a tenant’s details and may update non‑creation fields (status, plan for Software House tenants, etc.).  
  5. Supra Admin suspends or deletes a tenant when needed; system applies status change/read‑only rules.  
  6. Supra Admin opens Billing, views invoices, creates invoices, and marks invoices as paid/failed for Software House tenants.  
  7. Supra Admin opens Platform Users, configures roles for other Supra Admins (e.g., billing‑only).  
  8. Supra Admin checks System & Health to view health endpoints and operational status.  
- **Extensions (Alternative / Exception Flows)**:  
  - **4a. Attempt to create tenant from Supra Admin**  
    - 4a1. System does not provide such functionality per FR2; self‑serve signup only.  
  - **5a. Suspension of tenant**  
    - 5a1. System sets tenant status accordingly; tenant may enter read‑only or blocked state.  
- **Special Requirements**:  
  - All Supra Admin operations are logged in Platform Audit with long retention (FR21).  
  - Plan selection is disabled for non–Software House tenants; plan is shown as N/A.  

---

### UC‑07 Dashboard & Analytics

- **Use Case ID**: UC‑07  
- **Use Case Name**: Dashboard & Analytics  
- **Scope**: TWS – Software House ERP and Platform  
- **Level**: User goal  
- **Primary Actor**: Role‑based user (Supra Admin, Tenant Admin/Owner, PM, Employee)  
- **Supporting Actors**: —  
- **Stakeholders & Interests**:  
  - **All roles**: Want at‑a‑glance summaries relevant to their responsibilities.  
- **Preconditions**:  
  - User is authenticated and has access to at least one dashboard.  
- **Postconditions**:  
  - **Success**:  
    - User sees a dashboard tailored to their role with current metrics.  
  - **Minimal guarantees**:  
    - Even if some metric fails to load, user sees a partial dashboard with clear errors.  
- **Main Success Scenario (Basic Flow)**:  
  1. User logs in (UC‑02) and is redirected to a dashboard.  
  2. System determines dashboard variant based on role and context.  
  3. For Supra Admin: system loads platform metrics (tenants, plan distribution, growth trends).  
  4. For Tenant Admin: system loads organization metrics (user counts, module usage).  
  5. For Software House PM/Manager: system loads project status, team performance, client/project portfolio, time tracking summary, deliverable status, at‑risk projects.  
  6. User can click metrics to drill down into detail pages (projects, reports, etc.).  
- **Extensions (Alternative / Exception Flows)**:  
  - **3a. Metrics source unavailable**  
    - 3a1. System shows “Data temporarily unavailable” for affected widgets and logs error.  
- **Special Requirements**:  
  - Dashboard queries must meet performance targets (NFR1).  

---

### UC‑08 Reporting & Export

- **Use Case ID**: UC‑08  
- **Use Case Name**: Reporting & Export  
- **Scope**: TWS – Software House ERP and Platform  
- **Level**: User goal  
- **Primary Actor**: Supra Admin, Tenant Admin, Finance Manager, HR Manager, PM  
- **Supporting Actors**: —  
- **Stakeholders & Interests**:  
  - **Management**: Want reports for analysis and compliance; want to export data.  
- **Preconditions**:  
  - User is authenticated and has permission for the report type.  
- **Postconditions**:  
  - **Success**:  
    - Report is generated with the selected filters.  
    - If requested, export file is produced (PDF, Excel, CSV) and download starts.  
    - Export event is logged to audit log where applicable.  
  - **Minimal guarantees**:  
    - If export fails, at least on‑screen report remains.  
- **Main Success Scenario (Basic Flow)**:  
  1. User navigates to the Reports section or a module’s report page.  
  2. User selects report type, date range, and filters.  
  3. System validates filters and queries data.  
  4. System displays the report (tables/charts).  
  5. User clicks Export and selects format (PDF/Excel/CSV).  
  6. System checks role‑based export rate limits and desktop‑only constraints for bulk exports.  
  7. System generates the file and presents it for download.  
  8. System writes an audit log entry for the export.  
- **Extensions (Alternative / Exception Flows)**:  
  - **3a. No data found**  
    - 3a1. System shows “No records found for selected filters”.  
  - **6a. Rate limit exceeded**  
    - 6a1. System returns HTTP 429 and informs user to try later.  
  - **6b. Mobile bulk export attempt**  
    - 6b1. System returns 403 with DESKTOP_ONLY code; UI shows “Desktop only”.  
- **Special Requirements**:  
  - Export rate limits must follow §7.1.  
  - Bulk exports limited in size (e.g., 500 records).  

---

### UC‑09 Notifications

- **Use Case ID**: UC‑09  
- **Use Case Name**: Notifications (In‑App and Email)  
- **Scope**: TWS – Software House ERP  
- **Level**: Sub‑function  
- **Primary Actor**: System (as sender)  
- **Supporting Actors**: Any user as recipient  
- **Stakeholders & Interests**:  
  - **Users**: Want timely notifications without spam.  
  - **Platform Owner**: Wants reliable, audited notification behaviour.  
- **Preconditions**:  
  - User has an account and may have notification preferences configured.  
- **Postconditions**:  
  - **Success**:  
    - Notification is stored and delivered in‑app and/or via email as per FR18 trigger matrix and user preferences.  
  - **Minimal guarantees**:  
    - If real‑time delivery fails, notification is stored for later retrieval.  
- **Main Success Scenario (Basic Flow)**:  
  1. A business event occurs (task assigned, leave approved, invoice overdue, deliverable rejected, etc.).  
  2. System checks FR18 trigger matrix for event type and recipients, and user preferences where implemented.  
  3. System creates a notification record in tenant_notifications.  
  4. System emits in‑app notification via Socket.IO to each recipient’s room.  
  5. If email is enabled for this event, system sends email using appropriate template.  
  6. Recipient views notifications list in UI; marks items as read as needed.  
  7. On reconnect, recipients receive undelivered/unread notifications for the recent window.  
- **Extensions (Alternative / Exception Flows)**:  
  - **4a. Recipient offline**  
    - 4a1. In‑app delivery is delayed until next reconnect; record remains unread.  
  - **5a. Email delivery failure**  
    - 5a1. System logs failure; in‑app still serves as primary channel.  
- **Special Requirements**:  
  - Messages and recipients must exactly match the FR18 notification matrix.  
  - No cross‑tenant notification leakage.  

---

### UC‑10 File Management

- **Use Case ID**: UC‑10  
- **Use Case Name**: File Management  
- **Scope**: TWS – Software House ERP  
- **Level**: Sub‑function  
- **Primary Actor**: Authenticated User  
- **Supporting Actors**: S3 Storage  
- **Stakeholders & Interests**:  
  - **Users**: Want to upload and access files reliably.  
  - **Platform Owner**: Wants secure, quota‑aware file storage.  
- **Preconditions**:  
  - User is authenticated.  
  - Tenant storage quota not fully exceeded.  
- **Postconditions**:  
  - **Success**:  
    - Files are stored under tenant‑specific S3 prefix and referenced in the database.  
    - Quota/usage metrics updated.  
  - **Minimal guarantees**:  
    - On failed upload, no orphaned partial file should be left accessible.  
- **Main Success Scenario (Basic Flow)**:  
  1. User initiates a file upload (profile picture, attachment, Document Hub file).  
  2. System validates file type and size (≤ 100MB).  
  3. System checks tenant storage usage vs plan limit.  
  4. System uploads file to S3 under tenant prefix and stores metadata (owner, context, permissions).  
  5. System updates storage usage metrics.  
  6. User can view/download file according to access control rules.  
- **Extensions (Alternative / Exception Flows)**:  
  - **2a. Invalid type or too large**  
    - 2a1. System rejects and shows error.  
  - **3a. Storage quota exceeded**  
    - 3a1. System blocks upload and shows “Storage limit reached; please upgrade or delete files”.  
- **Special Requirements**:  
  - Enforce FR19 and FR20 storage rules; exclude logs/audit from quota per spec.  

---

### UC‑11 Subscription & Billing Management

- **Use Case ID**: UC‑11  
- **Use Case Name**: Subscription & Billing Management  
- **Scope**: TWS – Software House ERP (billing only for Software House tenants)  
- **Level**: User goal  
- **Primary Actor**: Tenant Admin/Owner  
- **Supporting Actors**: Supra Admin (billing operations)  
- **Stakeholders & Interests**:  
  - **Tenant Admin**: Wants to understand usage, manage plans, avoid unexpected lockouts.  
  - **Platform Owner**: Wants consistent plan enforcement and clear read‑only rules.  
- **Preconditions**:  
  - Tenant is Software House category.  
  - Tenant Admin is authenticated.  
- **Postconditions**:  
  - **Success**:  
    - Plan and usage data are updated, and tenant state (Active/PastDue/ReadOnly/Suspended) is correct.  
  - **Minimal guarantees**:  
    - When read‑only state applies, reads still work; writes clearly fail with explanation.  
- **Main Success Scenario (Basic Flow)**:  
  1. Tenant Admin navigates to Billing/Usage page.  
  2. System calls billing API and shows current plan, limits, usage, at‑risk metrics, read‑only state, and features.  
  3. Tenant Admin reviews warnings (e.g., ≥80% usage) and clicks Upgrade Plan.  
  4. Tenant Admin selects a new plan.  
  5. System checks current usage vs selected plan limits (users, projects, workspaces, clients, storage).  
  6. If within limits, system updates plan; otherwise, system blocks upgrade and shows guidance (“Deactivate users or choose higher plan”).  
  7. Supra Admin or external billing system records payment; when invoice is marked paid, system clears PastDue/read‑only state.  
- **Extensions (Alternative / Exception Flows)**:  
  - **5a. Trial expiry**  
    - 5a1. After trial end, system enters read‑only mode for tenant and warns users; next login redirects to billing.  
  - **5b. Payment failed and grace expired**  
    - 5b1. System enters read‑only after grace period and informs tenant admin.  
  - **4a. Non–Software House tenant**  
    - 4a1. System shows plan as N/A and disables plan changes.  
- **Special Requirements**:  
  - All status transitions must follow FR20 state machine (Trialing/Active/PastDue/ReadOnly/Suspended/Cancelled).  

---

### UC‑12 Tenant Audit Log Access

- **Use Case ID**: UC‑12  
- **Use Case Name**: Tenant Audit Log Access  
- **Scope**: TWS – Software House ERP (tenant‑level audit)  
- **Level**: User goal  
- **Primary Actor**: Tenant Owner/CEO, Department Head  
- **Supporting Actors**: —  
- **Stakeholders & Interests**:  
  - **Management**: Want visibility into “who did what, when” for their tenant.  
- **Preconditions**:  
  - User has permission to view tenant audit (CEO/Owner, Admin, or Department Head as scoped).  
- **Postconditions**:  
  - **Success**:  
    - User can view and optionally export filtered audit entries.  
  - **Minimal guarantees**:  
    - Audit records are not modified by viewing/exporting.  
- **Main Success Scenario (Basic Flow)**:  
  1. User navigates to the Audit Log page.  
  2. User sets filters (user, date range, resource type).  
  3. System retrieves matching entries from tenant_audit_logs and displays them with pagination.  
  4. User optionally exports results to CSV (desktop‑only for bulk).  
  5. System generates CSV and offers download.  
- **Extensions (Alternative / Exception Flows)**:  
  - **2a. No matching records**  
    - 2a1. System displays “No audit records for selected criteria”.  
  - **4a. Mobile bulk export attempt**  
    - 4a1. System returns 403 DESKTOP_ONLY and shows “Desktop only”.  
- **Special Requirements**:  
  - Retention and archiving rules as per FR21 (1 year tenant, 2 years platform by default, configurable).  

---

### UC‑13 Profile Management

- **Use Case ID**: UC‑13  
- **Use Case Name**: Profile Management  
- **Scope**: TWS – All users  
- **Level**: User goal  
- **Primary Actor**: Any authenticated user  
- **Supporting Actors**: File storage (for profile picture)  
- **Stakeholders & Interests**:  
  - **Users**: Want to keep their information and preferences up‑to‑date.  
- **Preconditions**:  
  - User is authenticated.  
- **Postconditions**:  
  - **Success**:  
    - Profile details, password, and preferences are updated and stored.  
  - **Minimal guarantees**:  
    - Password is always stored securely (hashed).  
- **Main Success Scenario (Basic Flow)**:  
  1. User navigates to Profile/Account settings.  
  2. User updates personal info (name, phone, address, etc.) and saves.  
  3. User uploads or changes profile picture; system validates and stores it.  
  4. User changes password: enters current password and new password; system validates and updates.  
  5. User configures preferences (theme, timezone, notifications).  
  6. System confirms changes and applies them to subsequent sessions as needed.  
- **Extensions (Alternative / Exception Flows)**:  
  - **4a. Wrong current password**  
    - 4a1. System rejects change and shows error; password is not updated.  
  - **3a. Invalid or too large profile picture**  
    - 3a1. System rejects upload and shows error.  
- **Special Requirements**:  
  - Email changes may require verification (implementation choice).  

---

### UC‑14 Document Hub (Documents Module)

- **Use Case ID**: UC‑14  
- **Use Case Name**: Document Hub (Documents Module)  
- **Scope**: TWS – Software House ERP  
- **Level**: User goal  
- **Primary Actor**: Employee (Creator/Editor)  
- **Supporting Actors**: Department Head, Senior roles, Tenant Admin  
- **Stakeholders & Interests**:  
  - **Employees**: Want to create and manage documents with approvals and versions.  
  - **Department Heads/Admins**: Want control over approvals, access, and bulk operations.  
- **Preconditions**:  
  - User is authenticated and has department access where applicable.  
  - Tenant storage quota is not exceeded.  
- **Postconditions**:  
  - **Success**:  
    - Documents and/or uploaded files exist with correct status, versions, and audit trail.  
  - **Minimal guarantees**:  
    - Each document action is recorded in document audit log.  
- **Main Success Scenario (Basic Flow)**:  
  1. User opens Document Hub and sees document library (grid/list/table) with filters.  
  2. User creates a new document from template or uploads a file.  
  3. System stores document/file, associates it to tenant and department(s), and records initial version.  
  4. User edits content in rich text editor; system autosaves and records versions.  
  5. User submits document for review; status becomes “In Review”.  
  6. Department Head/Senior opens approval queue, reviews the document, and approves or rejects with comment.  
  7. On approval, status becomes “Approved”; on rejection, status becomes “Rejected/Needs changes” and creator is notified.  
  8. User or admin can archive or restore documents as allowed; all actions are logged.  
- **Extensions (Alternative / Exception Flows)**:  
  - **6a. No action within 7 days**  
    - 6a1. System re‑notifies reviewers.  
  - **6b. No action within 14 days**  
    - 6b1. System escalates to Department Head.  
  - **2a. Storage quota reached**  
    - 2a1. System blocks creating/uploading documents and shows storage warning.  
- **Special Requirements**:  
  - Department‑scoped access and filtering must follow FR27.  
  - Export of documents allowed only for specific roles (Creator, Department Head, CEO).  

---

### UC‑15 CRM & Deal Management (Software House ERP)

- **Use Case ID**: UC‑15  
- **Use Case Name**: CRM & Deal Management  
- **Scope**: TWS – Software House ERP (FR29 – planned)  
- **Level**: User goal  
- **Primary Actor**: Sales Executive  
- **Supporting Actors**: Sales Manager, PM, Finance, CEO  
- **Stakeholders & Interests**:  
  - **Sales**: Want clear deal pipeline and handoff to delivery.  
  - **PM/Finance/CEO**: Want reliable project creation after a deal is Won, and visibility into pipeline.  
- **Preconditions**:  
  - Tenant is Software House and FR29 feature is implemented/enabled.  
  - Sales user is authenticated and has deal permissions.  
- **Postconditions**:  
  - **Success**:  
    - Deals exist with correct statuses and ownership.  
    - On Won, a corresponding Nucleus project is created or a failure is logged with retry path.  
  - **Minimal guarantees**:  
    - Lost deals have a `lostReason` and are archived read‑only.  
- **Main Success Scenario (Basic Flow)**:  
  1. Sales Executive opens Deals page.  
  2. Sales Executive creates a new deal with required fields (name, clientId, value, expectedCloseDate, etc.).  
  3. System stores deal with status `lead`.  
  4. Sales Executive or Sales Manager updates deal status along pipeline: lead → qualified → proposal_sent → negotiation.  
  5. When negotiations succeed, Sales user sets status to `won`.  
  6. System creates a new Nucleus project: name = deal name, clientId = deal client, budgetPlaceholder = deal value, dealId linked.  
  7. System notifies all project_manager users and Finance of the new project.  
- **Extensions (Alternative / Exception Flows)**:  
  - **5a. Deal lost**  
    - 5a1. User sets status to `lost`; system requires `lostReason`.  
    - 5a2. System archives the deal as read‑only.  
  - **6a. Project creation failure on Won**  
    - 6a1. System logs failure and creates a FailedHandoff alert for CEO/Admin.  
    - 6a2. Admin can later retry project creation from the deal.  
- **Special Requirements**:  
  - Access and visibility to deals must follow FR29 (Sales Executive, Sales Manager, PM, Finance, CEO scopes).  

---

