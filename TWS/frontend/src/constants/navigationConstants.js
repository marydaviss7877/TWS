import {
  HomeIcon,
  BriefcaseIcon,
  FolderIcon,
  ClipboardDocumentListIcon,
  UsersIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  CogIcon,
  UserIcon,
  ClockIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';

// ---------------------------------------------------------------------------
// NAV ACTIONS — single source of truth used by CommandPalette + TopBar search
// ---------------------------------------------------------------------------
/**
 * Returns all command-palette / search actions for the tenant portal.
 * Centralised here to prevent SoftwareHouseTopNavbar & CommandPalette drifting.
 */
export const getNavigationActions = (tenantSlug) => {
  if (!tenantSlug) return [];
  return [
    // --- Navigate ---
    { id: 'dashboard',    label: 'Dashboard',      icon: HomeIcon,                  category: 'Navigate', path: `/${tenantSlug}/org/dashboard` },
    { id: 'my-work',      label: 'My Work',         icon: BriefcaseIcon,             category: 'Navigate', path: `/${tenantSlug}/org/my-work` },
    { id: 'projects',     label: 'Projects',        icon: FolderIcon,                category: 'Navigate', path: `/${tenantSlug}/org/projects` },
    { id: 'tasks',        label: 'Tasks',           icon: ClipboardDocumentListIcon, category: 'Navigate', path: `/${tenantSlug}/org/projects/tasks` },
    { id: 'hr',           label: 'HR',              icon: UsersIcon,                 category: 'Navigate', path: `/${tenantSlug}/org/software-house/hr` },
    { id: 'finance',      label: 'Finance',         icon: CurrencyDollarIcon,        category: 'Navigate', path: `/${tenantSlug}/org/finance` },
    { id: 'analytics',    label: 'Analytics',       icon: ChartBarIcon,              category: 'Navigate', path: `/${tenantSlug}/org/analytics` },
    { id: 'documents',    label: 'Documents',       icon: PencilSquareIcon,          category: 'Navigate', path: `/${tenantSlug}/org/documents` },
    { id: 'settings',     label: 'Settings',        icon: CogIcon,                   category: 'Navigate', path: `/${tenantSlug}/org/settings` },
    // --- Quick Create ---
    { id: 'create-task',    label: 'Add Task',        icon: ClipboardDocumentListIcon, category: 'Quick Create', path: `/${tenantSlug}/org/projects/tasks?create=task` },
    { id: 'create-project', label: 'Create Project',  icon: FolderIcon,                category: 'Quick Create', path: `/${tenantSlug}/org/projects?create=project` },
    { id: 'add-user',       label: 'Add User',         icon: UserIcon,                  category: 'Quick Create', path: `/${tenantSlug}/org/users/create` },
    { id: 'log-time',       label: 'Log Time',         icon: ClockIcon,                 category: 'Quick Create', path: `/${tenantSlug}/org/software-house/time-tracking` },
    { id: 'new-document',   label: 'New Document',     icon: PencilSquareIcon,          category: 'Quick Create', path: `/${tenantSlug}/org/documents/new` },
  ];
};

// ---------------------------------------------------------------------------
// QUICK-ADD ACTIONS — used by TenantTopBar "Add" dropdown
// ---------------------------------------------------------------------------
export const QUICK_ADD_ACTIONS = [
  { id: 'task',    label: 'Add Task',       icon: ClipboardDocumentListIcon },
  { id: 'project', label: 'Create Project', icon: FolderIcon },
  { id: 'user',    label: 'Add User',       icon: UserIcon },
  { id: 'time',    label: 'Log Time',       icon: ClockIcon },
];

// ---------------------------------------------------------------------------
// MENU KEY → MODULE — single source of truth for permission checking.
// Replaces duplicate copies in TenantOrgLayout, useMenuFiltering, industryMenuBuilder.
// ---------------------------------------------------------------------------
export const MENU_KEY_MODULES = {
  hr:                   ['hr', 'attendance', 'employees', 'payroll'],
  finance:              ['finance'],
  projects:             ['projects'],
  operations:           ['operations'],
  clients:              ['clients'],
  reports:              ['reports'],
  messaging:            ['messaging'],
  users:                ['roles'],
  analytics:            ['reports'],
  settings:             [],
  permissions:          ['role_management', 'roles'],
  roles:                ['role_management', 'roles'],
  departments:          ['departments'],
  department:           ['departments'],
  products:             ['products'],
  categories:           ['categories'],
  pos:                  ['pos'],
  sales:                ['sales'],
  suppliers:            ['suppliers'],
  customers:            ['customers'],
  patients:             ['patients'],
  doctors:              ['doctors'],
  appointments:         ['appointments'],
  'medical-records':    ['medical_records'],
  prescriptions:        ['prescriptions'],
  billing:              ['billing'],
  students:             ['students'],
  teachers:             ['teachers'],
  classes:              ['classes'],
  subjects:             ['subjects'],
  syllabus:             ['syllabus'],
  attendance:           ['attendance'],
  'attendance-marking': ['attendance'],
  'attendance-reports': ['attendance'],
  'attendance-leaves':  ['attendance'],
  grades:               ['grades'],
  'grade-entry':        ['grades'],
  'report-cards':       ['grades'],
  'teacher-assignments':['teachers'],
  fees:                 ['fees'],
  'fee-structure':      ['fees'],
  'fee-collection':     ['fees'],
  'fee-reports':        ['fees'],
  timetable:            ['timetable'],
  'timetable-builder':  ['timetable'],
  'timetable-view':     ['timetable'],
  'room-management':    ['timetable'],
  courses:              ['courses'],
  exams:                ['exams'],
  admissions:           ['admissions'],
  production:           ['production'],
  'quality-control':    ['quality_control'],
  'supply-chain':       ['supply_chain'],
  equipment:            ['equipment'],
  maintenance:          ['maintenance'],
  'tech-stack':         ['tech_stack'],
  development:          ['development_methodology'],
  'time-tracking':      ['time_tracking'],
};

// ---------------------------------------------------------------------------
// SIDEBAR SECTIONS — controls display grouping in expanded sidebar
// ---------------------------------------------------------------------------
export const SIDEBAR_SECTIONS = [
  { label: null,       keys: ['dashboard', 'my-work'] },
  { label: 'Work',     keys: ['projects', 'clients', 'time-tracking', 'development', 'operations'] },
  { label: 'People',   keys: ['hr', 'users', 'departments', 'roles', 'permissions', 'employee-portal'] },
  { label: 'Finance',  keys: ['finance', 'payroll'] },
  { label: 'Insights', keys: ['analytics', 'reports', 'audit'] },
  { label: 'Content',  keys: ['documents'] },
  { label: 'Settings', keys: ['settings'] },
];

// ---------------------------------------------------------------------------
// APP METADATA — colors + descriptions for the Odoo-style app grid
// ---------------------------------------------------------------------------
export const APP_METADATA = {
  dashboard:          { gradient: 'from-indigo-500 to-indigo-600',   description: 'Overview & activity' },
  'my-work':          { gradient: 'from-blue-500 to-blue-600',       description: 'Tasks assigned to you' },
  projects:           { gradient: 'from-violet-500 to-purple-600',   description: 'Projects, tasks & sprints' },
  finance:            { gradient: 'from-emerald-500 to-green-600',   description: 'Invoices & budgets' },
  hr:                 { gradient: 'from-amber-500 to-orange-500',    description: 'People & payroll' },
  analytics:          { gradient: 'from-cyan-500 to-sky-600',        description: 'Reports & insights' },
  documents:          { gradient: 'from-slate-500 to-slate-600',     description: 'Files & approvals' },
  clients:            { gradient: 'from-sky-500 to-blue-600',        description: 'Client management' },
  users:              { gradient: 'from-pink-500 to-rose-500',       description: 'Team members' },
  departments:        { gradient: 'from-orange-500 to-amber-500',    description: 'Org structure' },
  roles:              { gradient: 'from-teal-500 to-cyan-600',       description: 'Team roles' },
  permissions:        { gradient: 'from-red-500 to-rose-600',        description: 'Access control' },
  development:        { gradient: 'from-purple-500 to-violet-600',   description: 'Dev workflow' },
  'time-tracking':    { gradient: 'from-blue-400 to-indigo-500',     description: 'Time logs' },
  'employee-portal':  { gradient: 'from-violet-400 to-purple-500',   description: 'Your portal' },
  operations:         { gradient: 'from-stone-500 to-zinc-600',      description: 'Operations' },
  audit:              { gradient: 'from-yellow-500 to-amber-600',    description: 'Audit trail' },
  reports:            { gradient: 'from-lime-500 to-green-600',      description: 'Detailed reports' },
  settings:           { gradient: 'from-gray-500 to-slate-600',      description: 'Configuration' },
  payroll:            { gradient: 'from-green-500 to-emerald-600',   description: 'Payroll management' },
};

// ---------------------------------------------------------------------------
// MENU-KEY → PERMISSION MODULE mapping for UPR Phase 2
// ---------------------------------------------------------------------------
export const MENU_KEY_PERMISSION_MODULE = {
  hr:           'hr',
  finance:      'finance',
  projects:     'projects',
  payroll:      'payroll',
  documents:    'documents',
  analytics:    'analytics',
  nucleus:      'nucleus',
  clients:      'clients',
  reports:      'reports',
  attendance:   'attendance',
  leave:        'leave',
  operations:   'operations',
  users:        'hr',
  roles:        'hr',
  permissions:  'hr',
  departments:  'hr',
  department:   'hr',
  'time-tracking': 'projects',
};
