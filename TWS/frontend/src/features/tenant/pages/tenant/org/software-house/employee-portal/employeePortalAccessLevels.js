/**
 * Employee Portal Access Level System
 * Maps user roles to labels and which portal sections they can access.
 * Used for sidebar menu filtering and route protection.
 */

// Portal section keys (must match route paths and menu item ids)
export const PORTAL_SECTIONS = {
  DASHBOARD: 'dashboard',
  WORKSPACES: 'workspaces',
  PROFILE: 'profile',
  ATTENDANCE: 'attendance',
  LEAVE: 'leave',
  PERFORMANCE: 'performance',
  PAYROLL: 'payroll',
  DOCUMENTS: 'documents'
};

// Access levels with display label and which sections are allowed
export const ACCESS_LEVELS = {
  // Executive
  ceo: {
    label: 'CEO',
    sections: Object.values(PORTAL_SECTIONS)
  },
  cfo: {
    label: 'CFO',
    sections: Object.values(PORTAL_SECTIONS)
  },
  owner: {
    label: 'Owner',
    sections: Object.values(PORTAL_SECTIONS)
  },
  admin: {
    label: 'Admin',
    sections: Object.values(PORTAL_SECTIONS)
  },
  super_admin: {
    label: 'Super Admin',
    sections: Object.values(PORTAL_SECTIONS)
  },
  org_manager: {
    label: 'Org Manager',
    sections: Object.values(PORTAL_SECTIONS)
  },
  // Finance
  finance: {
    label: 'Finance',
    sections: Object.values(PORTAL_SECTIONS)
  },
  // HR
  hr: {
    label: 'HR / HRM',
    sections: Object.values(PORTAL_SECTIONS)
  },
  // Management
  project_manager: {
    label: 'Project Manager',
    sections: Object.values(PORTAL_SECTIONS)
  },
  manager: {
    label: 'Manager',
    sections: Object.values(PORTAL_SECTIONS)
  },
  department_lead: {
    label: 'Department Lead',
    sections: Object.values(PORTAL_SECTIONS)
  },
  pmo: {
    label: 'PMO',
    sections: Object.values(PORTAL_SECTIONS)
  },
  // Staff / Individual contributors
  developer: {
    label: 'Developer',
    sections: Object.values(PORTAL_SECTIONS)
  },
  employee: {
    label: 'Employee',
    sections: Object.values(PORTAL_SECTIONS)
  },
  staff: {
    label: 'Staff',
    sections: Object.values(PORTAL_SECTIONS)
  },
  engineer: {
    label: 'Engineer',
    sections: Object.values(PORTAL_SECTIONS)
  },
  programmer: {
    label: 'Programmer',
    sections: Object.values(PORTAL_SECTIONS)
  },
  contributor: {
    label: 'Contributor',
    sections: Object.values(PORTAL_SECTIONS)
  },
  contractor: {
    label: 'Contractor',
    sections: [PORTAL_SECTIONS.DASHBOARD, PORTAL_SECTIONS.WORKSPACES, PORTAL_SECTIONS.PROFILE, PORTAL_SECTIONS.ATTENDANCE, PORTAL_SECTIONS.LEAVE, PORTAL_SECTIONS.PAYROLL, PORTAL_SECTIONS.DOCUMENTS]
  },
  auditor: {
    label: 'Auditor',
    sections: [PORTAL_SECTIONS.DASHBOARD, PORTAL_SECTIONS.PROFILE, PORTAL_SECTIONS.DOCUMENTS]
  }
};

// Backward-compat exports: portal gating is now permission-driven in EmployeePortal.
export const ADMIN_ONLY_ROLES = [];
export const EMPLOYEE_PORTAL_ROLES = Object.keys(ACCESS_LEVELS);

/**
 * Get access level config for a user role.
 * @param {string} role - User role (e.g. 'developer', 'finance', 'project_manager')
 * @returns {{ label: string, sections: string[] }}
 */
export function getAccessLevel(role) {
  if (!role) return ACCESS_LEVELS.employee;
  const key = role.toLowerCase().replace(/\s+/g, '_');
  return ACCESS_LEVELS[key] || ACCESS_LEVELS.employee;
}

/**
 * Check if a portal section is accessible.
 * @param {string} _userRole - Deprecated legacy argument (unused)
 * @param {string} section - Section key (e.g. PORTAL_SECTIONS.PAYROLL)
 * @param {(section: string) => boolean} permissionChecker - Optional permission checker callback
 * @returns {boolean}
 */
export function canAccessSection(_userRole, section, permissionChecker) {
  if (typeof permissionChecker === 'function') {
    return permissionChecker(section);
  }
  return true;
}

/**
 * Filter menu items by the user's access level.
 * @param {Array<{ id: string, label: string, icon: any, path: string }>} menuItems
 * @param {string} userRole - Deprecated legacy argument (unused)
 * @param {(section: string) => boolean} permissionChecker - Optional permission checker callback
 * @returns {Array}
 */
export function filterMenuByAccess(menuItems, userRole, permissionChecker) {
  return menuItems.filter(item => canAccessSection(userRole, item.id, permissionChecker));
}
