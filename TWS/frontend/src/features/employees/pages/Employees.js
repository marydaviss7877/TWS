import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../app/providers/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  MagnifyingGlassIcon,
  UserPlusIcon,
  PencilIcon,
  TrashIcon,
  AdjustmentsHorizontalIcon,
  EyeIcon,
  UserGroupIcon,
  BriefcaseIcon,
  CalendarIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import EmployeeForm from '../../../shared/components/forms/EmployeeForm';

const Employees = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [filters, setFilters] = useState({
    department: '',
    status: '',
    contractType: ''
  });
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  useEffect(() => {
    if (user) {
      fetchEmployees();
    }
  }, [user]);

  const fetchEmployees = async () => {
    try {
      const response = await axios.get('/api/employees');
      setEmployees(response.data.data.employees);
    } catch (error) {
      toast.error('Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      probation: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      'on-leave': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      resigned: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
      retired: 'bg-gray-100 text-gray-800 dark:bg-gray-800/20 dark:text-gray-400',
      terminated: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-800/20 dark:text-gray-400';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const filteredAndSortedEmployees = employees
    .filter(employee => {
      const matchesSearch = 
        employee.userId.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.jobTitle.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFilters = 
        (!filters.department || employee.department === filters.department) &&
        (!filters.status || employee.status === filters.status) &&
        (!filters.contractType || employee.contractType === filters.contractType);
      
      return matchesSearch && matchesFilters;
    })
    .sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = a.userId.fullName.toLowerCase();
          bValue = b.userId.fullName.toLowerCase();
          break;
        case 'department':
          aValue = a.department.toLowerCase();
          bValue = b.department.toLowerCase();
          break;
        case 'salary':
          aValue = a.salary.base;
          bValue = b.salary.base;
          break;
        case 'hireDate':
          aValue = new Date(a.hireDate);
          bValue = new Date(b.hireDate);
          break;
        default:
          aValue = a.userId.fullName.toLowerCase();
          bValue = b.userId.fullName.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  if (loading) {
    return (
      <div className="space-y-6 sm:space-y-8">
        <div className="flex justify-center items-center h-64">
          <div className="tws-loading-pulse rounded-full h-32 w-32 border-b-2 border-blue-600 dark:border-blue-400"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="wolfstack-card-premium wolfstack-animate-fadeIn">
        <div className="px-6 py-8 sm:p-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="wolfstack-heading-2 text-gray-900 dark:text-gray-100">
                Team Management 👥
              </h1>
              <p className="mt-2 wolfstack-text-body text-gray-600 dark:text-gray-300">
                Manage your team members and their information
              </p>
              <div className="mt-4 flex items-center space-x-6">
                <div className="flex items-center wolfstack-text-small text-gray-500 dark:text-gray-400">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                  {employees.filter(emp => emp.status === 'active').length} Active
                </div>
                <div className="flex items-center wolfstack-text-small text-gray-500 dark:text-gray-400">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
                  {employees.length} Total
                </div>
              </div>
            </div>
            <div className="hidden sm:block">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-700 rounded-2xl flex items-center justify-center shadow-lg">
                <UserGroupIcon className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>
          <div className="mt-6">
            <button
              onClick={() => setShowAddModal(true)}
              className="wolfstack-button-primary flex items-center"
            >
              <UserPlusIcon className="h-5 w-5 mr-2" />
              Add New Employee
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="wolfstack-grid-4">
        <div className="wolfstack-stats-card-premium wolfstack-animate-fadeIn" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <UserGroupIcon className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="ml-4">
              <p className="wolfstack-text-small font-medium text-gray-500 dark:text-gray-400">Total Employees</p>
              <p className="wolfstack-heading-3 text-gray-900 dark:text-gray-100">{employees.length}</p>
            </div>
          </div>
        </div>
        <div className="wolfstack-stats-card-premium wolfstack-animate-fadeIn" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <UserPlusIcon className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="ml-4">
              <p className="wolfstack-text-small font-medium text-gray-500 dark:text-gray-400">Active</p>
              <p className="wolfstack-heading-3 text-gray-900 dark:text-gray-100">
                {employees.filter(emp => emp.status === 'active').length}
              </p>
            </div>
          </div>
        </div>
        <div className="wolfstack-stats-card-premium wolfstack-animate-fadeIn" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg">
                <BriefcaseIcon className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="ml-4">
              <p className="wolfstack-text-small font-medium text-gray-500 dark:text-gray-400">Departments</p>
              <p className="wolfstack-heading-3 text-gray-900 dark:text-gray-100">
                {new Set(employees.map(emp => emp.department)).size}
              </p>
            </div>
          </div>
        </div>
        <div className="wolfstack-stats-card-premium wolfstack-animate-fadeIn" style={{ animationDelay: '0.4s' }}>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                <CurrencyDollarIcon className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="ml-4">
              <p className="wolfstack-text-small font-medium text-gray-500 dark:text-gray-400">Avg Salary</p>
              <p className="wolfstack-heading-3 text-gray-900 dark:text-gray-100">
                {employees.length > 0 ? formatCurrency(employees.reduce((sum, emp) => sum + emp.salary.base, 0) / employees.length) : '$0'}
              </p>
            </div>
          </div>
        </div>
      </div>

        {/* Search and Filters */}
        <div className="wolfstack-card-glass wolfstack-animate-fadeIn" style={{ animationDelay: '0.5s' }}>
          <div className="p-6 space-y-6">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Search */}
              <div className="flex-1 max-w-md">
                <label className="wolfstack-text-small font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Search Team Members
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search by name, ID, department, or job title..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="wolfstack-input pl-12"
                  />
                </div>
              </div>
              
              {/* Filters */}
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex flex-wrap gap-4">
                  <div>
                    <label className="wolfstack-text-small font-medium text-gray-700 dark:text-gray-300 mb-2 block">Department</label>
                    <select
                      value={filters.department}
                      onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value }))}
                      className="wolfstack-select min-w-[140px]"
                    >
                      <option value="">All Departments</option>
                      <option value="development">Development</option>
                      <option value="design">Design</option>
                      <option value="marketing">Marketing</option>
                      <option value="hr">Human Resources</option>
                      <option value="finance">Finance</option>
                      <option value="sales">Sales</option>
                      <option value="operations">Operations</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="wolfstack-text-small font-medium text-gray-700 dark:text-gray-300 mb-2 block">Status</label>
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                      className="wolfstack-select min-w-[120px]"
                    >
                      <option value="">All Status</option>
                      <option value="active">Active</option>
                      <option value="probation">Probation</option>
                      <option value="on-leave">On Leave</option>
                      <option value="terminated">Terminated</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="wolfstack-text-small font-medium text-gray-700 dark:text-gray-300 mb-2 block">Contract</label>
                    <select
                      value={filters.contractType}
                      onChange={(e) => setFilters(prev => ({ ...prev, contractType: e.target.value }))}
                      className="wolfstack-select min-w-[140px]"
                    >
                      <option value="">All Contract Types</option>
                      <option value="full-time">Full-time</option>
                      <option value="part-time">Part-time</option>
                      <option value="contract">Contract</option>
                      <option value="intern">Intern</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Sort Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-6 border-t border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <AdjustmentsHorizontalIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  <span className="wolfstack-text-small font-medium text-gray-700 dark:text-gray-300">Sort by:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="wolfstack-select"
                  >
                    <option value="name">Name</option>
                    <option value="department">Department</option>
                    <option value="salary">Salary</option>
                    <option value="hireDate">Hire Date</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="wolfstack-button-secondary wolfstack-text-small"
                  >
                    {sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
                  </button>
                </div>
              </div>
              
              <div className="flex items-center gap-2 wolfstack-text-small text-gray-600 dark:text-gray-400">
                <span className="font-medium">Showing</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{filteredAndSortedEmployees.length}</span>
                <span className="font-medium">of</span>
                <span className="font-bold text-gray-900 dark:text-gray-100">{employees.length}</span>
                <span className="font-medium">employees</span>
              </div>
            </div>
          </div>
        </div>

        {/* Employees Table */}
        <div className="wolfstack-card-glass wolfstack-animate-fadeIn" style={{ animationDelay: '0.6s' }}>
          <div className="px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50">
            <h2 className="wolfstack-heading-3 text-gray-900 dark:text-gray-100 flex items-center">
              <UserGroupIcon className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
              Team Members
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="wolfstack-card-glass-subtle">
                <tr>
                  <th className="px-6 py-3 text-left wolfstack-text-small font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left wolfstack-text-small font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left wolfstack-text-small font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Job Title
                  </th>
                  <th className="px-6 py-3 text-left wolfstack-text-small font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left wolfstack-text-small font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Contract
                  </th>
                  <th className="px-6 py-3 text-left wolfstack-text-small font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Salary
                  </th>
                  <th className="px-6 py-3 text-left wolfstack-text-small font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="wolfstack-card-glass-subtle divide-y divide-gray-200 dark:divide-gray-700">
                {filteredAndSortedEmployees.map((employee) => (
                  <tr key={employee._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors duration-200">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                            <span className="text-white font-bold wolfstack-text-small">
                              {employee.userId.fullName.charAt(0)}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="wolfstack-text-small font-semibold text-gray-900 dark:text-gray-100">
                            {employee.userId.fullName}
                          </div>
                          <div className="wolfstack-text-small text-gray-500 dark:text-gray-400 font-mono">
                            {employee.employeeId}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="wolfstack-text-small text-gray-900 dark:text-gray-100 capitalize">
                        {employee.department}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="wolfstack-text-small text-gray-900 dark:text-gray-100">
                        {employee.jobTitle}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full wolfstack-text-small font-medium ${getStatusColor(employee.status)}`}>
                        {employee.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="wolfstack-text-small text-gray-900 dark:text-gray-100 capitalize">
                        {employee.contractType}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="wolfstack-text-small font-semibold text-gray-900 dark:text-gray-100">
                        {formatCurrency(employee.salary.base)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap wolfstack-text-small font-medium">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => {
                            setSelectedEmployee(employee);
                            setShowEditModal(true);
                          }}
                          className="p-2 text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200"
                          title="Edit employee"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => {/* TODO: View employee profile */}}
                          className="p-2 text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-all duration-200"
                          title="View profile"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => {/* TODO: Delete employee */}}
                          className="p-2 text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
                          title="Delete employee"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {filteredAndSortedEmployees.length === 0 && (
          <div className="wolfstack-card-glass wolfstack-animate-fadeIn" style={{ animationDelay: '0.7s' }}>
            <div className="p-12 text-center">
              <div className="mx-auto w-24 h-24 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-700 rounded-full flex items-center justify-center mb-6 shadow-lg">
                <UserPlusIcon className="h-12 w-12 text-white" />
              </div>
              <h3 className="wolfstack-heading-2 text-gray-900 dark:text-gray-100 mb-2">
                {employees.length === 0 ? 'No Team Members Yet 👥' : 'No Results Found 🔍'}
              </h3>
              <p className="wolfstack-text-body text-gray-600 dark:text-gray-300 mb-8 max-w-md mx-auto">
                {employees.length === 0 
                  ? 'Start building your team by adding your first employee. You can manage their information, track performance, and organize your workforce.'
                  : 'We couldn\'t find any employees matching your search criteria. Try adjusting your filters or search terms.'
                }
              </p>
              {employees.length === 0 && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="wolfstack-button-primary flex items-center"
                >
                  <UserPlusIcon className="h-5 w-5 mr-2" />
                  Add Your First Employee
                </button>
              )}
            </div>
          </div>
        )}

        {/* Add Employee Modal */}
        {showAddModal && (
          <EmployeeForm
            mode="create"
            onClose={() => setShowAddModal(false)}
            onSuccess={(employee) => {
              setEmployees(prev => [employee, ...prev]);
              setShowAddModal(false);
            }}
          />
        )}

        {/* Edit Employee Modal */}
        {showEditModal && selectedEmployee && (
          <EmployeeForm
            mode="edit"
            employee={selectedEmployee}
            onClose={() => {
              setShowEditModal(false);
              setSelectedEmployee(null);
            }}
            onSuccess={(updatedEmployee) => {
              setEmployees(prev => 
                prev.map(emp => emp._id === updatedEmployee._id ? updatedEmployee : emp)
              );
              setShowEditModal(false);
              setSelectedEmployee(null);
            }}
          />
        )}
      </div>
  );
};

export default Employees;
