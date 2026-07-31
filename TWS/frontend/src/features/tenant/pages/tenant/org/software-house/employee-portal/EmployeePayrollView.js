import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../../../../app/providers/AuthContext';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../../../../../../shared/components/feedback/LoadingSpinner';
import ErrorState from '../../../../../../../shared/components/feedback/ErrorState';
import EmptyState from '../../../../../../../shared/components/feedback/EmptyState';
import {
  CurrencyDollarIcon,
  DocumentTextIcon,
  CalendarIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline';

const EmployeePayrollView = ({ tenantSlug }) => {
  const { user } = useAuth();
  const currentUserId = user?.id || user?._id;
  const [loading, setLoading] = useState(true);
  const [salary, setSalary] = useState(null);
  const [payslips, setPayslips] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    fetchPayrollData();
  }, [tenantSlug, user, selectedPeriod]);

  const fetchPayrollData = async () => {
    try {
      setLoading(true);
      setLoadError('');
      
      // Fetch employee data
      const empResponse = await fetch(`/api/tenant/${tenantSlug}/organization/hr/employees?userId=${currentUserId}`, {
        credentials: 'include' // SECURITY FIX: Use cookies instead of localStorage token
      });

      if (empResponse.ok) {
        const empData = await empResponse.json();
        if (empData.data?.employees?.length > 0) {
          const employee = empData.data.employees[0];
          setSalary(employee.salary || {
            base: 0,
            currency: 'USD',
            payFrequency: 'monthly',
            components: [],
            bonuses: []
          });
        }
      }

      // Fetch payslips
      const payslipsResponse = await fetch(
        `/api/tenant/${tenantSlug}/organization/hr/payslips?employeeId=${currentUserId}${selectedPeriod ? `&period=${selectedPeriod}` : ''}`,
        {
          credentials: 'include' // SECURITY FIX: Use cookies instead of localStorage token
        }
      );

      if (payslipsResponse.ok) {
        const payslipsData = await payslipsResponse.json();
        setPayslips(payslipsData.data?.payslips || []);
      }
    } catch (error) {
      console.error('Failed to fetch payroll data:', error);
      setLoadError(error?.message || 'Failed to load payroll information');
      toast.error('Failed to load payroll information');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const calculateTotalCompensation = () => {
    if (!salary) return 0;
    const base = salary.base || 0;
    const componentsTotal = (salary.components || []).reduce((sum, comp) => sum + (comp.amount || 0), 0);
    return base + componentsTotal;
  };

  const downloadPayslip = async (payslipId) => {
    try {
      const response = await fetch(`/api/tenant/${tenantSlug}/organization/hr/payslips/${payslipId}/download`, {
        credentials: 'include' // SECURITY FIX: Use cookies instead of localStorage token
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `payslip-${payslipId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Payslip downloaded successfully');
      } else {
        toast.error('Failed to download payslip');
      }
    } catch (error) {
      console.error('Failed to download payslip:', error);
      toast.error('Failed to download payslip');
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading payroll information..." className="min-h-[40vh] bg-transparent" />;
  }

  if (loadError) {
    return <ErrorState title="Payroll unavailable" message={loadError} onRetry={fetchPayrollData} className="max-w-xl mx-auto" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">My Payroll</h2>
          <div className="flex items-center space-x-4">
            <input
              type="month"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
      </div>

      {/* Salary Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Base Salary</h3>
            <CurrencyDollarIcon className="h-6 w-6 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {salary ? formatCurrency(salary.base, salary.currency) : 'N/A'}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {salary?.payFrequency ? `Per ${salary.payFrequency}` : ''}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Compensation</h3>
            <BanknotesIcon className="h-6 w-6 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(calculateTotalCompensation(), salary?.currency || 'USD')}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Including all components</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Payslips</h3>
            <DocumentTextIcon className="h-6 w-6 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{payslips.length}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Available payslips</p>
        </div>
      </div>

      {/* Salary Components */}
      {salary?.components && salary.components.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Salary Components</h3>
          <div className="space-y-3">
            {salary.components.map((component, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{component.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                    {component.type} {component.isRecurring ? '(Recurring)' : '(One-time)'}
                  </p>
                </div>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(component.amount, salary.currency)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bonuses */}
      {salary?.bonuses && salary.bonuses.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Bonuses</h3>
          <div className="space-y-3">
            {salary.bonuses.map((bonus, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white capitalize">{bonus.type} Bonus</p>
                  {bonus.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{bonus.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {bonus.awardedDate ? new Date(bonus.awardedDate).toLocaleDateString() : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(bonus.amount, salary.currency)}
                  </p>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    bonus.status === 'paid' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                    bonus.status === 'approved' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' :
                    'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                  }`}>
                    {bonus.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payslips */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Payslips</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Period</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Gross Pay</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Deductions</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Net Pay</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {payslips.length > 0 ? (
                payslips.map((payslip, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {payslip.period || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {formatCurrency(payslip.grossPay || 0, payslip.currency || 'USD')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {formatCurrency(payslip.totalDeductions || 0, payslip.currency || 'USD')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(payslip.netPay || 0, payslip.currency || 'USD')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        payslip.status === 'paid' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                        payslip.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                        'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                      }`}>
                        {payslip.status || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => downloadPayslip(payslip._id)}
                        className="text-purple-600 hover:text-purple-700 font-medium"
                      >
                        Download
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-8">
                    <EmptyState title="No payslips available" message="No payslips were found for the selected period." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EmployeePayrollView;
