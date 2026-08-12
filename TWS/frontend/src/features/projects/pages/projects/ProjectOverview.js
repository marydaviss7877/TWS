import React, { useState, useEffect } from 'react';
import { 
  ChartBarIcon, 
  UsersIcon, 
  ClockIcon, 
  CurrencyDollarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  FolderIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';
import projectApiService from '../../services/projectApiService';
import axiosInstance from '../../../../shared/utils/axiosInstance';
import { handleApiError } from '../../utils/errorHandler';
import { PROJECT_STATUS, PROJECT_TYPE } from '../../constants/projectConstants';

const ProjectOverview = () => {
  // Project type display mapping
  const getProjectTypeDisplay = (type) => {
    const types = {
      'web_application': 'Web Application',
      'mobile_app': 'Mobile App',
      'api_development': 'API Development',
      'system_integration': 'System Integration',
      'maintenance_support': 'Maintenance & Support',
      'consulting': 'Consulting',
      'general': 'General'
    };
    return types[type] || 'General';
  };

  const getProjectTypeIcon = (type) => {
    const icons = {
      'web_application': '🌐',
      'mobile_app': '📱',
      'api_development': '🔌',
      'system_integration': '🔗',
      'maintenance_support': '🔧',
      'consulting': '💼',
      'general': '📋'
    };
    return icons[type] || '📋';
  };

  const [metrics, setMetrics] = useState({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    totalTeamMembers: 0,
    onTrackProjects: 0,
    atRiskProjects: 0,
    delayedProjects: 0,
    totalBudget: 0,
    spentBudget: 0,
    totalHours: 0,
    utilization: 0
  });

  const [recentProjects, setRecentProjects] = useState([]);
  const [upcomingMilestones, setUpcomingMilestones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOverviewData();
  }, []);

  const fetchOverviewData = async () => {
    try {
      setLoading(true);
      const [metricsResponse, projectsResponse, milestonesResponse] = await Promise.all([
        projectApiService.getProjectMetrics(),
        projectApiService.getProjects({ limit: 6, sort: 'updatedAt' }),
        axiosInstance.get('/api/projects/milestones/upcoming').catch(() => ({ data: { success: false, data: [] } }))
      ]);

      if (metricsResponse.success && metricsResponse.data) {
        setMetrics({
          totalProjects: metricsResponse.data.totalProjects || 0,
          activeProjects: metricsResponse.data.activeProjects || 0,
          completedProjects: metricsResponse.data.completedProjects || 0,
          totalTeamMembers: metricsResponse.data.totalTeamMembers || 0,
          onTrackProjects: metricsResponse.data.onTrackProjects || 0,
          atRiskProjects: metricsResponse.data.atRiskProjects || 0,
          delayedProjects: metricsResponse.data.delayedProjects || 0,
          totalBudget: metricsResponse.data.totalBudget || 0,
          spentBudget: metricsResponse.data.spentBudget || 0,
          totalHours: metricsResponse.data.totalHours || 0,
          utilization: metricsResponse.data.utilization || 0
        });
      }

      if (projectsResponse.success && projectsResponse.data?.projects) {
        setRecentProjects(projectsResponse.data.projects);
      }

      if (milestonesResponse.data?.success && milestonesResponse.data?.data) {
        setUpcomingMilestones(Array.isArray(milestonesResponse.data.data) ? milestonesResponse.data.data : []);
      }
    } catch (error) {
      handleApiError(error, 'Failed to load overview data', { showToast: false });
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    { 
      label: 'Total Projects', 
      value: metrics.totalProjects, 
      change: '+3 this month',
      icon: FolderIcon, 
      iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-600',
      trend: 'up'
    },
    { 
      label: 'Active Projects', 
      value: metrics.activeProjects, 
      change: '+2 this week',
      icon: ClipboardDocumentListIcon, 
      iconBg: 'bg-gradient-to-br from-green-500 to-emerald-600',
      trend: 'up'
    },
    { 
      label: 'Team Members', 
      value: metrics.totalTeamMembers, 
      change: `${metrics.utilization}% utilized`,
      icon: UsersIcon, 
      iconBg: 'bg-gradient-to-br from-purple-500 to-pink-600'
    },
    { 
      label: 'Total Budget', 
      value: `$${(metrics.totalBudget / 1000).toFixed(0)}K`, 
      change: `$${(metrics.spentBudget / 1000).toFixed(0)}K spent`,
      icon: CurrencyDollarIcon, 
      iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600'
    }
  ];

  const getStatusColor = (status) => {
    const statusColors = {
      'on_track': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
      'at_risk': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
      'delayed': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
    };
    return statusColors[status] || 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'on_track':
        return 'On Track';
      case 'at_risk':
        return 'At Risk';
      case 'delayed':
        return 'Delayed';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="glass-card-premium p-6 hover-glow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">
                  {stat.label}
                </p>
                <p className="text-3xl font-bold font-heading text-gray-900 dark:text-white mb-2">
                  {stat.value}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  {stat.change}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.iconBg}`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Project Health Overview */}
      <div className="glass-card-premium p-6 hover-glow">
        <h3 className="text-lg font-bold font-heading text-gray-900 dark:text-white mb-6">
          Project Health Status
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-card p-4 border-l-4 border-green-500">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">On Track</span>
              <CheckCircleIcon className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-green-600">{metrics.onTrackProjects}</p>
            <div className="mt-3 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full" 
                style={{ width: `${(metrics.onTrackProjects / metrics.activeProjects) * 100}%` }}
              ></div>
            </div>
          </div>

          <div className="glass-card p-4 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">At Risk</span>
              <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />
            </div>
            <p className="text-3xl font-bold text-yellow-600">{metrics.atRiskProjects}</p>
            <div className="mt-3 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-yellow-500 h-2 rounded-full" 
                style={{ width: `${(metrics.atRiskProjects / metrics.activeProjects) * 100}%` }}
              ></div>
            </div>
          </div>

          <div className="glass-card p-4 border-l-4 border-red-500">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Delayed</span>
              <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-3xl font-bold text-red-600">{metrics.delayedProjects}</p>
            <div className="mt-3 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-red-500 h-2 rounded-full" 
                style={{ width: `${(metrics.delayedProjects / metrics.activeProjects) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Projects */}
        <div className="glass-card-premium p-6 hover-glow">
          <h3 className="text-lg font-bold font-heading text-gray-900 dark:text-white mb-4">
            Active Projects
          </h3>
          <div className="space-y-4">
            {recentProjects.map((project) => (
              <div key={project.id} className="glass-card p-4 hover-glow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{getProjectTypeIcon(project.projectType)}</span>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                        {project.name}
                      </h4>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Client: {project.client} • {getProjectTypeDisplay(project.projectType)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 capitalize">
                      {project.methodology} methodology
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${getStatusColor(project.status)}`}>
                    {getStatusLabel(project.status)}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400">Progress</span>
                    <span className="font-bold text-gray-900 dark:text-white">{project.progress}%</span>
                  </div>
                  <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        project.status === 'on_track' ? 'bg-green-500' :
                        project.status === 'at_risk' ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${project.progress}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs mt-3">
                    <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                      <UsersIcon className="w-3 h-3" />
                      <span>{project.team} members</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                      <ClockIcon className="w-3 h-3" />
                      <span>{project.deadline}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Milestones */}
        <div className="glass-card-premium p-6 hover-glow">
          <h3 className="text-lg font-bold font-heading text-gray-900 dark:text-white mb-4">
            Upcoming Milestones
          </h3>
          <div className="space-y-4">
            {upcomingMilestones.map((milestone) => (
              <div key={milestone.id} className="glass-card p-4 hover-glow border-l-4 border-primary-500">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white flex-1">
                    {milestone.title}
                  </h4>
                  <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                    milestone.status === 'in_progress' 
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}>
                    {milestone.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                  Project: {milestone.project}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <ClockIcon className="w-3 h-3" />
                  <span>Due: {milestone.dueDate}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Budget Overview */}
      <div className="glass-card-premium p-6 hover-glow">
        <h3 className="text-lg font-bold font-heading text-gray-900 dark:text-white mb-4">
          Budget Overview
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Allocated</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              ${(metrics.totalBudget / 1000).toFixed(0)}K
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">Spent</p>
            <p className="text-2xl font-bold text-amber-600">
              ${(metrics.spentBudget / 1000).toFixed(0)}K
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">Remaining</p>
            <p className="text-2xl font-bold text-green-600">
              ${((metrics.totalBudget - metrics.spentBudget) / 1000).toFixed(0)}K
            </p>
          </div>
        </div>
        <div className="mt-4">
          <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-amber-500 to-orange-600 h-3 rounded-full" 
              style={{ width: `${(metrics.spentBudget / metrics.totalBudget) * 100}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
            {((metrics.spentBudget / metrics.totalBudget) * 100).toFixed(1)}% of budget utilized
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProjectOverview;
