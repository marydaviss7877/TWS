import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTenantSlug } from '../../../../../shared/hooks/useTenantSlug';
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PencilIcon,
  TrashIcon,
  XCircleIcon,
  BuildingOfficeIcon,
  EnvelopeIcon,
  PhoneIcon,
  GlobeAltIcon,
  UserCircleIcon,
  CurrencyDollarIcon,
  BriefcaseIcon,
  MapPinIcon,
  TagIcon,
  EyeIcon,
  ArrowTopRightOnSquareIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import tenantApiService from '../../../../../shared/services/tenant/tenant-api.service';
import { useTenantAuth } from '../../../../../app/providers/TenantAuthContext';
import ConfirmDialog from '../../../../../components/ConfirmDialog/ConfirmDialog';
import ErrorBoundary from '../../../../../shared/components/ErrorBoundary';
import { Dialog, DialogContent } from '../../../../../components/ui/Dialog/Dialog';
import toast from 'react-hot-toast';

// Enhanced Client Metrics Component - Premium Wolfstack Style
const ClientMetrics = ({ metrics }) => {
  if (!metrics || Object.keys(metrics).length === 0) {
    return null;
  }

  return (
    <div className="glass-card-premium p-8 wolfstack-animate-fadeIn mb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold font-heading text-gray-900 dark:text-white tracking-tight mb-2">
            Client Portfolio Overview
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Comprehensive insights into your client relationships
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Clients */}
        <div className="glass-card p-6 hover-scale group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-xl">
              <BuildingOfficeIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {metrics.total || 0}
            </span>
          </div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Total Clients</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Active portfolio size</p>
        </div>

        {/* Active Clients */}
        <div className="glass-card p-6 hover-scale group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
              <CheckCircleIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {metrics.active || 0}
            </span>
          </div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Active</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Currently engaged</p>
        </div>

        {/* Prospects */}
        <div className="glass-card p-6 hover-scale group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
              <ExclamationTriangleIcon className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {metrics.prospect || 0}
            </span>
          </div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Prospects</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">In pipeline</p>
        </div>

        {/* Revenue */}
        <div className="glass-card p-6 hover-scale group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <CurrencyDollarIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              ${(metrics.totalRevenue || 0).toLocaleString()}
            </span>
          </div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Total Revenue</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">All-time earnings</p>
        </div>
      </div>

      {/* Additional Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        {/* Projects */}
        <div className="glass-card p-5 hover-scale">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-accent-100 dark:bg-accent-900/30 rounded-lg">
              <BriefcaseIcon className="h-5 w-5 text-accent-600 dark:text-accent-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Projects</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{metrics.totalProjects || 0}</p>
            </div>
          </div>
        </div>

        {/* Portal Enabled */}
        <div className="glass-card p-5 hover-scale">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
              <ArrowTopRightOnSquareIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Portal Enabled</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{metrics.portalEnabled || 0}</p>
            </div>
          </div>
        </div>

        {/* Avg Projects per Client */}
        <div className="glass-card p-5 hover-scale">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
              <ChartBarIcon className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg Projects/Client</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {metrics.avgProjectsPerClient ? metrics.avgProjectsPerClient.toFixed(1) : '0.0'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Enhanced Client Card Component - Premium Wolfstack Style
const ClientCard = ({ client, onEdit, onDelete, onView, deletingClientId }) => {
  const navigate = useNavigate();
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700';
      case 'prospect':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  return (
    <div className="glass-card p-6 hover-scale group wolfstack-animate-fadeIn">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-3 mb-2">
            <div className="flex-shrink-0 w-12 h-12 bg-primary-50 dark:bg-primary-900/20 rounded-xl flex items-center justify-center">
              <BuildingOfficeIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                {client.name}
              </h3>
              {client.company?.name && (
                <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                  {client.company.name}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0">
          {onView && (
            <button
              onClick={() => onView(client)}
              className="p-2 glass-button hover-scale text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
              title="View details"
            >
              <EyeIcon className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => onEdit(client)}
            className="p-2 glass-button hover-scale text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
            title="Edit client"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(client._id)}
            disabled={deletingClientId === client._id}
            className="p-2 glass-button hover-scale text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Delete client"
          >
            {deletingClientId === client._id ? (
              <div className="tws-loading-pulse rounded-full h-4 w-4 border-2 border-red-600 border-t-transparent"></div>
            ) : (
              <TrashIcon className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Contact Information */}
      <div className="space-y-2 mb-4">
        {client.contact?.primary?.email && (
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <EnvelopeIcon className="h-4 w-4 mr-2 flex-shrink-0 text-primary-500" />
            <span className="truncate">{client.contact.primary.email}</span>
          </div>
        )}
        
        {client.contact?.primary?.phone && (
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <PhoneIcon className="h-4 w-4 mr-2 flex-shrink-0 text-primary-500" />
            <span className="truncate">{client.contact.primary.phone}</span>
          </div>
        )}

        {client.contact?.primary?.title && (
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <UserCircleIcon className="h-4 w-4 mr-2 flex-shrink-0 text-primary-500" />
            <span className="truncate">{client.contact.primary.title}</span>
          </div>
        )}

        {client.company?.website && (
          <div className="flex items-center text-sm">
            <GlobeAltIcon className="h-4 w-4 mr-2 flex-shrink-0 text-primary-500" />
            <a 
              href={client.company.website} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary-600 dark:text-primary-400 hover:underline truncate"
            >
              {client.company.website.replace(/^https?:\/\//, '')}
            </a>
          </div>
        )}

        {client.address && (client.address.city || client.address.country) && (
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <MapPinIcon className="h-4 w-4 mr-2 flex-shrink-0 text-primary-500" />
            <span className="truncate">
              {[client.address.city, client.address.country].filter(Boolean).join(', ')}
            </span>
          </div>
        )}
      </div>

      {/* Tags */}
      {client.tags && client.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {client.tags.slice(0, 3).map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 border border-primary-200 dark:border-primary-800"
            >
              <TagIcon className="h-3 w-3 mr-1" />
              {tag}
            </span>
          ))}
          {client.tags.length > 3 && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400">
              +{client.tags.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200/50 dark:border-white/10">
        <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold border ${getStatusColor(client.status)}`}>
          {client.status?.charAt(0).toUpperCase() + client.status?.slice(1) || 'Active'}
        </span>
        {client.totalProjects > 0 && (
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <BriefcaseIcon className="h-4 w-4 mr-1" />
            <span className="font-medium">{client.totalProjects}</span>
            <span className="ml-1">project{client.totalProjects !== 1 ? 's' : ''}</span>
          </div>
        )}
        {client.totalRevenue > 0 && (
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <CurrencyDollarIcon className="h-4 w-4 mr-1" />
            <span className="font-medium">${client.totalRevenue.toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const Clients = () => {
  const { clientId } = useParams();
  const tenantSlug = useTenantSlug();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, loading: authLoading } = useTenantAuth();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [clientMetrics, setClientMetrics] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [editingClient, setEditingClient] = useState(null);
  const [deletingClientId, setDeletingClientId] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ 
    isOpen: false, 
    onConfirm: null, 
    title: '', 
    message: '' 
  });
  const [formData, setFormData] = useState({
    name: '',
    type: 'company',
    company: {
      name: '',
      website: '',
      industry: '',
      size: '',
      description: ''
    },
    contact: {
      primary: {
        name: '',
        email: '',
        phone: '',
        title: ''
      },
      billing: {
        name: '',
        email: '',
        phone: ''
      }
    },
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: ''
    },
    billing: {
      currency: 'USD',
      paymentTerms: 'net_30',
      taxRate: 0
    },
    status: 'active',
    notes: '',
    tags: []
  });
  const [tagInput, setTagInput] = useState('');
  const isCreateMode = location.pathname.endsWith('/clients/new');
  const isEditMode = Boolean(clientId);
  const isFormPage = isCreateMode || isEditMode;

  useEffect(() => {
    if (!authLoading && isAuthenticated && tenantSlug) {
      fetchClients();
    } else if (!authLoading && !isAuthenticated) {
      setLoading(false);
    }
  }, [tenantSlug, isAuthenticated, authLoading]);

  useEffect(() => {
    if (!isFormPage) {
      if (editingClient) {
        setEditingClient(null);
      }
      return;
    }

    if (isCreateMode) {
      setEditingClient(null);
      resetForm();
      return;
    }

    if (isEditMode) {
      const selectedClient = clients.find((client) => client._id === clientId);
      if (selectedClient) {
        populateFormFromClient(selectedClient);
      }
    }
  }, [isFormPage, isCreateMode, isEditMode, clientId, clients]);

  const fetchClients = async () => {
    if (!isAuthenticated || !tenantSlug) return;

    try {
      setLoading(true);
      const response = await tenantApiService.getClients(tenantSlug);
      
      let clientsArray = [];
      if (response?.success && response.data) {
        if (Array.isArray(response.data)) {
          clientsArray = response.data;
        } else if (Array.isArray(response.data.clients)) {
          clientsArray = response.data.clients;
        } else if (Array.isArray(response.data.list)) {
          clientsArray = response.data.list;
        }
      } else if (Array.isArray(response)) {
        clientsArray = response;
      } else if (response?.data && Array.isArray(response.data)) {
        clientsArray = response.data;
      }

      setClients(clientsArray);
      calculateMetrics(clientsArray);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Failed to load clients');
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = (clientsArray) => {
    const active = clientsArray.filter(c => c.status === 'active').length;
    const inactive = clientsArray.filter(c => c.status === 'inactive').length;
    const prospect = clientsArray.filter(c => c.status === 'prospect').length;
    const totalRevenue = clientsArray.reduce((sum, c) => sum + (c.totalRevenue || 0), 0);
    const totalProjects = clientsArray.reduce((sum, c) => sum + (c.totalProjects || 0), 0);
    const portalEnabled = clientsArray.filter(c => c.portal?.enabled).length;
    
    setClientMetrics({
      total: clientsArray.length,
      active,
      inactive,
      prospect,
      totalRevenue,
      avgRevenue: clientsArray.length > 0 ? totalRevenue / clientsArray.length : 0,
      totalProjects,
      activeProjects: totalProjects, // This would come from actual project data
      avgProjectsPerClient: clientsArray.length > 0 ? totalProjects / clientsArray.length : 0,
      portalEnabled
    });
  };

  const normalizeClientToFormData = (client) => ({
    name: client.name || '',
    type: client.type || 'company',
    company: {
      name: typeof client.company === 'string' ? client.company : (client.company?.name || ''),
      website: client.company?.website || '',
      industry: client.company?.industry || '',
      size: client.company?.size || '',
      description: client.company?.description || ''
    },
    contact: {
      primary: {
        name: client.contact?.primary?.name || client.contactPerson || '',
        email: client.contact?.primary?.email || client.email || '',
        phone: client.contact?.primary?.phone || client.phone || '',
        title: client.contact?.primary?.title || ''
      },
      billing: {
        name: client.contact?.billing?.name || '',
        email: client.contact?.billing?.email || '',
        phone: client.contact?.billing?.phone || ''
      }
    },
    address: {
      street: client.address?.street || '',
      city: client.address?.city || '',
      state: client.address?.state || '',
      zipCode: client.address?.zipCode || '',
      country: client.address?.country || ''
    },
    billing: {
      currency: client.billing?.currency || client.currency || 'USD',
      paymentTerms: client.billing?.paymentTerms || client.paymentTerms || 'net_30',
      taxRate: client.billing?.taxRate || 0
    },
    status: client.status || 'active',
    notes: client.notes || '',
    tags: client.tags || []
  });

  const buildClientApiPayload = () => ({
    name: formData.name,
    email: formData.contact.primary.email || '',
    phone: formData.contact.primary.phone || '',
    company: {
      name: formData.company.name || '',
      website: formData.company.website || '',
      industry: formData.company.industry || '',
      size: formData.company.size || '',
      description: formData.company.description || ''
    },
    address: formData.address,
    contactPerson: formData.contact.primary.name || '',
    paymentTerms: formData.billing.paymentTerms || 'net_30',
    status: formData.status || 'active',
    notes: formData.notes || '',
    tags: formData.tags || [],
    billingAddress: formData.address,
    currency: formData.billing.currency || 'USD'
  });

  const populateFormFromClient = (client) => {
    setEditingClient(client);
    setFormData(normalizeClientToFormData(client));
  };

  const handleEditClient = (client) => {
    navigate(`/${tenantSlug}/org/clients/${client._id}/edit`);
  };

  const handleViewClient = (client) => {
    // Navigate to client detail page or open detail modal
    navigate(`/${tenantSlug}/org/clients/${client._id}`);
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
          const response = await tenantApiService.deleteClient(tenantSlug, clientId);
          if (response?.success) {
            toast.success('Client deleted successfully');
            fetchClients();
          } else {
            toast.error(response?.message || 'Failed to delete client');
          }
        } catch (error) {
          console.error('Error deleting client:', error);
          toast.error(error.message || 'Failed to delete client');
        } finally {
          setDeletingClientId(null);
        }
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const apiPayload = buildClientApiPayload();
      let response;
      if (editingClient) {
        response = await tenantApiService.updateClient(tenantSlug, editingClient._id, apiPayload);
        if (response?.success) {
          toast.success('Client updated successfully');
          resetForm();
          fetchClients();
          navigate(`/${tenantSlug}/org/clients`);
        } else {
          toast.error(response?.message || 'Failed to update client');
        }
      } else {
        response = await tenantApiService.createClient(tenantSlug, apiPayload);
        if (response?.success) {
          toast.success('Client created successfully');
          resetForm();
          fetchClients();
          navigate(`/${tenantSlug}/org/clients`);
        } else {
          toast.error(response?.message || 'Failed to create client');
        }
      }
    } catch (error) {
      console.error('Error saving client:', error);
      toast.error(error.message || 'Failed to save client');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'company',
      company: {
        name: '',
        website: '',
        industry: '',
        size: '',
        description: ''
      },
      contact: {
        primary: {
          name: '',
          email: '',
          phone: '',
          title: ''
        },
        billing: {
          name: '',
          email: '',
          phone: ''
        }
      },
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: ''
      },
      billing: {
        currency: 'USD',
        paymentTerms: 'net_30',
        taxRate: 0
      },
      status: 'active',
      notes: '',
      tags: []
    });
    setTagInput('');
    setEditingClient(null);
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()]
      });
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const openCreateClientPage = () => {
    resetForm();
    navigate(`/${tenantSlug}/org/clients/new`);
  };

  const closeClientFormPage = () => {
    resetForm();
    navigate(`/${tenantSlug}/org/clients`);
  };

  const filteredClients = clients.filter(client => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      (client.name?.toLowerCase().includes(searchLower) || false) ||
      (client.contact?.primary?.email?.toLowerCase().includes(searchLower) || false) ||
      (client.company?.name?.toLowerCase().includes(searchLower) || false) ||
      (client.contact?.primary?.name?.toLowerCase().includes(searchLower) || false) ||
      (client.contact?.primary?.phone?.toLowerCase().includes(searchLower) || false) ||
      (client.tags?.some(tag => tag.toLowerCase().includes(searchLower)) || false);
    
    const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-4">
          <div className="tws-loading-pulse rounded-full h-16 w-16 border-4 border-primary-600 border-t-transparent"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading clients...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary message="Failed to load clients. Please refresh the page.">
      <div className="space-y-8">
        <>
            {/* Header Section - Premium Wolfstack Style */}
            <div className="glass-card-premium p-8 text-center wolfstack-animate-fadeIn">
              <h1 className="text-4xl font-bold font-heading text-gray-900 dark:text-white tracking-tight mb-4">
                Client Management
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                Manage your client relationships, track projects, and monitor revenue with our comprehensive client management solution.
              </p>
            </div>

            {/* Client Metrics */}
            <ClientMetrics metrics={clientMetrics} />

            {/* Clients Management Section - Premium Wolfstack Style */}
            <div className="glass-card-premium p-8 wolfstack-animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 space-y-4 sm:space-y-0">
            <div>
              <h2 className="text-2xl font-bold font-heading text-gray-900 dark:text-white tracking-tight mb-2">
                All Clients
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {filteredClients.length} {filteredClients.length === 1 ? 'client' : 'clients'} found
              </p>
            </div>
            <button
             
              onClick={openCreateClientPage}
              className="wolfstack-button-primary w-full sm:w-auto"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add New Client
            </button>
          </div>

          {/* Enhanced Filters - Premium Wolfstack Style */}
          <div className="glass-card p-6 mb-8">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <MagnifyingGlassIcon className="h-5 w-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search clients by name, email, company, or tags..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="glass-input w-full pl-12 pr-4 py-3"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="glass-input px-4 py-3 min-w-[180px]"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="prospect">Prospect</option>
              </select>

              {/* View Mode Toggle */}
              <div className="flex items-center space-x-2 glass-card p-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-all ${
                    viewMode === 'grid'
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                  title="Grid view"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-all ${
                    viewMode === 'list'
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                  title="List view"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          
          {/* Clients Grid/List */}
          {filteredClients.length > 0 ? (
            <div className={viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
              : 'space-y-4'
            }>
              {filteredClients.map((client, index) => (
                <ClientCard
                  key={client._id}
                  client={client}
                  onEdit={handleEditClient}
                  onDelete={handleDeleteClient}
                  onView={handleViewClient}
                  deletingClientId={deletingClientId}
                />
              ))}
            </div>
          ) : (
            <div className="glass-card-premium p-16 text-center wolfstack-animate-fadeIn">
              <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-full w-24 h-24 mx-auto mb-8 flex items-center justify-center">
                <BuildingOfficeIcon className="h-12 w-12 text-primary-600 dark:text-primary-400" />
              </div>
              <h3 className="text-2xl font-bold font-heading text-gray-900 dark:text-white mb-4">
                No clients found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                {searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your search or filters to find what you\'re looking for.'
                  : 'Get started by creating your first client and begin managing your relationships efficiently.'
                }
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <button
                  onClick={openCreateClientPage}
                  className="wolfstack-button-primary"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Create Your First Client
                </button>
              )}
            </div>
          )}
            </div>
          </>

        {/* Add/Edit Client Modal */}
        <Dialog open={isFormPage} onOpenChange={(open) => !open && closeClientFormPage()}>
          <DialogContent showClose={false} className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <div className="glass-card-premium p-8 wolfstack-animate-fadeIn">
            <div className="sticky top-0 glass-card border-b border-gray-200/50 dark:border-white/10 p-6 flex items-center justify-between backdrop-blur-xl z-10 rounded-xl mb-6">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={closeClientFormPage}
                  className="p-2 glass-button hover-scale text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  title="Back to clients"
                >
                  <ArrowLeftIcon className="h-5 w-5" />
                </button>
                <h3 className="text-2xl font-bold font-heading text-gray-900 dark:text-white">
                  {editingClient ? 'Edit Client' : 'Add New Client'}
                </h3>
              </div>
              <button
                onClick={closeClientFormPage}
                className="p-2 glass-button hover-scale text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">

                {/* ── Section 1: Basic Information ── */}
                <div className="glass-card p-6 space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                      <BuildingOfficeIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold font-heading text-gray-900 dark:text-white">Basic Information</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Core details about this client</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                        Client Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="glass-input w-full px-4 py-3 rounded-xl"
                        placeholder="Enter client name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                        Status
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="glass-input w-full px-4 py-3 rounded-xl"
                      >
                        <option value="active">Active</option>
                        <option value="prospect">Prospect</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* ── Section 2: Company Information ── */}
                <div className="glass-card p-6 space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-accent-100 dark:bg-accent-900/30 rounded-lg">
                      <BriefcaseIcon className="h-5 w-5 text-accent-600 dark:text-accent-400" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold font-heading text-gray-900 dark:text-white">Company Information</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Company profile and details</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                        Company Name
                      </label>
                      <input
                        type="text"
                        value={formData.company.name}
                        onChange={(e) => setFormData({ ...formData, company: { ...formData.company, name: e.target.value } })}
                        className="glass-input w-full px-4 py-3 rounded-xl"
                        placeholder="Company name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                        Website
                      </label>
                      <div className="relative">
                        <GlobeAltIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="url"
                          value={formData.company.website}
                          onChange={(e) => setFormData({ ...formData, company: { ...formData.company, website: e.target.value } })}
                          className="glass-input w-full pl-9 pr-4 py-3 rounded-xl"
                          placeholder="https://example.com"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                        Industry
                      </label>
                      <input
                        type="text"
                        value={formData.company.industry}
                        onChange={(e) => setFormData({ ...formData, company: { ...formData.company, industry: e.target.value } })}
                        className="glass-input w-full px-4 py-3 rounded-xl"
                        placeholder="e.g. Technology, Finance, Healthcare"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                        Company Size
                      </label>
                      <select
                        value={formData.company.size}
                        onChange={(e) => setFormData({ ...formData, company: { ...formData.company, size: e.target.value } })}
                        className="glass-input w-full px-4 py-3 rounded-xl"
                      >
                        <option value="">Select size</option>
                        <option value="1-10">1–10 employees</option>
                        <option value="11-50">11–50 employees</option>
                        <option value="51-200">51–200 employees</option>
                        <option value="201-500">201–500 employees</option>
                        <option value="501-1000">501–1000 employees</option>
                        <option value="1000+">1000+ employees</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                        Company Description
                      </label>
                      <textarea
                        rows={2}
                        value={formData.company.description}
                        onChange={(e) => setFormData({ ...formData, company: { ...formData.company, description: e.target.value } })}
                        className="glass-input w-full px-4 py-3 rounded-xl resize-none"
                        placeholder="Brief description of what this company does..."
                      />
                    </div>
                  </div>
                </div>

                {/* ── Section 3: Primary Contact ── */}
                <div className="glass-card p-6 space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                      <UserCircleIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold font-heading text-gray-900 dark:text-white">Primary Contact</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Main point of contact for this client</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                        Contact Name
                      </label>
                      <input
                        type="text"
                        value={formData.contact.primary.name}
                        onChange={(e) => setFormData({ ...formData, contact: { ...formData.contact, primary: { ...formData.contact.primary, name: e.target.value } } })}
                        className="glass-input w-full px-4 py-3 rounded-xl"
                        placeholder="Full name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                        Job Title
                      </label>
                      <input
                        type="text"
                        value={formData.contact.primary.title}
                        onChange={(e) => setFormData({ ...formData, contact: { ...formData.contact, primary: { ...formData.contact.primary, title: e.target.value } } })}
                        className="glass-input w-full px-4 py-3 rounded-xl"
                        placeholder="e.g. CEO, Project Manager"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <EnvelopeIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="email"
                          required
                          value={formData.contact.primary.email}
                          onChange={(e) => setFormData({ ...formData, contact: { ...formData.contact, primary: { ...formData.contact.primary, email: e.target.value } } })}
                          className="glass-input w-full pl-9 pr-4 py-3 rounded-xl"
                          placeholder="email@example.com"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                        Phone
                      </label>
                      <div className="relative">
                        <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="tel"
                          value={formData.contact.primary.phone}
                          onChange={(e) => setFormData({ ...formData, contact: { ...formData.contact, primary: { ...formData.contact.primary, phone: e.target.value } } })}
                          className="glass-input w-full pl-9 pr-4 py-3 rounded-xl"
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Section 4: Billing ── */}
                <div className="glass-card p-6 space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                      <CurrencyDollarIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold font-heading text-gray-900 dark:text-white">Billing</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Billing contact and payment preferences</p>
                    </div>
                  </div>
                  {/* Billing Contact Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4 border-b border-gray-200/50 dark:border-white/10">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                        Billing Contact Name
                      </label>
                      <input
                        type="text"
                        value={formData.contact.billing.name}
                        onChange={(e) => setFormData({ ...formData, contact: { ...formData.contact, billing: { ...formData.contact.billing, name: e.target.value } } })}
                        className="glass-input w-full px-4 py-3 rounded-xl"
                        placeholder="Billing contact name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                        Billing Email
                      </label>
                      <div className="relative">
                        <EnvelopeIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="email"
                          value={formData.contact.billing.email}
                          onChange={(e) => setFormData({ ...formData, contact: { ...formData.contact, billing: { ...formData.contact.billing, email: e.target.value } } })}
                          className="glass-input w-full pl-9 pr-4 py-3 rounded-xl"
                          placeholder="billing@example.com"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                        Billing Phone
                      </label>
                      <div className="relative">
                        <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="tel"
                          value={formData.contact.billing.phone}
                          onChange={(e) => setFormData({ ...formData, contact: { ...formData.contact, billing: { ...formData.contact.billing, phone: e.target.value } } })}
                          className="glass-input w-full pl-9 pr-4 py-3 rounded-xl"
                          placeholder="+1 (555) 000-0000"
                        />
                      </div>
                    </div>
                  </div>
                  {/* Payment Settings Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                        Currency
                      </label>
                      <select
                        value={formData.billing.currency}
                        onChange={(e) => setFormData({ ...formData, billing: { ...formData.billing, currency: e.target.value } })}
                        className="glass-input w-full px-4 py-3 rounded-xl"
                      >
                        <option value="USD">USD — US Dollar</option>
                        <option value="EUR">EUR — Euro</option>
                        <option value="GBP">GBP — British Pound</option>
                        <option value="CAD">CAD — Canadian Dollar</option>
                        <option value="PKR">PKR — Pakistani Rupee</option>
                        <option value="AED">AED — UAE Dirham</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                        Payment Terms
                      </label>
                      <select
                        value={formData.billing.paymentTerms}
                        onChange={(e) => setFormData({ ...formData, billing: { ...formData.billing, paymentTerms: e.target.value } })}
                        className="glass-input w-full px-4 py-3 rounded-xl"
                      >
                        <option value="due_on_receipt">Due on Receipt</option>
                        <option value="net_15">Net 15</option>
                        <option value="net_30">Net 30</option>
                        <option value="net_45">Net 45</option>
                        <option value="net_60">Net 60</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                        Tax Rate (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={formData.billing.taxRate}
                        onChange={(e) => setFormData({ ...formData, billing: { ...formData.billing, taxRate: parseFloat(e.target.value) || 0 } })}
                        className="glass-input w-full px-4 py-3 rounded-xl"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                {/* ── Section 5: Address ── */}
                <div className="glass-card p-6 space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <MapPinIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold font-heading text-gray-900 dark:text-white">Address</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Client's physical location</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                        Street Address
                      </label>
                      <input
                        type="text"
                        value={formData.address.street}
                        onChange={(e) => setFormData({ ...formData, address: { ...formData.address, street: e.target.value } })}
                        className="glass-input w-full px-4 py-3 rounded-xl"
                        placeholder="123 Main Street, Suite 100"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">City</label>
                        <input
                          type="text"
                          value={formData.address.city}
                          onChange={(e) => setFormData({ ...formData, address: { ...formData.address, city: e.target.value } })}
                          className="glass-input w-full px-4 py-3 rounded-xl"
                          placeholder="City"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">State / Province</label>
                        <input
                          type="text"
                          value={formData.address.state}
                          onChange={(e) => setFormData({ ...formData, address: { ...formData.address, state: e.target.value } })}
                          className="glass-input w-full px-4 py-3 rounded-xl"
                          placeholder="State / Province"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Zip / Postal Code</label>
                        <input
                          type="text"
                          value={formData.address.zipCode}
                          onChange={(e) => setFormData({ ...formData, address: { ...formData.address, zipCode: e.target.value } })}
                          className="glass-input w-full px-4 py-3 rounded-xl"
                          placeholder="12345"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Country</label>
                        <input
                          type="text"
                          value={formData.address.country}
                          onChange={(e) => setFormData({ ...formData, address: { ...formData.address, country: e.target.value } })}
                          className="glass-input w-full px-4 py-3 rounded-xl"
                          placeholder="Country"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Section 6: Tags & Notes ── */}
                <div className="glass-card p-6 space-y-6">
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
                        <TagIcon className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold font-heading text-gray-900 dark:text-white">Tags</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Labels to categorise this client</p>
                      </div>
                    </div>
                    {formData.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {formData.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 border border-primary-200 dark:border-primary-800"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => removeTag(tag)}
                              className="text-primary-500 hover:text-red-500 transition-colors"
                            >
                              <XCircleIcon className="h-3.5 w-3.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                        className="glass-input flex-1 px-4 py-3 rounded-xl"
                        placeholder="Type a tag and press Enter…"
                      />
                      <button type="button" onClick={addTag} className="glass-button px-5 py-3 rounded-xl font-medium hover-scale">
                        Add
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-gray-200/50 dark:border-white/10" />

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                      Notes
                    </label>
                    <textarea
                      rows={3}
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="glass-input w-full px-4 py-3 rounded-xl resize-none"
                      placeholder="Any additional notes about this client…"
                    />
                  </div>
                </div>

                {/* ── Form Actions ── */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeClientFormPage}
                    className="glass-button px-6 py-3 rounded-xl font-semibold hover-scale"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="glass-button px-8 py-3 rounded-xl font-semibold hover-scale bg-gradient-to-r from-primary-500 to-accent-600 text-white border-0 shadow-lg shadow-primary-500/25"
                  >
                    {editingClient ? 'Save Changes' : 'Create Client'}
                  </button>
                </div>

            </form>
            </div>
          </DialogContent>
        </Dialog>

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

export default Clients;
