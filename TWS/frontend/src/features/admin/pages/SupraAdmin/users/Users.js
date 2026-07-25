import React, { useState, useEffect } from 'react';
import { 
  UserGroupIcon,
  UserPlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  SparklesIcon,
  BoltIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useTheme } from '../../../../../app/providers/ThemeContext';
import { get, patch, post } from '../../../../../shared/utils/apiClient';
import { Button } from '../../../../../components/ui/Button/Button';
import { Badge } from '../../../../../components/ui/Badge/Badge';
import { EmptyState } from '../../../../../components/ui/EmptyState/EmptyState';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '../../../../../components/ui/Dialog/Dialog';
import { TableSkeleton } from '../../../../../shared/components/ui/SkeletonLoader';
import { getRoleVariant, getStatusVariant } from '../../../../../shared/utils/statusVariants';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [assigning, setAssigning] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedResponsibility, setSelectedResponsibility] = useState('');
  const defaultCreateForm = {
    email: '',
    password: '',
    fullName: '',
    role: 'platform_admin',
    phone: '',
    department: 'Platform Administration',
    status: 'active'
  };
  const [createForm, setCreateForm] = useState(defaultCreateForm);
  const { isDarkMode } = useTheme();

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setCreateForm(defaultCreateForm);
  };

  const closeEditModal = () => {
    setShowAssignModal(false);
    setSelectedUser(null);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (roleFilter) params.append('role', roleFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (searchTerm) params.append('search', searchTerm);
      params.append('limit', '100');
      
      const response = await get(`/api/supra-admin/users?${params.toString()}`);
      
      // Handle different response formats
      const usersData = response?.data?.users || response?.users || response?.data || response || [];
      
      // TWSAdmin users don't have tenant info, they're platform admins
      setUsers(usersData);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch users');
      console.error('Fetch users error:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.department?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = !roleFilter || user.role === roleFilter;
    const matchesStatus = !statusFilter || user.status === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'platform_super_admin': return 'Super Admin';
      case 'platform_admin': return 'Admin';
      case 'platform_support': return 'Support';
      case 'platform_billing': return 'Billing';
      default: return role;
    }
  };

  const formatLastLogin = (date) => {
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  if (loading) {
    return (
      <div className="p-6">
        <TableSkeleton rows={5} columns={5} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="glass-card-premium p-8 hover-glow">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-500 rounded-2xl flex items-center justify-center shadow-lg">
                <SparklesIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold font-heading text-gray-900 dark:text-white tracking-tight">
                  User Management
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 font-medium">
                  View and assign users to Supra Admin portal responsibilities
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={fetchUsers}>
              <BoltIcon className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => setShowCreateModal(true)}>
              <UserPlusIcon className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="glass-card p-4 hover-glow border-l-4 border-red-500">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start space-x-3">
              <XCircleIcon className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-300">Couldn't load users</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{error}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={fetchUsers} className="flex-shrink-0 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-500/10">
              Try again
            </Button>
          </div>
        </div>
      )}

      {/* Info Banner */}
      <div className="glass-card p-4 hover-glow border-l-4 border-blue-500">
        <div className="flex items-start space-x-3">
          <InformationCircleIcon className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
              <strong>Note:</strong> These are TWS Admin users (Supra Admin / TWS internal employees) who manage the platform.
              You can create new TWS Admin users using the "Add User" button above.
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-6 hover-glow">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-8 h-8 bg-gradient-to-br from-secondary-500 to-accent-500 rounded-lg flex items-center justify-center">
            <FunnelIcon className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Filters & Search</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-3 glass-card rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white bg-white/10 backdrop-blur-sm"
            />
          </div>
          
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-3 glass-card rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white bg-white/10 backdrop-blur-sm"
          >
            <option value="">All Roles</option>
            <option value="platform_super_admin">Super Admin</option>
            <option value="platform_admin">Admin</option>
            <option value="platform_support">Support</option>
            <option value="platform_billing">Billing</option>
          </select>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 glass-card rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white bg-white/10 backdrop-blur-sm"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="inactive">Inactive</option>
          </select>
          
          <div className="flex items-center justify-center glass-card px-4 py-3 rounded-xl text-sm text-gray-600 dark:text-gray-400 font-medium">
            <FunnelIcon className="h-4 w-4 mr-2" />
            {filteredUsers.length} of {users.length} users
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="glass-card overflow-hidden rounded-xl">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="glass-card">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredUsers.map((user) => (
                <tr key={user._id} className="hover:bg-white/5 transition-colors duration-200">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                          <UserGroupIcon className="h-5 w-5 text-white" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{user.fullName}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={getRoleVariant(user.role)}>{getRoleDisplayName(user.role)}</Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={getStatusVariant(user.status)}>{user.status}</Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900 dark:text-white">
                      {user.department || 'Platform Administration'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {user.lastLogin ? formatLastLogin(new Date(user.lastLogin)) : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center space-x-1">
                      <Button variant="ghost" size="icon" title="View">
                        <EyeIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedUser(user);
                          setShowAssignModal(true);
                        }}
                        title="Edit User"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10"
                        onClick={async () => {
                          if (window.confirm(`Are you sure you want to delete ${user.fullName}?`)) {
                            try {
                              const res = await fetch(`/api/supra-admin/users/${user._id}`, {
                                method: 'DELETE',
                                credentials: 'include'
                              });
                              if (!res.ok) {
                                const data = await res.json().catch(() => ({}));
                                throw new Error(data.message || 'Failed to delete user');
                              }
                              toast.success('User deleted');
                              fetchUsers();
                            } catch (err) {
                              toast.error(err.message || 'Failed to delete user');
                            }
                          }
                        }}
                        title="Delete User"
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

      {!error && filteredUsers.length === 0 && (
        <EmptyState
          icon={UserGroupIcon}
          title="No users found"
          description={
            searchTerm || roleFilter || statusFilter
              ? 'Try adjusting your search or filter criteria.'
              : 'No TWS Admin users found. Click "Add User" to create a new one.'
          }
        />
      )}

      {/* Create User Modal */}
      <Dialog open={showCreateModal} onOpenChange={(open) => !open && closeCreateModal()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center shadow-lg">
                <UserPlusIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle>Create TWS Admin User</DialogTitle>
                <DialogDescription>Add a new Supra Admin / TWS internal employee</DialogDescription>
              </div>
            </div>
          </DialogHeader>

              <form className="space-y-4" onSubmit={async (e) => {
                e.preventDefault();
                
                try {
                  setCreating(true);
                  setError(null);
                  
                  console.log('📤 Creating user with data:', {
                    email: createForm.email,
                    fullName: createForm.fullName,
                    role: createForm.role,
                    hasPassword: !!createForm.password,
                    passwordLength: createForm.password?.length
                  });
                  
                  const response = await post('/api/supra-admin/users', createForm);
                  
                  console.log('✅ User creation response:', response);
                  
                  await fetchUsers();

                  closeCreateModal();

                  toast.success('User created');
                } catch (err) {
                  console.error('❌ Create user error:', err);
                  console.error('Error details:', {
                    message: err.message,
                    data: err.data,
                    status: err.status
                  });
                  
                  // Better error handling - show detailed error messages
                  let errorMessage = 'Failed to create user';
                  
                  if (err.data) {
                    // Error from apiClient (has .data property)
                    if (err.data.errors && Array.isArray(err.data.errors)) {
                      // Validation errors
                      const errorMessages = err.data.errors.map(e => 
                        `${e.param || e.field || e.path}: ${e.msg || e.message}`
                      ).join('\n');
                      errorMessage = `Validation errors:\n${errorMessages}`;
                    } else if (err.data.message) {
                      errorMessage = err.data.message;
                    } else if (err.data.error) {
                      errorMessage = err.data.error;
                    }
                  } else if (err.message) {
                    errorMessage = err.message;
                  }
                  
                  toast.error(errorMessage);
                } finally {
                  setCreating(false);
                }
              }}>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 glass-card rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white bg-white/10 backdrop-blur-sm"
                    value={createForm.fullName}
                    onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    className="w-full px-4 py-3 glass-card rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white bg-white/10 backdrop-blur-sm"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Password * (min 8 characters)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    className="w-full px-4 py-3 glass-card rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white bg-white/10 backdrop-blur-sm"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Role *
                  </label>
                  <select
                    required
                    className="w-full px-4 py-3 glass-card rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white bg-white/10 backdrop-blur-sm"
                    value={createForm.role}
                    onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                  >
                    <option value="platform_admin">Admin</option>
                    <option value="platform_super_admin">Super Admin</option>
                    <option value="platform_support">Support</option>
                    <option value="platform_billing">Billing</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Department
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 glass-card rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white bg-white/10 backdrop-blur-sm"
                    value={createForm.department}
                    onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Phone
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 glass-card rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white bg-white/10 backdrop-blur-sm"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  />
                </div>
                
                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" onClick={closeCreateModal} disabled={creating}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={creating}>
                    {creating ? 'Creating...' : 'Create User'}
                  </Button>
                </DialogFooter>
              </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      {showAssignModal && selectedUser && (
        <Dialog open={showAssignModal} onOpenChange={(open) => !open && closeEditModal()}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center shadow-lg">
                  <PencilIcon className="w-5 h-5 text-white" />
                </div>
                <DialogTitle>Edit User</DialogTitle>
              </div>
              <DialogDescription className="sr-only">Update user information</DialogDescription>
            </DialogHeader>

              <div className="mb-2 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>{selectedUser.fullName}</strong> ({selectedUser.email})
                </p>
              </div>

              <form className="space-y-4" onSubmit={async (e) => {
                e.preventDefault();
                
                try {
                  setAssigning(true);
                  
                  await patch(`/api/supra-admin/users/${selectedUser._id}`, {
                    fullName: selectedUser.fullName,
                    role: selectedUser.role,
                    department: selectedUser.department,
                    phone: selectedUser.phone,
                    status: selectedUser.status
                  });
                  
                  await fetchUsers();

                  closeEditModal();

                  toast.success('User updated');
                } catch (err) {
                  console.error('Update user error:', err);
                  toast.error(err.response?.data?.message || err.message || 'Failed to update user');
                } finally {
                  setAssigning(false);
                }
              }}>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 glass-card rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white bg-white/10 backdrop-blur-sm"
                    value={selectedUser.fullName || ''}
                    onChange={(e) => setSelectedUser({ ...selectedUser, fullName: e.target.value })}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Role
                  </label>
                  <select 
                    className="w-full px-4 py-3 glass-card rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white bg-white/10 backdrop-blur-sm"
                    value={selectedUser.role || 'platform_admin'}
                    onChange={(e) => setSelectedUser({ ...selectedUser, role: e.target.value })}
                  >
                    <option value="platform_admin">Admin</option>
                    <option value="platform_super_admin">Super Admin</option>
                    <option value="platform_support">Support</option>
                    <option value="platform_billing">Billing</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Department
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 glass-card rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white bg-white/10 backdrop-blur-sm"
                    value={selectedUser.department || ''}
                    onChange={(e) => setSelectedUser({ ...selectedUser, department: e.target.value })}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Status
                  </label>
                  <select 
                    className="w-full px-4 py-3 glass-card rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white bg-white/10 backdrop-blur-sm"
                    value={selectedUser.status || 'active'}
                    onChange={(e) => setSelectedUser({ ...selectedUser, status: e.target.value })}
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Phone
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 glass-card rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white bg-white/10 backdrop-blur-sm"
                    value={selectedUser.phone || ''}
                    onChange={(e) => setSelectedUser({ ...selectedUser, phone: e.target.value })}
                  />
                </div>
                
                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" onClick={closeEditModal} disabled={assigning}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={assigning}>
                    {assigning ? 'Updating...' : 'Update User'}
                  </Button>
                </DialogFooter>
              </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Users;
