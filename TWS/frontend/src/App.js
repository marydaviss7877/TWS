import React, { useEffect, useMemo } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './app/providers/AuthContext';
import { SocketProvider } from './app/providers/SocketContext';
import { ThemeProvider } from './app/providers/ThemeContext';
import { useRoleBasedUI } from './shared/hooks/useRoleBasedUI';
import { setupGlobalErrorHandling } from './shared/utils/errorHandler';
import { tenantPath } from './shared/utils/tenantRoutes';
import { getTenantWorkspaceUrl } from './shared/utils/subdomain';

// Import TWS Premium Design System
import './assets/tws-premium-design-system.css';
import './assets/software-house-premium.css';

// Login Components
import SupraAdminLogin from './features/auth/pages/SupraAdminLogin';
import SoftwareHouseSignup from './features/auth/pages/SoftwareHouseSignup';
import SoftwareHouseLogin from './features/auth/pages/SoftwareHouseLogin';
import SoftwareHouseForgotPassword from './features/auth/pages/SoftwareHouseForgotPassword';
import SoftwareHouseLanding from './features/auth/pages/SoftwareHouseLanding';
import InviteAccept from './features/auth/pages/InviteAccept';
import FinanceSystemPage from './features/auth/pages/FinanceSystemPage';
import HRMSystemPage from './features/auth/pages/HRMSystemPage';
import ProjectSystemPage from './features/auth/pages/ProjectSystemPage';

// Legacy Components (to be gradually replaced)
import RoleGuard from './features/auth/components/RoleGuard';
import LoadingSpinner from './shared/components/feedback/LoadingSpinner';
import PageNotFound from './shared/pages/PageNotFound';
import BackendHealthCheck from './shared/components/monitoring/BackendHealthCheck';
import MonitoringSystemStatus from './shared/components/monitoring/MonitoringSystemStatus';
import AccessDenied from './shared/components/feedback/AccessDenied';

// Page Components
import Dashboard from './features/dashboard/pages/Dashboard';
import Projects from './features/projects/pages/Projects';
import ProjectBoard from './features/projects/pages/ProjectBoard';
import Templates from './features/projects/pages/Templates';
import Employees from './features/employees/pages/Employees';
import EmployeeProfile from './features/employees/pages/EmployeeProfile';
import Attendance from './features/employees/pages/Attendance';
import TenantDashboard from './features/tenant/pages/TenantDashboard';
import TenantOrg from './features/tenant/pages/tenant/org/TenantOrg';

// System Admin Pages
import SystemIntegrations from './features/admin/pages/system-admin/SystemIntegrations';

// SupraAdmin Pages
import SupraAdmin from './features/admin/pages/SupraAdmin/SupraAdmin';

// Hard-navigates the browser for cross-subdomain redirects.
// Falls back to <Navigate> for relative paths (same origin).
const ExternalRedirect = ({ to }) => {
  useEffect(() => { window.location.href = to; }, [to]);
  return <LoadingSpinner />;
};
const SmartRedirect = ({ to, replace }) =>
  to.startsWith('http') ? <ExternalRedirect to={to} /> : <Navigate to={to} replace={replace} />;

function ScrollToTopOnRouteChange() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return null;
}

function App() {
  const { user, loading } = useAuth();
  const { canAccessPath } = useRoleBasedUI();

  // Create a stable routing key to prevent unnecessary re-renders
  const routingKey = useMemo(() => {
    if (!user) return 'unauthenticated';
    return `${user.role}-${user.id}`;
  }, [user?.role, user?.id]);

  // Initialize global error handling for external scripts
  useEffect(() => {
    setupGlobalErrorHandling();
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <ThemeProvider>
      <SocketProvider>
        <ScrollToTopOnRouteChange />
        <Routes key={routingKey}>
          {/* Public Routes */}
          <Route
            path="/supra-admin-login"
            element={user ? <Navigate to="/supra-admin" replace /> : <SupraAdminLogin />}
          />
          {/* /login redirects to software house login (for employee/admin login links that use /login) */}
          <Route path="/login" element={<Navigate to="/software-house-login" replace />} />
          {/* Portal invite acceptance — public, no auth required */}
          <Route path="/invite/accept" element={<InviteAccept />} />
          <Route
            path="/software-house-login"
            element={user ? (() => {
              // Redirect only when we have tenantSlug (from localStorage or user) so we don't
              // redirect to "/" before SoftwareHouseLogin has set tenantData after a fresh login
              try {
                const tenantData = JSON.parse(localStorage.getItem('tenantData'));
                const tenantSlug = tenantData?.slug ||
                  (typeof user.tenantId === 'string' && !user.tenantId?.match?.(/^[0-9a-f]{24}$/i) ? user.tenantId : null) ||
                  (typeof user.orgId === 'object' && user.orgId?.slug) ? user.orgId.slug : null;
                const clientRoles = ['client', 'customer'];
                if (tenantSlug) {
                  const dest = clientRoles.includes(user?.role)
                    ? getTenantWorkspaceUrl(tenantSlug, 'org', 'client-portal')
                    : getTenantWorkspaceUrl(tenantSlug, 'org', 'home');
                  return <SmartRedirect to={dest} replace />;
                }
              } catch (e) {
                console.error('Error determining software house redirect:', e);
              }
              // No tenantSlug yet (e.g. login just succeeded and handleSubmit hasn't set localStorage)
              // Keep showing login so it can complete and navigate
              return <SoftwareHouseLogin />;
            })() : <SoftwareHouseLogin />}
          />
          <Route
            path="/software-house-signup"
            element={user ? <Navigate to="/" replace /> : <SoftwareHouseSignup />}
          />
          <Route
            path="/software-house-forgot-password"
            element={user ? <Navigate to="/" replace /> : <SoftwareHouseForgotPassword />}
          />
          <Route
            path="/forgot-password"
            element={<Navigate to="/software-house-forgot-password" replace />}
          />
          <Route
            path="/software-house"
            element={<SoftwareHouseLanding />}
          />
          <Route
            path="/software-house/finance"
            element={<FinanceSystemPage />}
          />
          <Route
            path="/software-house/hrm"
            element={<HRMSystemPage />}
          />
          <Route
            path="/software-house/projects"
            element={<ProjectSystemPage />}
          />
          <Route
            path="/software-house/analytics"
            element={<Navigate to="/software-house/projects" replace />}
          />
          <Route
            path="/access-denied"
            element={<AccessDenied />}
          />

          {/* Debug route */}
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

          {/* Landing redirects to Software House */}
          <Route path="/landing" element={<Navigate to="/software-house" replace />} />

          <Route path="/monitoring-status" element={<MonitoringSystemStatus />} />

          {/* SupraAdmin access route */}
          <Route
            path="/supra-admin/*"
            element={user && user.role === 'super_admin' ? <SupraAdmin /> : <Navigate to="/supra-admin-login" replace />}
          />

          {/* Tenant Routes (FR2: /<tenant-slug>/... e.g. app.nexaerp.com/<tenant-slug>) */}
          <Route path="/:tenantSlug/dashboard" element={<TenantDashboard />} />
          <Route path="/:tenantSlug/org/*" element={<TenantOrg />} />

          {user ? (
            ['admin', 'finance_manager', 'finance', 'project_manager', 'owner', 'org_manager', 'manager', 'ceo', 'cfo', 'hr', 'employee', 'staff', 'developer', 'engineer', 'programmer', 'department_lead', 'pmo', 'contributor', 'contractor', 'client', 'customer'].includes(user.role) ? (
              <Route path="/" element={(() => {
                let slug;
                try {
                  const tenantData = JSON.parse(localStorage.getItem('tenantData'));
                  slug = tenantData?.slug || (typeof user.tenantId === 'string' && !user.tenantId.match(/^[0-9a-f]{24}$/i)) ? user.tenantId :
                    (typeof user.orgId === 'object' && user.orgId?.slug) ? user.orgId.slug :
                      (typeof user.orgId === 'string') ? user.orgId : 'demo';
                } catch {
                  slug = (typeof user.tenantId === 'string' && !user.tenantId.match(/^[0-9a-f]{24}$/i)) ? user.tenantId :
                    (typeof user.orgId === 'object' && user.orgId?.slug) ? user.orgId.slug :
                      (typeof user.orgId === 'string') ? user.orgId : 'demo';
                }
                const subPath = ['client', 'customer'].includes(user.role) ? 'client-portal' : 'home';
                const dest = getTenantWorkspaceUrl(slug, 'org', subPath);
                return <SmartRedirect to={dest} replace />;
              })()} />
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

          {/* Catch-all 404 route - must be last to catch all unmatched routes */}
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </SocketProvider>
    </ThemeProvider>
  );
}

export default App;
