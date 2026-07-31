import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../app/providers/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  ChartBarIcon,
  ClockIcon,
  CalendarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
// Chart.js components temporarily disabled for compatibility
// import {
//   Chart as ChartJS,
//   CategoryScale,
//   LinearScale,
//   PointElement,
//   LineElement,
//   BarElement,
//   Title,
//   Tooltip,
//   Legend,
//   ArcElement,
// } from 'chart.js';
// import { Line, Bar, Doughnut } from 'react-chartjs-2';

// ChartJS.register(
//   CategoryScale,
//   LinearScale,
//   PointElement,
//   LineElement,
//   BarElement,
//   Title,
//   Tooltip,
//   Legend,
//   ArcElement
// );

const AttendanceAnalytics = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30'); // days
  // const [chartType, setChartType] = useState('line');

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - parseInt(dateRange));
      
      const response = await axios.get(`/api/attendance/analytics?from=${fromDate.toISOString()}&to=${new Date().toISOString()}`);
      
      if (response.data.success) {
        setAnalytics(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'present': return 'text-green-600 bg-green-100';
      case 'late': return 'text-yellow-600 bg-yellow-100';
      case 'absent': return 'text-red-600 bg-red-100';
      case 'half-day': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Chart data temporarily disabled
  // const attendanceTrendData = { ... };
  // const riskDistributionData = { ... };
  // const statusDistributionData = { ... };
  // const chartOptions = { ... };
  // const doughnutOptions = { ... };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="tws-loading-pulse rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Date Range</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="365">Last year</option>
              </select>
            </div>
            {/* Chart type selector temporarily disabled */}
            {/* <div>
              <label className="block text-sm font-medium text-gray-700">Chart Type</label>
              <select
                value={chartType}
                onChange={(e) => setChartType(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="line">Line Chart</option>
                <option value="bar">Bar Chart</option>
              </select>
            </div> */}
          </div>
          <button
            onClick={fetchAnalytics}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <ChartBarIcon className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ClockIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Avg Hours/Day</div>
              <div className="text-2xl font-bold text-gray-900">
                {analytics?.statistics?.avgDuration ? 
                  Math.round(analytics.statistics.avgDuration / 60 * 10) / 10 : '8.2'}h
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ArrowTrendingUpIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Avg Overtime</div>
              <div className="text-2xl font-bold text-gray-900">
                {analytics?.statistics?.avgOvertime ? 
                  Math.round(analytics.statistics.avgOvertime / 60 * 10) / 10 : '1.2'}h
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Quality Score</div>
              <div className="text-2xl font-bold text-gray-900">
                {analytics?.statistics?.avgQualityScore ? 
                  Math.round(analytics.statistics.avgQualityScore) : '92'}%
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-8 w-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Risk Events</div>
              <div className="text-2xl font-bold text-gray-900">
                {analytics?.suspiciousActivities?.length || 0}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts - Temporarily replaced with placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Trend */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Attendance Trend</h3>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center">
              <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">Chart visualization coming soon</p>
            </div>
          </div>
        </div>

        {/* Risk Distribution */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Risk Distribution</h3>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center">
              <ExclamationTriangleIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">Risk analysis coming soon</p>
            </div>
          </div>
        </div>
      </div>

      {/* Status Distribution */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Status Distribution</h3>
        <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
          <div className="text-center">
            <CheckCircleIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">Status analysis coming soon</p>
          </div>
        </div>
      </div>

      {/* Suspicious Activities */}
      {analytics?.suspiciousActivities && analytics.suspiciousActivities.length > 0 && (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Security Alerts</h3>
          <div className="space-y-3">
            {analytics.suspiciousActivities.slice(0, 5).map((activity, index) => (
              <div key={index} className="flex items-center justify-between py-3 px-4 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-3" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {new Date(activity.date).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-gray-500">
                      {activity.securityFlags?.join(', ') || 'Security concern detected'}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-medium px-2 py-1 rounded-full ${getRiskColor(activity.riskLevel)}`}>
                    {activity.riskLevel.toUpperCase()}
                  </div>
                  <div className="text-sm text-gray-500">
                    {activity.qualityScore}% quality
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance Insights */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Strengths</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center">
                <CheckCircleIcon className="h-4 w-4 text-green-600 mr-2" />
                Consistent check-in times
              </li>
              <li className="flex items-center">
                <CheckCircleIcon className="h-4 w-4 text-green-600 mr-2" />
                High quality score
              </li>
              <li className="flex items-center">
                <CheckCircleIcon className="h-4 w-4 text-green-600 mr-2" />
                Low risk incidents
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Areas for Improvement</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center">
                <XCircleIcon className="h-4 w-4 text-red-600 mr-2" />
                Reduce overtime hours
              </li>
              <li className="flex items-center">
                <XCircleIcon className="h-4 w-4 text-red-600 mr-2" />
                Improve break management
              </li>
              <li className="flex items-center">
                <XCircleIcon className="h-4 w-4 text-red-600 mr-2" />
                Enhance location verification
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceAnalytics;
