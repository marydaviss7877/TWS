import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ChartPieIcon, 
  ClockIcon, 
  UserGroupIcon, 
  BuildingOffice2Icon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowPathIcon,
  CalendarIcon,
  EyeIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { get } from '../../../../../shared/utils/apiClient';
import { createLogger } from '../../../../../shared/utils/logger';

const logger = createLogger('SessionAnalytics');

const SessionAnalytics = () => {
  const [analytics, setAnalytics] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const abortControllerRef = useRef(null);

  const fetchAnalytics = useCallback(async () => {
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    try {
      setLoading(true);
      setError(null);
      
      // Fetch real analytics data from API
      const [sessionsResponse, departmentResponse] = await Promise.all([
        get(`/api/supra-admin/sessions/analytics/sessions?timeRange=${selectedPeriod}`, {
          signal: abortControllerRef.current.signal
        }),
        get(`/api/supra-admin/sessions/analytics/department-access?timeRange=${selectedPeriod}`, {
          signal: abortControllerRef.current.signal
        })
      ]);

      if (sessionsResponse.success && sessionsResponse.analytics) {
        // Transform API response to match component expectations
        const transformedAnalytics = {
          overview: {
            totalSessions: sessionsResponse.analytics.totalSessions || 0,
            activeSessions: sessionsResponse.analytics.activeSessions || 0,
            averageSessionDuration: sessionsResponse.analytics.averageSessionDuration || 0,
            peakConcurrentUsers: sessionsResponse.analytics.peakConcurrentUsers || 0,
            sessionGrowth: sessionsResponse.analytics.sessionGrowth || 0,
            durationGrowth: sessionsResponse.analytics.durationGrowth || 0
          },
          byTenant: sessionsResponse.analytics.topTenants || sessionsResponse.analytics.byTenant || [],
          byDepartment: departmentResponse.analytics?.topDepartments || departmentResponse.analytics?.byDepartment || [],
          trends: {
            daily: sessionsResponse.analytics.sessionTrends || [],
            hourly: sessionsResponse.analytics.hourlyDistribution || []
          },
          insights: sessionsResponse.analytics.insights || []
        };
        
        setAnalytics(transformedAnalytics);
        logger.info('Analytics data fetched successfully');
      } else {
        throw new Error(sessionsResponse.message || 'Failed to fetch analytics');
      }
    } catch (error) {
      // Don't set error if request was aborted
      if (error.name === 'AbortError') {
        return;
      }
      
      const errorMessage = error.message || 'Failed to fetch session analytics. Please try again.';
      setError(errorMessage);
      logger.error('Error fetching analytics', error);
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [selectedPeriod]);

  useEffect(() => {
    fetchAnalytics();
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchAnalytics]);

  const getGrowthColor = (growth) => {
    if (growth > 0) return 'text-green-600 dark:text-green-400';
    if (growth < 0) return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const getGrowthIcon = (growth) => {
    if (growth > 0) return <ArrowUpIcon className="w-4 h-4" />;
    if (growth < 0) return <ArrowDownIcon className="w-4 h-4" />;
    return null;
  };

  const getInsightColor = (type) => {
    switch (type) {
      case 'positive': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'warning': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'info': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  if (loading && !analytics.overview) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="ml-4 text-gray-600 dark:text-gray-400">Loading analytics data...</p>
      </div>
    );
  }

  if (error && !analytics.overview) {
    return (
      <div className="space-y-6">
        <div className="glass-card-premium p-6">
          <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 text-red-700 dark:text-red-400 px-4 py-3 rounded">
            <p className="font-bold">Error Loading Analytics</p>
            <p>{error}</p>
            <button
              onClick={fetchAnalytics}
              className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card-premium p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <ChartPieIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Session Analytics</h1>
              <p className="text-gray-600 dark:text-gray-400">Comprehensive session analytics and insights</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
            <button
              onClick={fetchAnalytics}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <ArrowPathIcon className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <ClockIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Sessions</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {analytics.overview?.totalSessions?.toLocaleString() || 0}
              </p>
              <div className={`flex items-center text-sm ${getGrowthColor(analytics.overview?.sessionGrowth || 0)}`}>
                {getGrowthIcon(analytics.overview?.sessionGrowth || 0)}
                <span>{Math.abs(analytics.overview?.sessionGrowth || 0)}%</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="glass-card p-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <UserGroupIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Sessions</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {analytics.overview?.activeSessions || 0}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Peak: {analytics.overview?.peakConcurrentUsers || 0}
              </p>
            </div>
          </div>
        </div>
        
        <div className="glass-card p-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <ChartPieIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg Duration</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {analytics.overview?.averageSessionDuration || 0}m
              </p>
              <div className={`flex items-center text-sm ${getGrowthColor(analytics.overview?.durationGrowth || 0)}`}>
                {getGrowthIcon(analytics.overview?.durationGrowth || 0)}
                <span>{Math.abs(analytics.overview?.durationGrowth || 0)}%</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="glass-card p-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <BuildingOffice2Icon className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Tenants</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {analytics.byTenant?.length || 0}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {analytics.byDepartment?.length || 0} departments
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Key Insights</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {analytics.insights?.map((insight, index) => (
            <div key={index} className="glass-card p-4">
              <div className="flex items-start space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getInsightColor(insight.type)}`}>
                  {insight.type === 'positive' && <ArrowUpIcon className="w-4 h-4" />}
                  {insight.type === 'warning' && <ExclamationTriangleIcon className="w-4 h-4" />}
                  {insight.type === 'info' && <EyeIcon className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">{insight.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{insight.message}</p>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-2 ${
                    insight.impact === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                    insight.impact === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  }`}>
                    {insight.impact} impact
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tenant Analytics */}
      <div className="glass-card">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Session Analytics by Tenant</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Tenant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Total Sessions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Active Sessions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Avg Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Peak Users
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Growth
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {analytics.byTenant?.map((tenant) => (
                <tr key={tenant.tenantId} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{tenant.tenantName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {tenant.totalSessions.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {tenant.activeSessions}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {tenant.averageDuration}m
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {tenant.peakUsers}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`flex items-center text-sm ${getGrowthColor(tenant.growth)}`}>
                      {getGrowthIcon(tenant.growth)}
                      <span>{Math.abs(tenant.growth)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Department Analytics */}
      <div className="glass-card">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Session Analytics by Department</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Total Sessions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Active Sessions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Avg Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Peak Users
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Growth
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {analytics.byDepartment?.map((department) => (
                <tr key={department.departmentId} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{department.departmentName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {department.totalSessions.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {department.activeSessions}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {department.averageDuration}m
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {department.peakUsers}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`flex items-center text-sm ${getGrowthColor(department.growth)}`}>
                      {getGrowthIcon(department.growth)}
                      <span>{Math.abs(department.growth)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SessionAnalytics;
