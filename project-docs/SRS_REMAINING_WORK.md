# SRS – Remaining Work (per SRS_DOCUMENT_2026-02-17.md)

Summary of what **remains to be built** according to the Software Requirements Specification (v2.5, Feb 24, 2026). Source: §9.1 Module Availability, implementation notes, FR/UC text, and known gaps.

---

## 1. Not implemented (full feature)

| Item | SRS reference | Notes |
|------|----------------|--------|
| **Deals / CRM pipeline (FR29)** | §9.1, FR29 | Backend and frontend **not implemented**. Required: Deal entity (name, clientId, value, status, assignedSalesPersonId, expectedCloseDate, lostReason); statuses lead→qualified→proposal_sent→negotiation→won\|lost; access by role; **Won flow** (create Nucleus project, notify PM + Finance; FailedHandoff + retry on failure); **Lost flow** (lostReason required, archive read-only). API: `/api/tenant/:tenantSlug/deals`. Collection: `deals`. |

---

## 2. Backend done – frontend missing or partial

| Feature | Backend | Frontend gap |
|---------|---------|---------------|
| **Approvals (deliverable)** | ✅ | ❌ **No UI** – approval workflow UI for deliverables not built. |
| **Change Requests** | ✅ | ❌ **No UI** – change request list/detail/approve UI not built. |
| **Analytics UI (Nucleus)** | ✅ | ❌ **No UI** – workspace/project analytics UI not built. |
| **Nucleus PM** | ✅ Complete | ⚠️ **Partial** – project UI consumes APIs; dedicated Nucleus frontend (deliverables, approvals, change requests, analytics) not built. |
| **Deliverables** | ✅ | ⚠️ **Partial** – Gantt/deliverable UI incomplete. |

---

## 3. In progress – partial implementation

### 3.1 Document Hub (FR26)

- **Backend:** Done.
- **Frontend:** Library/editor **partial**.
- **Approval workflow:** Backend done; frontend **submit/approve UI partial**.
- **Still to align:** Document approval notifications (submit → notify Dept Head + Senior; approve/reject → notify creator); **review timeout** (7-day re-notify, 14-day escalate to Dept Head).

### 3.2 Department Management (FR27)

- **Backend:** Done (APIs, TenantDepartmentAccess, revoke, etc.).
- **Frontend:**  
  - Grant access ✅, view access list ✅, revoke ✅.  
  - **Set expiry date:** ⚠️ UI exists, **date picker partial**.  
  - **Suspend:** ❌ **Not built in frontend** (API has `POST /:id/suspend`).

### 3.3 Notifications (FR18)

- **Backend:** Done.
- **Email templates (per trigger matrix):**  
  - Task assigned ✅, Leave approved ✅.  
  - **Invoice overdue** ❌ not built.  
  - **Budget 80% warning** ❌ not built.  
  - **Deliverable rejected** ❌ not built.  
  - (Others in matrix to be verified.)
- **User preferences:**  
  - Email on/off ✅.  
  - **In-app on/off** ❌ not built.  
  - **Per event type** ❌ not built.  
- WhatsApp: Out of scope.

---

## 4. Mandatory / high‑priority (from FR/UC text)

### 4.1 HR offboarding (FR12)

**Mandatory process:** (1) HR initiates offboarding; (2) Checklist: reassign open tasks (required before revoke), transfer document ownership, equipment return (checkbox), last working date; (3) On last working date: TenantUser inactive, sessions invalidated, TenantDepartmentAccess revoked; (4) Emergency offboarding: immediate revoke. **Task reassignment:** per task → project’s PM (else Dept Head, else owner); tag “Needs Handover Review.” Team Lead vacancy: flag department, notify Dept Head + CEO; reassign tasks to PM. **Audit:** All steps in TenantAuditLog. **Data retention:** Time/project history retained; PII archive per GDPR (configurable days).  
**Remaining:** Confirm full implementation of checklist UI, task reassignment logic, emergency offboard, and audit logging end‑to‑end.

### 4.2 Mobile restrictions (NFR3)

- Payroll, full financial reports, tenant audit log, and **bulk export** are **desktop-only**.
- **Required behaviour:** Mobile browser must **REDIRECT** (not show data). Backend: if `X-Client-Platform` (or equivalent) is `'mobile'` and route is restricted → **403** with body `{ message: "Available on desktop only", code: "DESKTOP_ONLY" }`. Frontend: show “Desktop only” page. Bulk export from mobile: **blocked (403)**.  
**Remaining:** Implement platform detection, 403 on restricted routes, and “Desktop only” redirect page.

### 4.3 Nucleus tenant config (FR25)

- **Max resubmission attempts** (deliverables/change requests): default 3, configurable per tenant (1–10). When max reached: lock, status “Escalated”, notify PM + Dept Head; PM can override or cancel.  
**Remaining:** Settings → Project → “Maximum resubmission attempts” (default 3) and enforcement in approval/workflow logic.

### 4.4 Workspace guest elevation (FR24)

- **API:** PATCH/PUT workspace member role **must reject** elevating a user with `TenantUser.role = 'client'` to member, admin, or owner. Response: **403** with message “Client users cannot be given internal workspace access.” Check at **API** level, not only UI.  
**Remaining:** Verify and implement this check on the backend.

---

## 5. Onboarding (FR2) – known gaps

- **Onboarding steps (v2.1):** (1) Email verified, (2) Organization created, (3) Profile completed (name, phone, timezone), (4) First department created or confirmed, (5) First team member invited, (6) First project created, (7) Explore Nucleus PM (first workspace opened). Completion: all steps done **or** 30 days passed (auto-dismiss).  
- **Display:** Progress bar in dashboard, **dismissible after Step 2**.  
**Remaining:** Implement progress bar, step completion logic, and 30‑day auto-dismiss.

---

## 6. Future / known gaps (lower priority)

- **FR1 – ERP category:** Business and Warehouse “infrastructure exists but not fully implemented” (known gap). Only Software House is required for current scope.
- **FR2 – Enterprise provisioning:** “Enterprise white-glove provisioning path” (Supra Admin creates tenant with forced email verification) – future work.
- **FR22 – Google Calendar:** Optional / Phase 4; not core for Software House.
- **Audit archive (FR21):** Archive to cold storage, retention, restore within 7 days – “recommended for compliance”; confirm implementation vs documentation.
- **Multi-language (NFR3):** Deferred indefinitely (English only).
- **WCAG 2.1 AA (NFR3):** Required only if selling to government or EU enterprise.

---

## 7. Quick reference – §9.1 status

| Feature              | Backend | Frontend   | Overall      |
|----------------------|---------|------------|-------------|
| Deals (FR29)         | ❌      | ❌         | Not implemented |
| Approvals            | ✅      | ❌         | Backend only |
| Change Requests      | ✅      | ❌         | Backend only |
| Analytics UI         | ✅      | ❌         | Backend only |
| Nucleus PM           | ✅      | ⚠️ Partial | In progress  |
| Deliverables         | ✅      | ⚠️         | In progress  |
| Document Hub (FR26)  | ✅      | ⚠️         | In progress  |
| Department Mgmt (FR27)| ✅      | ⚠️         | In progress  |
| Notifications        | ✅      | ⚠️         | In progress  |

---

**Document source:** SRS_DOCUMENT_2026-02-17.md (v2.5, Feb 24, 2026).  
**Last updated:** Generated from SRS; update this file when implementation status changes.
