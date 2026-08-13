const MODULES = [
  'projects', 'hr', 'finance', 'payroll', 'documents', 'sheets', 'analytics', 'nucleus',
  'audit', 'clients', 'settings', 'attendance', 'leave', 'reports', 'tasks', 'portfolio',
  'employees', 'teams', 'department'
];

function buildModuleAccessFromResolved(resolved = {}) {
  const modules = {};
  const perms = Array.isArray(resolved.permissions) ? resolved.permissions : [];
  const hasWildcard = perms.includes('*:*');
  const deniedSet = new Set(
    (resolved.deniedPermissionCodes || []).map((code) => String(code || '').trim().toLowerCase())
  );

  MODULES.forEach((m) => {
    const denyRead = deniedSet.has(`${m}:read`) || deniedSet.has(`${m}:*`) || deniedSet.has('*:*');
    const denyWrite = deniedSet.has(`${m}:write`) || deniedSet.has(`${m}:*`) || deniedSet.has('*:*');
    const denyDelete = deniedSet.has(`${m}:delete`) || deniedSet.has(`${m}:*`) || deniedSet.has('*:*');
    const denyAdmin = deniedSet.has(`${m}:admin`) || deniedSet.has(`${m}:*`) || deniedSet.has('*:*');
    const denyReadOwn = deniedSet.has(`${m}:read_own`) || deniedSet.has(`${m}:*`) || deniedSet.has('*:*');
    const denyWriteOwn = deniedSet.has(`${m}:write_own`) || deniedSet.has(`${m}:*`) || deniedSet.has('*:*');

    modules[m] = {
      read: !denyRead && (hasWildcard || perms.includes(`${m}:read`) || perms.includes(`${m}:*`)),
      write: !denyWrite && (hasWildcard || perms.includes(`${m}:write`) || perms.includes(`${m}:*`)),
      delete: !denyDelete && (hasWildcard || perms.includes(`${m}:delete`) || perms.includes(`${m}:*`)),
      admin: !denyAdmin && (hasWildcard || perms.includes(`${m}:admin`) || perms.includes(`${m}:*`)),
      read_own: !denyReadOwn && (hasWildcard || perms.includes(`${m}:read_own`) || perms.includes(`${m}:*`)),
      write_own: !denyWriteOwn && (hasWildcard || perms.includes(`${m}:write_own`) || perms.includes(`${m}:*`))
    };
  });

  return modules;
}

module.exports = {
  MODULES,
  buildModuleAccessFromResolved
};
