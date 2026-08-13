const ADMIN_PORTAL_ROLES = new Set([
  'admin', 'owner', 'super_admin', 'org_manager', 'org_admin', 'tenant_owner'
]);
const CLIENT_PORTAL_ROLES = new Set(['client', 'customer']);

function resolvePortalForRole(role) {
  const normalizedRole = String(role || '').trim().toLowerCase();
  if (ADMIN_PORTAL_ROLES.has(normalizedRole)) return 'admin';
  if (CLIENT_PORTAL_ROLES.has(normalizedRole)) return 'client';
  return 'employee';
}

function roleCanUsePortal(role, portal) {
  const normalizedPortal = String(portal || '').trim().toLowerCase();
  return ['admin', 'employee', 'client'].includes(normalizedPortal)
    && resolvePortalForRole(role) === normalizedPortal;
}

module.exports = { resolvePortalForRole, roleCanUsePortal };
