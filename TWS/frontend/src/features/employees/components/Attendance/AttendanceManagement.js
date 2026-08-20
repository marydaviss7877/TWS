import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  UserIcon,
  CalendarIcon,
  MapPinIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

const AttendanceManagement = ({ attendanceData, employees, onDataUpdate }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAttendance, setSelectedAttendance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: '',
    date: new Date().toISOString().split('T')[0],
    checkInTime: '',
    checkOutTime: '',
    status: 'present',
    notes: '',
    location: '',
    overtimeHours: 0
  });

  const handleAddAttendance = async () => {
    try {
      setLoading(true);
      const response = await axios.post('/api/attendance/admin/manual-entry', formData);
      
      if (response.data.success) {
        toast.success('Attendance record added successfully');
        setShowAddModal(false);
        setFormData({
          employeeId: '',
          date: new Date().toISOString().split('T')[0],
          checkInTime: '',
          checkOutTime: '',
          status: 'present',
          notes: '',
          location: '',
          overtimeHours: 0
        });
        onDataUpdate();
      }
    } catch (error) {
      console.error('Error adding attendance:', error);
      toast.error(error.response?.data?.message || 'Failed to add attendance record');
    } finally {
      setLoading(false);
    }
  };

  const handleEditAttendance = async () => {
    try {
      setLoading(true);
      const response = await axios.put(`/api/attendance/${selectedAttendance._id}`, formData);
      
      if (response.data.success) {
        toast.success('Attendance record updated successfully');
        setShowEditModal(false);
        setSelectedAttendance(null);
        onDataUpdate();
      }
    } catch (error) {
      console.error('Error updating attendance:', error);
      toast.error(error.response?.data?.message || 'Failed to update attendance record');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAttendance = async (attendanceId) => {
    if (window.confirm('Are you sure you want to delete this attendance record?')) {
      try {
        setLoading(true);
        const response = await axios.delete(`/api/attendance/${attendanceId}`);
        
        if (response.data.success) {
          toast.success('Attendance record deleted successfully');
          onDataUpdate();
        }
      } catch (error) {
        console.error('Error deleting attendance:', error);
        toast.error('Failed to delete attendance record');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBulkStatusUpdate = async (status) => {
    const selectedItems = attendanceData.filter(item => item.status !== status);
    
    if (selectedItems.length === 0) {
      toast.info('No records need status update');
      return;
    }

    if (window.confirm(`Update ${selectedItems.length} records to ${status}?`)) {
      try {
        setLoading(true);
        const response = await axios.post('/api/attendance/admin/bulk-status-update', {
          attendanceIds: selectedItems.map(item => item._id),
          status: status
        });
        
        if (response.data.success) {
          toast.success(`Updated ${selectedItems.length} records to ${status}`);
          onDataUpdate();
        }
      } catch (error) {
        console.error('Error updating status:', error);
        toast.error('Failed to update attendance status');
      } finally {
        setLoading(false);
      }
    }
  };

  const openEditModal = (attendance) => {
    setSelectedAttendance(attendance);
    setFormData({
      employeeId: attendance.employee?._id || '',
      date: new Date(attendance.date).toISOString().split('T')[0],
      checkInTime: attendance.checkIn?.timestamp ? 
        new Date(attendance.checkIn.timestamp).toLocaleTimeString('en-GB', { hour12: false }) : '',
      checkOutTime: attendance.checkOut?.timestamp ? 
        new Date(attendance.checkOut.timestamp).toLocaleTimeString('en-GB', { hour12: false }) : '',
      status: attendance.status,
      notes: attendance.notes || '',
      location: attendance.checkIn?.location?.address || '',
      overtimeHours: attendance.overtimeMinutes ? Math.floor(attendance.overtimeMinutes / 60) : 0
    });
    setShowEditModal(true);
  };

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
    <div className="space-y-6">
      {/* Management Actions */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Attendance Management</h3>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Manual Entry
          </button>
        </div>

        {/* Bulk Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button
            onClick={() => handleBulkStatusUpdate('present')}
            className="flex items-center justify-center px-4 py-3 border border-green-300 rounded-md hover:bg-green-50 transition-colors"
          >
            <CheckCircleIcon className="h-5 w-5 mr-2 text-green-600" />
            Mark as Present
          </button>
          <button
            onClick={() => handleBulkStatusUpdate('absent')}
            className="flex items-center justify-center px-4 py-3 border border-red-300 rounded-md hover:bg-red-50 transition-colors"
          >
            <XCircleIcon className="h-5 w-5 mr-2 text-red-600" />
            Mark as Absent
          </button>
          <button
            onClick={() => handleBulkStatusUpdate('late')}
            className="flex items-center justify-center px-4 py-3 border border-yellow-300 rounded-md hover:bg-yellow-50 transition-colors"
          >
            <ClockIcon className="h-5 w-5 mr-2 text-yellow-600" />
            Mark as Late
          </button>
          <button
            onClick={() => handleBulkStatusUpdate('on-leave')}
            className="flex items-center justify-center px-4 py-3 border border-accent-300 rounded-md hover:bg-accent-50 transition-colors"
          >
            <CalendarIcon className="h-5 w-5 mr-2 text-accent-600" />
            Mark as On Leave
          </button>
        </div>
      </div>

      {/* Attendance Records */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Attendance Records</h3>
          <p className="text-sm text-gray-500 mt-1">
            Manage individual attendance records
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Check In
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Check Out
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {attendanceData.map((attendance) => (
                <tr key={attendance._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {attendance.employee?.firstName?.charAt(0)}{attendance.employee?.lastName?.charAt(0)}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {attendance.employee?.firstName} {attendance.employee?.lastName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {attendance.employee?.employeeId}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(attendance.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(attendance.status)}`}>
                      {attendance.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {attendance.checkIn?.timestamp ? 
                      new Date(attendance.checkIn.timestamp).toLocaleTimeString() : 
                      '-'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {attendance.checkOut?.timestamp ? 
                      new Date(attendance.checkOut.timestamp).toLocaleTimeString() : 
                      '-'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {attendance.durationMinutes ? 
                      `${Math.floor(attendance.durationMinutes / 60)}h ${attendance.durationMinutes % 60}m` : 
                      '-'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => openEditModal(attendance)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Edit"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteAttendance(attendance._id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {attendanceData.length === 0 && (
          <div className="text-center py-12">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No attendance records</h3>
            <p className="mt-1 text-sm text-gray-500">
              No attendance records found. Add manual entries or wait for employees to check in.
            </p>
          </div>
        )}
      </div>

      {/* Add Attendance Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Add Manual Attendance Entry</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                  <select
                    value={formData.employeeId}
                    onChange={(e) => setFormData(prev => ({ ...prev, employeeId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Employee</option>
                    {employees.map(employee => (
                      <option key={employee._id} value={employee._id}>
                        {employee.firstName} {employee.lastName} ({employee.employeeId})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Check In Time</label>
                  <input
                    type="time"
                    value={formData.checkInTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, checkInTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Check Out Time</label>
                  <input
                    type="time"
                    value={formData.checkOutTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, checkOutTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="late">Late</option>
                    <option value="half-day">Half Day</option>
                    <option value="on-leave">On Leave</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Overtime Hours</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={formData.overtimeHours}
                    onChange={(e) => setFormData(prev => ({ ...prev, overtimeHours: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Enter location"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Enter any additional notes"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddAttendance}
                disabled={loading || !formData.employeeId}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Adding...' : 'Add Entry'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Attendance Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Edit Attendance Entry</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                  <select
                    value={formData.employeeId}
                    onChange={(e) => setFormData(prev => ({ ...prev, employeeId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Employee</option>
                    {employees.map(employee => (
                      <option key={employee._id} value={employee._id}>
                        {employee.firstName} {employee.lastName} ({employee.employeeId})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Check In Time</label>
                  <input
                    type="time"
                    value={formData.checkInTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, checkInTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Check Out Time</label>
                  <input
                    type="time"
                    value={formData.checkOutTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, checkOutTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="late">Late</option>
                    <option value="half-day">Half Day</option>
                    <option value="on-leave">On Leave</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Overtime Hours</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={formData.overtimeHours}
                    onChange={(e) => setFormData(prev => ({ ...prev, overtimeHours: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Enter location"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Enter any additional notes"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleEditAttendance}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update Entry'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
            <div className="tws-loading-pulse rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-gray-700">Processing...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceManagement;
