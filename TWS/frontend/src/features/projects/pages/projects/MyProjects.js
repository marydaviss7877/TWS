import React, { useState } from 'react';
import { useAuth } from '../../../../app/providers/AuthContext';
import { 
  FolderIcon, 
  MagnifyingGlassIcon, 
  FunnelIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  UsersIcon,
  ClockIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

const MyProjects = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRole, setFilterRole] = useState('all');

  // Mock data - in production, fetch from API filtered by user
  const [myProjects, setMyProjects] = useState([
    {
      id: 1,
      name: 'E-Commerce Platform',
      description: 'Building a full-featured e-commerce platform with advanced analytics',
      client: 'TechCorp Inc.',
      status: 'in_progress',
      role: 'Project Manager',
      progress: 75,
      startDate: '2025-08-01',
      deadline: '2025-11-15',
      team: [
        { name: 'John Doe', role: 'Developer', avatar: 'JD' },
        { name: 'Jane Smith', role: 'Designer', avatar: 'JS' },
        { name: 'Mike Johnson', role: 'QA', avatar: 'MJ' }
      ],
      tasks: { total: 45, completed: 34, inProgress: 8, todo: 3 },
      priority: 'high'
    },
    {
      id: 2,
      name: 'Mobile Banking App',
      description: 'Secure mobile banking application with biometric authentication',
      client: 'FinanceHub',
      status: 'in_progress',
      role: 'Lead Developer',
      progress: 45,
      startDate: '2025-09-01',
      deadline: '2025-10-30',
      team: [
        { name: 'Sarah Lee', role: 'Developer', avatar: 'SL' },
        { name: 'Tom Brown', role: 'Security Expert', avatar: 'TB' }
      ],
      tasks: { total: 38, completed: 17, inProgress: 12, todo: 9 },
      priority: 'critical'
    },
    {
      id: 3,
      name: 'CRM System',
      description: 'Customer relationship management system with AI-powered insights',
      client: 'SalesMax',
      status: 'in_progress',
      role: 'Team Member',
      progress: 90,
      startDate: '2025-07-15',
      deadline: '2025-10-20',
      team: [
        { name: 'Alice Wang', role: 'Developer', avatar: 'AW' }
      ],
      tasks: { total: 32, completed: 29, inProgress: 2, todo: 1 },
      priority: 'medium'
    },
    {
      id: 4,
      name: 'Marketing Website Redesign',
      description: 'Complete redesign of corporate marketing website',
      client: 'BrandCo',
      status: 'planning',
      role: 'Consultant',
      progress: 15,
      startDate: '2025-10-01',
      deadline: '2025-12-15',
      team: [
        { name: 'Emily Chen', role: 'Designer', avatar: 'EC' }
      ],
      tasks: { total: 22, completed: 3, inProgress: 4, todo: 15 },
      priority: 'low'
    }
  ]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'in_progress':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
      case 'planning':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300';
      case 'on_hold':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300';
      case 'completed':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
      case 'high':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300';
      case 'medium':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300';
      case 'low':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
    }
  };

  const filteredProjects = myProjects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.client.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || project.status === filterStatus;
    const matchesRole = filterRole === 'all' || project.role === filterRole;
    return matchesSearch && matchesStatus && matchesRole;
  });

  const stats = {
    total: myProjects.length,
    inProgress: myProjects.filter(p => p.status === 'in_progress').length,
    planning: myProjects.filter(p => p.status === 'planning').length,
    avgProgress: Math.round(myProjects.reduce((acc, p) => acc + p.progress, 0) / myProjects.length)
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card-premium p-4 hover-glow">
          <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">My Projects</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
        </div>
        <div className="glass-card-premium p-4 hover-glow">
          <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">In Progress</p>
          <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
        </div>
        <div className="glass-card-premium p-4 hover-glow">
          <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">Planning</p>
          <p className="text-2xl font-bold text-purple-600">{stats.planning}</p>
        </div>
        <div className="glass-card-premium p-4 hover-glow">
          <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">Avg Progress</p>
          <p className="text-2xl font-bold text-green-600">{stats.avgProgress}%</p>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card-premium p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search my projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 glass-input"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="glass-input px-4 py-2"
          >
            <option value="all">All Status</option>
            <option value="in_progress">In Progress</option>
            <option value="planning">Planning</option>
            <option value="on_hold">On Hold</option>
            <option value="completed">Completed</option>
          </select>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="glass-input px-4 py-2"
          >
            <option value="all">All Roles</option>
            <option value="Project Manager">Project Manager</option>
            <option value="Lead Developer">Lead Developer</option>
            <option value="Team Member">Team Member</option>
            <option value="Consultant">Consultant</option>
          </select>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredProjects.map((project) => (
          <div key={project.id} className="glass-card-premium p-6 hover-glow">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {project.name}
                  </h3>
                  <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${getPriorityColor(project.priority)}`}>
                    {project.priority}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {project.description}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mb-2">
                  Client: {project.client}
                </p>
                <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${getStatusColor(project.status)}`}>
                  {project.status.replace('_', ' ')}
                </span>
              </div>
            </div>

            {/* Role Badge */}
            <div className="mb-4">
              <span className="px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-xs font-semibold">
                {project.role}
              </span>
            </div>

            {/* Progress */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600 dark:text-gray-400">Progress</span>
                <span className="font-bold text-gray-900 dark:text-white">{project.progress}%</span>
              </div>
              <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-primary-500 to-accent-500 h-2 rounded-full transition-all"
                  style={{ width: `${project.progress}%` }}
                ></div>
              </div>
            </div>

            {/* Tasks Summary */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              <div className="glass-card p-2 text-center">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{project.tasks.total}</p>
              </div>
              <div className="glass-card p-2 text-center">
                <p className="text-xs text-green-600 dark:text-green-400 mb-1">Done</p>
                <p className="text-lg font-bold text-green-600">{project.tasks.completed}</p>
              </div>
              <div className="glass-card p-2 text-center">
                <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Active</p>
                <p className="text-lg font-bold text-blue-600">{project.tasks.inProgress}</p>
              </div>
              <div className="glass-card p-2 text-center">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Todo</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{project.tasks.todo}</p>
              </div>
            </div>

            {/* Timeline */}
            <div className="flex items-center gap-4 mb-4 text-xs">
              <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                <CalendarIcon className="w-4 h-4" />
                <span>Start: {project.startDate}</span>
              </div>
              <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                <ClockIcon className="w-4 h-4" />
                <span>Due: {project.deadline}</span>
              </div>
            </div>

            {/* Team */}
            <div className="mb-4">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 font-semibold">Team Members</p>
              <div className="flex items-center gap-2">
                {project.team.map((member) => (
                  <div
                    key={member.name}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-xs font-bold"
                    title={`${member.name} - ${member.role}`}
                  >
                    {member.avatar}
                  </div>
                ))}
                <span className="text-xs text-gray-600 dark:text-gray-400 ml-1">
                  {project.team.length} member{project.team.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button className="flex-1 glass-button px-4 py-2 rounded-xl hover-scale text-sm font-semibold text-gray-700 dark:text-gray-300">
                <EyeIcon className="w-4 h-4 inline mr-2" />
                View Details
              </button>
              <button className="glass-button px-4 py-2 rounded-xl hover-scale text-sm font-semibold text-gray-700 dark:text-gray-300">
                <PencilIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredProjects.length === 0 && (
        <div className="glass-card-premium p-12 text-center">
          <FolderIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            No projects found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Try adjusting your filters or search terms
          </p>
        </div>
      )}
    </div>
  );
};

export default MyProjects;
