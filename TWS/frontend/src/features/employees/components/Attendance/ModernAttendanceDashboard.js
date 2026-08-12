import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../../app/providers/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  UsersIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  CalendarIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  UserGroupIcon,
  MapPinIcon,
  ShieldCheckIcon,
  PlusIcon,
  BellIcon
} from '@heroicons/react/24/outline';

const ModernAttendanceDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('7d');
  const [attendanceData, setAttendanceData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    department: '',
    status: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Mock data for demonstration
  const [metrics, setMetrics] = useState({
    totalEmployees: 156,
    presentToday: 142,
    absentToday: 14,
    lateArrivals: 8,
    attendanceRate: 91.0,
    avgWorkHours: 8.2
  });

  const [recentActivity, setRecentActivity] = useState([
    { id: 1, employee: 'John Doe', action: 'Checked In', time: '09:15 AM', status: 'late' },
    { id: 2, employee: 'Sarah Smith', action: 'Checked Out', time: '06:30 PM', status: 'normal' },
    { id: 3, employee: 'Mike Johnson', action: 'Checked In', time: '08:45 AM', status: 'early' },
    { id: 4, employee: 'Emily Davis', action: 'Break Started', time: '02:15 PM', status: 'normal' },
    { id: 5, employee: 'David Wilson', action: 'Checked In', time: '09:30 AM', status: 'late' }
  ]);

  const loadingTimerRef = useRef(null);

  useEffect(() => {
    fetchAttendanceData();
    return () => {
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
    };
  }, [filters, timeRange]);

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      // Mock API call - replace with actual API
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = setTimeout(() => {
        setLoading(false);
        loadingTimerRef.current = null;
      }, 1000);
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      toast.error('Failed to load attendance data');
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      present: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      absent: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      late: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      early: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      normal: 'bg-gray-100 text-gray-800 dark:bg-gray-800/20 dark:text-gray-400'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-800/20 dark:text-gray-400';
  };

  const formatTime = (time) => {
    return new Date(time).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

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
                Attendance Management 📊
              </h1>
              <p className="mt-2 wolfstack-text-body text-gray-600 dark:text-gray-300">
                Track and manage employee attendance efficiently
              </p>
              <div className="mt-4 flex items-center space-x-6">
                <div className="flex items-center wolfstack-text-small text-gray-500 dark:text-gray-400">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                  {metrics.presentToday} Present Today
                </div>
                <div className="flex items-center wolfstack-text-small text-gray-500 dark:text-gray-400">
                  <div className="w-2 h-2 bg-red-400 rounded-full mr-2"></div>
                  {metrics.absentToday} Absent
                </div>
              </div>
            </div>
            <div className="hidden sm:block">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 via-emerald-600 to-teal-700 rounded-2xl flex items-center justify-center shadow-lg">
                <ClockIcon className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>
          <div className="mt-6 flex space-x-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="wolfstack-select"
            >
              <option value="today">Today</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
            <button
              onClick={fetchAttendanceData}
              className="wolfstack-button-primary flex items-center"
            >
              <ArrowPathIcon className="h-5 w-5 mr-2" />
              Refresh
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
              <p className="wolfstack-heading-3 text-gray-900 dark:text-gray-100">{metrics.totalEmployees}</p>
            </div>
          </div>
        </div>
        <div className="wolfstack-stats-card-premium wolfstack-animate-fadeIn" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <CheckCircleIcon className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="ml-4">
              <p className="wolfstack-text-small font-medium text-gray-500 dark:text-gray-400">Present Today</p>
              <p className="wolfstack-heading-3 text-gray-900 dark:text-gray-100">{metrics.presentToday}</p>
            </div>
          </div>
        </div>
        <div className="wolfstack-stats-card-premium wolfstack-animate-fadeIn" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center shadow-lg">
                <XCircleIcon className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="ml-4">
              <p className="wolfstack-text-small font-medium text-gray-500 dark:text-gray-400">Absent Today</p>
              <p className="wolfstack-heading-3 text-gray-900 dark:text-gray-100">{metrics.absentToday}</p>
            </div>
          </div>
        </div>
        <div className="wolfstack-stats-card-premium wolfstack-animate-fadeIn" style={{ animationDelay: '0.4s' }}>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg">
                <ChartBarIcon className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="ml-4">
              <p className="wolfstack-text-small font-medium text-gray-500 dark:text-gray-400">Attendance Rate</p>
              <p className="wolfstack-heading-3 text-gray-900 dark:text-gray-100">{metrics.attendanceRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="wolfstack-card-glass wolfstack-animate-fadeIn" style={{ animationDelay: '0.5s' }}>
        <div className="p-6 space-y-6">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 max-w-md">
              <label className="wolfstack-text-small font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Search Employees
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search by name or employee ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="wolfstack-input pl-12"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="wolfstack-text-small font-medium text-gray-700 dark:text-gray-300 mb-2 block">Date</label>
                <input
                  type="date"
                  value={filters.date}
                  onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
                  className="wolfstack-input"
                />
              </div>
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
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="late">Late</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="wolfstack-card-glass wolfstack-animate-fadeIn" style={{ animationDelay: '0.6s' }}>
        <div className="px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50">
          <h2 className="wolfstack-heading-3 text-gray-900 dark:text-gray-100 flex items-center">
            <BellIcon className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
            Recent Activity
          </h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="wolfstack-card-glass-subtle p-4 rounded-xl hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg mr-4">
                      <span className="text-white font-bold wolfstack-text-small">
                        {(activity.employee?.fullName || activity.employee?.name || activity.employee?.email || activity.employee || '?').toString().split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <div className="wolfstack-text-small font-semibold text-gray-900 dark:text-gray-100">
                        {activity.employee?.fullName || activity.employee?.name || activity.employee?.email || activity.employee || 'Unknown'}
                      </div>
                      <div className="wolfstack-text-small text-gray-500 dark:text-gray-400">
                        {activity.action}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full wolfstack-text-small font-medium ${getStatusColor(activity.status)}`}>
                      {activity.status}
                    </span>
                    <div className="wolfstack-text-small text-gray-500 dark:text-gray-400">
                      {activity.time}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="wolfstack-card-glass wolfstack-animate-fadeIn" style={{ animationDelay: '0.7s' }}>
        <div className="px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50">
          <h2 className="wolfstack-heading-3 text-gray-900 dark:text-gray-100">Quick Actions</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button className="wolfstack-card-glass-subtle p-6 rounded-xl hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-all duration-200 text-left group">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg mb-4 group-hover:scale-110 transition-transform">
                <ChartBarIcon className="h-6 w-6 text-white" />
              </div>
              <h3 className="wolfstack-text-body font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Generate Report
              </h3>
              <p className="wolfstack-text-small text-gray-600 dark:text-gray-400">
                Create detailed attendance reports
              </p>
            </button>
            <button className="wolfstack-card-glass-subtle p-6 rounded-xl hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-all duration-200 text-left group">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg mb-4 group-hover:scale-110 transition-transform">
                <PlusIcon className="h-6 w-6 text-white" />
              </div>
              <h3 className="wolfstack-text-body font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Manual Entry
              </h3>
              <p className="wolfstack-text-small text-gray-600 dark:text-gray-400">
                Add manual attendance records
              </p>
            </button>
            <button className="wolfstack-card-glass-subtle p-6 rounded-xl hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-all duration-200 text-left group">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg mb-4 group-hover:scale-110 transition-transform">
                <ShieldCheckIcon className="h-6 w-6 text-white" />
              </div>
              <h3 className="wolfstack-text-body font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Compliance Check
              </h3>
              <p className="wolfstack-text-small text-gray-600 dark:text-gray-400">
                Review attendance compliance
              </p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernAttendanceDashboard;