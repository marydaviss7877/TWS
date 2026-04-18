const { buildModuleAccessFromResolved } = require('../permissionProjection.service');

describe('permissionProjection.service', () => {
  it('projects finance.read false when denied for project_manager', () => {
    const modules = buildModuleAccessFromResolved({
      permissions: ['projects:read', 'finance:read'],
      deniedPermissionCodes: ['finance:read']
    });

    expect(modules.finance.read).toBe(false);
  });

  it('projects finance.read true when deny removed', () => {
    const modules = buildModuleAccessFromResolved({
      permissions: ['projects:read', 'finance:read'],
      deniedPermissionCodes: []
    });

    expect(modules.finance.read).toBe(true);
  });
});
