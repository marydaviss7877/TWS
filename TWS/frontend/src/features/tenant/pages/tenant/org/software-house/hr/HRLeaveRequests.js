import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  ClockIcon, 
  CheckCircleIcon,
  XCircleIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { tenantApiService } from '../../../../../../../shared/services/tenant/tenant-api.service';

const HRLeaveRequests = () => {
  const { tenantSlug } = useParams();
  const [loading, setLoading] = useState(true);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    totalDays: 0
  });

  useEffect(() => {
    fetchLeaveRequests();
  }, [tenantSlug]);

  const fetchLeaveRequests = async () => {
    try {
      setLoading(true);
      // TODO: Add leave requests API to tenantApiService
      // const data = await tenantApiService.getLeaveRequests(tenantSlug);
      // Mock data for now
      const mockData = {
        requests: [
          { id: 1, employee: 'Sarah Johnson', type: 'Vacation', startDate: '2024-01-15', endDate: '2024-01-20', days: 5, status: 'Pending', reason: 'Family vacation' },
          { id: 2, employee: 'Michael Chen', type: 'Sick Leave', startDate: '2024-01-10', endDate: '2024-01-12', days: 2, status: 'Pending', reason: 'Medical appointment' },
          { id: 3, employee: 'Emily Davis', type: 'Personal', startDate: '2024-01-18', endDate: '2024-01-19', days: 1, status: 'Pending', reason: 'Personal matters' }
        ],
        stats: { pending: 12, approved: 28, rejected: 3, totalDays: 145 }
      };
      setLeaveRequests(mockData.requests);
      setStats(mockData.stats);
    } catch (err) {
      console.error('Error fetching leave requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId) => {
    try {
      // TODO: Add approve API call
      // await tenantApiService.approveLeaveRequest(tenantSlug, requestId);
      setLeaveRequests(prev => prev.filter(req => req.id !== requestId));
      setStats(prev => ({ ...prev, pending: prev.pending - 1, approved: prev.approved + 1 }));
    } catch (err) {
      console.error('Error approving leave request:', err);
    }
  };

  const handleReject = async (requestId) => {
    try {
      // TODO: Add reject API call
      // await tenantApiService.rejectLeaveRequest(tenantSlug, requestId);
      setLeaveRequests(prev => prev.filter(req => req.id !== requestId));
      setStats(prev => ({ ...prev, pending: prev.pending - 1, rejected: prev.rejected + 1 }));
    } catch (err) {
      console.error('Error rejecting leave request:', err);
    }
  };

  const statsData = [
    { label: 'Pending Requests', value: stats.pending.toString(), icon: ClockIcon, iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600' },
    { label: 'Approved This Month', value: stats.approved.toString(), icon: CheckCircleIcon, iconBg: 'bg-gradient-to-br from-green-500 to-emerald-600' },
    { label: 'Rejected', value: stats.rejected.toString(), icon: XCircleIcon, iconBg: 'bg-gradient-to-br from-red-500 to-pink-600' },
    { label: 'Total Days Off', value: stats.totalDays.toString(), icon: CalendarIcon, iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-600' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading leave requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl xl:text-3xl font-bold font-heading text-gray-900 dark:text-white">
            Leave Requests
          </h1>
          <p className="text-sm xl:text-base text-gray-600 dark:text-gray-300 mt-1">
            Review and manage employee leave requests
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 xl:gap-6">
        {statsData.map((stat, index) => (
          <div key={index} className="glass-card-premium p-5 xl:p-6 hover-lift">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 xl:w-14 xl:h-14 rounded-2xl ${stat.iconBg} flex items-center justify-center shadow-glow-lg`}>
                <stat.icon className="w-6 h-6 xl:w-7 xl:h-7 text-white" />
              </div>
              <div>
                <p className="text-xs xl:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {stat.label}
                </p>
                <p className="text-2xl xl:text-3xl font-bold font-heading text-gray-900 dark:text-white">
                  {stat.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Leave Requests Table */}
      <div className="glass-card-premium p-6 xl:p-8 hover-glow">
        <h3 className="text-lg xl:text-xl font-bold font-heading text-gray-900 dark:text-white mb-6">
          Pending Leave Requests
        </h3>
        <div className="space-y-4">
          {leaveRequests.length === 0 ? (
            <div className="text-center py-12">
              <CalendarIcon className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">No pending leave requests</p>
            </div>
          ) : (
            leaveRequests.map((request) => (
              <div key={request.id} className="glass-card p-4 hover-lift">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-glow">
                        <span className="text-white font-bold text-sm">{(request.employee?.fullName || request.employee?.name || request.employee?.email || request.employee || '?').toString().charAt(0)}</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{request.employee?.fullName || request.employee?.name || request.employee?.email || request.employee || 'Unknown'}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{request.type}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Start Date</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{request.startDate}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">End Date</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{request.endDate}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Duration</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{request.days} days</p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <p className="text-xs text-gray-600 dark:text-gray-400">Reason</p>
                      <p className="text-sm text-gray-900 dark:text-white">{request.reason}</p>
                    </div>
                  </div>
                  <div className="flex lg:flex-col gap-2">
                    <button
                      onClick={() => handleApprove(request.id)}
                      className="flex-1 lg:flex-none glass-button px-4 py-2 rounded-xl hover-scale bg-gradient-to-r from-green-500 to-emerald-600 text-white flex items-center justify-center gap-2"
                    >
                      <CheckCircleIcon className="w-5 h-5" />
                      <span className="font-medium">Approve</span>
                    </button>
                    <button
                      onClick={() => handleReject(request.id)}
                      className="flex-1 lg:flex-none glass-button px-4 py-2 rounded-xl hover-scale bg-gradient-to-r from-red-500 to-pink-600 text-white flex items-center justify-center gap-2"
                    >
                      <XCircleIcon className="w-5 h-5" />
                      <span className="font-medium">Reject</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Calendar View */}
      <div className="glass-card-premium p-6 xl:p-8 hover-glow">
        <h3 className="text-lg xl:text-xl font-bold font-heading text-gray-900 dark:text-white mb-6">
          Leave Calendar
        </h3>
        <div className="text-center py-12">
          <CalendarIcon className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Calendar view coming soon</p>
        </div>
      </div>
    </div>
  );
};

export default HRLeaveRequests;

