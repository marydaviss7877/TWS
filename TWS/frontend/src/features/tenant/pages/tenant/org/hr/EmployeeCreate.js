import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarIcon,
  BriefcaseIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  MapPinIcon,
  ClockIcon,
  CheckCircleIcon,
  XMarkIcon,
  LockClosedIcon,
  PhotoIcon,
  ArrowUpTrayIcon
} from '@heroicons/react/24/outline';
import { tenantApiService } from '../../../../../../shared/services/tenant/tenant-api.service';
import toast from 'react-hot-toast';

const EmployeeCreate = () => {
  const { tenantSlug } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [portalPasswordHint, setPortalPasswordHint] = useState(null);
  const [sendPortalInvite, setSendPortalInvite] = useState(true);
  const [profilePicFile, setProfilePicFile] = useState(null);
  const [profilePicPreview, setProfilePicPreview] = useState(null);
  const [formData, setFormData] = useState({
    // Personal Information
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    
    // Employment Details
    employeeId: '',
    jobTitle: '',
    department: '',
    hireDate: '',
    contractType: 'full-time',
    workLocation: '',
    
    // Salary Information
    baseSalary: '',
    currency: 'USD',
    payFrequency: 'monthly',
    
    // Additional Information
    reportingManager: '',
    employmentStatus: 'active',
    probationPeriod: '',
    notes: '',
    portalPassword: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(null);
  };

  const handleProfilePicChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }
    setProfilePicFile(file);
    setProfilePicPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Validate required fields
      if (!formData.firstName || !formData.lastName || !formData.email || !formData.jobTitle || !formData.department) {
        const missingFields = [];
        if (!formData.firstName) missingFields.push('First Name');
        if (!formData.lastName) missingFields.push('Last Name');
        if (!formData.email) missingFields.push('Email');
        if (!formData.jobTitle) missingFields.push('Job Title');
        if (!formData.department) missingFields.push('Department');
        
        setError(`Please fill in all required fields: ${missingFields.join(', ')}`);
        setLoading(false);
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setError('Please enter a valid email address.');
        setLoading(false);
        return;
      }

      // Validate salary
      if (!formData.baseSalary || parseFloat(formData.baseSalary) < 0) {
        setError('Please enter a valid base salary.');
        setLoading(false);
        return;
      }

      if (!sendPortalInvite && formData.portalPassword && formData.portalPassword.length < 6) {
        setError('Portal password must be at least 6 characters, or leave it blank for a one-time generated password.');
        setLoading(false);
        return;
      }

      // Generate employee ID if not provided
      const employeeId = formData.employeeId || `EMP${Date.now()}`;
      
      // Prepare employee data according to backend schema
      const employeeData = {
        employeeId,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone?.trim() || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
        gender: formData.gender || undefined,
        jobTitle: formData.jobTitle.trim(),
        department: formData.department.trim(),
        hireDate: formData.hireDate || new Date().toISOString().split('T')[0],
        contractType: formData.contractType,
        workLocation: formData.workLocation?.trim() || undefined,
        salary: {
          base: parseFloat(formData.baseSalary),
          currency: formData.currency,
          payFrequency: formData.payFrequency
        },
        reportingManager: formData.reportingManager?.trim() || undefined,
        employmentStatus: formData.employmentStatus,
        probationPeriod: formData.probationPeriod ? parseInt(formData.probationPeriod) : undefined,
        notes: formData.notes?.trim() || undefined,
        ...(sendPortalInvite ? { sendPortalInvite: true } : {}),
        ...(!sendPortalInvite && formData.portalPassword && formData.portalPassword.length >= 6
          ? { password: formData.portalPassword }
          : {})
      };

      if (!tenantApiService || !tenantApiService.createEmployee) {
        throw new Error('API service not available. Please refresh the page.');
      }

      const response = await tenantApiService.createEmployee(tenantSlug, employeeData);
      if (!response?.employee) {
        throw new Error('Server did not return employee data. Check that you are logged in and try again.');
      }

      const createdUserId = response?.employee?.userId?._id || response?.employee?.userId;
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
          throw new Error(picErr.message || 'Employee created but profile picture upload failed.');
        }
      }

      if (response?.portalInviteSent) {
        setPortalPasswordHint({ kind: 'invite' });
        toast.success('Employee created. Portal invite email was sent.');
      } else if (response?.portalInviteSkipped === 'already_active') {
        setPortalPasswordHint({ kind: 'already_active' });
        toast.success('Employee created. This email already has active portal access.');
      } else if (response?.temporaryPassword) {
        setPortalPasswordHint({ kind: 'generated', value: response.temporaryPassword });
        toast.success('Employee created. Copy the one-time password from this screen.');
      } else if (!sendPortalInvite && formData.portalPassword && formData.portalPassword.length >= 6) {
        setPortalPasswordHint({ kind: 'custom' });
        toast.success('Employee created. They can sign in with the password you set.');
      } else {
        setPortalPasswordHint(null);
        toast.success('Employee created.');
      }

      setSuccess(true);
      
      // Redirect to employee list after 2 seconds
      setTimeout(() => {
        navigate(`/${tenantSlug}/org/hr/employees`);
      }, 2000);
      
    } catch (err) {
      console.error('❌ Error creating employee:', err);
      console.error('Error type:', typeof err);
      console.error('Error name:', err?.name);
      console.error('Error message:', err?.message);
      console.error('Error stack:', err?.stack);
      console.error('Full error object:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
      
      // Enhanced error message
      let errorMessage = 'Failed to create employee. ';
      
      if (err.message) {
        errorMessage += err.message;
      } else if (err.response?.data?.message) {
        errorMessage += err.response.data.message;
      } else if (typeof err === 'string') {
        errorMessage += err;
      } else {
        errorMessage += 'Please check your connection and try again. If the problem persists, the backend API may not be available yet.';
      }
      
      // Add helpful debugging info
      if (err.message?.includes('404') || err.message?.includes('Not Found')) {
        errorMessage += ' (Backend endpoint not found - API may not be implemented yet)';
      } else if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
        errorMessage += ' (Authentication failed - please log in again)';
      } else if (err.message?.includes('Network') || err.message?.includes('fetch')) {
        errorMessage += ' (Network error - check your connection)';
      }
      
      setError(errorMessage);
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
            Add New Employee
          </h1>
          <p className="text-sm xl:text-base text-gray-600 dark:text-gray-300 mt-1">
            Create a new employee record in your organization
          </p>
        </div>
        <button
          onClick={() => navigate(`/${tenantSlug}/org/hr/employees`)}
          className="glass-button px-4 py-2 rounded-xl hover-scale flex items-center gap-2"
        >
          <XMarkIcon className="w-5 h-5" />
          <span className="font-medium">Cancel</span>
        </button>
      </div>

      {/* Success Message */}
      {success && (
        <div className="glass-card-premium p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-3">
            <CheckCircleIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
            <div>
              <p className="font-bold text-green-900 dark:text-green-100">Employee created successfully!</p>
              <p className="text-sm text-green-700 dark:text-green-300">Redirecting to employee list...</p>
              {portalPasswordHint?.kind === 'invite' && (
                <p className="text-sm mt-2 text-green-800 dark:text-green-200">
                  They will receive an email with a link to set their own password before first login.
                </p>
              )}
              {portalPasswordHint?.kind === 'already_active' && (
                <p className="text-sm mt-2 text-green-800 dark:text-green-200">
                  No new invite was sent — portal access was already active for this email.
                </p>
              )}
              {portalPasswordHint?.kind === 'generated' && (
                <p className="text-sm font-mono mt-2 text-green-900 dark:text-green-100">
                  One-time login password: <strong>{portalPasswordHint.value}</strong>
                </p>
              )}
              {portalPasswordHint?.kind === 'custom' && (
                <p className="text-sm mt-2 text-green-800 dark:text-green-200">
                  They can log in at the employee portal with the password you entered.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="glass-card-premium p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 animate-fade-in">
          <div className="flex items-start gap-3">
            <XMarkIcon className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-red-900 dark:text-red-100 mb-1">Error Creating Employee</p>
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                Please check the console for more details or contact support if the issue persists.
              </p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Employee Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <div className="glass-card-premium p-6 xl:p-8 hover-glow">
          <h3 className="text-lg xl:text-xl font-bold font-heading text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <UserIcon className="w-6 h-6" />
            Personal Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 xl:gap-6">
            <div className="md:col-span-2">
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                className="glass-input w-full px-4 py-3 rounded-xl"
                placeholder="Enter first name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
                className="glass-input w-full px-4 py-3 rounded-xl"
                placeholder="Enter last name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <EnvelopeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="glass-input w-full pl-10 pr-4 py-3 rounded-xl"
                  placeholder="employee@company.com"
                />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendPortalInvite}
                  onChange={(e) => {
                    setSendPortalInvite(e.target.checked);
                    setError(null);
                  }}
                  className="mt-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>
                  <span className="block text-sm font-medium text-gray-800 dark:text-gray-200">
                    Send portal invite email
                  </span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Recommended: the new hire sets their own password via the link. Uses the same invite flow as Organization → Users.
                  </span>
                </span>
              </label>
            </div>
            {!sendPortalInvite && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Optional: set portal password now
                </label>
                <div className="relative">
                  <LockClosedIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    name="portalPassword"
                    value={formData.portalPassword}
                    onChange={handleChange}
                    minLength={6}
                    autoComplete="new-password"
                    className="glass-input w-full pl-10 pr-4 py-3 rounded-xl"
                    placeholder="Min 6 characters, or leave empty for a one-time generated password"
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  If you leave this empty, a temporary password is shown once after save. Otherwise use Organization → Users → Change password later.
                </p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone Number
              </label>
              <div className="relative">
                <PhoneIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="glass-input w-full pl-10 pr-4 py-3 rounded-xl"
                  placeholder="+1 (555) 000-0000"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date of Birth
              </label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  className="glass-input w-full pl-10 pr-4 py-3 rounded-xl"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Gender
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="glass-input w-full px-4 py-3 rounded-xl"
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer-not-to-say">Prefer not to say</option>
              </select>
            </div>
          </div>
        </div>

        {/* Employment Details */}
        <div className="glass-card-premium p-6 xl:p-8 hover-glow">
          <h3 className="text-lg xl:text-xl font-bold font-heading text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <BriefcaseIcon className="w-6 h-6" />
            Employment Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 xl:gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Employee ID
              </label>
              <input
                type="text"
                name="employeeId"
                value={formData.employeeId}
                onChange={handleChange}
                className="glass-input w-full px-4 py-3 rounded-xl"
                placeholder="Auto-generated if left empty"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Job Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="jobTitle"
                value={formData.jobTitle}
                onChange={handleChange}
                required
                className="glass-input w-full px-4 py-3 rounded-xl"
                placeholder="e.g., Senior Developer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Department <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="department"
                value={formData.department}
                onChange={handleChange}
                required
                className="glass-input w-full px-4 py-3 rounded-xl"
                placeholder="e.g., Engineering"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Hire Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="date"
                  name="hireDate"
                  value={formData.hireDate}
                  onChange={handleChange}
                  required
                  className="glass-input w-full pl-10 pr-4 py-3 rounded-xl"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Contract Type <span className="text-red-500">*</span>
              </label>
              <select
                name="contractType"
                value={formData.contractType}
                onChange={handleChange}
                required
                className="glass-input w-full px-4 py-3 rounded-xl"
              >
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="intern">Intern</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Work Location
              </label>
              <div className="relative">
                <MapPinIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  name="workLocation"
                  value={formData.workLocation}
                  onChange={handleChange}
                  className="glass-input w-full pl-10 pr-4 py-3 rounded-xl"
                  placeholder="e.g., New York Office"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reporting Manager
              </label>
              <input
                type="text"
                name="reportingManager"
                value={formData.reportingManager}
                onChange={handleChange}
                className="glass-input w-full px-4 py-3 rounded-xl"
                placeholder="Manager name or ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Employment Status
              </label>
              <select
                name="employmentStatus"
                value={formData.employmentStatus}
                onChange={handleChange}
                className="glass-input w-full px-4 py-3 rounded-xl"
              >
                <option value="active">Active</option>
                <option value="on-leave">On Leave</option>
                <option value="probation">Probation</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Probation Period (days)
              </label>
              <input
                type="number"
                name="probationPeriod"
                value={formData.probationPeriod}
                onChange={handleChange}
                className="glass-input w-full px-4 py-3 rounded-xl"
                placeholder="e.g., 90"
                min="0"
              />
            </div>
          </div>
        </div>

        {/* Salary Information */}
        <div className="glass-card-premium p-6 xl:p-8 hover-glow">
          <h3 className="text-lg xl:text-xl font-bold font-heading text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <CurrencyDollarIcon className="w-6 h-6" />
            Salary Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 xl:gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Base Salary <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <CurrencyDollarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  name="baseSalary"
                  value={formData.baseSalary}
                  onChange={handleChange}
                  required
                  min="0"
                  step="0.01"
                  className="glass-input w-full pl-10 pr-4 py-3 rounded-xl"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Currency
              </label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                className="glass-input w-full px-4 py-3 rounded-xl"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="PKR">PKR (₨)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Pay Frequency
              </label>
              <select
                name="payFrequency"
                value={formData.payFrequency}
                onChange={handleChange}
                className="glass-input w-full px-4 py-3 rounded-xl"
              >
                <option value="weekly">Weekly</option>
                <option value="bi-weekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annually">Annually</option>
              </select>
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div className="glass-card-premium p-6 xl:p-8 hover-glow">
          <h3 className="text-lg xl:text-xl font-bold font-heading text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <DocumentTextIcon className="w-6 h-6" />
            Additional Information
          </h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={4}
              className="glass-input w-full px-4 py-3 rounded-xl resize-none"
              placeholder="Any additional notes or comments about this employee..."
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate(`/${tenantSlug}/org/hr/employees`)}
            className="glass-button px-6 py-3 rounded-xl hover-scale font-medium"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="glass-button px-6 py-3 rounded-xl hover-scale font-medium bg-gradient-to-r from-primary-500 to-accent-500 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Creating Employee...</span>
              </>
            ) : (
              <>
                <CheckCircleIcon className="w-5 h-5" />
                <span>Create Employee</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EmployeeCreate;
