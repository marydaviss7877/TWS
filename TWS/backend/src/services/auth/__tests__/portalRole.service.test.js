const { resolvePortalForRole, roleCanUsePortal } = require('../portalRole.service');

describe('portalRole.service', () => {
  it.each(['owner', 'admin', 'org_manager'])('maps %s to admin', (role) => {
    expect(resolvePortalForRole(role)).toBe('admin');
  });

  it.each(['employee', 'manager', 'project_manager', 'hr', 'finance', 'contractor'])('maps %s to employee', (role) => {
    expect(resolvePortalForRole(role)).toBe('employee');
  });

  it.each(['client', 'customer'])('maps %s to client', (role) => {
    expect(resolvePortalForRole(role)).toBe('client');
  });

  it('rejects a valid account role on the wrong portal', () => {
    expect(roleCanUsePortal('manager', 'admin')).toBe(false);
    expect(roleCanUsePortal('owner', 'employee')).toBe(false);
    expect(roleCanUsePortal('client', 'employee')).toBe(false);
  });
});
