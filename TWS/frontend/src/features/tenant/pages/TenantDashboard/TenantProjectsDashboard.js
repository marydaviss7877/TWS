import React, { useState, useEffect } from 'react';
import { 
  FolderIcon, 
  ClipboardDocumentListIcon, 
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  UserGroupIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  PlusIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { useTenantAuth } from '../../../../app/providers/TenantAuthContext';

const TenantProjectsDashboard = () => {
  const [projectsData, setProjectsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user, tenant, isAuthenticated } = useTenantAuth();

  useEffect(() => {
    if (isAuthenticated) {
      fetchProjectsData();
    }
  }, [isAuthenticated]);

  const fetchProjectsData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Mock data for now - replace with actual API calls
      const mockData = {
        stats: {
          totalProjects: 8,
          activeProjects: 5,
          completedProjects: 2,
          onHoldProjects: 1,
          totalTasks: 45,
          completedTasks: 28,
          overdueTasks: 3,
          totalBudget: 125000,
          spentBudget: 85000,
          remainingBudget: 40000
        },
        recentProjects: [
          { 
            id: 1, 
            name: 'E-commerce Platform', 
            client: 'Client ABC', 
            status: 'active', 
            progress: 75, 
            budget: 25000, 
            spent: 18000,
            deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 15),
            team: ['John Doe', 'Jane Smith', 'Mike Johnson']
          },
          { 
            id: 2, 
            name: 'Mobile App Development', 
            client: 'Client XYZ', 
            status: 'active', 
            progress: 45, 
            budget: 35000, 
            spent: 15000,
            deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
            team: ['Sarah Wilson', 'David Brown']
          },
          { 
            id: 3, 
            name: 'Website Redesign', 
            client: 'Client DEF', 
            status: 'completed', 
            progress: 100, 
            budget: 15000, 
            spent: 15000,
            deadline: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
            team: ['Alex Green', 'Lisa White']
          }
        ],
        recentActivity: [
          { id: 1, type: 'task_completed', message: 'Task "Database Design" completed in E-commerce Platform', timestamp: new Date(Date.now() - 1000 * 60 * 30) },
          { id: 2, type: 'project_created', message: 'New project "Mobile App Development" started', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2) },
          { id: 3, type: 'milestone', message: 'Milestone "Phase 1" completed in Website Redesign', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4) },
          { id: 4, type: 'budget_update', message: 'Budget updated for E-commerce Platform (+$5,000)', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6) }
        ]
      };

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      setProjectsData(mockData);
    } catch (err) {
      console.error('Error fetching projects data:', err);
      setError('Failed to load projects data');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Not Authenticated</h2>
          <p className="text-gray-600">Please log in to access projects dashboard.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="tws-loading-pulse rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading projects dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchProjectsData}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const stats = [
    {
      name: 'Total Projects',
      value: projectsData?.stats?.totalProjects || 0,
      icon: FolderIcon,
      change: '+2',
      changeType: 'positive',
      color: 'blue'
    },
    {
      name: 'Active Projects',
      value: projectsData?.stats?.activeProjects || 0,
      icon: ClockIcon,
      change: '+1',
      changeType: 'positive',
      color: 'green'
    },
    {
      name: 'Completed Tasks',
      value: `${projectsData?.stats?.completedTasks || 0}/${projectsData?.stats?.totalTasks || 0}`,
      icon: CheckCircleIcon,
      change: '+5',
      changeType: 'positive',
      color: 'emerald'
    },
    {
      name: 'Total Budget',
      value: `$${(projectsData?.stats?.totalBudget || 0).toLocaleString()}`,
      icon: CurrencyDollarIcon,
      change: '+$5K',
      changeType: 'positive',
      color: 'purple'
    },
    {
      name: 'Spent Budget',
      value: `$${(projectsData?.stats?.spentBudget || 0).toLocaleString()}`,
      icon: ClipboardDocumentListIcon,
      change: '+$2K',
      changeType: 'neutral',
      color: 'orange'
    },
    {
      name: 'Overdue Tasks',
      value: projectsData?.stats?.overdueTasks || 0,
      icon: ExclamationTriangleIcon,
      change: '-1',
      changeType: 'negative',
      color: 'red'
    }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'on-hold': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getProgressColor = (progress) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 60) return 'bg-blue-500';
    if (progress >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Projects Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              Project management and tracking for {tenant?.name}.
            </p>
          </div>
          <div className="flex space-x-3">
            <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center">
              <PlusIcon className="h-5 w-5 mr-2" />
              New Project
            </button>
            <button className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center">
              <EyeIcon className="h-5 w-5 mr-2" />
              View All
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <div key={stat.name} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className={`w-12 h-12 bg-${stat.color}-100 dark:bg-${stat.color}-900 rounded-lg flex items-center justify-center`}>
                      <stat.icon className={`h-6 w-6 text-${stat.color}-600 dark:text-${stat.color}-400`} />
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.name}</p>
                    <div className="flex items-baseline">
                      <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stat.value}</p>
                      {stat.change && (
                        <p className={`ml-2 text-sm font-medium ${
                          stat.changeType === 'positive' ? 'text-green-600' :
                          stat.changeType === 'negative' ? 'text-red-600' :
                          'text-gray-500'
                        }`}>
                          {stat.change}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Projects Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Recent Projects</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {projectsData?.recentProjects?.map((project) => (
                <div key={project.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">{project.name}</h4>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(project.status)}`}>
                      {project.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Client: {project.client}</p>
                  
                  {/* Progress Bar */}
                  <div className="mb-2">
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                      <span>Progress</span>
                      <span>{project.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${getProgressColor(project.progress)}`}
                        style={{ width: `${project.progress}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                    <span>Budget: ${project.budget.toLocaleString()}</span>
                    <span>Spent: ${project.spent.toLocaleString()}</span>
                  </div>
                  
                  <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <CalendarIcon className="h-4 w-4 mr-1" />
                    <span>Due: {project.deadline.toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Recent Activity</h3>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {projectsData?.recentActivity?.map((activity) => (
              <div key={activity.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{activity.message}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <CheckCircleIcon className="h-5 w-5 text-green-500" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TenantProjectsDashboard;
