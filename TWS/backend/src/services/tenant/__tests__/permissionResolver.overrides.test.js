jest.mock('../../../models/TenantUser', () => ({
  findOne: jest.fn()
}));

jest.mock('../../../models/TenantDepartmentAccess', () => ({
  find: jest.fn()
}));

jest.mock('../../../models/TenantRole', () => ({
  findOne: jest.fn()
}));

jest.mock('../permissionCache.service', () => ({
  getResolved: jest.fn(),
  setResolved: jest.fn(),
  delResolved: jest.fn(),
  addRevoked: jest.fn(),
  delResolvedForTenant: jest.fn()
}));

const TenantUser = require('../../../models/TenantUser');
const TenantDepartmentAccess = require('../../../models/TenantDepartmentAccess');
const TenantRole = require('../../../models/TenantRole');
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

  it('applies deny overrides for pending tenant users', async () => {
    TenantUser.findOne.mockReturnValue(
      makeLeanChain({
        status: 'pending',
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
});
