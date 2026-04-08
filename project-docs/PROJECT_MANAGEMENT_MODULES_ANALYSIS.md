# Project Management Modules – Deep Analysis (Software House ERP)

**Date:** February 2026  
**Scope:** TWS Software House ERP – how many project management modules exist and how they relate to FR14, FR24, FR25.

---

## 1. How Many Project Management “Modules” Exist?

In the **codebase** there are **three SRS-level project/workspace requirements** that translate into **two overlapping functional systems** plus a shared Kanban layer:

| SRS | Name | In code as | Count as |
|-----|------|------------|----------|
| **FR14** | Projects Module (Software House ERP) | General projects, tasks, sprints, teams, time-tracking, development-metrics, project-access, plus boards/cards/lists/workspaces/templates | **1 system** (“General Projects”) |
| **FR24** | Workspace Management | boards, cards, lists, workspaces, templates | **Shared layer** used by General Projects (and by Nucleus for workspace container) |
| **FR25** | Nucleus Project Management | nucleus-templates, nucleus-pm, nucleus-analytics, nucleus-batch | **1 system** (“Nucleus”) |

So in practice:

- **Two distinct project-management “systems”** that both exist today:
  1. **General Projects (FR14)** – project-centric: projects, tasks, sprints, milestones, teams, time tracking, resources, Kanban (boards/lists/cards), templates.
  2. **Nucleus (FR25)** – workspace-centric: workspaces → projects → deliverables, approvals, change requests, Gantt, client portal, onboarding, analytics, batch.

- **One shared “Workspace / Kanban” layer (FR24)** – boards, cards, lists, workspaces, templates – used by General Projects for Kanban and by Nucleus for the workspace container.

**Answer:** There are **2 project management modules/systems** in the Software House ERP today (General Projects + Nucleus), plus a **shared workspace/Kanban layer** (FR24) used by both. The SRS lists three separate requirements (FR14, FR24, FR25), which creates the overlap and confusion your finding describes.

---

## 2. Backend API Surface (What’s Actually Mounted)

All of the following are mounted in `TWS/backend/src/app.js` under the business module:

### 2.1 General Projects (FR14-style)

| Mount path | Route module | Purpose |
|------------|--------------|---------|
| `/api/projects` | `projects.js` | Project CRUD, metrics, templates, members; uses Board, List, Card, ProjectTemplate |
| `/api/project-access` | `projectAccess.js` | Project access control |
| `/api/tasks` | `tasks.js` | Task CRUD, org/project-scoped; uses Task, Project, List; uses nucleusAutoCalculationService |
| `/api/teams` | `teams.js` | Team management |
| `/api/time-tracking` | `timeTracking.js` | Time entries, billable/non-billable |
| `/api/sprints` | `sprints.js` | Sprint CRUD per project (Agile/Scrum), backlog (Card), Sprint model |
| `/api/development-metrics` | `developmentMetrics.js` | Development metrics |

### 2.2 Nucleus (FR25)

| Mount path | Route module | Purpose |
|------------|--------------|---------|
| `/api/nucleus-templates` | `nucleusTemplates.js` | Create projects from template, onboarding checklist, progress, quick-start |
| `/api/nucleus-pm` | `erp/software-house/nucleusPM.js` | Deliverables CRUD, status/ship, approval chains, approve/reject, task-link, change requests, date validation |
| `/api/nucleus-analytics` | `nucleusAnalytics.js` | Workspace stats, project summary, at-risk deliverables, pending approval, change requests, timeline, metrics |
| `/api/nucleus-batch` | `nucleusBatch.js` | Batch progress, batch task-link, batch approval chains, batch status |

### 2.3 Workspace / Kanban (FR24) – shared

| Mount path | Route module | Purpose |
|------------|--------------|---------|
| `/api/boards` | `boards.js` | Kanban boards (per project) |
| `/api/cards` | `cards.js` | Task cards |
| `/api/lists` | `lists.js` | Lists (columns) |
| `/api/workspaces` | `workspaces.js` | Workspace CRUD, members; same Workspace model used by Nucleus |
| `/api/templates` | `templates.js` | Template management |

So by **API surface**: **7 route groups** for General Projects, **4** for Nucleus, **5** for Workspace/Kanban. The important point is that **two logical systems** (General Projects vs Nucleus) are implemented and both are exposed to the tenant UI under one “Projects” menu.

---

## 3. Data Model Relationship

- **Project** (`models/Project.js`): Single model. Has optional deprecated `workspaceId` (ref Workspace). Used by:
  - General projects routes (org-scoped queries).
  - Nucleus: deliverables belong to a project; Nucleus APIs require project to belong to workspace (`project.workspaceId === workspaceId`).
- **Workspace** (`models/Workspace.js`): Single model. Used by:
  - `/api/workspaces` (list/create/update workspaces).
  - Nucleus: all nucleus-pm/nucleus-analytics/nucleus-batch routes are scoped by `workspaceId`.
- **Deliverable** (`models/Deliverable.js`): `project_id` (ref Project), `workspaceId` (ref Workspace). Used only by Nucleus.
- **Task** (`models/Task.js`): `projectId`, `orgId`; used by General Projects tasks API; Nucleus can link tasks to deliverables.
- **Sprint** (`models/Sprint.js`): `projectId`; used only by General Projects (sprints API).
- **Board, List, Card**: Used by General Projects (Kanban) and by sprints (backlog).

So: **one Project model, one Workspace model**; General Projects and Nucleus both use Project; Nucleus adds Deliverable, Approval, ChangeRequest and is workspace-scoped.

---

## 4. Frontend: One “Projects” Menu, Two Systems Behind It

In `industryMenuBuilder.js`, under **Projects** there is a single menu with:

- **General Projects (FR14):** Overview, All Projects, Tasks, Gantt Chart, Milestones, Resources, Timesheets, **Sprints**
- **Nucleus (FR25):** **Deliverables** (“Nucleus Project OS – Deliverable Management”), **Change Requests** (“Nucleus Project OS – Scope Change Management”)

Routes in `TenantOrg.js`:

- `projects`, `projects/list`, `projects/tasks`, `projects/milestones`, `projects/resources`, `projects/timesheets`, `projects/sprints`, `projects/gantt` → General Projects.
- `projects/change-requests`, `projects/deliverables`, `projects/deliverables/:deliverableId` → Nucleus.
- `projects/:projectId` (board, list, gantt, team, calendar, timeline, activity, workload, table) → General Projects (and Kanban).

So the **user sees one “Projects” area** but it is backed by **two systems** (General Projects + Nucleus) and a shared workspace/Kanban layer, which matches the “two systems or one?” confusion in the finding.

---

## 5. Feature Comparison (FR14 vs FR25) – Aligned With Your Finding

| Feature | FR14 (General Projects) | FR25 (Nucleus) |
|--------|--------------------------|----------------|
| Task management | ✅ Yes (`/api/tasks`, Task model) | ✅ Yes (deliverables contain/link tasks) |
| Sprint management (Agile/Scrum) | ✅ Yes (`/api/sprints`, Sprint model) | ❌ Not in Nucleus |
| Gantt chart | ✅ Yes (frontend: ProjectGantt, ProjectGanttStandalone) | ✅ Yes (Nucleus deliverables Gantt) |
| Client portal | ❌ Not in FR14 (client portal removed elsewhere) | ✅ Yes (read-only deliverables) |
| Approval workflow | ❌ Not in FR14 | ✅ Yes (approval chains, approve/reject) |
| Change requests | ❌ Not in FR14 | ✅ Yes (change-requests dashboard, evaluate) |
| Time tracking | ✅ Yes (`/api/time-tracking`) | ✅ Used at project level |
| Resource allocation | ✅ Yes (resources, project members) | ⚠️ Partial (team/workspace level) |
| Project templates | ✅ Yes (ProjectTemplate, `/api/projects/templates`) | ✅ Yes (nucleus-templates: Web/Mobile/API) |
| Workspace-based organization | ⚠️ Optional project.workspaceId | ✅ Core (all Nucleus routes workspace-scoped) |

So: **Nucleus is the one with** Gantt, client portal, approval workflow, change requests. **FR14 is the one with** explicit sprint/backlog (Agile/Scrum). The finding’s feature table is accurate.

---

## 6. Validation of the Finding and Recommendation

**Finding:**  
“FR14 describes a general project management module. FR5/FR25 describes Nucleus. Both exist in the SRS. This creates confusion: are these two separate systems or one?”

**Validation:**  
- **Yes.** In code there are **two** project management systems (General Projects + Nucleus) and **one** shared workspace/Kanban layer.
- **Yes.** They overlap (same Project model, shared Workspace; both have tasks, templates, time tracking, Gantt in different forms).
- **Yes.** The only major FR14-only capability is **sprint/backlog (Agile/Scrum)**; Nucleus does not have first-class sprints.

**Recommendation in the finding:**  
- Treat **Nucleus as the Projects module** for Software House ERP.  
- Merge FR14 into FR25 (Nucleus).  
- Add **sprint/backlog management to Nucleus** instead of keeping a parallel system.  
- Remove FR14 as a separate requirement for Software House ERP.

**Implementation note:**  
Today, Nucleus already uses the same **Project** and **Workspace** models. Merging “FR14 into FR25” in practice would mean:

1. **Product/SRS:** Declare Nucleus the single Software House project management system; FR14 for Software House is “fulfilled by” Nucleus once Nucleus gains sprint/backlog.
2. **Code:** Either:
   - Add sprint/backlog (and any other missing FR14 capabilities) into the Nucleus/workspace flow and gradually deprecate the standalone `/api/sprints` and generic “Projects” task/milestone UX in favor of Nucleus, or
   - Keep existing routes for backward compatibility but document that for Software House, “Projects” = Nucleus and FR14 is not a second, separate product.

---

## 7. Summary Table

| Question | Answer |
|----------|--------|
| How many project management **modules** (SRS) are there? | **3** (FR14, FR24, FR25). |
| How many project management **systems** (implemented) are there? | **2** (General Projects + Nucleus); FR24 is a shared layer. |
| Are FR14 and FR25 two separate systems in code? | **Yes.** Different API groups, different UX entry points (sprints/tasks vs deliverables/change-requests), same Project/Workspace models. |
| Does the finding’s feature comparison match the code? | **Yes.** |
| Is the recommendation (Nucleus = Projects, merge FR14 into FR25, add sprints to Nucleus) feasible? | **Yes.** One unified system is feasible; adding sprint/backlog to Nucleus would close the main FR14 gap and allow retiring FR14 as a separate requirement for Software House. |

---

*Analysis based on: `TWS/backend/src/app.js`, `modules/business/routes/index.js`, `models/Project.js`, `Deliverable.js`, `Workspace.js`, `nucleusPM.js`, `projects.js`, `sprints.js`, `tasks.js`, `industryMenuBuilder.js`, `TenantOrg.js`, and `SRS_DOCUMENT_2026-02-17.md`.*
