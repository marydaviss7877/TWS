import React, { useState } from 'react';
import { 
  FlagIcon, 
  PlusIcon, 
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  ChartBarIcon,
  CalendarIcon,
  LinkIcon
} from '@heroicons/react/24/outline';

const ProjectMilestones = () => {
  const [viewMode, setViewMode] = useState('timeline'); // 'timeline' or 'list'

  // Mock data - in production, fetch from API
  const [milestones, setMilestones] = useState([
    {
      id: 1,
      title: 'Project Kickoff',
      description: 'Initial project setup and team onboarding',
      project: 'E-Commerce Platform',
      status: 'completed',
      dueDate: '2025-08-01',
      completedDate: '2025-08-01',
      progress: 100,
      tasks: { total: 5, completed: 5 },
      dependencies: [],
      owner: { name: 'John Doe', avatar: 'JD' }
    },
    {
      id: 2,
      title: 'Design Phase Complete',
      description: 'All UI/UX designs approved and finalized',
      project: 'E-Commerce Platform',
      status: 'completed',
      dueDate: '2025-09-01',
      completedDate: '2025-08-30',
      progress: 100,
      tasks: { total: 12, completed: 12 },
      dependencies: [1],
      owner: { name: 'Jane Smith', avatar: 'JS' }
    },
    {
      id: 3,
      title: 'Backend API Development',
      description: 'RESTful API with authentication and core features',
      project: 'E-Commerce Platform',
      status: 'in_progress',
      dueDate: '2025-10-15',
      completedDate: null,
      progress: 75,
      tasks: { total: 20, completed: 15 },
      dependencies: [2],
      owner: { name: 'Mike Johnson', avatar: 'MJ' }
    },
    {
      id: 4,
      title: 'Frontend Development',
      description: 'Complete frontend implementation with React',
      project: 'E-Commerce Platform',
      status: 'in_progress',
      dueDate: '2025-10-20',
      completedDate: null,
      progress: 60,
      tasks: { total: 18, completed: 11 },
      dependencies: [2],
      owner: { name: 'Sarah Lee', avatar: 'SL' }
    },
    {
      id: 5,
      title: 'Integration Testing',
      description: 'End-to-end testing of all features',
      project: 'E-Commerce Platform',
      status: 'pending',
      dueDate: '2025-10-25',
      completedDate: null,
      progress: 0,
      tasks: { total: 10, completed: 0 },
      dependencies: [3, 4],
      owner: { name: 'Tom Brown', avatar: 'TB' }
    },
    {
      id: 6,
      title: 'User Acceptance Testing',
      description: 'Client review and feedback',
      project: 'E-Commerce Platform',
      status: 'pending',
      dueDate: '2025-11-01',
      completedDate: null,
      progress: 0,
      tasks: { total: 8, completed: 0 },
      dependencies: [5],
      owner: { name: 'Alice Wang', avatar: 'AW' }
    },
    {
      id: 7,
      title: 'Production Deployment',
      description: 'Final deployment to production environment',
      project: 'E-Commerce Platform',
      status: 'pending',
      dueDate: '2025-11-15',
      completedDate: null,
      progress: 0,
      tasks: { total: 6, completed: 0 },
      dependencies: [6],
      owner: { name: 'John Doe', avatar: 'JD' }
    }
  ]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-500';
      case 'in_progress':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-500';
      case 'at_risk':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-500';
      case 'delayed':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-500';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-500';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
      case 'in_progress':
        return <ClockIcon className="w-5 h-5 text-blue-600" />;
      case 'at_risk':
        return <ExclamationCircleIcon className="w-5 h-5 text-yellow-600" />;
      case 'delayed':
        return <ExclamationCircleIcon className="w-5 h-5 text-red-600" />;
      default:
        return <FlagIcon className="w-5 h-5 text-gray-600" />;
    }
  };

  const stats = {
    total: milestones.length,
    completed: milestones.filter(m => m.status === 'completed').length,
    inProgress: milestones.filter(m => m.status === 'in_progress').length,
    pending: milestones.filter(m => m.status === 'pending').length,
    avgProgress: Math.round(milestones.reduce((acc, m) => acc + m.progress, 0) / milestones.length)
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="glass-card-premium p-4 hover-glow">
          <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">Total Milestones</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
        </div>
        <div className="glass-card-premium p-4 hover-glow">
          <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">Completed</p>
          <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
        </div>
        <div className="glass-card-premium p-4 hover-glow">
          <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">In Progress</p>
          <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
        </div>
        <div className="glass-card-premium p-4 hover-glow">
          <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">Pending</p>
          <p className="text-2xl font-bold text-gray-600">{stats.pending}</p>
        </div>
        <div className="glass-card-premium p-4 hover-glow">
          <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">Avg Progress</p>
          <p className="text-2xl font-bold text-accent-600">{stats.avgProgress}%</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('timeline')}
            className={`glass-button px-4 py-2 rounded-xl hover-scale ${
              viewMode === 'timeline' ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white' : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            <ChartBarIcon className="w-5 h-5 inline mr-2" />
            Timeline View
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`glass-button px-4 py-2 rounded-xl hover-scale ${
              viewMode === 'list' ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white' : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            <FlagIcon className="w-5 h-5 inline mr-2" />
            List View
          </button>
        </div>
        <button className="glass-button px-4 py-2 rounded-xl hover-scale bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold">
          <PlusIcon className="w-5 h-5 inline mr-2" />
          Add Milestone
        </button>
      </div>

      {/* Timeline View */}
      {viewMode === 'timeline' && (
        <div className="glass-card-premium p-6">
          <h3 className="text-lg font-bold font-heading text-gray-900 dark:text-white mb-6">
            Project Timeline
          </h3>
          <div className="space-y-6">
            {milestones.map((milestone, index) => (
              <div key={milestone.id} className="relative">
                {/* Connection Line */}
                {index < milestones.length - 1 && (
                  <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gray-300 dark:bg-gray-700"></div>
                )}
                
                <div className="flex gap-4">
                  {/* Timeline Marker */}
                  <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center border-4 ${getStatusColor(milestone.status)} bg-white dark:bg-gray-900`}>
                    {getStatusIcon(milestone.status)}
                  </div>

                  {/* Milestone Card */}
                  <div className="flex-1 glass-card p-6 hover-glow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                          {milestone.title}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {milestone.description}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          Project: {milestone.project}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-lg text-xs font-semibold border ${getStatusColor(milestone.status)}`}>
                        {milestone.status.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="text-gray-600 dark:text-gray-400">Progress</span>
                        <span className="font-bold text-gray-900 dark:text-white">{milestone.progress}%</span>
                      </div>
                      <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            milestone.status === 'completed' ? 'bg-green-500' :
                            milestone.status === 'in_progress' ? 'bg-blue-500' :
                            'bg-gray-400'
                          }`}
                          style={{ width: `${milestone.progress}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Tasks Summary */}
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="glass-card p-3">
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Tasks</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">{milestone.tasks.total}</p>
                      </div>
                      <div className="glass-card p-3">
                        <p className="text-xs text-green-600 dark:text-green-400 mb-1">Completed</p>
                        <p className="text-lg font-bold text-green-600">{milestone.tasks.completed}</p>
                      </div>
                      <div className="glass-card p-3">
                        <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Remaining</p>
                        <p className="text-lg font-bold text-blue-600">{milestone.tasks.total - milestone.tasks.completed}</p>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-xs font-bold">
                          {milestone.owner.avatar}
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Owner</p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{milestone.owner.name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-600 dark:text-gray-400">Due Date</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1">
                          <CalendarIcon className="w-4 h-4" />
                          {milestone.dueDate}
                        </p>
                      </div>
                      {milestone.dependencies.length > 0 && (
                        <div className="text-right">
                          <p className="text-xs text-gray-600 dark:text-gray-400">Dependencies</p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1">
                            <LinkIcon className="w-4 h-4" />
                            {milestone.dependencies.length}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="glass-card-premium p-6">
          <h3 className="text-lg font-bold font-heading text-gray-900 dark:text-white mb-6">
            All Milestones
          </h3>
          <div className="space-y-4">
            {milestones.map((milestone) => (
              <div key={milestone.id} className="glass-card p-4 hover-glow">
                <div className="flex items-start justify-between">
                  <div className="flex gap-4 flex-1">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 ${getStatusColor(milestone.status)} bg-white dark:bg-gray-900`}>
                      {getStatusIcon(milestone.status)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                          {milestone.title}
                        </h4>
                        <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${getStatusColor(milestone.status)}`}>
                          {milestone.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                        {milestone.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                        <span>📁 {milestone.project}</span>
                        <span>📅 {milestone.dueDate}</span>
                        <span>✓ {milestone.tasks.completed}/{milestone.tasks.total} tasks</span>
                        <div className="flex items-center gap-1">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-xs font-bold">
                            {milestone.owner.avatar}
                          </div>
                          <span>{milestone.owner.name}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">{milestone.progress}%</p>
                    <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          milestone.status === 'completed' ? 'bg-green-500' :
                          milestone.status === 'in_progress' ? 'bg-blue-500' :
                          'bg-gray-400'
                        }`}
                        style={{ width: `${milestone.progress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectMilestones;