import React, { Suspense, lazy, useEffect, useMemo } from 'react';
import { Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from './app/providers/AuthContext';
import { ThemeProvider } from './app/providers/ThemeContext';
import { SocketProvider } from './app/providers/SocketContext';
import { setupGlobalErrorHandling } from './shared/utils/errorHandler';
import { tenantPath } from './shared/utils/tenantRoutes';
import { getSubdomainSlug, getTenantWorkspaceUrl } from './shared/utils/subdomain';

import './assets/software-house-premium.css';

// ── Auth pages ────────────────────────────────────────────────────────────────
import SupraAdminLogin from './pages/Auth/SupraAdminLogin/SupraAdminLogin';
import SoftwareHouseSignup from './pages/Auth/SoftwareHouseSignup/SoftwareHouseSignup';
import SoftwareHouseLogin from './pages/Auth/SoftwareHouseLogin/SoftwareHouseLogin';
import SoftwareHouseForgotPassword from './pages/Auth/SoftwareHouseForgotPassword/SoftwareHouseForgotPassword';
import SoftwareHouseLanding from './pages/Auth/SoftwareHouseLanding/SoftwareHouseLanding';
import InviteAccept from './pages/Auth/InviteAccept/InviteAccept';
import FinanceSystemPage from './pages/Auth/FinanceSystemPage/FinanceSystemPage';
import HRMSystemPage from './pages/Auth/HRMSystemPage/HRMSystemPage';
import ProjectSystemPage from './pages/Auth/ProjectSystemPage/ProjectSystemPage';

// ── Shared UI ─────────────────────────────────────────────────────────────────
import LoadingSpinner from './shared/components/feedback/LoadingSpinner';
import PageNotFound from './shared/pages/PageNotFound';
import BackendHealthCheck from './shared/components/monitoring/BackendHealthCheck';
import MonitoringSystemStatus from './shared/components/monitoring/MonitoringSystemStatus';
import AccessDenied from './shared/components/feedback/AccessDenied';

// ── Tenant shell ──────────────────────────────────────────────────────────────
import TenantDashboard from './features/tenant/pages/TenantDashboard';
import TenantOrg from './features/tenant/pages/tenant/org/TenantOrg';

// ── Tenant Org — Dashboard ────────────────────────────────────────────────────
import DashboardAnalytics from './features/tenant/pages/tenant/org/dashboard/DashboardAnalytics';
import DynamicDashboard from './features/tenant/pages/tenant/org/dashboard/DynamicDashboard';
import MyWork from './features/tenant/pages/tenant/org/my-work/MyWork';
import AnalyticsOverview from './features/tenant/pages/tenant/org/analytics/AnalyticsOverview';

// ── Tenant Org — User Management ──────────────────────────────────────────────
import UserList from './features/tenant/pages/tenant/org/users/UserList';
import UserProfile from './features/tenant/pages/tenant/org/users/UserProfile';

// ── Tenant Org — HR (software-house path) ────────────────────────────────────
import HROverview from './features/tenant/pages/tenant/org/software-house/hr/HROverview';
import EmployeeList from './features/tenant/pages/tenant/org/software-house/hr/EmployeeList';
import EmployeeCreate from './features/tenant/pages/tenant/org/software-house/hr/EmployeeCreate';
import EmployeeDetail from './features/tenant/pages/tenant/org/software-house/hr/EmployeeDetail';
import EmployeeCreateHR from './features/tenant/pages/tenant/org/hr/EmployeeCreate';
import PayrollManagement from './features/tenant/pages/tenant/org/software-house/hr/PayrollManagement';
import AttendanceManagement from './features/tenant/pages/tenant/org/software-house/hr/AttendanceManagement';
import HRLeaveRequests from './features/tenant/pages/tenant/org/software-house/hr/HRLeaveRequests';
import HRPerformance from './features/tenant/pages/tenant/org/software-house/hr/HRPerformance';
import HRRecruitment from './features/tenant/pages/tenant/org/software-house/hr/HRRecruitment';
import HROnboarding from './features/tenant/pages/tenant/org/software-house/hr/HROnboarding';
import HRTraining from './features/tenant/pages/tenant/org/software-house/hr/HRTraining';

// ── Tenant Org — Employee / Client portal ────────────────────────────────────
import ClientSettings from './features/tenant/components/ClientPortal/ClientSettings';
import ClientOrganizationProfile from './features/tenant/components/ClientPortal/ClientOrganizationProfile';
import {
  ClientPortalLauncher,
  ClientInvoicesView,
  ClientDocumentsView,
  ClientContactView,
} from './features/tenant/components/ClientPortal/ClientDashboard';
import ClientProjectsView from './features/tenant/components/ClientPortal/ClientProjectsView';
import ClientTimesheetsView from './features/tenant/components/ClientPortal/ClientTimesheetsView';
import EmployeeProfileView from './features/tenant/pages/tenant/org/software-house/employee-portal/EmployeeProfileView';
import EmployeeAttendanceView from './features/tenant/pages/tenant/org/software-house/employee-portal/EmployeeAttendanceView';
import EmployeeLeaveRequests from './features/tenant/pages/tenant/org/software-house/employee-portal/EmployeeLeaveRequests';
import EmployeePerformanceView from './features/tenant/pages/tenant/org/software-house/employee-portal/EmployeePerformanceView';
import EmployeePayrollView from './features/tenant/pages/tenant/org/software-house/employee-portal/EmployeePayrollView';
import ContractorDashboard from './features/tenant/pages/tenant/org/software-house/employee-portal/ContractorDashboard';

// ── Tenant Org — Finance ──────────────────────────────────────────────────────
import FinanceOverview from './features/tenant/pages/tenant/org/finance/FinanceOverview';
import AccountsPayable from './features/tenant/pages/tenant/org/finance/AccountsPayable';
import AccountsReceivable from './features/tenant/pages/tenant/org/finance/AccountsReceivable';
import ChartOfAccounts from './features/tenant/pages/tenant/org/finance/ChartOfAccounts';
import BillingEngine from './features/tenant/pages/tenant/org/finance/BillingEngine';
import ProjectCosting from './features/tenant/pages/tenant/org/finance/ProjectCosting';
import CashFlow from './features/tenant/pages/tenant/org/finance/CashFlow';
import TimeExpenses from './features/tenant/pages/tenant/org/finance/TimeExpenses';
import Reporting from './features/tenant/pages/tenant/org/finance/Reporting';
import FinanceBudgeting from './features/tenant/pages/tenant/org/finance/FinanceBudgeting';

// ── Tenant Org — Projects ─────────────────────────────────────────────────────
import ProjectsOverview from './features/tenant/pages/tenant/org/projects/ProjectsOverview';
import ProjectsList from './features/tenant/pages/tenant/org/projects/ProjectsList';
import ProjectTasks from './features/tenant/pages/tenant/org/projects/ProjectTasks';
import ProjectMilestones from './features/tenant/pages/tenant/org/projects/ProjectMilestones';
import ProjectResources from './features/tenant/pages/tenant/org/projects/ProjectResources';
import ProjectTimesheets from './features/tenant/pages/tenant/org/projects/ProjectTimesheets';
import SprintManagement from './features/tenant/pages/tenant/org/projects/SprintManagement';
import ProjectGantt from './features/tenant/pages/tenant/org/projects/ProjectGantt';
import ProjectGanttStandalone from './features/tenant/pages/tenant/org/projects/ProjectGanttStandalone';
import ProjectDashboard from './features/tenant/pages/tenant/org/projects/ProjectDashboard';
import ProjectBoardView from './features/tenant/pages/tenant/org/projects/ProjectBoardView';
import ProjectCalendarView from './features/tenant/pages/tenant/org/projects/ProjectCalendarView';
import ProjectTimelineView from './features/tenant/pages/tenant/org/projects/ProjectTimelineView';
import ProjectActivityView from './features/tenant/pages/tenant/org/projects/ProjectActivityView';
import ProjectWorkloadView from './features/tenant/pages/tenant/org/projects/ProjectWorkloadView';
import ProjectTableView from './features/tenant/pages/tenant/org/projects/ProjectTableView';
import ProjectWorkspaceLayout from './features/tenant/components/ProjectWorkspaceLayout';

// ── Tenant Org — Nucleus (change-requests / approvals / deliverables) ─────────
import ChangeRequestDashboard from './features/tenant/pages/tenant/org/projects/components/changeRequests/ChangeRequestDashboard';
import ChangeRequestDetailPage from './features/tenant/pages/tenant/org/projects/ChangeRequestDetailPage';
import DeliverablesPage from './features/tenant/pages/tenant/org/projects/DeliverablesPage';
import DeliverableDetail from './features/tenant/pages/tenant/org/projects/DeliverableDetail';
import ApprovalsQueuePage from './features/tenant/pages/tenant/org/projects/ApprovalsQueuePage';
import NucleusAnalyticsPage from './features/tenant/pages/tenant/org/projects/NucleusAnalyticsPage';

// ── Tenant Org — Operations / Settings / Documents ───────────────────────────
import OperationsOverview from './features/tenant/pages/tenant/org/operations/OperationsOverview';
import SettingsOverview from './features/tenant/pages/tenant/org/settings/SettingsOverview';
import WorkspaceSettingsPage from './features/tenant/pages/tenant/org/settings/WorkspaceSettingsPage';
import DocumentsHub from './features/tenant/pages/tenant/org/documents/DocumentsHub';
import DocumentEditor from './features/tenant/pages/tenant/org/documents/DocumentEditor';
import ApprovalQueue from './features/tenant/pages/tenant/org/documents/ApprovalQueue';
import DocumentAuditView from './features/tenant/pages/tenant/org/documents/DocumentAuditView';

// ── Tenant Org — Software House ───────────────────────────────────────────────
import TimeTracking from './features/tenant/pages/tenant/org/software-house/TimeTracking';

// ── Tenant Org — Clients ──────────────────────────────────────────────────────
import Clients from './features/tenant/pages/tenant/org/Clients';
import ClientContracts from './features/tenant/pages/tenant/org/ClientContracts';
import ClientCommunications from './features/tenant/pages/tenant/org/ClientCommunications';
import ClientBilling from './features/tenant/pages/tenant/org/ClientBilling';

// ── Tenant Org — Permissions / Roles / Departments ───────────────────────────
import PermissionsList from './features/tenant/pages/tenant/org/permissions/PermissionsList';
import RolesList from './features/tenant/pages/tenant/org/roles/RolesList';
import DepartmentsList from './features/tenant/pages/tenant/org/departments/DepartmentsList';
import DepartmentDashboard from './features/tenant/pages/tenant/org/departments/DepartmentDashboard';
import DepartmentAccessManagement from './features/tenant/pages/tenant/org/departments/DepartmentAccessManagement';
import AuditLogPage from './features/tenant/pages/tenant/org/audit/AuditLogPage';
import TenantOrgRulebook from './features/tenant/pages/tenant/org/TenantOrgRulebook';

// ── Route guards (tenant-scoped) ──────────────────────────────────────────────
import {
  CatchAllRoute,
  HomeRoute,
  EmployeeOnlyRoute,
  HROnlyRoute,
  OrganizationProfileRoute,
  OrganizationProfileAccessRoute,
  SettingsRoute,
  AdminOnlySettingsRoute,
  AuditAccessRoute,
} from './features/tenant/guards/TenantOrgGuards';

// ── SupraAdmin layout + pages ─────────────────────────────────────────────────
// Lazy-loaded as one boundary: this subtree pulls in antd (~120KB gzipped), which should
// never ship to tenant-portal or Software-House-Admin sessions that can't reach these routes.
// Sheets pulls in the Univer spreadsheet engine (a large canvas-rendered bundle) — lazy-load
// so it isn't added to the main app bundle for users who never open Sheets.
const SheetsHub = lazy(() => import('./features/tenant/pages/tenant/org/sheets/SheetsHub'));
const SheetEditor = lazy(() => import('./features/tenant/pages/tenant/org/sheets/SheetEditor'));
const SupraAdmin = lazy(() => import('./features/admin/pages/SupraAdmin/SupraAdmin'));
const SupraAdminDashboard = lazy(() => import('./features/admin/pages/SupraAdmin/dashboard/SupraAdminDashboard'));
const TenantManagement = lazy(() => import('./features/admin/pages/SupraAdmin/tenants/TenantManagement'));
const TenantUsers = lazy(() => import('./features/admin/pages/SupraAdmin/tenants/TenantUsers'));
const BillingManagement = lazy(() => import('./features/admin/pages/SupraAdmin/billing/BillingManagement'));
const Analytics = lazy(() => import('./features/admin/pages/SupraAdmin/analytics/Analytics'));
const SupraUsers = lazy(() => import('./features/admin/pages/SupraAdmin/users/Users'));
const SessionManagement = lazy(() => import('./features/admin/pages/SupraAdmin/sessions/SessionManagement'));
const SessionAnalytics = lazy(() => import('./features/admin/pages/SupraAdmin/analytics/SessionAnalytics'));
const SystemHealth = lazy(() => import('./features/admin/pages/SupraAdmin/monitoring/SystemHealth'));
const Infrastructure = lazy(() => import('./features/admin/pages/SupraAdmin/infrastructure/Infrastructure'));
const SupraSettings = lazy(() => import('./features/admin/pages/SupraAdmin/settings/Settings'));
const DepartmentManagement = lazy(() => import('./features/admin/pages/SupraAdmin/departments/DepartmentManagement'));
const ERPManagement = lazy(() => import('./features/admin/pages/SupraAdmin/erp/ERPManagement'));

// ─────────────────────────────────────────────────────────────────────────────

function ScrollToTopOnRouteChange() {
  const location = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);
  return null;
}

// On subdomain, catch any old-style /:slug/org/* navigate() call and
// strip the prefix so the URL becomes the clean /path version.
function SubdomainOldPathRedirect() {
  const { '*': rest } = useParams();
  return <Navigate to={`/${rest || ''}`} replace />;
}

// Handles redirects from School ERP's SlugRouter:
// swh.tws.enterprises/org/beaconhouse → swh.tws.enterprises/beaconhouse/org
function OrgPathRedirect() {
  const { tenantSlug, '*': rest } = useParams();
  const dest = `/${tenantSlug}/org${rest ? `/${rest}` : ''}`;
  return <Navigate to={dest} replace />;
}

// Hard-navigate for cross-subdomain redirects; React Router Navigate otherwise.
function SmartRedirect({ to, replace }) {
  useEffect(() => { if (to.startsWith('http')) window.location.href = to; }, [to]);
  if (to.startsWith('http')) return null;
  return <Navigate to={to} replace={replace} />;
}

function getTenantSlugFromUser(user) {
  try {
    const tenantData = JSON.parse(localStorage.getItem('tenantData'));
    return (
      tenantData?.slug ||
      (typeof user.tenantId === 'string' && !user.tenantId.match(/^[0-9a-f]{24}$/i)
        ? user.tenantId
        : null) ||
      (typeof user.orgId === 'object' && user.orgId?.slug ? user.orgId.slug : null)
    );
  } catch {
    return (
      (typeof user.tenantId === 'string' && !user.tenantId.match(/^[0-9a-f]{24}$/i)
        ? user.tenantId
        : null) ||
      (typeof user.orgId === 'object' && user.orgId?.slug ? user.orgId.slug : null) ||
      (typeof user.orgId === 'string' ? user.orgId : 'demo')
    );
  }
}

function App() {
  const { user, loading } = useAuth();

  const routingKey = useMemo(() => {
    if (!user) return 'unauthenticated';
    return `${user.role}-${user.id}`;
  }, [user?.role, user?.id]);

  useEffect(() => { setupGlobalErrorHandling(); }, []);

  if (loading) return <LoadingSpinner />;

  const tenantSlug = user ? getTenantSlugFromUser(user) : null;
  const isSubdomain = Boolean(getSubdomainSlug());
  const clientRoles = ['client', 'customer'];
  const employeeRoles = [
    'admin', 'finance_manager', 'finance', 'project_manager', 'owner', 'org_manager',
    'manager', 'ceo', 'cfo', 'hr', 'employee', 'staff', 'developer', 'engineer',
    'programmer', 'department_lead', 'pmo', 'contributor', 'contractor',
  ];
  const allTenantRoles = [...employeeRoles, ...clientRoles];

  return (
    <ThemeProvider>
      <SocketProvider>
        <ScrollToTopOnRouteChange />
        <Routes key={routingKey}>

          {/* ── Public / Auth ─────────────────────────────────────────────── */}
          <Route
            path="/supra-admin-login"
            element={user ? <Navigate to="/supra-admin" replace /> : <SupraAdminLogin />}
          />
          <Route path="/login" element={<Navigate to="/software-house-login" replace />} />
          <Route path="/invite/accept" element={<InviteAccept />} />
          <Route
            path="/software-house-login"
            element={
              user ? (() => {
                try {
                  const td = JSON.parse(localStorage.getItem('tenantData'));
                  const slug =
                    td?.slug ||
                    (typeof user.tenantId === 'string' && !user.tenantId?.match?.(/^[0-9a-f]{24}$/i)
                      ? user.tenantId
                      : null) ||
                    (typeof user.orgId === 'object' && user.orgId?.slug ? user.orgId.slug : null);
                  if (slug) {
                    const dest = clientRoles.includes(user?.role)
                      ? getTenantWorkspaceUrl(slug, 'org', 'client-portal')
                      : getTenantWorkspaceUrl(slug, 'org', 'home');
                    return <SmartRedirect to={dest} replace />;
                  }
                } catch (e) {
                  console.error('Error determining software house redirect:', e);
                }
                return <SoftwareHouseLogin />;
              })()
              : <SoftwareHouseLogin />
            }
          />
          <Route
            path="/software-house-signup"
            element={user ? <Navigate to="/" replace /> : <SoftwareHouseSignup />}
          />
          <Route
            path="/software-house-forgot-password"
            element={user ? <Navigate to="/" replace /> : <SoftwareHouseForgotPassword />}
          />
          <Route path="/forgot-password" element={<Navigate to="/software-house-forgot-password" replace />} />
          <Route path="/software-house" element={<SoftwareHouseLanding />} />
          <Route path="/software-house/finance" element={<FinanceSystemPage />} />
          <Route path="/software-house/hrm" element={<HRMSystemPage />} />
          <Route path="/software-house/projects" element={<ProjectSystemPage />} />
          <Route path="/software-house/analytics" element={<Navigate to="/software-house/projects" replace />} />
          <Route path="/access-denied" element={<AccessDenied />} />
          <Route path="/landing" element={<Navigate to="/software-house" replace />} />
          <Route path="/monitoring-status" element={<MonitoringSystemStatus />} />
          <Route path="/debug" element={
            <div className="p-8">
              <h1 className="text-2xl font-bold mb-4">Debug Information</h1>
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">Authentication Status</h3>
                  <p>User: {user ? 'Authenticated' : 'Not authenticated'}</p>
                  <p>Loading: {loading ? 'Yes' : 'No'}</p>
                  {user && <p>Role: {user.role}</p>}
                </div>
                <BackendHealthCheck />
              </div>
            </div>
          } />

          {/* ── SupraAdmin ────────────────────────────────────────────────── */}
          {/* Outer Suspense covers SupraAdmin's own lazy load (the layout/sidebar shell);
              each child route below has its own Suspense so navigating between admin pages
              only re-suspends the content area, not the whole layout. */}
          <Route
            path="/supra-admin"
            element={
              <Suspense fallback={<LoadingSpinner />}>
                {user && user.role === 'super_admin'
                  ? <SupraAdmin />
                  : <Navigate to="/supra-admin-login" replace />}
              </Suspense>
            }
          >
            <Route index element={<Suspense fallback={<LoadingSpinner />}><SupraAdminDashboard /></Suspense>} />
            <Route path="tenants" element={<Suspense fallback={<LoadingSpinner />}><TenantManagement /></Suspense>} />
            <Route path="tenants/users" element={<Suspense fallback={<LoadingSpinner />}><TenantUsers /></Suspense>} />
            <Route path="billing" element={<Suspense fallback={<LoadingSpinner />}><BillingManagement /></Suspense>} />
            <Route path="analytics" element={<Suspense fallback={<LoadingSpinner />}><Analytics /></Suspense>} />
            <Route path="users" element={<Suspense fallback={<LoadingSpinner />}><SupraUsers /></Suspense>} />
            <Route path="session-management" element={<Suspense fallback={<LoadingSpinner />}><SessionManagement /></Suspense>} />
            {/* Departments and Department Access were merged into Department Management —
                the only one of the three that was ever more than a read-only duplicate.
                Redirects keep any existing bookmarks/links working. */}
            <Route path="department-access" element={<Navigate to="/supra-admin/department-management" replace />} />
            <Route path="departments" element={<Navigate to="/supra-admin/department-management" replace />} />
            <Route path="session-analytics" element={<Suspense fallback={<LoadingSpinner />}><SessionAnalytics /></Suspense>} />
            <Route path="department-management" element={<Suspense fallback={<LoadingSpinner />}><DepartmentManagement /></Suspense>} />
            <Route path="erp-management" element={<Suspense fallback={<LoadingSpinner />}><ERPManagement /></Suspense>} />
            <Route path="erp-management/:category" element={<Suspense fallback={<LoadingSpinner />}><ERPManagement /></Suspense>} />
            <Route path="system-health" element={<Suspense fallback={<LoadingSpinner />}><SystemHealth /></Suspense>} />
            <Route path="infrastructure" element={<Suspense fallback={<LoadingSpinner />}><Infrastructure /></Suspense>} />
            <Route path="settings" element={<Suspense fallback={<LoadingSpinner />}><SupraSettings /></Suspense>} />
          </Route>

          {/* ── /org/:slug — entry point from School ERP's SlugRouter redirect ── */}
          {!isSubdomain && (
            <Route path="/org/:tenantSlug/*" element={<OrgPathRedirect />} />
          )}

          {/* ── Tenant dashboard (legacy) ─────────────────────────────────── */}
          <Route path="/:tenantSlug/dashboard" element={<TenantDashboard />} />

          {/* ── Subdomain: redirect old /:slug/org/* paths to clean /path ── */}
          {isSubdomain && (
            <Route path="/:tenantSlug/org/*" element={<SubdomainOldPathRedirect />} />
          )}

          {/* ── Tenant Org workspace ──────────────────────────────────────── */}
          {/* On subdomain (acme.tws.enterprises): routes live at /home, /projects, etc.
              On root domain: routes live at /:tenantSlug/org/home, etc.         */}
          <Route path={isSubdomain ? '/' : '/:tenantSlug/org'} element={<TenantOrg />}>
            <Route index element={<Navigate to="home" replace />} />
            <Route path="home" element={<HomeRoute />} />
            <Route path="dashboard" element={<DynamicDashboard />} />
            <Route path="dashboard/analytics" element={<DashboardAnalytics />} />
            <Route path="my-work" element={<MyWork />} />
            <Route path="analytics" element={<AnalyticsOverview />} />

            {/* User management */}
            <Route path="users" element={<UserList />} />
            <Route path="users/create" element={<Navigate to="../users?create=user" replace />} />
            <Route path="users/:id" element={<UserProfile />} />

            {/* Permissions */}
            <Route path="permissions" element={<PermissionsList />} />
            <Route path="permissions/create" element={<Navigate to="../permissions?create=permission" replace />} />

            {/* Roles */}
            <Route path="roles" element={<RolesList />} />
            <Route path="roles/create" element={<Navigate to="../roles?create=role" replace />} />

            {/* Departments */}
            <Route path="departments" element={<DepartmentsList />} />
            <Route path="departments/create" element={<Navigate to="../departments?create=department" replace />} />
            <Route path="departments/access" element={<DepartmentAccessManagement />} />
            <Route path="departments/:departmentId/dashboard" element={<DepartmentDashboard />} />

            {/* Audit */}
            <Route path="audit" element={<AuditAccessRoute><AuditLogPage /></AuditAccessRoute>} />

            {/* HR redirects — legacy /hr path → /software-house/hr */}
            <Route path="hr" element={<Navigate to="software-house/hr" replace />} />
            <Route path="hr/employees" element={<Navigate to="../software-house/hr/employees" replace />} />
            <Route path="hr/employees/create" element={<EmployeeCreateHR />} />
            <Route path="hr/payroll" element={<Navigate to="../software-house/hr/payroll" replace />} />
            <Route path="hr/attendance" element={<Navigate to="../software-house/hr/attendance" replace />} />
            <Route path="hr/leave-requests" element={<Navigate to="../software-house/hr/leave-requests" replace />} />
            <Route path="hr/performance" element={<Navigate to="../software-house/hr/performance" replace />} />
            <Route path="hr/recruitment" element={<Navigate to="../software-house/hr/recruitment" replace />} />
            <Route path="hr/onboarding" element={<Navigate to="../software-house/hr/onboarding" replace />} />
            <Route path="hr/training" element={<Navigate to="../software-house/hr/training" replace />} />

            {/* Software House HR */}
            <Route path="software-house/hr" element={<HROverview />} />
            <Route path="software-house/hr/employees" element={<EmployeeList />} />
            <Route path="software-house/hr/employees/create" element={<EmployeeCreate />} />
            <Route path="software-house/hr/employees/:id" element={<EmployeeDetail />} />
            <Route path="software-house/hr/payroll" element={<HROnlyRoute><PayrollManagement /></HROnlyRoute>} />
            <Route path="software-house/hr/attendance" element={<AttendanceManagement />} />
            <Route path="software-house/hr/leave-requests" element={<HRLeaveRequests />} />
            <Route path="software-house/hr/performance" element={<HRPerformance />} />
            <Route path="software-house/hr/recruitment" element={<HRRecruitment />} />
            <Route path="software-house/hr/onboarding" element={<HROnboarding />} />
            <Route path="software-house/hr/training" element={<HRTraining />} />

            {/* Employee self-service */}
            <Route path="employee/profile" element={<EmployeeOnlyRoute><EmployeeProfileView /></EmployeeOnlyRoute>} />
            <Route path="employee/attendance" element={<EmployeeOnlyRoute><EmployeeAttendanceView /></EmployeeOnlyRoute>} />
            <Route path="employee/leave" element={<EmployeeOnlyRoute><EmployeeLeaveRequests /></EmployeeOnlyRoute>} />
            <Route path="employee/performance" element={<EmployeeOnlyRoute><EmployeePerformanceView /></EmployeeOnlyRoute>} />
            <Route path="employee/payroll" element={<EmployeeOnlyRoute><EmployeePayrollView /></EmployeeOnlyRoute>} />
            <Route path="contractor/dashboard" element={<EmployeeOnlyRoute><ContractorDashboard /></EmployeeOnlyRoute>} />

            {/* Client portal */}
            <Route path="client-portal/settings" element={<ClientSettings />} />
            <Route path="client-portal" element={<ClientPortalLauncher />} />
            <Route path="client-portal/projects" element={<ClientProjectsView />} />
            <Route path="client-portal/projects/:projectId" element={<ClientProjectsView />} />
            <Route path="client-portal/projects/:projectId/deliverables/:deliverableId" element={<ClientProjectsView />} />
            <Route path="client-portal/timesheets" element={<ClientTimesheetsView />} />
            <Route path="client-portal/invoices" element={<ClientInvoicesView />} />
            <Route path="client-portal/documents" element={<ClientDocumentsView />} />
            <Route path="client-portal/contact" element={<ClientContactView />} />
            <Route path="client-portal/company" element={<ClientOrganizationProfile />} />

            {/* Finance */}
            <Route path="finance" element={<FinanceOverview />} />
            <Route path="finance/chart-of-accounts" element={<ChartOfAccounts />} />
            <Route path="finance/accounts-payable" element={<AccountsPayable />} />
            <Route path="finance/accounts-receivable" element={<AccountsReceivable />} />
            <Route path="finance/budgeting" element={<FinanceBudgeting />} />
            <Route path="finance/time-expenses" element={<TimeExpenses />} />
            <Route path="finance/reporting" element={<Reporting />} />
            <Route path="finance/billing-engine" element={<BillingEngine />} />
            <Route path="finance/project-costing" element={<ProjectCosting />} />
            <Route path="finance/cash-flow" element={<CashFlow />} />

            {/* Workspace redirect (deprecated nav) */}
            <Route path="workspaces" element={<Navigate to="../projects" replace />} />
            <Route path="workspaces/*" element={<Navigate to="../projects" replace />} />

            {/* Projects — literal paths first, then :projectId */}
            <Route path="projects" element={<ProjectsOverview />} />
            <Route path="projects/list" element={<ProjectsList />} />
            <Route path="projects/tasks" element={<ProjectTasks />} />
            <Route path="projects/milestones" element={<ProjectMilestones />} />
            <Route path="projects/resources" element={<ProjectResources />} />
            <Route path="projects/timesheets" element={<ProjectTimesheets />} />
            <Route path="projects/sprints" element={<SprintManagement />} />
            <Route path="projects/gantt" element={<ProjectGanttStandalone />} />
            <Route path="projects/change-requests" element={<ChangeRequestDashboard />} />
            <Route path="projects/change-requests/:changeRequestId" element={<ChangeRequestDetailPage />} />
            <Route path="projects/approvals" element={<ApprovalsQueuePage />} />
            <Route path="projects/analytics" element={<NucleusAnalyticsPage />} />
            <Route path="projects/deliverables" element={<DeliverablesPage />} />
            <Route path="projects/deliverables/:deliverableId" element={<DeliverableDetail />} />

            {/* Project workspace (sidebar layout) */}
            <Route path="projects/:projectId" element={<ProjectWorkspaceLayout />}>
              <Route index element={<Navigate to="board" replace />} />
              <Route path="overview" element={<ProjectDashboard />} />
              <Route path="dashboard" element={<Navigate to="../overview" replace />} />
              <Route path="board" element={<ProjectBoardView />} />
              <Route path="list" element={<Navigate to="../board" replace />} />
              <Route path="gantt" element={<ProjectGantt />} />
              <Route path="team" element={<ProjectResources />} />
              <Route path="calendar" element={<ProjectCalendarView />} />
              <Route path="timeline" element={<ProjectTimelineView />} />
              <Route path="activity" element={<ProjectActivityView />} />
              <Route path="workload" element={<ProjectWorkloadView />} />
              <Route path="table" element={<ProjectTableView />} />
            </Route>

            {/* Operations */}
            <Route path="operations" element={<OperationsOverview />} />

            {/* Rulebook */}
            <Route path="rulebook" element={<TenantOrgRulebook />} />

            {/* Settings */}
            <Route path="settings" element={<AdminOnlySettingsRoute><SettingsRoute /></AdminOnlySettingsRoute>} />
            <Route path="settings/organization" element={<OrganizationProfileAccessRoute><OrganizationProfileRoute /></OrganizationProfileAccessRoute>} />
            <Route path="settings/workspace" element={<AdminOnlySettingsRoute><WorkspaceSettingsPage /></AdminOnlySettingsRoute>} />
            <Route path="settings/notifications" element={<AdminOnlySettingsRoute><SettingsOverview /></AdminOnlySettingsRoute>} />
            <Route path="settings/security" element={<AdminOnlySettingsRoute><SettingsOverview /></AdminOnlySettingsRoute>} />

            {/* Documents */}
            <Route path="documents" element={<DocumentsHub />} />
            <Route path="documents/approval-queue" element={<ApprovalQueue />} />
            <Route path="documents/audit" element={<DocumentAuditView />} />
            <Route path="documents/new" element={<DocumentEditor />} />
            <Route path="documents/:id" element={<DocumentEditor />} />

            {/* Sheets */}
            <Route path="sheets" element={<Suspense fallback={<LoadingSpinner />}><SheetsHub /></Suspense>} />
            <Route path="sheets/new" element={<Suspense fallback={<LoadingSpinner />}><SheetEditor /></Suspense>} />
            <Route path="sheets/:id" element={<Suspense fallback={<LoadingSpinner />}><SheetEditor /></Suspense>} />

            {/* Profile */}
            <Route path="profile" element={<UserProfile />} />

            {/* Software House */}
            <Route path="software-house/time-tracking" element={<TimeTracking />} />

            {/* Clients */}
            <Route path="clients" element={<Clients />} />
            <Route path="clients/new" element={<Clients />} />
            <Route path="clients/:clientId" element={<Clients />} />
            <Route path="clients/:clientId/edit" element={<Clients />} />
            <Route path="clients/contracts" element={<ClientContracts />} />
            <Route path="clients/communications" element={<ClientCommunications />} />
            <Route path="clients/billing" element={<ClientBilling />} />

            {/* Catch-all inside org */}
            <Route path="*" element={<CatchAllRoute />} />
          </Route>

          {/* ── Root redirect ─────────────────────────────────────────────── */}
          {user ? (
            allTenantRoles.includes(user.role) ? (
              <Route
                path="/"
                element={(() => {
                  const subPath = clientRoles.includes(user.role) ? 'client-portal' : 'home';
                  const dest = getTenantWorkspaceUrl(tenantSlug || 'demo', 'org', subPath);
                  return <SmartRedirect to={dest} replace />;
                })()}
              />
            ) : (
              <>
                <Route path="/" element={<Navigate to="/software-house" replace />} />
                <Route path="/dashboard" element={<Navigate to="/software-house" replace />} />
                <Route path="*" element={<PageNotFound />} />
              </>
            )
          ) : (
            <>
              <Route path="/" element={<Navigate to="/software-house" replace />} />
              <Route path="/landing" element={<Navigate to="/software-house" replace />} />
              <Route path="/dashboard" element={<Navigate to="/software-house" replace />} />
              <Route path="*" element={<PageNotFound />} />
            </>
          )}

          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </SocketProvider>
    </ThemeProvider>
  );
}

export default App;
