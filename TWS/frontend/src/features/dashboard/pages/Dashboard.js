import React from 'react';
import { useAuth } from '../../../app/providers/AuthContext';
import { 
  UsersIcon, 
  ClockIcon, 
  ClipboardDocumentListIcon, 
  CurrencyDollarIcon,
  ChartBarIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

const Dashboard = () => {
  const { user } = useAuth();

  const stats = [
    {
      name: 'Total Employees',
      value: '24',
      change: '+2',
      changeType: 'positive',
      icon: UsersIcon,
    },
    {
      name: 'Active Tasks',
      value: '12',
      change: '+3',
      changeType: 'positive',
      icon: ClipboardDocumentListIcon,
    },
    {
      name: 'Present Today',
      value: '18',
      change: '-1',
      changeType: 'negative',
      icon: ClockIcon,
    },
    {
      name: 'Monthly Payroll',
      value: '$45,200',
      change: '+5.2%',
      changeType: 'positive',
      icon: CurrencyDollarIcon,
    },
  ];

  const recentActivities = [
    {
      id: 1,
      type: 'check-in',
      user: 'John Doe',
      time: '2 minutes ago',
      icon: CheckCircleIcon,
    },
    {
      id: 2,
      type: 'task-completed',
      user: 'Jane Smith',
      time: '15 minutes ago',
      icon: ClipboardDocumentListIcon,
    },
    {
      id: 3,
      type: 'payroll-approved',
      user: 'Mike Johnson',
      time: '1 hour ago',
      icon: CurrencyDollarIcon,
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Welcome Section */}
      <div className="wolfstack-card-premium wolfstack-animate-fadeIn">
        <div className="px-6 py-8 sm:p-8">
          <div className="flex items-center justify-between">
            <div>
                      <h1 className="wolfstack-heading-2 text-gray-900 dark:text-gray-100">
                        Welcome back, {user?.fullName}! 👋
                      </h1>
                      <p className="mt-2 wolfstack-text-body text-gray-600 dark:text-gray-300">
                        Here's what's happening with your team today. Stay productive and organized.
                      </p>
            </div>
            <div className="hidden sm:block">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-500 via-accent-600 to-primary-700 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-2xl">🚀</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="wolfstack-grid-4">
        {stats.map((stat, index) => (
          <div key={stat.name} className={`wolfstack-stats-card-premium wolfstack-animate-fadeIn`} style={{ animationDelay: `${index * 0.1}s` }}>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                            <div className="w-12 h-12 bg-gradient-to-br from-primary-100 to-accent-100 rounded-xl flex items-center justify-center">
                              <stat.icon className="h-6 w-6 text-primary-600" aria-hidden="true" />
                            </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="wolfstack-text-small text-gray-600 dark:text-gray-400 font-medium">
                      {stat.name}
                    </p>
                    <div className="flex items-baseline mt-1">
                      <p className="wolfstack-heading-4 text-gray-900 dark:text-gray-100">
                        {stat.value}
                      </p>
                      <span className={`ml-2 wolfstack-badge ${
                        stat.changeType === 'positive' ? 'wolfstack-badge-success' : 'wolfstack-badge-error'
                      }`}>
                        {stat.change}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {/* Recent Activity */}
        <div className="wolfstack-card wolfstack-animate-fadeIn" style={{ animationDelay: '0.4s' }}>
          <div className="px-6 py-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
                      <h3 className="wolfstack-heading-4 text-gray-900 dark:text-gray-100">
                        Recent Activity
                      </h3>
                      <div className="w-8 h-8 bg-gradient-to-br from-primary-100 to-accent-100 dark:from-primary-900/50 dark:to-accent-900/50 rounded-lg flex items-center justify-center">
                        <span className="text-primary-600 dark:text-primary-400 text-sm">📊</span>
                      </div>
            </div>
            <div className="flow-root">
              <ul className="-mb-8">
                {recentActivities.map((activity, activityIdx) => (
                  <li key={activity.id}>
                    <div className="relative pb-8">
                      {activityIdx !== recentActivities.length - 1 ? (
                        <span
                          className="absolute top-6 left-6 -ml-px h-full w-0.5 bg-gradient-to-b from-blue-200 to-transparent"
                          aria-hidden="true"
                        />
                      ) : null}
                      <div className="relative flex space-x-4">
                        <div>
                                  <span className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-600 flex items-center justify-center shadow-md ring-4 ring-white">
                                    <activity.icon className="h-6 w-6 text-white" aria-hidden="true" />
                                  </span>
                        </div>
                        <div className="min-w-0 flex-1 pt-2 flex justify-between space-x-4">
                          <div>
                            <p className="wolfstack-text-small text-gray-600 dark:text-gray-400">
                              <span className="font-semibold text-gray-900 dark:text-gray-100">{activity.user}</span>{' '}
                              {activity.type === 'check-in' && 'checked in'}
                              {activity.type === 'task-completed' && 'completed a task'}
                              {activity.type === 'payroll-approved' && 'approved payroll'}
                            </p>
                          </div>
                          <div className="text-right text-sm whitespace-nowrap text-gray-500 dark:text-gray-400 font-medium">
                            {activity.time}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="wolfstack-card wolfstack-animate-fadeIn" style={{ animationDelay: '0.5s' }}>
          <div className="px-6 py-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
                      <h3 className="wolfstack-heading-4 text-gray-900 dark:text-gray-100">
                        Quick Actions
                      </h3>
                      <div className="w-8 h-8 bg-gradient-to-br from-primary-100 to-accent-100 dark:from-primary-900/50 dark:to-accent-900/50 rounded-lg flex items-center justify-center">
                        <span className="text-primary-600 dark:text-primary-400 text-sm">⚡</span>
                      </div>
            </div>
            <div className="space-y-4">
              <button className="wolfstack-button-primary w-full">
                <ClockIcon className="h-5 w-5 mr-2" />
                Check In/Out
              </button>
              {user?.role === 'hr' || user?.role === 'admin' || user?.role === 'owner' ? (
                <button className="wolfstack-button-ghost w-full">
                  <UsersIcon className="h-5 w-5 mr-2" />
                  Add Employee
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
