/**
 * TWS ERP — Per-Module Tutorial Steps
 *
 * Every step can spotlight a live DOM element via `target` (CSS selector pointing
 * to a data-tutorial attribute we added to the relevant component).
 *
 * When `target` is null OR the element is not yet in the DOM (user is on a
 * different sub-page), the step gracefully renders as a centred modal instead.
 *
 * data-tutorial attributes added across the codebase:
 *   ProjectsOverview : proj-header, proj-new-btn, proj-stats, proj-health
 *   ProjectTasks     : proj-task-header, proj-create-task, proj-view-toggle, proj-board
 *   SprintManagement : proj-sprint-header, proj-sprint-btn, proj-sprint-card
 *   HROverview       : hr-header, hr-add-btn, hr-metrics, hr-attendance
 *   EmployeeList(sw) : hr-emp-header, hr-add-btn, hr-stats, hr-search, hr-table
 *   HRLeaveRequests  : hr-leave-stats, hr-leave-table
 *   FinanceOverview  : fin-hero, fin-metrics, fin-modules
 *   DepartmentsList  : dept-header, dept-create-btn, dept-search, dept-table
 *   UserList         : users-header, users-add-btn, users-filters, users-table
 *   MyWork           : mw-header, mw-add-btn, mw-stats, mw-filterbar, mw-tasks
 *   AnalyticsOverview: ana-header, ana-reports-btn, ana-kpi, ana-charts
 *   OdooTopBar       : home-btn, search-btn, quick-add, user-menu, top-bar
 *   Clients          : cli-header, cli-add-btn, cli-filters, cli-table
 *   DocumentsHub     : doc-header, doc-create-btn, doc-list
 *   RolesList        : role-header, role-create-btn, role-table
 *   PermissionsList  : perm-header, perm-table
 *   TimeTracking     : tt-header, tt-summary, tt-log-btn
 *   EmployeePortal   : ep-header, ep-sidebar
 *   SettingsOverview : set-header, set-tabs
 */

// ── Projects ──────────────────────────────────────────────────────────────────
export const PROJECTS_STEPS = [
  {
    key: 'proj-welcome',
    title: 'Projects — Your Command Centre 📋',
    body: 'Manage every project from idea to delivery. Create projects, break them into sprints, assign tasks, and track progress in real time. Let\'s explore each part.',
    target: null, position: 'center', illustration: '📋',
  },
  {
    key: 'proj-stats',
    title: 'Project KPIs at a Glance',
    body: 'These four stat cards show your total projects, active count, completion rate, and overall budget utilisation — updating live as your team works.',
    target: '[data-tutorial="proj-stats"]', position: 'bottom',
  },
  {
    key: 'proj-health',
    title: 'Project Health Overview',
    body: 'This section breaks projects into On Track, At Risk, and Delayed. Any project in red needs your attention today. Click a card to filter the list below.',
    target: '[data-tutorial="proj-health"]', position: 'top',
  },
  {
    key: 'proj-new-btn',
    title: 'Create a New Project',
    body: 'Click "+ New Project" to start a project. Fill in the name, assign a client and department, set a budget and deadline, and invite team members.',
    target: '[data-tutorial="proj-new-btn"]', position: 'bottom-left',
  },
  {
    key: 'proj-task-header',
    title: 'Tasks Page',
    body: 'The Tasks page is where day-to-day work happens. Every task belongs to a project and appears as a card on the Kanban board or in the list view.',
    target: '[data-tutorial="proj-task-header"]', position: 'bottom',
  },
  {
    key: 'proj-view-toggle',
    title: 'Switch Views: Kanban ↔ List',
    body: 'Toggle between the Kanban board (drag-and-drop columns) and List view (sortable table). Both show the same tasks — choose what works best for your workflow.',
    target: '[data-tutorial="proj-view-toggle"]', position: 'bottom',
  },
  {
    key: 'proj-board',
    title: 'Kanban Board',
    body: 'Each column represents a status: To Do → In Progress → In Review → Done. Drag a card to a new column to instantly update its status. Click any card to see full details, comments, and attachments.',
    target: '[data-tutorial="proj-board"]', position: 'top',
  },
  {
    key: 'proj-create-task',
    title: 'Create a Task',
    body: 'Click "+ Create Task" to add a task. Set its title, priority (Low / Medium / High / Critical), assignee, due date, and sprint. Leave defaults and edit inline later.',
    target: '[data-tutorial="proj-create-task"]', position: 'bottom-left',
  },
  {
    key: 'proj-sprint-btn',
    title: 'Sprints — Agile Delivery',
    body: 'Sprints are time-boxed work cycles (e.g. 2 weeks). Click "+ Create Sprint" to define one. Start it to lock scope, then close it when done — velocity and burndown are tracked automatically.',
    target: '[data-tutorial="proj-sprint-btn"]', position: 'bottom-left',
  },
  {
    key: 'proj-sprint-card',
    title: 'Active Sprint Dashboard',
    body: 'This card shows your currently running sprint — velocity, completed story points, progress bar, and end date countdown. Use it to keep the team on track during a sprint.',
    target: '[data-tutorial="proj-sprint-card"]', position: 'bottom',
  },
  {
    key: 'proj-cr',
    title: 'Change Requests & Approvals',
    body: 'When scope changes, raise a Change Request from the project menu. It enters an Approval queue where stakeholders can approve or reject with comments, creating a full audit trail.',
    target: null, position: 'center', illustration: '🔄',
  },
];

// ── HR ────────────────────────────────────────────────────────────────────────
export const HR_STEPS = [
  {
    key: 'hr-welcome',
    title: 'HR — Your People Module 👥',
    body: 'Manage everything about your team in one place: headcount, attendance, leaves, payroll, and performance. This dashboard is your HR command centre.',
    target: null, position: 'center', illustration: '👥',
  },
  {
    key: 'hr-metrics',
    title: 'Workforce KPIs',
    body: 'These four cards give you instant numbers: total employees, department count, today\'s attendance rate, and monthly payroll total. All update in real time.',
    target: '[data-tutorial="hr-metrics"]', position: 'bottom',
  },
  {
    key: 'hr-add-btn',
    title: 'Add an Employee',
    body: 'Click "+ Add Employee" to onboard a new team member. Enter their name, email (becomes their login), role, department, job title, contract type, and salary. They\'ll receive an invite automatically.',
    target: '[data-tutorial="hr-add-btn"]', position: 'bottom-left',
  },
  {
    key: 'hr-attendance',
    title: 'Attendance Overview',
    body: 'This section shows this month\'s attendance rate as a progress bar, and breaks it down by status (Present, Absent, Late, Remote). Drill into Attendance for daily logs and corrections.',
    target: '[data-tutorial="hr-attendance"]', position: 'top',
  },
  {
    key: 'hr-stats',
    title: 'Employee Stats',
    body: 'These cards show your total headcount, active employees, and those currently on leave. Click any card to filter the employee list below by that status.',
    target: '[data-tutorial="hr-stats"]', position: 'bottom',
  },
  {
    key: 'hr-search',
    title: 'Search Your Team',
    body: 'Type a name, role, department, or email to instantly filter the list. Handy for finding someone quickly in larger organisations.',
    target: '[data-tutorial="hr-search"]', position: 'bottom',
  },
  {
    key: 'hr-table',
    title: 'Employee Directory',
    body: 'Every team member is listed here with their role, department, email, and status badge. Click any row to open their full profile — edit contract, view documents, check attendance history.',
    target: '[data-tutorial="hr-table"]', position: 'top',
  },
  {
    key: 'hr-leave-stats',
    title: 'Leave Request Stats',
    body: 'These counters show pending, approved, and rejected requests at a glance. Any pending number in amber needs your review — click to see the list.',
    target: '[data-tutorial="hr-leave-stats"]', position: 'bottom',
  },
  {
    key: 'hr-leave-table',
    title: 'Approve or Reject Leaves',
    body: 'Each leave card shows the employee, dates, duration, and reason. Hit "Approve" (green) or "Reject" (red) with one click. The employee is notified instantly and their leave balance updates automatically.',
    target: '[data-tutorial="hr-leave-table"]', position: 'top',
  },
];

// ── Finance ───────────────────────────────────────────────────────────────────
export const FINANCE_STEPS = [
  {
    key: 'fin-welcome',
    title: 'Finance — Your Financial Command Centre 💰',
    body: 'Track every rupee in and out. Finance connects with Projects and HR to give you a full picture of revenue, costs, and profit — in real time.',
    target: null, position: 'center', illustration: '💰',
  },
  {
    key: 'fin-hero',
    title: 'Finance Ecosystem',
    body: 'This header area gives you the Finance Ecosystem intro and the period selector. Use the period buttons (Week / Month / Quarter / Year) to change the time range for all metrics below.',
    target: '[data-tutorial="fin-hero"]', position: 'bottom',
  },
  {
    key: 'fin-metrics',
    title: 'Key Financial KPIs',
    body: 'These four cards show Total Revenue, Net Profit, Gross Margin %, and Cash on Hand — all for the selected period. Green trending numbers are good. Red needs attention.',
    target: '[data-tutorial="fin-metrics"]', position: 'bottom',
  },
  {
    key: 'fin-modules',
    title: 'Finance Sub-Modules',
    body: 'Click any module card to jump directly into it: Invoices to create/track bills, Accounts Receivable for money owed to you, Accounts Payable for your bills, Budgeting to set limits, and Reports for P&L exports.',
    target: '[data-tutorial="fin-modules"]', position: 'top',
  },
  {
    key: 'fin-invoices',
    title: 'Invoices & Billing',
    body: 'Create professional invoices, attach line items (services, milestones), set due dates, and email them to clients. Track paid, unpaid, and overdue status all in one list.',
    target: null, position: 'center', illustration: '🧾',
  },
  {
    key: 'fin-reports',
    title: 'Financial Reports',
    body: 'Generate Profit & Loss, Cash Flow, Balance Sheet, and Ageing reports. Filter by date range or department, then export to PDF or Excel for your accountant.',
    target: null, position: 'center', illustration: '📋',
  },
];

// ── Departments ───────────────────────────────────────────────────────────────
export const DEPARTMENTS_STEPS = [
  {
    key: 'dept-welcome',
    title: 'Departments — Your Org Structure 🏢',
    body: 'Departments are the foundation of the ERP. Every employee, project, task, and document belongs to a department. Set these up first — before adding employees or projects.',
    target: null, position: 'center', illustration: '🏢',
  },
  {
    key: 'dept-header',
    title: 'Departments Overview',
    body: 'This is the Departments list page. From here you can view all departments, see member counts, and manage access settings for each one.',
    target: '[data-tutorial="dept-header"]', position: 'bottom',
  },
  {
    key: 'dept-create-btn',
    title: 'Create a Department',
    body: 'Click "+ Create Department". Give it a Name (e.g. Engineering), a Code in uppercase letters (e.g. ENG or DEV-OPS), and an optional description. The code appears in reports and task filters.',
    target: '[data-tutorial="dept-create-btn"]', position: 'bottom-left',
  },
  {
    key: 'dept-search',
    title: 'Search Departments',
    body: 'Type to search by department name. Once you have multiple departments, this helps you navigate quickly — especially in larger orgs with 10+ departments.',
    target: '[data-tutorial="dept-search"]', position: 'bottom',
  },
  {
    key: 'dept-table',
    title: 'Department Table',
    body: 'Each row shows the department name, code, description, and actions. Click "Dashboard" to see department-level KPIs — active projects, tasks, and team workload.',
    target: '[data-tutorial="dept-table"]', position: 'top',
  },
  {
    key: 'dept-access',
    title: 'Department Module Access',
    body: 'Go to "Dept Access" to control which ERP modules each department can see. Finance dept sees Finance but not HR; Engineering sees Projects but not Payroll — you decide.',
    target: null, position: 'center', illustration: '🔐',
  },
];

// ── Users ─────────────────────────────────────────────────────────────────────
export const USERS_STEPS = [
  {
    key: 'users-welcome',
    title: 'Users — Your Team Directory 🧑‍💻',
    body: 'Users lists everyone with a login in your organisation — employees, managers, and admins. Manage their roles, departments, and access from here.',
    target: null, position: 'center', illustration: '🧑‍💻',
  },
  {
    key: 'users-header',
    title: 'User Management Page',
    body: 'This page is your team directory. You can see all users, their roles, and their current status (Active, Invited, or Inactive).',
    target: '[data-tutorial="users-header"]', position: 'bottom',
  },
  {
    key: 'users-add-btn',
    title: 'Invite a User',
    body: 'Click "+ Add User". Enter their email, pick a role (Admin, Employee, Client), assign a department, and save. They\'ll receive an email to set their password and log in.',
    target: '[data-tutorial="users-add-btn"]', position: 'bottom-left',
  },
  {
    key: 'users-filters',
    title: 'Search & Filter',
    body: 'Use the search box to find users by name. Filter by role (Admin / Employee / Client) or by status (Active / Pending / Inactive) to narrow the list.',
    target: '[data-tutorial="users-filters"]', position: 'bottom',
  },
  {
    key: 'users-table',
    title: 'User Directory Table',
    body: 'Each row shows name, email, role, department, and status. Click any user\'s name to open their profile — edit their role, department, or deactivate their access.',
    target: '[data-tutorial="users-table"]', position: 'top',
  },
];

// ── My Work ───────────────────────────────────────────────────────────────────
export const MY_WORK_STEPS = [
  {
    key: 'mw-welcome',
    title: 'My Work — Your Personal Task Hub ✅',
    body: 'My Work shows only tasks assigned to YOU — across all projects. Think of it as your daily to-do list inside the ERP. No noise from other people\'s work.',
    target: null, position: 'center', illustration: '✅',
  },
  {
    key: 'mw-header',
    title: 'My Work Header',
    body: 'This is your My Work page. The title shows your name, and the Refresh button re-fetches your latest tasks. Use this if you\'ve just been assigned something and want it to appear immediately.',
    target: '[data-tutorial="mw-header"]', position: 'bottom',
  },
  {
    key: 'mw-stats',
    title: 'Your Task Stats',
    body: 'At a glance: total tasks assigned to you, how many are In Progress, how many are Completed this period, and the Overdue count. A red Overdue number means tasks past their deadline.',
    target: '[data-tutorial="mw-stats"]', position: 'bottom',
  },
  {
    key: 'mw-tasks',
    title: 'Your Task List',
    body: 'All your assigned tasks appear here. The list is divided into your task panel (left) and a sidebar with approvals and activity (right). The task panel is where you spend most of your time.',
    target: '[data-tutorial="mw-tasks"]', position: 'top',
  },
  {
    key: 'mw-filterbar',
    title: 'Filter & Search Tasks',
    body: 'Search by task title, filter by priority (High / Medium / Low), or switch between view modes — flat list, grouped by status, or grouped by project. Use what makes you most productive.',
    target: '[data-tutorial="mw-filterbar"]', position: 'top',
  },
  {
    key: 'mw-add-btn',
    title: 'Add a Personal Task',
    body: 'Click "+ Add Task" to create a task for yourself. Pick a project, set a due date and priority, and it appears in My Work instantly. Great for personal reminders linked to a project.',
    target: '[data-tutorial="mw-add-btn"]', position: 'bottom-left',
  },
];

// ── Analytics ─────────────────────────────────────────────────────────────────
export const ANALYTICS_STEPS = [
  {
    key: 'ana-welcome',
    title: 'Analytics — Org-Wide Insights 📊',
    body: 'Analytics pulls data from Projects, HR, and Finance into visual dashboards. Make decisions based on facts, not guesswork — no spreadsheets needed.',
    target: null, position: 'center', illustration: '📊',
  },
  {
    key: 'ana-header',
    title: 'Analytics Overview',
    body: 'This is the Analytics Overview page — your bird\'s-eye view of what\'s happening across the whole organisation. Scroll down for charts broken out by team and project.',
    target: '[data-tutorial="ana-header"]', position: 'bottom',
  },
  {
    key: 'ana-kpi',
    title: 'Organisation KPIs',
    body: 'These four cards show total Users, Projects, Tasks, and Financial total at a glance. Useful for a quick daily health check without digging into sub-modules.',
    target: '[data-tutorial="ana-kpi"]', position: 'bottom',
  },
  {
    key: 'ana-charts',
    title: 'Visual Charts',
    body: 'These charts break down your data visually — users by role, projects by status, task completion rates over time. Hover any bar or slice to see exact numbers.',
    target: '[data-tutorial="ana-charts"]', position: 'top',
  },
  {
    key: 'ana-reports-btn',
    title: 'Detailed Reports',
    body: 'Click "View reports" to access table-format reports filterable by date range, department, or project. Every report can be exported to CSV or PDF for sharing with stakeholders.',
    target: '[data-tutorial="ana-reports-btn"]', position: 'bottom-left',
  },
];

// ── Clients ───────────────────────────────────────────────────────────────────
export const CLIENTS_STEPS = [
  {
    key: 'cli-welcome',
    title: 'Clients — Your CRM 🤝',
    body: 'Manage your client portfolio end-to-end: contact info, contracts, communication logs, and invoices — all linked together in one place.',
    target: null, position: 'center', illustration: '🤝',
  },
  {
    key: 'cli-header',
    title: 'Client Management Hub',
    body: 'This is your Client Management page — a premium CRM overview. The header shows a summary of your portfolio at a glance. Scroll down to see individual client metrics.',
    target: '[data-tutorial="cli-header"]', position: 'bottom',
  },
  {
    key: 'cli-add-btn',
    title: 'Add a New Client',
    body: 'Click "+ Add New Client" to open the client form. Fill in company name, contact details, billing currency, and tags. Once saved, the client appears in your grid immediately.',
    target: '[data-tutorial="cli-add-btn"]', position: 'bottom-left',
  },
  {
    key: 'cli-filters',
    title: 'Search & Filter Clients',
    body: 'Use the search bar to find clients by name, email, company, or tag. The Status dropdown filters between Active, Prospect, and Inactive. Combine both for precise results.',
    target: '[data-tutorial="cli-filters"]', position: 'bottom',
  },
  {
    key: 'cli-table',
    title: 'Client Cards Grid',
    body: 'Each client card shows company name, status badge, contact email, phone, and financial summary. Click the eye icon to view their full profile, the pencil to edit, or trash to delete.',
    target: '[data-tutorial="cli-table"]', position: 'top',
  },
  {
    key: 'cli-billing',
    title: 'Client Billing',
    body: 'Generate and send invoices directly from the client\'s billing tab. Approved project milestones and change requests can be pulled in as line items automatically.',
    target: null, position: 'center', illustration: '🧾',
  },
];

// ── Documents ─────────────────────────────────────────────────────────────────
export const DOCUMENTS_STEPS = [
  {
    key: 'doc-welcome',
    title: 'Documents — Your Knowledge Hub 📁',
    body: 'Store, version-control, and approve all org documents in one place. Policy manuals, SOPs, contracts, reports — searchable and role-gated.',
    target: null, position: 'center', illustration: '📁',
  },
  {
    key: 'doc-header',
    title: 'Document Hub Header',
    body: 'This is the Documents header. From here you can upload existing files (PDF, DOCX, images) or create a brand-new document using a template. Your document count is always visible.',
    target: '[data-tutorial="doc-header"]', position: 'bottom',
  },
  {
    key: 'doc-create-btn',
    title: 'Create a New Document',
    body: 'Click "+ New document" to open the template picker — choose Blank, Meeting Notes, Contract, SOP, or Policy. This opens a rich-text editor where you can write, format, and attach files before saving.',
    target: '[data-tutorial="doc-create-btn"]', position: 'bottom-left',
  },
  {
    key: 'doc-list',
    title: 'Document List',
    body: 'Documents appear in a table view with Title, Type (Created / Uploaded), Status badge (Draft / In Review / Approved / Archived), Tags, and Last Updated. Click any row to open the document.',
    target: '[data-tutorial="doc-list"]', position: 'top',
  },
  {
    key: 'doc-approval',
    title: 'Approval Workflow',
    body: 'When a document is ready, submit it for approval. Designated approvers are notified, can comment, and approve or reject. Status updates automatically and the original author is notified.',
    target: null, position: 'center', illustration: '✅',
  },
];

// ── Roles ─────────────────────────────────────────────────────────────────────
export const ROLES_STEPS = [
  {
    key: 'role-welcome',
    title: 'Roles — Define What Each Person Can Do 🎭',
    body: 'Roles are job-level definitions (e.g. Developer, Project Manager, Finance Lead) that group permissions. Assign a role to a user to instantly grant the right access.',
    target: null, position: 'center', illustration: '🎭',
  },
  {
    key: 'role-header',
    title: 'Roles Overview',
    body: 'This page lists all custom roles in your organisation. Every role has a name, a unique slug used in API calls, a description, and a set of permissions. System roles like Admin are locked.',
    target: '[data-tutorial="role-header"]', position: 'bottom',
  },
  {
    key: 'role-create-btn',
    title: 'Create a Role',
    body: 'Click "+ Create Role". Give it a name, description, and select which modules and actions (read / write / delete) it can access. Save it — then assign to users from their profile page.',
    target: '[data-tutorial="role-create-btn"]', position: 'bottom-left',
  },
  {
    key: 'role-table',
    title: 'Roles Table',
    body: 'Each row shows the role name, its slug identifier, description, and permissions count. Click the pencil icon to edit permissions or the trash icon to delete a role (users holding it revert to Employee).',
    target: '[data-tutorial="role-table"]', position: 'top',
  },
  {
    key: 'role-assign',
    title: 'Assigning Roles',
    body: 'Roles are assigned from the User\'s profile page: go to Users → pick a user → edit their Role field. The change takes effect immediately on their next page load.',
    target: null, position: 'center', illustration: '🔗',
  },
];

// ── Permissions ───────────────────────────────────────────────────────────────
export const PERMISSIONS_STEPS = [
  {
    key: 'perm-welcome',
    title: 'Permissions — Fine-Grained Access Control 🔐',
    body: 'Permissions let you control exactly who can read, write, or delete data in each module — beyond what Roles alone provide. Essential for compliance and data security.',
    target: null, position: 'center', illustration: '🔐',
  },
  {
    key: 'perm-header',
    title: 'Permissions Overview',
    body: 'This page lists every named permission in your ERP. Each permission has a code (e.g. hr:read, finance:write), a description, and a group label. These are the building blocks assigned to Roles.',
    target: '[data-tutorial="perm-header"]', position: 'bottom',
  },
  {
    key: 'perm-table',
    title: 'Permissions Table',
    body: 'Each row shows the permission code, its human-readable description, the module group it belongs to, and when it was created. Click the pencil to edit the description or trash to remove it.',
    target: '[data-tutorial="perm-table"]', position: 'top',
  },
  {
    key: 'perm-dept',
    title: 'Department-Level Permissions',
    body: 'In Departments → Access, set which modules each department can see. A user only sees modules their department is allowed AND their role grants access to.',
    target: null, position: 'center', illustration: '🏢',
  },
  {
    key: 'perm-effective',
    title: 'Effective Permissions',
    body: 'A user\'s actual access = their Role permissions ∩ their Department access. Use the Permissions Checker (Users page) to verify exactly what a specific user can see before giving them access.',
    target: null, position: 'center', illustration: '✅',
  },
];

// ── Time Tracking ─────────────────────────────────────────────────────────────
export const TIME_TRACKING_STEPS = [
  {
    key: 'tt-welcome',
    title: 'Time Tracking — Log Your Hours ⏱️',
    body: 'Track time spent on projects and tasks. Logged hours feed into project cost reports, client invoices, and payroll — all automatically.',
    target: null, position: 'center', illustration: '⏱️',
  },
  {
    key: 'tt-header',
    title: 'Time Tracking Page',
    body: 'This is your Time Tracking page. Use it to start a live timer for any project, log past hours, and review today\'s entries. Hours here sync to Finance for billing and project cost tracking.',
    target: '[data-tutorial="tt-header"]', position: 'bottom',
  },
  {
    key: 'tt-summary',
    title: 'Today\'s Summary',
    body: 'These three cards show Total Hours logged today, Billable Hours (what you can charge clients), and how many Active Projects you\'ve logged time against. All update in real time.',
    target: '[data-tutorial="tt-summary"]', position: 'bottom',
  },
  {
    key: 'tt-log-btn',
    title: 'Start Tracking Time',
    body: 'Select a project from the dropdown, type the task name, add an optional description, and click "Start Tracking". A live timer begins — click "Stop Tracking" when you\'re done. The duration is logged automatically.',
    target: '[data-tutorial="tt-log-btn"]', position: 'top',
  },
  {
    key: 'tt-reports',
    title: 'Time Reports',
    body: 'Today\'s entries appear in the table below. Each row shows the project, task, time range, duration, and billable flag. Reports break hours down by person and project — filterable for client billing exports.',
    target: null, position: 'center', illustration: '📊',
  },
];

// ── Employee Portal ───────────────────────────────────────────────────────────
export const EMPLOYEE_PORTAL_STEPS = [
  {
    key: 'ep-welcome',
    title: 'Your Employee Portal 🧑‍💼',
    body: 'This is your personal space in the ERP. Manage your attendance, apply for leave, view payslips, and track your performance — all without contacting HR.',
    target: null, position: 'center', illustration: '🧑‍💼',
  },
  {
    key: 'ep-header',
    title: 'Portal Header',
    body: 'The portal header shows your name and role badge. This is your dedicated employee view — admins and managers use the main HR section instead. Everything here is personalised to you.',
    target: '[data-tutorial="ep-header"]', position: 'bottom',
  },
  {
    key: 'ep-sidebar',
    title: 'Navigation Sidebar',
    body: 'The sidebar gives you quick access to all portal sections: Dashboard, My Workspaces, Profile, Attendance, Leave Requests, Performance, Payroll, and Documents. Each section is role-filtered — you only see what applies to you.',
    target: '[data-tutorial="ep-sidebar"]', position: 'bottom-right',
  },
  {
    key: 'ep-attendance',
    title: 'Attendance',
    body: 'Click Attendance in the sidebar to see your monthly attendance record — days present, absent, late, and remote. Your HR manager can see these logs and make corrections if needed.',
    target: null, position: 'center', illustration: '📍',
  },
  {
    key: 'ep-leave',
    title: 'Leave Requests',
    body: 'Apply for annual, sick, or emergency leave by selecting dates and a reason. Your manager is notified instantly. Track the status (Pending / Approved / Rejected) from the Leave section.',
    target: null, position: 'center', illustration: '🏖️',
  },
  {
    key: 'ep-payslip',
    title: 'Payslip & Documents',
    body: 'View and download monthly payslips from the Payroll tab. The Documents tab holds your contract, offer letter, and any HR documents shared with you by management.',
    target: null, position: 'center', illustration: '💵',
  },
];

// ── Development ───────────────────────────────────────────────────────────────
export const DEVELOPMENT_STEPS = [
  {
    key: 'dev-welcome',
    title: 'Development — Your Dev Workflow 💻',
    body: 'The Development module is the technical hub for software teams: tech stacks, dev roles, and sprint-linked dev tasks — all feeding into project metrics.',
    target: null, position: 'center', illustration: '💻',
  },
  {
    key: 'dev-stack',
    title: 'Tech Stack & Roles',
    body: 'Define the technologies used (React, Node, Python…) and assign team members to tech-stack roles. This feeds into resource planning and auto-generated CVs.',
    target: null, position: 'center', illustration: '⚙️',
  },
  {
    key: 'dev-tasks',
    title: 'Dev Tasks & Sprint Integration',
    body: 'Development tasks appear here with their sprint, priority, and branch info. Status updates sync directly to the Project Kanban board — no double entry.',
    target: null, position: 'center', illustration: '🔗',
  },
  {
    key: 'dev-metrics',
    title: 'Dev Velocity Metrics',
    body: 'Track sprint velocity (story points), PR cycle time, bug rate, and code-review turnaround. These feed into the Projects → Analytics dashboard for manager-level visibility.',
    target: null, position: 'center', illustration: '📈',
  },
];

// ── Settings ──────────────────────────────────────────────────────────────────
export const SETTINGS_STEPS = [
  {
    key: 'set-welcome',
    title: 'Settings — Configure Your ERP ⚙️',
    body: 'Settings is where admins personalise the ERP: branding, timezone, notifications, security policies, and subscription management.',
    target: null, position: 'center', illustration: '⚙️',
  },
  {
    key: 'set-header',
    title: 'Settings Overview',
    body: 'This is the Settings page. Only admins and owners can access most settings. Changes here affect the entire organisation — all users will see the updated configuration immediately.',
    target: '[data-tutorial="set-header"]', position: 'bottom',
  },
  {
    key: 'set-tabs',
    title: 'Settings Tabs',
    body: 'Three tabs organise all settings: General (org name, timezone, currency, date format), Notifications (email & in-app preferences per event type), and Security (password policy, session timeout, login alerts).',
    target: '[data-tutorial="set-tabs"]', position: 'bottom',
  },
  {
    key: 'set-notifs',
    title: 'Notification Preferences',
    body: 'In the Notifications tab, toggle which events trigger email or in-app notifications — task assigned, leave approved, invoice overdue, and more. Each event type is individually configurable.',
    target: null, position: 'center', illustration: '🔔',
  },
  {
    key: 'set-billing',
    title: 'Subscription & Billing',
    body: 'View your current plan, usage metrics (users, storage), and billing history from the Supra Admin panel. Upgrade your plan or add feature add-ons at any time.',
    target: null, position: 'center', illustration: '💳',
  },
];

// ── Audit ─────────────────────────────────────────────────────────────────────
export const AUDIT_STEPS = [
  {
    key: 'aud-welcome',
    title: 'Audit Logs — Full Transparency 🔍',
    body: 'Every action in the ERP is recorded: who did what, when, and from which IP. Audit logs are tamper-proof and essential for security, compliance, and dispute resolution.',
    target: null, position: 'center', illustration: '🔍',
  },
  {
    key: 'aud-timeline',
    title: 'Activity Timeline',
    body: 'The timeline shows recent system events in chronological order. Each entry shows the user, action type (Created / Updated / Deleted), affected record, and timestamp.',
    target: null, position: 'center', illustration: '📜',
  },
  {
    key: 'aud-filters',
    title: 'Filter & Search Logs',
    body: 'Filter by user, action type, module, or date range. For example: show all "Delete" actions in Finance last month — useful for investigating incidents or suspicious activity.',
    target: null, position: 'center', illustration: '🔎',
  },
  {
    key: 'aud-export',
    title: 'Export for Compliance',
    body: 'Export filtered logs as CSV or PDF. Include these in security audits, GDPR/compliance reports, or share with external auditors. All metadata is preserved in the export.',
    target: null, position: 'center', illustration: '📤',
  },
];

// ── Operations ────────────────────────────────────────────────────────────────
export const OPERATIONS_STEPS = [
  {
    key: 'ops-welcome',
    title: 'Operations — Business Continuity 🏭',
    body: 'Operations tracks your day-to-day business workflows: processes, SLAs, incidents, and operational KPIs — keeping everything running smoothly.',
    target: null, position: 'center', illustration: '🏭',
  },
  {
    key: 'ops-processes',
    title: 'Process Management',
    body: 'Document recurring business processes (e.g. client onboarding, invoice approval). Assign owners and SLA targets. Operations alerts you when an SLA is at risk.',
    target: null, position: 'center', illustration: '🔄',
  },
  {
    key: 'ops-kpis',
    title: 'Operational KPIs',
    body: 'Track key metrics: response time, resolution rate, SLA compliance, and team utilisation. Charts update in real time as data is logged across the ERP.',
    target: null, position: 'center', illustration: '📊',
  },
];

// ── Master export map ─────────────────────────────────────────────────────────
export const MODULE_STEPS = {
  projects:          PROJECTS_STEPS,
  hr:                HR_STEPS,
  finance:           FINANCE_STEPS,
  departments:       DEPARTMENTS_STEPS,
  users:             USERS_STEPS,
  clients:           CLIENTS_STEPS,
  documents:         DOCUMENTS_STEPS,
  roles:             ROLES_STEPS,
  permissions:       PERMISSIONS_STEPS,
  analytics:         ANALYTICS_STEPS,
  'my-work':         MY_WORK_STEPS,
  'time-tracking':   TIME_TRACKING_STEPS,
  'employee-portal': EMPLOYEE_PORTAL_STEPS,
  development:       DEVELOPMENT_STEPS,
  settings:          SETTINGS_STEPS,
  audit:             AUDIT_STEPS,
  operations:        OPERATIONS_STEPS,
};
