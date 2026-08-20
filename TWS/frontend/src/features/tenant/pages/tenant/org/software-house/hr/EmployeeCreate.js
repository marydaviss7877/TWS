import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  CodeBracketIcon,
  AcademicCapIcon,
  GlobeAltIcon,
  ComputerDesktopIcon,
  KeyIcon,
  PhotoIcon,
  ArrowUpTrayIcon
} from '@heroicons/react/24/outline';
import { tenantApiService } from '../../../../../../../shared/services/tenant/tenant-api.service';
import toast from 'react-hot-toast';
import { useTenantSlug } from '../../../../../../../shared/hooks/useTenantSlug';

// Software house–specific job roles
const SOFTWARE_HOUSE_ROLES = [
  'Software Developer',
  'Senior Developer',
  'Tech Lead',
  'Project Manager',
  'QA Engineer',
  'DevOps Engineer',
  'UI/UX Designer',
  'Business Analyst',
  'Scrum Master',
  'Product Manager',
  'Data Engineer',
  'Security Engineer'
];

// Software house departments/teams
const SOFTWARE_HOUSE_DEPARTMENTS = [
  'Engineering',
  'Frontend',
  'Backend',
  'Full-Stack',
  'DevOps',
  'QA',
  'Design',
  'Project Management',
  'Product'
];

// Seniority levels
const SENIORITY_LEVELS = [
  { value: 'junior', label: 'Junior' },
  { value: 'mid', label: 'Mid-Level' },
  { value: 'senior', label: 'Senior' },
  { value: 'lead', label: 'Lead' },
  { value: 'principal', label: 'Principal' }
];

// Work model options
// values must match workSchedule.type enum in Employee schema:
// ['standard', 'flexible', 'remote', 'hybrid', 'shift']
const WORK_MODELS = [
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'standard', label: 'On-site / Standard' },
  { value: 'flexible', label: 'Flexible' }
];

// Common tech skills for quick selection
const COMMON_SKILLS = [
  'JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'Java', 'C#',
  'Vue.js', 'Angular', 'SQL', 'MongoDB', 'AWS', 'Docker', 'Kubernetes',
  'Git', 'REST API', 'GraphQL', 'Agile', 'Scrum'
];

const EmployeeCreate = () => {
  const tenantSlug = useTenantSlug();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [successDetail, setSuccessDetail] = useState(null);
  const [sendPortalInvite, setSendPortalInvite] = useState(true);
  const [skillsInput, setSkillsInput] = useState('');
  const [profilePicFile, setProfilePicFile] = useState(null);
  const [profilePicPreview, setProfilePicPreview] = useState(null);
  const profilePicPreviewRef = useRef(null);

  useEffect(() => () => {
    if (profilePicPreviewRef.current) URL.revokeObjectURL(profilePicPreviewRef.current);
  }, []);
  // Departments loaded from API; falls back to the hardcoded list
  const [departmentOptions, setDepartmentOptions] = useState(SOFTWARE_HOUSE_DEPARTMENTS);

  useEffect(() => {
    tenantApiService.getDepartments(tenantSlug)
      .then((depts) => {
        if (Array.isArray(depts) && depts.length > 0) {
          const names = depts.map((d) => d.name).filter(Boolean);
          // Merge API departments with hardcoded ones so neither set is lost
          const merged = [...new Set([...names, ...SOFTWARE_HOUSE_DEPARTMENTS])];
          setDepartmentOptions(merged);
        }
      })
      .catch(() => {}); // silent fallback — hardcoded list stays
  }, [tenantSlug]);

  const [formData, setFormData] = useState({
    // Personal Information
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    dateOfBirth: '',
    gender: '',

    // Employment Details (Software House specific)
    employeeId: '',
    jobTitle: '',
    jobRole: '',
    department: '',
    erpRole: '',          // ERP portal role (defaults to 'employee' on backend)
    hrSubRole: '',        // Only relevant when erpRole === 'hr'
    financeSubRole: '',   // Only relevant when erpRole === 'finance'
    seniorityLevel: 'mid',
    hireDate: '',
    contractType: 'full-time',
    workLocation: '',
    workModel: 'hybrid',

    // Software House specific
    technicalSkills: [],
    billingRateHourly: '',
    githubUrl: '',
    linkedInUrl: '',

    // Salary Information (optional — backend defaults to 0)
    baseSalary: '',
    currency: 'USD',
    payFrequency: 'monthly',

    // Additional
    reportingManager: '',
    employmentStatus: 'active',
    probationPeriod: '',
    notes: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === 'jobRole') setFormData((prev) => ({ ...prev, jobTitle: value }));
    setError(null);
  };

  const addSkill = (skill) => {
    const trimmed = (skill || skillsInput).trim();
    if (trimmed && !formData.technicalSkills.includes(trimmed)) {
      setFormData((prev) => ({
        ...prev,
        technicalSkills: [...prev.technicalSkills, trimmed]
      }));
      setSkillsInput('');
    }
  };

  const removeSkill = (skill) => {
    setFormData((prev) => ({
      ...prev,
      technicalSkills: prev.technicalSkills.filter((s) => s !== skill)
    }));
  };

  const handleProfilePicChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }
    setProfilePicFile(file);
    if (profilePicPreviewRef.current) URL.revokeObjectURL(profilePicPreviewRef.current);
    const preview = URL.createObjectURL(file);
    profilePicPreviewRef.current = preview;
    setProfilePicPreview(preview);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    setSuccessDetail(null);

    try {
      if (!formData.firstName || !formData.lastName || !formData.email || !formData.jobTitle) {
        setError('Please fill in all required fields: First Name, Last Name, Email, and Job Title.');
        setLoading(false);
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setError('Please enter a valid email address.');
        setLoading(false);
        return;
      }

      const employeeData = {
        // Send both fullName (combined) and firstName/lastName for backend flexibility
        fullName: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        ...(sendPortalInvite ? { sendPortalInvite: true } : {}),
        ...(!sendPortalInvite && formData.password?.trim() ? { password: formData.password.trim() } : {}),
        ...(formData.employeeId?.trim() ? { employeeId: formData.employeeId.trim() } : {}),
        ...(formData.erpRole ? { erpRole: formData.erpRole } : {}),
        ...(formData.erpRole === 'hr' && formData.hrSubRole ? { hrSubRole: formData.hrSubRole } : {}),
        ...(formData.erpRole === 'finance' && formData.financeSubRole ? { financeSubRole: formData.financeSubRole } : {}),
        phone: formData.phone?.trim() || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
        gender: formData.gender || undefined,
        jobTitle: formData.jobTitle.trim(),
        ...(formData.department?.trim() ? { department: formData.department.trim() } : {}),
        hireDate: formData.hireDate || new Date().toISOString().split('T')[0],
        contractType: formData.contractType,
        workLocation: formData.workLocation?.trim() || undefined,
        salary: {
          base: formData.baseSalary ? parseFloat(formData.baseSalary) : 0,
          currency: formData.currency,
          payFrequency: formData.payFrequency
        },
        reportingManager: formData.reportingManager?.trim() || undefined,
        employmentStatus: formData.employmentStatus,
        probationPeriod: formData.probationPeriod ? parseInt(formData.probationPeriod) : undefined,
        notes: formData.notes?.trim() || undefined,
        careerDevelopment: {
          careerLevel: ['entry', 'junior', 'mid', 'senior', 'lead', 'principal', 'director', 'executive'].includes(formData.seniorityLevel)
            ? formData.seniorityLevel
            : 'mid'
        },
        workSchedule: {
          type: ['standard', 'flexible', 'remote', 'hybrid', 'shift'].includes(formData.workModel)
            ? formData.workModel
            : 'hybrid',
          hoursPerWeek: 40,
          workDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          timezone: 'UTC'
        },
        skills: formData.technicalSkills.map((name) => ({
          name,
          level: 'intermediate',
          category: 'technical'
        })),
        ...(formData.billingRateHourly ? {
          performanceMetrics: {
            costPerHour: parseFloat(formData.billingRateHourly)
          }
        } : {}),
        githubUrl: formData.githubUrl?.trim() || undefined,
        linkedInUrl: formData.linkedInUrl?.trim() || undefined
      };

      const response = await tenantApiService.createEmployee(tenantSlug, employeeData);

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

      if (response !== false) {
        if (response?.portalInviteSent) {
          setSuccessDetail({ kind: 'invite' });
          toast.success('Team member created. Portal invite email was sent.');
        } else if (response?.portalInviteSkipped === 'already_active') {
          setSuccessDetail({ kind: 'skipped' });
          toast.success('Team member created. This email already has active portal access.');
        } else if (response?.temporaryPassword) {
          setSuccessDetail({ kind: 'temp', password: response.temporaryPassword });
        } else {
          setSuccessDetail(null);
        }
        setSuccess(true);
        const stayForMessage = !!(response?.temporaryPassword || response?.portalInviteSent || response?.portalInviteSkipped);
        if (!stayForMessage) {
          setTimeout(() => {
            navigate(`/${tenantSlug}/org/software-house/hr/employees`);
          }, 2000);
        }
      } else {
        setError('Failed to create employee. Please try again.');
      }
    } catch (err) {
      console.error('Error creating employee:', err);
      // Extract the most useful error message from the API response
      const apiMessage = err?.response?.data?.message || err?.message;
      setError(apiMessage || 'Failed to create employee. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl xl:text-3xl font-bold font-heading text-gray-900 dark:text-white">
            Add Team Member
          </h1>
          <p className="text-sm xl:text-base text-gray-600 dark:text-gray-300 mt-1">
            Add a new developer or team member to your software house
          </p>
        </div>
        <button
          onClick={() => navigate(`/${tenantSlug}/org/software-house/hr/employees`)}
          className="glass-button px-4 py-2 rounded-xl hover-scale flex items-center gap-2"
        >
          <XMarkIcon className="w-5 h-5" />
          <span className="font-medium">Cancel</span>
        </button>
      </div>

      {success && (
        <div className="glass-card-premium p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <div className="flex items-start gap-3">
            <CheckCircleIcon className="w-6 h-6 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-green-900 dark:text-green-100">Team member added successfully!</p>
              {successDetail?.kind === 'temp' ? (
                <>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    A temporary password was auto-generated. Share it with the new hire once — use Organization → Users → Change password for updates later.
                  </p>
                  <div className="mt-3 flex items-center gap-3 bg-white dark:bg-gray-800 border border-green-300 dark:border-green-700 rounded-xl px-4 py-3">
                    <KeyIcon className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
                    <span className="font-mono font-bold text-lg tracking-widest text-gray-900 dark:text-white">{successDetail.password}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(`/${tenantSlug}/org/software-house/hr/employees`)}
                    className="mt-3 glass-button px-4 py-2 rounded-xl text-sm font-medium"
                  >
                    Go to Employee List
                  </button>
                </>
              ) : successDetail?.kind === 'invite' ? (
                <>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    An invite email was sent so they can set their own password before first login.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate(`/${tenantSlug}/org/software-house/hr/employees`)}
                    className="mt-3 glass-button px-4 py-2 rounded-xl text-sm font-medium"
                  >
                    Go to Employee List
                  </button>
                </>
              ) : successDetail?.kind === 'skipped' ? (
                <>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    No new invite was sent — this email already has active portal access.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate(`/${tenantSlug}/org/software-house/hr/employees`)}
                    className="mt-3 glass-button px-4 py-2 rounded-xl text-sm font-medium"
                  >
                    Go to Employee List
                  </button>
                </>
              ) : (
                <p className="text-sm text-green-700 dark:text-green-300">Redirecting to employee list...</p>
              )}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="glass-card-premium p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 animate-fade-in">
          <div className="flex items-start gap-3">
            <XMarkIcon className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-red-900 dark:text-red-100 mb-1">Error</p>
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-600 dark:text-red-400 hover:text-red-800">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

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
                  autoComplete="email"
                  className="glass-input w-full pl-10 pr-4 py-3 rounded-xl"
                  placeholder="developer@company.com"
                />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendPortalInvite}
                  onChange={(e) => setSendPortalInvite(e.target.checked)}
                  className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span>
                  <span className="block text-sm font-medium text-gray-800 dark:text-gray-200">Send portal invite email</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Recommended: they set their password via the link. Uncheck to assign a password or one-time generated password instead.
                  </span>
                </span>
              </label>
            </div>
            {!sendPortalInvite && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Optional: set password now
                </label>
                <div className="relative">
                  <KeyIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="glass-input w-full pl-10 pr-4 py-3 rounded-xl"
                    placeholder="Leave empty for one-time generated password"
                    autoComplete="new-password"
                  />
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone</label>
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date of Birth</label>
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Gender</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="glass-input w-full px-4 py-3 rounded-xl"
              >
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer-not-to-say">Prefer not to say</option>
              </select>
            </div>
          </div>
        </div>

        {/* Software House – Role & Team */}
        <div className="glass-card-premium p-6 xl:p-8 hover-glow">
          <h3 className="text-lg xl:text-xl font-bold font-heading text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <ComputerDesktopIcon className="w-6 h-6" />
            Role & Team
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 xl:gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Job Role <span className="text-red-500">*</span>
              </label>
              <select
                name="jobRole"
                value={formData.jobRole}
                onChange={handleChange}
                required
                className="glass-input w-full px-4 py-3 rounded-xl"
              >
                <option value="">Select role</option>
                {SOFTWARE_HOUSE_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Department / Team
              </label>
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="glass-input w-full px-4 py-3 rounded-xl"
              >
                <option value="">Select department (optional)</option>
                {departmentOptions.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Seniority Level
              </label>
              <select
                name="seniorityLevel"
                value={formData.seniorityLevel}
                onChange={handleChange}
                className="glass-input w-full px-4 py-3 rounded-xl"
              >
                {SENIORITY_LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Work Model
              </label>
              <select
                name="workModel"
                value={formData.workModel}
                onChange={handleChange}
                className="glass-input w-full px-4 py-3 rounded-xl"
              >
                {WORK_MODELS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Employee ID</label>
              <input
                type="text"
                name="employeeId"
                value={formData.employeeId}
                onChange={handleChange}
                className="glass-input w-full px-4 py-3 rounded-xl"
                placeholder="Auto-generated if empty"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Portal Access Role
              </label>
              <select
                name="erpRole"
                value={formData.erpRole}
                onChange={handleChange}
                className="glass-input w-full px-4 py-3 rounded-xl"
              >
                <option value="">Employee (default)</option>
                <option value="manager">Manager</option>
                <option value="project_manager">Project Manager</option>
                <option value="hr">HR</option>
                <option value="finance">Finance</option>
                <option value="admin">Admin</option>
                <option value="contractor">Contractor</option>
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Determines what the team member can access in the portal. Can be changed later.
              </p>
            </div>
            {formData.erpRole === 'hr' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  HR Sub-Role
                </label>
                <select
                  name="hrSubRole"
                  value={formData.hrSubRole}
                  onChange={handleChange}
                  className="glass-input w-full px-4 py-3 rounded-xl"
                >
                  <option value="">HR Manager (default)</option>
                  <option value="manager">HR Manager — full HR access + payroll</option>
                  <option value="executive">HR Executive — leave & attendance only</option>
                  <option value="payroll_officer">Payroll Officer — payroll read/write</option>
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Fine-tunes payroll and leave access within the HR role.
                </p>
              </div>
            )}
            {formData.erpRole === 'finance' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Finance Sub-Role
                </label>
                <select
                  name="financeSubRole"
                  value={formData.financeSubRole}
                  onChange={handleChange}
                  className="glass-input w-full px-4 py-3 rounded-xl"
                >
                  <option value="">Finance Manager (default)</option>
                  <option value="manager">Finance Manager — full finance + payroll</option>
                  <option value="accountant">Accountant</option>
                  <option value="analyst">Analyst — read-only</option>
                  <option value="ap_officer">AP Officer</option>
                  <option value="ar_officer">AR Officer</option>
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Refines module access for Finance portal users (aligned with UPR).
                </p>
              </div>
            )}
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Contract Type</label>
              <select
                name="contractType"
                value={formData.contractType}
                onChange={handleChange}
                className="glass-input w-full px-4 py-3 rounded-xl"
              >
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="intern">Intern</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Work Location</label>
              <div className="relative">
                <MapPinIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  name="workLocation"
                  value={formData.workLocation}
                  onChange={handleChange}
                  className="glass-input w-full pl-10 pr-4 py-3 rounded-xl"
                  placeholder="e.g., New York, Remote"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Technical Skills */}
        <div className="glass-card-premium p-6 xl:p-8 hover-glow">
          <h3 className="text-lg xl:text-xl font-bold font-heading text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <CodeBracketIcon className="w-6 h-6" />
            Technical Skills
          </h3>
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <input
                type="text"
                value={skillsInput}
                onChange={(e) => setSkillsInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                className="glass-input flex-1 min-w-[200px] px-4 py-3 rounded-xl"
                placeholder="Add skill (e.g., React, Node.js)"
              />
              <button
                type="button"
                onClick={() => addSkill()}
                className="glass-button px-4 py-3 rounded-xl"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {COMMON_SKILLS.map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => addSkill(skill)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    formData.technicalSkills.includes(skill)
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {skill}
                </button>
              ))}
            </div>
            {formData.technicalSkills.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.technicalSkills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-200 text-sm"
                  >
                    {skill}
                    <button type="button" onClick={() => removeSkill(skill)} className="hover:text-red-600">
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Compensation & Billing */}
        <div className="glass-card-premium p-6 xl:p-8 hover-glow">
          <h3 className="text-lg xl:text-xl font-bold font-heading text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <CurrencyDollarIcon className="w-6 h-6" />
            Compensation & Billing
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 xl:gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Base Salary
              </label>
              <div className="relative">
                <CurrencyDollarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  name="baseSalary"
                  value={formData.baseSalary}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className="glass-input w-full pl-10 pr-4 py-3 rounded-xl"
                  placeholder="0.00 (can set later)"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Billing Rate (hourly)
              </label>
              <div className="relative">
                <CurrencyDollarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  name="billingRateHourly"
                  value={formData.billingRateHourly}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className="glass-input w-full pl-10 pr-4 py-3 rounded-xl"
                  placeholder="For client projects"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Currency</label>
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Pay Frequency</label>
              <select
                name="payFrequency"
                value={formData.payFrequency}
                onChange={handleChange}
                className="glass-input w-full px-4 py-3 rounded-xl"
              >
                <option value="weekly">Weekly</option>
                <option value="bi-weekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
                <option value="annually">Annually</option>
              </select>
            </div>
          </div>
        </div>

        {/* Developer Profiles */}
        <div className="glass-card-premium p-6 xl:p-8 hover-glow">
          <h3 className="text-lg xl:text-xl font-bold font-heading text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <GlobeAltIcon className="w-6 h-6" />
            Developer Profiles
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 xl:gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">GitHub URL</label>
              <input
                type="url"
                name="githubUrl"
                value={formData.githubUrl}
                onChange={handleChange}
                className="glass-input w-full px-4 py-3 rounded-xl"
                placeholder="https://github.com/username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">LinkedIn URL</label>
              <input
                type="url"
                name="linkedInUrl"
                value={formData.linkedInUrl}
                onChange={handleChange}
                className="glass-input w-full px-4 py-3 rounded-xl"
                placeholder="https://linkedin.com/in/username"
              />
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div className="glass-card-premium p-6 xl:p-8 hover-glow">
          <h3 className="text-lg xl:text-xl font-bold font-heading text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <DocumentTextIcon className="w-6 h-6" />
            Additional Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 xl:gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Reporting Manager</label>
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Probation (days)</label>
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
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={4}
                className="glass-input w-full px-4 py-3 rounded-xl resize-none"
                placeholder="Any additional notes about this team member..."
              />
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate(`/${tenantSlug}/org/software-house/hr/employees`)}
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
                <div className="tws-loading-pulse rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Adding Team Member...</span>
              </>
            ) : (
              <>
                <CheckCircleIcon className="w-5 h-5" />
                <span>Add Team Member</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EmployeeCreate;
