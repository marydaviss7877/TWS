import React, { useState, useEffect } from 'react';
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
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline';
import EmployeeAttendanceList from './EmployeeAttendanceList';
import AttendanceManagement from './AttendanceManagement';
import AttendanceApproval from './AttendanceApproval';

const AdminAttendanceDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    lateToday: 0,
    pendingApprovals: 0,
    totalHours: 0,
    overtimeHours: 0
  });
  const [filters, setFilters] = useState({
    date: new Date().toISOString().split('T')[0],
    department: '',
    status: '',
    search: ''
  });
  const [employees, setEmployees] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, [filters]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchStats(),
        fetchEmployees(),
        fetchAttendanceData(),
        fetchPendingApprovals()
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`/api/attendance/admin/stats?date=${filters.date}`);
      setStats(response.data.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.department) params.append('department', filters.department);
      if (filters.search) params.append('search', filters.search);
      
      const response = await axios.get(`/api/employees?${params.toString()}`);
      setEmployees(response.data.data.employees || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchAttendanceData = async () => {
    try {
      const params = new URLSearchParams();
      params.append('date', filters.date);
      if (filters.department) params.append('department', filters.department);
      if (filters.status) params.append('status', filters.status);
      
      const response = await axios.get(`/api/attendance/admin/overview?${params.toString()}`);
      setAttendanceData(response.data.data.attendance || []);
    } catch (error) {
      console.error('Error fetching attendance data:', error);
    }
  };

  const fetchPendingApprovals = async () => {
    try {
      const response = await axios.get('/api/attendance/admin/pending-approvals');
      setPendingApprovals(response.data.data.approvals || []);
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
    }
  };

  const handleBulkAction = async (action, selectedIds) => {
    try {
      setLoading(true);
      const response = await axios.post('/api/attendance/admin/bulk-action', {
        action,
        attendanceIds: selectedIds
      });
      
      if (response.data.success) {
        toast.success(`Bulk ${action} completed successfully`);
        fetchDashboardData();
      }
    } catch (error) {
      console.error('Error performing bulk action:', error);
      toast.error(`Failed to perform bulk ${action}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async (format = 'csv') => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('format', format);
      params.append('date', filters.date);
      if (filters.department) params.append('department', filters.department);
      
      const response = await axios.get(`/api/attendance/admin/export?${params.toString()}`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance-report-${filters.date}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success(`Attendance data exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export attendance data');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', name: 'Overview', icon: ChartBarIcon },
    { id: 'employees', name: 'Employees', icon: UsersIcon },
    { id: 'management', name: 'Management', icon: PencilIcon },
    { id: 'approvals', name: 'Approvals', icon: CheckCircleIcon }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'present': return 'text-gray-800 bg-gray-100';
      case 'absent': return 'text-gray-800 bg-gray-200';
      case 'late': return 'text-gray-800 bg-gray-300';
      case 'half-day': return 'text-gray-800 bg-gray-150';
      case 'on-leave': return 'text-gray-800 bg-gray-250';
      default: return 'text-gray-800 bg-gray-100';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Attendance Management</h1>
              <p className="text-sm text-gray-600 mt-1">
                Monitor and manage employee attendance
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleExportData('csv')}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
              >
                Export CSV
              </button>
              <button
                onClick={fetchDashboardData}
                className="px-3 py-1.5 text-sm bg-gray-900 text-white rounded hover:bg-gray-800"
              >
                <ArrowPathIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <input
              type="date"
              value={filters.date}
              onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
          </div>
          <div>
            <select
              value={filters.department}
              onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value }))}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
            >
              <option value="">All Departments</option>
              <option value="engineering">Engineering</option>
              <option value="marketing">Marketing</option>
              <option value="sales">Sales</option>
              <option value="hr">Human Resources</option>
              <option value="finance">Finance</option>
            </select>
          </div>
          <div>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
            >
              <option value="">All Status</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="late">Late</option>
              <option value="half-day">Half Day</option>
              <option value="on-leave">On Leave</option>
            </select>
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Search employee..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full px-3 py-1.5 pl-8 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
            <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 absolute left-2.5 top-2" />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="grid grid-cols-7 gap-6">
          <div className="text-center">
            <div className="text-2xl font-semibold text-gray-900">{stats.totalEmployees}</div>
            <div className="text-xs text-gray-600">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-semibold text-gray-900">{stats.presentToday}</div>
            <div className="text-xs text-gray-600">Present</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-semibold text-gray-900">{stats.absentToday}</div>
            <div className="text-xs text-gray-600">Absent</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-semibold text-gray-900">{stats.lateToday}</div>
            <div className="text-xs text-gray-600">Late</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-semibold text-gray-900">{stats.pendingApprovals}</div>
            <div className="text-xs text-gray-600">Pending</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-semibold text-gray-900">{stats.totalHours}h</div>
            <div className="text-xs text-gray-600">Hours</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-semibold text-gray-900">{stats.overtimeHours}h</div>
            <div className="text-xs text-gray-600">Overtime</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="bg-white">
        {activeTab === 'overview' && (
          <div className="p-6">
            {/* Quick Actions */}
            <div className="mb-6">
              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={() => setActiveTab('employees')}
                  className="p-4 text-left border border-gray-200 rounded hover:bg-gray-50"
                >
                  <UsersIcon className="h-5 w-5 text-gray-600 mb-2" />
                  <div className="text-sm font-medium text-gray-900">View All Employees</div>
                  <div className="text-xs text-gray-600">Browse employee attendance records</div>
                </button>
                <button
                  onClick={() => setActiveTab('approvals')}
                  className="p-4 text-left border border-gray-200 rounded hover:bg-gray-50"
                >
                  <CheckCircleIcon className="h-5 w-5 text-gray-600 mb-2" />
                  <div className="text-sm font-medium text-gray-900">Pending Approvals</div>
                  <div className="text-xs text-gray-600">Review and approve requests</div>
                </button>
                <button
                  onClick={() => setActiveTab('management')}
                  className="p-4 text-left border border-gray-200 rounded hover:bg-gray-50"
                >
                  <PencilIcon className="h-5 w-5 text-gray-600 mb-2" />
                  <div className="text-sm font-medium text-gray-900">Manage Records</div>
                  <div className="text-xs text-gray-600">Add, edit, or delete records</div>
                </button>
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Recent Activity</h3>
              <div className="border border-gray-200 rounded">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Check In</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Check Out</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Hours</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {attendanceData.slice(0, 10).map((attendance) => (
                        <tr key={attendance._id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {attendance.employee?.firstName} {attendance.employee?.lastName}
                            </div>
                            <div className="text-xs text-gray-500">
                              {attendance.employee?.employeeId}
                            </div>
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${getStatusColor(attendance.status)}`}>
                              {attendance.status}
                            </span>
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                            {attendance.checkIn?.timestamp ? 
                              new Date(attendance.checkIn.timestamp).toLocaleTimeString() : 
                              '-'
                            }
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                            {attendance.checkOut?.timestamp ? 
                              new Date(attendance.checkOut.timestamp).toLocaleTimeString() : 
                              '-'
                            }
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                            {attendance.durationMinutes ? 
                              `${Math.floor(attendance.durationMinutes / 60)}h ${attendance.durationMinutes % 60}m` : 
                              '-'
                            }
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm">
                            <button className="text-gray-600 hover:text-gray-900 mr-2">
                              <EyeIcon className="h-4 w-4" />
                            </button>
                            <button className="text-gray-600 hover:text-gray-900">
                              <PencilIcon className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'employees' && (
          <div className="p-6">
            <EmployeeAttendanceList 
              employees={employees}
              attendanceData={attendanceData}
              filters={filters}
              onFiltersChange={setFilters}
              onBulkAction={handleBulkAction}
            />
          </div>
        )}

        {activeTab === 'management' && (
          <div className="p-6">
            <AttendanceManagement 
              attendanceData={attendanceData}
              employees={employees}
              onDataUpdate={fetchDashboardData}
            />
          </div>
        )}

        {activeTab === 'approvals' && (
          <div className="p-6">
            <AttendanceApproval 
              pendingApprovals={pendingApprovals}
              onApprovalUpdate={fetchPendingApprovals}
            />
          </div>
        )}
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded p-4 flex items-center space-x-3">
            <div className="tws-loading-pulse rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
            <span className="text-gray-700 text-sm">Loading...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAttendanceDashboard;
