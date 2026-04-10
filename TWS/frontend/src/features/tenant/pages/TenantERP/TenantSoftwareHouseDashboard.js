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
  ClipboardDocumentListIcon,
  CodeBracketIcon,
  BugAntIcon,
  StarIcon,
  RocketLaunchIcon,
  CogIcon,
  ShieldCheckIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  WrenchScrewdriverIcon,
  ComputerDesktopIcon,
  ServerIcon
} from '@heroicons/react/24/outline';

const TenantSoftwareHouseDashboard = () => {
  const [tenantInfo, setTenantInfo] = useState({
    name: 'WolfStack Technologies',
    erpCategory: 'software_house',
    status: 'active',
    softwareHouseConfig: {
      defaultMethodology: 'agile',
      supportedMethodologies: ['agile', 'scrum', 'kanban'],
      techStack: {
        frontend: ['React', 'Vue.js', 'Angular'],
        backend: ['Node.js', 'Python', 'Java'],
        database: ['MongoDB', 'PostgreSQL', 'Redis'],
        cloud: ['AWS', 'Azure', 'Google Cloud'],
        tools: ['Git', 'Docker', 'Jenkins']
      },
      supportedProjectTypes: ['web_application', 'mobile_app', 'api_development'],
      developmentSettings: {
        defaultSprintDuration: 14,
        storyPointScale: 'fibonacci',

        clientPortalEnabled: true,
        codeQualityTracking: true,
      },
      billingConfig: {
        defaultHourlyRate: 75,
        currency: 'USD',
        billingCycle: 'monthly',
        invoiceTemplate: 'standard',
        autoInvoiceGeneration: false
      },
      teamConfig: {
        maxTeamSize: 25,
        allowRemoteWork: true,
        requireTimeTracking: true,
        allowOvertime: true,
        maxOvertimeHours: 20
      },
      qualityConfig: {
        codeReviewRequired: true,
        testingRequired: true,
        documentationRequired: true,
        minCodeCoverage: 85,
        maxTechnicalDebt: 15
      }
    }
  });

  const [metrics, setMetrics] = useState({
    totalProjects: 12,
    activeProjects: 8,
    completedProjects: 4,
    totalTeamMembers: 18,
    onTrackProjects: 6,
    atRiskProjects: 2,
    delayedProjects: 0,
    totalBudget: 450000,
    spentBudget: 180000,
    totalHours: 4200,
    utilization: 85,
    velocity: 24,
    codeCoverage: 88,
    clientSatisfaction: 4.7,
    bugCount: 3,
    featuresDelivered: 28,
    activeSprints: 3,
    completedSprints: 12
  });

  const [recentProjects, setRecentProjects] = useState([
    { 
      id: 1, 
      name: 'E-Commerce Platform', 
      client: 'TechCorp', 
      status: 'on_track', 
      progress: 75, 
      deadline: '2025-11-15', 
      team: 6, 
      projectType: 'web_application', 
      methodology: 'scrum',
      budget: 120000,
      spent: 90000,
      techStack: ['React', 'Node.js', 'MongoDB']
    },
    { 
      id: 2, 
      name: 'Mobile Banking App', 
      client: 'FinanceHub', 
      status: 'at_risk', 
      progress: 45, 
      deadline: '2025-10-30', 
      team: 8, 
      projectType: 'mobile_app', 
      methodology: 'agile',
      budget: 150000,
      spent: 67500,
      techStack: ['React Native', 'Node.js', 'PostgreSQL']
    },
    { 
      id: 3, 
      name: 'API Development', 
      client: 'DataCorp', 
      status: 'on_track', 
      progress: 60, 
      deadline: '2025-11-05', 
      team: 3, 
      projectType: 'api_development', 
      methodology: 'agile',
      budget: 60000,
      spent: 36000,
      techStack: ['Python', 'FastAPI', 'PostgreSQL']
    }
  ]);

  const [activeSprints, setActiveSprints] = useState([
    {
      id: 1,
      name: 'Sprint 2 - Core Features',
      project: 'E-Commerce Platform',
      progress: 65,
      storyPoints: 28,
      team: 6,
      endDate: '2025-10-30',
      methodology: 'scrum'
    },
    {
      id: 2,
      name: 'Sprint 1 - User Auth',
      project: 'Mobile Banking App',
      progress: 85,
      storyPoints: 24,
      team: 8,
      endDate: '2025-10-25',
      methodology: 'agile'
    }
  ]);

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

  const getStatusColor = (status) => {
    switch (status) {
      case 'on_track': return 'bg-green-100 text-green-800 border-green-200';
      case 'at_risk': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'delayed': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'on_track': return 'On Track';
      case 'at_risk': return 'At Risk';
      case 'delayed': return 'Delayed';
      default: return 'Unknown';
    }
  };

  const stats = [
    { 
      label: 'Active Projects', 
      value: metrics.activeProjects, 
      change: '+1 this month',
      icon: FolderIcon, 
      iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-600',
      trend: 'up'
    },
    { 
      label: 'Team Velocity', 
      value: metrics.velocity, 
      change: '+8% from last sprint',
      icon: ChartBarIcon, 
      iconBg: 'bg-gradient-to-br from-green-500 to-emerald-600',
      trend: 'up'
    },
    { 
      label: 'Code Coverage', 
      value: `${metrics.codeCoverage}%`, 
      change: '+3% this week',
      icon: CodeBracketIcon, 
      iconBg: 'bg-gradient-to-br from-purple-500 to-violet-600',
      trend: 'up'
    },
    { 
      label: 'Client Satisfaction', 
      value: metrics.clientSatisfaction, 
      change: '+0.1 this month',
      icon: StarIcon, 
      iconBg: 'bg-gradient-to-br from-yellow-500 to-orange-600',
      trend: 'up'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {tenantInfo.name} - Software House ERP
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Software Development Company • {tenantInfo.status.charAt(0).toUpperCase() + tenantInfo.status.slice(1)} Status
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm text-gray-600 dark:text-gray-400">Last updated</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {new Date().toLocaleTimeString()}
            </p>
          </div>
          <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
            <RocketLaunchIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
        </div>
      </div>

      {/* Software House Configuration Overview */}
      <div className="glass-card-premium p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Software House Configuration</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Development Methodologies */}
          <div className="glass-card p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <CogIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white">Methodologies</h4>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Default:</span>
                <span className="font-semibold text-gray-900 dark:text-white capitalize">
                  {tenantInfo.softwareHouseConfig.defaultMethodology}
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {tenantInfo.softwareHouseConfig.supportedMethodologies.map((methodology, index) => (
                  <span key={index} className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-xs">
                    {methodology}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Technology Stack */}
          <div className="glass-card p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <ComputerDesktopIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white">Tech Stack</h4>
            </div>
            <div className="space-y-2">
              <div className="text-sm">
                <span className="text-gray-600 dark:text-gray-400">Frontend: </span>
                <span className="text-gray-900 dark:text-white">
                  {tenantInfo.softwareHouseConfig.techStack.frontend.join(', ')}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-gray-600 dark:text-gray-400">Backend: </span>
                <span className="text-gray-900 dark:text-white">
                  {tenantInfo.softwareHouseConfig.techStack.backend.join(', ')}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-gray-600 dark:text-gray-400">Database: </span>
                <span className="text-gray-900 dark:text-white">
                  {tenantInfo.softwareHouseConfig.techStack.database.join(', ')}
                </span>
              </div>
            </div>
          </div>

          {/* Development Settings */}
          <div className="glass-card p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <WrenchScrewdriverIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white">Settings</h4>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Sprint Duration:</span>
                <span className="text-gray-900 dark:text-white">
                  {tenantInfo.softwareHouseConfig.developmentSettings.defaultSprintDuration} days
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Story Points:</span>
                <span className="text-gray-900 dark:text-white capitalize">
                  {tenantInfo.softwareHouseConfig.developmentSettings.storyPointScale}
                </span>
              </div>
            </div>
          </div>

          {/* Billing Configuration */}
          <div className="glass-card p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <CurrencyDollarIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white">Billing</h4>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Hourly Rate:</span>
                <span className="text-gray-900 dark:text-white">
                  ${tenantInfo.softwareHouseConfig.billingConfig.defaultHourlyRate}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Currency:</span>
                <span className="text-gray-900 dark:text-white">
                  {tenantInfo.softwareHouseConfig.billingConfig.currency}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Billing Cycle:</span>
                <span className="text-gray-900 dark:text-white capitalize">
                  {tenantInfo.softwareHouseConfig.billingConfig.billingCycle}
                </span>
              </div>
            </div>
          </div>

          {/* Team Configuration */}
          <div className="glass-card p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
                <UsersIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white">Team</h4>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Max Team Size:</span>
                <span className="text-gray-900 dark:text-white">
                  {tenantInfo.softwareHouseConfig.teamConfig.maxTeamSize}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Remote Work:</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  tenantInfo.softwareHouseConfig.teamConfig.allowRemoteWork
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}>
                  {tenantInfo.softwareHouseConfig.teamConfig.allowRemoteWork ? 'Allowed' : 'Not Allowed'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Time Tracking:</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  tenantInfo.softwareHouseConfig.teamConfig.requireTimeTracking
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}>
                  {tenantInfo.softwareHouseConfig.teamConfig.requireTimeTracking ? 'Required' : 'Optional'}
                </span>
              </div>
            </div>
          </div>

          {/* Quality Configuration */}
          <div className="glass-card p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                <ShieldCheckIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white">Quality</h4>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Min Code Coverage:</span>
                <span className="text-gray-900 dark:text-white">
                  {tenantInfo.softwareHouseConfig.qualityConfig.minCodeCoverage}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Code Review:</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  tenantInfo.softwareHouseConfig.qualityConfig.codeReviewRequired
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}>
                  {tenantInfo.softwareHouseConfig.qualityConfig.codeReviewRequired ? 'Required' : 'Optional'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Testing:</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  tenantInfo.softwareHouseConfig.qualityConfig.testingRequired
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}>
                  {tenantInfo.softwareHouseConfig.qualityConfig.testingRequired ? 'Required' : 'Optional'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="glass-card-premium p-6 hover-glow">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${stat.iconBg}`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <div className="flex items-center gap-1">
                {stat.trend === 'up' ? (
                  <ArrowTrendingUpIcon className="w-4 h-4 text-green-600" />
                ) : (
                  <ArrowTrendingUpIcon className="w-4 h-4 text-red-600 rotate-180" />
                )}
                <span className="text-xs text-gray-600 dark:text-gray-400">{stat.change}</span>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {stat.value}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Project Health Overview */}
      <div className="glass-card-premium p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Project Health Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <CheckCircleIcon className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.onTrackProjects}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">On Track</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <ExclamationTriangleIcon className="w-8 h-8 text-yellow-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.atRiskProjects}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">At Risk</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.delayedProjects}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Delayed</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Projects */}
        <div className="glass-card-premium p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Active Projects</h3>
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
                      Client: {project.client} • {project.methodology} methodology
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      Tech: {project.techStack.join(', ')}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      Budget: ${project.budget.toLocaleString()} • Spent: ${project.spent.toLocaleString()}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-lg text-xs font-semibold border ${getStatusColor(project.status)}`}>
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
                      <span>Due {new Date(project.deadline).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active Sprints */}
        <div className="glass-card-premium p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Active Sprints</h3>
          <div className="space-y-4">
            {activeSprints.map((sprint) => (
              <div key={sprint.id} className="glass-card p-4 hover-glow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                      {sprint.name}
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {sprint.project} • {sprint.methodology} methodology
                    </p>
                  </div>
                  <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-xs font-bold">
                    {sprint.storyPoints}pts
                  </span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400">Sprint Progress</span>
                    <span className="font-bold text-gray-900 dark:text-white">{sprint.progress}%</span>
                  </div>
                  <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full"
                      style={{ width: `${sprint.progress}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs mt-3">
                    <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                      <UsersIcon className="w-3 h-3" />
                      <span>{sprint.team} members</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                      <ClockIcon className="w-3 h-3" />
                      <span>Ends {new Date(sprint.endDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="glass-card-premium p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="glass-card p-4 hover-glow text-left transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <FolderIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="font-semibold text-gray-900 dark:text-white">Create Project</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">Start a new development project</p>
          </button>
          
          <button className="glass-card p-4 hover-glow text-left transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <RocketLaunchIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <span className="font-semibold text-gray-900 dark:text-white">Start Sprint</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">Begin a new sprint cycle</p>
          </button>
          
          <button className="glass-card p-4 hover-glow text-left transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <ChartBarIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="font-semibold text-gray-900 dark:text-white">View Analytics</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">Check development metrics</p>
          </button>
          
          <button className="glass-card p-4 hover-glow text-left transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <ClipboardDocumentListIcon className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <span className="font-semibold text-gray-900 dark:text-white">Manage Tasks</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">Update task status</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TenantSoftwareHouseDashboard;
