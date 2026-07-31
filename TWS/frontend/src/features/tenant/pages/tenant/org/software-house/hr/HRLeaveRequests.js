import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { 
  ClockIcon, 
  CheckCircleIcon,
  XCircleIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { tenantApiService } from '../../../../../../../shared/services/tenant/tenant-api.service';
import FeatureUnavailable from '../../../../../../../shared/components/feedback/FeatureUnavailable';
import { useTenantSlug } from '../../../../../../../shared/hooks/useTenantSlug';
import LoadingSpinner from '../../../../../../../shared/components/feedback/LoadingSpinner';

const HRLeaveRequests = () => {
  const tenantSlug = useTenantSlug();
  const [loading, setLoading] = useState(true);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    totalDays: 0
  });
  const [policySaving, setPolicySaving] = useState(false);
  const [policyApplying, setPolicyApplying] = useState(false);
  const [policy, setPolicy] = useState({
    name: 'Default Leave Policy',
    annual: { daysPerYear: 20 },
    sick: { daysPerYear: 10 },
    personal: { daysPerYear: 5 }
  });

  const getProfilePicApiUrl = (url) => {
    if (!url || !tenantSlug) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/uploads/profile-pictures/')) {
      return `/api/tenant/${tenantSlug}/organization${url}`;
    }
    return url;
  };

  useEffect(() => {
    fetchLeaveRequests();
    fetchLeavePolicy();
  }, [tenantSlug]);

  const fetchLeavePolicy = async () => {
    try {
      const data = await tenantApiService.getLeavePolicy(tenantSlug);
      if (data?.policy) {
        setPolicy({
          name: data.policy.name || 'Default Leave Policy',
          annual: { daysPerYear: Number(data.policy?.annual?.daysPerYear ?? 20) },
          sick: { daysPerYear: Number(data.policy?.sick?.daysPerYear ?? 10) },
          personal: { daysPerYear: Number(data.policy?.personal?.daysPerYear ?? 5) }
        });
      }
    } catch (err) {
      console.error('Error fetching leave policy:', err);
    }
  };

  const savePolicy = async () => {
    try {
      setPolicySaving(true);
      await tenantApiService.saveLeavePolicy(tenantSlug, {
        name: policy.name,
        annual: { daysPerYear: Number(policy.annual.daysPerYear || 0) },
        sick: { daysPerYear: Number(policy.sick.daysPerYear || 0) },
        personal: { daysPerYear: Number(policy.personal.daysPerYear || 0) }
      });
      toast.success('Leave policy saved');
    } catch (err) {
      console.error('Error saving leave policy:', err);
      toast.error('Failed to save leave policy');
    } finally {
      setPolicySaving(false);
    }
  };

  const applyPolicy = async () => {
    try {
      setPolicyApplying(true);
      await tenantApiService.applyLeavePolicy(tenantSlug);
      toast.success('Policy applied to all active employees');
    } catch (err) {
      console.error('Error applying leave policy:', err);
      toast.error('Failed to apply leave policy');
    } finally {
      setPolicyApplying(false);
    }
  };

  const fetchLeaveRequests = async () => {
    try {
      setLoading(true);
      const data = await tenantApiService.getLeaveRequests(tenantSlug);
      const requests = data?.leaveRequests || [];
      setLeaveRequests(requests);
      const pending = requests.filter((r) => r.status === 'pending').length;
      const approved = requests.filter((r) => r.status === 'approved').length;
      const rejected = requests.filter((r) => r.status === 'rejected').length;
      const totalDays = requests.reduce((sum, r) => sum + (Number(r.days) || 0), 0);
      setStats({ pending, approved, rejected, totalDays });
    } catch (err) {
      console.error('Error fetching leave requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId) => {
    try {
      await tenantApiService.approveLeaveRequest(tenantSlug, requestId);
      await fetchLeaveRequests();
    } catch (err) {
      console.error('Error approving leave request:', err);
    }
  };

  const handleReject = async (requestId) => {
    try {
      await tenantApiService.rejectLeaveRequest(tenantSlug, requestId);
      await fetchLeaveRequests();
    } catch (err) {
      console.error('Error rejecting leave request:', err);
    }
  };

  const statsData = [
    { label: 'Pending Requests', value: stats.pending.toString(), icon: ClockIcon, iconBg: 'bg-amber-50 dark:bg-amber-900/20', iconColor: 'text-amber-600 dark:text-amber-400' },
    { label: 'Approved This Month', value: stats.approved.toString(), icon: CheckCircleIcon, iconBg: 'bg-green-50 dark:bg-green-900/20', iconColor: 'text-green-600 dark:text-green-400' },
    { label: 'Rejected', value: stats.rejected.toString(), icon: XCircleIcon, iconBg: 'bg-rose-50 dark:bg-rose-900/20', iconColor: 'text-rose-600 dark:text-rose-400' },
    { label: 'Total Days Off', value: stats.totalDays.toString(), icon: CalendarIcon, iconBg: 'bg-blue-50 dark:bg-blue-900/20', iconColor: 'text-blue-600 dark:text-blue-400' }
  ];

  if (loading) {
    return <LoadingSpinner message="Balancing leave requests…" className="min-h-[40vh] bg-transparent" />;
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

      {/* Org Leave Policy */}
      <div className="glass-card-premium p-4 xl:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="text-base xl:text-lg font-bold font-heading text-gray-900 dark:text-white">
              Org Leave Policy
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              HR sets this policy for all employees. Apply after saving to sync balances.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={savePolicy}
              disabled={policySaving}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-60"
            >
              {policySaving ? 'Saving...' : 'Save Policy'}
            </button>
            <button
              onClick={applyPolicy}
              disabled={policyApplying}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {policyApplying ? 'Applying...' : 'Apply to Employees'}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] text-gray-600 dark:text-gray-400 mb-1">Annual Leave (days/year)</label>
            <input
              type="number"
              min="0"
              value={policy.annual.daysPerYear}
              onChange={(e) => setPolicy((prev) => ({ ...prev, annual: { ...prev.annual, daysPerYear: e.target.value } }))}
              className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
            />
          </div>
          <div>
            <label className="block text-[11px] text-gray-600 dark:text-gray-400 mb-1">Sick Leave (days/year)</label>
            <input
              type="number"
              min="0"
              value={policy.sick.daysPerYear}
              onChange={(e) => setPolicy((prev) => ({ ...prev, sick: { ...prev.sick, daysPerYear: e.target.value } }))}
              className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
            />
          </div>
          <div>
            <label className="block text-[11px] text-gray-600 dark:text-gray-400 mb-1">Personal Leave (days/year)</label>
            <input
              type="number"
              min="0"
              value={policy.personal.daysPerYear}
              onChange={(e) => setPolicy((prev) => ({ ...prev, personal: { ...prev.personal, daysPerYear: e.target.value } }))}
              className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 xl:gap-6">
        {statsData.map((stat, index) => (
          <div key={index} className="glass-card-premium p-5 xl:p-6 hover-lift">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 xl:w-14 xl:h-14 rounded-2xl ${stat.iconBg} flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 xl:w-7 xl:h-7 ${stat.iconColor}`} />
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
      <div className="glass-card-premium p-4 xl:p-5 hover-glow">
        <h3 className="text-base xl:text-lg font-bold font-heading text-gray-900 dark:text-white mb-3">
          Pending Leave Requests
        </h3>
        <div className="space-y-2">
          {leaveRequests.length === 0 ? (
            <div className="text-center py-8">
              <CalendarIcon className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
              <p className="text-sm text-gray-600 dark:text-gray-400">No pending leave requests</p>
            </div>
          ) : (
            leaveRequests.map((request) => (
              <div key={request._id || request.id} className="glass-card p-3 hover-lift">
                {(() => {
                  const requesterName =
                    request.userId?.fullName ||
                    request.userId?.email ||
                    request.employee?.fullName ||
                    request.employee?.name ||
                    request.employee?.email ||
                    request.employee ||
                    'Unknown';
                  const requesterPic = getProfilePicApiUrl(request.userId?.profilePicUrl);
                  return (
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_220px] gap-3 items-center">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center shrink-0 overflow-hidden">
                        {requesterPic ? (
                          <img
                            src={requesterPic}
                            alt={requesterName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-white font-bold text-xs">{requesterName.toString().charAt(0)}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{requesterName}</p>
                        <p className="text-[11px] text-gray-600 dark:text-gray-400 capitalize">{request.type}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Start</p>
                        <p className="text-xs font-medium text-gray-900 dark:text-white">{request.startDate ? new Date(request.startDate).toLocaleDateString() : '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">End</p>
                        <p className="text-xs font-medium text-gray-900 dark:text-white">{request.endDate ? new Date(request.endDate).toLocaleDateString() : '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Days</p>
                        <p className="text-xs font-medium text-gray-900 dark:text-white">{request.days}d</p>
                      </div>
                      <div className="col-span-2 md:col-span-1">
                        <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Reason</p>
                        <p className="text-xs text-gray-800 dark:text-gray-200 truncate">{request.reason || '-'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleApprove(request._id || request.id)}
                      disabled={request.status !== 'pending'}
                      className={`glass-button px-3 py-1.5 rounded-lg text-xs flex items-center justify-center gap-1.5 ${
                        request.status === 'approved'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 cursor-default'
                          : request.status !== 'pending'
                            ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-default'
                            : 'hover-scale bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                      }`}
                    >
                      <CheckCircleIcon className="w-4 h-4" />
                      <span className="font-medium">{request.status === 'approved' ? 'Approved' : 'Approve'}</span>
                    </button>
                    <button
                      onClick={() => handleReject(request._id || request.id)}
                      disabled={request.status !== 'pending'}
                      className={`glass-button px-3 py-1.5 rounded-lg text-xs flex items-center justify-center gap-1.5 ${
                        request.status === 'rejected'
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 cursor-default'
                          : request.status !== 'pending'
                            ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-default'
                            : 'hover-scale bg-gradient-to-r from-red-500 to-pink-600 text-white'
                      }`}
                    >
                      <XCircleIcon className="w-4 h-4" />
                      <span className="font-medium">{request.status === 'rejected' ? 'Rejected' : 'Reject'}</span>
                    </button>
                  </div>
                </div>
                  );
                })()}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Calendar View */}
      <div className="glass-card-premium p-4 xl:p-5 hover-glow">
        <h3 className="text-base xl:text-lg font-bold font-heading text-gray-900 dark:text-white mb-3">
          Leave Calendar
        </h3>
        <FeatureUnavailable
          title="Leave calendar unavailable"
          description="Calendar view is not available in this release yet."
          className="max-w-xl mx-auto"
        />
      </div>
    </div>
  );
};

export default HRLeaveRequests;
