import React, { useState } from 'react';
import { 
  UsersIcon, 
  MagnifyingGlassIcon,
  ChartBarIcon,
  PlusIcon,
  UserCircleIcon,
  BriefcaseIcon,
  ClockIcon,
  FolderIcon
} from '@heroicons/react/24/outline';

const ProjectResources = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterAvailability, setFilterAvailability] = useState('all');

  // Mock data - in production, fetch from API
  const [resources, setResources] = useState([
    {
      id: 1,
      name: 'John Doe',
      email: 'john.doe@company.com',
      role: 'Senior Developer',
      department: 'Engineering',
      skills: ['React', 'Node.js', 'Python', 'AWS'],
      projects: [
        { name: 'E-Commerce Platform', allocation: 60, role: 'Lead Developer' },
        { name: 'CRM System', allocation: 40, role: 'Developer' }
      ],
      totalAllocation: 100,
      availableHours: 0,
      hoursThisWeek: 40,
      hoursThisMonth: 160,
      status: 'fully_allocated'
    },
    {
      id: 2,
      name: 'Jane Smith',
      email: 'jane.smith@company.com',
      role: 'UI/UX Designer',
      department: 'Design',
      skills: ['Figma', 'Adobe XD', 'Sketch', 'User Research'],
      projects: [
        { name: 'E-Commerce Platform', allocation: 50, role: 'Lead Designer' }
      ],
      totalAllocation: 50,
      availableHours: 20,
      hoursThisWeek: 20,
      hoursThisMonth: 80,
      status: 'available'
    },
    {
      id: 3,
      name: 'Mike Johnson',
      email: 'mike.johnson@company.com',
      role: 'Backend Developer',
      department: 'Engineering',
      skills: ['Java', 'Spring Boot', 'PostgreSQL', 'Docker'],
      projects: [
        { name: 'Mobile Banking App', allocation: 80, role: 'Backend Lead' }
      ],
      totalAllocation: 80,
      availableHours: 8,
      hoursThisWeek: 32,
      hoursThisMonth: 128,
      status: 'available'
    },
    {
      id: 4,
      name: 'Sarah Lee',
      email: 'sarah.lee@company.com',
      role: 'Full Stack Developer',
      department: 'Engineering',
      skills: ['React', 'Python', 'Django', 'MongoDB'],
      projects: [
        { name: 'Mobile Banking App', allocation: 60, role: 'Frontend Developer' },
        { name: 'Marketing Website', allocation: 30, role: 'Developer' }
      ],
      totalAllocation: 90,
      availableHours: 4,
      hoursThisWeek: 36,
      hoursThisMonth: 144,
      status: 'available'
    },
    {
      id: 5,
      name: 'Tom Brown',
      email: 'tom.brown@company.com',
      role: 'QA Engineer',
      department: 'Quality Assurance',
      skills: ['Selenium', 'Jest', 'Cypress', 'Manual Testing'],
      projects: [
        { name: 'E-Commerce Platform', allocation: 100, role: 'QA Lead' }
      ],
      totalAllocation: 100,
      availableHours: 0,
      hoursThisWeek: 40,
      hoursThisMonth: 160,
      status: 'fully_allocated'
    },
    {
      id: 6,
      name: 'Alice Wang',
      email: 'alice.wang@company.com',
      role: 'DevOps Engineer',
      department: 'Infrastructure',
      skills: ['AWS', 'Kubernetes', 'Terraform', 'CI/CD'],
      projects: [],
      totalAllocation: 0,
      availableHours: 40,
      hoursThisWeek: 0,
      hoursThisMonth: 0,
      status: 'available'
    }
  ]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
      case 'fully_allocated':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
      case 'over_allocated':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
    }
  };

  const getAllocationColor = (allocation) => {
    if (allocation === 0) return 'bg-gray-500';
    if (allocation <= 50) return 'bg-green-500';
    if (allocation <= 80) return 'bg-yellow-500';
    if (allocation <= 100) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const filteredResources = resources.filter(resource => {
    const matchesSearch = resource.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         resource.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         resource.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || resource.role === filterRole;
    const matchesAvailability = filterAvailability === 'all' || resource.status === filterAvailability;
    return matchesSearch && matchesRole && matchesAvailability;
  });

  const stats = {
    totalResources: resources.length,
    available: resources.filter(r => r.status === 'available').length,
    fullyAllocated: resources.filter(r => r.status === 'fully_allocated').length,
    avgUtilization: Math.round(resources.reduce((acc, r) => acc + r.totalAllocation, 0) / resources.length)
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card-premium p-4 hover-glow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">Total Resources</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalResources}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-primary-600 flex items-center justify-center">
              <UsersIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        <div className="glass-card-premium p-4 hover-glow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">Available</p>
              <p className="text-2xl font-bold text-green-600">{stats.available}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <UserCircleIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        <div className="glass-card-premium p-4 hover-glow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">Fully Allocated</p>
              <p className="text-2xl font-bold text-red-600">{stats.fullyAllocated}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center">
              <BriefcaseIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        <div className="glass-card-premium p-4 hover-glow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">Avg Utilization</p>
              <p className="text-2xl font-bold text-accent-600">{stats.avgUtilization}%</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-500 to-pink-600 flex items-center justify-center">
              <ChartBarIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card-premium p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search resources..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 glass-input"
            />
          </div>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="glass-input px-4 py-2"
          >
            <option value="all">All Roles</option>
            <option value="Senior Developer">Senior Developer</option>
            <option value="UI/UX Designer">UI/UX Designer</option>
            <option value="Backend Developer">Backend Developer</option>
            <option value="Full Stack Developer">Full Stack Developer</option>
            <option value="QA Engineer">QA Engineer</option>
            <option value="DevOps Engineer">DevOps Engineer</option>
          </select>
          <select
            value={filterAvailability}
            onChange={(e) => setFilterAvailability(e.target.value)}
            className="glass-input px-4 py-2"
          >
            <option value="all">All Availability</option>
            <option value="available">Available</option>
            <option value="fully_allocated">Fully Allocated</option>
            <option value="over_allocated">Over Allocated</option>
          </select>
          <button className="glass-button px-4 py-2 rounded-xl hover-scale bg-gradient-to-r from-primary-500 to-accent-500 text-white font-semibold">
            <PlusIcon className="w-5 h-5 inline mr-2" />
            Add Resource
          </button>
        </div>
      </div>

      {/* Utilization Overview */}
      <div className="glass-card-premium p-6">
        <h3 className="text-lg font-bold font-heading text-gray-900 dark:text-white mb-6">
          Team Utilization Overview
        </h3>
        <div className="space-y-4">
          {filteredResources.map((resource) => (
            <div key={resource.id} className="glass-card p-4 hover-glow">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-sm font-bold">
                    {resource.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">{resource.name}</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{resource.role} • {resource.department}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${getStatusColor(resource.status)}`}>
                  {resource.status.replace('_', ' ')}
                </span>
              </div>

              {/* Utilization Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-gray-600 dark:text-gray-400">Utilization</span>
                  <span className="font-bold text-gray-900 dark:text-white">{resource.totalAllocation}%</span>
                </div>
                <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full ${getAllocationColor(resource.totalAllocation)}`}
                    style={{ width: `${Math.min(resource.totalAllocation, 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Skills */}
              <div className="mb-4">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 font-semibold">Skills</p>
                <div className="flex flex-wrap gap-2">
                  {resource.skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded text-xs font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Projects */}
              {resource.projects.length > 0 ? (
                <div className="mb-4">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 font-semibold">Current Projects</p>
                  <div className="space-y-2">
                    {resource.projects.map((project) => (
                      <div key={project.name} className="glass-card p-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FolderIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          <span className="text-xs text-gray-900 dark:text-white font-medium">{project.name}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-500">• {project.role}</span>
                        </div>
                        <span className="text-xs font-bold text-gray-900 dark:text-white">{project.allocation}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mb-4 text-center py-4 glass-card">
                  <p className="text-xs text-gray-500 dark:text-gray-500">No active projects</p>
                </div>
              )}

              {/* Hours Summary */}
              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Available Hours</p>
                  <p className="text-lg font-bold text-green-600">{resource.availableHours}h</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">This Week</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{resource.hoursThisWeek}h</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">This Month</p>
                  <p className="text-lg font-bold text-blue-600">{resource.hoursThisMonth}h</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {filteredResources.length === 0 && (
        <div className="glass-card-premium p-12 text-center">
          <UsersIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            No resources found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Try adjusting your filters or search terms
          </p>
        </div>
      )}
    </div>
  );
};

export default ProjectResources;