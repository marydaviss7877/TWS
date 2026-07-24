import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  BriefcaseIcon,
  BuildingOfficeIcon,
  PhotoIcon,
  CheckCircleIcon,
  XMarkIcon,
  KeyIcon,
  ShieldCheckIcon,
  ArrowUpTrayIcon
} from '@heroicons/react/24/outline';
import { tenantApiService } from '../../../../../../shared/services/tenant/tenant-api.service';
import toast from 'react-hot-toast';
import { useTenantSlug } from '../../../../../../shared/hooks/useTenantSlug';

const ERP_ROLES = [
  { value: 'employee', label: 'Employee' },
  { value: 'manager', label: 'Manager' },
  { value: 'hr', label: 'HR' },
  { value: 'finance', label: 'Finance' },
  { value: 'project_manager', label: 'Project Manager' },
  { value: 'admin', label: 'Admin' },
  { value: 'contractor', label: 'Contractor' },
  { value: 'client', label: 'Client' }
];

const HR_SUB_ROLES = [
  { value: '', label: '— None —' },
  { value: 'manager', label: 'HR Manager (full roster, payroll, leave)' },
  { value: 'executive', label: 'HR Executive (roster & leave; no payroll)' },
  { value: 'payroll_officer', label: 'Payroll Officer (payroll only)' }
];

const FINANCE_SUB_ROLES = [
  { value: '', label: '— None —' },
  { value: 'manager', label: 'Finance Manager (full finance & payroll)' },
  { value: 'accountant', label: 'Accountant (GL, AP/AR, payroll read)' },
  { value: 'analyst', label: 'Analyst (read-only finance & reports)' },
  { value: 'ap_officer', label: 'AP Officer (payables)' },
  { value: 'ar_officer', label: 'AR Officer (receivables)' }
];

const DEFAULT_DEPARTMENTS = [
  'Engineering', 'Frontend', 'Backend', 'Full-Stack', 'DevOps',
  'QA', 'Design', 'Project Management', 'Product', 'HR', 'Finance', 'Operations'
];

const UserCreate = () => {
  const tenantSlug = useTenantSlug();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [tempPassword, setTempPassword] = useState(null);
  const [departmentOptions, setDepartmentOptions] = useState(DEFAULT_DEPARTMENTS);
  const [profilePicFile, setProfilePicFile] = useState(null);
  const [profilePicPreview, setProfilePicPreview] = useState(null);

  const [formData, setFormData] = useState({
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
  });

  useEffect(() => {
    tenantApiService.getDepartments(tenantSlug)
      .then((depts) => {
        if (Array.isArray(depts) && depts.length > 0) {
          const names = depts.map((d) => d.name).filter(Boolean);
          setDepartmentOptions([...new Set([...names, ...DEFAULT_DEPARTMENTS])]);
        }
      })
      .catch(() => {});
  }, [tenantSlug]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleProfilePicChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }
    setProfilePicFile(file);
    setProfilePicPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim()) {
      setError('First name, last name, and email are required.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const userData = {
        fullName: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        ...(formData.password?.trim() ? { password: formData.password.trim() } : {}),
        ...(formData.phone?.trim() ? { phone: formData.phone.trim() } : {}),
        ...(formData.jobTitle?.trim() ? { jobTitle: formData.jobTitle.trim() } : {}),
        ...(formData.department?.trim() ? { department: formData.department.trim() } : {}),
        erpRole: formData.erpRole || 'employee',
        ...(formData.erpRole === 'hr' && formData.hrSubRole ? { hrSubRole: formData.hrSubRole } : {}),
        ...(formData.erpRole === 'finance' && formData.financeSubRole ? { financeSubRole: formData.financeSubRole } : {})
      };

      const response = await tenantApiService.createUser(tenantSlug, userData);

      const createdUserId = response?._id || response?.id;
      if (profilePicFile && createdUserId) {
        const picForm = new FormData();
        picForm.append('profilePic', profilePicFile);
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
        setTempPassword(response.temporaryPassword);
      }
      setSuccess(true);
      toast.success('User created successfully!');
      if (!response?.temporaryPassword) {
        setTimeout(() => navigate(`/${tenantSlug}/org/users`), 1800);
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to create user.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl xl:text-3xl font-bold font-heading text-gray-900 dark:text-white">
            Add User
          </h1>
          <p className="text-sm xl:text-base text-gray-600 dark:text-gray-300 mt-1">
            Create a new portal user for your organisation
          </p>
        </div>
        <button
          onClick={() => navigate(`/${tenantSlug}/org/users`)}
          className="glass-button px-4 py-2 rounded-xl hover-scale flex items-center gap-2"
        >
          <XMarkIcon className="w-5 h-5" />
          <span className="font-medium">Cancel</span>
        </button>
      </div>

      {/* Success banner */}
      {success && (
        <div className="glass-card-premium p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
          <div className="flex items-start gap-3">
            <CheckCircleIcon className="w-6 h-6 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-green-900 dark:text-green-100">User created successfully!</p>
              {tempPassword ? (
                <>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    A temporary password was auto-generated. Share it securely — the user will be prompted to change it on first login.
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium">Temp password:</span>
                    <code className="font-mono text-sm bg-green-100 dark:bg-green-800/40 px-3 py-1 rounded-lg text-green-900 dark:text-green-100 select-all">
                      {tempPassword}
                    </code>
                  </div>
                  <button
                    onClick={() => navigate(`/${tenantSlug}/org/users`)}
                    className="mt-3 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-medium"
                  >
                    Back to Users
                  </button>
                </>
              ) : (
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">Redirecting…</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      {!success && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <div className="glass-card-premium rounded-2xl p-6 space-y-5">
            <h2 className="text-lg font-semibold font-heading text-gray-900 dark:text-white flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-primary-500" />
              Personal Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Profile Picture
                </label>
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    {profilePicPreview ? (
                      <img src={profilePicPreview} alt="Preview" className="h-full w-full object-cover" />
                    ) : (
                      <PhotoIcon className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                    <ArrowUpTrayIcon className="w-4 h-4" />
                    Upload Picture
                    <input type="file" accept="image/*" onChange={handleProfilePicChange} className="hidden" />
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    placeholder="First name"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    placeholder="Last name"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  />
                </div>
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
                  value={formData.email}
                  onChange={handleChange}
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
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+1 555 000 0000"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Role & Access */}
          <div className="glass-card-premium rounded-2xl p-6 space-y-5">
            <h2 className="text-lg font-semibold font-heading text-gray-900 dark:text-white flex items-center gap-2">
              <ShieldCheckIcon className="w-5 h-5 text-primary-500" />
              Role &amp; Access
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Portal Role
                </label>
                <select
                  name="erpRole"
                  value={formData.erpRole}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                >
                  {ERP_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              {formData.erpRole === 'hr' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    HR Sub-role
                  </label>
                  <select
                    name="hrSubRole"
                    value={formData.hrSubRole}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  >
                    {HR_SUB_ROLES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
              )}
              {formData.erpRole === 'finance' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Finance Sub-role
                  </label>
                  <select
                    name="financeSubRole"
                    value={formData.financeSubRole}
                    onChange={handleChange}
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

          {/* Job Details */}
          <div className="glass-card-premium rounded-2xl p-6 space-y-5">
            <h2 className="text-lg font-semibold font-heading text-gray-900 dark:text-white flex items-center gap-2">
              <BriefcaseIcon className="w-5 h-5 text-primary-500" />
              Job Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Job Title
                </label>
                <div className="relative">
                  <BriefcaseIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    name="jobTitle"
                    value={formData.jobTitle}
                    onChange={handleChange}
                    placeholder="e.g. Software Developer"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Department
                </label>
                <div className="relative">
                  <BuildingOfficeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  >
                    <option value="">— Select department —</option>
                    {departmentOptions.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Password */}
          <div className="glass-card-premium rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold font-heading text-gray-900 dark:text-white flex items-center gap-2">
              <KeyIcon className="w-5 h-5 text-primary-500" />
              Password
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Leave empty to auto-generate a temporary password. The user will be prompted to change it on first login.
            </p>
            <div className="relative">
              <KeyIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Leave blank for auto-generated password"
                autoComplete="new-password"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate(`/${tenantSlug}/org/users`)}
              className="glass-button px-5 py-2.5 rounded-xl font-medium text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-accent-500 text-white font-semibold text-sm hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Creating…
                </>
              ) : (
                <>
                  <UserIcon className="w-4 h-4" />
                  Create User
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default UserCreate;
