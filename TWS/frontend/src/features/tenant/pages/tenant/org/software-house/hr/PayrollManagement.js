import React, { useState, useEffect } from 'react';
import { 
  CurrencyDollarIcon, 
  BanknotesIcon,
  ClockIcon,
  CheckCircleIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { tenantApiService } from '../../../../../../../shared/services/tenant/tenant-api.service';
import { useTenantAuth } from '../../../../../../../app/providers/TenantAuthContext';
import { useTenantPermissions } from '../../../../../contexts/TenantPermissionsContext';
import LoadingSpinner from '../../../../../../../shared/components/feedback/LoadingSpinner';
import ErrorState from '../../../../../../../shared/components/feedback/ErrorState';
import EmptyState from '../../../../../../../shared/components/feedback/EmptyState';
import { useTenantSlug } from '../../../../../../../shared/hooks/useTenantSlug';

const PayrollManagement = () => {
  const tenantSlug = useTenantSlug();
  const { isAuthenticated, loading: authLoading } = useTenantAuth();
  const { hasModulePermission } = useTenantPermissions();
  const canWritePayroll = hasModulePermission('payroll', 'write');
  const [loading, setLoading] = useState(true);
  const [payrollData, setPayrollData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cycles, setCycles] = useState([]);
  const [analytics, setAnalytics] = useState({ monthlyTrend: [], statusBreakdown: [], averageNetPay: 0, payrollVelocityDays: 0 });
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    // Only fetch if authenticated and auth is not loading
    if (!authLoading && isAuthenticated) {
      fetchPayrollData();
    } else if (!authLoading && !isAuthenticated) {
      setLoading(false);
    }
  }, [tenantSlug, isAuthenticated, authLoading]);

  const fetchPayrollData = async () => {
    if (!isAuthenticated || !tenantSlug) return;
    
    try {
      setLoading(true);
      setError('');
      const [data, analyticsData, cycleData] = await Promise.all([
        tenantApiService.getPayrollData(tenantSlug),
        tenantApiService.getPayrollAnalytics(tenantSlug),
        tenantApiService.getPayrollCycles(tenantSlug)
      ]);
      if (data) {
        setPayrollData(data);
      } else {
        setPayrollData({ totalAmount: 0, employeeCount: 0, pendingCount: 0 });
      }
      setAnalytics(analyticsData || { monthlyTrend: [], statusBreakdown: [], averageNetPay: 0, payrollVelocityDays: 0 });
      setCycles(cycleData?.cycles || []);
    } catch (err) {
      console.error('Error fetching payroll data:', err);
      setError(err?.message || 'Failed to load payroll data');
      setPayrollData({ totalAmount: 0, employeeCount: 0, pendingCount: 0 });
      setAnalytics({ monthlyTrend: [], statusBreakdown: [], averageNetPay: 0, payrollVelocityDays: 0 });
      setCycles([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = (payrollData?.payrollRecords || []).filter((record) => {
    if (statusFilter === 'all') return true;
    return (record?.status || 'draft') === statusFilter;
  });

  const handleProcessPayroll = async (payrollData) => {
    try {
      setBusy(true);
      await tenantApiService.processPayroll(tenantSlug, payrollData);
      alert('Payroll processed successfully!');
      fetchPayrollData();
    } catch (error) {
      console.error('Error processing payroll:', error);
      alert(error.message || 'Failed to process payroll. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleApprovePayroll = async (payrollId) => {
    if (!window.confirm('Approve this payroll record?')) {
      return;
    }
    try {
      setBusy(true);
      await tenantApiService.approvePayroll(tenantSlug, payrollId);
      alert('Payroll approved successfully!');
      fetchPayrollData();
    } catch (error) {
      console.error('Error approving payroll:', error);
      alert(error.message || 'Failed to approve payroll. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleMarkPaid = async (payrollId) => {
    if (!window.confirm('Mark this payroll as paid?')) return;
    try {
      setBusy(true);
      await tenantApiService.markPayrollAsPaid(tenantSlug, payrollId);
      fetchPayrollData();
    } catch (err) {
      alert(err?.message || 'Failed to mark payroll as paid.');
    } finally {
      setBusy(false);
    }
  };

  const handleCancelPayroll = async (payrollId) => {
    if (!window.confirm('Cancel this payroll record?')) return;
    try {
      setBusy(true);
      await tenantApiService.cancelPayroll(tenantSlug, payrollId, 'Cancelled by payroll manager');
      fetchPayrollData();
    } catch (err) {
      alert(err?.message || 'Failed to cancel payroll.');
    } finally {
      setBusy(false);
    }
  };

  const handleStartCycle = async (cycleId) => {
    try {
      setBusy(true);
      await tenantApiService.startPayrollCycle(tenantSlug, cycleId);
      fetchPayrollData();
    } catch (err) {
      alert(err?.message || 'Failed to start cycle');
    } finally {
      setBusy(false);
    }
  };

  const handleCancelCycle = async (cycleId) => {
    try {
      setBusy(true);
      await tenantApiService.cancelPayrollCycle(tenantSlug, cycleId);
      fetchPayrollData();
    } catch (err) {
      alert(err?.message || 'Failed to cancel cycle');
    } finally {
      setBusy(false);
    }
  };

  const stats = [
    {
      label: 'Total Payroll',
      value: `$${payrollData?.totalAmount?.toLocaleString() || '0'}`,
      icon: CurrencyDollarIcon,
      iconBg: 'bg-green-50 dark:bg-green-900/20',
      iconColor: 'text-green-600 dark:text-green-400'
    },
    {
      label: 'Employees Paid',
      value: (payrollData?.employeeCount || 0).toString(),
      icon: CheckCircleIcon,
      iconBg: 'bg-blue-50 dark:bg-blue-900/20',
      iconColor: 'text-blue-600 dark:text-blue-400'
    },
    {
      label: 'Pending Approval',
      value: (payrollData?.pendingCount || 0).toString(),
      icon: ClockIcon,
      iconBg: 'bg-amber-50 dark:bg-amber-900/20',
      iconColor: 'text-amber-600 dark:text-amber-400'
    },
    {
      label: 'Payroll Cycles',
      value: (payrollData?.cycleCount || 0).toString(),
      icon: BanknotesIcon,
      iconBg: 'bg-accent-50 dark:bg-accent-900/20',
      iconColor: 'text-accent-600 dark:text-accent-400'
    }
  ];

  if (loading) {
    return <LoadingSpinner message="Loading payroll data..." className="min-h-[40vh] bg-transparent" />;
  }

  if (error) {
    return <ErrorState title="Payroll unavailable" message={error} onRetry={fetchPayrollData} className="max-w-xl mx-auto" />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl xl:text-3xl font-bold font-heading text-gray-900 dark:text-white">
            Payroll Management
          </h1>
          <p className="text-sm xl:text-base text-gray-600 dark:text-gray-300 mt-1">
            Manage employee compensation and payroll processing
          </p>
        </div>
        {canWritePayroll && (
          <button className="glass-button px-4 py-2 rounded-xl hover-scale flex items-center gap-2">
            <ArrowDownTrayIcon className="w-5 h-5" />
            <span className="font-medium">Export</span>
          </button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 xl:gap-6">
        {stats.map((stat, index) => (
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Average Net Pay</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">${Math.round(analytics.averageNetPay || 0).toLocaleString()}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Approval Velocity</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{(analytics.payrollVelocityDays || 0).toFixed(1)} days</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Dominant Status</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{analytics.statusBreakdown?.[0]?._id || 'N/A'}</p>
        </div>
      </div>

      {/* Current Payroll Cycle */}
      <div className="glass-card-premium p-6 xl:p-8 hover-glow">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg xl:text-xl font-bold font-heading text-gray-900 dark:text-white">
            Current Payroll Cycle
          </h3>
          {canWritePayroll && (
            <button
              onClick={() => {
                const now = new Date();
                const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
                const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
                handleProcessPayroll({ periodStart, periodEnd, employeeIds: [] });
              }}
              disabled={busy}
              className="glass-button px-4 py-2 rounded-xl hover-scale flex items-center gap-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white disabled:opacity-50"
            >
              <CheckCircleIcon className="w-5 h-5" />
              <span className="font-medium">{busy ? 'Processing...' : 'Process Payroll'}</span>
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          {cycles.length > 0 ? (
            <div className="mb-4 flex items-center gap-3 text-sm">
              <span className="text-gray-600 dark:text-gray-300">
                Active cycle: <strong>{cycles[0]?.name || 'Unnamed'}</strong> ({cycles[0]?.status || 'draft'})
              </span>
              {cycles[0]?.status === 'draft' ? (
                <button disabled={busy} onClick={() => handleStartCycle(cycles[0]._id)} className="text-blue-600 hover:text-blue-800 font-medium">Start Cycle</button>
              ) : null}
              {['draft', 'processing'].includes(cycles[0]?.status) ? (
                <button disabled={busy} onClick={() => handleCancelCycle(cycles[0]._id)} className="text-red-600 hover:text-red-800 font-medium">Cancel Cycle</button>
              ) : null}
            </div>
          ) : null}
          <div className="mb-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white dark:bg-gray-900 dark:border-gray-700 dark:text-gray-200"
            >
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-300">Employee</th>
                <th className="text-left py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-300">Department</th>
                <th className="text-left py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-300">Gross</th>
                <th className="text-left py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-300">Deductions</th>
                <th className="text-left py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-300">Net</th>
                <th className="text-left py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-300">Status</th>
                <th className="text-left py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-300">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-4 px-4">
                    <EmptyState title="No payroll records" message="No payroll records match the selected filter." />
                  </td>
                </tr>
              ) : filteredRecords.map((record) => (
                <tr key={record._id} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{record?.userId?.fullName || 'N/A'}</td>
                  <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">{record?.employeeId?.department || 'N/A'}</td>
                  <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">${(record?.grossPay || 0).toLocaleString()}</td>
                  <td className="py-3 px-4 text-sm text-red-600 dark:text-red-400">-${(record?.deductions?.total || 0).toLocaleString()}</td>
                  <td className="py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">${(record?.netPay || 0).toLocaleString()}</td>
                  <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">{record?.status || 'draft'}</td>
                  <td className="py-3 px-4 text-sm">
                    {(record?.status === 'pending' || record?.status === 'draft') ? (
                      <button onClick={() => handleApprovePayroll(record._id)} className="text-primary-600 hover:text-primary-700 font-medium">Approve</button>
                    ) : record?.status === 'approved' ? (
                      <button onClick={() => handleMarkPaid(record._id)} className="text-green-600 hover:text-green-700 font-medium">Mark Paid</button>
                    ) : ['draft', 'pending', 'approved'].includes(record?.status) ? (
                      <button onClick={() => handleCancelPayroll(record._id)} className="text-red-600 hover:text-red-700 font-medium">Cancel</button>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PayrollManagement;
