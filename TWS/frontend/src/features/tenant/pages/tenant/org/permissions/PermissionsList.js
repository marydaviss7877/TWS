import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  ShieldCheckIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import { tenantApiService } from '../../../../../../shared/services/tenant/tenant-api.service';
import toast from 'react-hot-toast';
import { useTenantSlug } from '../../../../../../shared/hooks/useTenantSlug';

const emptyCatalog = {
  softwareHouse: { title: '', description: '', roleSystem: '', entries: [] },
  organization: { title: '', description: '', roleSystem: '', entries: [] },
  organizationHrSubroles: { title: '', description: '', roleSystem: '', entries: [] },
  organizationFinanceSubroles: { title: '', description: '', roleSystem: '', entries: [] }
};

function CatalogSection({ section, searchTerm }) {
  if (!section?.entries?.length) return null;
  const q = searchTerm.trim().toLowerCase();
  const entries = q
    ? section.entries.filter(
        (row) =>
          row.code?.toLowerCase().includes(q) ||
          row.module?.toLowerCase().includes(q) ||
          row.rolesDisplay?.toLowerCase().includes(q) ||
          (row.accessTypes || []).some((t) => t.toLowerCase().includes(q))
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
                Code
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Module
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Access
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Roles (reference)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {entries.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                  No matching rows
                </td>
              </tr>
            ) : (
              entries.map((row) => (
                <tr key={`${section.roleSystem}-${row.code}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <ShieldCheckIcon className="h-5 w-5 text-primary-600 shrink-0" />
                      <span className="text-sm font-mono text-gray-900 dark:text-white">{row.code}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{row.module}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {(row.accessTypes || []).join(', ')}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">{row.rolesDisplay}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const PermissionsList = () => {
  const tenantSlug = useTenantSlug();
  const navigate = useNavigate();
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalog, setCatalog] = useState(emptyCatalog);
  const [legacyLoading, setLegacyLoading] = useState(true);
  const [legacyPermissions, setLegacyPermissions] = useState([]);
  const [catalogSyncing, setCatalogSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchCatalog = useCallback(async () => {
    try {
      setCatalogLoading(true);
      const data = await tenantApiService.getPermissionCatalog(tenantSlug);
      if (data && data.softwareHouse) {
        setCatalog(data);
      } else {
        setCatalog(emptyCatalog);
        toast.error('Could not load enforced permission catalog.');
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load permission catalog');
      setCatalog(emptyCatalog);
    } finally {
      setCatalogLoading(false);
    }
  }, [tenantSlug]);

  const fetchLegacyPermissions = useCallback(async () => {
    try {
      setLegacyLoading(true);
      const data = await tenantApiService.getPermissions(tenantSlug);
      if (data) {
        setLegacyPermissions(Array.isArray(data) ? data : data.permissions || []);
      } else {
        setLegacyPermissions([]);
      }
    } catch (e) {
      console.error(e);
      setLegacyPermissions([]);
    } finally {
      setLegacyLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    fetchCatalog();
    fetchLegacyPermissions();
  }, [fetchCatalog, fetchLegacyPermissions]);

  const handleSyncCatalogToPermissions = async () => {
    try {
      setCatalogSyncing(true);
      const result = await tenantApiService.syncPermissionsFromCatalog(tenantSlug);
      if (result == null) {
        toast.error('Could not import catalog. Check that you are signed in as owner, admin, or super admin.');
        return;
      }
      const created = result.created ?? 0;
      const skipped = result.skipped ?? 0;
      toast.success(`Catalog import finished: ${created} new, ${skipped} already present.`);
      await fetchLegacyPermissions();
    } catch (e) {
      console.error(e);
      toast.error(e?.message || 'Failed to import catalog');
    } finally {
      setCatalogSyncing(false);
    }
  };

  const handleDelete = async (permissionId) => {
    if (!window.confirm('Are you sure you want to delete this permission?')) return;
    try {
      const result = await tenantApiService.deletePermission(tenantSlug, permissionId);
      if (result !== null) {
        toast.success('Permission deleted successfully');
        fetchLegacyPermissions();
      } else {
        toast.error('Failed to delete permission. Please check your authentication.');
      }
    } catch (error) {
      console.error('Error deleting permission:', error);
      toast.error('Failed to delete permission');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredLegacy = legacyPermissions.filter(
    (permission) =>
      permission.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.permissionGroup?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (catalogLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading enforced permissions…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Permissions</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-3xl">
            Enforced access comes from server configuration (below). Custom entries stored in the database are only
            meaningful if your deployment wires them into role checks and APIs.
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
          placeholder="Search code, module, or roles…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white dark:bg-gray-800 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      <CatalogSection section={catalog.softwareHouse} searchTerm={searchTerm} />
      <CatalogSection section={catalog.organization} searchTerm={searchTerm} />
      <CatalogSection section={catalog.organizationHrSubroles} searchTerm={searchTerm} />
      <CatalogSection section={catalog.organizationFinanceSubroles} searchTerm={searchTerm} />

      <details className="group border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-sm">
        <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium text-gray-800 dark:text-gray-200 list-none">
          <span>Additional catalog (MongoDB) — legacy / custom</span>
          <ChevronDownIcon className="h-5 w-5 text-gray-500 transition group-open:rotate-180" />
        </summary>
        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-4 space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Optional records from <code className="text-xs bg-gray-100 dark:bg-gray-900 px-1 rounded">/permissions</code>.
              Use <strong className="font-medium text-gray-700 dark:text-gray-300">Import catalog</strong> to copy enforced
              catalog codes here so <strong className="font-medium text-gray-700 dark:text-gray-300">Create role</strong>{' '}
              can assign them. This does not change Software House API enforcement by itself.
            </p>
            <div className="flex flex-wrap gap-2 justify-end">
              <button
                type="button"
                disabled={catalogSyncing}
                onClick={() => handleSyncCatalogToPermissions()}
                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {catalogSyncing ? 'Importing…' : 'Import catalog'}
              </button>
              <button
                type="button"
                onClick={() => navigate(`/${tenantSlug}/org/permissions/create`)}
                className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Create permission
              </button>
            </div>
          </div>
          {legacyLoading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading legacy list…</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Code
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Description
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Group
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Added
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredLegacy.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-3 text-center text-sm text-gray-500 dark:text-gray-400">
                        No custom permissions
                      </td>
                    </tr>
                  ) : (
                    filteredLegacy.map((permission) => (
                      <tr key={permission._id}>
                        <td className="px-4 py-2 text-sm font-mono text-gray-900 dark:text-white">{permission.code}</td>
                        <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-200">{permission.description}</td>
                        <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                          {permission.permissionGroup || '—'}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(permission.createdAt)}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => handleDelete(permission._id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            aria-label="Delete permission"
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

export default PermissionsList;
