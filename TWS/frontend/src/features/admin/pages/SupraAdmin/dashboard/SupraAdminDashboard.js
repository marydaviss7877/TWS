import React, { useState, useEffect, useCallback } from 'react';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { 
  BuildingOffice2Icon, 
  CurrencyDollarIcon, 
  UserGroupIcon, 
  ChartBarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  SparklesIcon,
  BoltIcon,
  ShieldCheckIcon,
  TrendingUpIcon,
  FireIcon,
  ArrowRightIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { useTheme } from '../../../../../app/providers/ThemeContext';
import { Button } from '../../../../../components/ui/Button/Button';
import { Badge } from '../../../../../components/ui/Badge/Badge';
import { Spinner } from '../../../../../components/ui/Spinner/Spinner';
import { EmptyState } from '../../../../../components/ui/EmptyState/EmptyState';
import { get } from '../../../../../shared/utils/apiClient';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
);

const STAT_CARD_COLOR_CLASSES = {
  blue: 'from-blue-500 to-blue-600',
  green: 'from-green-500 to-green-600',
  purple: 'from-purple-500 to-purple-600',
  orange: 'from-orange-500 to-orange-600',
  pink: 'from-pink-500 to-pink-600',
};

const StatCard = ({ title, value, change, changeType, icon: Icon, color = 'blue', gradient }) => {
  const gradientClass = gradient || STAT_CARD_COLOR_CLASSES[color];

  // Only show change if it exists and value is not zero (unless it's a new addition)
  const shouldShowChange = change !== null && change !== undefined && (value > 0 || change === 100);

  return (
    <div className="group relative bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 hover:scale-[1.02] overflow-hidden">
      {/* Gradient background effect */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradientClass} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${gradientClass} flex items-center justify-center shadow-lg`}>
            <Icon className="w-7 h-7 text-white" />
          </div>
          {shouldShowChange && (
            <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${
              changeType === 'increase'
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
            }`}>
              {changeType === 'increase' ? (
                <ArrowUpIcon className="w-4 h-4" />
              ) : (
                <ArrowDownIcon className="w-4 h-4" />
              )}
              <span>{change > 0 ? '+' : ''}{change}%</span>
            </div>
          )}
        </div>
        <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
          {value}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">{title}</p>
      </div>
    </div>
  );
};

const SupraAdminDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { isDarkMode } = useTheme();

  // Fetch dashboard data - simple, no auto-refresh needed
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setIsRefreshing(true);

      const data = await get('/api/supra-admin/dashboard');
      setDashboardData(data);
    } catch (err) {
      console.error('Dashboard data fetch error:', err);
      setError(`Unable to load dashboard data: ${err.message}`);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Load data once on mount - no auto-refresh
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" label="Loading dashboard..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md text-center border border-gray-200 dark:border-gray-700">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <ExclamationTriangleIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Error loading dashboard</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <Button onClick={fetchDashboardData} className="mx-auto">
            <BoltIcon className="w-5 h-5 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const { 
    overview = {}, 
    tenantStats = {}, 
    revenueStats = {}, 
    systemHealth = {}, 
    recentActivity = [], 
    topTenants = [] 
  } = dashboardData || {};

  // Chart data - Only use real data, no hardcoded values
  // Revenue chart will only show if revenue data exists (handled in render)
  const revenueChartData = overview.totalRevenue !== null && overview.totalRevenue !== undefined ? {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Revenue',
        // TODO: Replace with actual monthly revenue data from API when available
        data: [0, 0, 0, 0, 0, overview.totalRevenue || 0], // Only show current month if available
        backgroundColor: isDarkMode 
          ? 'rgba(59, 130, 246, 0.2)' 
          : 'rgba(59, 130, 246, 0.1)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 2,
        borderRadius: 8,
        fill: true,
      },
    ],
  } : null;

  const tenantChartData = {
    labels: ['Active', 'Trial', 'Suspended', 'Cancelled'],
    datasets: [
      {
        data: [
          tenantStats.active || 0, 
          tenantStats.trial || 0, 
          tenantStats.suspended || 0, 
          tenantStats.cancelled || 0
        ],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
        ],
        borderWidth: 0,
        hoverOffset: 4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: isDarkMode ? 'rgba(17, 24, 39, 0.9)' : 'rgba(255, 255, 255, 0.9)',
        titleColor: isDarkMode ? '#fff' : '#111',
        bodyColor: isDarkMode ? '#fff' : '#111',
        borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          color: isDarkMode ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)',
          callback: function(value) {
            return '$' + value.toLocaleString();
          }
        }
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: isDarkMode ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)',
        }
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent mb-2">
            TWS Supra Admin Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Welcome to your enterprise command center</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Manual Refresh Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchDashboardData}
            disabled={loading || isRefreshing}
            title="Refresh dashboard"
          >
            <ArrowPathIcon className={`w-5 h-5 ${(loading || isRefreshing) ? 'tws-loading-pulse' : ''}`} />
          </Button>
          
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
            <ShieldCheckIcon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Tenants"
          value={overview.totalTenants || 0}
          change={overview.totalTenantsChange}
          changeType={overview.totalTenantsChange && overview.totalTenantsChange >= 0 ? 'increase' : 'decrease'}
          icon={BuildingOffice2Icon}
          color="blue"
          gradient="from-blue-500 to-cyan-600"
        />
        <StatCard
          title="Active Tenants"
          value={overview.activeTenants || 0}
          change={overview.activeTenantsChange}
          changeType={overview.activeTenantsChange && overview.activeTenantsChange >= 0 ? 'increase' : 'decrease'}
          icon={CheckCircleIcon}
          color="green"
          gradient="from-green-500 to-emerald-600"
        />
        {overview.totalRevenue !== null && overview.totalRevenue !== undefined ? (
          <StatCard
            title="Monthly Revenue"
            value={`$${overview.totalRevenue.toLocaleString()}`}
            change={overview.monthlyGrowth}
            changeType={overview.monthlyGrowth && overview.monthlyGrowth >= 0 ? 'increase' : 'decrease'}
            icon={CurrencyDollarIcon}
            color="green"
            gradient="from-emerald-500 to-teal-600"
          />
        ) : null}
        <StatCard
          title="Trial Tenants"
          value={overview.trialTenants || 0}
          change={overview.trialTenantsChange}
          changeType={overview.trialTenantsChange && overview.trialTenantsChange >= 0 ? 'increase' : 'decrease'}
          icon={ClockIcon}
          color="orange"
          gradient="from-orange-500 to-amber-600"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart - Only show if revenue data exists */}
        {overview.totalRevenue !== null && overview.totalRevenue !== undefined && revenueChartData ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <ChartBarIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Monthly Revenue</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Last 6 months</p>
              </div>
            </div>
            <div className="h-64">
              <Bar data={revenueChartData} options={chartOptions} />
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <ChartBarIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Monthly Revenue</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Revenue data</p>
              </div>
            </div>
            <div className="h-64 flex items-center justify-center">
              <EmptyState
                icon={ChartBarIcon}
                title="No revenue data available"
                description="Revenue will appear when billing data is available"
              />
            </div>
          </div>
        )}

        {/* Tenant Distribution - Only show if tenants exist */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
              <BuildingOffice2Icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Tenant Distribution</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">By status</p>
            </div>
          </div>
          <div className="h-64 flex items-center justify-center">
            {(tenantStats.active || 0) + (tenantStats.trial || 0) + (tenantStats.suspended || 0) + (tenantStats.cancelled || 0) > 0 ? (
              <Doughnut 
                data={tenantChartData} 
                options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    legend: {
                      position: 'bottom',
                      labels: {
                        color: isDarkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)',
                        padding: 15,
                        font: {
                          size: 12,
                          weight: '500'
                        }
                      }
                    }
                  }
                }} 
              />
            ) : (
              <EmptyState
                icon={BuildingOffice2Icon}
                title="No tenants yet"
                description="Tenant distribution will appear when tenants are added"
              />
            )}
          </div>
        </div>
      </div>

      {/* System Health & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Health */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
              <ShieldCheckIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">System Health</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Real-time metrics</p>
            </div>
          </div>
          <div className="space-y-3">
            {systemHealth.totalUsers !== null && systemHealth.totalUsers !== undefined && (
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Users</span>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {systemHealth.totalUsers.toLocaleString()}
                </span>
              </div>
            )}
            {systemHealth.avgResponseTime !== null && systemHealth.avgResponseTime !== undefined && (
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Avg Response Time</span>
                <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {systemHealth.avgResponseTime}ms
                </span>
              </div>
            )}
            {(systemHealth.totalUsers === null || systemHealth.totalUsers === undefined) &&
             (systemHealth.avgResponseTime === null || systemHealth.avgResponseTime === undefined) && (
              <EmptyState
                icon={ShieldCheckIcon}
                title="No system health data available"
                description="Data will appear when available"
                className="py-8"
              />
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
              <ClockIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recent Activity</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Latest updates</p>
            </div>
          </div>
          <div className="space-y-3 flex-1">
            {(recentActivity.recentTenants || []).slice(0, 5).map((tenant) => (
              <div
                key={tenant._id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                    <BuildingOffice2Icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{tenant.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(tenant.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              </div>
            ))}
            {(!recentActivity.recentTenants || recentActivity.recentTenants.length === 0) && (
              <EmptyState icon={ClockIcon} title="No recent activity" className="py-8" />
            )}
          </div>
          {/* View All Tenants Button */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Link
              to="/supra-admin/tenants"
              className="flex items-center justify-end gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors group"
            >
              <span>View All Tenants</span>
              <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      {/* Top Performing Tenants */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
            <FireIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Top Performing Tenants</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">By revenue</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Tenant
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Users
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {(topTenants.topRevenue || []).slice(0, 5).map((tenant) => (
                <tr
                  key={tenant._id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900 dark:text-white">{tenant.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{tenant.slug}</div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="secondary">{tenant.plan}</Badge>
                  </td>
                  <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                    ${tenant.totalRevenue?.toLocaleString() || '0'}
                  </td>
                  <td className="px-6 py-4 text-gray-900 dark:text-white">
                    {tenant.invoiceCount || 0} invoices
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="success">Active</Badge>
                  </td>
                </tr>
              ))}
              {(!topTenants.topRevenue || topTenants.topRevenue.length === 0) && (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    No tenant data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SupraAdminDashboard;
