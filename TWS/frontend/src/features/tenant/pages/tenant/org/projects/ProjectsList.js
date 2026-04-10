import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  Squares2X2Icon,
  ListBulletIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';
import tenantProjectApiService from './services/tenantProjectApiService';
import { tenantApiService } from '../../../../../../shared/services/tenant/tenant-api.service';
import { PROJECT_STATUS, PROJECT_TYPE } from './constants/projectConstants';
import CreateProjectModal from './components/CreateProjectModal';
import toast from 'react-hot-toast';

const ProjectsList = () => {
  const { tenantSlug } = useParams();
  const navigate = useNavigate();
  
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [groupByDepartment, setGroupByDepartment] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [departments, setDepartments] = useState([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 12;

  const fetchDepartments = useCallback(async () => {
    try {
      const data = await tenantProjectApiService.getDepartments(tenantSlug);
      if (data) {
        setDepartments(Array.isArray(data) ? data : data.departments || []);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  }, [tenantSlug]);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      
      // Backend uses skip/limit, not page/limit
      const skip = (currentPage - 1) * itemsPerPage;
      const params = {
        skip: skip,
        limit: itemsPerPage,
        sort: 'updatedAt'
      };
      
      // Add department filter to API call
      if (departmentFilter !== 'all') {
        params.primaryDepartmentId = departmentFilter;
      }
      
      console.log('📤 Fetching projects with params:', params);

      const response = await tenantProjectApiService.getProjects(tenantSlug, params);

      console.log('🔍 Raw API Response:', response);

      // Check if we got metrics instead of projects (route conflict detection)
      if (response && typeof response === 'object' && response.totalProjects !== undefined && !response.projects) {
        console.error('❌ API returned metrics instead of projects! This indicates a route conflict.');
        console.error('Response structure:', Object.keys(response));
        toast.error('API route conflict detected. Please check backend routes.');
        setProjects([]);
        setTotalPages(1);
        setLoading(false);
        return;
      }
      
      // Backend returns: { success: true, data: { projects: [...], pagination: {...} } }
      // After processResponse (data.data || data): { projects: [...], pagination: {...} }
      let projectsList = [];
      let pagination = null;
      
      // Handle the processed response structure
      if (response && typeof response === 'object') {
        // Check if response has projects array directly
        if (Array.isArray(response.projects)) {
          projectsList = response.projects;
          pagination = response.pagination || {};
        } 
        // Check if response has data property with projects
        else if (response.data && Array.isArray(response.data.projects)) {
          projectsList = response.data.projects;
          pagination = response.data.pagination || {};
        }
        // Check if response is directly an array (fallback)
        else if (Array.isArray(response)) {
          projectsList = response;
          pagination = { total: response.length, limit: itemsPerPage, skip: skip };
        }
        // Check for nested success structure
        else if (response.success && response.data) {
          if (Array.isArray(response.data.projects)) {
            projectsList = response.data.projects;
            pagination = response.data.pagination || {};
          } else if (Array.isArray(response.data)) {
            projectsList = response.data;
            pagination = { total: response.data.length, limit: itemsPerPage, skip: skip };
          }
        }
      }
      
      // Validate we got projects
      if (!Array.isArray(projectsList)) {
        console.error('❌ Invalid response structure - projects is not an array:', response);
        console.error('Response keys:', response ? Object.keys(response) : 'null');
        projectsList = [];
      }

      // Extract pagination info
      const total = pagination?.total || projectsList.length;
      const calculatedTotalPages = total > 0 ? Math.ceil(total / itemsPerPage) : 1;

      console.log('✅ Projects loaded:', {
        count: projectsList.length,
        total,
        currentPage,
        totalPages: calculatedTotalPages,
        pagination
      });
      
      setProjects(projectsList);
      setTotalPages(calculatedTotalPages);
      
    } catch (error) {
      console.error('❌ Error fetching projects:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        data: error.data
      });
      toast.error(error.message || 'Failed to load projects');
      setProjects([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, currentPage, departmentFilter, itemsPerPage]);

  useEffect(() => {
    if (tenantSlug) {
      fetchDepartments();
    }
  }, [tenantSlug, fetchDepartments]);
  
  useEffect(() => {
    if (tenantSlug) {
      fetchProjects();
    }
  }, [tenantSlug, fetchProjects]);

  // Filter projects based on search and filters
  useEffect(() => {
    let filtered = [...projects];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(project => {
        const name = (project.name || project.title || '').toLowerCase();
        const description = (project.description || '').toLowerCase();
        const client = (project.clientId?.name || project.client || '').toLowerCase();
        const query = searchQuery.toLowerCase();
        return name.includes(query) || description.includes(query) || client.includes(query);
      });
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(project => {
        const status = project.status || project.healthStatus || '';
        return status.toLowerCase() === statusFilter.toLowerCase();
      });
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(project => {
        const type = project.projectType || project.type || '';
        return type.toLowerCase() === typeFilter.toLowerCase();
      });
    }

    // Department filter (client-side fallback if API filter didn't work)
    if (departmentFilter !== 'all') {
      filtered = filtered.filter(project => {
        const primaryDept = project.primaryDepartmentId?._id || project.primaryDepartmentId;
        const deptArray = project.departments || [];
        const deptIds = deptArray.map(d => d._id || d);
        return primaryDept === departmentFilter || deptIds.includes(departmentFilter);
      });
    }

    setFilteredProjects(filtered);
  }, [projects, searchQuery, statusFilter, typeFilter, departmentFilter]);

  // Group projects by department
  const groupedProjects = groupByDepartment ? filteredProjects.reduce((acc, project) => {
    const deptId = project.primaryDepartmentId?._id || project.primaryDepartmentId || 'unassigned';
    const deptName = project.primaryDepartmentId?.name || 'Unassigned';
    
    if (!acc[deptId]) {
      acc[deptId] = {
        department: { _id: deptId, name: deptName },
        projects: []
      };
    }
    acc[deptId].projects.push(project);
    return acc;
  }, {}) : null;

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

  const getStatusColor = (status) => {
    const statusColors = {
      'on_track': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
      'at_risk': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
      'delayed': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
      'active': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
      'completed': 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
      'planning': 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
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
      case 'active':
        return 'Active';
      case 'completed':
        return 'Completed';
      case 'planning':
        return 'Planning';
      default:
        return status?.charAt(0).toUpperCase() + status?.slice(1) || 'Unknown';
    }
  };

  const handleProjectCreated = () => {
    setIsCreateModalOpen(false);
    // Reset to first page and refresh projects
    setCurrentPage(1);
    // Use setTimeout to ensure state updates before fetching
    setTimeout(() => {
      fetchProjects();
    }, 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading projects...</p>
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
            All Projects
          </h1>
          <p className="text-sm xl:text-base text-gray-600 dark:text-gray-300 mt-1">
            View and manage all your projects
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="glass-button px-4 py-2 rounded-xl hover-scale flex items-center gap-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white"
        >
          <PlusIcon className="w-5 h-5" />
          <span className="font-medium">New Project</span>
        </button>
      </div>

      {/* Quick Department Filter Chips */}
      {departments.length > 0 && (
        <div className="glass-card-premium p-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Quick Filters:</span>
            <button
              onClick={() => setDepartmentFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                departmentFilter === 'all'
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              All Departments
            </button>
            {departments.map(dept => (
              <button
                key={dept._id}
                onClick={() => setDepartmentFilter(dept._id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  departmentFilter === dept._id
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {dept.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="glass-card-premium p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="on_track">On Track</option>
            <option value="at_risk">At Risk</option>
            <option value="delayed">Delayed</option>
            <option value="completed">Completed</option>
            <option value="planning">Planning</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="web_application">Web Application</option>
            <option value="mobile_app">Mobile App</option>
            <option value="api_development">API Development</option>
            <option value="system_integration">System Integration</option>
            <option value="maintenance_support">Maintenance & Support</option>
            <option value="consulting">Consulting</option>
            <option value="general">General</option>
          </select>

          {/* Department Filter */}
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">All Departments</option>
            {departments.map(dept => (
              <option key={dept._id} value={dept._id}>
                {dept.name}
              </option>
            ))}
          </select>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow' : ''}`}
            >
              <Squares2X2Icon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow' : ''}`}
            >
              <ListBulletIcon className="w-5 h-5" />
            </button>
          </div>
          
          {/* Group By Department Toggle */}
          <button
            onClick={() => setGroupByDepartment(!groupByDepartment)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              groupByDepartment
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <UserGroupIcon className="w-4 h-4 inline mr-2" />
            Group by Dept
          </button>
        </div>
      </div>

      {/* Projects Display */}
      {filteredProjects.length > 0 ? (
        <>
          {groupByDepartment && groupedProjects ? (
            <div className="space-y-6">
              {Object.values(groupedProjects).map((group) => (
                <div key={group.department._id} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <UserGroupIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      {group.department.name}
                    </h3>
                    <span className="px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-sm font-semibold">
                      {group.projects.length} {group.projects.length === 1 ? 'project' : 'projects'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ml-9">
                    {group.projects.map((project) => (
                      <div
                        key={project._id || project.id}
                        className="glass-card-premium p-6 hover-glow cursor-pointer transition-all"
                        onClick={() => navigate(`/${tenantSlug}/org/projects/${project._id || project.id}/board`)}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                              {project.name || project.title || 'Unnamed Project'}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {project.clientId?.name || project.client || 'No client'}
                            </p>
                          </div>
                          <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${getStatusColor(project.status || project.healthStatus)}`}>
                            {getStatusLabel(project.status || project.healthStatus)}
                          </span>
                        </div>
                        {project.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                            {project.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/${tenantSlug}/org/projects/${project._id || project.id}/board`);
                            }}
                            className="flex-1 px-3 py-2 text-xs font-medium bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project) => (
                <div
                  key={project._id || project.id}
                  className="glass-card-premium p-6 hover-glow cursor-pointer transition-all"
                  onClick={() => navigate(`/${tenantSlug}/org/projects/${project._id || project.id}/board`)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                        {project.name || project.title || 'Unnamed Project'}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {project.clientId?.name || project.client || 'No client'}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${getStatusColor(project.status || project.healthStatus)}`}>
                      {getStatusLabel(project.status || project.healthStatus)}
                    </span>
                  </div>

                  {project.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                      {project.description}
                    </p>
                  )}

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <BuildingOfficeIcon className="w-4 h-4" />
                      <span>{getProjectTypeDisplay(project.projectType || project.type)}</span>
                    </div>
                    {project.primaryDepartmentId && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <UserGroupIcon className="w-4 h-4" />
                        <span>Dept: {project.primaryDepartmentId?.name || 'N/A'}</span>
                      </div>
                    )}
                    {project.timeline?.startDate && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <CalendarDaysIcon className="w-4 h-4" />
                        <span>Started: {new Date(project.timeline.startDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    {project.budget?.total && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <CurrencyDollarIcon className="w-4 h-4" />
                        <span>Budget: ${(project.budget.total / 1000).toFixed(0)}K</span>
                      </div>
                    )}
                  </div>

                  {(project.metrics?.completionRate !== undefined || project.progress !== undefined) && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600 dark:text-gray-400">Progress</span>
                        <span className="font-bold text-gray-900 dark:text-white">
                          {Math.round(project.metrics?.completionRate || project.progress || 0)}%
                        </span>
                      </div>
                      <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-primary-500 to-accent-500 h-2 rounded-full transition-all"
                          style={{ width: `${project.metrics?.completionRate || project.progress || 0}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/${tenantSlug}/org/projects/${project._id || project.id}/board`);
                      }}
                      className="flex-1 px-3 py-2 text-xs font-medium bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors flex items-center justify-center gap-1"
                    >
                      <EyeIcon className="w-4 h-4" />
                      View
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/${tenantSlug}/org/projects/${project._id || project.id}/board`);
                      }}
                      className="px-3 py-2 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      <ChartBarIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProjects.map((project) => (
                <div
                  key={project._id || project.id}
                  className="glass-card-premium p-6 hover-glow cursor-pointer"
                  onClick={() => navigate(`/${tenantSlug}/org/projects/${project._id || project.id}/board`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                          {project.name || project.title || 'Unnamed Project'}
                        </h3>
                        <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${getStatusColor(project.status || project.healthStatus)}`}>
                          {getStatusLabel(project.status || project.healthStatus)}
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {getProjectTypeDisplay(project.projectType || project.type)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {project.clientId?.name || project.client || 'No client'}
                      </p>
                      {project.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
                          {project.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      {(project.metrics?.completionRate !== undefined || project.progress !== undefined) && (
                        <div className="text-right">
                          <p className="text-sm font-bold text-gray-900 dark:text-white">
                            {Math.round(project.metrics?.completionRate || project.progress || 0)}%
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Progress</p>
                        </div>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/${tenantSlug}/org/projects/${project._id || project.id}/board`);
                        }}
                        className="px-4 py-2 text-sm font-medium bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="glass-card-premium p-12 text-center">
          <BuildingOfficeIcon className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            {searchQuery || statusFilter !== 'all' || typeFilter !== 'all' || departmentFilter !== 'all' 
              ? 'No projects found' 
              : 'No projects yet'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {searchQuery || statusFilter !== 'all' || typeFilter !== 'all' || departmentFilter !== 'all'
              ? 'Try adjusting your filters or search query'
              : 'Create your first project to get started'}
          </p>
          {!searchQuery && statusFilter === 'all' && typeFilter === 'all' && departmentFilter === 'all' && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="glass-button px-4 py-2 rounded-xl hover-scale flex items-center gap-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white mx-auto"
            >
              <PlusIcon className="w-5 h-5" />
              <span className="font-medium">Create Project</span>
            </button>
          )}
        </div>
      )}

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onProjectCreated={handleProjectCreated}
      />
    </div>
  );
};

export default ProjectsList;

