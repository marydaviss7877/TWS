import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  ArrowPathIcon,
  XMarkIcon,
  LockClosedIcon,
  EnvelopeIcon,
  PhoneIcon,
  BriefcaseIcon,
  BuildingOfficeIcon,
  PhotoIcon,
  KeyIcon,
  ShieldCheckIcon,
  ArrowUpTrayIcon,
  UserIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { tenantApiService } from '../../../../../../shared/services/tenant/tenant-api.service';
import toast from 'react-hot-toast';
import { useTenantSlug } from '../../../../../../shared/hooks/useTenantSlug';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../../../../../components/ui/Sheet/Sheet';
import { Button } from '../../../../../../components/ui/Button/Button';
import { Input } from '../../../../../../components/ui/Input/Input';

// Roles offerable at creation time (excludes 'owner' — not assignable via quick-add)
const CREATE_ERP_ROLES = [
  { value: 'employee', label: 'Employee' },
  { value: 'manager', label: 'Manager' },
  { value: 'hr', label: 'HR' },
  { value: 'finance', label: 'Finance' },
  { value: 'project_manager', label: 'Project Manager' },
  { value: 'admin', label: 'Admin' },
  { value: 'contractor', label: 'Contractor' },
  { value: 'client', label: 'Client' }
];

const EMPTY_CREATE_USER_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  phone: '',
  jobTitle: '',
  department: '',
  erpRole: 'employee',
  hrSubRole: '',
  financeSubRole: ''
};

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

const ERP_ROLES = [
  { value: 'employee', label: 'Employee' },
  { value: 'manager', label: 'Manager' },
  { value: 'project_manager', label: 'Project Manager' },
  { value: 'hr', label: 'HR' },
  { value: 'finance', label: 'Finance' },
  { value: 'admin', label: 'Admin' },
  { value: 'owner', label: 'Owner' },
  { value: 'contractor', label: 'Contractor' },
  { value: 'client', label: 'Client' }
];

const ROLE_DEFAULT_PERMISSIONS = {
  owner: ['*:*'],
  admin: [
    'projects:read', 'projects:write', 'tasks:read', 'tasks:write', 'documents:read', 'documents:write',
    'hr:read', 'hr:write', 'employees:read', 'employees:write', 'attendance:read', 'attendance:write',
    'leave:read', 'leave:write', 'payroll:read', 'payroll:write',
    'finance:read', 'finance:write',
    'analytics:read', 'reports:read', 'audit:read', 'clients:read', 'clients:write',
    'settings:read', 'settings:write', 'nucleus:read', 'nucleus:write', 'teams:read', 'teams:write'
  ],
  manager: [
    'projects:read', 'tasks:read', 'tasks:write', 'documents:read', 'documents:write',
    'attendance:read', 'leave:read', 'leave:write', 'analytics:read', 'nucleus:read', 'nucleus:write',
    'teams:read', 'teams:write', 'finance:read'
  ],
  project_manager: [
    'projects:read', 'projects:write', 'tasks:read', 'tasks:write', 'documents:read', 'documents:write',
    'nucleus:read', 'nucleus:write', 'clients:read', 'analytics:read', 'teams:read', 'teams:write',
    'finance:read'
  ],
  employee: [
    'projects:read', 'tasks:read', 'documents:read', 'attendance:read', 'attendance:write_own',
    'leave:read', 'leave:write', 'nucleus:read', 'payroll:read_own', 'teams:read', 'employees:read_own', 'finance:read'
  ],
  contractor: [
    'tasks:read', 'tasks:write', 'documents:read', 'nucleus:read', 'attendance:read', 'attendance:write',
    'employees:read_own', 'finance:read'
  ],
  client: ['projects:read', 'nucleus:read', 'documents:read'],
  hr: [],
  finance: []
};

const resolveProfilePicture = (url, tenantSlug) => {
  if (!url || typeof url !== 'string') return null;
  if (/^https?:\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) return url;
  if (url.startsWith('/uploads/profile-pictures/')) return url;
  const uploadMatch = url.match(/\/uploads\/profile-pictures\/[^/?#]+/);
  if (uploadMatch) return uploadMatch[0];
  if (url.startsWith('/api/tenant/')) return url;
  if (url.startsWith('uploads/profile-pictures/')) return `/${url}`;
  return `/api/tenant/${tenantSlug}/organization/uploads/profile-pictures/${url.replace(/^\/+/, '')}`;
};

const UserAvatar = ({ user, tenantSlug }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const src = resolveProfilePicture(user?.profilePicUrl || user?.avatarUrl, tenantSlug);
  const fallback = (user?.fullName || user?.email || 'U')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase();

  if (src && !imageFailed) {
    return (
      <img
        src={src}
        alt={`${user?.fullName || 'User'} profile`}
        className="h-10 w-10 rounded-full object-cover ring-2 ring-white dark:ring-slate-800 shadow-sm"
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <div className="h-10 w-10 rounded-full flex items-center justify-center bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 ring-1 ring-sky-200/70 dark:ring-sky-700/40">
      <span className="text-xs font-semibold">{fallback || 'U'}</span>
    </div>
  );
};

const normalizePermissionCodeList = (codes) => {
  if (!Array.isArray(codes)) return [];
  const seen = new Set();
  const normalized = [];
  for (const raw of codes) {
    const code = String(raw || '').trim().toLowerCase();
    if (!code || seen.has(code)) continue;
    seen.add(code);
    normalized.push(code);
  }
  return normalized;
};

const UserList = () => {
  const tenantSlug = useTenantSlug();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_USER_FORM);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [createSuccess, setCreateSuccess] = useState(false);
  const [createTempPassword, setCreateTempPassword] = useState(null);
  const [createDepartmentOptions, setCreateDepartmentOptions] = useState([]);
  const [createProfilePicFile, setCreateProfilePicFile] = useState(null);
  const [createProfilePicPreview, setCreateProfilePicPreview] = useState(null);
  const createProfilePicPreviewRef = useRef(null);

  useEffect(() => () => {
    if (createProfilePicPreviewRef.current) URL.revokeObjectURL(createProfilePicPreviewRef.current);
  }, []);
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
  const [editRole, setEditRole] = useState('employee');
  const [editHrSubRole, setEditHrSubRole] = useState('');
  const [editFinanceSubRole, setEditFinanceSubRole] = useState('');
  const [editAssignedRoleId, setEditAssignedRoleId] = useState('');
  const [organizationRoles, setOrganizationRoles] = useState([]);
  const [permissionCatalogEntries, setPermissionCatalogEntries] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [selectedCustomPermissions, setSelectedCustomPermissions] = useState([]);
  const [selectedDeniedPermissions, setSelectedDeniedPermissions] = useState([]);
  const customPermissionsRef = useRef([]);
  const deniedPermissionsRef = useRef([]);
  const [roleDefaultPermissionCodes, setRoleDefaultPermissionCodes] = useState([]);
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

  useEffect(() => {
    if (!editModalOpen) return;
    const defaults = ROLE_DEFAULT_PERMISSIONS[String(editRole || '').toLowerCase()] || [];
    setRoleDefaultPermissionCodes(defaults);
  }, [editRole, editModalOpen]);

  // Quick Create / command palette lands here as ?create=user
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('create') === 'user') {
      openCreateSheet();
      params.delete('create');
      const next = params.toString();
      navigate({ pathname: location.pathname, search: next ? `?${next}` : '' }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  useEffect(() => {
    if (!showCreateSheet || !tenantSlug) return;
    tenantApiService.getDepartments(tenantSlug)
      .then((depts) => {
        if (Array.isArray(depts) && depts.length > 0) {
          const names = depts.map((d) => d.name).filter(Boolean);
          setCreateDepartmentOptions([...new Set(names)]);
        }
      })
      .catch(() => {});
  }, [showCreateSheet, tenantSlug]);

  const openCreateSheet = () => setShowCreateSheet(true);

  const closeCreateSheet = () => {
    setShowCreateSheet(false);
    setCreateForm(EMPTY_CREATE_USER_FORM);
    setCreateError(null);
    setCreateSuccess(false);
    setCreateTempPassword(null);
    setCreateProfilePicFile(null);
    setCreateProfilePicPreview(null);
  };

  const handleCreateFormChange = (e) => {
    const { name, value } = e.target;
    setCreateForm((prev) => ({ ...prev, [name]: value }));
    setCreateError(null);
  };

  const handleCreateProfilePicChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }
    setCreateProfilePicFile(file);
    if (createProfilePicPreviewRef.current) URL.revokeObjectURL(createProfilePicPreviewRef.current);
    const preview = URL.createObjectURL(file);
    createProfilePicPreviewRef.current = preview;
    setCreateProfilePicPreview(preview);
  };

  const handleCreateUserSubmit = async (e) => {
    e.preventDefault();
    setCreateError(null);

    if (!createForm.firstName.trim() || !createForm.lastName.trim() || !createForm.email.trim()) {
      setCreateError('First name, last name, and email are required.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(createForm.email.trim())) {
      setCreateError('Please enter a valid email address.');
      return;
    }

    setCreateLoading(true);
    try {
      const userData = {
        fullName: `${createForm.firstName.trim()} ${createForm.lastName.trim()}`,
        firstName: createForm.firstName.trim(),
        lastName: createForm.lastName.trim(),
        email: createForm.email.trim().toLowerCase(),
        ...(createForm.password?.trim() ? { password: createForm.password.trim() } : {}),
        ...(createForm.phone?.trim() ? { phone: createForm.phone.trim() } : {}),
        ...(createForm.jobTitle?.trim() ? { jobTitle: createForm.jobTitle.trim() } : {}),
        ...(createForm.department?.trim() ? { department: createForm.department.trim() } : {}),
        erpRole: createForm.erpRole || 'employee',
        ...(createForm.erpRole === 'hr' && createForm.hrSubRole ? { hrSubRole: createForm.hrSubRole } : {}),
        ...(createForm.erpRole === 'finance' && createForm.financeSubRole ? { financeSubRole: createForm.financeSubRole } : {})
      };

      const response = await tenantApiService.createUser(tenantSlug, userData);

      const createdUserId = response?._id || response?.id;
      if (createProfilePicFile && createdUserId) {
        const picForm = new FormData();
        picForm.append('profilePic', createProfilePicFile);
        const picRes = await fetch(`/api/tenant/${tenantSlug}/organization/users/${createdUserId}/picture`, {
          method: 'POST',
          credentials: 'include',
          body: picForm
        });
        if (!picRes.ok) {
          const picErr = await picRes.json().catch(() => ({}));
          throw new Error(picErr.message || 'User created but profile picture upload failed.');
        }
      }

      if (response?.temporaryPassword) {
        setCreateTempPassword(response.temporaryPassword);
      }
      setCreateSuccess(true);
      toast.success('User created successfully!');
      fetchUsers();
      if (!response?.temporaryPassword) {
        setTimeout(() => closeCreateSheet(), 1800);
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to create user.';
      setCreateError(msg);
      toast.error(msg);
    } finally {
      setCreateLoading(false);
    }
  };

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
    let sourceUser = user;
    if (user?._id) {
      try {
        const full = await tenantApiService.getUserById(tenantSlug, user._id, { cacheBust: true });
        if (full) sourceUser = full;
      } catch (e) {
        console.warn('Could not load user details', e);
      }
    }
    const initialRole = String(sourceUser?.role || 'employee').toLowerCase();
    setEditUser(sourceUser);
    setEditRole(initialRole);
    setEditHrSubRole(sourceUser?.hrSubRole ?? '');
    setEditFinanceSubRole(sourceUser?.financeSubRole ?? '');
    setEditAssignedRoleId(String(sourceUser?.assignedRoleId || ''));
    const normalizedCustom = normalizePermissionCodeList(sourceUser?.customPermissionCodes);
    const normalizedDenied = normalizePermissionCodeList(sourceUser?.deniedPermissionCodes);
    customPermissionsRef.current = normalizedCustom;
    deniedPermissionsRef.current = normalizedDenied;
    setSelectedCustomPermissions(normalizedCustom);
    setSelectedDeniedPermissions(normalizedDenied);
    setRoleDefaultPermissionCodes(ROLE_DEFAULT_PERMISSIONS[initialRole] || []);
    setEditModalOpen(true);
    await Promise.all([fetchPermissionCatalog(), fetchOrganizationRoles()]);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditUser(null);
    setEditRole('employee');
    setEditHrSubRole('');
    setEditFinanceSubRole('');
    setEditAssignedRoleId('');
    customPermissionsRef.current = [];
    deniedPermissionsRef.current = [];
    setSelectedCustomPermissions([]);
    setSelectedDeniedPermissions([]);
    setRoleDefaultPermissionCodes([]);
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

  const fetchPermissionCatalog = async () => {
    if (!tenantSlug) return;
    try {
      setCatalogLoading(true);
      const data = await tenantApiService.getPermissionCatalog(tenantSlug);
      const sections = [
        ...(data?.softwareHouse?.entries || []),
        ...(data?.organization?.entries || []),
        ...(data?.organizationHrSubroles?.entries || []),
        ...(data?.organizationFinanceSubroles?.entries || [])
      ];
      const seen = new Set();
      const entries = [];
      for (const row of sections) {
        const code = String(row?.code || '').trim().toLowerCase();
        if (!code || seen.has(code)) continue;
        seen.add(code);
        entries.push({
          code,
          module: row?.module || 'general',
          access: Array.isArray(row?.accessTypes) ? row.accessTypes.join(', ') : ''
        });
      }
      setPermissionCatalogEntries(entries.sort((a, b) => a.code.localeCompare(b.code)));
    } catch (error) {
      console.warn('Could not load permission catalog', error);
      setPermissionCatalogEntries([]);
    } finally {
      setCatalogLoading(false);
    }
  };

  const fetchOrganizationRoles = async () => {
    if (!tenantSlug) return;
    try {
      const data = await tenantApiService.getRoles(tenantSlug);
      setOrganizationRoles(Array.isArray(data)
        ? data.filter((entry) => entry?.isActive !== false && entry?.tenantId)
        : []);
    } catch (error) {
      console.warn('Could not load organization roles', error);
      setOrganizationRoles([]);
    }
  };

  const toggleCustomPermission = (code) => {
    if (roleDefaultPermissionCodes.includes(code)) return;
    const current = customPermissionsRef.current;
    const next = current.includes(code) ? current.filter((c) => c !== code) : [...current, code];
    customPermissionsRef.current = next;
    setSelectedCustomPermissions(next);
  };

  const toggleDeniedPermission = (code) => {
    if (!roleDefaultPermissionCodes.includes(code)) return;
    const current = deniedPermissionsRef.current;
    const next = current.includes(code) ? current.filter((c) => c !== code) : [...current, code];
    deniedPermissionsRef.current = next;
    setSelectedDeniedPermissions(next);
  };

  const handleSaveRoleAndPermissions = async () => {
    if (!editUser?._id || !tenantSlug) return;
    setSaving(true);
    try {
      const normalizedRole = String(editRole || 'employee').toLowerCase();
      const roleDefaults = ROLE_DEFAULT_PERMISSIONS[normalizedRole] || [];
      // Persist only denies that belong to the selected role defaults.
      const effectiveDenied = normalizePermissionCodeList(deniedPermissionsRef.current)
        .filter((code) => roleDefaults.includes(code));
      const payload = {
        role: normalizedRole,
        assignedRoleId: editAssignedRoleId || null,
        customPermissionCodes: normalizePermissionCodeList(customPermissionsRef.current),
        deniedPermissionCodes: effectiveDenied
      };
      console.log('[UPRDBG][save payload]', {
        userId: editUser._id,
        role: payload.role,
        customPermissionCodes: payload.customPermissionCodes,
        deniedPermissionCodes: payload.deniedPermissionCodes
      });
      payload.hrSubRole = normalizedRole === 'hr' ? (editHrSubRole || null) : null;
      payload.financeSubRole = normalizedRole === 'finance' ? (editFinanceSubRole || null) : null;
      await tenantApiService.updateUser(tenantSlug, editUser._id, payload);
      toast.success('Role and permissions updated');
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
      admin: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      manager: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      employee: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      viewer: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
    };
    return colors[role] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      inactive: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      pending: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      suspended: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  };

  const portalBadge = (portalStatus) => {
    if (!portalStatus) {
      return <span className="text-xs text-gray-400 dark:text-gray-500">Not linked</span>;
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage users and their access to your organization
            </p>
          </div>
          <Button onClick={openCreateSheet} className="gap-2">
            <PlusIcon className="h-5 w-5" />
            <span>Add User</span>
          </Button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow dark:shadow-none dark:ring-1 dark:ring-gray-800">
        {/* Filters */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                <Input
                  type="text"
                  placeholder="Search users..."
                  className="pl-10"
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
            </div>
            <div>
              <select
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
              <Button onClick={fetchUsers} variant="secondary" className="w-full gap-2">
                <ArrowPathIcon className="h-5 w-5" />
                <span>Refresh</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Portal login
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center">
                      <div className="tws-loading-pulse rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
                      <span className="ml-2 text-gray-600 dark:text-gray-400">Loading users...</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <UserAvatar user={user} tenantSlug={tenantSlug} />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{user.fullName}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{user.email}</div>
                      <div className="mt-1">{portalBadge(user.portalTenantStatus)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(user.role)}`}>
                        {user.role?.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {user.department?.name || user.department || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(user.status)}`}>
                        {user.status?.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(user)}
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 p-1 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                          title="Edit user"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openPasswordModal(user)}
                          className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                          title="Change password"
                        >
                          <LockClosedIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => resendInvite(user)}
                          disabled={inviteSendingId === user._id}
                          className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-300 p-1 rounded hover:bg-emerald-50 dark:hover:bg-emerald-900/30 disabled:opacity-50"
                          title="Resend portal invite"
                        >
                          <EnvelopeIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(user._id)}
                          className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30"
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

        {/* Edit User Modal (role / overrides) */}
        {passwordModalOpen && passwordUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full p-6 dark:ring-1 dark:ring-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Change password</h3>
                <button type="button" onClick={closePasswordModal} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                  <XMarkIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Set a new login password for <span className="font-medium text-gray-900 dark:text-gray-200">{passwordUser.email}</span>. This does not reveal the current password.
              </p>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 mb-3"
                autoComplete="new-password"
              />
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm password</label>
              <input
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 mb-4"
                autoComplete="new-password"
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={closePasswordModal}>
                  Cancel
                </Button>
                <Button type="button" onClick={submitAdminPassword} disabled={pwSaving}>
                  {pwSaving ? 'Saving…' : 'Save password'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {editModalOpen && editUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full p-6 dark:ring-1 dark:ring-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit User</h3>
                <button onClick={closeEditModal} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                  <XMarkIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {editUser.fullName} ({editUser.email})
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Portal role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {ERP_ROLES.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Organization role</label>
                <select
                  value={editAssignedRoleId}
                  onChange={(e) => setEditAssignedRoleId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">— No additional organization role —</option>
                  {organizationRoles.map((orgRole) => (
                    <option key={orgRole._id} value={orgRole._id}>{orgRole.name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Adds the permissions maintained in Roles. Changes to that role take effect for every assigned user.
                </p>
              </div>
              {editRole === 'hr' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">HR sub-role</label>
                  <select
                    value={editHrSubRole}
                    onChange={(e) => setEditHrSubRole(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {HR_SUB_ROLES.map((opt) => (
                      <option key={opt.value || 'none'} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Determines payroll vs leave vs roster access.</p>
                </div>
              )}
              {editRole === 'finance' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Finance sub-role</label>
                  <select
                    value={editFinanceSubRole}
                    onChange={(e) => setEditFinanceSubRole(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {FINANCE_SUB_ROLES.map((opt) => (
                      <option key={opt.value || 'none'} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Refines AP/AR, reporting, and write access in Finance.</p>
                </div>
              )}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Custom permission overrides
                  </label>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {roleDefaultPermissionCodes.length} role default, {selectedCustomPermissions.length} custom, {selectedDeniedPermissions.length} denied
                  </span>
                </div>
                <div className="max-h-52 overflow-y-auto border border-gray-300 dark:border-gray-700 rounded-lg p-2 space-y-1 bg-gray-50 dark:bg-gray-800">
                  {catalogLoading ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1">Loading permission catalog...</p>
                  ) : permissionCatalogEntries.length === 0 ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1">No permission catalog found.</p>
                  ) : (
                    permissionCatalogEntries.map((entry) => (
                      <label key={entry.code} className="flex items-start gap-2 px-2 py-1 rounded hover:bg-white dark:hover:bg-gray-900 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={
                            (roleDefaultPermissionCodes.includes(entry.code) && !selectedDeniedPermissions.includes(entry.code)) ||
                            selectedCustomPermissions.includes(entry.code)
                          }
                          onChange={() =>
                            roleDefaultPermissionCodes.includes(entry.code)
                              ? toggleDeniedPermission(entry.code)
                              : toggleCustomPermission(entry.code)
                          }
                          className="mt-0.5"
                        />
                        <span className="text-xs">
                          <span className="font-mono text-gray-800 dark:text-gray-200">{entry.code}</span>
                          <span className="text-gray-500 dark:text-gray-400 ml-2">({entry.module}{entry.access ? ` - ${entry.access}` : ''})</span>
                          {roleDefaultPermissionCodes.includes(entry.code) && (
                            <span className="ml-2 inline-flex px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-[10px] font-semibold">
                              role default
                            </span>
                          )}
                          {selectedDeniedPermissions.includes(entry.code) && (
                            <span className="ml-2 inline-flex px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-[10px] font-semibold">
                              denied
                            </span>
                          )}
                        </span>
                      </label>
                    ))
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Role defaults auto-tick when you change role. Uncheck a role default to deny it for this user; tick others to add custom access.
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={closeEditModal}>
                  Cancel
                </Button>
                <Button onClick={handleSaveRoleAndPermissions} disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Pagination */}
        {pagination.total > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Showing {((pagination.current - 1) * pagination.pageSize) + 1} to{' '}
                {Math.min(pagination.current * pagination.pageSize, pagination.total)} of{' '}
                {pagination.total} users
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleTableChange({ ...pagination, current: pagination.current - 1 })}
                  disabled={pagination.current === 1}
                >
                  Previous
                </Button>
                <span className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300">
                  Page {pagination.current} of {Math.ceil(pagination.total / pagination.pageSize)}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleTableChange({ ...pagination, current: pagination.current + 1 })}
                  disabled={pagination.current >= Math.ceil(pagination.total / pagination.pageSize)}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <Sheet open={showCreateSheet} onOpenChange={(open) => !open && closeCreateSheet()}>
        <SheetContent side="right" className="sm:max-w-xl w-full overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add User</SheetTitle>
          </SheetHeader>

          {createSuccess ? (
            <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
              <div className="flex items-start gap-3">
                <CheckCircleIcon className="w-6 h-6 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-green-900 dark:text-green-100">User created successfully!</p>
                  {createTempPassword ? (
                    <>
                      <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                        A temporary password was auto-generated. Share it securely — the user will be prompted to change it on first login.
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-green-600 dark:text-green-400 font-medium">Temp password:</span>
                        <code className="font-mono text-sm bg-green-100 dark:bg-green-800/40 px-3 py-1 rounded-lg text-green-900 dark:text-green-100 select-all">
                          {createTempPassword}
                        </code>
                      </div>
                      <Button onClick={closeCreateSheet} className="mt-3">
                        Done
                      </Button>
                    </>
                  ) : (
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">Closing…</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCreateUserSubmit} className="mt-6 space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-primary-500" />
                  Personal Information
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Profile Picture
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      {createProfilePicPreview ? (
                        <img src={createProfilePicPreview} alt="Preview" className="h-full w-full object-cover" />
                      ) : (
                        <PhotoIcon className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                    <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                      <ArrowUpTrayIcon className="w-4 h-4" />
                      Upload Picture
                      <input type="file" accept="image/*" onChange={handleCreateProfilePicChange} className="hidden" />
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={createForm.firstName}
                      onChange={handleCreateFormChange}
                      required
                      placeholder="First name"
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={createForm.lastName}
                      onChange={handleCreateFormChange}
                      required
                      placeholder="Last name"
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <EnvelopeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      name="email"
                      value={createForm.email}
                      onChange={handleCreateFormChange}
                      required
                      placeholder="user@example.com"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone
                  </label>
                  <div className="relative">
                    <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      name="phone"
                      value={createForm.phone}
                      onChange={handleCreateFormChange}
                      placeholder="+1 555 000 0000"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <ShieldCheckIcon className="w-4 h-4 text-primary-500" />
                  Role &amp; Access
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Portal Role
                    </label>
                    <select
                      name="erpRole"
                      value={createForm.erpRole}
                      onChange={handleCreateFormChange}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    >
                      {CREATE_ERP_ROLES.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>

                  {createForm.erpRole === 'hr' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        HR Sub-role
                      </label>
                      <select
                        name="hrSubRole"
                        value={createForm.hrSubRole}
                        onChange={handleCreateFormChange}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                      >
                        {HR_SUB_ROLES.map((r) => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {createForm.erpRole === 'finance' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Finance Sub-role
                      </label>
                      <select
                        name="financeSubRole"
                        value={createForm.financeSubRole}
                        onChange={handleCreateFormChange}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                      >
                        {FINANCE_SUB_ROLES.map((r) => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <BriefcaseIcon className="w-4 h-4 text-primary-500" />
                  Job Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Job Title
                    </label>
                    <input
                      type="text"
                      name="jobTitle"
                      value={createForm.jobTitle}
                      onChange={handleCreateFormChange}
                      placeholder="e.g. Software Developer"
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Department
                    </label>
                    <div className="relative">
                      <BuildingOfficeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <select
                        name="department"
                        value={createForm.department}
                        onChange={handleCreateFormChange}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                      >
                        <option value="">— Select department —</option>
                        {createDepartmentOptions.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <KeyIcon className="w-4 h-4 text-primary-500" />
                  Password
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Leave empty to auto-generate a temporary password. The user will be prompted to change it on first login.
                </p>
                <div className="relative">
                  <KeyIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    name="password"
                    value={createForm.password}
                    onChange={handleCreateFormChange}
                    placeholder="Leave blank for auto-generated password"
                    autoComplete="new-password"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  />
                </div>
              </div>

              {createError && (
                <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-400">
                  {createError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={closeCreateSheet}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createLoading}>
                  {createLoading ? 'Creating…' : 'Create User'}
                </Button>
              </div>
            </form>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default UserList;
