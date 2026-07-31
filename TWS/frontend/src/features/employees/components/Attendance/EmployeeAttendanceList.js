import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  EyeIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  MapPinIcon,
  ExclamationTriangleIcon,
  UserIcon,
  CalendarIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

const EmployeeAttendanceList = ({ 
  employees, 
  attendanceData, 
  filters, 
  onFiltersChange, 
  onBulkAction 
}) => {
  const [selectedItems, setSelectedItems] = useState([]);
  const [showDetails, setShowDetails] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSelectAll = () => {
    if (selectedItems.length === attendanceData.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(attendanceData.map(item => item._id));
    }
  };

  const handleSelectItem = (id) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const handleBulkAction = async (action) => {
    if (selectedItems.length === 0) {
      toast.error('Please select items to perform bulk action');
      return;
    }

    if (window.confirm(`Are you sure you want to ${action} ${selectedItems.length} items?`)) {
      await onBulkAction(action, selectedItems);
      setSelectedItems([]);
    }
  };

  const handleViewDetails = async (attendanceId) => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/attendance/${attendanceId}`);
      setShowDetails(response.data.data);
    } catch (error) {
      console.error('Error fetching attendance details:', error);
      toast.error('Failed to fetch attendance details');
    } finally {
      setLoading(false);
    }
  };

  const handleEditAttendance = async (attendanceId) => {
    // This would open an edit modal
    toast.info('Edit functionality will be implemented');
  };

  const handleDeleteAttendance = async (attendanceId) => {
    if (window.confirm('Are you sure you want to delete this attendance record?')) {
      try {
        setLoading(true);
        const response = await axios.delete(`/api/attendance/${attendanceId}`);
        
        if (response.data.success) {
          toast.success('Attendance record deleted successfully');
          // Refresh data
          window.location.reload();
        }
      } catch (error) {
        console.error('Error deleting attendance:', error);
        toast.error('Failed to delete attendance record');
      } finally {
        setLoading(false);
      }
    }
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

  const getStatusIcon = (status) => {
    switch (status) {
      case 'present': return <CheckCircleIcon className="h-4 w-4 text-gray-600" />;
      case 'absent': return <XCircleIcon className="h-4 w-4 text-gray-600" />;
      case 'late': return <ClockIcon className="h-4 w-4 text-gray-600" />;
      case 'half-day': return <ClockIcon className="h-4 w-4 text-gray-600" />;
      case 'on-leave': return <CalendarIcon className="h-4 w-4 text-gray-600" />;
      default: return <ExclamationTriangleIcon className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Bulk Actions */}
      {selectedItems.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-sm font-medium text-blue-800">
                {selectedItems.length} item(s) selected
              </span>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handleBulkAction('approve')}
                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
              >
                <CheckCircleIcon className="h-4 w-4 mr-1" />
                Approve
              </button>
              <button
                onClick={() => handleBulkAction('reject')}
                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
              >
                <XCircleIcon className="h-4 w-4 mr-1" />
                Reject
              </button>
              <button
                onClick={() => handleBulkAction('export')}
                className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <DocumentTextIcon className="h-4 w-4 mr-1" />
                Export
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Employee Attendance Table */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Employee Attendance List</h3>
          <p className="text-sm text-gray-500 mt-1">
            Showing {attendanceData.length} attendance records for {filters.date}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedItems.length === attendanceData.length && attendanceData.length > 0}
                    onChange={handleSelectAll}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
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
                  Location
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
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(attendance._id)}
                      onChange={() => handleSelectItem(attendance._id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </td>
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
                    {attendance.employee?.department || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(attendance.status)}
                      <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(attendance.status)}`}>
                        {attendance.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {attendance.checkIn?.timestamp ? (
                      <div>
                        <div className="font-medium">
                          {new Date(attendance.checkIn.timestamp).toLocaleTimeString()}
                        </div>
                        <div className="text-gray-500 text-xs">
                          {attendance.checkIn.location?.address || 'Location not available'}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {attendance.checkOut?.timestamp ? (
                      <div>
                        <div className="font-medium">
                          {new Date(attendance.checkOut.timestamp).toLocaleTimeString()}
                        </div>
                        <div className="text-gray-500 text-xs">
                          {attendance.checkOut.location?.address || 'Location not available'}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {attendance.durationMinutes ? (
                      <div>
                        <div className="font-medium">
                          {Math.floor(attendance.durationMinutes / 60)}h {attendance.durationMinutes % 60}m
                        </div>
                        {attendance.overtimeMinutes > 0 && (
                          <div className="text-orange-600 text-xs">
                            +{Math.floor(attendance.overtimeMinutes / 60)}h OT
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {attendance.checkIn?.location ? (
                      <div className="flex items-center">
                        <MapPinIcon className="h-4 w-4 text-gray-400 mr-1" />
                        <span className="truncate max-w-32">
                          {attendance.checkIn.location.address}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewDetails(attendance._id)}
                        className="text-blue-600 hover:text-blue-900"
                        title="View Details"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEditAttendance(attendance._id)}
                        className="text-green-600 hover:text-green-900"
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
            <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No attendance records</h3>
            <p className="mt-1 text-sm text-gray-500">
              No attendance records found for the selected date and filters.
            </p>
          </div>
        )}
      </div>

      {/* Attendance Details Modal */}
      {showDetails && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Attendance Details</h3>
              <button
                onClick={() => setShowDetails(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Employee Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-md font-medium text-gray-900 mb-3">Employee Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Name:</span>
                    <span className="ml-2 text-sm text-gray-900">
                      {showDetails.employee?.firstName} {showDetails.employee?.lastName}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Employee ID:</span>
                    <span className="ml-2 text-sm text-gray-900">
                      {showDetails.employee?.employeeId}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Department:</span>
                    <span className="ml-2 text-sm text-gray-900">
                      {showDetails.employee?.department || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Position:</span>
                    <span className="ml-2 text-sm text-gray-900">
                      {showDetails.employee?.position || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Attendance Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Check In */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Check In Details</h4>
                  {showDetails.checkIn ? (
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-medium text-gray-500">Time:</span>
                        <span className="ml-2 text-sm text-gray-900">
                          {new Date(showDetails.checkIn.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Location:</span>
                        <span className="ml-2 text-sm text-gray-900">
                          {showDetails.checkIn.location?.address || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Device:</span>
                        <span className="ml-2 text-sm text-gray-900">
                          {showDetails.checkIn.device?.type || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Verified:</span>
                        <span className={`ml-2 text-sm ${showDetails.checkIn.verified ? 'text-green-600' : 'text-red-600'}`}>
                          {showDetails.checkIn.verified ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No check-in recorded</p>
                  )}
                </div>

                {/* Check Out */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Check Out Details</h4>
                  {showDetails.checkOut ? (
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-medium text-gray-500">Time:</span>
                        <span className="ml-2 text-sm text-gray-900">
                          {new Date(showDetails.checkOut.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Location:</span>
                        <span className="ml-2 text-sm text-gray-900">
                          {showDetails.checkOut.location?.address || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Device:</span>
                        <span className="ml-2 text-sm text-gray-900">
                          {showDetails.checkOut.device?.type || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Verified:</span>
                        <span className={`ml-2 text-sm ${showDetails.checkOut.verified ? 'text-green-600' : 'text-red-600'}`}>
                          {showDetails.checkOut.verified ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No check-out recorded</p>
                  )}
                </div>
              </div>

              {/* Additional Information */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="text-md font-medium text-gray-900 mb-3">Additional Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Status:</span>
                    <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(showDetails.status)}`}>
                      {showDetails.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Duration:</span>
                    <span className="ml-2 text-sm text-gray-900">
                      {showDetails.durationMinutes ? 
                        `${Math.floor(showDetails.durationMinutes / 60)}h ${showDetails.durationMinutes % 60}m` : 
                        'N/A'
                      }
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Overtime:</span>
                    <span className="ml-2 text-sm text-gray-900">
                      {showDetails.overtimeMinutes ? 
                        `${Math.floor(showDetails.overtimeMinutes / 60)}h ${showDetails.overtimeMinutes % 60}m` : 
                        'None'
                      }
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Quality Score:</span>
                    <span className="ml-2 text-sm text-gray-900">
                      {showDetails.qualityScore || 'N/A'}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
            <div className="tws-loading-pulse rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-gray-700">Loading...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeAttendanceList;
