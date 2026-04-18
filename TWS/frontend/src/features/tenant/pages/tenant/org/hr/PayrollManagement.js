import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  CurrencyDollarIcon, 
  BanknotesIcon,
  ClockIcon,
  CheckCircleIcon,
  ArrowDownTrayIcon,
  CalendarIcon,
  UserGroupIcon,
  DocumentTextIcon,
  EyeIcon,
  PrinterIcon
} from '@heroicons/react/24/outline';
import { tenantApiService } from '../../../../../../shared/services/tenant/tenant-api.service';
import { useTenantPermissions } from '../../../../contexts/TenantPermissionsContext';

const PayrollManagement = () => {
  const { tenantSlug } = useParams();
  const { hasModulePermission } = useTenantPermissions();
  const canWritePayroll = hasModulePermission('payroll', 'write');
  const [loading, setLoading] = useState(true);
  const [payrollData, setPayrollData] = useState(null);
  const [cycles, setCycles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [analytics, setAnalytics] = useState({ monthlyTrend: [], statusBreakdown: [], averageNetPay: 0, payrollVelocityDays: 0 });
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchPayrollData();
  }, [tenantSlug]);

  const fetchPayrollData = async () => {
    try {
      setLoading(true);
      const [data, cyclesData, analyticsData] = await Promise.all([
        tenantApiService.getPayrollData(tenantSlug),
        tenantApiService.getPayrollCycles(tenantSlug),
        tenantApiService.getPayrollAnalytics(tenantSlug)
      ]);
      setPayrollData(data || { totalAmount: 0, employeeCount: 0, pendingCount: 0, cycleCount: 0, payrollRecords: [] });
      setCycles(cyclesData?.cycles || []);
      setAnalytics(analyticsData || { monthlyTrend: [], statusBreakdown: [], averageNetPay: 0, payrollVelocityDays: 0 });
    } catch (err) {
      console.error('Error fetching payroll data:', err);
      setPayrollData({ totalAmount: 0, employeeCount: 0, pendingCount: 0, cycleCount: 0, payrollRecords: [] });
      setCycles([]);
      setAnalytics({ monthlyTrend: [], statusBreakdown: [], averageNetPay: 0, payrollVelocityDays: 0 });
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = (payrollData?.payrollRecords || []).filter((record) => {
    if (statusFilter === 'all') return true;
    return (record?.status || 'draft') === statusFilter;
  });

  const runProcessPayroll = async () => {
    if (!canWritePayroll || busy) return;
    try {
      setBusy(true);
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
      await tenantApiService.processPayroll(tenantSlug, { periodStart, periodEnd, employeeIds: [] });
      await fetchPayrollData();
    } catch (err) {
      console.error('Payroll processing failed:', err);
      alert(err?.message || 'Payroll processing failed');
    } finally {
      setBusy(false);
    }
  };

  const approveRecord = async (recordId) => {
    if (!canWritePayroll || busy) return;
    try {
      setBusy(true);
      await tenantApiService.approvePayroll(tenantSlug, recordId);
      await fetchPayrollData();
    } catch (err) {
      console.error('Approve payroll failed:', err);
      alert(err?.message || 'Approve payroll failed');
    } finally {
      setBusy(false);
    }
  };

  const markPaid = async (recordId) => {
    if (!canWritePayroll || busy) return;
    try {
      setBusy(true);
      await tenantApiService.markPayrollAsPaid(tenantSlug, recordId);
      await fetchPayrollData();
    } catch (err) {
      console.error('Mark paid failed:', err);
      alert(err?.message || 'Mark paid failed');
    } finally {
      setBusy(false);
    }
  };

  const stats = [
    { 
      label: 'Total Payroll', 
      value: `$${payrollData?.totalAmount?.toLocaleString() || '0'}`, 
      icon: CurrencyDollarIcon, 
      iconBg: 'bg-gradient-to-br from-green-500 to-emerald-600' 
    },
    { 
      label: 'Employees Paid', 
      value: (payrollData?.employeeCount || 0).toString(), 
      icon: CheckCircleIcon, 
      iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-600' 
    },
    { 
      label: 'Pending Approval', 
      value: (payrollData?.pendingCount || 0).toString(), 
      icon: ClockIcon, 
      iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600' 
    },
    { 
      label: 'Payroll Cycles', 
      value: (payrollData?.cycleCount || 0).toString(), 
      icon: BanknotesIcon, 
      iconBg: 'bg-gradient-to-br from-purple-500 to-pink-600' 
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading payroll data...</p>
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

      {/* Analytics Snapshot */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Average Net Pay</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">${Math.round(analytics.averageNetPay || 0).toLocaleString()}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Payroll Approval Velocity</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{(analytics.payrollVelocityDays || 0).toFixed(1)} days</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Top Status</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.statusBreakdown?.[0]?._id || 'N/A'}</p>
        </div>
      </div>

      {/* Current Payroll Cycle */}
      <div className="glass-card-premium p-6 xl:p-8 hover-glow">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg xl:text-xl font-bold font-heading text-gray-900 dark:text-white">
            Current Payroll Cycle
          </h3>
          <div className="flex items-center gap-3">
            <button className="glass-button px-4 py-2 rounded-xl hover-scale flex items-center gap-2">
              <PrinterIcon className="w-5 h-5" />
              <span className="font-medium">Print</span>
            </button>
            <button
              onClick={runProcessPayroll}
              disabled={!canWritePayroll || busy}
              className="glass-button px-4 py-2 rounded-xl hover-scale flex items-center gap-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white disabled:opacity-50"
            >
              <CheckCircleIcon className="w-5 h-5" />
              <span className="font-medium">{busy ? 'Processing...' : 'Process Payroll'}</span>
            </button>
          </div>
        </div>

        {/* Payroll Cycle Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="glass-card p-4">
            <div className="flex items-center gap-3 mb-2">
              <CalendarIcon className="w-5 h-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Pay Period</span>
            </div>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {cycles[0] ? `${new Date(cycles[0].startDate).toLocaleDateString()} - ${new Date(cycles[0].endDate).toLocaleDateString()}` : 'No active cycle'}
            </p>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircleIcon className="w-5 h-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Status</span>
            </div>
            <p className="text-lg font-bold text-green-600 dark:text-green-400">{cycles[0]?.status || 'N/A'}</p>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-3 mb-2">
              <UserGroupIcon className="w-5 h-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Employees</span>
            </div>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{payrollData?.employeeCount || 0}</p>
          </div>
        </div>

        {/* Employee Payroll List */}
        <div className="overflow-x-auto">
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
                <th className="text-left py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-300">Base Salary</th>
                <th className="text-left py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-300">Deductions</th>
                <th className="text-left py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-300">Bonuses</th>
                <th className="text-left py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-300">Net Pay</th>
                <th className="text-left py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-300">Status</th>
                <th className="text-left py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record, index) => {
                const name = record?.userId?.fullName || `Employee ${index + 1}`;
                const department = record?.employeeId?.department || 'N/A';
                const base = record?.grossPay || 0;
                const deductions = record?.deductions?.total || 0;
                const bonuses = Math.max(0, (record?.netPay || 0) - (base - deductions));
                const netPay = record?.netPay || 0;
                return (
                  <tr key={index} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                          <span className="text-white font-bold text-xs">{name.charAt(0)}</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">{department}</td>
                    <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">${base.toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm text-red-600 dark:text-red-400">-${deductions.toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm text-green-600 dark:text-green-400">+${bonuses.toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm font-bold text-gray-900 dark:text-white">${netPay.toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        record.status === 'approved' || record.status === 'paid'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      }`}>
                        {record.status || 'draft'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {record.status === 'pending' || record.status === 'draft' ? (
                          <button onClick={() => approveRecord(record._id)} className="text-primary-600 dark:text-primary-400 hover:underline text-sm font-medium">Approve</button>
                        ) : null}
                        {record.status === 'approved' ? (
                          <button onClick={() => markPaid(record._id)} className="text-green-600 hover:underline text-sm font-medium">Mark Paid</button>
                        ) : null}
                        <button className="text-primary-600 dark:text-primary-400 hover:underline text-sm font-medium flex items-center gap-1">
                          <EyeIcon className="w-4 h-4" />
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payroll History */}
      <div className="glass-card-premium p-6 xl:p-8 hover-glow">
        <h3 className="text-lg xl:text-xl font-bold font-heading text-gray-900 dark:text-white mb-6">
          Recent Payroll Cycles
        </h3>
        <div className="space-y-3">
          {(cycles || []).map((cycle, index) => (
            <div key={index} className="glass-card p-4 flex items-center justify-between hover-lift">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-glow">
                  <BanknotesIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{cycle.name}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400 mt-1">
                    <span>Frequency: {cycle.frequency}</span>
                    <span>Processed: {cycle.processedAt ? new Date(cycle.processedAt).toLocaleDateString() : 'N/A'}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{new Date(cycle.startDate).toLocaleDateString()} - {new Date(cycle.endDate).toLocaleDateString()}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Cycle Window</p>
                </div>
                <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  {cycle.status}
                </span>
                <button className="glass-button p-2 text-primary-600 dark:text-primary-400">
                  <EyeIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PayrollManagement;
