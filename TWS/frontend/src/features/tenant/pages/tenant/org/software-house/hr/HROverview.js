import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  UsersIcon,
  UserIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  PlusIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { tenantApiService } from '../../../../../../../shared/services/tenant/tenant-api.service';
import { useTenantAuth } from '../../../../../../../app/providers/TenantAuthContext';

const HROverview = () => {
  const { tenantSlug } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useTenantAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hrData, setHrData] = useState(null);

  useEffect(() => {
    // Only fetch if authenticated and auth is not loading
    if (!authLoading && isAuthenticated) {
      fetchHROverview();
    } else if (!authLoading && !isAuthenticated) {
      // If not authenticated, stop loading
      setLoading(false);
    }
  }, [tenantSlug, isAuthenticated, authLoading]);

  const fetchHROverview = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await tenantApiService.getHROverview(tenantSlug);
      if (data) {
        setHrData(data);
      } else {
        // Data is null (likely no token) - set empty state
        setHrData({
          totalEmployees: 0,
          activeEmployees: 0,
          onLeave: 0,
          newHires: 0,
          pendingRequests: 0,
          totalDepartments: 0,
          attendanceStats: [],
          payrollStats: { totalAmount: 0, employeeCount: 0 }
        });
      }
    } catch (err) {
      console.error('Error fetching HR overview:', err);
      setError('Failed to load HR overview data');
      // Set empty data on error
      setHrData({
        totalEmployees: 0,
        activeEmployees: 0,
        onLeave: 0,
        newHires: 0,
        pendingRequests: 0,
        totalDepartments: 0,
        attendanceStats: [],
        payrollStats: { totalAmount: 0, employeeCount: 0 }
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading HR overview...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card-premium p-6 border border-red-200 dark:border-red-800">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-400">Error</h3>
            <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
            <button
              onClick={fetchHROverview}
              className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!hrData) {
    return (
      <div className="glass-card-premium p-6 border border-blue-200 dark:border-blue-800">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-400">No Data</h3>
            <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">No HR data available</p>
          </div>
        </div>
      </div>
    );
  }

  const { 
    totalEmployees = 0, 
    totalDepartments = 0, 
    attendanceStats = [], 
    payrollStats = { totalAmount: 0, employeeCount: 0 } 
  } = hrData || {};

  // Calculate attendance rate
  const totalAttendance = (attendanceStats || []).reduce((sum, stat) => sum + (stat?.count || 0), 0);
  const presentCount = (attendanceStats || []).find(stat => stat?._id === 'present')?.count || 0;
  const attendanceRate = totalAttendance > 0 ? (presentCount / totalAttendance) * 100 : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl xl:text-3xl font-bold font-heading text-gray-900 dark:text-white">
            HR Management
          </h1>
          <p className="text-sm xl:text-base text-gray-600 dark:text-gray-300 mt-1">
            Comprehensive human resources management dashboard
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/${tenantSlug}/org/hr/employees`)}
            className="glass-button px-4 py-2 rounded-xl hover-scale flex items-center gap-2"
          >
            <EyeIcon className="w-5 h-5" />
            <span className="font-medium">View All</span>
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

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 xl:gap-6">
        <div className="glass-card-premium p-5 xl:p-6 hover-lift">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 xl:w-14 xl:h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-glow-lg">
              <UsersIcon className="w-6 h-6 xl:w-7 xl:h-7 text-white" />
            </div>
            <div>
              <p className="text-xs xl:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total Employees</p>
              <p className="text-2xl xl:text-3xl font-bold font-heading text-gray-900 dark:text-white">{totalEmployees}</p>
            </div>
          </div>
        </div>

        <div className="glass-card-premium p-5 xl:p-6 hover-lift">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 xl:w-14 xl:h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-glow-lg">
              <UserIcon className="w-6 h-6 xl:w-7 xl:h-7 text-white" />
            </div>
            <div>
              <p className="text-xs xl:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Departments</p>
              <p className="text-2xl xl:text-3xl font-bold font-heading text-gray-900 dark:text-white">{totalDepartments}</p>
            </div>
          </div>
        </div>

        <div className="glass-card-premium p-5 xl:p-6 hover-lift">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 xl:w-14 xl:h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-glow-lg">
              <ClockIcon className="w-6 h-6 xl:w-7 xl:h-7 text-white" />
            </div>
            <div>
              <p className="text-xs xl:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Attendance Rate</p>
              <p className="text-2xl xl:text-3xl font-bold font-heading text-gray-900 dark:text-white">{attendanceRate.toFixed(1)}%</p>
            </div>
          </div>
        </div>

        <div className="glass-card-premium p-5 xl:p-6 hover-lift">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 xl:w-14 xl:h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-glow-lg">
              <CurrencyDollarIcon className="w-6 h-6 xl:w-7 xl:h-7 text-white" />
            </div>
            <div>
              <p className="text-xs xl:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Monthly Payroll</p>
              <p className="text-2xl xl:text-3xl font-bold font-heading text-gray-900 dark:text-white">${payrollStats.totalAmount?.toLocaleString() || '0'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card-premium p-6 xl:p-8 hover-glow">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg xl:text-xl font-bold font-heading text-gray-900 dark:text-white">Attendance Overview</h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">This Month</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-4">
            <div 
              className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-300 shadow-glow"
              style={{ width: `${attendanceRate}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {presentCount} of {totalAttendance} present
          </p>
          <div className="flex flex-wrap gap-2">
            {(attendanceStats || []).map((stat) => (
              <span
                key={stat?._id || 'unknown'}
                className={`px-3 py-1 text-xs font-medium rounded-full ${getAttendanceColor(stat?._id)}`}
              >
                {stat?._id || 'unknown'}: {stat?.count || 0}
              </span>
            ))}
          </div>
        </div>

        <div className="glass-card-premium p-6 xl:p-8 hover-glow">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg xl:text-xl font-bold font-heading text-gray-900 dark:text-white">Payroll Summary</h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">This Month</span>
          </div>
          <div className="mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Amount</p>
            <p className="text-2xl xl:text-3xl font-bold font-heading text-green-600 dark:text-green-400">
              ${payrollStats.totalAmount?.toLocaleString() || '0'}
            </p>
          </div>
          <div className="mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Employees Paid</p>
            <p className="text-lg xl:text-xl font-bold text-gray-900 dark:text-white">{payrollStats.employeeCount || 0}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Average per employee: ${payrollStats.employeeCount > 0 ? 
                (payrollStats.totalAmount / payrollStats.employeeCount).toFixed(2) : 0}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="glass-card-premium p-6 xl:p-8 hover-glow">
        <h3 className="text-lg xl:text-xl font-bold font-heading text-gray-900 dark:text-white mb-6">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => navigate(`/${tenantSlug}/org/hr/employees`)}
            className="glass-card p-4 hover-lift text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-glow">
                <UsersIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">Manage Employees</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">View & edit staff</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate(`/${tenantSlug}/org/hr/payroll`)}
            className="glass-card p-4 hover-lift text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-glow">
                <CurrencyDollarIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">Payroll</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Process payments</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate(`/${tenantSlug}/org/hr/attendance`)}
            className="glass-card p-4 hover-lift text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-glow">
                <ClockIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">Attendance</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Track time</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate(`/${tenantSlug}/org/reports`)}
            className="glass-card p-4 hover-lift text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-glow">
                <EyeIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">Reports</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">View analytics</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper function to get attendance status colors
const getAttendanceColor = (status) => {
  const colors = {
    present: 'bg-green-100 text-green-800',
    absent: 'bg-red-100 text-red-800',
    late: 'bg-orange-100 text-orange-800',
    half_day: 'bg-blue-100 text-blue-800'
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

export default HROverview;
