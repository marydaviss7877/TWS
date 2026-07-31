import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserGroupIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  UserIcon,
  EyeIcon,
  EnvelopeIcon,
  XMarkIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { tenantApiService } from '../../../../../../../shared/services/tenant/tenant-api.service';
import { useTenantAuth } from '../../../../../../../app/providers/TenantAuthContext';
import LoadingSpinner from '../../../../../../../shared/components/feedback/LoadingSpinner';
import ErrorState from '../../../../../../../shared/components/feedback/ErrorState';
import EmptyState from '../../../../../../../shared/components/feedback/EmptyState';
import { useTenantSlug } from '../../../../../../../shared/hooks/useTenantSlug';
import ProfileAvatar from '../../../../../../../shared/components/ui/ProfileAvatar';

// Lightweight inline invite modal — no extra file needed
const InviteModal = ({ tenantSlug, onClose }) => {
  const [form, setForm] = useState({ email: '', fullName: '', erpRole: '', hrSubRole: '', financeSubRole: '' });
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(null);
  const [err, setErr] = useState(null);

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSend = async (e) => {
    e.preventDefault();
    if (!form.email) { setErr('Email is required'); return; }
    setSending(true); setErr(null);
    try {
      const res = await tenantApiService.inviteEmployee(tenantSlug, form);
      setDone(res);
    } catch (ex) {
      setErr(ex.message || 'Failed to send invite');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="glass-card-premium w-full max-w-md p-6 rounded-2xl shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
          <XMarkIcon className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold font-heading text-gray-900 dark:text-white mb-1 flex items-center gap-2">
          <EnvelopeIcon className="w-6 h-6 text-primary-500" />
          Invite Team Member
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          Send an invite link — no pre-setup required. They'll set their own password.
        </p>

        {done ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <CheckCircleIcon className="w-12 h-12 text-green-500" />
            <p className="font-bold text-green-700 dark:text-green-300">Invitation sent to {done.email}</p>
            <button onClick={onClose} className="glass-button px-6 py-2 rounded-xl font-medium">Close</button>
          </div>
        ) : (
          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email <span className="text-red-500">*</span></label>
              <input type="email" name="email" value={form.email} onChange={handleChange} required
                className="glass-input w-full px-4 py-2.5 rounded-xl" placeholder="colleague@company.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name (optional)</label>
              <input type="text" name="fullName" value={form.fullName} onChange={handleChange}
                className="glass-input w-full px-4 py-2.5 rounded-xl" placeholder="Jane Smith" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Portal Role</label>
              <select name="erpRole" value={form.erpRole} onChange={handleChange} className="glass-input w-full px-4 py-2.5 rounded-xl">
                <option value="">Employee (default)</option>
                <option value="manager">Manager</option>
                <option value="project_manager">Project Manager</option>
                <option value="hr">HR</option>
                <option value="finance">Finance</option>
                <option value="admin">Admin</option>
                <option value="contractor">Contractor</option>
              </select>
            </div>
            {form.erpRole === 'hr' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">HR Sub-Role</label>
                <select name="hrSubRole" value={form.hrSubRole} onChange={handleChange} className="glass-input w-full px-4 py-2.5 rounded-xl">
                  <option value="">HR Manager (default)</option>
                  <option value="manager">HR Manager</option>
                  <option value="executive">HR Executive</option>
                  <option value="payroll_officer">Payroll Officer</option>
                </select>
              </div>
            )}
            {form.erpRole === 'finance' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Finance Sub-Role</label>
                <select name="financeSubRole" value={form.financeSubRole} onChange={handleChange} className="glass-input w-full px-4 py-2.5 rounded-xl">
                  <option value="">Finance Manager (default)</option>
                  <option value="manager">Finance Manager</option>
                  <option value="accountant">Accountant</option>
                  <option value="analyst">Analyst</option>
                  <option value="ap_officer">AP Officer</option>
                  <option value="ar_officer">AR Officer</option>
                </select>
              </div>
            )}
            {err && <p className="text-sm text-red-600 dark:text-red-400">{err}</p>}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="flex-1 glass-button px-4 py-2.5 rounded-xl font-medium">Cancel</button>
              <button type="submit" disabled={sending}
                className="flex-1 glass-button px-4 py-2.5 rounded-xl font-medium bg-gradient-to-r from-primary-500 to-accent-500 text-white disabled:opacity-50">
                {sending ? 'Sending…' : 'Send Invite'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

const EmployeeList = () => {
  const tenantSlug = useTenantSlug();
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useTenantAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    onLeave: 0,
    departments: 0
  });

  useEffect(() => {
    // Only fetch if authenticated and auth is not loading
    if (!authLoading && isAuthenticated) {
      fetchEmployees();
    } else if (!authLoading && !isAuthenticated) {
      setLoading(false);
    }
  }, [tenantSlug, isAuthenticated, authLoading]);

  const fetchEmployees = async () => {
    if (!isAuthenticated || !tenantSlug) return;
    
    try {
      setLoading(true);
      setLoadError('');
      const data = await tenantApiService.getEmployees(tenantSlug);
      if (data) {
        setEmployees(data.employees || []);
        setStats({
          total: data.total || 0,
          active: data.active || 0,
          onLeave: data.onLeave || 0,
          departments: data.departments || 0
        });
      } else {
        setEmployees([]);
        setStats({ total: 0, active: 0, onLeave: 0, departments: 0 });
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
      setLoadError(err?.message || 'Failed to load employees');
      setEmployees([]);
      setStats({ total: 0, active: 0, onLeave: 0, departments: 0 });
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter(emp => 
    emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteEmployee = async (employeeId) => {
    if (!window.confirm('Are you sure you want to delete this employee? This action cannot be undone.')) {
      return;
    }
    try {
      await tenantApiService.deleteEmployee(tenantSlug, employeeId);
      alert('Employee deleted successfully!');
      fetchEmployees();
    } catch (error) {
      console.error('Error deleting employee:', error);
      alert(error.message || 'Failed to delete employee. Please try again.');
    }
  };

  const handleUpdateEmployee = async (employeeId, employeeData) => {
    try {
      await tenantApiService.updateEmployee(tenantSlug, employeeId, employeeData);
      alert('Employee updated successfully!');
      fetchEmployees();
    } catch (error) {
      console.error('Error updating employee:', error);
      alert(error.message || 'Failed to update employee. Please try again.');
    }
  };

  const statsData = [
    { label: 'Total Employees', value: stats.total.toString(), icon: UserGroupIcon, iconBg: 'bg-blue-50 dark:bg-blue-900/20', iconColor: 'text-blue-600 dark:text-blue-400' },
    { label: 'Active', value: stats.active.toString(), icon: UserIcon, iconBg: 'bg-green-50 dark:bg-green-900/20', iconColor: 'text-green-600 dark:text-green-400' },
    { label: 'On Leave', value: stats.onLeave.toString(), icon: UserIcon, iconBg: 'bg-amber-50 dark:bg-amber-900/20', iconColor: 'text-amber-600 dark:text-amber-400' },
    { label: 'Departments', value: stats.departments.toString(), icon: UserGroupIcon, iconBg: 'bg-purple-50 dark:bg-purple-900/20', iconColor: 'text-purple-600 dark:text-purple-400' }
  ];

  if (loading) {
    return <LoadingSpinner message="Loading employees..." className="min-h-[40vh] bg-transparent" />;
  }

  if (loadError) {
    return <ErrorState title="Employees unavailable" message={loadError} onRetry={fetchEmployees} className="max-w-xl mx-auto" />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {showInviteModal && (
        <InviteModal tenantSlug={tenantSlug} onClose={() => setShowInviteModal(false)} />
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl xl:text-3xl font-bold font-heading text-gray-900 dark:text-white">
            Employee Management
          </h1>
          <p className="text-sm xl:text-base text-gray-600 dark:text-gray-300 mt-1">
            Manage your workforce and employee information
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="glass-button px-4 py-2 rounded-xl hover-scale flex items-center gap-2">
            <FunnelIcon className="w-5 h-5" />
            <span className="font-medium">Filter</span>
          </button>
          <button
            onClick={() => setShowInviteModal(true)}
            className="glass-button px-4 py-2 rounded-xl hover-scale flex items-center gap-2"
          >
            <EnvelopeIcon className="w-5 h-5" />
            <span className="font-medium">Invite by Email</span>
          </button>
          <button
           
            onClick={() => navigate(`/${tenantSlug}/org/software-house/hr/employees/create`)}
            className="glass-button px-4 py-2 rounded-xl hover-scale flex items-center gap-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white"
          >
            <PlusIcon className="w-5 h-5" />
            <span className="font-medium">Add Employee</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 xl:gap-6">
        {statsData.map((stat, index) => (
          <div key={index} className="glass-card-premium p-5 xl:p-6 hover-lift">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 xl:w-14 xl:h-14 rounded-2xl ${stat.iconBg} flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 xl:w-7 xl:h-7 ${stat.iconColor}`} />
              </div>
              <div>
                <p className="text-xs xl:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {stat.label}
                </p>
                <p className="text-2xl xl:text-3xl font-bold font-heading text-gray-900 dark:text-white">
                  {stat.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="glass-card-premium p-6 hover-glow">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search employees by name, role, department, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="glass-input w-full pl-10 pr-4 py-3 text-sm font-medium rounded-xl"
          />
        </div>
      </div>

      {/* Employee List */}
      <div className="glass-card-premium p-6 xl:p-8 hover-glow">
        <h3 className="text-lg xl:text-xl font-bold font-heading text-gray-900 dark:text-white mb-6">
          All Employees ({filteredEmployees.length})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-300">Name</th>
                <th className="text-left py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-300">Role</th>
                <th className="text-left py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-300">Department</th>
                <th className="text-left py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-300">Email</th>
                <th className="text-left py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-300">Status</th>
                <th className="text-left py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center">
                    <EmptyState title="No employees found" message="No employees match the current filter criteria." className="max-w-lg mx-auto" />
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((employee) => (
                  <tr key={employee._id || employee.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <ProfileAvatar person={employee} tenantSlug={tenantSlug} className="w-10 h-10 rounded-xl" />
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                          {employee.name || employee.fullName || 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                      {employee.role || employee.position || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                      {employee.department || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                      {employee.email || 'N/A'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                        (employee.status === 'Active' || employee.status === 'active') 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      }`}>
                        {employee.status || 'Active'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => navigate(`/${tenantSlug}/org/software-house/hr/employees/${employee._id || employee.id}`)}
                        className="text-primary-600 dark:text-primary-400 hover:underline text-sm font-medium flex items-center gap-1"
                      >
                        <EyeIcon className="w-4 h-4" />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EmployeeList;
