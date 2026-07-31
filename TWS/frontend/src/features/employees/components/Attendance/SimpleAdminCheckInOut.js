import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../app/providers/AuthContext';
import { useSocket } from '../../../../app/providers/SocketContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import AttendanceCalendar from './AttendanceCalendar';
import EmployeeRecordsView from './EmployeeRecordsView';
import { 
  ClockIcon, 
  CheckCircleIcon,
  XCircleIcon,
  UserIcon,
  IdentificationIcon,
  CalendarIcon,
  ChartBarIcon,
  ArrowPathIcon,
  UserGroupIcon,
  EyeIcon,
  TableCellsIcon,
  ViewColumnsIcon
} from '@heroicons/react/24/outline';

const SimpleAdminCheckInOut = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [loading, setLoading] = useState(false);
  const [adminId, setAdminId] = useState('');
  const [showAdminIdModal, setShowAdminIdModal] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [todayStats, setTodayStats] = useState({
    totalHours: 0,
    checkInTime: null,
    checkOutTime: null,
    status: 'not_checked_in'
  });
  const [employeeRecords, setEmployeeRecords] = useState([]);
  const [activeTab, setActiveTab] = useState('checkin');

  useEffect(() => {
    if (user) {
      setAdminId(user.adminId || user.employeeId || '');
      fetchTodayAttendance();
      fetchEmployeeRecords();
    }
  }, [user]);

  useEffect(() => {
    if (socket) {
      // Listen for real-time attendance updates
      socket.on('attendanceUpdate', (data) => {
        fetchTodayAttendance();
        fetchEmployeeRecords();
      });

      return () => {
        socket.off('attendanceUpdate');
      };
    }
  }, [socket]);

  const fetchTodayAttendance = async () => {
    try {
      const response = await axios.get('/api/attendance/today');
      if (response.data.success && response.data.data.attendance) {
        const attendance = response.data.data.attendance;
        setTodayAttendance(attendance);
        
        // Calculate stats
        const checkInTime = attendance.checkIn?.timestamp;
        const checkOutTime = attendance.checkOut?.timestamp;
        const totalHours = attendance.durationMinutes ? Math.round((attendance.durationMinutes / 60) * 100) / 100 : 0;
        
        setTodayStats({
          totalHours,
          checkInTime,
          checkOutTime,
          status: checkOutTime ? 'checked_out' : checkInTime ? 'checked_in' : 'not_checked_in'
        });
      } else {
        setTodayStats({
          totalHours: 0,
          checkInTime: null,
          checkOutTime: null,
          status: 'not_checked_in'
        });
      }
    } catch (error) {
      console.error('Failed to fetch today attendance:', error);
    }
  };

  const fetchEmployeeRecords = async () => {
    try {
      const response = await axios.get('/api/attendance/admin/simple/records');
      if (response.data.success) {
        setEmployeeRecords(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch employee records:', error);
    }
  };

  const handleCheckIn = async () => {
    if (!adminId) {
      setShowAdminIdModal(true);
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/attendance/simple/admin/checkin', {
        adminId,
        timestamp: new Date().toISOString()
      });

      if (response.data.success) {
        toast.success('Admin checked in successfully! 🚀');
        fetchTodayAttendance();
        fetchEmployeeRecords();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Check-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setLoading(true);
    try {
      const response = await axios.post('/api/attendance/simple/admin/checkout', {
        adminId,
        timestamp: new Date().toISOString()
      });

      if (response.data.success) {
        toast.success('Admin checked out successfully! 🎉');
        fetchTodayAttendance();
        fetchEmployeeRecords();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Check-out failed');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'checked_in': return 'text-green-600 bg-green-100';
      case 'checked_out': return 'text-blue-600 bg-blue-100';
      case 'not_checked_in': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'checked_in': return 'Checked In';
      case 'checked_out': return 'Checked Out';
      case 'not_checked_in': return 'Not Checked In';
      default: return 'Unknown';
    }
  };

  const tabs = [
    {
      id: 'checkin',
      name: 'Check-In/Out',
      icon: ClockIcon,
      description: 'Admin check-in and check-out'
    },
    {
      id: 'calendar',
      name: 'Calendar',
      icon: CalendarIcon,
      description: 'Attendance calendar view'
    },
    {
      id: 'records',
      name: 'Employee Records',
      icon: TableCellsIcon,
      description: 'View and manage employee records'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Admin Check-In/Out
              </h1>
              <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">
                Admin attendance tracking with Admin ID
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm text-gray-500">Admin ID</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {adminId || 'Not Set'}
                </div>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
                <IdentificationIcon className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-purple-500 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className={`-ml-0.5 mr-2 h-5 w-5 ${
                      activeTab === tab.id ? 'text-purple-500' : 'text-gray-400 group-hover:text-gray-500'
                    }`} />
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'checkin' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Check-in/Out Panel */}
            <div className="lg:col-span-2 space-y-6">
              {/* Admin Check-in/Out Card */}
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8">
                <div className="text-center">
                  <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 mb-6 shadow-lg">
                    <ClockIcon className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {todayStats.status === 'checked_in' ? 'Check Out' : 'Check In'}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-8">
                    {todayStats.status === 'checked_in' 
                      ? 'You are currently checked in. Click below to check out.'
                      : 'Click below to check in for the day.'
                    }
                  </p>

                  {/* Admin ID Display */}
                  <div className="mb-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <div className="flex items-center justify-center">
                      <UserIcon className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-600 dark:text-gray-300">Admin ID:</span>
                      <span className="ml-2 font-bold text-gray-900 dark:text-white">
                        {adminId || 'Not Set'}
                      </span>
                      {!adminId && (
                        <button
                          onClick={() => setShowAdminIdModal(true)}
                          className="ml-2 text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Set ID
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Check In/Out Button */}
                  <div className="mb-6">
                    {todayStats.status === 'not_checked_in' ? (
                      <button
                        onClick={handleCheckIn}
                        disabled={loading || !adminId}
                        className="inline-flex items-center px-12 py-4 border border-transparent text-lg font-medium rounded-2xl shadow-lg text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
                      >
                        {loading ? (
                          <div className="tws-loading-pulse rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                        ) : (
                          <CheckCircleIcon className="h-6 w-6 mr-3" />
                        )}
                        Check In
                      </button>
                    ) : todayStats.status === 'checked_in' ? (
                      <button
                        onClick={handleCheckOut}
                        disabled={loading}
                        className="inline-flex items-center px-12 py-4 border border-transparent text-lg font-medium rounded-2xl shadow-lg text-white bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
                      >
                        {loading ? (
                          <div className="tws-loading-pulse rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                        ) : (
                          <XCircleIcon className="h-6 w-6 mr-3" />
                        )}
                        Check Out
                      </button>
                    ) : (
                      <div className="text-green-600 font-medium">
                        <CheckCircleIcon className="h-8 w-8 mx-auto mb-2" />
                        All done for today!
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Today's Status */}
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                  <ChartBarIcon className="h-6 w-6 mr-2 text-green-600" />
                  Today's Status
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      {todayStats.checkInTime 
                        ? new Date(todayStats.checkInTime).toLocaleTimeString()
                        : 'Not checked in'
                      }
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Check In Time</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      {todayStats.checkOutTime 
                        ? new Date(todayStats.checkOutTime).toLocaleTimeString()
                        : 'Not checked out'
                      }
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Check Out Time</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      {todayStats.totalHours}h
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Total Hours</div>
                  </div>
                </div>
                <div className="mt-6 text-center">
                  <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(todayStats.status)}`}>
                    {getStatusText(todayStats.status)}
                  </span>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Current Status */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                  <CalendarIcon className="h-5 w-5 mr-2 text-purple-600" />
                  Current Status
                </h3>
                <div className="text-center">
                  <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
                    todayStats.status === 'checked_in' ? 'bg-green-100' :
                    todayStats.status === 'checked_out' ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    {todayStats.status === 'checked_in' ? (
                      <CheckCircleIcon className="h-8 w-8 text-green-600" />
                    ) : todayStats.status === 'checked_out' ? (
                      <XCircleIcon className="h-8 w-8 text-blue-600" />
                    ) : (
                      <ClockIcon className="h-8 w-8 text-gray-600" />
                    )}
                  </div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {getStatusText(todayStats.status)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    {new Date().toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Employee Records Summary */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                  <UserGroupIcon className="h-5 w-5 mr-2 text-blue-600" />
                  Employee Records
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Employees</span>
                    <span className="font-semibold text-gray-900">{employeeRecords.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Checked In Today</span>
                    <span className="font-semibold text-green-600">
                      {employeeRecords.filter(r => r.status === 'checked_in' || r.status === 'checked_out').length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Not Checked In</span>
                    <span className="font-semibold text-red-600">
                      {employeeRecords.filter(r => r.status === 'not_checked_in').length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                  Quick Actions
                </h3>
                <div className="space-y-3">
                  <button 
                    onClick={fetchTodayAttendance}
                    className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200"
                  >
                    <ArrowPathIcon className="h-5 w-5 mr-2" />
                    Refresh Status
                  </button>
                  <button 
                    onClick={() => setShowAdminIdModal(true)}
                    className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all duration-200"
                  >
                    <UserIcon className="h-5 w-5 mr-2" />
                    Update Admin ID
                  </button>
                  <button 
                    onClick={fetchEmployeeRecords}
                    className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200"
                  >
                    <EyeIcon className="h-5 w-5 mr-2" />
                    View Employee Records
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Calendar Tab */}
        {activeTab === 'calendar' && (
          <div className="space-y-6">
            <AttendanceCalendar userId={user?._id} isAdmin={true} />
          </div>
        )}

        {/* Employee Records Tab */}
        {activeTab === 'records' && (
          <div className="space-y-6">
            <EmployeeRecordsView />
          </div>
        )}

        {/* Admin ID Modal */}
        {showAdminIdModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Set Admin ID
                </h3>
                <button
                  onClick={() => setShowAdminIdModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin ID
                </label>
                <input
                  type="text"
                  value={adminId}
                  onChange={(e) => setAdminId(e.target.value)}
                  placeholder="Enter your Admin ID"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowAdminIdModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (adminId) {
                      setShowAdminIdModal(false);
                      toast.success('Admin ID set successfully!');
                    } else {
                      toast.error('Please enter a valid Admin ID');
                    }
                  }}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleAdminCheckInOut;