# PM Audit – Deeper Pass: Done vs Remaining

## Completed in this pass

### Already done (previous session)
- Tenant projects: replaced `conditionalAuth` with `verifyERPToken`.
- Sprint model: `workspaceId` made optional.
- Approval & ChangeRequest: `deliverable_id` ref set to `'Deliverable'`.
- Business routes nucleusPM: PM notifications via `ProjectMember` owner lookup.
- Business projects metrics: removed hardcoded utilization (now `[]`).

### Done in this deeper pass
1. **Tenant approvals** (`backend/src/modules/tenant/routes/approvals.js`)  
   - PM notifications now use `ProjectMember.findOne({ projectId, role: 'owner', status: 'active' })` instead of `project.ownerId` (2 places).

2. **Tenant change-requests** (`backend/src/modules/tenant/routes/changeRequests.js`)  
   - Same ProjectMember owner lookup for PM notifications (2 places: on submit, on client decide).

3. **ERP Nucleus PM** (`backend/src/modules/business/erp/software-house/nucleusPM.js`)  
   - This is the **mounted** `/api/nucleus-pm` router (business index uses `softwareHouseERP.nucleusPM`).  
   - Same ProjectMember owner lookup for “all approved” and “approval rejected” notifications.

4. **Tenant documents** (`backend/src/modules/tenant/routes/documents.js`)  
   - Replaced no-op `conditionalAuth` with `verifyERPToken` so document routes are self-contained.

5. **No remaining `project.ownerId`**  
   - Grep confirms no backend code still uses `project.ownerId` for PM notifications.

---

## Remaining – completed in follow-up pass

### 1. Workspace approval logic (`Workspace.canApprove`) – DONE
- **File:** `backend/src/models/Workspace.js` (around line 387).
- **Issue:** For non-admin members it returns `true` for any active member; there is no role mapping (e.g. `approverType === 'dev_lead'` vs `member.role`).
- **Suggestion:** Add role mapping (e.g. workspace member role or profile field) and return true only when the member’s role matches the approval step.

### 2. Client portal – business route not mounted
- **File:** `backend/src/modules/business/routes/clientPortal.js` exists (client projects, deliverables, cards).
- **Issue:** Not mounted in `app.js`; business index has “Client Portal - REMOVED COMPLETELY”.
- **Note:** Tenant Software House has its own client-portal under `/api/tenant/:tenantSlug/software-house` (config, projects, etc.). If you want the business clientPortal for non-tenant use, mount it and ensure org/tenant scoping so clients cannot see other tenants’ data.

### 3. Frontend API split
- **Tenant project UI** already uses tenant paths via `tenant-api.service.js` and `features/tenant/.../projectConstants.js` (`/api/tenant/:slug/organization/projects`).
- **Other project UI** still calls `/api/projects` (e.g. ProjectManagerCockpit, Templates, ProjectSidebar, ProjectOverview, and ClientDashboard deliverable fetch). Decide whether to migrate these to tenant project API or keep general projects API and document which frontend uses which.

### 4. Task/Finance `ref: 'Milestone'`
- **Files:** `Task.js` (e.g. milestoneId), `Finance.js` (line 716), `Milestone.js` (self-ref).
- **Note:** These reference the Milestone model (project milestones), not the Nucleus Deliverable. Left as-is unless you unify milestones and deliverables.

### 5. SRS and FR-PM
- Update SRS (FR14, FR25) to reflect “backend substantial, frontend partially wired; Nucleus PM backend complete, Nucleus frontend not built” and reference the FR-PM-1–12 list if you adopted it.

---

## Summary

- **Critical PM notification and auth gaps from the audit are addressed.**
- **Remaining items (Workspace canApprove, client portal mount, frontend/API alignment, SRS) have been completed** in a follow-up pass.

---

## FR14 — Projects Module: Verdict & Recommendation (updated)

**Verdict: Feasible — Overlap with FR5/FR25; needs deduplication**

FR14 describes a general project management module. FR5/FR25 describes Nucleus — an advanced project management system. Both exist in the SRS, which creates confusion: are these two separate systems or one? The answer should be decided before further building.

| Feature | FR14 (General Projects) | FR25 (Nucleus) |
|--------|--------------------------|----------------|
| Task management | ✅ Yes | ✅ Yes (as deliverables + tasks) |
| Sprint management (Agile/Scrum) | ✅ Yes | ⚠️ Partial (Sprint model exists; `workspaceId` now optional so sprints work without workspace) |
| Gantt chart | ❌ Not in FR14 | ✅ Core feature |
| Client portal | ❌ Not in FR14 | ✅ Core; mounted at `/api/client-portal` (org-scoped) + tenant Software House routes |
| Approval workflow | ❌ Not in FR14 | ✅ Core; Workspace `approvalRole` + Approval refs `Deliverable` |
| Change requests | ❌ Not in FR14 | ✅ Core; ChangeRequest refs `Deliverable`; PM notifications via ProjectMember owner |
| Time tracking | ✅ Yes | ✅ Yes |
| Resource allocation | ✅ Yes | ⚠️ Partial |

**Current implementation (post-audit):**

- **General projects:** `/api/projects` (manager cockpit, templates, milestones/upcoming, members, metrics). Used by some frontend pages (cockpit, overview, templates).
- **Tenant projects:** `/api/tenant/:slug/organization/projects` (full CRUD, tasks, milestones, sprints, resources, timesheets, gantt). Used by tenant project UI.
- **Nucleus:** `/api/nucleus-pm` (deliverables, approvals, change requests; PM notifications via ProjectMember owner; Workspace `canApprove` uses `approvalRole`). Backend complete; dedicated Nucleus UI not yet built.
- **Client portal:** `/api/client-portal` (projects, deliverables, approve/reject, timeline, comments); org-scoped; Client model has optional `userId` for portal login.

**Recommendation: Nucleus IS the Projects module for Software House ERP**

- Do not build two separate project management systems. Nucleus should **replace** FR14 for Software House ERP.
- FR14’s sprint management (Agile/Scrum backlogs, story points, velocity) is the main capability Nucleus does not yet cover — **add it to Nucleus** (Sprint model already exists and is used by tenant projects) rather than maintaining a parallel system.
- One unified system is easier to build, maintain, and use.

**Concrete SRS/design actions:**

1. **Merge FR14 into FR25 (Nucleus)** for Software House ERP: treat Nucleus as the single Projects module (tasks, sprints, deliverables, approvals, change requests, client portal, Gantt, time tracking).
2. **Add sprint/backlog management to Nucleus** (stories, story points, velocity, sprint planning) so Nucleus fully subsumes FR14.
3. **Remove FR14 as a separate requirement** for Software House ERP; keep FR14 only if/when other ERP types need a simpler, non-Nucleus project module.
