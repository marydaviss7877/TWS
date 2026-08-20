import React, { useState, useEffect } from 'react';
import { 
  DocumentChartBarIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { tenantApiService } from '../../../../../../shared/services/tenant/tenant-api.service';
import { useTenantSlug } from '../../../../../../shared/hooks/useTenantSlug';
import { useTenantCurrency } from '../../../../../../shared/hooks/useTenantCurrency';
import { formatCurrency as formatCurrencyBase } from '../../../../../../shared/utils/currency';
import LoadingSpinner from '../../../../../../shared/components/feedback/LoadingSpinner';
import toast from 'react-hot-toast';

const BillingEngine = () => {
  const tenantSlug = useTenantSlug();
  const currency = useTenantCurrency(tenantSlug);
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [formData, setFormData] = useState({
    invoiceNumber: '',
    clientId: '',
    projectId: '',
    issueDate: '',
    dueDate: '',
    items: [{ description: '', quantity: 1, rate: 0, amount: 0 }],
    subtotal: 0,
    taxRate: 10,
    taxAmount: 0,
    total: 0,
    notes: '',
    status: 'draft',
    paymentTerms: '30',
    autoSend: false,
    billingType: 'hourly'
  });

  useEffect(() => {
    fetchData();
  }, [tenantSlug]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch invoices
      const invoicesData = await tenantApiService.getAccountsReceivable(tenantSlug);
      setInvoices(invoicesData.invoices || []);

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

      // Fetch projects
      try {
        const projectsData = await tenantApiService.getProjects(tenantSlug);
        setProjects(projectsData || []);
      } catch (err) {
        console.error('Error fetching projects:', err);
        setProjects([]);
      }

      // Fetch time entries for auto-generation
      try {
        const timeEntriesData = await tenantApiService.getTimeEntries(tenantSlug);
        setTimeEntries(timeEntriesData || []);
      } catch (err) {
        console.error('Error fetching time entries:', err);
        setTimeEntries([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
      sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      paid: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      overdue: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      partially_paid: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
  };

  const formatCurrency = (amount) => formatCurrencyBase(amount, currency);

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString();
  };

  const calculateItemTotal = (item) => {
    return item.quantity * item.rate;
  };

  const updateFormTotals = (items) => {
    const subtotal = items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
    const taxAmount = subtotal * (formData.taxRate / 100);
    const total = subtotal + taxAmount;
    
    setFormData(prev => ({
      ...prev,
      items,
      subtotal,
      taxAmount,
      total
    }));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    newItems[index].amount = calculateItemTotal(newItems[index]);
    updateFormTotals(newItems);
  };

  const addItem = () => {
    const newItems = [...formData.items, { description: '', quantity: 1, rate: 0, amount: 0 }];
    updateFormTotals(newItems);
  };

  const removeItem = (index) => {
    if (formData.items.length > 1) {
      const newItems = formData.items.filter((_, i) => i !== index);
      updateFormTotals(newItems);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const invoiceData = {
        ...formData,
        taxAmount: formData.subtotal * (formData.taxRate / 100),
        total: formData.subtotal + (formData.subtotal * (formData.taxRate / 100))
      };
      
      if (editingInvoice) {
        await tenantApiService.updateInvoice(tenantSlug, editingInvoice._id, invoiceData);
      } else {
        await tenantApiService.createInvoice(tenantSlug, invoiceData);
      }
      
      setShowForm(false);
      setEditingInvoice(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving invoice:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      invoiceNumber: '',
      clientId: '',
      projectId: '',
      issueDate: '',
      dueDate: '',
      items: [{ description: '', quantity: 1, rate: 0, amount: 0 }],
      subtotal: 0,
      taxRate: 10,
      taxAmount: 0,
      total: 0,
      notes: '',
      status: 'draft',
      paymentTerms: '30',
      autoSend: false,
      billingType: 'hourly'
    });
  };

  const generateInvoiceNumber = () => {
    const lastInvoice = invoices[invoices.length - 1];
    const lastNumber = lastInvoice ? parseInt(lastInvoice.invoiceNumber?.split('-')[1] || '0') : 0;
    return `INV-${String(lastNumber + 1).padStart(3, '0')}`;
  };

  const autoGenerateInvoice = async (projectId) => {
    try {
      setLoading(true);
      // Use new billing engine API to generate invoice from project
      const response = await tenantApiService.generateInvoiceFromProject(tenantSlug, projectId, {
        includeTimeEntries: true,
        includeExpenses: true
      });
      
      if (response && response.success && response.data) {
        const invoice = response.data;
        setFormData(prev => ({
          ...prev,
          invoiceNumber: invoice.invoiceNumber || generateInvoiceNumber(),
          projectId: projectId,
          clientId: invoice.clientId || '',
          items: invoice.items || [],
          subtotal: invoice.subtotal || 0,
          taxRate: invoice.taxRate || 10,
          taxAmount: invoice.taxAmount || 0,
          total: invoice.total || 0,
          issueDate: invoice.issueDate || new Date().toISOString().split('T')[0],
          dueDate: invoice.dueDate || '',
          status: invoice.status || 'draft',
          autoSend: true,
          billingType: 'hourly'
        }));
        setShowForm(true);
        await fetchData(); // Refresh invoice list
      } else {
        // Fallback to manual generation if API fails
        const project = projects.find(p => p._id === projectId);
        if (!project) return;

        const projectTimeEntries = timeEntries.filter(entry => 
          entry.projectId === projectId && !entry.billed
        );

        if (projectTimeEntries.length === 0) {
          toast.error('No unbilled time entries found for this project');
          return;
        }

        const items = projectTimeEntries.reduce((acc, entry) => {
          const existing = acc.find(item => item.description === entry.description || item.description === entry.task);
          if (existing) {
            existing.quantity += entry.hours || 0;
            existing.amount = existing.quantity * existing.rate;
          } else {
            acc.push({
              description: entry.description || entry.task || 'Development work',
              quantity: entry.hours || 0,
              rate: entry.rate || project.hourlyRate || 150,
              amount: (entry.hours || 0) * (entry.rate || project.hourlyRate || 150)
            });
          }
          return acc;
        }, []);

        const client = clients.find(c => c._id === project.clientId || c.name === project.clientName);
        
        setFormData(prev => ({
          ...prev,
          invoiceNumber: generateInvoiceNumber(),
          projectId: projectId,
          clientId: client?._id || '',
          items: items,
          autoSend: true,
          billingType: 'hourly'
        }));

        updateFormTotals(items);
        setShowForm(true);
      }
    } catch (error) {
      console.error('Error auto-generating invoice:', error);
      toast.error(error.message || 'Failed to generate invoice. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredInvoices = () => {
    let filtered = invoices;
    
    if (searchTerm) {
      filtered = filtered.filter(invoice =>
        invoice.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.projectName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(invoice => invoice.status === filterStatus);
    }
    
    return filtered;
  };

  if (loading) {
    return <LoadingSpinner message="Preparing billing records…" className="min-h-[40vh] bg-transparent" />;
  }

  const filteredInvoices = getFilteredInvoices();
  const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const overdueCount = invoices.filter(inv => inv.status === 'overdue').length;
  const autoGeneratedCount = invoices.filter(inv => inv.autoGenerated).length;

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Header */}
      <div className="glass-card-premium">
        <div className="px-6 py-8 sm:p-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl xl:text-3xl font-bold font-heading text-gray-900 dark:text-white">
                Billing Engine
              </h1>
              <p className="mt-2 text-sm xl:text-base text-gray-600 dark:text-gray-300">
                Automated billing and invoicing system for software houses
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                  Auto-Generation
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                  Time-Based Billing
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                  Project Integration
                </span>
              </div>
            </div>
            <div className="hidden sm:block">
              <div className="w-16 h-16 bg-primary-50 dark:bg-primary-900/20 rounded-2xl flex items-center justify-center">
                <DocumentChartBarIcon className="h-8 w-8 text-primary-600 dark:text-primary-400" />
              </div>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => {
                setFormData(prev => ({ ...prev, invoiceNumber: generateInvoiceNumber() }));
                setShowForm(true);
              }}
              className="glass-button px-4 py-2 rounded-xl hover-scale flex items-center gap-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white"
            >
              <PlusIcon className="w-5 h-5" />
              <span className="font-medium">Create Invoice</span>
            </button>
            <button className="glass-button px-4 py-2 rounded-xl hover-scale flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white">
              <ArrowPathIcon className="w-5 h-5" />
              <span className="font-medium">Bulk Auto-Generate</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 xl:gap-6">
        <div className="glass-card-premium p-5 xl:p-6 hover-lift">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 xl:w-14 xl:h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
              <DocumentChartBarIcon className="w-6 h-6 xl:w-7 xl:h-7 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs xl:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Total Invoices
              </p>
              <p className="text-2xl xl:text-3xl font-bold font-heading text-gray-900 dark:text-white">
                {invoices.length}
              </p>
            </div>
          </div>
        </div>
        <div className="glass-card-premium p-5 xl:p-6 hover-lift">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 xl:w-14 xl:h-14 rounded-2xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
              <CurrencyDollarIcon className="w-6 h-6 xl:w-7 xl:h-7 text-green-600 dark:text-green-400" />
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
            <div className="w-12 h-12 xl:w-14 xl:h-14 rounded-2xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center">
              <ExclamationTriangleIcon className="w-6 h-6 xl:w-7 xl:h-7 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <p className="text-xs xl:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Overdue
              </p>
              <p className="text-2xl xl:text-3xl font-bold font-heading text-gray-900 dark:text-white">
                {overdueCount}
              </p>
            </div>
          </div>
        </div>
        <div className="glass-card-premium p-5 xl:p-6 hover-lift">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 xl:w-14 xl:h-14 rounded-2xl bg-accent-50 dark:bg-accent-900/20 flex items-center justify-center">
              <CheckCircleIcon className="w-6 h-6 xl:w-7 xl:h-7 text-accent-600 dark:text-accent-400" />
            </div>
            <div>
              <p className="text-xs xl:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Auto-Generated
              </p>
              <p className="text-2xl xl:text-3xl font-bold font-heading text-gray-900 dark:text-white">
                {autoGeneratedCount}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Auto-Generate Section */}
      <div className="glass-card-premium">
        <div className="px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50">
          <h2 className="text-lg xl:text-xl font-bold font-heading text-gray-900 dark:text-white flex items-center">
            <ArrowPathIcon className="h-5 w-5 mr-2 text-primary-600 dark:text-primary-400" />
            Auto-Generate Invoices
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Generate invoices automatically based on project time entries
          </p>
        </div>
        <div className="p-6">
          {projects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {projects.map((project) => {
                const unbilledHours = timeEntries
                  .filter(entry => entry.projectId === project._id && !entry.billed)
                  .reduce((sum, entry) => sum + (entry.hours || 0), 0);
                
                return (
                  <div key={project._id} className="glass-card p-4 rounded-xl hover:shadow-lg transition-all duration-200">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">{project.name}</h3>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{project.clientName || 'N/A'}</span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Rate: {formatCurrency(project.hourlyRate || 150)}/hour
                    </p>
                    {unbilledHours > 0 && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 mb-3">
                        {unbilledHours} hours unbilled
                      </p>
                    )}
                    <button
                      onClick={() => autoGenerateInvoice(project._id)}
                      className="w-full glass-button px-3 py-2 rounded-xl hover-scale flex items-center justify-center gap-2 text-sm bg-gradient-to-r from-primary-500 to-accent-600 text-white"
                      disabled={unbilledHours === 0}
                    >
                      <ArrowPathIcon className="h-4 w-4" />
                      Generate Invoice
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <DocumentTextIcon className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No projects available for auto-generation</p>
            </div>
          )}
        </div>
      </div>

      {/* Search and Filter */}
      <div className="glass-card-premium">
        <div className="px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50">
          <h2 className="text-lg xl:text-xl font-bold font-heading text-gray-900 dark:text-white flex items-center">
            <MagnifyingGlassIcon className="h-5 w-5 mr-2 text-primary-600 dark:text-primary-400" />
            Search & Filter
          </h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="glass-input w-full pl-10 pr-4 py-3 text-sm font-medium rounded-xl"
              />
            </div>
            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="glass-input w-full px-4 py-3 text-sm font-medium rounded-xl"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="partially_paid">Partially Paid</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterStatus('all');
                }}
                className="glass-button px-4 py-2 rounded-xl hover-scale flex items-center gap-2"
              >
                <FunnelIcon className="h-4 w-4" />
                <span className="font-medium">Clear</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="glass-card-premium">
        <div className="px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50">
          <h2 className="text-lg xl:text-xl font-bold font-heading text-gray-900 dark:text-white flex items-center">
            <DocumentTextIcon className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
            Invoices ({filteredInvoices.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          {filteredInvoices.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="glass-card">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Invoice
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Issue Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Amount
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
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{invoice.invoiceNumber}</div>
                        {invoice.autoGenerated && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-accent-100 text-accent-800 dark:bg-accent-900/20 dark:text-accent-400">
                            Auto
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">{invoice.clientName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">{invoice.projectName || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">{formatDate(invoice.issueDate)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">{formatDate(invoice.dueDate)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(invoice.total || 0)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                        {(invoice.status || 'draft').replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button className="p-2 text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200">
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => {
                            setEditingInvoice(invoice);
                            setFormData({
                              ...invoice,
                              items: invoice.billingItems || invoice.items || [{ description: '', quantity: 1, rate: 0, amount: 0 }]
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
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12">
              <DocumentChartBarIcon className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-2">No invoices found</p>
              <p className="text-sm text-gray-500 dark:text-gray-500">Create your first invoice to get started</p>
              <button
                onClick={() => {
                  setFormData(prev => ({ ...prev, invoiceNumber: generateInvoiceNumber() }));
                  setShowForm(true);
                }}
                className="mt-4 glass-button px-4 py-2 rounded-xl hover-scale flex items-center gap-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white mx-auto"
              >
                <PlusIcon className="w-5 h-5" />
                <span className="font-medium">Create Invoice</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Invoice Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card-premium w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50">
              <h3 className="text-lg xl:text-xl font-bold font-heading text-gray-900 dark:text-white">
                {editingInvoice ? 'Edit Invoice' : 'Create New Invoice'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Automated billing and invoicing for software house projects
              </p>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Invoice Number *</label>
                  <input
                    type="text"
                    value={formData.invoiceNumber}
                    onChange={(e) => setFormData({...formData, invoiceNumber: e.target.value})}
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
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Project</label>
                  <select
                    value={formData.projectId}
                    onChange={(e) => setFormData({...formData, projectId: e.target.value})}
                    className="glass-input w-full"
                  >
                    <option value="">Select Project</option>
                    {projects.map(project => (
                      <option key={project._id} value={project._id}>{project.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Issue Date *</label>
                  <input
                    type="date"
                    value={formData.issueDate}
                    onChange={(e) => setFormData({...formData, issueDate: e.target.value})}
                    className="glass-input w-full"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Due Date *</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                    className="glass-input w-full"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Payment Terms (days)</label>
                  <select
                    value={formData.paymentTerms}
                    onChange={(e) => setFormData({...formData, paymentTerms: e.target.value})}
                    className="glass-input w-full"
                  >
                    <option value="15">15 days</option>
                    <option value="30">30 days</option>
                    <option value="45">45 days</option>
                    <option value="60">60 days</option>
                  </select>
                </div>
              </div>

              {/* Invoice Items */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Invoice Items</h4>
                  <button
                    type="button"
                    onClick={addItem}
                    className="glass-button px-3 py-2 rounded-xl hover-scale flex items-center gap-2 text-sm bg-gradient-to-r from-green-500 to-emerald-600 text-white"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Add Item
                  </button>
                </div>
                <div className="space-y-3">
                  {formData.items.map((item, index) => (
                    <div key={index} className="glass-card p-4 rounded-xl">
                      <div className="grid grid-cols-12 gap-3 items-end">
                        <div className="col-span-5">
                          <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 block">Description *</label>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                            className="glass-input w-full text-sm"
                            required
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 block">Quantity</label>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                            className="glass-input w-full text-sm"
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 block">Rate</label>
                          <input
                            type="number"
                            value={item.rate}
                            onChange={(e) => handleItemChange(index, 'rate', parseFloat(e.target.value) || 0)}
                            className="glass-input w-full text-sm"
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 block">Amount</label>
                          <input
                            type="number"
                            value={item.amount}
                            className="glass-input w-full text-sm bg-gray-50 dark:bg-gray-800"
                            readOnly
                          />
                        </div>
                        <div className="col-span-1">
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="w-full p-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
                            disabled={formData.items.length === 1}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tax Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Tax Rate (%)</label>
                  <input
                    type="number"
                    value={formData.taxRate}
                    onChange={(e) => {
                      const taxRate = parseFloat(e.target.value) || 0;
                      const taxAmount = formData.subtotal * (taxRate / 100);
                      const total = formData.subtotal + taxAmount;
                      setFormData({...formData, taxRate, taxAmount, total});
                    }}
                    className="glass-input w-full"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.autoSend}
                    onChange={(e) => setFormData({...formData, autoSend: e.target.checked})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900 dark:text-gray-100">Auto-send to client</label>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="glass-input w-full"
                  rows="3"
                  placeholder="Additional notes or terms..."
                />
              </div>

              {/* Totals */}
              <div className="glass-card border-t border-gray-200/50 dark:border-gray-700/50 pt-4">
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Subtotal:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(formData.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Tax ({formData.taxRate}%):</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(formData.taxAmount)}</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-200/50 dark:border-gray-700/50 pt-2">
                      <span className="text-base font-semibold text-gray-900 dark:text-white">Total:</span>
                      <span className="text-base font-semibold text-gray-900 dark:text-white">{formatCurrency(formData.total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingInvoice(null);
                    resetForm();
                  }}
                  className="glass-button px-4 py-2 rounded-xl hover-scale"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="glass-button px-4 py-2 rounded-xl hover-scale bg-gradient-to-r from-primary-500 to-accent-500 text-white"
                >
                  {editingInvoice ? 'Update' : 'Create'} Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingEngine;
