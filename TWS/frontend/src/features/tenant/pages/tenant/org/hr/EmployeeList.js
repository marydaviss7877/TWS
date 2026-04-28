export { default } from '../software-house/hr/EmployeeList';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  UserGroupIcon, 
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  UserIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { tenantApiService } from '../../../../../../shared/services/tenant/tenant-api.service';
import LoadingSpinner from '../../../../../../shared/components/feedback/LoadingSpinner';
import ErrorState from '../../../../../../shared/components/feedback/ErrorState';
import EmptyState from '../../../../../../shared/components/feedback/EmptyState';

const EmployeeList = () => {
  const { tenantSlug } = useParams();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
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
    fetchEmployees();
  }, [tenantSlug]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setLoadError('');
      const data = await tenantApiService.getEmployees(tenantSlug);
      setEmployees(data.employees || []);
      setStats({
        total: data.total || 0,
        active: data.active || 0,
        onLeave: data.onLeave || 0,
        departments: data.departments || 0
      });
    } catch (err) {
      console.error('Error fetching employees:', err);
      setLoadError(err?.message || 'Failed to load employees');
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

  const statsData = [
    { label: 'Total Employees', value: stats.total.toString(), icon: UserGroupIcon, iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-600' },
    { label: 'Active', value: stats.active.toString(), icon: UserIcon, iconBg: 'bg-gradient-to-br from-green-500 to-emerald-600' },
    { label: 'On Leave', value: stats.onLeave.toString(), icon: UserIcon, iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600' },
    { label: 'Departments', value: stats.departments.toString(), icon: UserGroupIcon, iconBg: 'bg-gradient-to-br from-purple-500 to-pink-600' }
  ];

  if (loading) {
    return <LoadingSpinner message="Loading employees..." className="min-h-[40vh] bg-transparent" />;
  }

  if (loadError) {
    return <ErrorState title="Employees unavailable" message={loadError} onRetry={fetchEmployees} className="max-w-xl mx-auto" />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
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
            onClick={() => navigate(`/${tenantSlug}/org/hr/employees/create`)}
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
              <div className={`w-12 h-12 xl:w-14 xl:h-14 rounded-2xl ${stat.iconBg} flex items-center justify-center shadow-glow-lg`}>
                <stat.icon className="w-6 h-6 xl:w-7 xl:h-7 text-white" />
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

      {/* Search and Filters */}
      <div className="glass-card-premium p-6 xl:p-8 hover-glow">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search employees by name, role, department, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="glass-input w-full pl-10 pr-4 py-3 text-sm font-medium rounded-xl"
            />
          </div>
          <div className="flex gap-3">
            <select className="glass-input px-4 py-3 text-sm font-medium rounded-xl">
              <option value="">All Departments</option>
              <option value="engineering">Engineering</option>
              <option value="design">Design</option>
              <option value="management">Management</option>
              <option value="sales">Sales</option>
              <option value="hr">HR</option>
            </select>
            <select className="glass-input px-4 py-3 text-sm font-medium rounded-xl">
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="on-leave">On Leave</option>
              <option value="probation">Probation</option>
            </select>
            <button className="glass-button px-4 py-2 rounded-xl hover-scale flex items-center gap-2">
              <FunnelIcon className="w-5 h-5" />
              <span className="font-medium">More Filters</span>
            </button>
          </div>
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
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-glow">
                          <span className="text-white font-bold text-sm">
                            {employee.name?.charAt(0) || employee.email?.charAt(0) || 'U'}
                          </span>
                        </div>
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
                        onClick={() => navigate(`/${tenantSlug}/org/hr/employees/${employee._id || employee.id}`)}
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

        {/* Pagination */}
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {filteredEmployees.length} of {employees.length} employees
          </div>
          <div className="flex items-center gap-2">
            <button className="glass-button px-3 py-2 rounded-xl text-sm font-medium disabled:opacity-50" disabled>
              Previous
            </button>
            <button className="glass-button px-3 py-2 rounded-xl text-sm font-medium bg-primary-500 text-white">
              1
            </button>
            <button className="glass-button px-3 py-2 rounded-xl text-sm font-medium">
              2
            </button>
            <button className="glass-button px-3 py-2 rounded-xl text-sm font-medium">
              3
            </button>
            <button className="glass-button px-3 py-2 rounded-xl text-sm font-medium">
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Employee Statistics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card-premium p-4 text-center">
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.active}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Active Employees</p>
        </div>
        <div className="glass-card-premium p-4 text-center">
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.onLeave}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">On Leave</p>
        </div>
        <div className="glass-card-premium p-4 text-center">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.departments}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Departments</p>
        </div>
        <div className="glass-card-premium p-4 text-center">
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {employees.length > 0 ? (stats.active / employees.length * 100).toFixed(0) : 0}%
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Active Rate</p>
        </div>
      </div>
    </div>
  );
};

export default EmployeeList;
