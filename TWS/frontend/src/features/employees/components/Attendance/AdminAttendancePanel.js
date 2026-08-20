import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../app/providers/AuthContext';
import { useSocket } from '../../../../app/providers/SocketContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  ClockIcon,
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
  BuildingOfficeIcon,
  HomeIcon,
  WifiIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarIcon,
  ChartBarIcon,
  BellIcon,
  ShieldCheckIcon,
  PlusIcon,
  FilterIcon,
  ArrowDownTrayIcon,
  PrinterIcon
} from '@heroicons/react/24/outline';

const AdminAttendancePanel = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [loading, setLoading] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [realTimeUpdates, setRealTimeUpdates] = useState([]);
  const [filters, setFilters] = useState({
    date: new Date().toISOString().split('T')[0],
    status: '',
    workMode: '',
    department: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    lateArrivals: 0,
    remoteWorkers: 0,
    officeWorkers: 0,
    hybridWorkers: 0
  });

  useEffect(() => {
    fetchAttendanceData();
    fetchStats();
    setupSocketListeners();
  }, [filters]);

  useEffect(() => {
    if (socket) {
      // Join admin monitoring room
      socket.emit('joinAttendanceMonitoring', { userId: user?._id });
      
      return () => {
        socket.off('adminAttendanceUpdate');
        socket.off('teamActivityUpdate');
      };
    }
  }, [socket, user]);

  const setupSocketListeners = () => {
    if (socket) {
      // Listen for real-time attendance updates
      socket.on('adminAttendanceUpdate', (data) => {
        console.log('Admin attendance update received:', data);
        setRealTimeUpdates(prev => [data, ...prev.slice(0, 9)]); // Keep last 10 updates
        
        // Show toast notification
        toast.success(data.message, {
          duration: 4000,
          position: 'top-right'
        });
        
        // Refresh data
        fetchAttendanceData();
        fetchStats();
      });

      // Listen for team activity updates
      socket.on('teamActivityUpdate', (data) => {
        console.log('Team activity update received:', data);
        // Update real-time activity feed
        setRealTimeUpdates(prev => [data, ...prev.slice(0, 9)]);
      });
    }
  };

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/attendance/admin/records', {
        params: filters
      });
      
      if (response.data.success) {
        setAttendanceRecords(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch attendance data:', error);
      toast.error('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/attendance/admin/stats', {
        params: { date: filters.date }
      });
      
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleApproveAttendance = async (recordId) => {
    try {
      const response = await axios.post(`/api/attendance/admin/approve/${recordId}`);
      
      if (response.data.success) {
        toast.success('Attendance approved successfully');
        fetchAttendanceData();
        
        // Notify employee via socket
        if (socket) {
          socket.emit('adminAttendanceAction', {
            userId: attendanceRecords.find(r => r._id === recordId)?.userId,
            action: 'approved',
            attendanceId: recordId,
            message: 'Your attendance has been approved'
          });
        }
      }
    } catch (error) {
      toast.error('Failed to approve attendance');
    }
  };

  const handleRejectAttendance = async (recordId) => {
    try {
      const response = await axios.post(`/api/attendance/admin/reject/${recordId}`);
      
      if (response.data.success) {
        toast.success('Attendance rejected');
        fetchAttendanceData();
        
        // Notify employee via socket
        if (socket) {
          socket.emit('adminAttendanceAction', {
            userId: attendanceRecords.find(r => r._id === recordId)?.userId,
            action: 'rejected',
            attendanceId: recordId,
            message: 'Your attendance has been rejected. Please contact HR.'
          });
        }
      }
    } catch (error) {
      toast.error('Failed to reject attendance');
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedRecords.length === 0) {
      toast.error('Please select records to perform bulk action');
      return;
    }

    try {
      const response = await axios.post('/api/attendance/admin/bulk-action', {
        recordIds: selectedRecords,
        action
      });
      
      if (response.data.success) {
        toast.success(`Bulk ${action} completed successfully`);
        setSelectedRecords([]);
        fetchAttendanceData();
      }
    } catch (error) {
      toast.error(`Failed to perform bulk ${action}`);
    }
  };

  const exportAttendanceData = async () => {
    try {
      const response = await axios.get('/api/attendance/admin/export', {
        params: filters,
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance-${filters.date}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Attendance data exported successfully');
    } catch (error) {
      toast.error('Failed to export attendance data');
    }
  };

  const getWorkModeIcon = (mode) => {
    switch (mode) {
      case 'office': return BuildingOfficeIcon;
      case 'remote': return HomeIcon;
      case 'hybrid': return WifiIcon;
      default: return BuildingOfficeIcon;
    }
  };

  const getWorkModeColor = (mode) => {
    switch (mode) {
      case 'office': return 'bg-blue-100 text-blue-800';
      case 'remote': return 'bg-green-100 text-green-800';
      case 'hybrid': return 'bg-accent-100 text-accent-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800';
      case 'absent': return 'bg-red-100 text-red-800';
      case 'late': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredRecords = attendanceRecords.filter(record => {
    const matchesSearch = record.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.employeeId?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !filters.status || record.status === filters.status;
    const matchesWorkMode = !filters.workMode || record.workMode === filters.workMode;
    const matchesDepartment = !filters.department || record.department === filters.department;
    
    return matchesSearch && matchesStatus && matchesWorkMode && matchesDepartment;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Attendance Panel</h1>
            <p className="mt-1 text-sm text-gray-500">
              Real-time employee attendance monitoring and management
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={exportAttendanceData}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              Export
            </button>
            <button
              onClick={fetchAttendanceData}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              <ArrowPathIcon className="h-4 w-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UserGroupIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Total Employees</div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalEmployees}</div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Present Today</div>
              <div className="text-2xl font-bold text-gray-900">{stats.presentToday}</div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <XCircleIcon className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Absent Today</div>
              <div className="text-2xl font-bold text-gray-900">{stats.absentToday}</div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Late Arrivals</div>
              <div className="text-2xl font-bold text-gray-900">{stats.lateArrivals}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Updates */}
      {realTimeUpdates.length > 0 && (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <BellIcon className="h-5 w-5 mr-2 text-blue-600" />
            Real-time Updates
          </h3>
          <div className="space-y-2">
            {realTimeUpdates.slice(0, 5).map((update, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-3 ${
                    update.type === 'checkIn' ? 'bg-green-500' : 
                    update.type === 'checkOut' ? 'bg-red-500' : 'bg-blue-500'
                  }`} />
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {update.message}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(update.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {update.employeeId}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
            <input
              type="date"
              value={filters.date}
              onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Status</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="late">Late</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Work Mode</label>
            <select
              value={filters.workMode}
              onChange={(e) => setFilters(prev => ({ ...prev, workMode: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Modes</option>
              <option value="office">Office</option>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
            <select
              value={filters.department}
              onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Departments</option>
              <option value="development">Development</option>
              <option value="design">Design</option>
              <option value="marketing">Marketing</option>
              <option value="hr">Human Resources</option>
              <option value="finance">Finance</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedRecords.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-sm font-medium text-blue-800">
                {selectedRecords.length} record(s) selected
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleBulkAction('approve')}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
              >
                <CheckCircleIcon className="h-4 w-4 mr-1" />
                Approve All
              </button>
              <button
                onClick={() => handleBulkAction('reject')}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
              >
                <XCircleIcon className="h-4 w-4 mr-1" />
                Reject All
              </button>
              <button
                onClick={() => setSelectedRecords([])}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Records Table */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Attendance Records</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedRecords.length === filteredRecords.length && filteredRecords.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedRecords(filteredRecords.map(r => r._id));
                      } else {
                        setSelectedRecords([]);
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Check In
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Check Out
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Work Mode
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center">
                    <div className="tws-loading-pulse rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                    No attendance records found
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => {
                  const WorkModeIcon = getWorkModeIcon(record.workMode);
                  return (
                    <tr key={record._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedRecords.includes(record._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRecords(prev => [...prev, record._id]);
                            } else {
                              setSelectedRecords(prev => prev.filter(id => id !== record._id));
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-accent-600 flex items-center justify-center text-white font-bold">
                              {record.employeeName?.charAt(0) || 'E'}
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {record.employeeName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {record.employeeId}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.checkIn?.timestamp 
                          ? new Date(record.checkIn.timestamp).toLocaleTimeString()
                          : 'Not checked in'
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.checkOut?.timestamp 
                          ? new Date(record.checkOut.timestamp).toLocaleTimeString()
                          : 'Not checked out'
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <WorkModeIcon className="h-4 w-4 mr-2 text-gray-400" />
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getWorkModeColor(record.workMode)}`}>
                            {record.workMode}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                          {record.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleApproveAttendance(record._id)}
                            className="text-green-600 hover:text-green-900"
                            title="Approve"
                          >
                            <CheckCircleIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleRejectAttendance(record._id)}
                            className="text-red-600 hover:text-red-900"
                            title="Reject"
                          >
                            <XCircleIcon className="h-4 w-4" />
                          </button>
                          <button
                            className="text-blue-600 hover:text-blue-900"
                            title="View Details"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminAttendancePanel;
