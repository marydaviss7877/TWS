const {
  invertProjectManagementPermissions,
  invertPrimaryRolePermissions
} = require('../permissionCatalog.service');

describe('permissionCatalog.service', () => {
  describe('invertProjectManagementPermissions', () => {
    it('groups roles by permission code and preserves scope in display', () => {
      const fixture = {
        project_manager: {
          'projects:view': true,
          'tasks:edit': true
        },
        developer: {
          'projects:view': 'assigned',
          'tasks:edit': 'assigned'
        }
      };
      const rows = invertProjectManagementPermissions(fixture);
      const view = rows.find((r) => r.code === 'projects:view');
      expect(view).toBeDefined();
      expect(view.rolesDisplay).toContain('project_manager');
      expect(view.rolesDisplay).toContain('developer (assigned)');
      expect(view.module).toBe('projects');
    });

    it('prepends wildcard row when role has *', () => {
      const fixture = {
        super_admin: { '*': true },
        developer: { 'tasks:view': 'assigned' }
      };
      const rows = invertProjectManagementPermissions(fixture);
      expect(rows[0].code).toBe('*');
      expect(rows[0].rolesDisplay).toMatch(/super_admin/);
    });
  });

  describe('invertPrimaryRolePermissions', () => {
    it('maps permission codes to sorted role names', () => {
      const fixture = {
        admin: ['projects:read', 'hr:read'],
        employee: ['projects:read']
      };
      const rows = invertPrimaryRolePermissions(fixture);
      const pr = rows.find((r) => r.code === 'projects:read');
      expect(pr.rolesDisplay).toBe('admin, employee');
    });
  });
});
