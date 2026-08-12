import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowTrendingUpIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  ChartBarIcon,
  BanknotesIcon,
  FunnelIcon,
  DocumentDuplicateIcon,
  ArrowPathIcon,
  UserGroupIcon,
  BriefcaseIcon,
  CloudIcon,
  CheckBadgeIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { tenantApiService } from '../../../../../../shared/services/tenant/tenant-api.service';
import { useTenantAuth } from '../../../../../../app/providers/TenantAuthContext';
import LoadingSpinner from '../../../../../../shared/components/feedback/LoadingSpinner';
import EmptyState from '../../../../../../shared/components/feedback/EmptyState';
import { useTenantSlug } from '../../../../../../shared/hooks/useTenantSlug';
import { useTenantCurrency } from '../../../../../../shared/hooks/useTenantCurrency';
import { formatCurrency as formatCurrencyBase } from '../../../../../../shared/utils/currency';
import toast from 'react-hot-toast';
import ConfirmDialog from '../../../../../../components/ConfirmDialog/ConfirmDialog';

const AccountsReceivable = () => {
  const tenantSlug = useTenantSlug();
  const currency = useTenantCurrency(tenantSlug);
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useTenantAuth();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, onConfirm: null, title: '', message: '' });
  const [agingReport, setAgingReport] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterClient, setFilterClient] = useState('all');
  const [filterProject, setFilterProject] = useState('all');
  const [stats, setStats] = useState({
    total: 0,
    paid: 0,
    pending: 0,
    overdue: 0
  });
  const [formData, setFormData] = useState({
    invoiceNumber: '',
    clientId: '',
    projectId: '',
    billingType: 'hourly',
    issueDate: '',
    dueDate: '',
    paymentTerms: '30',
    billingItems: [{
      type: 'development',
      description: '',
      hours: 0,
      rate: 0,
      amount: 0,
      accountCode: '4100',
      costCenter: 'Development'
    }],
    subtotal: 0,
    taxRate: 10,
    taxAmount: 0,
    total: 0,
    notes: '',
    status: 'draft',
    revenueAccount: '4100',
    costCenter: 'Development',
    projectSpecific: true,
    autoSend: false,
    recurring: false,
    recurringFrequency: 'monthly'
  });
  const [paymentData, setPaymentData] = useState({
    invoiceId: '',
    paymentDate: '',
    paymentMethod: 'bank_transfer',
    amount: 0,
    reference: '',
    notes: '',
    accountCode: '1110'
  });

  useEffect(() => {
    // Only fetch if authenticated and auth is not loading
    if (!authLoading && isAuthenticated) {
      fetchData();
    } else if (!authLoading && !isAuthenticated) {
      setLoading(false);
    }
  }, [tenantSlug, isAuthenticated, authLoading]);

  const fetchData = async () => {
    if (!isAuthenticated || !tenantSlug) return;
    
    try {
      setLoading(true);
      
      // Fetch invoices
      const invoicesData = await tenantApiService.getAccountsReceivable(tenantSlug);
      if (invoicesData) {
        setInvoices(invoicesData.invoices || []);
        setStats({
          total: invoicesData.total || 0,
          paid: invoicesData.paid || 0,
          pending: invoicesData.pending || 0,
          overdue: invoicesData.overdue || 0
        });
      } else {
        setInvoices([]);
        setStats({ total: 0, paid: 0, pending: 0, overdue: 0 });
      }

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

      // Fetch chart of accounts
      try {
        const accountsData = await tenantApiService.getChartOfAccounts(tenantSlug);
        setAccounts(accountsData || []);
      } catch (err) {
        console.error('Error fetching accounts:', err);
        // Default accounts for software houses
        setAccounts([
          { code: '4100', name: 'Software Development Revenue', type: 'revenue' },
          { code: '4200', name: 'Software Licensing Revenue', type: 'revenue' },
          { code: '4300', name: 'Consulting Revenue', type: 'revenue' },
          { code: '4400', name: 'Maintenance & Support Revenue', type: 'revenue' },
          { code: '1110', name: 'Cash and Cash Equivalents', type: 'asset' },
          { code: '1120', name: 'Accounts Receivable', type: 'asset' }
        ]);
      }
    } catch (err) {
      console.error('Error fetching accounts receivable:', err);
      setInvoices([]);
      setStats({ total: 0, paid: 0, pending: 0, overdue: 0 });
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
      sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      paid: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      overdue: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      partially_paid: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
  };

  const getBillingTypeIcon = (type) => {
    const icons = {
      hourly: ClockIcon,
      fixed_price: CheckBadgeIcon,
      retainer: CalendarIcon,
      saas_subscription: CloudIcon,
      consulting: UserGroupIcon,
      milestone: BriefcaseIcon
    };
    return icons[type] || DocumentTextIcon;
  };

  const getBillingTypeColor = (type) => {
    const colors = {
      hourly: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      fixed_price: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      retainer: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
      saas_subscription: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400',
      consulting: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
      milestone: 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-400'
    };
    return colors[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
  };

  const formatCurrency = (amount) => formatCurrencyBase(amount, currency);

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString();
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
    
    if (filterClient !== 'all') {
      filtered = filtered.filter(invoice => invoice.clientId === filterClient);
    }
    
    if (filterProject !== 'all') {
      filtered = filtered.filter(invoice => invoice.projectId === filterProject);
    }
    
    return filtered;
  };

  const getAgingColor = (days) => {
    if (days <= 0) return 'text-green-600 dark:text-green-400';
    if (days <= 30) return 'text-yellow-600 dark:text-yellow-400';
    if (days <= 60) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const calculateTotals = () => {
    const filtered = getFilteredInvoices();
    return {
      totalOutstanding: filtered.reduce((sum, inv) => sum + (inv.remainingAmount || 0), 0),
      totalPaid: filtered.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0),
      overdueAmount: filtered.filter(inv => inv.status === 'overdue').reduce((sum, inv) => sum + (inv.remainingAmount || 0), 0),
      overdueCount: filtered.filter(inv => inv.status === 'overdue').length
    };
  };

  const addBillingItem = () => {
    const newItem = {
      type: 'development',
      description: '',
      hours: 0,
      rate: 0,
      amount: 0,
      accountCode: '4100',
      costCenter: 'Development'
    };
    setFormData(prev => ({
      ...prev,
      billingItems: [...prev.billingItems, newItem]
    }));
  };

  const updateBillingItem = (index, field, value) => {
    const newItems = [...formData.billingItems];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Calculate amount for hourly items
    if (field === 'hours' || field === 'rate') {
      const item = newItems[index];
      if (item.hours && item.rate) {
        newItems[index].amount = item.hours * item.rate;
      }
    }
    
    setFormData(prev => ({
      ...prev,
      billingItems: newItems,
      subtotal: newItems.reduce((sum, item) => sum + (item.amount || 0), 0)
    }));
  };

  const removeBillingItem = (index) => {
    if (formData.billingItems.length > 1) {
      const newItems = formData.billingItems.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        billingItems: newItems,
        subtotal: newItems.reduce((sum, item) => sum + (item.amount || 0), 0)
      }));
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

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    try {
      // Use new AR API method
      await tenantApiService.recordInvoicePayment(tenantSlug, paymentData.invoiceId, {
        paymentDate: paymentData.paymentDate,
        paymentMethod: paymentData.paymentMethod,
        amount: paymentData.amount,
        reference: paymentData.reference,
        notes: paymentData.notes,
        accountCode: paymentData.accountCode
      });
      setShowPaymentForm(false);
      setSelectedInvoice(null);
      setPaymentData({
        invoiceId: '',
        paymentDate: '',
        paymentMethod: 'bank_transfer',
        amount: 0,
        reference: '',
        notes: '',
        accountCode: '1110'
      });
      fetchData();
      toast.success('Payment recorded successfully');
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error(error.message || 'Failed to record payment. Please try again.');
    }
  };

  const handleSendReminder = (invoiceId) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Send payment reminder',
      message: 'This sends a reminder email to the client for this invoice.',
      onConfirm: async () => {
        try {
          await tenantApiService.sendPaymentReminder(tenantSlug, invoiceId);
          toast.success('Payment reminder sent successfully');
          fetchData();
        } catch (error) {
          console.error('Error sending reminder:', error);
          toast.error(error.message || 'Failed to send reminder. Please try again.');
        }
      }
    });
  };

  const handleViewAgingReport = async () => {
    try {
      const agingData = await tenantApiService.getAgingReportAR(tenantSlug);
      setAgingReport({
        '0-30': agingData?.agingBuckets?.['0-30'] || 0,
        '31-60': agingData?.agingBuckets?.['31-60'] || 0,
        '61-90': agingData?.agingBuckets?.['61-90'] || 0,
        '90+': agingData?.agingBuckets?.['90+'] || 0
      });
    } catch (error) {
      console.error('Error fetching aging report:', error);
      toast.error(error.message || 'Failed to fetch aging report.');
    }
  };

  const resetForm = () => {
    setFormData({
      invoiceNumber: '',
      clientId: '',
      projectId: '',
      billingType: 'hourly',
      issueDate: '',
      dueDate: '',
      paymentTerms: '30',
      billingItems: [{
        type: 'development',
        description: '',
        hours: 0,
        rate: 0,
        amount: 0,
        accountCode: '4100',
        costCenter: 'Development'
      }],
      subtotal: 0,
      taxRate: 10,
      taxAmount: 0,
      total: 0,
      notes: '',
      status: 'draft',
      revenueAccount: '4100',
      costCenter: 'Development',
      projectSpecific: true,
      autoSend: false,
      recurring: false,
      recurringFrequency: 'monthly'
    });
  };

  const statsData = [
    { label: 'Total Receivable', value: formatCurrency(stats.total), icon: ArrowTrendingUpIcon, iconBg: 'bg-green-50 dark:bg-green-900/20', iconColor: 'text-green-600 dark:text-green-400' },
    { label: 'Paid', value: formatCurrency(stats.paid), icon: CheckCircleIcon, iconBg: 'bg-blue-50 dark:bg-blue-900/20', iconColor: 'text-blue-600 dark:text-blue-400' },
    { label: 'Pending', value: formatCurrency(stats.pending), icon: ClockIcon, iconBg: 'bg-amber-50 dark:bg-amber-900/20', iconColor: 'text-amber-600 dark:text-amber-400' },
    { label: 'Overdue', value: formatCurrency(stats.overdue), icon: ExclamationTriangleIcon, iconBg: 'bg-rose-50 dark:bg-rose-900/20', iconColor: 'text-rose-600 dark:text-rose-400' }
  ];

  if (loading) {
    return <LoadingSpinner message="Loading accounts receivable..." className="min-h-[40vh] bg-transparent" />;
  }

  const totals = calculateTotals();
  const filteredInvoices = getFilteredInvoices();

  // ── Full-page Invoice Form ────────────────────────────────────────────────
  if (showForm) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Page Header */}
        <div className="glass-card-premium">
          <div className="px-6 py-5 sm:px-8 flex items-center gap-4">
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditingInvoice(null); resetForm(); }}
              className="glass-button p-2 rounded-xl hover-scale text-gray-800 dark:text-gray-100 text-lg font-semibold leading-none border-gray-300/70 dark:border-white/20"
              title="Back to Invoices"
            >
              ←
            </button>
            <div>
              <h1 className="text-xl xl:text-2xl font-bold font-heading text-gray-900 dark:text-white">
                {editingInvoice ? 'Edit Invoice' : 'New Invoice'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Software house billing with Chart of Accounts integration
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="glass-card-premium p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 pb-3 border-b border-gray-200/50 dark:border-gray-700/50">Invoice Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Invoice Number *</label>
                <input type="text" value={formData.invoiceNumber} onChange={(e) => setFormData({...formData, invoiceNumber: e.target.value})} className="glass-input w-full" placeholder="INV-2024-XXX" required />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Client *</label>
                <select value={formData.clientId} onChange={(e) => setFormData({...formData, clientId: e.target.value})} className="glass-input w-full" required>
                  <option value="">Select Client</option>
                  {clients.map(client => <option key={client._id} value={client._id}>{client.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Project</label>
                <select value={formData.projectId} onChange={(e) => setFormData({...formData, projectId: e.target.value})} className="glass-input w-full">
                  <option value="">Select Project</option>
                  {projects.map(project => <option key={project._id} value={project._id}>{project.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Billing Type *</label>
                <select value={formData.billingType} onChange={(e) => setFormData({...formData, billingType: e.target.value})} className="glass-input w-full" required>
                  <option value="hourly">Hourly</option>
                  <option value="fixed_price">Fixed Price</option>
                  <option value="retainer">Retainer</option>
                  <option value="saas_subscription">SaaS Subscription</option>
                  <option value="consulting">Consulting</option>
                  <option value="milestone">Milestone</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Issue Date *</label>
                <input type="date" value={formData.issueDate} onChange={(e) => setFormData({...formData, issueDate: e.target.value})} className="glass-input w-full" required />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Due Date *</label>
                <input type="date" value={formData.dueDate} onChange={(e) => setFormData({...formData, dueDate: e.target.value})} className="glass-input w-full" required />
              </div>
            </div>
          </div>

          {/* Chart of Accounts */}
          <div className="glass-card-premium p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 pb-3 border-b border-gray-200/50 dark:border-gray-700/50">Chart of Accounts</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Revenue Account *</label>
                <select value={formData.revenueAccount} onChange={(e) => setFormData({...formData, revenueAccount: e.target.value})} className="glass-input w-full" required>
                  {accounts.filter(acc => acc.type === 'revenue').map(account => (
                    <option key={account.code} value={account.code}>{account.code} - {account.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Cost Center</label>
                <select value={formData.costCenter} onChange={(e) => setFormData({...formData, costCenter: e.target.value})} className="glass-input w-full">
                  <option value="Development">Development</option>
                  <option value="Management">Management</option>
                  <option value="Sales">Sales</option>
                  <option value="HR">HR</option>
                  <option value="IT">IT</option>
                  <option value="Administration">Administration</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Payment Terms</label>
                <select value={formData.paymentTerms} onChange={(e) => setFormData({...formData, paymentTerms: e.target.value})} className="glass-input w-full">
                  <option value="15">15 days</option>
                  <option value="30">30 days</option>
                  <option value="45">45 days</option>
                  <option value="60">60 days</option>
                </select>
              </div>
            </div>
          </div>

          {/* Billing Items */}
          <div className="glass-card-premium p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200/50 dark:border-gray-700/50">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Billing Items</h3>
              <button type="button" onClick={addBillingItem} className="glass-button px-3 py-2 rounded-xl hover-scale inline-flex items-center gap-2 text-sm text-gray-800 dark:text-gray-100 border-gray-300/70 dark:border-white/20">
                <PlusIcon className="h-4 w-4 shrink-0 text-gray-700 dark:text-gray-200" aria-hidden /> Add Item
              </button>
            </div>
            <div className="space-y-3">
              {formData.billingItems.map((item, index) => (
                <div key={index} className="glass-card p-4 rounded-xl">
                  <div className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-3">
                      <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 block">Type</label>
                      <select value={item.type} onChange={(e) => updateBillingItem(index, 'type', e.target.value)} className="glass-input w-full text-sm">
                        <option value="development">Development</option>
                        <option value="testing">Testing</option>
                        <option value="consulting">Consulting</option>
                        <option value="milestone">Milestone</option>
                        <option value="retainer">Retainer</option>
                        <option value="subscription">Subscription</option>
                        <option value="support">Support</option>
                        <option value="additional">Additional</option>
                      </select>
                    </div>
                    <div className="col-span-4">
                      <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 block">Description *</label>
                      <input type="text" value={item.description} onChange={(e) => updateBillingItem(index, 'description', e.target.value)} className="glass-input w-full text-sm" placeholder="e.g., Frontend Development" required />
                    </div>
                    {formData.billingType === 'hourly' && (
                      <>
                        <div className="col-span-2">
                          <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 block">Hours</label>
                          <input type="number" value={item.hours} onChange={(e) => updateBillingItem(index, 'hours', parseFloat(e.target.value) || 0)} className="glass-input w-full text-sm" min="0" step="0.25" />
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 block">Rate</label>
                          <input type="number" value={item.rate} onChange={(e) => updateBillingItem(index, 'rate', parseFloat(e.target.value) || 0)} className="glass-input w-full text-sm" min="0" step="0.01" />
                        </div>
                      </>
                    )}
                    {formData.billingType !== 'hourly' && (
                      <div className="col-span-4">
                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 block">Amount</label>
                        <input type="number" value={item.amount} onChange={(e) => updateBillingItem(index, 'amount', parseFloat(e.target.value) || 0)} className="glass-input w-full text-sm" min="0" step="0.01" />
                      </div>
                    )}
                    <div className="col-span-1">
                      <button type="button" onClick={() => removeBillingItem(index)} className="w-full p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all" disabled={formData.billingItems.length === 1}>
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Settings & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-card-premium p-6">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 pb-3 border-b border-gray-200/50 dark:border-gray-700/50">Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Tax Rate (%)</label>
                  <input type="number" value={formData.taxRate} onChange={(e) => setFormData({...formData, taxRate: parseFloat(e.target.value) || 0})} className="glass-input w-full" min="0" max="100" step="0.01" />
                </div>
                <div className="space-y-3 pt-2">
                  {[['projectSpecific','Project Specific'],['recurring','Recurring Invoice'],['autoSend','Auto-send to Client']].map(([key, label]) => (
                    <label key={key} className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={formData[key]} onChange={(e) => setFormData({...formData, [key]: e.target.checked})} className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded" />
                      <span className="text-sm text-gray-900 dark:text-gray-100">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="glass-card-premium p-6">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 pb-3 border-b border-gray-200/50 dark:border-gray-700/50">Notes</h3>
              <textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} className="glass-input w-full h-32" placeholder="Additional notes or payment terms..." />
            </div>
          </div>

          {/* Totals + Actions */}
          <div className="glass-card-premium p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="w-full sm:w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(formData.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Tax ({formData.taxRate}%):</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(formData.subtotal * (formData.taxRate / 100))}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200/50 dark:border-gray-700/50 pt-2">
                  <span className="text-base font-semibold text-gray-900 dark:text-white">Total:</span>
                  <span className="text-base font-semibold text-gray-900 dark:text-white">{formatCurrency(formData.subtotal + formData.subtotal * (formData.taxRate / 100))}</span>
                </div>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => { setShowForm(false); setEditingInvoice(null); resetForm(); }} className="glass-button px-5 py-2.5 rounded-xl hover-scale text-gray-800 dark:text-gray-100 border-gray-300/70 dark:border-white/20">
                  Cancel
                </button>
                <button type="submit" className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl hover-scale bg-gradient-to-r from-primary-500 to-accent-500 text-white font-medium shadow-md hover:opacity-95 border border-primary-600/20 dark:border-white/10">
                  {editingInvoice ? 'Update Invoice' : 'Create Invoice'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Header */}
      <div className="glass-card-premium">
        <div className="px-6 py-8 sm:p-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl xl:text-3xl font-bold font-heading text-gray-900 dark:text-white">
                Accounts Receivable
              </h1>
              <p className="mt-2 text-sm xl:text-base text-gray-600 dark:text-gray-300">
                Comprehensive billing and payment management for software houses
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                  Project-Based Billing
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                  Chart of Accounts Integration
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                  Multiple Billing Types
                </span>
              </div>
            </div>
            <div className="hidden sm:block">
              <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center">
                <ArrowTrendingUpIcon className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => setShowForm(true)}
              type="button"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl hover-scale text-white bg-gradient-to-r from-primary-500 to-accent-500 shadow-md hover:opacity-95 border border-primary-600/20 dark:border-white/10"
            >
              <PlusIcon className="w-5 h-5 shrink-0" aria-hidden />
              <span className="font-medium">New Invoice</span>
            </button>
            <button
              type="button"
              className="glass-button px-4 py-2 rounded-xl hover-scale inline-flex items-center gap-2 text-gray-800 dark:text-gray-100 border-gray-300/70 dark:border-white/20"
            >
              <DocumentDuplicateIcon className="w-5 h-5 shrink-0 text-gray-700 dark:text-gray-200" aria-hidden />
              <span className="font-medium">Bulk Actions</span>
            </button>
            <button
              type="button"
              onClick={handleViewAgingReport}
              className="glass-button px-4 py-2 rounded-xl hover-scale inline-flex items-center gap-2 text-gray-800 dark:text-gray-100 border-gray-300/70 dark:border-white/20"
            >
              <ChartBarIcon className="w-5 h-5 shrink-0 text-gray-700 dark:text-gray-200" aria-hidden />
              <span className="font-medium">Aging Report</span>
            </button>
            <button
              type="button"
              className="glass-button px-4 py-2 rounded-xl hover-scale inline-flex items-center gap-2 text-gray-800 dark:text-gray-100 border-gray-300/70 dark:border-white/20"
            >
              <ArrowDownTrayIcon className="w-5 h-5 shrink-0 text-gray-700 dark:text-gray-200" aria-hidden />
              <span className="font-medium">Export Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 xl:gap-6">
        {statsData.map((stat, index) => (
          <div key={index} className="glass-card-premium p-5 xl:p-6 hover-lift">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 xl:w-14 xl:h-14 rounded-2xl ${stat.iconBg} flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 xl:w-7 xl:h-7 ${stat.iconColor}`} />
              </div>
              <div>
                <p className="text-xs xl:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {stat.label}
                </p>
                <p className="text-2xl xl:text-3xl font-bold font-heading text-gray-900 dark:text-white">
                  {stat.value}
                </p>
              </div>
            </div>
          </div>
        ))}
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
            <div>
              <select
                value={filterClient}
                onChange={(e) => setFilterClient(e.target.value)}
                className="glass-input w-full px-4 py-3 text-sm font-medium rounded-xl"
              >
                <option value="all">All Clients</option>
                {clients.map(client => (
                  <option key={client._id} value={client._id}>{client.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setFilterStatus('all');
                  setFilterClient('all');
                  setFilterProject('all');
                }}
                className="glass-button px-4 py-2 rounded-xl hover-scale inline-flex items-center gap-2 text-gray-800 dark:text-gray-100 border-gray-300/70 dark:border-white/20"
              >
                <FunnelIcon className="h-4 w-4 shrink-0 text-gray-700 dark:text-gray-200" aria-hidden />
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
            Invoices & Payments ({filteredInvoices.length})
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
                    Client & Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Billing Type
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
                {filteredInvoices.map((invoice) => {
                  const BillingIcon = getBillingTypeIcon(invoice.billingType || 'hourly');
                  const aging = invoice.aging || 0;
                  return (
                    <tr key={invoice._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{invoice.invoiceNumber}</div>
                          {invoice.recurring && (
                            <span className="text-xs text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded">
                              Recurring
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{invoice.clientName}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{invoice.projectName || 'N/A'}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <BillingIcon className="h-4 w-4 text-gray-500" />
                          <span className={`px-2 py-1 text-xs rounded-full font-medium ${getBillingTypeColor(invoice.billingType || 'hourly')}`}>
                            {(invoice.billingType || 'hourly').replace('_', ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">{formatDate(invoice.issueDate)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">{formatDate(invoice.dueDate)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(invoice.total || 0)}</div>
                          {(invoice.remainingAmount || 0) > 0 && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Outstanding: {formatCurrency(invoice.remainingAmount)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                            {(invoice.status || 'draft').replace('_', ' ')}
                          </span>
                          {aging !== undefined && aging > 0 && (
                            <div className={`text-xs ${getAgingColor(aging)}`}>
                              {aging} days
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => setSelectedInvoice(invoice)}
                            className="p-2 text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200"
                            title="View Details"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          {(invoice.remainingAmount || 0) > 0 && (
                            <>
                              <button 
                                onClick={() => {
                                  setSelectedInvoice(invoice);
                                  setPaymentData(prev => ({ ...prev, invoiceId: invoice._id, amount: invoice.remainingAmount }));
                                  setShowPaymentForm(true);
                                }}
                                className="p-2 text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-all duration-200"
                                title="Record Payment"
                              >
                                <BanknotesIcon className="h-4 w-4" />
                              </button>
                              {invoice.status !== 'paid' && (
                                <button 
                                  onClick={() => handleSendReminder(invoice._id)}
                                  className="p-2 text-orange-600 dark:text-orange-400 hover:text-orange-900 dark:hover:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-all duration-200"
                                  title="Send Payment Reminder"
                                >
                                  <ArrowPathIcon className="h-4 w-4" />
                                </button>
                              )}
                            </>
                          )}
                          <button 
                            onClick={() => {
                              setEditingInvoice(invoice);
                              setFormData({
                                ...invoice,
                                billingItems: invoice.billingItems || [{
                                  type: 'development',
                                  description: '',
                                  hours: 0,
                                  rate: 0,
                                  amount: 0,
                                  accountCode: '4100',
                                  costCenter: 'Development'
                                }]
                              });
                              setShowForm(true);
                            }}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-all duration-200"
                            title="Edit"
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
              <EmptyState title="No invoices found" message="Create your first invoice to get started." className="max-w-lg mx-auto" />
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl hover-scale mx-auto text-white bg-gradient-to-r from-primary-500 to-accent-500 shadow-md hover:opacity-95 border border-primary-600/20 dark:border-white/10"
              >
                <PlusIcon className="w-5 h-5 shrink-0" aria-hidden />
                <span className="font-medium">Create Invoice</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Payment Form Modal */}
      {showPaymentForm && selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card-premium w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50">
              <h3 className="text-lg xl:text-xl font-bold font-heading text-gray-900 dark:text-white">
                Record Payment
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Record payment for invoice: {selectedInvoice.invoiceNumber}
              </p>
            </div>
            <form onSubmit={handlePaymentSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Payment Date *</label>
                  <input
                    type="date"
                    value={paymentData.paymentDate}
                    onChange={(e) => setPaymentData({...paymentData, paymentDate: e.target.value})}
                    className="glass-input w-full"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Payment Method *</label>
                  <select
                    value={paymentData.paymentMethod}
                    onChange={(e) => setPaymentData({...paymentData, paymentMethod: e.target.value})}
                    className="glass-input w-full"
                    required
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="check">Check</option>
                    <option value="cash">Cash</option>
                    <option value="paypal">PayPal</option>
                    <option value="stripe">Stripe</option>
                    <option value="wire_transfer">Wire Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Amount *</label>
                  <input
                    type="number"
                    value={paymentData.amount}
                    onChange={(e) => setPaymentData({...paymentData, amount: parseFloat(e.target.value) || 0})}
                    className="glass-input w-full"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Reference</label>
                  <input
                    type="text"
                    value={paymentData.reference}
                    onChange={(e) => setPaymentData({...paymentData, reference: e.target.value})}
                    className="glass-input w-full"
                    placeholder="Transaction ID, Check #, etc."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Deposit Account</label>
                  <select
                    value={paymentData.accountCode}
                    onChange={(e) => setPaymentData({...paymentData, accountCode: e.target.value})}
                    className="glass-input w-full"
                  >
                    {accounts.filter(acc => acc.type === 'asset').map(account => (
                      <option key={account.code} value={account.code}>{account.code} - {account.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Notes</label>
                <textarea
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData({...paymentData, notes: e.target.value})}
                  className="glass-input w-full"
                  rows="3"
                  placeholder="Payment notes or additional information..."
                />
              </div>

              {/* Payment Summary */}
              <div className="glass-card border-t border-gray-200/50 dark:border-gray-700/50 pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Invoice Total:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(selectedInvoice.total || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Already Paid:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(selectedInvoice.paidAmount || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Outstanding:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(selectedInvoice.remainingAmount || 0)}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200/50 dark:border-gray-700/50 pt-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Payment Amount:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(paymentData.amount)}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentForm(false);
                    setSelectedInvoice(null);
                    setPaymentData({
                      invoiceId: '',
                      paymentDate: '',
                      paymentMethod: 'bank_transfer',
                      amount: 0,
                      reference: '',
                      notes: '',
                      accountCode: '1110'
                    });
                  }}
                  className="glass-button px-4 py-2 rounded-xl hover-scale text-gray-800 dark:text-gray-100 border-gray-300/70 dark:border-white/20"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center px-4 py-2 rounded-xl hover-scale bg-gradient-to-r from-primary-500 to-accent-500 text-white shadow-md hover:opacity-95 border border-primary-600/20 dark:border-white/10"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Aging Report Panel */}
      {agingReport && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card-premium w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50 flex items-center justify-between">
              <h3 className="text-lg font-bold font-heading text-gray-900 dark:text-white">Aging Report</h3>
              <button
                onClick={() => setAgingReport(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                aria-label="Close"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">0&ndash;30 days</span>
                <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(agingReport['0-30'])}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">31&ndash;60 days</span>
                <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(agingReport['31-60'])}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">61&ndash;90 days</span>
                <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(agingReport['61-90'])}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-gray-200/50 dark:border-gray-700/50 pt-3">
                <span className="text-red-600 dark:text-red-400 font-medium">90+ days</span>
                <span className="font-medium text-red-600 dark:text-red-400">{formatCurrency(agingReport['90+'])}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, onConfirm: null, title: '', message: '' })}
        onConfirm={confirmDialog.onConfirm || (() => {})}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText="Send"
        cancelText="Cancel"
        variant="info"
      />
    </div>
  );
};

export default AccountsReceivable;
