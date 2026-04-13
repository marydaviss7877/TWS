import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  UserGroupIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { tenantApiService } from '../../../../../../shared/services/tenant/tenant-api.service';

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
  const { tenantSlug } = useParams();
  const navigate = useNavigate();
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalog, setCatalog] = useState(emptyRoleCatalog);
  const [dbLoading, setDbLoading] = useState(true);
  const [dbRoles, setDbRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [roleSyncing, setRoleSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading role catalog…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
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
        <button
          type="button"
          onClick={() => fetchCatalog()}
          className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Refresh catalog
        </button>
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search catalog slugs, names, or permission codes…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white dark:bg-gray-800 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
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
              <button
                type="button"
                disabled={roleSyncing}
                onClick={() => handleSyncRolesFromCatalog()}
                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {roleSyncing ? 'Importing…' : 'Import catalog'}
              </button>
              <button
                type="button"
                onClick={() => navigate(`/${tenantSlug}/org/roles/create`)}
                className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Create role
              </button>
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
    </div>
  );
};

export default RolesList;
