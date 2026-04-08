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
  PrinterIcon,
  ShareIcon
} from '@heroicons/react/24/outline';
import { tenantApiService } from '../../../../../../shared/services/tenant/tenant-api.service';
import { useTenantPermissions } from '../../../../contexts/TenantPermissionsContext';

const PayrollManagement = () => {
  const { tenantSlug } = useParams();
  const { hasModulePermission } = useTenantPermissions();
  const canWritePayroll = hasModulePermission('payroll', 'write');
  const [loading, setLoading] = useState(true);
  const [payrollData, setPayrollData] = useState(null);

  useEffect(() => {
    fetchPayrollData();
  }, [tenantSlug]);

  const fetchPayrollData = async () => {
    try {
      setLoading(true);
      const data = await tenantApiService.getPayrollData(tenantSlug);
      setPayrollData(data);
    } catch (err) {
      console.error('Error fetching payroll data:', err);
    } finally {
      setLoading(false);
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
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg xl:text-xl font-bold font-heading text-gray-900 dark:text-white">
            Current Payroll Cycle - January 2024
          </h3>
          <div className="flex items-center gap-3">
            <button className="glass-button px-4 py-2 rounded-xl hover-scale flex items-center gap-2">
              <PrinterIcon className="w-5 h-5" />
              <span className="font-medium">Print</span>
            </button>
            <button className="glass-button px-4 py-2 rounded-xl hover-scale flex items-center gap-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white">
              <CheckCircleIcon className="w-5 h-5" />
              <span className="font-medium">Process Payroll</span>
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
            <p className="text-lg font-bold text-gray-900 dark:text-white">Jan 1 - Jan 31, 2024</p>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircleIcon className="w-5 h-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Status</span>
            </div>
            <p className="text-lg font-bold text-green-600 dark:text-green-400">Ready for Processing</p>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-3 mb-2">
              <UserGroupIcon className="w-5 h-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Employees</span>
            </div>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{payrollData?.employeeCount || 142}</p>
          </div>
        </div>

        {/* Employee Payroll List */}
        <div className="overflow-x-auto">
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
              {[
                { name: 'John Smith', department: 'Engineering', base: 12000, deductions: 2000, bonuses: 1500, status: 'approved' },
                { name: 'Sarah Johnson', department: 'Management', base: 15000, deductions: 2500, bonuses: 2000, status: 'pending' },
                { name: 'Michael Chen', department: 'Design', base: 10000, deductions: 1800, bonuses: 1000, status: 'approved' }
              ].map((employee, index) => {
                const netPay = employee.base - employee.deductions + employee.bonuses;
                return (
                  <tr key={index} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                          <span className="text-white font-bold text-xs">{employee.name.charAt(0)}</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{employee.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">{employee.department}</td>
                    <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">${employee.base.toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm text-red-600 dark:text-red-400">-${employee.deductions.toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm text-green-600 dark:text-green-400">+${employee.bonuses.toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm font-bold text-gray-900 dark:text-white">${netPay.toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        employee.status === 'approved'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      }`}>
                        {employee.status === 'approved' ? 'Approved' : 'Pending'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button className="text-primary-600 dark:text-primary-400 hover:underline text-sm font-medium flex items-center gap-1">
                        <EyeIcon className="w-4 h-4" />
                        View
                      </button>
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
          {[
            { period: 'December 2023', date: '2023-12-31', employees: 142, total: 428000, status: 'completed' },
            { period: 'November 2023', date: '2023-11-30', employees: 140, total: 420000, status: 'completed' },
            { period: 'October 2023', date: '2023-10-31', employees: 138, total: 415000, status: 'completed' }
          ].map((cycle, index) => (
            <div key={index} className="glass-card p-4 flex items-center justify-between hover-lift">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-glow">
                  <BanknotesIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{cycle.period}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400 mt-1">
                    <span>{cycle.employees} employees</span>
                    <span>Processed: {cycle.date}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">${cycle.total.toLocaleString()}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Total Amount</p>
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
