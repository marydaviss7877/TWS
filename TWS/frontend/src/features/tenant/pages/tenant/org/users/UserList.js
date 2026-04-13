import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  ArrowPathIcon,
  XMarkIcon,
  LockClosedIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';
import { tenantApiService } from '../../../../../../shared/services/tenant/tenant-api.service';
import toast from 'react-hot-toast';

const HR_SUB_ROLES = [
  { value: '', label: '— None —' },
  { value: 'manager', label: 'HR Manager (full roster, payroll, leave)' },
  { value: 'executive', label: 'HR Executive (roster, leave; no payroll)' },
  { value: 'payroll_officer', label: 'Payroll Officer (payroll only)' }
];

const FINANCE_SUB_ROLES = [
  { value: '', label: '— None —' },
  { value: 'manager', label: 'Finance Manager' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'analyst', label: 'Analyst (read-only)' },
  { value: 'ap_officer', label: 'AP Officer' },
  { value: 'ar_officer', label: 'AR Officer' }
];

const UserList = () => {
  const { tenantSlug } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    status: '',
    department: ''
  });
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [editHrSubRole, setEditHrSubRole] = useState('');
  const [editFinanceSubRole, setEditFinanceSubRole] = useState('');
  const [saving, setSaving] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordUser, setPasswordUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [inviteSendingId, setInviteSendingId] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, [tenantSlug, pagination.current, pagination.pageSize, filters]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.current,
        limit: pagination.pageSize,
        ...filters
      };
      
      const data = await tenantApiService.getUsers(tenantSlug, params);
      setUsers(data.users);
      setPagination(prev => ({
        ...prev,
        total: data.pagination.total
      }));
    } catch (error) {
      console.error('Error fetching users:', error);
      // Show error message
    } finally {
      setLoading(false);
    }
  };

  const handleTableChange = (newPagination) => {
    setPagination(prev => ({
      ...prev,
      current: newPagination.current,
      pageSize: newPagination.pageSize
    }));
  };

  const handleSearch = (value) => {
    setFilters(prev => ({ ...prev, search: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleDelete = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await tenantApiService.deleteUser(tenantSlug, userId);
        fetchUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  };

  const openEditModal = async (user) => {
    setEditUser(user);
    setEditHrSubRole(user?.hrSubRole ?? '');
    setEditFinanceSubRole(user?.financeSubRole ?? '');
    setEditModalOpen(true);
    if (user?._id) {
      try {
        const full = await tenantApiService.getUserById(tenantSlug, user._id);
        if (full) {
          setEditUser(full);
          setEditHrSubRole(full.hrSubRole ?? '');
          setEditFinanceSubRole(full.financeSubRole ?? '');
        }
      } catch (e) {
        console.warn('Could not load user details', e);
      }
    }
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditUser(null);
    setEditHrSubRole('');
    setEditFinanceSubRole('');
  };

  const openPasswordModal = (user) => {
    setPasswordUser(user);
    setNewPassword('');
    setConfirmNewPassword('');
    setPasswordModalOpen(true);
  };

  const closePasswordModal = () => {
    setPasswordModalOpen(false);
    setPasswordUser(null);
    setNewPassword('');
    setConfirmNewPassword('');
  };

  const submitAdminPassword = async () => {
    if (!passwordUser?._id || !tenantSlug) return;
    if (newPassword !== confirmNewPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setPwSaving(true);
    try {
      await tenantApiService.setUserPasswordAdmin(tenantSlug, passwordUser._id, newPassword);
      toast.success('Password updated');
      closePasswordModal();
    } catch (error) {
      toast.error(error?.message || 'Failed to update password');
    } finally {
      setPwSaving(false);
    }
  };

  const resendInvite = async (user) => {
    if (!tenantSlug || !user?.email) return;
    setInviteSendingId(user._id);
    try {
      const r = (user.role || '').toLowerCase();
      let erpRole = 'employee';
      if (r === 'hr') erpRole = 'hr';
      else if (r === 'finance') erpRole = 'finance';
      await tenantApiService.inviteEmployee(tenantSlug, {
        email: user.email,
        fullName: user.fullName || user.email.split('@')[0],
        erpRole,
        ...(r === 'hr' && user.hrSubRole ? { hrSubRole: user.hrSubRole } : {}),
        ...(r === 'finance' && user.financeSubRole ? { financeSubRole: user.financeSubRole } : {})
      });
      toast.success('Invitation sent');
      fetchUsers();
    } catch (error) {
      toast.error(error?.message || 'Failed to send invite');
    } finally {
      setInviteSendingId(null);
    }
  };

  const handleSaveHrSubRole = async () => {
    if (!editUser?._id || !tenantSlug) return;
    setSaving(true);
    try {
      const r = (editUser.role || '').toLowerCase();
      const payload = {};
      if (r === 'hr') payload.hrSubRole = editHrSubRole || null;
      if (r === 'finance') payload.financeSubRole = editFinanceSubRole || null;
      if (Object.keys(payload).length === 0) {
        toast.success('No sub-role changes to save');
        closeEditModal();
        return;
      }
      await tenantApiService.updateUser(tenantSlug, editUser._id, payload);
      toast.success('User updated');
      fetchUsers();
      closeEditModal();
    } catch (error) {
      console.error('Update user error:', error);
      toast.error(error?.message || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const getRoleColor = (role) => {
    const colors = {
      admin: 'bg-red-100 text-red-800',
      manager: 'bg-blue-100 text-blue-800',
      employee: 'bg-green-100 text-green-800',
      viewer: 'bg-gray-100 text-gray-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-red-100 text-red-800',
      pending: 'bg-orange-100 text-orange-800',
      suspended: 'bg-yellow-100 text-yellow-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const portalBadge = (portalStatus) => {
    if (!portalStatus) {
      return <span className="text-xs text-gray-400">Not linked</span>;
    }
    const label = portalStatus === 'pending' ? 'Invite pending' : portalStatus.charAt(0).toUpperCase() + portalStatus.slice(1);
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(portalStatus === 'pending' ? 'pending' : portalStatus === 'active' ? 'active' : portalStatus === 'suspended' ? 'suspended' : 'inactive')}`}>
        {label}
      </span>
    );
  };

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600">
              Manage users and their access to your organization
            </p>
          </div>
          <button
           
            onClick={() => navigate(`/${tenantSlug}/org/users/create`)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        {/* Filters */}
        <div className="p-6 border-b border-gray-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
            </div>
            <div>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                onChange={(e) => handleFilterChange('role', e.target.value)}
              >
                <option value="">Filter by role</option>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="employee">Employee</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <div>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">Filter by status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <div>
              <button
                onClick={fetchUsers}
                className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2"
              >
                <ArrowPathIcon className="h-5 w-5" />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Portal login
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                      <span className="ml-2 text-gray-600">Loading users...</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 bg-indigo-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-medium">
                              {user.fullName?.charAt(0) || 'U'}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.fullName}</div>
                          <div className="text-sm text-gray-500 line-clamp-1">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{user.email}</div>
                      <div className="mt-1">{portalBadge(user.portalTenantStatus)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(user.role)}`}>
                        {user.role?.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.department?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(user.status)}`}>
                        {user.status?.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(user)}
                          className="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50"
                          title="Edit user"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openPasswordModal(user)}
                          className="text-gray-700 hover:text-gray-900 p-1 rounded hover:bg-gray-100"
                          title="Change password"
                        >
                          <LockClosedIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => resendInvite(user)}
                          disabled={inviteSendingId === user._id}
                          className="text-emerald-700 hover:text-emerald-900 p-1 rounded hover:bg-emerald-50 disabled:opacity-50"
                          title="Resend portal invite"
                        >
                          <EnvelopeIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(user._id)}
                          className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                          title="Deactivate portal (soft)"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Edit User Modal (role / HR sub-role) */}
        {passwordModalOpen && passwordUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Change password</h3>
                <button type="button" onClick={closePasswordModal} className="p-1 rounded hover:bg-gray-100">
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Set a new login password for <span className="font-medium">{passwordUser.email}</span>. This does not reveal the current password.
              </p>
              <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3"
                autoComplete="new-password"
              />
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
              <input
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4"
                autoComplete="new-password"
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={closePasswordModal} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitAdminPassword}
                  disabled={pwSaving}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {pwSaving ? 'Saving…' : 'Save password'}
                </button>
              </div>
            </div>
          </div>
        )}

        {editModalOpen && editUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Edit User</h3>
                <button onClick={closeEditModal} className="p-1 rounded hover:bg-gray-100">
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                {editUser.fullName} ({editUser.email})
              </p>
              <p className="text-sm text-gray-500 mb-2">Role: <span className="font-medium text-gray-700">{editUser.role || '—'}</span></p>
              {(editUser.role === 'hr' || editUser.role === 'HR') && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">HR sub-role</label>
                  <select
                    value={editHrSubRole}
                    onChange={(e) => setEditHrSubRole(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {HR_SUB_ROLES.map((opt) => (
                      <option key={opt.value || 'none'} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Determines payroll vs leave vs roster access.</p>
                </div>
              )}
              {(editUser.role === 'finance' || editUser.role === 'Finance') && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Finance sub-role</label>
                  <select
                    value={editFinanceSubRole}
                    onChange={(e) => setEditFinanceSubRole(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {FINANCE_SUB_ROLES.map((opt) => (
                      <option key={opt.value || 'none'} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Refines AP/AR, reporting, and write access in Finance.</p>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={closeEditModal} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
                <button
                  onClick={handleSaveHrSubRole}
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pagination */}
        {pagination.total > 0 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((pagination.current - 1) * pagination.pageSize) + 1} to{' '}
                {Math.min(pagination.current * pagination.pageSize, pagination.total)} of{' '}
                {pagination.total} users
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleTableChange({ ...pagination, current: pagination.current - 1 })}
                  disabled={pagination.current === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm text-gray-700">
                  Page {pagination.current} of {Math.ceil(pagination.total / pagination.pageSize)}
                </span>
                <button
                  onClick={() => handleTableChange({ ...pagination, current: pagination.current + 1 })}
                  disabled={pagination.current >= Math.ceil(pagination.total / pagination.pageSize)}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserList;
