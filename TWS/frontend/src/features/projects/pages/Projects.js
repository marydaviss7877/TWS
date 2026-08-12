import React, { useState, useEffect, useRef } from 'react';
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PencilIcon,
  TrashIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../../app/providers/AuthContext';
import ProjectCard from '../../../features/projects/components/ProjectPortal/ProjectCard';
import CreateProjectModal from '../components/ProjectPortal/CreateProjectModal';
import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog';
import ErrorBoundary from '../components/ErrorBoundary';
import projectApiService from '../services/projectApiService';
import { handleApiError, handleSuccess } from '../utils/errorHandler';
import { 
  PROJECT_STATUS, 
  PROJECT_CREATOR_ROLES,
  SUCCESS_MESSAGES 
} from '../constants/projectConstants';

// Portfolio Metrics Component
const PortfolioMetrics = ({ metrics }) => {
  if (!metrics || Object.keys(metrics).length === 0) {
    return null;
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'on_track': 
        return 'text-green-600 bg-green-100';
      case 'at_risk': 
        return 'text-yellow-600 bg-yellow-100';
      case 'overdue': 
        return 'text-red-600 bg-red-100';
      default: 
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="wolfstack-card-elevated p-6 wolfstack-animate-fadeIn">
      <h2 className="wolfstack-heading-3 mb-6">Portfolio Overview</h2>
      
      <div className="wolfstack-grid-4">
        {/* Project Status Distribution */}
        <div className="wolfstack-card p-4 wolfstack-hover-lift">
          <h3 className="wolfstack-heading-4 mb-4">Project Status</h3>
          <div className="space-y-3">
            {metrics.statusDistribution?.map((status) => (
              <div key={status.status} className="flex items-center justify-between">
                <span className={`wolfstack-badge ${getStatusColor(status.status)}`}>
                  {status.status.replace('_', ' ')}
                </span>
                <span className="wolfstack-text-small font-semibold">{status.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Team Utilization */}
        <div className="wolfstack-card p-4 wolfstack-hover-lift">
          <h3 className="wolfstack-heading-4 mb-4">Team Utilization</h3>
          <div className="space-y-3">
            {metrics.utilization?.map((util) => (
              <div key={util.department} className="flex items-center justify-between">
                <span className="wolfstack-text-small">{util.department}</span>
                <span className="wolfstack-text-small font-semibold text-orange-600">{util.percentage}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue Metrics */}
        <div className="wolfstack-card p-4 wolfstack-hover-lift">
          <h3 className="wolfstack-heading-4 mb-4">Revenue</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="wolfstack-text-small">Total Budget</span>
              <span className="wolfstack-text-small font-semibold text-green-600">${metrics.revenue?.totalBudget?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="wolfstack-text-small">Avg Budget</span>
              <span className="wolfstack-text-small font-semibold">${metrics.revenue?.avgBudget?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="wolfstack-text-small">At Risk</span>
              <span className="wolfstack-text-small font-semibold text-red-600">${metrics.revenue?.atRisk?.toLocaleString() || 0}</span>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="wolfstack-card p-4 wolfstack-hover-lift">
          <h3 className="wolfstack-heading-4 mb-4">Performance</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="wolfstack-text-small">Avg Cycle Time</span>
              <span className="wolfstack-text-small font-semibold">{metrics.performance?.avgCycleTime || 0} days</span>
            </div>
            <div className="flex justify-between">
              <span className="wolfstack-text-small">On-Time Delivery</span>
              <span className="wolfstack-text-small font-semibold text-green-600">{metrics.performance?.onTimeDelivery || 0}%</span>
            </div>
            <div className="flex justify-between">
              <span className="wolfstack-text-small">Client Satisfaction</span>
              <span className="wolfstack-text-small font-semibold text-orange-600">{metrics.performance?.clientSatisfaction || 0}/10</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Projects = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [portfolioMetrics, setPortfolioMetrics] = useState({});
  const [loading, setLoading] = useState(true);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [deletingClientId, setDeletingClientId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, onConfirm: null, title: '', message: '' });
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (user) {
      fetchProjects();
      fetchClients();
      fetchPortfolioMetrics();
    }
  }, [user]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await projectApiService.getProjects();
      if (isMountedRef.current && response.success && response.data?.projects) {
        setProjects(response.data.projects);
      }
    } catch (error) {
      if (isMountedRef.current) handleApiError(error, 'Failed to load projects');
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      setClientsLoading(true);
      const response = await projectApiService.getClients();
      if (isMountedRef.current && response.success && response.data?.clients) {
        setClients(response.data.clients);
      }
    } catch (error) {
      if (isMountedRef.current) handleApiError(error, 'Failed to load clients');
    } finally {
      if (isMountedRef.current) setClientsLoading(false);
    }
  };

  const fetchPortfolioMetrics = async () => {
    try {
      setMetricsLoading(true);
      const response = await projectApiService.getProjectMetrics();
      if (isMountedRef.current && response.success && response.data) {
        setPortfolioMetrics(response.data);
      }
    } catch (error) {
      // Silently fail for metrics - not critical
      if (isMountedRef.current) handleApiError(error, null, { showToast: false });
    } finally {
      if (isMountedRef.current) setMetricsLoading(false);
    }
  };

  const handleEditClient = (client) => {
    setEditingClient(client);
    setIsClientModalOpen(true);
  };

  const handleDeleteClient = (clientId) => {
    const client = clients.find(c => c._id === clientId);
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Client',
      message: `Are you sure you want to delete ${client?.name || 'this client'}? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          setDeletingClientId(clientId);
          const response = await projectApiService.deleteClient(clientId);
          if (response.success) {
            handleSuccess(SUCCESS_MESSAGES.CLIENT_DELETED);
            fetchClients();
          } else {
            handleApiError(new Error(response.message || 'Failed to delete client'));
          }
        } catch (error) {
          handleApiError(error, 'Failed to delete client');
        } finally {
          setDeletingClientId(null);
        }
      }
    });
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        project.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    const matchesClient = clientFilter === 'all' || project.clientId === clientFilter;
    
    return matchesSearch && matchesStatus && matchesClient;
  });

  const stats = {
    total: projects.length,
    active: projects.filter(p => p.status === PROJECT_STATUS.ACTIVE).length,
    completed: projects.filter(p => p.status === PROJECT_STATUS.COMPLETED).length,
    onHold: projects.filter(p => p.status === PROJECT_STATUS.ON_HOLD).length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="tws-loading-pulse rounded-full h-32 w-32 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <ErrorBoundary message="Failed to load projects. Please refresh the page.">
    <div className="space-y-8">
      {/* Header Section */}
      <div className="text-center py-8">
        <h1 className="wolfstack-heading-1 mb-4">Project Management Portal</h1>
        <p className="wolfstack-text-body text-gray-600 max-w-2xl mx-auto">
          Streamline your projects, manage clients, and track progress with our comprehensive project management solution.
        </p>
      </div>

      {/* Portfolio Metrics */}
      <PortfolioMetrics metrics={portfolioMetrics} />

      {/* Stats Cards */}
      <div className="wolfstack-grid-4">
        <div className="wolfstack-stats-card wolfstack-hover-lift">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 rounded-xl">
              <ChartBarIcon className="h-8 w-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="wolfstack-text-caption">Total Projects</p>
              <p className="wolfstack-heading-2 text-orange-600">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="wolfstack-stats-card wolfstack-hover-lift">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-xl">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="wolfstack-text-caption">Active</p>
              <p className="wolfstack-heading-2 text-green-600">{stats.active}</p>
            </div>
          </div>
        </div>

        <div className="wolfstack-stats-card wolfstack-hover-lift">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-xl">
              <ExclamationTriangleIcon className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="wolfstack-text-caption">On Hold</p>
              <p className="wolfstack-heading-2 text-yellow-600">{stats.onHold}</p>
            </div>
          </div>
        </div>

        <div className="wolfstack-stats-card wolfstack-hover-lift">
          <div className="flex items-center">
            <div className="p-3 bg-gray-100 rounded-xl">
              <ClockIcon className="h-8 w-8 text-gray-600" />
            </div>
            <div className="ml-4">
              <p className="wolfstack-text-caption">Completed</p>
              <p className="wolfstack-heading-2 text-gray-600">{stats.completed}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Clients Management Section */}
      <div className="wolfstack-card-elevated p-8 wolfstack-animate-fadeIn">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 space-y-4 sm:space-y-0">
          <div>
            <h2 className="wolfstack-heading-3 mb-2">Client Management</h2>
            <p className="wolfstack-text-small text-gray-600">Manage your project clients and their information</p>
          </div>
          <button
            onClick={() => setIsClientModalOpen(true)}
            className="wolfstack-button-primary w-full sm:w-auto"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add New Client
          </button>
        </div>
        
        <div className="wolfstack-grid">
          {clients.map(client => (
            <div key={client._id} className="wolfstack-card p-4 wolfstack-hover-lift">
              <div className="flex justify-between items-start mb-3">
                <h3 className="wolfstack-heading-4">{client.name}</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEditClient(client)}
                    className="text-gray-400 hover:text-blue-600 transition-colors"
                    title="Edit client"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteClient(client._id)}
                    disabled={deletingClientId === client._id}
                    className="text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Delete client"
                  >
                    {deletingClientId === client._id ? (
                      <div className="tws-loading-pulse rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                    ) : (
                      <TrashIcon className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              {client.company && (
                <p className="wolfstack-text-small mb-2">{client.company.name}</p>
              )}
              {client.contact && client.contact.primary && (
                <p className="wolfstack-text-caption">{client.contact.primary.email}</p>
              )}
              <div className="mt-3">
                <span className={`wolfstack-badge ${
                  client.status === 'active' 
                    ? 'wolfstack-badge-success' 
                    : client.status === 'inactive'
                    ? 'wolfstack-badge-error'
                    : 'wolfstack-badge-warning'
                }`}>
                  {client.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Projects Section */}
      <div className="wolfstack-card-elevated p-8 wolfstack-animate-fadeIn">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 space-y-4 sm:space-y-0">
          <div>
            <h2 className="wolfstack-heading-3 mb-2">Your Projects</h2>
            <p className="wolfstack-text-small text-gray-600">Manage and track all your active projects</p>
          </div>
          {PROJECT_CREATOR_ROLES.includes(user?.role) && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="wolfstack-button-primary w-full sm:w-auto"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Create New Project
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="wolfstack-card p-6 mb-8">
          <h3 className="wolfstack-heading-4 mb-4">Filter Projects</h3>
          <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="wolfstack-input pl-10"
              />
            </div>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="wolfstack-select"
          >
            <option value="all">All Status</option>
            <option value={PROJECT_STATUS.ACTIVE}>Active</option>
            <option value={PROJECT_STATUS.ON_HOLD}>On Hold</option>
            <option value={PROJECT_STATUS.COMPLETED}>Completed</option>
            <option value={PROJECT_STATUS.CANCELLED}>Cancelled</option>
          </select>

          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="wolfstack-select"
          >
            <option value="all">All Clients</option>
            {clients.map(client => (
              <option key={client._id} value={client._id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>
      </div>

        {/* Projects Grid */}
        <div className="wolfstack-grid">
          {filteredProjects.map(project => (
            <ProjectCard
              key={project._id}
              project={project}
              onUpdate={fetchProjects}
            />
          ))}
        </div>

        {filteredProjects.length === 0 && (
        <div className="wolfstack-card-elevated p-16 text-center wolfstack-animate-fadeIn">
          <div className="p-4 bg-orange-100 rounded-full w-24 h-24 mx-auto mb-8 flex items-center justify-center">
            <ChartBarIcon className="h-12 w-12 text-orange-600" />
          </div>
          <h3 className="wolfstack-heading-3 mb-4">No projects found</h3>
          <p className="wolfstack-text-body mb-8 max-w-md mx-auto">
            {searchTerm || statusFilter !== 'all' || clientFilter !== 'all'
              ? 'Try adjusting your search or filters to find what you\'re looking for.'
              : 'Get started by creating your first project and begin managing your work efficiently.'
            }
          </p>
          {!searchTerm && statusFilter === 'all' && clientFilter === 'all' && 
           PROJECT_CREATOR_ROLES.includes(user?.role) && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="wolfstack-button-primary"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Create Your First Project
            </button>
          )}
        </div>
        )}
      </div>

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onProjectCreated={fetchProjects}
        clients={clients}
      />

      {/* Add Client Modal */}
      {isClientModalOpen && (
        <div className="wolfstack-modal">
          <div className="wolfstack-modal-content wolfstack-animate-scaleIn">
            <div className="flex items-center justify-between mb-6">
              <h3 className="wolfstack-heading-3">
                {editingClient ? 'Edit Client' : 'Add New Client'}
              </h3>
              <button
                onClick={() => {
                  setIsClientModalOpen(false);
                  setEditingClient(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>
              
            <form onSubmit={async (e) => {
              e.preventDefault();
              
              const formData = new FormData(e.target);
              const clientData = {
                name: formData.get('name'),
                type: 'company',
                company: {
                  name: formData.get('companyName')
                },
                contact: {
                  primary: {
                    email: formData.get('email'),
                    phone: formData.get('phone')
                  }
                },
                status: formData.get('status') || 'active',
                notes: formData.get('notes')
              };

              try {
                let response;
                if (editingClient) {
                  response = await projectApiService.updateClient(editingClient._id, clientData);
                } else {
                  response = await projectApiService.createClient(clientData);
                }
                
                if (response.success) {
                  handleSuccess(editingClient ? SUCCESS_MESSAGES.CLIENT_UPDATED : SUCCESS_MESSAGES.CLIENT_ADDED);
                  setIsClientModalOpen(false);
                  setEditingClient(null);
                  fetchClients();
                  e.target.reset();
                } else {
                  handleApiError(new Error(response.message || `Failed to ${editingClient ? 'update' : 'add'} client`));
                }
              } catch (error) {
                handleApiError(error, `Failed to ${editingClient ? 'update' : 'add'} client`);
              }
            }}>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="wolfstack-text-small font-medium text-gray-700 mb-2 block">Client Name</label>
                    <input
                      type="text"
                      name="name"
                      required
                      defaultValue={editingClient?.name || ''}
                      className="wolfstack-input"
                      placeholder="Enter client name"
                    />
                  </div>
                  
                  <div>
                    <label className="wolfstack-text-small font-medium text-gray-700 mb-2 block">Company Name</label>
                    <input
                      type="text"
                      name="companyName"
                      defaultValue={editingClient?.company?.name || ''}
                      className="wolfstack-input"
                      placeholder="Enter company name"
                    />
                  </div>
                  
                  <div>
                    <label className="wolfstack-text-small font-medium text-gray-700 mb-2 block">Email</label>
                    <input
                      type="email"
                      name="email"
                      required
                      defaultValue={editingClient?.contact?.primary?.email || ''}
                      className="wolfstack-input"
                      placeholder="Enter email address"
                    />
                  </div>
                  
                  <div>
                    <label className="wolfstack-text-small font-medium text-gray-700 mb-2 block">Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      defaultValue={editingClient?.contact?.primary?.phone || ''}
                      className="wolfstack-input"
                      placeholder="Enter phone number"
                    />
                  </div>
                  
                  <div>
                    <label className="wolfstack-text-small font-medium text-gray-700 mb-2 block">Status</label>
                    <select name="status" className="wolfstack-select" defaultValue={editingClient?.status || 'active'}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="prospect">Prospect</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="wolfstack-text-small font-medium text-gray-700 mb-2 block">Notes</label>
                    <textarea
                      name="notes"
                      rows={3}
                      defaultValue={editingClient?.notes || ''}
                      className="wolfstack-textarea"
                      placeholder="Enter any additional notes"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-8">
                <button
                  type="button"
                  onClick={() => {
                    setIsClientModalOpen(false);
                    setEditingClient(null);
                  }}
                  className="wolfstack-button-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="wolfstack-button-primary"
                >
                  {editingClient ? 'Update Client' : 'Add Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, onConfirm: null, title: '', message: '' })}
        onConfirm={confirmDialog.onConfirm || (() => {})}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
    </ErrorBoundary>
  );
};

export default Projects;