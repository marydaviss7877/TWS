/**
 * Read-only catalog of roles aligned with UPR + Software House project roles.
 * Used by GET /organization/role-catalog and role import into Mongo Role collection.
 */

const PROJECT_MANAGEMENT_PERMISSIONS = require('../../config/projectManagementPermissions');
const {
  BASE_ROLE_PERMISSIONS,
  HR_SUBROLE_PERMISSIONS,
  FINANCE_SUBROLE_PERMISSIONS
} = require('./permissionResolver.service');

function humanizeKey(key) {
  return String(key)
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Permission codes granted to a Software House project role (ignores scope; keys are codes).
 * Wildcard-only roles yield an empty list (enforcement is middleware-side).
 */
function codesFromProjectRole(perms) {
  if (!perms || typeof perms !== 'object') return [];
  const keys = Object.keys(perms).filter((k) => k !== '*');
  if (keys.length === 0 && perms['*'] === true) return [];
  return [...keys].sort();
}

function buildRoleCatalog() {
  const shEntries = Object.entries(PROJECT_MANAGEMENT_PERMISSIONS).map(([roleKey, perms]) => {
    const permissionCodes = codesFromProjectRole(perms);
    const catalogSlug = `sh-${roleKey}`;
    return {
      catalogSlug,
      sourceKey: roleKey,
      name: `${humanizeKey(roleKey)} (project)`,
      description:
        permissionCodes.length === 0 && perms && perms['*'] === true
          ? 'Software House project role with wildcard enforcement in middleware (no discrete codes).'
          : `Software House project member role: ${humanizeKey(roleKey)}.`,
      permissionCodes,
      permissionCount: permissionCodes.length
    };
  });

  const orgEntries = Object.entries(BASE_ROLE_PERMISSIONS).map(([roleKey, list]) => {
    const permissionCodes = Array.isArray(list) ? [...new Set(list.filter(Boolean))].sort() : [];
    return {
      catalogSlug: roleKey,
      sourceKey: roleKey,
      name: humanizeKey(roleKey),
      description: `Organization primary role (UPR): ${humanizeKey(roleKey)}.`,
      permissionCodes,
      permissionCount: permissionCodes.length
    };
  });

  const hrEntries = Object.entries(HR_SUBROLE_PERMISSIONS).map(([subKey, list]) => {
    const permissionCodes = Array.isArray(list) ? [...new Set(list.filter(Boolean))].sort() : [];
    const catalogSlug = `hr-${subKey}`;
    return {
      catalogSlug,
      sourceKey: subKey,
      name: `${humanizeKey(subKey)} (HR sub-role)`,
      description: `When primary role is HR, sub-role ${humanizeKey(subKey)} (UPR).`,
      permissionCodes,
      permissionCount: permissionCodes.length
    };
  });

  const financeEntries = Object.entries(FINANCE_SUBROLE_PERMISSIONS).map(([subKey, list]) => {
    const permissionCodes = Array.isArray(list) ? [...new Set(list.filter(Boolean))].sort() : [];
    const catalogSlug = `fin-${subKey}`;
    return {
      catalogSlug,
      sourceKey: subKey,
      name: `${humanizeKey(subKey)} (Finance sub-role)`,
      description: `When primary role is Finance, sub-role ${humanizeKey(subKey)} (UPR).`,
      permissionCodes,
      permissionCount: permissionCodes.length
    };
  });

  return {
    softwareHouse: {
      title: 'Software House — project member roles',
      description:
        'Used by project-management middleware. Slugs prefixed with sh- when imported as assignable MongoDB roles.',
      roleSystem: 'project_member',
      entries: shEntries
    },
    organization: {
      title: 'Organization — primary tenant roles (UPR)',
      description: 'Base roles from unified permission resolution before department access and custom grants.',
      roleSystem: 'tenant_primary',
      entries: orgEntries
    },
    organizationHrSubroles: {
      title: 'Organization — HR sub-roles (UPR)',
      description: 'Applies when the user\'s primary role is HR. Imported slugs use prefix hr-.',
      roleSystem: 'tenant_hr_subrole',
      entries: hrEntries
    },
    organizationFinanceSubroles: {
      title: 'Organization — Finance sub-roles (UPR)',
      description: 'Applies when the user\'s primary role is Finance. Imported slugs use prefix fin-.',
      roleSystem: 'tenant_finance_subrole',
      entries: financeEntries
    }
  };
}

module.exports = {
  buildRoleCatalog,
  humanizeKey,
  codesFromProjectRole
};
