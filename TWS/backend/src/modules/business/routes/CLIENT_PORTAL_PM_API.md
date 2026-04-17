# Client Portal PM API Contract

These endpoints are client-role only and enforce org + client-project scoping.

## Project Visibility

- `GET /api/client-portal/projects`
  - Returns assigned projects with `pendingApprovals`.
  - Includes only client-safe fields.
- `GET /api/client-portal/projects/:projectId`
  - Returns single project detail for assigned project only.
  - Denies access if portal is disabled for the project.
- `GET /api/client-portal/projects/:projectId/deliverables`
  - Returns client-visible deliverables for assigned project only.

## Deliverable Actions

- `POST /api/client-portal/cards/:cardId/approve`
  - Body: `{ approved: boolean, comment?: string }`
  - Requires:
    - card belongs to client-owned project in same org
    - project portal enabled
    - project allows client approvals
    - card is client visible
- `POST /api/client-portal/cards/:cardId/comments`
  - Body: `{ text: string }`
  - Requires:
    - same scoping checks as approve
    - project allows client comments

## Timesheet Visibility

- `GET /api/client-portal/projects/:projectId/timesheets/summary?range=7d|30d|90d`
  - Read-only aggregate totals:
    - `totals.totalHours`
    - `totals.billableHours`
    - `totals.nonBillableHours`
  - Groupings:
    - `byMember[]`
    - `byDate[]`

## Security Rules

- All routes: `authenticateToken` + `requireRole(['client'])`.
- Client identity is resolved by `(userId, orgId) -> ProjectClient`.
- Access is denied when:
  - no org context
  - no active client mapping
  - project/card is outside client ownership
  - portal policy disables access/action
