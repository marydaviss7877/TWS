import React, { useState, useEffect } from 'react';
import { useTenantAuth } from '../../../../../../../app/providers/TenantAuthContext';
import toast from 'react-hot-toast';
import {
  CalendarIcon,
  PlusIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { tenantApiService } from '../../../../../../../shared/services/tenant/tenant-api.service';

const EmployeeLeaveRequests = ({ tenantSlug }) => {
  const { user } = useTenantAuth();
  const [loading, setLoading] = useState(true);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState({
    annual: 0,
    sick: 0,
    personal: 0
  });
  const [policyBalance, setPolicyBalance] = useState({
    annual: 0,
    sick: 0,
    personal: 0
  });
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [formData, setFormData] = useState({
    type: 'annual',
    startDate: '',
    endDate: '',
    reason: '',
    days: 0
  });
  const currentUserId = user?._id || user?.id;

  useEffect(() => {
    if (!tenantSlug || !currentUserId) return;
    fetchLeaveData();
  }, [tenantSlug, currentUserId]);

  const fetchLeaveData = async () => {
    try {
      if (!tenantSlug || !currentUserId) return;
      setLoading(true);
      
      // Fetch employee data to get leave balance
      const empResponse = await fetch(`/api/tenant/${tenantSlug}/organization/hr/employees?userId=${currentUserId}`, {
        credentials: 'include' // SECURITY FIX: Use cookies instead of localStorage token
      });

      if (empResponse.ok) {
        const empData = await empResponse.json();
        if (empData.data?.employees?.length > 0) {
          const employee = empData.data.employees[0];
          setLeaveBalance(employee.leaveBalance || {
            annual: 0,
            sick: 0,
            personal: 0
          });
        }
      }

      // Fetch org leave policy (source of entitlement configuration)
      const policyData = await tenantApiService.getLeavePolicy(tenantSlug);
      if (policyData?.policy) {
        setPolicyBalance({
          annual: Number(policyData.policy?.annual?.daysPerYear ?? 0),
          sick: Number(policyData.policy?.sick?.daysPerYear ?? 0),
          personal: Number(policyData.policy?.personal?.daysPerYear ?? 0)
        });
      }

      // Fetch leave requests
      const requestsResponse = await fetch(`/api/tenant/${tenantSlug}/organization/hr/leave-requests`, {
        credentials: 'include' // SECURITY FIX: Use cookies instead of localStorage token
      });

      if (requestsResponse.ok) {
        const requestsData = await requestsResponse.json();
        setLeaveRequests(requestsData.data?.leaveRequests || []);
      } else {
        const errData = await requestsResponse.json().catch(() => ({}));
        toast.error(errData.message || 'Failed to load leave requests');
      }
    } catch (error) {
      console.error('Failed to fetch leave data:', error);
      toast.error('Failed to load leave information');
    } finally {
      setLoading(false);
    }
  };

  const calculateDays = (startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const handleDateChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'startDate' || field === 'endDate') {
        updated.days = calculateDays(updated.startDate, updated.endDate);
      }
      return updated;
    });
  };

  const handleSubmitRequest = async () => {
    try {
      if (!formData.startDate || !formData.endDate || !formData.reason) {
        toast.error('Please fill in all required fields');
        return;
      }

      const days = calculateDays(formData.startDate, formData.endDate);
      const availableBalance = leaveBalance[formData.type] || 0;

      if (days > availableBalance) {
        toast.error(`Insufficient leave balance. Available: ${availableBalance} days`);
        return;
      }

      const response = await fetch(`/api/tenant/${tenantSlug}/organization/hr/leave-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // SECURITY FIX: Use cookies instead of localStorage token
        body: JSON.stringify({
          type: formData.type,
          startDate: formData.startDate,
          endDate: formData.endDate,
          reason: formData.reason
        })
      });

      if (response.ok) {
        toast.success('Leave request submitted successfully');
        setShowRequestModal(false);
        setFormData({
          type: 'annual',
          startDate: '',
          endDate: '',
          reason: '',
          days: 0
        });
        fetchLeaveData();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to submit leave request');
      }
    } catch (error) {
      console.error('Failed to submit leave request:', error);
      toast.error('Failed to submit leave request');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'yellow', icon: ClockIcon, text: 'Pending' },
      approved: { color: 'green', icon: CheckCircleIcon, text: 'Approved' },
      rejected: { color: 'red', icon: XCircleIcon, text: 'Rejected' },
      cancelled: { color: 'gray', icon: XCircleIcon, text: 'Cancelled' }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-${config.color}-100 text-${config.color}-800`}>
        <Icon className="h-3 w-3" />
        <span>{config.text}</span>
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Leave Requests</h2>
          <button
            onClick={() => setShowRequestModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Request Leave</span>
          </button>
        </div>
      </div>

      {/* Leave Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500">Annual Leave</h3>
            <CalendarIcon className="h-6 w-6 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{leaveBalance.annual}</p>
          <p className="text-sm text-gray-500 mt-1">days remaining · policy: {policyBalance.annual}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500">Sick Leave</h3>
            <CalendarIcon className="h-6 w-6 text-red-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{leaveBalance.sick}</p>
          <p className="text-sm text-gray-500 mt-1">days remaining · policy: {policyBalance.sick}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500">Personal Leave</h3>
            <CalendarIcon className="h-6 w-6 text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{leaveBalance.personal}</p>
          <p className="text-sm text-gray-500 mt-1">days remaining · policy: {policyBalance.personal}</p>
        </div>
      </div>

      {/* Leave Requests Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">My Leave Requests</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">End Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {leaveRequests.length > 0 ? (
                leaveRequests.map((request, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                      {request.type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(request.startDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(request.endDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {request.days} days
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(request.status)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {request.reason || '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    No leave requests found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Request Leave</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Leave Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="annual">Annual Leave</option>
                  <option value="sick">Sick Leave</option>
                  <option value="personal">Personal Leave</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleDateChange('startDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleDateChange('endDate', e.target.value)}
                  min={formData.startDate}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {formData.days > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <strong>{formData.days}</strong> days requested
                    {formData.type && (
                      <span className="ml-2">
                        (Available: {leaveBalance[formData.type]} days)
                      </span>
                    )}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="Please provide a reason for your leave request"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowRequestModal(false);
                  setFormData({
                    type: 'annual',
                    startDate: '',
                    endDate: '',
                    reason: '',
                    days: 0
                  });
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitRequest}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeLeaveRequests;
