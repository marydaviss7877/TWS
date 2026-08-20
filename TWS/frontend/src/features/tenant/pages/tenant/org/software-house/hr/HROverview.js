import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import LoadingSpinner from '../../../../../../../shared/components/feedback/LoadingSpinner';
import ErrorState from '../../../../../../../shared/components/feedback/ErrorState';
import EmptyState from '../../../../../../../shared/components/feedback/EmptyState';
import { useTenantSlug } from '../../../../../../../shared/hooks/useTenantSlug';

const HROverview = () => {
  const tenantSlug = useTenantSlug();
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
    return <LoadingSpinner message="Loading HR overview..." className="min-h-[40vh] bg-transparent" />;
  }

  if (error) {
    return <ErrorState title="HR overview unavailable" message={error} onRetry={fetchHROverview} className="max-w-xl mx-auto" />;
  }

  if (!hrData) {
    return <EmptyState title="No HR data available" message="No HR overview metrics are available for this tenant yet." className="max-w-xl mx-auto" />;
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
            <div className="w-12 h-12 xl:w-14 xl:h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
              <UsersIcon className="w-6 h-6 xl:w-7 xl:h-7 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs xl:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total Employees</p>
              <p className="text-2xl xl:text-3xl font-bold font-heading text-gray-900 dark:text-white">{totalEmployees}</p>
            </div>
          </div>
        </div>

        <div className="glass-card-premium p-5 xl:p-6 hover-lift">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 xl:w-14 xl:h-14 rounded-2xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
              <UserIcon className="w-6 h-6 xl:w-7 xl:h-7 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs xl:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Departments</p>
              <p className="text-2xl xl:text-3xl font-bold font-heading text-gray-900 dark:text-white">{totalDepartments}</p>
            </div>
          </div>
        </div>

        <div className="glass-card-premium p-5 xl:p-6 hover-lift">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 xl:w-14 xl:h-14 rounded-2xl bg-accent-50 dark:bg-accent-900/20 flex items-center justify-center">
              <ClockIcon className="w-6 h-6 xl:w-7 xl:h-7 text-accent-600 dark:text-accent-400" />
            </div>
            <div>
              <p className="text-xs xl:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Attendance Rate</p>
              <p className="text-2xl xl:text-3xl font-bold font-heading text-gray-900 dark:text-white">{attendanceRate.toFixed(1)}%</p>
            </div>
          </div>
        </div>

        <div className="glass-card-premium p-5 xl:p-6 hover-lift">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 xl:w-14 xl:h-14 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
              <CurrencyDollarIcon className="w-6 h-6 xl:w-7 xl:h-7 text-amber-600 dark:text-amber-400" />
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
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <UsersIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
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
              <div className="w-12 h-12 rounded-xl bg-accent-50 dark:bg-accent-900/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <CurrencyDollarIcon className="w-6 h-6 text-accent-600 dark:text-accent-400" />
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
              <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ClockIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">Attendance</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Track time</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate(`/${tenantSlug}/org/analytics`)}
            className="glass-card p-4 hover-lift text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <EyeIcon className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">Analytics</p>
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
    present: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
    absent: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
    late: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
    half_day: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
  };
  return colors[status] || 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300';
};

export default HROverview;
