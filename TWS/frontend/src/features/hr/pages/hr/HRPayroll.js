export { default } from '../../../tenant/pages/tenant/org/software-house/hr/PayrollManagement';
import React from 'react';
import AdminPageTemplate from '../../../../components/AdminPageTemplate/AdminPageTemplate';
import FeatureUnavailable from '../../../../shared/components/feedback/FeatureUnavailable';
import { 
  CurrencyDollarIcon, 
  BanknotesIcon,
  ClockIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

const HRPayroll = () => {
  const stats = [
    { label: 'Total Payroll', value: '$428K', icon: CurrencyDollarIcon, iconBg: 'bg-gradient-to-br from-green-500 to-emerald-600' },
    { label: 'Employees Paid', value: '142', icon: CheckCircleIcon, iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-600' },
    { label: 'Pending Approval', value: '8', icon: ClockIcon, iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600' },
    { label: 'Payroll Cycles', value: '24', icon: BanknotesIcon, iconBg: 'bg-gradient-to-br from-purple-500 to-pink-600' }
  ];

  return (
    <AdminPageTemplate
      title="Payroll Management"
      description="Manage employee compensation and payroll processing"
      stats={stats}
    >
      <div className="glass-card-premium p-6 hover-glow">
        <h3 className="text-lg font-bold font-heading text-gray-900 dark:text-white mb-4">
          Current Payroll Cycle
        </h3>
        <FeatureUnavailable
          title="Payroll processing unavailable"
          description="Payroll processing UI is not available in this release yet."
        />
      </div>
    </AdminPageTemplate>
  );
};

export default HRPayroll;
