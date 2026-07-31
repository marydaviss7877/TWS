import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  UserIcon,
  CalendarIcon,
  MapPinIcon,
  DocumentTextIcon,
  EyeIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

const AttendanceApproval = ({ pendingApprovals, onApprovalUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [filters, setFilters] = useState({
    type: '',
    status: 'pending',
    date: ''
  });

  const handleApprove = async (approvalId, type) => {
    try {
      setLoading(true);
      const response = await axios.post(`/api/attendance/admin/approve/${approvalId}`, {
        type: type,
        action: 'approve'
      });
      
      if (response.data.success) {
        toast.success(`${type} request approved successfully`);
        onApprovalUpdate();
      }
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error(error.response?.data?.message || 'Failed to approve request');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (approvalId, type, reason = '') => {
    const rejectionReason = reason || window.prompt('Please provide a reason for rejection:');
    
    if (!rejectionReason && reason === '') {
      toast.error('Rejection reason is required');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(`/api/attendance/admin/reject/${approvalId}`, {
        type: type,
        action: 'reject',
        reason: rejectionReason
      });
      
      if (response.data.success) {
        toast.success(`${type} request rejected`);
        onApprovalUpdate();
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error(error.response?.data?.message || 'Failed to reject request');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkApprove = async (approvalIds) => {
    if (approvalIds.length === 0) {
      toast.error('Please select approvals to approve');
      return;
    }

    if (window.confirm(`Approve ${approvalIds.length} requests?`)) {
      try {
        setLoading(true);
        const response = await axios.post('/api/attendance/admin/bulk-approve', {
          approvalIds: approvalIds,
          action: 'approve'
        });
        
        if (response.data.success) {
          toast.success(`${approvalIds.length} requests approved successfully`);
          onApprovalUpdate();
        }
      } catch (error) {
        console.error('Error bulk approving:', error);
        toast.error('Failed to approve requests');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBulkReject = async (approvalIds) => {
    if (approvalIds.length === 0) {
      toast.error('Please select approvals to reject');
      return;
    }

    const reason = window.prompt('Please provide a reason for rejection:');
    if (!reason) {
      toast.error('Rejection reason is required');
      return;
    }

    if (window.confirm(`Reject ${approvalIds.length} requests?`)) {
      try {
        setLoading(true);
        const response = await axios.post('/api/attendance/admin/bulk-reject', {
          approvalIds: approvalIds,
          action: 'reject',
          reason: reason
        });
        
        if (response.data.success) {
          toast.success(`${approvalIds.length} requests rejected`);
          onApprovalUpdate();
        }
      } catch (error) {
        console.error('Error bulk rejecting:', error);
        toast.error('Failed to reject requests');
      } finally {
        setLoading(false);
      }
    }
  };

  const getRequestTypeIcon = (type) => {
    switch (type) {
      case 'overtime': return <ClockIcon className="h-5 w-5 text-gray-600" />;
      case 'leave': return <CalendarIcon className="h-5 w-5 text-gray-600" />;
      case 'correction': return <DocumentTextIcon className="h-5 w-5 text-gray-600" />;
      case 'break': return <ClockIcon className="h-5 w-5 text-gray-600" />;
      default: return <ExclamationTriangleIcon className="h-5 w-5 text-gray-600" />;
    }
  };

  const getRequestTypeColor = (type) => {
    switch (type) {
      case 'overtime': return 'text-gray-800 bg-gray-200';
      case 'leave': return 'text-gray-800 bg-gray-150';
      case 'correction': return 'text-gray-800 bg-gray-300';
      case 'break': return 'text-gray-800 bg-gray-100';
      default: return 'text-gray-800 bg-gray-100';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-gray-800 bg-gray-300';
      case 'medium': return 'text-gray-800 bg-gray-200';
      case 'low': return 'text-gray-800 bg-gray-100';
      default: return 'text-gray-800 bg-gray-100';
    }
  };

  const filteredApprovals = pendingApprovals.filter(approval => {
    if (filters.type && approval.type !== filters.type) return false;
    if (filters.status && approval.status !== filters.status) return false;
    if (filters.date && new Date(approval.createdAt).toDateString() !== new Date(filters.date).toDateString()) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Request Type</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="overtime">Overtime</option>
              <option value="leave">Leave</option>
              <option value="correction">Correction</option>
              <option value="break">Break</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={filters.date}
              onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setFilters({ type: '', status: 'pending', date: '' })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {filteredApprovals.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-sm font-medium text-blue-800">
                {filteredApprovals.length} request(s) found
              </span>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handleBulkApprove(filteredApprovals.map(a => a._id))}
                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
              >
                <CheckCircleIcon className="h-4 w-4 mr-1" />
                Approve All
              </button>
              <button
                onClick={() => handleBulkReject(filteredApprovals.map(a => a._id))}
                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
              >
                <XCircleIcon className="h-4 w-4 mr-1" />
                Reject All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approval Requests */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Pending Approval Requests</h3>
          <p className="text-sm text-gray-500 mt-1">
            Review and approve employee attendance requests
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
                  Request Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
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
              {filteredApprovals.map((approval) => (
                <tr key={approval._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {approval.employee?.firstName?.charAt(0)}{approval.employee?.lastName?.charAt(0)}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {approval.employee?.firstName} {approval.employee?.lastName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {approval.employee?.employeeId}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getRequestTypeIcon(approval.type)}
                      <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRequestTypeColor(approval.type)}`}>
                        {approval.type}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(approval.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="max-w-xs truncate">
                      {approval.details || approval.reason || 'No details provided'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(approval.priority)}`}>
                      {approval.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      approval.status === 'pending' ? 'text-yellow-600 bg-yellow-100' :
                      approval.status === 'approved' ? 'text-green-600 bg-green-100' :
                      'text-red-600 bg-red-100'
                    }`}>
                      {approval.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setSelectedApproval(approval);
                          setShowDetails(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                        title="View Details"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      {approval.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(approval._id, approval.type)}
                            className="text-green-600 hover:text-green-900"
                            title="Approve"
                          >
                            <CheckCircleIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleReject(approval._id, approval.type)}
                            className="text-red-600 hover:text-red-900"
                            title="Reject"
                          >
                            <XCircleIcon className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredApprovals.length === 0 && (
          <div className="text-center py-12">
            <CheckCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No approval requests</h3>
            <p className="mt-1 text-sm text-gray-500">
              No pending approval requests found for the selected filters.
            </p>
          </div>
        )}
      </div>

      {/* Approval Details Modal */}
      {showDetails && selectedApproval && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Approval Request Details</h3>
              <button
                onClick={() => setShowDetails(false)}
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
                      {selectedApproval.employee?.firstName} {selectedApproval.employee?.lastName}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Employee ID:</span>
                    <span className="ml-2 text-sm text-gray-900">
                      {selectedApproval.employee?.employeeId}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Department:</span>
                    <span className="ml-2 text-sm text-gray-900">
                      {selectedApproval.employee?.department || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Position:</span>
                    <span className="ml-2 text-sm text-gray-900">
                      {selectedApproval.employee?.position || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Request Details */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="text-md font-medium text-gray-900 mb-3">Request Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Type:</span>
                    <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRequestTypeColor(selectedApproval.type)}`}>
                      {selectedApproval.type}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Date:</span>
                    <span className="ml-2 text-sm text-gray-900">
                      {new Date(selectedApproval.date).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Priority:</span>
                    <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(selectedApproval.priority)}`}>
                      {selectedApproval.priority}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Status:</span>
                    <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      selectedApproval.status === 'pending' ? 'text-yellow-600 bg-yellow-100' :
                      selectedApproval.status === 'approved' ? 'text-green-600 bg-green-100' :
                      'text-red-600 bg-red-100'
                    }`}>
                      {selectedApproval.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Request Content */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="text-md font-medium text-gray-900 mb-3">Request Content</h4>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Reason:</span>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedApproval.reason || 'No reason provided'}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Details:</span>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedApproval.details || 'No additional details'}
                    </p>
                  </div>
                  {selectedApproval.attachments && selectedApproval.attachments.length > 0 && (
                    <div>
                      <span className="text-sm font-medium text-gray-500">Attachments:</span>
                      <div className="mt-1 space-y-1">
                        {selectedApproval.attachments.map((attachment, index) => (
                          <div key={index} className="text-sm text-blue-600 hover:text-blue-800">
                            <DocumentTextIcon className="h-4 w-4 inline mr-1" />
                            {attachment.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              {selectedApproval.status === 'pending' && (
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => handleReject(selectedApproval._id, selectedApproval.type)}
                    className="px-4 py-2 border border-red-300 rounded-md text-red-700 hover:bg-red-50"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleApprove(selectedApproval._id, selectedApproval.type)}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Approve
                  </button>
                </div>
              )}
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

export default AttendanceApproval;
