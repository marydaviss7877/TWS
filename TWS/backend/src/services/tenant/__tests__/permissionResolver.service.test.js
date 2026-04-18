const {
  BASE_ROLE_PERMISSIONS,
  hasPermission,
  hasAnyPermission
} = require('../permissionResolver.service');

describe('permissionResolver.service attendance ownership permissions', () => {
  it('grants employee attendance write_own in base permissions', () => {
    expect(BASE_ROLE_PERMISSIONS.employee).toContain('attendance:write_own');
  });

  it('does not treat write_own as write', () => {
    const permissions = ['attendance:read', 'attendance:write_own'];
    expect(hasPermission(permissions, 'attendance', 'write_own')).toBe(true);
    expect(hasPermission(permissions, 'attendance', 'write')).toBe(false);
  });

  it('supports mixed-action checks where write_own is allowed', () => {
    const permissions = ['attendance:write_own'];
    expect(hasAnyPermission(permissions, 'attendance', ['write', 'write_own'])).toBe(true);
  });
});
