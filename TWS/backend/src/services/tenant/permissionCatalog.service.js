/**
 * Read-only catalog of permissions enforced by backend config (Software House project
 * roles + organization UPR base roles). Used by GET /organization/permission-catalog.
 */

const PROJECT_MANAGEMENT_PERMISSIONS = require('../../config/projectManagementPermissions');
const {
  BASE_ROLE_PERMISSIONS,
  HR_SUBROLE_PERMISSIONS,
  FINANCE_SUBROLE_PERMISSIONS
} = require('./permissionResolver.service');

/** @param {boolean|string} value */
function normalizeScope(value) {
  if (value === true) return 'full';
  if (typeof value === 'string') return value;
  return 'full';
}

function accessTypeLabel(scope) {
  switch (scope) {
    case 'full':
      return 'Full';
    case 'assigned':
      return 'Assigned resource only';
    case 'designated':
      return 'Designated approver / step';
    case 'client_step':
      return 'Client approval step';
    default:
      return String(scope);
  }
}

/**
 * Invert role → permission map into permission → roles (for tests and reuse).
 * @param {Record<string, Record<string, boolean|string>>} matrix
 * @returns {{ code: string, module: string, roles: { role: string, scope: string }[], rolesDisplay: string, accessTypes: string[] }[]}
 */
function invertProjectManagementPermissions(matrix) {
  const byCode = new Map();
  let superAdminWildcard = false;

  for (const [role, perms] of Object.entries(matrix)) {
    if (!perms || typeof perms !== 'object') continue;
    if (perms['*'] === true) {
      superAdminWildcard = true;
      continue;
    }
    for (const [code, value] of Object.entries(perms)) {
      if (code === '*') continue;
      if (!byCode.has(code)) byCode.set(code, new Map());
      byCode.get(code).set(role, normalizeScope(value));
    }
  }

  const entries = [...byCode.entries()].map(([code, roleMap]) => {
    const module = code.includes(':') ? code.slice(0, code.indexOf(':')) : code;
    const roles = [...roleMap.entries()]
      .map(([role, scope]) => ({ role, scope }))
      .sort((a, b) => a.role.localeCompare(b.role));
    const rolesDisplay = roles
      .map((r) => (r.scope === 'full' ? r.role : `${r.role} (${r.scope})`))
      .join(', ');
    const accessTypes = [...new Set(roles.map((r) => accessTypeLabel(r.scope)))].sort();
    return { code, module, roles, rolesDisplay, accessTypes };
  });
  entries.sort((a, b) => a.code.localeCompare(b.code));

  if (superAdminWildcard) {
    entries.unshift({
      code: '*',
      module: '(wildcard)',
      roles: [{ role: 'super_admin', scope: 'full' }],
      rolesDisplay: 'super_admin (all project-management permissions)',
      accessTypes: ['Full']
    });
  }

  return entries;
}

function invertPrimaryRolePermissions(baseRolePermissions) {
  const codeToRoles = new Map();
  for (const [role, list] of Object.entries(baseRolePermissions)) {
    if (!Array.isArray(list) || list.length === 0) continue;
    for (const code of list) {
      if (!codeToRoles.has(code)) codeToRoles.set(code, []);
      codeToRoles.get(code).push(role);
    }
  }
  return [...codeToRoles.entries()]
    .map(([code, roles]) => {
      const uniq = [...new Set(roles)].sort();
      const module = code.includes(':') ? code.slice(0, code.indexOf(':')) : code;
      return {
        code,
        module,
        scope: 'full',
        roles: uniq.map((role) => ({ role, scope: 'full' })),
        rolesDisplay: uniq.join(', '),
        accessTypes: ['Full']
      };
    })
    .sort((a, b) => a.code.localeCompare(b.code));
}

function invertFinanceSubrolePermissions(finSub) {
  const codeToLabels = new Map();
  for (const [sub, list] of Object.entries(finSub)) {
    if (!Array.isArray(list)) continue;
    const label = `finance (${sub})`;
    for (const code of list) {
      if (!codeToLabels.has(code)) codeToLabels.set(code, []);
      codeToLabels.get(code).push(label);
    }
  }
  return [...codeToLabels.entries()]
    .map(([code, labels]) => {
      const uniq = [...new Set(labels)].sort();
      const module = code.includes(':') ? code.slice(0, code.indexOf(':')) : code;
      return {
        code,
        module,
        scope: 'full',
        roles: uniq.map((role) => ({ role, scope: 'full', displayRole: role })),
        rolesDisplay: uniq.join(', '),
        accessTypes: ['Full']
      };
    })
    .sort((a, b) => a.code.localeCompare(b.code));
}

function invertHrSubrolePermissions(hrSub) {
  const codeToLabels = new Map();
  for (const [sub, list] of Object.entries(hrSub)) {
    if (!Array.isArray(list)) continue;
    const label = `hr (${sub})`;
    for (const code of list) {
      if (!codeToLabels.has(code)) codeToLabels.set(code, []);
      codeToLabels.get(code).push(label);
    }
  }
  return [...codeToLabels.entries()]
    .map(([code, labels]) => {
      const uniq = [...new Set(labels)].sort();
      const module = code.includes(':') ? code.slice(0, code.indexOf(':')) : code;
      return {
        code,
        module,
        scope: 'full',
        roles: uniq.map((role) => ({ role, scope: 'full', displayRole: role })),
        rolesDisplay: uniq.join(', '),
        accessTypes: ['Full']
      };
    })
    .sort((a, b) => a.code.localeCompare(b.code));
}

function buildPermissionCatalog() {
  return {
    softwareHouse: {
      title: 'Software House — project management',
      description:
        'Enforced by project-management middleware using project member roles (not the same labels as tenant primary roles).',
      roleSystem: 'project_member',
      entries: invertProjectManagementPermissions(PROJECT_MANAGEMENT_PERMISSIONS)
    },
    organization: {
      title: 'Organization — primary tenant roles (UPR)',
      description:
        'Base permission strings from unified permission resolution before department access and custom role grants.',
      roleSystem: 'tenant_primary',
      entries: invertPrimaryRolePermissions(BASE_ROLE_PERMISSIONS)
    },
    organizationHrSubroles: {
      title: 'Organization — HR sub-roles (UPR)',
      description: 'When a user\'s primary role is hr, these strings apply by hrSubRole.',
      roleSystem: 'tenant_hr_subrole',
      entries: invertHrSubrolePermissions(HR_SUBROLE_PERMISSIONS)
    },
    organizationFinanceSubroles: {
      title: 'Organization — Finance sub-roles (UPR)',
      description: 'When a user\'s primary role is finance, these strings apply by financeSubRole.',
      roleSystem: 'tenant_finance_subrole',
      entries: invertFinanceSubrolePermissions(FINANCE_SUBROLE_PERMISSIONS)
    }
  };
}

module.exports = {
  invertProjectManagementPermissions,
  invertPrimaryRolePermissions,
  invertHrSubrolePermissions,
  invertFinanceSubrolePermissions,
  buildPermissionCatalog
};
