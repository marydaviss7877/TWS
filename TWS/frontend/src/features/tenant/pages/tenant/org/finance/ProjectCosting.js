import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  ChartBarIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  CurrencyDollarIcon,
  ClockIcon,
  UserGroupIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { tenantApiService } from '../../../../../../shared/services/tenant/tenant-api.service';

const ProjectCosting = () => {
  const { tenantSlug } = useParams();
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [detailData, setDetailData] = useState({
    costs: null,
    profitability: null,
    budgetVsActual: null,
    forecast: null,
    resourceAllocation: null,
    loading: false
  });
  const [activeTab, setActiveTab] = useState('costs');
  const [editingProject, setEditingProject] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    profitability: 'all',
    client: 'all',
    status: 'all'
  });
  const [formData, setFormData] = useState({
    name: '',
    clientId: '',
    startDate: '',
    endDate: '',
    budget: 0,
    hourlyRate: 0,
    estimatedHours: 0,
    description: '',
    status: 'active'
  });

  useEffect(() => {
    fetchData();
  }, [tenantSlug]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch projects with costing data
      const projectsData = await tenantApiService.getProjects(tenantSlug);
      
      // Enhance projects with costing information
      const projectsWithCosting = (projectsData || []).map(project => ({
        ...project,
        actualHours: project.actualHours || 0,
        actualCost: project.actualCost || 0,
        revenue: project.revenue || project.budget || 0,
        profit: (project.revenue || project.budget || 0) - (project.actualCost || 0),
        margin: project.budget > 0 
          ? (((project.revenue || project.budget || 0) - (project.actualCost || 0)) / (project.revenue || project.budget || 1)) * 100 
          : 0
      }));
      
      setProjects(projectsWithCosting);

      // Fetch clients
      try {
        const clientsData = await tenantApiService.getClients(tenantSlug);
        // Handle different response formats - ensure we always have an array
        let clientsArray = [];
        if (Array.isArray(clientsData)) {
          clientsArray = clientsData;
        } else if (clientsData && Array.isArray(clientsData.data)) {
          clientsArray = clientsData.data;
        } else if (clientsData && Array.isArray(clientsData.clients)) {
          clientsArray = clientsData.clients;
        } else if (clientsData && typeof clientsData === 'object') {
          // If it's an object but not an array, try to extract array from common properties
          clientsArray = clientsData.list || clientsData.items || [];
        }
        setClients(clientsArray);
      } catch (err) {
        console.error('Error fetching clients:', err);
        setClients([]);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      on_hold: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      over_budget: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
  };

  const getMarginColor = (margin) => {
    if (margin > 20) return 'text-green-600 dark:text-green-400';
    if (margin > 10) return 'text-blue-600 dark:text-blue-400';
    if (margin > 0) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString();
  };

  const getFilteredProjects = () => {
    let filtered = projects;
    
    if (searchTerm) {
      filtered = filtered.filter(project =>
        project.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.clientName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filters.profitability !== 'all') {
      filtered = filtered.filter(project => {
        const margin = project.margin || 0;
        if (filters.profitability === 'profitable' && margin <= 10) return false;
        if (filters.profitability === 'break_even' && (margin < 0 || margin > 10)) return false;
        if (filters.profitability === 'loss' && margin >= 0) return false;
        return true;
      });
    }
    
    if (filters.client !== 'all') {
      filtered = filtered.filter(project => project.clientId === filters.client || project.clientName === filters.client);
    }
    
    if (filters.status !== 'all') {
      filtered = filtered.filter(project => project.status === filters.status);
    }
    
    return filtered;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingProject) {
        await tenantApiService.updateProject(tenantSlug, editingProject._id, formData);
      } else {
        await tenantApiService.createProject(tenantSlug, formData);
      }
      
      setShowForm(false);
      setEditingProject(null);
      setFormData({
        name: '',
        clientId: '',
        startDate: '',
        endDate: '',
        budget: 0,
        hourlyRate: 0,
        estimatedHours: 0,
        description: '',
        status: 'active'
      });
      fetchData();
    } catch (error) {
      console.error('Error saving project:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading project costing data...</p>
        </div>
      </div>
    );
  }

  const handleViewDetails = async (project) => {
    setSelectedProject(project);
    setShowDetailModal(true);
    setDetailData({ ...detailData, loading: true });

    try {
      // Fetch all detail data in parallel
      const [costs, profitability, budgetVsActual, forecast, resourceAllocation] = await Promise.all([
        tenantApiService.getProjectCosts(tenantSlug, project._id).catch(() => null),
        tenantApiService.getProjectProfitability(tenantSlug, project._id).catch(() => null),
        tenantApiService.getBudgetVsActual(tenantSlug, project._id).catch(() => null),
        tenantApiService.getProjectForecast(tenantSlug, project._id).catch(() => null),
        tenantApiService.getResourceAllocation(tenantSlug, project._id).catch(() => null)
      ]);

      setDetailData({
        costs: costs?.data || costs || null,
        profitability: profitability?.data || profitability || null,
        budgetVsActual: budgetVsActual?.data || budgetVsActual || null,
        forecast: forecast?.data || forecast || null,
        resourceAllocation: resourceAllocation?.data || resourceAllocation || null,
        loading: false
      });
    } catch (error) {
      console.error('Error fetching project details:', error);
      setDetailData({ ...detailData, loading: false });
    }
  };

  const filteredProjects = getFilteredProjects();
  const totalRevenue = projects.reduce((sum, p) => sum + (p.revenue || 0), 0);
  const totalProfit = projects.reduce((sum, p) => sum + (p.profit || 0), 0);
  const avgMargin = projects.length > 0 
    ? (projects.reduce((sum, p) => sum + (p.margin || 0), 0) / projects.length).toFixed(1)
    : 0;

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Header */}
      <div className="glass-card-premium">
        <div className="px-6 py-8 sm:p-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl xl:text-3xl font-bold font-heading text-gray-900 dark:text-white">
                Project Costing & Profitability 📊
              </h1>
              <p className="mt-2 text-sm xl:text-base text-gray-600 dark:text-gray-300">
                Track budgets, actual costs, and margins for all your software house projects
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                  Budget Tracking
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                  Profitability Analysis
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                  Cost Control
                </span>
              </div>
            </div>
            <div className="hidden sm:block">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-700 rounded-2xl flex items-center justify-center shadow-lg">
                <ChartBarIcon className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>
          <div className="mt-6">
            <button
              onClick={() => setShowForm(true)}
              className="glass-button px-4 py-2 rounded-xl hover-scale flex items-center gap-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white"
            >
              <PlusIcon className="w-5 h-5" />
              <span className="font-medium">New Project</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 xl:gap-6">
        <div className="glass-card-premium p-5 xl:p-6 hover-lift">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 xl:w-14 xl:h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-glow-lg">
              <ChartBarIcon className="w-6 h-6 xl:w-7 xl:h-7 text-white" />
            </div>
            <div>
              <p className="text-xs xl:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Total Projects
              </p>
              <p className="text-2xl xl:text-3xl font-bold font-heading text-gray-900 dark:text-white">
                {projects.length}
              </p>
            </div>
          </div>
        </div>
        <div className="glass-card-premium p-5 xl:p-6 hover-lift">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 xl:w-14 xl:h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-glow-lg">
              <CurrencyDollarIcon className="w-6 h-6 xl:w-7 xl:h-7 text-white" />
            </div>
            <div>
              <p className="text-xs xl:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Total Revenue
              </p>
              <p className="text-2xl xl:text-3xl font-bold font-heading text-gray-900 dark:text-white">
                {formatCurrency(totalRevenue)}
              </p>
            </div>
          </div>
        </div>
        <div className="glass-card-premium p-5 xl:p-6 hover-lift">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 xl:w-14 xl:h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-glow-lg">
              <ArrowTrendingUpIcon className="w-6 h-6 xl:w-7 xl:h-7 text-white" />
            </div>
            <div>
              <p className="text-xs xl:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Total Profit
              </p>
              <p className="text-2xl xl:text-3xl font-bold font-heading text-gray-900 dark:text-white">
                {formatCurrency(totalProfit)}
              </p>
            </div>
          </div>
        </div>
        <div className="glass-card-premium p-5 xl:p-6 hover-lift">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 xl:w-14 xl:h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-glow-lg">
              <ClockIcon className="w-6 h-6 xl:w-7 xl:h-7 text-white" />
            </div>
            <div>
              <p className="text-xs xl:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Avg Margin
              </p>
              <p className="text-2xl xl:text-3xl font-bold font-heading text-gray-900 dark:text-white">
                {avgMargin}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="glass-card-premium">
        <div className="px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50">
          <h2 className="text-lg xl:text-xl font-bold font-heading text-gray-900 dark:text-white flex items-center">
            <MagnifyingGlassIcon className="h-5 w-5 mr-2 text-indigo-600 dark:text-indigo-400" />
            Search & Filter
          </h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="glass-input w-full pl-10 pr-4 py-3 text-sm font-medium rounded-xl"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 block">Profitability</label>
              <select
                value={filters.profitability}
                onChange={(e) => setFilters({...filters, profitability: e.target.value})}
                className="glass-input w-full px-4 py-3 text-sm font-medium rounded-xl"
              >
                <option value="all">All Projects</option>
                <option value="profitable">Profitable (&gt;10%)</option>
                <option value="break_even">Break Even (0-10%)</option>
                <option value="loss">Loss (&lt;0%)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 block">Client</label>
              <select
                value={filters.client}
                onChange={(e) => setFilters({...filters, client: e.target.value})}
                className="glass-input w-full px-4 py-3 text-sm font-medium rounded-xl"
              >
                <option value="all">All Clients</option>
                {clients.map(client => (
                  <option key={client._id} value={client._id}>{client.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilters({ profitability: 'all', client: 'all', status: 'all' });
                }}
                className="glass-button px-4 py-2 rounded-xl hover-scale flex items-center gap-2 w-full"
              >
                <FunnelIcon className="h-4 w-4" />
                <span className="font-medium">Clear</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Projects Table */}
      <div className="glass-card-premium">
        <div className="px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50">
          <h2 className="text-lg xl:text-xl font-bold font-heading text-gray-900 dark:text-white flex items-center">
            <DocumentTextIcon className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
            Projects ({filteredProjects.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          {filteredProjects.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="glass-card">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Budget
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actual Cost
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Profit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Margin
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="glass-card divide-y divide-gray-200 dark:divide-gray-700">
                {filteredProjects.map((project) => {
                  const margin = project.margin || 0;
                  const profit = project.profit || 0;
                  return (
                    <tr key={project._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{project.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDate(project.startDate)} - {formatDate(project.endDate)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">{project.clientName || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(project.budget || 0)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(project.actualCost || 0)}</div>
                          {(project.actualHours || 0) > 0 && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {project.actualHours}h @ {formatCurrency(project.hourlyRate || 0)}/h
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(project.revenue || 0)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium ${profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {formatCurrency(profit)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium ${getMarginColor(margin)}`}>
                          {margin.toFixed(1)}%
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                          {(project.status || 'active').replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => handleViewDetails(project)}
                            className="p-2 text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200"
                            title="View Detailed Costing"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => {
                              setEditingProject(project);
                              setFormData({
                                name: project.name || '',
                                clientId: project.clientId || '',
                                startDate: project.startDate || '',
                                endDate: project.endDate || '',
                                budget: project.budget || 0,
                                hourlyRate: project.hourlyRate || 0,
                                estimatedHours: project.estimatedHours || 0,
                                description: project.description || '',
                                status: project.status || 'active'
                              });
                              setShowForm(true);
                            }}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-all duration-200"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12">
              <ChartBarIcon className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-2">No projects found</p>
              <p className="text-sm text-gray-500 dark:text-gray-500">Create your first project to start tracking costs</p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-4 glass-button px-4 py-2 rounded-xl hover-scale flex items-center gap-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white mx-auto"
              >
                <PlusIcon className="w-5 h-5" />
                <span className="font-medium">Create Project</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Project Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card-premium w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50">
              <h3 className="text-lg xl:text-xl font-bold font-heading text-gray-900 dark:text-white">
                {editingProject ? 'Edit Project' : 'Create New Project'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Set up project budget and costing parameters
              </p>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Project Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="glass-input w-full"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Client *</label>
                  <select
                    value={formData.clientId}
                    onChange={(e) => setFormData({...formData, clientId: e.target.value})}
                    className="glass-input w-full"
                    required
                  >
                    <option value="">Select Client</option>
                    {clients.map(client => (
                      <option key={client._id} value={client._id}>{client.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Start Date *</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    className="glass-input w-full"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">End Date *</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                    className="glass-input w-full"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Budget</label>
                  <input
                    type="number"
                    value={formData.budget}
                    onChange={(e) => setFormData({...formData, budget: parseFloat(e.target.value) || 0})}
                    className="glass-input w-full"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Hourly Rate</label>
                  <input
                    type="number"
                    value={formData.hourlyRate}
                    onChange={(e) => setFormData({...formData, hourlyRate: parseFloat(e.target.value) || 0})}
                    className="glass-input w-full"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Estimated Hours</label>
                  <input
                    type="number"
                    value={formData.estimatedHours}
                    onChange={(e) => setFormData({...formData, estimatedHours: parseFloat(e.target.value) || 0})}
                    className="glass-input w-full"
                    min="0"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="glass-input w-full"
                  >
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="on_hold">On Hold</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="over_budget">Over Budget</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="glass-input w-full"
                  rows="3"
                  placeholder="Project description..."
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingProject(null);
                    setFormData({
                      name: '',
                      clientId: '',
                      startDate: '',
                      endDate: '',
                      budget: 0,
                      hourlyRate: 0,
                      estimatedHours: 0,
                      description: '',
                      status: 'active'
                    });
                  }}
                  className="glass-button px-4 py-2 rounded-xl hover-scale"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="glass-button px-4 py-2 rounded-xl hover-scale bg-gradient-to-r from-primary-500 to-accent-500 text-white"
                >
                  {editingProject ? 'Update' : 'Create'} Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Project Detail Modal */}
      {showDetailModal && selectedProject && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card-premium w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50 flex items-center justify-between">
              <div>
                <h3 className="text-lg xl:text-xl font-bold font-heading text-gray-900 dark:text-white">
                  Project Costing Details: {selectedProject.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Comprehensive cost analysis and profitability metrics
                </p>
              </div>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedProject(null);
                  setDetailData({
                    costs: null,
                    profitability: null,
                    budgetVsActual: null,
                    forecast: null,
                    resourceAllocation: null,
                    loading: false
                  });
                }}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50">
              <div className="flex space-x-1">
                {[
                  { id: 'costs', label: 'Costs', icon: CurrencyDollarIcon },
                  { id: 'profitability', label: 'Profitability', icon: ChartBarIcon },
                  { id: 'budget', label: 'Budget vs Actual', icon: ArrowTrendingUpIcon },
                  { id: 'forecast', label: 'Forecast', icon: ClockIcon },
                  { id: 'resources', label: 'Resources', icon: UserGroupIcon }
                ].map(tab => {
                  const IconComponent = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                        activeTab === tab.id
                          ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <IconComponent className="h-4 w-4" />
                      <span className="text-sm font-medium">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {detailData.loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400">Loading project details...</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Costs Tab */}
                  {activeTab === 'costs' && (
                    <div className="space-y-6">
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white">Cost Breakdown</h4>
                      {detailData.costs ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="glass-card p-4">
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Labor Costs</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                              {formatCurrency(detailData.costs.laborCost || detailData.costs.totalLaborCost || 0)}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              {detailData.costs.totalHours || 0} hours
                            </p>
                          </div>
                          <div className="glass-card p-4">
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Expense Costs</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                              {formatCurrency(detailData.costs.expenseCost || detailData.costs.totalExpenseCost || 0)}
                            </p>
                          </div>
                          <div className="glass-card p-4">
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total Costs</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                              {formatCurrency(detailData.costs.totalCost || 0)}
                            </p>
                          </div>
                          <div className="glass-card p-4">
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Budget</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                              {formatCurrency(selectedProject.budget || 0)}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-500 dark:text-gray-400">No cost data available</p>
                      )}
                    </div>
                  )}

                  {/* Profitability Tab */}
                  {activeTab === 'profitability' && (
                    <div className="space-y-6">
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white">Profitability Analysis</h4>
                      {detailData.profitability ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="glass-card p-4">
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total Revenue</p>
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                              {formatCurrency(detailData.profitability.totalRevenue || detailData.profitability.revenue || 0)}
                            </p>
                          </div>
                          <div className="glass-card p-4">
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total Costs</p>
                            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                              {formatCurrency(detailData.profitability.totalCost || detailData.profitability.cost || 0)}
                            </p>
                          </div>
                          <div className="glass-card p-4">
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Gross Profit</p>
                            <p className={`text-2xl font-bold ${
                              (detailData.profitability.grossProfit || detailData.profitability.profit || 0) >= 0
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}>
                              {formatCurrency(detailData.profitability.grossProfit || detailData.profitability.profit || 0)}
                            </p>
                          </div>
                          <div className="glass-card p-4">
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Profit Margin</p>
                            <p className={`text-2xl font-bold ${
                              (detailData.profitability.profitMargin || detailData.profitability.margin || 0) >= 20
                                ? 'text-green-600 dark:text-green-400'
                                : (detailData.profitability.profitMargin || detailData.profitability.margin || 0) >= 10
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}>
                              {(detailData.profitability.profitMargin || detailData.profitability.margin || 0).toFixed(1)}%
                            </p>
                          </div>
                          {detailData.profitability.roi !== undefined && (
                            <div className="glass-card p-4">
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">ROI</p>
                              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {(detailData.profitability.roi * 100).toFixed(1)}%
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-500 dark:text-gray-400">No profitability data available</p>
                      )}
                    </div>
                  )}

                  {/* Budget vs Actual Tab */}
                  {activeTab === 'budget' && (
                    <div className="space-y-6">
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white">Budget vs Actual</h4>
                      {detailData.budgetVsActual ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="glass-card p-4">
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Budgeted</p>
                              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {formatCurrency(detailData.budgetVsActual.budgeted || detailData.budgetVsActual.budget || 0)}
                              </p>
                            </div>
                            <div className="glass-card p-4">
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Actual</p>
                              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {formatCurrency(detailData.budgetVsActual.actual || detailData.budgetVsActual.totalCost || 0)}
                              </p>
                            </div>
                            <div className="glass-card p-4">
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Variance</p>
                              <p className={`text-2xl font-bold ${
                                (detailData.budgetVsActual.variance || 0) >= 0
                                  ? 'text-green-600 dark:text-green-400'
                                  : 'text-red-600 dark:text-red-400'
                              }`}>
                                {formatCurrency(detailData.budgetVsActual.variance || 0)}
                              </p>
                              <p className={`text-xs mt-1 ${
                                (detailData.budgetVsActual.variancePercentage || 0) >= 0
                                  ? 'text-green-600 dark:text-green-400'
                                  : 'text-red-600 dark:text-red-400'
                              }`}>
                                {(detailData.budgetVsActual.variancePercentage || 0).toFixed(1)}%
                              </p>
                            </div>
                          </div>
                          {detailData.budgetVsActual.categories && (
                            <div className="glass-card p-4">
                              <h5 className="font-semibold text-gray-900 dark:text-white mb-3">By Category</h5>
                              <div className="space-y-2">
                                {Object.entries(detailData.budgetVsActual.categories).map(([category, data]) => (
                                  <div key={category} className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                                    <span className="text-sm text-gray-700 dark:text-gray-300">{category}</span>
                                    <div className="flex gap-4">
                                      <span className="text-sm text-gray-600 dark:text-gray-400">
                                        Budget: {formatCurrency(data.budgeted || 0)}
                                      </span>
                                      <span className="text-sm text-gray-600 dark:text-gray-400">
                                        Actual: {formatCurrency(data.actual || 0)}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-500 dark:text-gray-400">No budget vs actual data available</p>
                      )}
                    </div>
                  )}

                  {/* Forecast Tab */}
                  {activeTab === 'forecast' && (
                    <div className="space-y-6">
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white">Cost Forecast</h4>
                      {detailData.forecast ? (
                        <div className="space-y-4">
                          <div className="glass-card p-4">
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Forecasted Total Cost</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                              {formatCurrency(detailData.forecast.forecastedCost || detailData.forecast.totalForecastedCost || 0)}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              Based on current spending rate
                            </p>
                          </div>
                          {detailData.forecast.monthlyForecast && Array.isArray(detailData.forecast.monthlyForecast) && (
                            <div className="glass-card p-4">
                              <h5 className="font-semibold text-gray-900 dark:text-white mb-3">Monthly Forecast</h5>
                              <div className="space-y-2">
                                {detailData.forecast.monthlyForecast.map((month, idx) => (
                                  <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                                    <span className="text-sm text-gray-700 dark:text-gray-300">
                                      {month.month || `Month ${idx + 1}`}
                                    </span>
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                      {formatCurrency(month.forecastedCost || month.cost || 0)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-500 dark:text-gray-400">No forecast data available</p>
                      )}
                    </div>
                  )}

                  {/* Resources Tab */}
                  {activeTab === 'resources' && (
                    <div className="space-y-6">
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white">Resource Cost Allocation</h4>
                      {detailData.resourceAllocation ? (
                        <div className="space-y-4">
                          {detailData.resourceAllocation.resources && Array.isArray(detailData.resourceAllocation.resources) && (
                            <div className="glass-card p-4">
                              <h5 className="font-semibold text-gray-900 dark:text-white mb-3">By Resource</h5>
                              <div className="space-y-2">
                                {detailData.resourceAllocation.resources.map((resource, idx) => (
                                  <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                                    <div>
                                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                                        {resource.name || resource.resourceName || `Resource ${idx + 1}`}
                                      </span>
                                      <p className="text-xs text-gray-500 dark:text-gray-500">
                                        {resource.hours || 0} hours @ {formatCurrency(resource.rate || 0)}/hr
                                      </p>
                                    </div>
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                      {formatCurrency(resource.totalCost || resource.cost || 0)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="glass-card p-4">
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total Resource Cost</p>
                              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {formatCurrency(detailData.resourceAllocation.totalCost || 0)}
                              </p>
                            </div>
                            <div className="glass-card p-4">
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total Hours</p>
                              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {detailData.resourceAllocation.totalHours || 0}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-500 dark:text-gray-400">No resource allocation data available</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectCosting;

