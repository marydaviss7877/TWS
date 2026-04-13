/**
 * Unified Permission Resolution (UPR) — Plan Phase 1.
 * Single source of truth: resolveUserPermissions(userId, tenantId) produces a flat permission set
 * from TenantUser.primaryRole, TenantDepartmentAccess.permissions, and TenantUser.roles[].permissions.
 * Results are cached; cache is invalidated on grant/revoke/expiry/offboard.
 */

const TenantUser = require('../../models/TenantUser');
const TenantDepartmentAccess = require('../../models/TenantDepartmentAccess');
const TenantRole = require('../../models/TenantRole');
const permissionCache = require('./permissionCache.service');

// ---------------------------------------------------------------------------
// Base permissions per primary role (module:action or *:* for owner)
// Align with UNIFIED_ACCESS_AND_ROLE_SYSTEM_PLAN Part D and Part I
// ---------------------------------------------------------------------------
const BASE_ROLE_PERMISSIONS = {
  owner: ['*:*'],
  admin: [
    'projects:read', 'projects:write', 'tasks:read', 'tasks:write', 'documents:read', 'documents:write',
    'hr:read', 'hr:write', 'employees:read', 'employees:write', 'attendance:read', 'attendance:write',
    'leave:read', 'leave:write', 'payroll:read', 'payroll:write',
    'finance:read', 'finance:write',
    'analytics:read', 'reports:read', 'audit:read', 'clients:read', 'clients:write',
    'settings:read', 'settings:write', 'nucleus:read', 'nucleus:write', 'teams:read', 'teams:write'
  ],
  manager: [
    'projects:read', 'tasks:read', 'tasks:write', 'documents:read', 'documents:write',
    'attendance:read', 'leave:read', 'leave:write', 'analytics:read', 'nucleus:read', 'nucleus:write',
    'teams:read', 'teams:write',
    'finance:read'
  ],
  project_manager: [
    'projects:read', 'projects:write', 'tasks:read', 'tasks:write', 'documents:read', 'documents:write',
    'nucleus:read', 'nucleus:write', 'clients:read', 'analytics:read', 'teams:read', 'teams:write',
    'finance:read'
  ],
  hr: [], // resolved via HR_SUBROLE_PERMISSIONS when hrSubRole is set
  finance: [], // resolved via FINANCE_SUBROLE_PERMISSIONS when financeSubRole is set
  employee: [
    'projects:read', 'tasks:read', 'documents:read', 'attendance:read', 'leave:read', 'leave:write',
    'nucleus:read', 'payroll:read_own', 'teams:read',
    // Employee portal: own HR profile only (GET /hr/employees?userId=<self>); not full roster
    'employees:read_own',
    'finance:read'
  ],
  contractor: [
    'tasks:read', 'tasks:write', 'documents:read', 'nucleus:read', 'attendance:read', 'attendance:write',
    'employees:read_own',
    'finance:read'
  ],
  client: [
    'projects:read', 'nucleus:read', 'documents:read'
  ]
};

const HR_SUBROLE_PERMISSIONS = {
  manager: [
    'hr:read', 'hr:write', 'employees:read', 'employees:write', 'payroll:read', 'payroll:write',
    'attendance:read', 'attendance:write', 'leave:read', 'leave:write', 'reports:read', 'audit:read'
  ],
  executive: [
    'hr:read', 'employees:read', 'attendance:read', 'attendance:write', 'leave:read', 'leave:write',
    'reports:read'
  ],
  payroll_officer: [
    'payroll:read', 'payroll:write', 'hr:read', 'employees:read', 'attendance:read', 'reports:read'
  ]
};

/**
 * Normalize department permission string to module:action.
 * TenantDepartmentAccess.permissions are 'read'|'write'|'admin'|'delete'|...
 * We map to module from department or use a generic 'department' module.
 */
function deptPermsToModuleActions(permissions, _departmentId) {
  if (!Array.isArray(permissions)) return [];
  const out = [];
  const modules = ['projects', 'hr', 'documents', 'analytics', 'audit', 'clients', 'settings', 'nucleus'];
  for (const p of permissions) {
    if (p === 'read') modules.forEach(m => out.push(m + ':read'));
    else if (p === 'write') modules.forEach(m => out.push(m + ':write'));
    else if (p === 'admin') modules.forEach(m => out.push(m + ':read', m + ':write'));
    else out.push('department:' + p);
  }
  return [...new Set(out)];
}

/**
 * Resolve flat permission set for a user in a tenant.
 * Source A: BASE_ROLE_PERMISSIONS[primaryRole] (or HR_SUBROLE_PERMISSIONS[hrSubRole] when role is hr)
 * Source B: TenantDepartmentAccess.permissions (active, not expired)
 * Source C: TenantUser.roles[].permissions (resource:actions) and TenantRole.permissions if present
 * @param {string|ObjectId} userId
 * @param {string|ObjectId} tenantId
 * @param {{ hrSubRole?: string }} [opts] — hrSubRole when primaryRole is 'hr'
 * @returns {Promise<{ permissions: string[], departmentIds: string[], projectIds?: string[], hrSubRole?: string }>}
 */
async function resolveUserPermissions(userId, tenantId, opts = {}) {
  const tenantIdStr = String(tenantId);
  const userIdStr = String(userId);

  const tenantUser = await TenantUser.findOne({ userId, tenantId, status: 'active' })
    .select('roles status hrSubRole')
    .lean();
  if (!tenantUser) {
    // Legacy / edge: active User in tenant org but no TenantUser row yet — grant base role perms
    // so employee portal (attendance, self employee record) is not hard-denied.
    try {
      const Tenant = require('../../models/Tenant');
      const User = require('../../models/User');
      const [tenantDoc, userDoc] = await Promise.all([
        Tenant.findById(tenantId).select('organizationId orgId').lean(),
        User.findById(userId).select('orgId role status').lean()
      ]);
      if (!tenantDoc || !userDoc || userDoc.status !== 'active') {
        return { permissions: [], departmentIds: [], hrSubRole: null };
      }
      const tOrg = (tenantDoc.organizationId || tenantDoc.orgId)?.toString();
      const uOrgRaw = userDoc.orgId;
      const uOrg = (uOrgRaw && (typeof uOrgRaw === 'object' && uOrgRaw._id ? uOrgRaw._id : uOrgRaw))?.toString();
      if (tOrg && uOrg && tOrg === uOrg) {
        const primaryRole = userDoc.role || 'employee';
        let basePerms = BASE_ROLE_PERMISSIONS[primaryRole] || BASE_ROLE_PERMISSIONS.employee;
        if (primaryRole === 'hr') {
          basePerms = HR_SUBROLE_PERMISSIONS.manager || [];
        }
        return {
          permissions: [...basePerms],
          departmentIds: [],
          hrSubRole: null
        };
      }
    } catch (e) {
      console.warn('resolveUserPermissions org fallback failed:', e.message);
    }
    return { permissions: [], departmentIds: [], hrSubRole: null };
  }

  const primaryRole = tenantUser.roles?.[0]?.role || 'employee';
  let basePerms = BASE_ROLE_PERMISSIONS[primaryRole] || BASE_ROLE_PERMISSIONS.employee;
  const hrSubRole = opts.hrSubRole ?? tenantUser.hrSubRole ?? null;

  if (primaryRole === 'hr' && hrSubRole) {
    const hrPerms = HR_SUBROLE_PERMISSIONS[hrSubRole];
    if (hrPerms) basePerms = hrPerms;
  } else if (primaryRole === 'hr') {
    basePerms = HR_SUBROLE_PERMISSIONS.manager || []; // default HR to manager subset when no hrSubRole
  }

  const deptAccess = await TenantDepartmentAccess.find({
    tenantId,
    userId,
    status: 'active',
    $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: new Date() } }]
  }).lean();

  const departmentIds = [...new Set(
    deptAccess
      .map(d => (d.departmentId && (d.departmentId._id || d.departmentId))?.toString())
      .filter(Boolean)
  )];

  let deptPerms = [];
  for (const d of deptAccess) {
    if (d.permissions && d.permissions.length) {
      deptPerms = deptPerms.concat(deptPermsToModuleActions(d.permissions, d.departmentId));
    }
  }

  let rolePerms = [];
  if (tenantUser.roles) {
    for (const r of tenantUser.roles) {
      if (r.permissions && Array.isArray(r.permissions)) {
        for (const p of r.permissions) {
          if (p.resource && p.actions) {
            p.actions.forEach(a => rolePerms.push(p.resource + ':' + a));
          }
        }
      }
    }
  }

  try {
    const tenantRole = await TenantRole.findOne({
      tenantId,
      userId,
      isActive: true
    }).select('permissions').lean();
    if (tenantRole?.permissions?.length) {
      tenantRole.permissions.forEach(p => {
        if (typeof p === 'string' && p.includes(':')) rolePerms.push(p);
        else if (typeof p === 'string') rolePerms.push(p + ':read');
      });
    }
  } catch (_) {
    // TenantRole may not exist in some deployments
  }

  const all = [].concat(
    basePerms.includes('*:*') ? ['*:*'] : basePerms,
    deptPerms,
    rolePerms
  );
  const permissions = [...new Set(all)];

  const result = {
    permissions,
    departmentIds: primaryRole === 'owner' ? ['*'] : departmentIds,
    hrSubRole: primaryRole === 'hr' ? hrSubRole : null
  };
  return result;
}

/**
 * Get resolved permissions for user in tenant (cache-first). On cache miss, resolve and cache.
 * @param {string|ObjectId} userId
 * @param {string|ObjectId} tenantId
 * @param {{ hrSubRole?: string }} [opts]
 * @returns {Promise<{ permissions: string[], departmentIds: string[], hrSubRole?: string }>}
 */
async function getResolvedPermissions(userId, tenantId, opts = {}) {
  const tenantIdStr = String(tenantId);
  const userIdStr = String(userId);

  const cached = await permissionCache.getResolved(tenantIdStr, userIdStr);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      // Empty cache entries from before TenantUser/org fallback — re-resolve once
      if (parsed && Array.isArray(parsed.permissions) && parsed.permissions.length === 0) {
        const fresh = await resolveUserPermissions(userId, tenantId, opts);
        if (fresh.permissions.length > 0) {
          await permissionCache.setResolved(tenantIdStr, userIdStr, fresh);
          return fresh;
        }
      }
      return parsed;
    } catch (_) {}
  }

  const resolved = await resolveUserPermissions(userId, tenantId, opts);
  await permissionCache.setResolved(tenantIdStr, userIdStr, resolved);
  return resolved;
}

/**
 * Check if resolved permission set allows module:action.
 * @param {string[]} permissions — from getResolvedPermissions().permissions
 * @param {string} module — e.g. 'payroll', 'projects'
 * @param {string} action — e.g. 'read', 'write', 'admin'
 * @returns {boolean}
 */
function hasPermission(permissions, module, action) {
  if (!Array.isArray(permissions)) return false;
  if (permissions.includes('*:*')) return true;
  if (permissions.includes(module + ':*')) return true;
  if (permissions.includes(module + ':' + action)) return true;
  // 'admin' implies 'write' (Plan Phase 2.2 — payroll:admin = owner/custom role)
  if (action === 'admin' && permissions.includes(module + ':write')) return true;
  return false;
}

/**
 * Check if user has any of the given module:actions.
 * @param {string[]} permissions
 * @param {string} module
 * @param {string[]} actions
 * @returns {boolean}
 */
function hasAnyPermission(permissions, module, actions) {
  if (!Array.isArray(actions)) return hasPermission(permissions, module, actions);
  return actions.some(a => hasPermission(permissions, module, a));
}

/**
 * Invalidate cache for a user (call on grant/revoke/expiry/offboard/hrSubRole/role change).
 * Optionally add to revocation list so sensitive routes deny immediately.
 * @param {string|ObjectId} tenantId
 * @param {string|ObjectId} userId
 * @param {{ addRevoked?: boolean }} [opts] — set addRevoked: true when revoking access
 */
async function invalidateResolvedPermissions(tenantId, userId, opts = {}) {
  const tenantIdStr = String(tenantId);
  const userIdStr = String(userId);
  await permissionCache.delResolved(tenantIdStr, userIdStr);
  if (opts.addRevoked) {
    await permissionCache.addRevoked(tenantIdStr, userIdStr);
  }
}

/**
 * Invalidate resolved permissions for entire tenant (e.g. tenant suspended).
 */
async function invalidateResolvedForTenant(tenantId) {
  await permissionCache.delResolvedForTenant(String(tenantId));
}

module.exports = {
  BASE_ROLE_PERMISSIONS,
  HR_SUBROLE_PERMISSIONS,
  resolveUserPermissions,
  getResolvedPermissions,
  hasPermission,
  hasAnyPermission,
  invalidateResolvedPermissions,
  invalidateResolvedForTenant
};
