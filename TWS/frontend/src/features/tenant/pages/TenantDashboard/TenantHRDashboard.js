import React, { useState, useEffect } from 'react';
import { 
  UsersIcon, 
  UserPlusIcon, 
  ClockIcon, 
  CurrencyDollarIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline';
import { useTenantAuth } from '../../../../app/providers/TenantAuthContext';
import FeatureUnavailable from '../../../../shared/components/feedback/FeatureUnavailable';
import LoadingSpinner from '../../../../shared/components/feedback/LoadingSpinner';
import ErrorState from '../../../../shared/components/feedback/ErrorState';
import EmptyState from '../../../../shared/components/feedback/EmptyState';

const TenantHRDashboard = () => {
  const [hrData, setHrData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user, tenant, isAuthenticated } = useTenantAuth();

  useEffect(() => {
    if (isAuthenticated) {
      fetchHRData();
    }
  }, [isAuthenticated]);

  const fetchHRData = async () => {
    try {
      setLoading(true);
      setError(null);

      // SECURITY FIX: Removed localStorage token check - use cookies instead
      const response = await fetch('/api/system-monitoring/health', {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch HR data');
      }

      const result = await response.json();
      if (result.success) {
        setHrData(result.data);
      } else {
        throw new Error(result.message || 'Failed to load HR data');
      }
    } catch (err) {
      console.error('Error fetching HR data:', err);
      setError('Failed to load HR data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Not Authenticated</h2>
          <p className="text-gray-600">Please log in to access HR dashboard.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <LoadingSpinner message="Loading HR dashboard..." />;
  }

  if (error) {
    return <ErrorState title="HR dashboard error" message={error} onRetry={fetchHRData} />;
  }

  if (!hrData) {
    return <EmptyState title="No HR dashboard data" message="No HR metrics are available for this tenant yet." className="max-w-3xl mx-auto mt-10" />;
  }

  const stats = [
    {
      name: 'Total Employees',
      value: hrData?.stats?.totalEmployees || 0,
      icon: UsersIcon,
      change: '+2',
      changeType: 'positive',
      color: 'blue'
    },
    {
      name: 'Active Employees',
      value: hrData?.stats?.activeEmployees || 0,
      icon: CheckCircleIcon,
      change: '+1',
      changeType: 'positive',
      color: 'green'
    },
    {
      name: 'On Leave',
      value: hrData?.stats?.onLeave || 0,
      icon: ClockIcon,
      change: '-1',
      changeType: 'negative',
      color: 'yellow'
    },
    {
      name: 'Monthly Payroll',
      value: `$${(hrData?.stats?.monthlyPayroll || 0).toLocaleString()}`,
      icon: CurrencyDollarIcon,
      change: '+5%',
      changeType: 'positive',
      color: 'emerald'
    }
  ];

  return (
    <div className="space-y-6">
      <FeatureUnavailable
        title="Tenant HR dashboard unavailable"
        description="This dashboard is not available in this release yet. Use Organization > HR modules for live data."
      />
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              HR Management Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              Manage your team and human resources for {tenant?.name}.
            </p>
          </div>
          <div className="flex space-x-3">
            <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center">
              <UserPlusIcon className="h-5 w-5 mr-2" />
              Add Employee
            </button>
            <button className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center">
              <ChartBarIcon className="h-5 w-5 mr-2" />
              Reports
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={stat.name} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className={`w-12 h-12 bg-${stat.color}-100 dark:bg-${stat.color}-900 rounded-lg flex items-center justify-center`}>
                      <stat.icon className={`h-6 w-6 text-${stat.color}-600 dark:text-${stat.color}-400`} />
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.name}</p>
                    <div className="flex items-baseline">
                      <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stat.value}</p>
                      {stat.change && (
                        <p className={`ml-2 text-sm font-medium ${
                          stat.changeType === 'positive' ? 'text-green-600' :
                          stat.changeType === 'negative' ? 'text-red-600' :
                          'text-gray-500'
                        }`}>
                          {stat.change}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Departments Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Departments</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {hrData?.departments?.map((dept, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">{dept.name}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{dept.employees} employees</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900 dark:text-white">${dept.budget.toLocaleString()}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">monthly budget</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Recent Activity</h3>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {hrData?.recentActivity?.map((activity) => (
              <div key={activity.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{activity.message}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <CheckCircleIcon className="h-5 w-5 text-green-500" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TenantHRDashboard;
