import { API_BASE_URL } from '../../../../../constants/apiEndpoints';
import React, { useState, useEffect } from 'react';
import { 
  UserGroupIcon, 
  PlusIcon, 
  MagnifyingGlassIcon,
  EnvelopeIcon,
  UserPlusIcon,
  TrashIcon,
  PencilIcon,
  EyeIcon,
  CheckCircleIcon,
  ClockIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { Button } from '../../../../../components/ui/Button/Button';
import { Badge } from '../../../../../components/ui/Badge/Badge';
import { Spinner } from '../../../../../components/ui/Spinner/Spinner';
import { EmptyState } from '../../../../../components/ui/EmptyState/EmptyState';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from '../../../../../components/ui/Dialog/Dialog';
import { getRoleVariant, getStatusVariant } from '../../../../../shared/utils/statusVariants';
import { get, post, put, del } from '../../../../../shared/utils/apiClient';

const TenantUsers = () => {
  const [tenantId, setTenantId] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [stats, setStats] = useState(null);

  // Form state for inviting users
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'employee'
  });

  useEffect(() => {
    // Get tenant ID from URL params or state
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('tenantId');
    if (id) {
      setTenantId(id);
      fetchTenantUsers(id);
      fetchTenantStats(id);
    }
  }, []);

  const fetchTenantUsers = async (id) => {
    try {
      setLoading(true);
      const data = await get(`${API_BASE_URL}/api/tenant/switching/tenants/${id}/users`);
      setUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTenantStats = async (id) => {
    try {
      const data = await get(`${API_BASE_URL}/api/tenant/switching/tenants/${id}/stats`);
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const handleInviteUser = async (e) => {
    e.preventDefault();
    try {
      await post(`${API_BASE_URL}/api/tenant/switching/tenants/${tenantId}/invite`, inviteForm);
      setShowInviteModal(false);
      setInviteForm({ email: '', role: 'employee' });
      fetchTenantUsers(tenantId);
      fetchTenantStats(tenantId);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateUserRole = async (userId, newRole) => {
    try {
      await put(`${API_BASE_URL}/api/tenant/switching/tenants/${tenantId}/users/${userId}/role`, { role: newRole });
      fetchTenantUsers(tenantId);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRemoveUser = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this user from the tenant?')) {
      return;
    }

    try {
      await del(`${API_BASE_URL}/api/tenant/switching/tenants/${tenantId}/users/${userId}`);
      fetchTenantUsers(tenantId);
      fetchTenantStats(tenantId);
    } catch (err) {
      setError(err.message);
    }
  };

  const STATUS_ICONS = { active: CheckCircleIcon, pending: ClockIcon, inactive: XMarkIcon };
  const STATUS_LABELS = { active: 'Active', pending: 'Pending', inactive: 'Inactive' };

  const getStatusBadge = (status) => {
    const Icon = STATUS_ICONS[status] || ClockIcon;
    return (
      <Badge variant={getStatusVariant(status)} className="gap-1">
        <Icon className="h-3 w-3" />
        {STATUS_LABELS[status] || 'Pending'}
      </Badge>
    );
  };

  const getRoleBadge = (role) => {
    const label = role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Employee';
    return <Badge variant={getRoleVariant(role)}>{label}</Badge>;
  };

  const filteredUsers = users.filter(user => 
    user.userId.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.userId.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!tenantId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <EmptyState
          icon={UserGroupIcon}
          title="No tenant selected"
          description="Please select a tenant to manage users"
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" label="Loading users..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Tenant Users</h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage users and permissions for this tenant
              </p>
            </div>
            <Button onClick={() => setShowInviteModal(true)}>
              <UserPlusIcon className="h-5 w-5 mr-2" />
              Invite User
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <UserGroupIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                      <dd className="text-2xl font-semibold text-gray-900">{stats.totalUsers}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ClockIcon className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Pending Invitations</dt>
                      <dd className="text-2xl font-semibold text-gray-900">{stats.pendingInvitations}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CheckCircleIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Active Users</dt>
                      <dd className="text-2xl font-semibold text-gray-900">
                        {stats.totalUsers - stats.pendingInvitations}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 w-full"
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Activity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-700">
                              {user.userId.fullName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.userId.fullName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {user.userId.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getRoleBadge(user.roles[0]?.role || 'employee')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(user.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.lastActivity ? new Date(user.lastActivity).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedUser(user);
                            setShowUserDetails(true);
                          }}
                          title="View details"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </Button>
                        <select
                          value={user.roles[0]?.role || 'employee'}
                          onChange={(e) => handleUpdateUserRole(user._id, e.target.value)}
                          className="text-sm border border-gray-300 rounded px-2 py-1"
                        >
                          <option value="employee">Employee</option>
                          <option value="manager">Manager</option>
                          <option value="admin">Admin</option>
                          <option value="owner">Owner</option>
                        </select>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveUser(user._id)}
                          className="hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10"
                          title="Remove from tenant"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Invite User Modal */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite User to Tenant</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInviteUser} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
              <input
                type="email"
                required
                value={inviteForm.email}
                onChange={(e) => setInviteForm({...inviteForm, email: e.target.value})}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="user@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
              <select
                value={inviteForm.role}
                onChange={(e) => setInviteForm({...inviteForm, role: e.target.value})}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
                <option value="owner">Owner</option>
              </select>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setShowInviteModal(false)}>
                Cancel
              </Button>
              <Button type="submit">Send Invitation</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* User Details Modal */}
      {showUserDetails && selectedUser && (
        <Dialog open={showUserDetails} onOpenChange={setShowUserDetails}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-gray-900 dark:text-gray-100">
              <div>
                <span className="font-medium">Name:</span> {selectedUser.userId.fullName}
              </div>
              <div>
                <span className="font-medium">Email:</span> {selectedUser.userId.email}
              </div>
              <div>
                <span className="font-medium">Role:</span> {selectedUser.roles[0]?.role || 'employee'}
              </div>
              <div>
                <span className="font-medium">Status:</span> {selectedUser.status}
              </div>
              <div>
                <span className="font-medium">Joined:</span> {new Date(selectedUser.createdAt).toLocaleDateString()}
              </div>
              <div>
                <span className="font-medium">Last Activity:</span> {selectedUser.lastActivity ? new Date(selectedUser.lastActivity).toLocaleDateString() : 'Never'}
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setShowUserDetails(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default TenantUsers;
