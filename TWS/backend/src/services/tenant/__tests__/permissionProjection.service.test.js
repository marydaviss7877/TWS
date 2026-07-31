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

  it('projects portfolio access for the portfolio page controls', () => {
    const modules = buildModuleAccessFromResolved({
      permissions: ['portfolio:read', 'portfolio:write'],
      deniedPermissionCodes: []
    });

    expect(modules.portfolio).toEqual({
      read: true,
      write: true,
      delete: false
    });
  });

  it('respects an explicit portfolio write denial', () => {
    const modules = buildModuleAccessFromResolved({
      permissions: ['portfolio:read', 'portfolio:write'],
      deniedPermissionCodes: ['portfolio:write']
    });

    expect(modules.portfolio.read).toBe(true);
    expect(modules.portfolio.write).toBe(false);
  });
});
