import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { tenantApiService } from '../../../../../../shared/services/tenant/tenant-api.service';
import toast from 'react-hot-toast';

const PermissionsList = () => {
  const { tenantSlug } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPermissions();
  }, [tenantSlug]);

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      const data = await tenantApiService.getPermissions(tenantSlug);
      if (data) {
        setPermissions(Array.isArray(data) ? data : data.permissions || []);
      } else {
        setPermissions([]);
        toast.error('Failed to load permissions. Please check your authentication.');
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
      toast.error('Failed to load permissions');
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (permissionId) => {
    if (window.confirm('Are you sure you want to delete this permission?')) {
      try {
        const result = await tenantApiService.deletePermission(tenantSlug, permissionId);
        if (result !== null) {
          toast.success('Permission deleted successfully');
          fetchPermissions();
        } else {
          toast.error('Failed to delete permission. Please check your authentication.');
        }
      } catch (error) {
        console.error('Error deleting permission:', error);
        toast.error('Failed to delete permission');
      }
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

  const filteredPermissions = permissions.filter(permission =>
    permission.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    permission.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    permission.permissionGroup?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading permissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Permissions</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage system permissions and access controls
          </p>
        </div>
        <button
          onClick={() => navigate(`/${tenantSlug}/org/permissions/create`)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Create Permission
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search permissions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white dark:bg-gray-800 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      {/* Permissions Table */}
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Group
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Date Added
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredPermissions.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  No permissions found
                </td>
              </tr>
            ) : (
              filteredPermissions.map((permission) => (
                <tr key={permission._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <ShieldCheckIcon className="h-5 w-5 text-primary-600 mr-2" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {permission.code}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {permission.description}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {permission.permissionGroup || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(permission.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleDelete(permission._id)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PermissionsList;

