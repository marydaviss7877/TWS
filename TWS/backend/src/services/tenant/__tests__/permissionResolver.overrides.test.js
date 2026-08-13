jest.mock('../../../models/tenant/TenantUser', () => ({
  findOne: jest.fn()
}));

jest.mock('../../../models/tenant/TenantDepartmentAccess', () => ({
  find: jest.fn()
}));

jest.mock('../../../models/tenant/TenantRole', () => ({
  findOne: jest.fn()
}));

jest.mock('../../../models/core/Role', () => ({
  findOne: jest.fn()
}));

jest.mock('../permissionCache.service', () => ({
  getResolved: jest.fn(),
  setResolved: jest.fn(),
  delResolved: jest.fn(),
  addRevoked: jest.fn(),
  delResolvedForTenant: jest.fn()
}));

const TenantUser = require('../../../models/tenant/TenantUser');
const TenantDepartmentAccess = require('../../../models/tenant/TenantDepartmentAccess');
const TenantRole = require('../../../models/tenant/TenantRole');
const CoreRole = require('../../../models/core/Role');
const { resolveUserPermissions } = require('../permissionResolver.service');

const makeLeanChain = (value) => ({
  select: jest.fn().mockReturnValue({
    lean: jest.fn().mockResolvedValue(value)
  })
});

describe('permissionResolver.service permission override precedence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    TenantDepartmentAccess.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([])
    });
    TenantRole.findOne.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null)
      })
    });
    CoreRole.findOne.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null)
      })
    });
  });

  it('denies role-default finance:read for project_manager', async () => {
    TenantUser.findOne.mockReturnValue(
      makeLeanChain({
        roles: [{ role: 'project_manager', permissions: [] }],
        metadata: {
          customFields: {
            permissionOverrides: {
              deny: ['finance:read']
            }
          }
        }
      })
    );

    const resolved = await resolveUserPermissions('user-1', 'tenant-1');

    expect(resolved.permissions).not.toContain('finance:read');
    expect(resolved.deniedPermissionCodes).toEqual(['finance:read']);
  });

  it('re-adds finance:read when deny list is cleared', async () => {
    TenantUser.findOne.mockReturnValue(
      makeLeanChain({
        roles: [{ role: 'project_manager', permissions: [] }],
        metadata: {
          customFields: {
            permissionOverrides: {
              deny: []
            }
          }
        }
      })
    );

    const resolved = await resolveUserPermissions('user-1', 'tenant-1');

    expect(resolved.permissions).toContain('finance:read');
    expect(resolved.deniedPermissionCodes).toEqual([]);
  });

  it('only resolves active tenant memberships', async () => {
    TenantUser.findOne.mockReturnValue(makeLeanChain(null));

    const resolved = await resolveUserPermissions('user-1', 'tenant-1');

    expect(TenantUser.findOne).toHaveBeenCalledWith(expect.objectContaining({ status: 'active' }));
    expect(resolved.permissions).toEqual([]);
  });

  it('applies permissions from an active assigned organization role', async () => {
    TenantUser.findOne.mockReturnValue(
      makeLeanChain({
        roles: [{ role: 'employee', permissions: [] }],
        metadata: { customFields: { assignedRoleId: 'role-1' } }
      })
    );
    CoreRole.findOne.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ permissions: ['reports:read', 'analytics:read'] })
      })
    });

    const resolved = await resolveUserPermissions('user-1', 'tenant-1');

    expect(CoreRole.findOne).toHaveBeenCalledWith(expect.objectContaining({
      _id: 'role-1',
      tenantId: 'tenant-1',
      isActive: true
    }));
    expect(resolved.permissions).toEqual(expect.arrayContaining(['reports:read', 'analytics:read']));
  });
});
