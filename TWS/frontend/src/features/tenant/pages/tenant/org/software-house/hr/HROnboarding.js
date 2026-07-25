import React, { useState, useEffect } from 'react';
import { 
  UserPlusIcon, 
  ClipboardDocumentCheckIcon,
  AcademicCapIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { tenantApiService } from '../../../../../../../shared/services/tenant/tenant-api.service';
import { useTenantSlug } from '../../../../../../../shared/hooks/useTenantSlug';

const HROnboarding = () => {
  const tenantSlug = useTenantSlug();
  const [loading, setLoading] = useState(true);
  const [onboardingList, setOnboardingList] = useState([]);
  const [stats, setStats] = useState({
    newHires: 0,
    inProgress: 0,
    completed: 0,
    trainingSessions: 0
  });

  useEffect(() => {
    fetchOnboardingData();
  }, [tenantSlug]);

  const fetchOnboardingData = async () => {
    try {
      setLoading(true);
      const data = await tenantApiService.getOnboardingData(tenantSlug);
      const employees = data?.employees || data?.data?.employees || [];
      const overview = data?.stats || data?.data?.stats || {};
      setOnboardingList(employees);
      setStats({
        newHires: Number(overview.newHires || 0),
        inProgress: Number(overview.inProgress || 0),
        completed: Number(overview.completed || 0),
        trainingSessions: Number(overview.trainingSessions || 0)
      });
    } catch (err) {
      console.error('Error fetching onboarding data:', err);
      setOnboardingList([]);
      setStats({ newHires: 0, inProgress: 0, completed: 0, trainingSessions: 0 });
    } finally {
      setLoading(false);
    }
  };

  const statsData = [
    { label: 'New Hires This Month', value: stats.newHires.toString(), icon: UserPlusIcon, iconBg: 'bg-blue-50 dark:bg-blue-900/20', iconColor: 'text-blue-600 dark:text-blue-400' },
    { label: 'In Progress', value: stats.inProgress.toString(), icon: ClipboardDocumentCheckIcon, iconBg: 'bg-amber-50 dark:bg-amber-900/20', iconColor: 'text-amber-600 dark:text-amber-400' },
    { label: 'Completed', value: stats.completed.toString(), icon: CheckCircleIcon, iconBg: 'bg-green-50 dark:bg-green-900/20', iconColor: 'text-green-600 dark:text-green-400' },
    { label: 'Training Sessions', value: stats.trainingSessions.toString(), icon: AcademicCapIcon, iconBg: 'bg-purple-50 dark:bg-purple-900/20', iconColor: 'text-purple-600 dark:text-purple-400' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading onboarding data...</p>
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
            Onboarding
          </h1>
          <p className="text-sm xl:text-base text-gray-600 dark:text-gray-300 mt-1">
            Manage new employee onboarding processes
          </p>
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

      {/* Active Onboarding */}
      <div className="glass-card-premium p-6 xl:p-8 hover-glow">
        <h3 className="text-lg xl:text-xl font-bold font-heading text-gray-900 dark:text-white mb-6">
          Active Onboarding Processes
        </h3>
        <div className="space-y-4">
          {onboardingList.length === 0 ? (
            <div className="text-center py-12">
              <UserPlusIcon className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">No active onboarding processes</p>
            </div>
          ) : (
            onboardingList.map((employee, index) => (
              <div key={index} className="glass-card p-4 hover-lift">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-sm">{employee.name.charAt(0)}</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">{employee.name}</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{employee.position} • Started {employee.startDate}</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all"
                          style={{ width: `${employee.progress}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">{employee.progress}%</span>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    employee.progress >= 90 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  }`}>
                    {employee.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Onboarding Checklist Template */}
      <div className="glass-card-premium p-6 xl:p-8 hover-glow">
        <h3 className="text-lg xl:text-xl font-bold font-heading text-gray-900 dark:text-white mb-6">
          Standard Onboarding Checklist
        </h3>
        <div className="space-y-3">
          {[
            'Complete HR documentation',
            'IT equipment setup',
            'System access and accounts',
            'Company orientation',
            'Department introduction',
            'Assign mentor/buddy',
            'First project assignment',
            '30-day check-in'
          ].map((item, index) => (
            <div key={index} className="glass-card p-3 flex items-center gap-3">
              <CheckCircleIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              <span className="text-sm text-gray-700 dark:text-gray-300">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HROnboarding;

