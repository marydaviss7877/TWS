import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { 
  ClockIcon, 
  CheckCircleIcon,
  XCircleIcon,
  CalendarIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { tenantApiService } from '../../../../../../shared/services/tenant/tenant-api.service';

const HRLeaveRequests = () => {
  const { tenantSlug } = useParams();
  const [loading, setLoading] = useState(true);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [approvedRequests, setApprovedRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [activeTab, setActiveTab] = useState('pending'); // pending, approved, rejected, calendar
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    totalDays: 0
  });

  const fetchLeaveRequests = useCallback(async () => {
    try {
      setLoading(true);
      // TODO: Add leave requests API to tenantApiService
      // const data = await tenantApiService.getLeaveRequests(tenantSlug);
      // Mock data for now
      const mockData = {
        requests: [
          { id: 1, employee: 'Sarah Johnson', type: 'Vacation', startDate: '2024-01-15', endDate: '2024-01-20', days: 5, status: 'Pending', reason: 'Family vacation', department: 'Management' },
          { id: 2, employee: 'Michael Chen', type: 'Sick Leave', startDate: '2024-01-10', endDate: '2024-01-12', days: 2, status: 'Pending', reason: 'Medical appointment', department: 'Design' },
          { id: 3, employee: 'Emily Davis', type: 'Personal', startDate: '2024-01-18', endDate: '2024-01-19', days: 1, status: 'Pending', reason: 'Personal matters', department: 'HR' },
          { id: 4, employee: 'John Smith', type: 'Vacation', startDate: '2024-01-22', endDate: '2024-01-25', days: 3, status: 'Pending', reason: 'Family trip', department: 'Engineering' }
        ],
        approved: [
          { id: 5, employee: 'Alice Cooper', type: 'Vacation', startDate: '2024-01-05', endDate: '2024-01-08', days: 3, status: 'Approved', reason: 'Holiday', department: 'Sales', approvedBy: 'HR Manager', approvedDate: '2024-01-03' },
          { id: 6, employee: 'Bob Martinez', type: 'Sick Leave', startDate: '2024-01-02', endDate: '2024-01-03', days: 1, status: 'Approved', reason: 'Illness', department: 'Engineering', approvedBy: 'Team Lead', approvedDate: '2024-01-01' }
        ],
        stats: { pending: 12, approved: 28, rejected: 3, totalDays: 145 }
      };
      setLeaveRequests(mockData.requests);
      setApprovedRequests(mockData.approved);
      setStats(mockData.stats);
    } catch (err) {
      console.error('Error fetching leave requests:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    fetchLeaveRequests();
  }, [fetchLeaveRequests]);

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

      {/* Tabs Navigation */}
      <div className="glass-card-premium p-2">
        <div className="flex gap-2">
          {[
            { id: 'pending', label: 'Pending', count: leaveRequests.length, icon: ClockIcon },
            { id: 'approved', label: 'Approved', count: approvedRequests.length, icon: CheckCircleIcon },
            { id: 'rejected', label: 'Rejected', count: stats.rejected, icon: XCircleIcon },
            { id: 'calendar', label: 'Calendar', icon: CalendarIcon }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-primary-500 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== undefined && (
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  activeTab === tab.id ? 'bg-white/20' : 'bg-gray-200 dark:bg-gray-700'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Search and Filters */}
      {activeTab !== 'calendar' && (
        <div className="glass-card-premium p-6 hover-glow">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Search leave requests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="glass-input w-full pl-10 pr-4 py-3 text-sm font-medium rounded-xl"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="glass-input px-4 py-3 text-sm font-medium rounded-xl"
            >
              <option value="all">All Leave Types</option>
              <option value="vacation">Vacation</option>
              <option value="sick">Sick Leave</option>
              <option value="personal">Personal</option>
              <option value="other">Other</option>
            </select>
            <button className="glass-button px-4 py-2 rounded-xl hover-scale flex items-center gap-2">
              <ArrowDownTrayIcon className="w-5 h-5" />
              <span className="font-medium">Export</span>
            </button>
          </div>
        </div>
      )}

      {/* Pending Leave Requests */}
      {activeTab === 'pending' && (
        <div className="glass-card-premium p-6 xl:p-8 hover-glow">
          <h3 className="text-lg xl:text-xl font-bold font-heading text-gray-900 dark:text-white mb-6">
            Pending Leave Requests
          </h3>
          <div className="space-y-4">
            {leaveRequests.filter(req => 
              (!searchTerm || req.employee.toLowerCase().includes(searchTerm.toLowerCase())) &&
              (filterType === 'all' || req.type.toLowerCase().includes(filterType.toLowerCase()))
            ).length === 0 ? (
              <div className="text-center py-12">
                <CalendarIcon className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">No pending leave requests</p>
              </div>
            ) : (
              leaveRequests.filter(req => 
                (!searchTerm || req.employee.toLowerCase().includes(searchTerm.toLowerCase())) &&
                (filterType === 'all' || req.type.toLowerCase().includes(filterType.toLowerCase()))
              ).map((request) => (
                <div key={request.id} className="glass-card p-4 hover-lift">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-glow">
                        <span className="text-white font-bold text-sm">{(request.employee?.fullName || request.employee?.name || request.employee?.email || request.employee || '?').toString().charAt(0)}</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{request.employee?.fullName || request.employee?.name || request.employee?.email || request.employee || 'Unknown'}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{request.type} • {request.department}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
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
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Days Remaining</p>
                        <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                          {25 - request.days} days left
                        </p>
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
      )}

      {/* Approved Leave Requests */}
      {activeTab === 'approved' && (
        <div className="glass-card-premium p-6 xl:p-8 hover-glow">
          <h3 className="text-lg xl:text-xl font-bold font-heading text-gray-900 dark:text-white mb-6">
            Approved Leave Requests
          </h3>
          <div className="space-y-4">
            {approvedRequests.filter(req => 
              (!searchTerm || req.employee.toLowerCase().includes(searchTerm.toLowerCase())) &&
              (filterType === 'all' || req.type.toLowerCase().includes(filterType.toLowerCase()))
            ).length === 0 ? (
              <div className="text-center py-12">
                <CheckCircleIcon className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">No approved leave requests</p>
              </div>
            ) : (
              approvedRequests.filter(req => 
                (!searchTerm || req.employee.toLowerCase().includes(searchTerm.toLowerCase())) &&
                (filterType === 'all' || req.type.toLowerCase().includes(filterType.toLowerCase()))
              ).map((request) => (
                <div key={request.id} className="glass-card p-4 hover-lift">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-glow">
                        <UserIcon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{request.employee?.fullName || request.employee?.name || request.employee?.email || request.employee || 'Unknown'}</p>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            Approved
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                          <span>{request.type}</span>
                          <span>•</span>
                          <span>{request.startDate} - {request.endDate}</span>
                          <span>•</span>
                          <span>{request.days} days</span>
                          <span>•</span>
                          <span>Approved by {request.approvedBy?.fullName || request.approvedBy?.name || request.approvedBy?.email || request.approvedBy || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                    <button className="glass-button p-2 text-primary-600 dark:text-primary-400">
                      <EyeIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Rejected Leave Requests */}
      {activeTab === 'rejected' && (
        <div className="glass-card-premium p-6 xl:p-8 hover-glow">
          <h3 className="text-lg xl:text-xl font-bold font-heading text-gray-900 dark:text-white mb-6">
            Rejected Leave Requests
          </h3>
          <div className="text-center py-12">
            <XCircleIcon className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No rejected leave requests</p>
          </div>
        </div>
      )}

      {/* Calendar View */}
      {activeTab === 'calendar' && (
        <div className="glass-card-premium p-6 xl:p-8 hover-glow">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg xl:text-xl font-bold font-heading text-gray-900 dark:text-white">
              Leave Calendar - January 2024
            </h3>
            <div className="flex items-center gap-2">
              <button className="glass-button px-3 py-2 rounded-xl text-sm">Prev</button>
              <button className="glass-button px-3 py-2 rounded-xl text-sm">Next</button>
            </div>
          </div>
          
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center text-sm font-bold text-gray-700 dark:text-gray-300 py-2">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 31 }, (_, i) => {
              const day = i + 1;
              const hasLeave = [5, 10, 15, 18, 22, 25].includes(day);
              return (
                <div
                  key={day}
                  className={`aspect-square p-2 rounded-lg text-center ${
                    hasLeave
                      ? 'bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500'
                      : 'bg-gray-50 dark:bg-gray-800'
                  } hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer`}
                >
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{day}</div>
                  {hasLeave && (
                    <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">2 on leave</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-500"></div>
              <span className="text-xs text-gray-600 dark:text-gray-400">Employees on Leave</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-500"></div>
              <span className="text-xs text-gray-600 dark:text-gray-400">Approved</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-amber-500"></div>
              <span className="text-xs text-gray-600 dark:text-gray-400">Pending</span>
            </div>
          </div>
        </div>
      )}

      {/* Leave Statistics */}
      {activeTab !== 'calendar' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card-premium p-6 text-center">
            <p className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">{stats.approved}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Approved This Month</p>
          </div>
          <div className="glass-card-premium p-6 text-center">
            <p className="text-3xl font-bold text-amber-600 dark:text-amber-400 mb-2">{stats.pending}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Pending Approval</p>
          </div>
          <div className="glass-card-premium p-6 text-center">
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">{stats.totalDays}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Days Off</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default HRLeaveRequests;

