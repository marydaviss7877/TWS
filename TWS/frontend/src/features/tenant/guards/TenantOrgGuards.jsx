import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useTenantAuth } from '../../../app/providers/TenantAuthContext';
import { useTenantSlug } from '../../../shared/hooks/useTenantSlug';
import { useTenantPermissions } from '../contexts/TenantPermissionsContext';
import AppHome from '../pages/tenant/org/dashboard/AppHome';
import OrgProfile from '../pages/tenant/org/settings/OrgProfile';
import ClientOrganizationProfile from '../components/ClientPortal/ClientOrganizationProfile';
import SettingsOverview from '../pages/tenant/org/settings/SettingsOverview';
import PageNotFound from '../../../shared/pages/PageNotFound';

const ELEVATED_ADMIN_ROLES = [
  'owner', 'admin', 'super_admin', 'org_manager', 'org_admin', 'tenant_owner',
];

export const CatchAllRoute = () => <PageNotFound />;

export const ClientAccessGate = ({ children }) => {
  const { user } = useTenantAuth();
  const tenantSlug = useTenantSlug();
  const location = useLocation();
  const normalizedRole = String(user?.role || '').toLowerCase();

  if (!['client', 'customer'].includes(normalizedRole)) {
    return children;
  }

  // Strip legacy /:tenantSlug/org prefix so the check works for both
  // clean paths (/client-portal) and legacy paths (/acme/org/client-portal).
  const orgPrefix = `/${tenantSlug}/org`;
  const normalizedPath = location.pathname.startsWith(orgPrefix)
    ? location.pathname.slice(orgPrefix.length) || '/'
    : location.pathname;

  const allowedPrefixes = ['/client-portal', '/settings/organization', '/home'];
  const isAllowed = normalizedPath === '/' || allowedPrefixes.some((p) => normalizedPath.startsWith(p));

  if (!isAllowed) {
    // No leading "../" — ClientAccessGate renders inside the org Route's own
    // element (above the Outlet), so its route context IS the org base already.
    // A relative "../" here would try to go a level above the org route itself.
    return <Navigate to="client-portal" replace />;
  }
  return children;
};

export const HomeRoute = () => {
  const { user } = useTenantAuth();
  const normalizedRole = String(user?.role || '').toLowerCase();
  if (['client', 'customer'].includes(normalizedRole)) {
    return <Navigate to="../client-portal" replace />;
  }
  if (normalizedRole === 'contractor') {
    return <Navigate to="../contractor/dashboard" replace />;
  }
  return <AppHome />;
};

export const EmployeeOnlyRoute = ({ children }) => {
  const { user } = useTenantAuth();
  const { hasModulePermission } = useTenantPermissions();
  const normalizedRole = String(user?.role || '').toLowerCase();
  if (['client', 'customer'].includes(normalizedRole)) {
    return <Navigate to="../client-portal" replace />;
  }
  const isPrivilegedByPermission =
    hasModulePermission?.('users', 'admin') ||
    hasModulePermission?.('projects', 'admin') ||
    hasModulePermission?.('finance', 'admin') ||
    hasModulePermission?.('payroll', 'admin');
  if (isPrivilegedByPermission) {
    return <Navigate to="../home" replace />;
  }
  return children;
};

export const HROnlyRoute = ({ children }) => {
  const { hasModulePermission } = useTenantPermissions();
  const canReadHr =
    hasModulePermission?.('employees', 'read') ||
    hasModulePermission?.('employees', 'read_own') ||
    hasModulePermission?.('payroll', 'read') ||
    hasModulePermission?.('payroll', 'read_own');
  if (!canReadHr) {
    return <Navigate to="../home" replace />;
  }
  return children;
};

export const OrganizationProfileRoute = () => {
  const { user } = useTenantAuth();
  const normalizedRole = String(user?.role || '').toLowerCase();
  if (['client', 'customer'].includes(normalizedRole)) {
    return <ClientOrganizationProfile />;
  }
  return <OrgProfile />;
};

export const OrganizationProfileAccessRoute = ({ children }) => {
  const { user } = useTenantAuth();
  const { hasModulePermission } = useTenantPermissions();
  const normalizedRole = String(user?.role || '').toLowerCase();
  if (['client', 'customer'].includes(normalizedRole)) {
    return children;
  }
  const canAdminSettings =
    hasModulePermission?.('settings', 'admin') || hasModulePermission?.('users', 'admin');
  const hasElevatedRole = ELEVATED_ADMIN_ROLES.includes(normalizedRole);
  if (!canAdminSettings && !hasElevatedRole) {
    return <Navigate to="../home" replace />;
  }
  return children;
};

export const SettingsRoute = () => {
  const { user } = useTenantAuth();
  const normalizedRole = String(user?.role || '').toLowerCase();
  if (['client', 'customer'].includes(normalizedRole)) {
    return <Navigate to="../client-portal" replace />;
  }
  return <SettingsOverview />;
};

export const AdminOnlySettingsRoute = ({ children }) => {
  const { user } = useTenantAuth();
  const { hasModulePermission } = useTenantPermissions();
  const normalizedRole = String(user?.role || '').toLowerCase();
  const canAdminSettings =
    hasModulePermission?.('settings', 'admin') || hasModulePermission?.('users', 'admin');
  const hasElevatedRole = ELEVATED_ADMIN_ROLES.includes(normalizedRole);
  if (!canAdminSettings && !hasElevatedRole) {
    return <Navigate to="../home" replace />;
  }
  return children;
};

export const AuditAccessRoute = ({ children }) => {
  const { user } = useTenantAuth();
  const { hasModulePermission } = useTenantPermissions();
  const normalizedRole = String(user?.role || '').toLowerCase();
  const canAdminSettings =
    hasModulePermission?.('settings', 'admin') || hasModulePermission?.('users', 'admin');
  const hasAuditRole = [
    'owner', 'admin', 'super_admin', 'ceo', 'department_lead',
    'org_manager', 'org_admin', 'tenant_owner',
  ].includes(normalizedRole);
  if (!canAdminSettings && !hasAuditRole) {
    return <Navigate to="../home" replace />;
  }
  return children;
};
