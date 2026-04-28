import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import tenantProjectApiService from '../projects/services/tenantProjectApiService';
import LoadingSpinner from '../../../../../../shared/components/feedback/LoadingSpinner';
import ErrorState from '../../../../../../shared/components/feedback/ErrorState';
import EmptyState from '../../../../../../shared/components/feedback/EmptyState';

const DepartmentsList = () => {
  const { tenantSlug } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  const [isSeedingTemplate, setIsSeedingTemplate] = useState(false);
  const [isUpdatingDepartment, setIsUpdatingDepartment] = useState(false);
  const [editDepartment, setEditDepartment] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', code: '', description: '', departmentHead: '' });
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  useEffect(() => {
    fetchDepartments();
  }, [tenantSlug]);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!tenantSlug) return;
      try {
        setUsersLoading(true);
        const data = await tenantProjectApiService.getUsers(tenantSlug, { page: 1, limit: 200, status: 'active' });
        const list = Array.isArray(data?.users) ? data.users : [];
        setUsers(list);
      } catch (error) {
        console.error('Error fetching users for department head:', error);
        setUsers([]);
      } finally {
        setUsersLoading(false);
      }
    };
    fetchUsers();
  }, [tenantSlug]);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const data = await tenantProjectApiService.getDepartments(tenantSlug);
      if (data) {
        setDepartments(Array.isArray(data) ? data : data.departments || []);
        setError(null);
      } else {
        setDepartments([]);
        setError('Failed to load departments. Please check your authentication.');
        toast.error('Failed to load departments');
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
      setError(error.message || 'Failed to load departments');
      toast.error('Failed to load departments');
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (departmentId) => {
    if (window.confirm('Are you sure you want to delete this department?')) {
      try {
        // SECURITY FIX: Use credentials: 'include' instead of Authorization header
        const response = await fetch(`/api/tenant/${tenantSlug}/departments/${departmentId}`, {
          method: 'DELETE',
          credentials: 'include', // SECURITY FIX: Include cookies (HttpOnly tokens)
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) throw new Error('Failed to delete department');
        
        toast.success('Department deleted successfully');
        fetchDepartments();
      } catch (error) {
        console.error('Error deleting department:', error);
        toast.error('Failed to delete department');
      }
    }
  };

  const handleApplyTemplate = async () => {
    if (!window.confirm('Apply starter departments template? Existing department codes will be skipped.')) {
      return;
    }
    try {
      setIsSeedingTemplate(true);
      const response = await fetch(`/api/tenant/${tenantSlug}/departments/template`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || 'Failed to apply department template');
      }
      const createdCount = payload?.data?.created?.length || 0;
      const skippedCount = payload?.data?.skipped?.length || 0;
      toast.success(`Template applied. Created ${createdCount}, skipped ${skippedCount}.`);
      fetchDepartments();
    } catch (error) {
      console.error('Error applying department template:', error);
      toast.error(error.message || 'Failed to apply department template');
    } finally {
      setIsSeedingTemplate(false);
    }
  };

  const openEditModal = (department) => {
    setEditDepartment(department);
    setEditForm({
      name: department?.name || '',
      code: department?.code || '',
      description: department?.description || '',
      departmentHead: typeof department?.departmentHead === 'object'
        ? (department?.departmentHead?._id || '')
        : (department?.departmentHead || '')
    });
  };

  const closeEditModal = () => {
    setEditDepartment(null);
    setEditForm({ name: '', code: '', description: '', departmentHead: '' });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({
      ...prev,
      [name]: name === 'code' ? value.toUpperCase().replace(/[^A-Z0-9-]/g, '') : value
    }));
  };

  const handleUpdateDepartment = async (e) => {
    e.preventDefault();
    if (!editDepartment?._id) return;
    if (!editForm.name.trim() || !editForm.code.trim()) {
      toast.error('Name and code are required');
      return;
    }
    try {
      setIsUpdatingDepartment(true);
      const response = await fetch(`/api/tenant/${tenantSlug}/departments/${editDepartment._id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name.trim(),
          code: editForm.code.trim(),
          description: editForm.description?.trim() || '',
          departmentHead: editForm.departmentHead?.trim() || undefined
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || 'Failed to update department');
      }
      const sync = payload?.data?.nameSync;
      if (sync) {
        const total = (sync.tenantUsers || 0) + (sync.users || 0) + (sync.employees || 0) + (sync.departmentAccess || 0);
        toast.success(`Department updated. Synced ${total} assignment fields.`);
      } else {
        toast.success('Department updated successfully');
      }
      closeEditModal();
      fetchDepartments();
    } catch (error) {
      console.error('Error updating department:', error);
      toast.error(error.message || 'Failed to update department');
    } finally {
      setIsUpdatingDepartment(false);
    }
  };

  const filteredDepartments = departments.filter(department =>
    department.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    department.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    department.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getDepartmentHeadLabel = (department) => {
    const rawHead = department?.departmentHead;
    const normalizedName = typeof rawHead === 'object' ? rawHead?.fullName : rawHead;

    if (typeof normalizedName !== 'string') return 'N/A';

    const cleaned = normalizedName.trim().toLowerCase();
    if (!cleaned || cleaned === 'null' || cleaned === 'undefined' || cleaned === 'n/a') {
      return 'N/A';
    }

    return typeof rawHead === 'object' ? rawHead.fullName : normalizedName;
  };

  if (loading) {
    return <LoadingSpinner message="Loading departments..." className="min-h-[40vh] bg-transparent" />;
  }

  if (error) {
    return <ErrorState title="Departments unavailable" message={error} onRetry={fetchDepartments} className="max-w-xl mx-auto" />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Departments</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage organizational departments
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleApplyTemplate}
            disabled={isSeedingTemplate}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-60"
          >
            {isSeedingTemplate ? 'Applying...' : 'Apply Template'}
          </button>
          <button
            onClick={() => navigate(`/${tenantSlug}/org/departments/create`)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Department
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search departments..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white dark:bg-gray-800 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      {/* Departments Table */}
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Head
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredDepartments.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  <EmptyState title="No departments found" message="Create a department to get started." className="max-w-lg mx-auto" />
                </td>
              </tr>
            ) : (
              filteredDepartments.map((department) => (
                <tr key={department._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <BuildingOfficeIcon className="h-5 w-5 text-primary-600 mr-2" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {department.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {department.code}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {department.description || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {getDepartmentHeadLabel(department)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      department.status === 'active' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : department.status === 'inactive'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                    }`}>
                      {department.status || 'active'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(department)}
                        className="text-amber-600 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-300"
                        title="Edit Department"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => navigate(`/${tenantSlug}/org/departments/${department._id}/dashboard`)}
                        className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300"
                        title="View Dashboard"
                      >
                        <ChartBarIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(department._id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        title="Delete Department"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editDepartment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-lg bg-white dark:bg-gray-800 shadow-xl">
            <form onSubmit={handleUpdateDepartment} className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Department</h2>
                <button type="button" onClick={closeEditModal} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                <input
                  name="name"
                  value={editForm.name}
                  onChange={handleEditChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Code</label>
                <input
                  name="code"
                  value={editForm.code}
                  onChange={handleEditChange}
                  required
                  className="mt-1 block w-full uppercase border border-gray-300 rounded-md shadow-sm py-2 px-3 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                <textarea
                  name="description"
                  value={editForm.description}
                  onChange={handleEditChange}
                  rows={3}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Department Head</label>
                <select
                  name="departmentHead"
                  value={editForm.departmentHead}
                  onChange={handleEditChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">Unassigned</option>
                  {users.map((user) => (
                    <option key={user._id} value={user._id}>
                      {user.fullName || user.name || user.email}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {usersLoading ? 'Loading users...' : 'Select who leads this department.'}
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="px-4 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingDepartment}
                  className="px-4 py-2 text-sm rounded-md bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-60"
                >
                  {isUpdatingDepartment ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentsList;

