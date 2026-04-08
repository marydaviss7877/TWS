import React from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import TenantOrgLayout from '../../../components/TenantOrgLayout';
import { TenantAuthProvider } from '../../../../../app/providers/TenantAuthContext';
import { TenantThemeProvider } from '../../../providers/TenantThemeProvider';

// Dashboard Components
import DashboardOverview from './dashboard/DashboardOverview';
import DashboardAnalytics from './dashboard/DashboardAnalytics';
import DynamicDashboard from './dashboard/DynamicDashboard';
import AppHome from './dashboard/AppHome';

// My Work Component
import MyWork from './my-work/MyWork';

// Analytics Components
import AnalyticsOverview from './analytics/AnalyticsOverview';
import AnalyticsReports from './analytics/AnalyticsReports';

// User Management Components
import UserList from './users/UserList';
import UserProfile from './users/UserProfile';
import UserCreate from './users/UserCreate';

// Software House HR Components (HRM is dedicated to software houses)
import HROverview from './software-house/hr/HROverview';
import EmployeeList from './software-house/hr/EmployeeList';
import EmployeeCreate from './software-house/hr/EmployeeCreate';
import EmployeeDetail from './software-house/hr/EmployeeDetail';
// Also import from /hr folder for direct /hr routes
import EmployeeCreateHR from './hr/EmployeeCreate';
import PayrollManagement from './software-house/hr/PayrollManagement';
import AttendanceManagement from './software-house/hr/AttendanceManagement';
import HRLeaveRequests from './software-house/hr/HRLeaveRequests';
import HRPerformance from './software-house/hr/HRPerformance';
import HRRecruitment from './software-house/hr/HRRecruitment';
import HROnboarding from './software-house/hr/HROnboarding';
import HRTraining from './software-house/hr/HRTraining';

// Software House Employee Portal
import EmployeePortal from './software-house/employee-portal/EmployeePortal';

// Finance Components
import FinanceOverview from './finance/FinanceOverview';
import AccountsPayable from './finance/AccountsPayable';
import AccountsReceivable from './finance/AccountsReceivable';
import BankingManagement from './finance/BankingManagement';
import ChartOfAccounts from './finance/ChartOfAccounts';
import BillingEngine from './finance/BillingEngine';
import ProjectCosting from './finance/ProjectCosting';
import CashFlow from './finance/CashFlow';
import TimeExpenses from './finance/TimeExpenses';
import Reporting from './finance/Reporting';
// Finance Budgeting
import FinanceBudgeting from './finance/FinanceBudgeting';

// Project Components
import ProjectsOverview from './projects/ProjectsOverview';
import ProjectsList from './projects/ProjectsList';
import ProjectTasks from './projects/ProjectTasks';
import ProjectMilestones from './projects/ProjectMilestones';
import ProjectResources from './projects/ProjectResources';
import ProjectTimesheets from './projects/ProjectTimesheets';
import SprintManagement from './projects/SprintManagement';
import ProjectGantt from './projects/ProjectGantt';
import ProjectGanttStandalone from './projects/ProjectGanttStandalone';
import ProjectDashboard from './projects/ProjectDashboard';
import ProjectBoardView from './projects/ProjectBoardView';
import ProjectListView from './projects/ProjectListView';
import ProjectCalendarView from './projects/ProjectCalendarView';
import ProjectTimelineView from './projects/ProjectTimelineView';
import ProjectActivityView from './projects/ProjectActivityView';
import ProjectWorkloadView from './projects/ProjectWorkloadView';
import ProjectTableView from './projects/ProjectTableView';
import ProjectWorkspaceLayout from '../../../components/ProjectWorkspaceLayout';

// Nucleus Project OS Components
import ChangeRequestDashboard from './projects/components/changeRequests/ChangeRequestDashboard';
import ChangeRequestDetailPage from './projects/ChangeRequestDetailPage';
import DeliverablesPage from './projects/DeliverablesPage';
import DeliverableDetail from './projects/DeliverableDetail';
import ApprovalsQueuePage from './projects/ApprovalsQueuePage';
import NucleusAnalyticsPage from './projects/NucleusAnalyticsPage';

// Operations Components
import OperationsOverview from './operations/OperationsOverview';

// Messaging Components removed - only supra-admin messaging remains

// Settings Components
import SettingsOverview from './settings/SettingsOverview';
import OrgProfile from './settings/OrgProfile';
import WorkspaceSettingsPage from './settings/WorkspaceSettingsPage';

// Documents (built-in word processor)
import DocumentsHub from './documents/DocumentsHub';
import DocumentEditor from './documents/DocumentEditor';
import ApprovalQueue from './documents/ApprovalQueue';
import DocumentAuditView from './documents/DocumentAuditView';

// Software House Components
import Development from './software-house/Development';
import TimeTracking from './software-house/TimeTracking';

// Client Portal Components - REMOVED COMPLETELY

// Clients Components
import Clients from './Clients';
import ClientContracts from './ClientContracts';
import ClientCommunications from './ClientCommunications';
import ClientBilling from './ClientBilling';

// Permissions Components
import PermissionsList from './permissions/PermissionsList';
import CreatePermission from './permissions/CreatePermission';

// Roles Components
import RolesList from './roles/RolesList';
import CreateRole from './roles/CreateRole';

// Departments Components
import DepartmentsList from './departments/DepartmentsList';
import CreateDepartment from './departments/CreateDepartment';
import DepartmentDashboard from './departments/DepartmentDashboard';
import DepartmentAccessManagement from './departments/DepartmentAccessManagement';
import AuditLogPage from './audit/AuditLogPage';

// Smart catch-all component to prevent redirect loops
const CatchAllRoute = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  React.useEffect(() => {
    const pathname = location.pathname;
    
    // Don't redirect if path contains /create (form pages)
    if (pathname.includes('/create')) {
      return;
    }
    
    // Don't redirect valid routes (departments, users, roles, permissions, employee portal, etc.)
    const validRoutes = ['/departments', '/users', '/roles', '/permissions', '/projects', '/hr', '/finance', '/analytics', '/settings', '/clients', '/operations', '/documents', '/software-house', '/employee-portal', '/audit'];
    if (validRoutes.some(route => pathname.includes(route))) {
      return;
    }
    
    // If path already ends with /home or /dashboard, don't redirect (prevent loop)
    if (pathname.endsWith('/home') || pathname.endsWith('/dashboard')) {
      return;
    }

    // Otherwise, redirect to home
    navigate('home', { replace: true });
  }, [location.pathname, navigate]);
  
  return null; // This component only handles redirects
};

const TenantOrg = () => {
  const { tenantSlug } = useParams();
  
  return (
    <TenantAuthProvider>
      <TenantThemeProvider tenantSlug={tenantSlug}>
        <TenantOrgLayout>
          <Routes>
          {/* Dashboard Routes */}
          <Route index element={<Navigate to="home" replace />} />
          <Route path="home" element={<AppHome />} />
          <Route path="dashboard" element={<DynamicDashboard />} />
          <Route path="dashboard/analytics" element={<DashboardAnalytics />} />

          {/* My Work Route */}
          <Route path="my-work" element={<MyWork />} />

          {/* Analytics Routes */}
          <Route path="analytics" element={<AnalyticsOverview />} />
          <Route path="analytics/reports" element={<AnalyticsReports />} />

          {/* User Management Routes */}
          <Route path="users" element={<UserList />} />
          <Route path="users/create" element={<UserCreate />} />
          <Route path="users/:id" element={<UserProfile />} />

          {/* Permissions Routes */}
          <Route path="permissions" element={<PermissionsList />} />
          <Route path="permissions/create" element={<CreatePermission />} />

          {/* Roles Routes */}
          <Route path="roles" element={<RolesList />} />
          <Route path="roles/create" element={<CreateRole />} />

          {/* Departments Routes */}
          <Route path="departments" element={<DepartmentsList />} />
          <Route path="departments/create" element={<CreateDepartment />} />
          <Route path="departments/access" element={<DepartmentAccessManagement />} />
          <Route path="departments/:departmentId/dashboard" element={<DepartmentDashboard />} />

          {/* Audit log (Phase 2) — CEO / owner / admin */}
          <Route path="audit" element={<AuditLogPage />} />

          {/* HR Routes - Support both /hr and /software-house/hr paths */}
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

          {/* Software House HR Routes (HRM is dedicated to software houses) */}
          <Route path="software-house/hr" element={<HROverview />} />
          <Route path="software-house/hr/employees" element={<EmployeeList />} />
          <Route path="software-house/hr/employees/create" element={<EmployeeCreate />} />
          <Route path="software-house/hr/employees/:id" element={<EmployeeDetail />} />
          <Route path="software-house/hr/payroll" element={<PayrollManagement />} />
          <Route path="software-house/hr/attendance" element={<AttendanceManagement />} />
          <Route path="software-house/hr/leave-requests" element={<HRLeaveRequests />} />
          <Route path="software-house/hr/performance" element={<HRPerformance />} />
          <Route path="software-house/hr/recruitment" element={<HRRecruitment />} />
          <Route path="software-house/hr/onboarding" element={<HROnboarding />} />
          <Route path="software-house/hr/training" element={<HRTraining />} />

          {/* Software House Employee Portal */}
          <Route path="software-house/employee-portal/*" element={<EmployeePortal />} />

          {/* Finance Routes */}
          <Route path="finance" element={<FinanceOverview />} />
          <Route path="finance/chart-of-accounts" element={<ChartOfAccounts />} />
          <Route path="finance/accounts-payable" element={<AccountsPayable />} />
          <Route path="finance/accounts-receivable" element={<AccountsReceivable />} />
          <Route path="finance/invoices" element={<AccountsReceivable />} />
          <Route path="finance/budgeting" element={<FinanceBudgeting />} />
          <Route path="finance/time-expenses" element={<TimeExpenses />} />
          <Route path="finance/reporting" element={<Reporting />} />
          <Route path="finance/banking" element={<BankingManagement />} />
          <Route path="finance/billing-engine" element={<BillingEngine />} />
          <Route path="finance/project-costing" element={<ProjectCosting />} />
          <Route path="finance/cash-flow" element={<CashFlow />} />

          {/* Workspace routes - Redirect to projects (deprecated workspace nav) */}
          <Route path="workspaces" element={<Navigate to="../projects" replace />} />
          <Route path="workspaces/*" element={<Navigate to="../projects" replace />} />
          
          {/* Project Routes - literals first so they are not matched as :projectId */}
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
          {/* Project workspace: single dashboard for a project (sidebar disclosed) */}
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

          {/* Operations Routes */}
          <Route path="operations" element={<OperationsOverview />} />

          {/* Messaging Routes removed - only supra-admin messaging remains */}

          {/* Settings Routes */}
          <Route path="settings" element={<SettingsOverview />} />
          <Route path="settings/organization" element={<OrgProfile />} />
          <Route path="settings/workspace" element={<WorkspaceSettingsPage />} />

          {/* Documents (built-in word processor) */}
          <Route path="documents" element={<DocumentsHub />} />
          <Route path="documents/approval-queue" element={<ApprovalQueue />} />
          <Route path="documents/audit" element={<DocumentAuditView />} />
          <Route path="documents/new" element={<DocumentEditor />} />
          <Route path="documents/:id" element={<DocumentEditor />} />
          
          {/* Profile Route (for current user) */}
          <Route path="profile" element={<UserProfile />} />

          {/* Software House Routes */}
          <Route path="software-house/development" element={<Development />} />
          <Route path="software-house/time-tracking" element={<TimeTracking />} />
          
          {/* Client Portal Routes - REMOVED COMPLETELY */}

          {/* Client Routes */}
          <Route path="clients" element={<Clients />} />
          <Route path="clients/contracts" element={<ClientContracts />} />
          <Route path="clients/communications" element={<ClientCommunications />} />
          <Route path="clients/billing" element={<ClientBilling />} />

          {/* Catch all route - redirect to main org dashboard */}
          <Route path="*" element={<CatchAllRoute />} />
          </Routes>
        </TenantOrgLayout>
      </TenantThemeProvider>
    </TenantAuthProvider>
  );
};

export default TenantOrg;
