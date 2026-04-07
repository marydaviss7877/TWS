import React from 'react';
import AdminPageTemplate from '../../../../features/admin/components/admin/AdminPageTemplate';
import { 
  ClockIcon, 
  CheckCircleIcon,
  XCircleIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

const HRLeaveRequests = () => {
  const stats = [
    { label: 'Pending Requests', value: '12', icon: ClockIcon, iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600' },
    { label: 'Approved This Month', value: '28', icon: CheckCircleIcon, iconBg: 'bg-gradient-to-br from-green-500 to-emerald-600' },
    { label: 'Rejected', value: '3', icon: XCircleIcon, iconBg: 'bg-gradient-to-br from-red-500 to-pink-600' },
    { label: 'Total Days Off', value: '145', icon: CalendarIcon, iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-600' }
  ];

  const leaveRequests = [
    { id: 1, employee: 'Sarah Johnson', type: 'Vacation', startDate: '2024-01-15', endDate: '2024-01-20', days: 5, status: 'Pending', reason: 'Family vacation' },
    { id: 2, employee: 'Michael Chen', type: 'Sick Leave', startDate: '2024-01-10', endDate: '2024-01-12', days: 2, status: 'Pending', reason: 'Medical appointment' },
    { id: 3, employee: 'Emily Davis', type: 'Personal', startDate: '2024-01-18', endDate: '2024-01-19', days: 1, status: 'Pending', reason: 'Personal matters' }
  ];

  return (
    <AdminPageTemplate
      title="Leave Requests"
      description="Review and manage employee leave requests"
      stats={stats}
    >
      {/* Leave Requests Table */}
      <div className="glass-card-premium p-6 hover-glow">
        <h3 className="text-lg font-bold font-heading text-gray-900 dark:text-white mb-4">
          Pending Leave Requests
        </h3>
        <div className="space-y-4">
          {leaveRequests.map((request) => (
            <div key={request.id} className="glass-card p-4 hover-lift">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
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
                  <button className="flex-1 lg:flex-none glass-button px-4 py-2 rounded-xl hover-scale bg-gradient-to-r from-green-500 to-emerald-600 text-white flex items-center justify-center gap-2">
                    <CheckCircleIcon className="w-5 h-5" />
                    <span className="font-medium">Approve</span>
                  </button>
                  <button className="flex-1 lg:flex-none glass-button px-4 py-2 rounded-xl hover-scale bg-gradient-to-r from-red-500 to-pink-600 text-white flex items-center justify-center gap-2">
                    <XCircleIcon className="w-5 h-5" />
                    <span className="font-medium">Reject</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar View */}
      <div className="glass-card-premium p-6 hover-glow">
        <h3 className="text-lg font-bold font-heading text-gray-900 dark:text-white mb-4">
          Leave Calendar
        </h3>
        <div className="text-center py-12">
          <CalendarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Calendar view coming soon</p>
        </div>
      </div>
    </AdminPageTemplate>
  );
};

export default HRLeaveRequests;
