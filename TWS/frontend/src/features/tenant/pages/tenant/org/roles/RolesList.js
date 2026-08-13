import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  UserGroupIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { tenantApiService } from '../../../../../../shared/services/tenant/tenant-api.service';
import { useTenantSlug } from '../../../../../../shared/hooks/useTenantSlug';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../../../../components/ui/Dialog/Dialog';
import { Button } from '../../../../../../components/ui/Button/Button';
import { Input } from '../../../../../../components/ui/Input/Input';
import LoadingSpinner from '../../../../../../shared/components/feedback/LoadingSpinner';
import AccessControlPills from '../AccessControlPills';

const EMPTY_ROLE_FORM = { name: '', slug: '', description: '', permissions: [] };

const emptyRoleCatalog = {
  softwareHouse: { title: '', description: '', roleSystem: '', entries: [] },
  organization: { title: '', description: '', roleSystem: '', entries: [] },
  organizationHrSubroles: { title: '', description: '', roleSystem: '', entries: [] },
  organizationFinanceSubroles: { title: '', description: '', roleSystem: '', entries: [] }
};

function RoleCatalogSection({ section, searchTerm }) {
  if (!section?.entries?.length) return null;
  const q = searchTerm.trim().toLowerCase();
  const entries = q
    ? section.entries.filter(
        (row) =>
          row.catalogSlug?.toLowerCase().includes(q) ||
          row.name?.toLowerCase().includes(q) ||
          row.sourceKey?.toLowerCase().includes(q) ||
          (row.permissionCodes || []).some((c) => c.toLowerCase().includes(q))
      )
    : section.entries;

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{section.title}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{section.description}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          Role system: <span className="font-mono">{section.roleSystem}</span>
        </p>
      </div>
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Catalog slug
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Permissions (count)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {entries.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                  No matching rows
                </td>
              </tr>
            ) : (
              entries.map((row) => (
                <tr
                  key={`${section.roleSystem}-${row.catalogSlug}`}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <UserGroupIcon className="h-5 w-5 text-primary-600 shrink-0" />
                      <span className="text-sm font-mono text-gray-900 dark:text-white">{row.catalogSlug}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">{row.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {row.permissionCount ?? (row.permissionCodes || []).length}
                    {(row.permissionCodes || []).length > 0 && (
                      <span className="block text-xs text-gray-500 dark:text-gray-500 mt-1 font-mono truncate max-w-md">
                        {(row.permissionCodes || []).slice(0, 4).join(', ')}
                        {(row.permissionCodes || []).length > 4 ? '…' : ''}
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const RolesList = () => {
  const tenantSlug = useTenantSlug();
  const navigate = useNavigate();
  const location = useLocation();
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalog, setCatalog] = useState(emptyRoleCatalog);
  const [dbLoading, setDbLoading] = useState(true);
  const [dbRoles, setDbRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [roleSyncing, setRoleSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [roleForm, setRoleForm] = useState(EMPTY_ROLE_FORM);
  const [creatingRole, setCreatingRole] = useState(false);

  const fetchCatalog = useCallback(async () => {
    try {
      setCatalogLoading(true);
      const data = await tenantApiService.getRoleCatalog(tenantSlug);
      if (data && data.softwareHouse) {
        setCatalog(data);
      } else {
        setCatalog(emptyRoleCatalog);
        toast.error('Could not load role catalog.');
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load role catalog');
      setCatalog(emptyRoleCatalog);
    } finally {
      setCatalogLoading(false);
    }
  }, [tenantSlug]);

  const fetchDbRoles = useCallback(async () => {
    try {
      setDbLoading(true);
      const data = await tenantApiService.getRoles(tenantSlug);
      if (data) {
        setDbRoles(Array.isArray(data) ? data : data.roles || []);
      } else {
        setDbRoles([]);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
      setDbRoles([]);
    } finally {
      setDbLoading(false);
    }
  }, [tenantSlug]);

  const fetchPermissions = useCallback(async () => {
    try {
      const data = await tenantApiService.getPermissions(tenantSlug);
      if (data) {
        setPermissions(Array.isArray(data) ? data : data.permissions || []);
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
    }
  }, [tenantSlug]);

  useEffect(() => {
    fetchCatalog();
    fetchDbRoles();
    fetchPermissions();
  }, [fetchCatalog, fetchDbRoles, fetchPermissions]);

  // Quick Create / command palette lands here as ?create=role
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('create') === 'role') {
      openCreateModal();
      params.delete('create');
      const next = params.toString();
      navigate({ pathname: location.pathname, search: next ? `?${next}` : '' }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const openCreateModal = () => setShowCreateModal(true);
  const closeCreateModal = () => {
    setShowCreateModal(false);
    setRoleForm(EMPTY_ROLE_FORM);
  };

  const handleRoleFormChange = (e) => {
    const { name, value } = e.target;
    setRoleForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'name' && !prev.slug) {
        next.slug = value
          .toLowerCase()
          .trim()
          .replace(/[^\w\s-]/g, '')
          .replace(/[\s_-]+/g, '-')
          .replace(/^-+|-+$/g, '');
      }
      return next;
    });
  };

  const handleRolePermissionToggle = (permissionCode) => {
    setRoleForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permissionCode)
        ? prev.permissions.filter((p) => p !== permissionCode)
        : [...prev.permissions, permissionCode]
    }));
  };

  const handleCreateRole = async (e) => {
    e.preventDefault();
    if (!roleForm.name.trim()) {
      toast.error('Name is required');
      return;
    }
    try {
      setCreatingRole(true);
      const result = await tenantApiService.createRole(tenantSlug, roleForm);
      if (result !== null) {
        toast.success('Role created successfully');
        closeCreateModal();
        fetchDbRoles();
      } else {
        toast.error('Failed to create role. Please check your authentication.');
      }
    } catch (error) {
      console.error('Error creating role:', error);
      toast.error(error.message || 'Failed to create role');
    } finally {
      setCreatingRole(false);
    }
  };

  const handleSyncRolesFromCatalog = async () => {
    try {
      setRoleSyncing(true);
      const result = await tenantApiService.syncRolesFromCatalog(tenantSlug);
      if (result == null) {
        toast.error('Could not import roles. Check that you are signed in as owner, admin, or super admin.');
        return;
      }
      const created = result.created ?? 0;
      const skipped = result.skipped ?? 0;
      toast.success(`Role import finished: ${created} new, ${skipped} already present.`);
      if (result.partialPermissions?.length) {
        toast(
          'Some roles were created without codes missing from the database. Import the permission catalog on Permissions first.',
          { icon: 'ℹ️', duration: 6000 }
        );
      }
      await fetchDbRoles();
    } catch (e) {
      console.error(e);
      toast.error(e?.message || 'Failed to import roles');
    } finally {
      setRoleSyncing(false);
    }
  };

  const handleDelete = async (roleId) => {
    if (!window.confirm('Are you sure you want to delete this role?')) return;
    try {
      const result = await tenantApiService.deleteRole(tenantSlug, roleId);
      if (result !== null) {
        toast.success('Role deleted successfully');
        fetchDbRoles();
      } else {
        toast.error('Failed to delete role. Please check your authentication.');
      }
    } catch (error) {
      console.error('Error deleting role:', error);
      toast.error('Failed to delete role');
    }
  };

  const getPermissionName = (code) => {
    const permission = permissions.find((p) => p.code === code);
    return permission ? permission.description : code;
  };

  const filteredDbRoles = dbRoles.filter(
    (role) =>
      role.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      role.slug?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      role.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (catalogLoading) {
    return (
      <div className="space-y-6">
        <AccessControlPills />
        <LoadingSpinner message="Resolving roles and access…" className="min-h-[40vh] bg-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AccessControlPills />

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Roles</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-3xl">
            Reference roles from server configuration (below). Database roles are used when assigning custom role
            documents and permission checklists in this org. Import the{' '}
            <strong className="font-medium text-gray-700 dark:text-gray-300">permission catalog</strong> first so
            imported roles can attach all codes.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => fetchCatalog()}>
          Refresh catalog
        </Button>
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </div>
        <Input
          type="text"
          placeholder="Search catalog slugs, names, or permission codes…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <RoleCatalogSection section={catalog.softwareHouse} searchTerm={searchTerm} />
      <RoleCatalogSection section={catalog.organization} searchTerm={searchTerm} />
      <RoleCatalogSection section={catalog.organizationHrSubroles} searchTerm={searchTerm} />
      <RoleCatalogSection section={catalog.organizationFinanceSubroles} searchTerm={searchTerm} />

      <details className="group border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-sm">
        <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium text-gray-800 dark:text-gray-200 list-none">
          <span>Database roles (MongoDB) — assignable</span>
          <ChevronDownIcon className="h-5 w-5 text-gray-500 transition group-open:rotate-180" />
        </summary>
        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-4 space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Stored under <code className="text-xs bg-gray-100 dark:bg-gray-900 px-1 rounded">/roles</code>. Use{' '}
              <strong className="font-medium text-gray-700 dark:text-gray-300">Import catalog</strong> to copy catalog
              definitions here (same idea as Permissions). Custom roles use <strong>Create role</strong>.
            </p>
            <div className="flex flex-wrap gap-2 justify-end">
              <Button type="button" variant="outline" disabled={roleSyncing} onClick={() => handleSyncRolesFromCatalog()}>
                {roleSyncing ? 'Importing…' : 'Import catalog'}
              </Button>
              <Button type="button" onClick={openCreateModal} className="gap-2">
                <PlusIcon className="h-5 w-5" />
                Create role
              </Button>
            </div>
          </div>

          {dbLoading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading roles…</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Slug
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Permissions
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredDbRoles.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                        No database roles yet — import catalog or create a role.
                      </td>
                    </tr>
                  ) : (
                    filteredDbRoles.map((role) => (
                      <tr key={role._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <UserGroupIcon className="h-5 w-5 text-primary-600 mr-2" />
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{role.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {role.slug}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{role.description || '—'}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                          {role.permissions && role.permissions.length > 0 ? (
                            <ol className="list-decimal list-inside space-y-1">
                              {role.permissions.slice(0, 3).map((perm, idx) => (
                                <li key={idx}>{getPermissionName(perm)}</li>
                              ))}
                              {role.permissions.length > 3 && (
                                <li className="text-gray-500 dark:text-gray-400">
                                  +{role.permissions.length - 3} more
                                </li>
                              )}
                            </ol>
                          ) : (
                            <span className="text-gray-400">No permissions</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            type="button"
                            onClick={() => handleDelete(role._id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            aria-label="Delete role"
                          >
                            <TrashIcon className="h-5 w-5 inline" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </details>

      <Dialog open={showCreateModal} onOpenChange={(open) => !open && closeCreateModal()}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create role</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateRole} className="space-y-5 pt-2">
            <div>
              <label htmlFor="role-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Name <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                id="role-name"
                name="name"
                value={roleForm.name}
                onChange={handleRoleFormChange}
                placeholder="Enter name"
                required
                className="mt-1"
              />
            </div>

            <div>
              <label htmlFor="role-slug" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Slug
              </label>
              <Input
                type="text"
                id="role-slug"
                name="slug"
                value={roleForm.slug}
                onChange={handleRoleFormChange}
                placeholder="Enter slug"
                className="mt-1"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                URL-friendly identifier (auto-generated from name if not provided)
              </p>
            </div>

            <div>
              <label htmlFor="role-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Description
              </label>
              <textarea
                id="role-description"
                name="description"
                value={roleForm.description}
                onChange={handleRoleFormChange}
                placeholder="Enter description"
                rows={3}
                className="mt-1 block w-full border border-gray-300 dark:border-gray-700 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Select allowed permissions
              </label>
              {permissions.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No assignable permission records yet. Go to{' '}
                  <strong className="font-medium text-gray-600 dark:text-gray-300">Permissions</strong>, open{' '}
                  <strong className="font-medium text-gray-600 dark:text-gray-300">Additional catalog (MongoDB)</strong>, then
                  click <strong className="font-medium text-gray-600 dark:text-gray-300">Import catalog</strong> (or create
                  custom permissions there).
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md p-3">
                  {permissions.map((permission) => (
                    <label
                      key={permission._id}
                      className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-1.5 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={roleForm.permissions.includes(permission.code)}
                        onChange={() => handleRolePermissionToggle(permission.code)}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-900 dark:text-white">{permission.code}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <Button type="button" variant="outline" onClick={closeCreateModal}>
                Cancel
              </Button>
              <Button type="submit" disabled={creatingRole}>
                {creatingRole ? 'Submitting...' : 'Submit'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RolesList;
