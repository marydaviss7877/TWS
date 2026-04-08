import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
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

const PayrollManagement = () => {
  const { tenantSlug } = useParams();
  const { isAuthenticated, loading: authLoading } = useTenantAuth();
  const { hasModulePermission } = useTenantPermissions();
  const canWritePayroll = hasModulePermission('payroll', 'write');
  const [loading, setLoading] = useState(true);
  const [payrollData, setPayrollData] = useState(null);

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
      const data = await tenantApiService.getPayrollData(tenantSlug);
      if (data) {
        setPayrollData(data);
      } else {
        setPayrollData({ totalAmount: 0, employeeCount: 0, pendingCount: 0 });
      }
    } catch (err) {
      console.error('Error fetching payroll data:', err);
      setPayrollData({ totalAmount: 0, employeeCount: 0, pendingCount: 0 });
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPayroll = async (payrollData) => {
    try {
      await tenantApiService.processPayroll(tenantSlug, payrollData);
      alert('Payroll processed successfully!');
      fetchPayrollData();
    } catch (error) {
      console.error('Error processing payroll:', error);
      alert(error.message || 'Failed to process payroll. Please try again.');
    }
  };

  const handleApprovePayroll = async (payrollId) => {
    if (!window.confirm('Approve this payroll record?')) {
      return;
    }
    try {
      const approvedBy = 'current-user-id'; // TODO: Get from auth context
      await tenantApiService.approvePayroll(tenantSlug, payrollId, approvedBy);
      alert('Payroll approved successfully!');
      fetchPayrollData();
    } catch (error) {
      console.error('Error approving payroll:', error);
      alert(error.message || 'Failed to approve payroll. Please try again.');
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

      {/* Current Payroll Cycle */}
      <div className="glass-card-premium p-6 xl:p-8 hover-glow">
        <h3 className="text-lg xl:text-xl font-bold font-heading text-gray-900 dark:text-white mb-6">
          Current Payroll Cycle
        </h3>
        <div className="text-center py-12">
          <BanknotesIcon className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-2">Payroll processing interface</p>
          <p className="text-sm text-gray-500 dark:text-gray-500">Detailed payroll processing features coming soon</p>
        </div>
      </div>
    </div>
  );
};

export default PayrollManagement;
