import React, { useState, useEffect } from 'react';
import { 
  ArrowTrendingDownIcon,
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
  BuildingOfficeIcon,
  CloudIcon,
  ComputerDesktopIcon,
  WrenchScrewdriverIcon,
  CreditCardIcon,
  CheckBadgeIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { tenantApiService } from '../../../../../../shared/services/tenant/tenant-api.service';
import { useTenantAuth } from '../../../../../../app/providers/TenantAuthContext';
import LoadingSpinner from '../../../../../../shared/components/feedback/LoadingSpinner';
import EmptyState from '../../../../../../shared/components/feedback/EmptyState';
import { useTenantSlug } from '../../../../../../shared/hooks/useTenantSlug';

const AccountsPayable = () => {
  const tenantSlug = useTenantSlug();
  const { isAuthenticated, loading: authLoading, user } = useTenantAuth();
  const [loading, setLoading] = useState(true);
  const [bills, setBills] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [projects, setProjects] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [selectedBill, setSelectedBill] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterVendor, setFilterVendor] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [stats, setStats] = useState({
    total: 0,
    paid: 0,
    pending: 0,
    overdue: 0
  });
  const [formData, setFormData] = useState({
    billNumber: '',
    vendorId: '',
    projectId: '',
    expenseCategory: 'technology',
    issueDate: '',
    dueDate: '',
    paymentTerms: '30',
    expenseItems: [{
      type: 'cloud_compute',
      description: '',
      amount: 0,
      accountCode: '5110',
      costCenter: 'Development'
    }],
    subtotal: 0,
    taxRate: 10,
    taxAmount: 0,
    total: 0,
    notes: '',
    status: 'pending',
    expenseAccount: '5110',
    costCenter: 'Development',
    projectSpecific: true,
    requiresApproval: true,
    approvedBy: '',
    approvedDate: '',
    recurring: false,
    recurringFrequency: 'monthly'
  });
  const [vendorFormData, setVendorFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    paymentTerms: '30',
    taxId: '',
    vendorType: 'cloud_services',
    industry: 'Technology',
    contactPerson: '',
    creditLimit: 0,
    preferredPaymentMethod: 'bank_transfer'
  });
  const [paymentData, setPaymentData] = useState({
    billId: '',
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
      
      // Fetch bills
      const billsData = await tenantApiService.getAccountsPayable(tenantSlug);
      if (billsData) {
        setBills(billsData.bills || []);
        setStats({
          total: billsData.total || 0,
          paid: billsData.paid || 0,
          pending: billsData.pending || 0,
          overdue: billsData.overdue || 0
        });
      } else {
        setBills([]);
        setStats({ total: 0, paid: 0, pending: 0, overdue: 0 });
      }

      // Fetch vendors
      try {
        const vendorsData = await tenantApiService.getVendors(tenantSlug);
        // Handle different response formats - ensure we always have an array
        let vendorsArray = [];
        if (Array.isArray(vendorsData)) {
          vendorsArray = vendorsData;
        } else if (vendorsData && Array.isArray(vendorsData.data)) {
          vendorsArray = vendorsData.data;
        } else if (vendorsData && Array.isArray(vendorsData.vendors)) {
          vendorsArray = vendorsData.vendors;
        } else if (vendorsData && typeof vendorsData === 'object') {
          // If it's an object but not an array, try to extract array from common properties
          vendorsArray = vendorsData.list || vendorsData.items || [];
        }
        setVendors(vendorsArray);
      } catch (err) {
        console.error('Error fetching vendors:', err);
        setVendors([]);
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
          { code: '5110', name: 'Software Development Expenses', type: 'expense' },
          { code: '5120', name: 'Software Licenses & Subscriptions', type: 'expense' },
          { code: '5130', name: 'Contractor & Freelancer Costs', type: 'expense' },
          { code: '5140', name: 'Office & Administrative Expenses', type: 'expense' },
          { code: '5150', name: 'Marketing & Sales Expenses', type: 'expense' },
          { code: '1110', name: 'Cash and Cash Equivalents', type: 'asset' },
          { code: '2100', name: 'Accounts Payable', type: 'liability' }
        ]);
      }
    } catch (err) {
      console.error('Error fetching accounts payable:', err);
      setBills([]);
      setStats({ total: 0, paid: 0, pending: 0, overdue: 0 });
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      paid: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      overdue: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      partially_paid: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
      cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
  };

  const getExpenseCategoryIcon = (category) => {
    const icons = {
      cloud_services: CloudIcon,
      software_licenses: ComputerDesktopIcon,
      contractor_services: UserGroupIcon,
      office_expenses: BuildingOfficeIcon,
      marketing_expenses: ChartBarIcon,
      technology: WrenchScrewdriverIcon
    };
    return icons[category] || DocumentTextIcon;
  };

  const getExpenseCategoryColor = (category) => {
    const colors = {
      cloud_services: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      software_licenses: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      contractor_services: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
      office_expenses: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
      marketing_expenses: 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-400',
      technology: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400'
    };
    return colors[category] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
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

  const getFilteredBills = () => {
    let filtered = bills;
    
    if (searchTerm) {
      filtered = filtered.filter(bill =>
        bill.billNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bill.vendorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bill.projectName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(bill => bill.status === filterStatus);
    }
    
    if (filterVendor !== 'all') {
      filtered = filtered.filter(bill => bill.vendorId === filterVendor);
    }
    
    if (filterCategory !== 'all') {
      filtered = filtered.filter(bill => bill.expenseCategory === filterCategory);
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
    const filtered = getFilteredBills();
    return {
      totalOutstanding: filtered.reduce((sum, bill) => sum + (bill.remainingAmount || 0), 0),
      totalPaid: filtered.reduce((sum, bill) => sum + (bill.paidAmount || 0), 0),
      overdueAmount: filtered.filter(bill => bill.status === 'overdue').reduce((sum, bill) => sum + (bill.remainingAmount || 0), 0),
      overdueCount: filtered.filter(bill => bill.status === 'overdue').length
    };
  };

  const addExpenseItem = () => {
    const newItem = {
      type: 'cloud_compute',
      description: '',
      amount: 0,
      accountCode: '5110',
      costCenter: 'Development'
    };
    setFormData(prev => ({
      ...prev,
      expenseItems: [...prev.expenseItems, newItem]
    }));
  };

  const updateExpenseItem = (index, field, value) => {
    const newItems = [...formData.expenseItems];
    newItems[index] = { ...newItems[index], [field]: value };
    
    setFormData(prev => ({
      ...prev,
      expenseItems: newItems,
      subtotal: newItems.reduce((sum, item) => sum + (item.amount || 0), 0)
    }));
  };

  const removeExpenseItem = (index) => {
    if (formData.expenseItems.length > 1) {
      const newItems = formData.expenseItems.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        expenseItems: newItems,
        subtotal: newItems.reduce((sum, item) => sum + (item.amount || 0), 0)
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const billData = {
        ...formData,
        taxAmount: formData.subtotal * (formData.taxRate / 100),
        total: formData.subtotal + (formData.subtotal * (formData.taxRate / 100))
      };
      
      if (editingBill) {
        await tenantApiService.updateBill(tenantSlug, editingBill._id, billData);
      } else {
        await tenantApiService.createBill(tenantSlug, billData);
      }
      
      setShowForm(false);
      setEditingBill(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving bill:', error);
    }
  };

  const handleVendorSubmit = async (e) => {
    e.preventDefault();
    try {
      await tenantApiService.createVendor(tenantSlug, vendorFormData);
      setShowVendorForm(false);
      setVendorFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        paymentTerms: '30',
        taxId: '',
        vendorType: 'cloud_services',
        industry: 'Technology',
        contactPerson: '',
        creditLimit: 0,
        preferredPaymentMethod: 'bank_transfer'
      });
      fetchData();
    } catch (error) {
      console.error('Error saving vendor:', error);
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    try {
      // Use new AP API method
      await tenantApiService.recordBillPayment(tenantSlug, paymentData.billId, {
        paymentDate: paymentData.paymentDate,
        paymentMethod: paymentData.paymentMethod,
        amount: paymentData.amount,
        reference: paymentData.reference,
        notes: paymentData.notes,
        accountCode: paymentData.accountCode
      });
      setShowPaymentForm(false);
      setSelectedBill(null);
      setPaymentData({
        billId: '',
        paymentDate: '',
        paymentMethod: 'bank_transfer',
        amount: 0,
        reference: '',
        notes: '',
        accountCode: '1110'
      });
      fetchData();
      alert('Payment recorded successfully!');
    } catch (error) {
      console.error('Error recording payment:', error);
      alert(error.message || 'Failed to record payment. Please try again.');
    }
  };

  const handleSchedulePayment = async (billId, scheduleData) => {
    try {
      await tenantApiService.scheduleBillPayment(tenantSlug, billId, scheduleData);
      alert('Payment scheduled successfully!');
      fetchData();
    } catch (error) {
      console.error('Error scheduling payment:', error);
      alert(error.message || 'Failed to schedule payment. Please try again.');
    }
  };

  const handleApproveBill = async (billId) => {
    if (!window.confirm('Approve this bill for payment?')) {
      return;
    }
    try {
      // Get current user ID - in production, get from auth context
      const approvedBy = user?._id || user?.id || '';
      await tenantApiService.approveBill(tenantSlug, billId, approvedBy);
      alert('Bill approved successfully!');
      fetchData();
    } catch (error) {
      console.error('Error approving bill:', error);
      alert(error.message || 'Failed to approve bill. Please try again.');
    }
  };

  const handleViewAgingReport = async () => {
    try {
      const agingData = await tenantApiService.getAgingReportAP(tenantSlug);
      // Display aging report
      console.log('Aging Report:', agingData);
      alert(`Aging Report:\n0-30 days: ${formatCurrency(agingData?.agingBuckets?.['0-30'] || 0)}\n31-60 days: ${formatCurrency(agingData?.agingBuckets?.['31-60'] || 0)}\n61-90 days: ${formatCurrency(agingData?.agingBuckets?.['61-90'] || 0)}\n90+ days: ${formatCurrency(agingData?.agingBuckets?.['90+'] || 0)}`);
    } catch (error) {
      console.error('Error fetching aging report:', error);
      alert(error.message || 'Failed to fetch aging report.');
    }
  };

  const resetForm = () => {
    setFormData({
      billNumber: '',
      vendorId: '',
      projectId: '',
      expenseCategory: 'technology',
      issueDate: '',
      dueDate: '',
      paymentTerms: '30',
      expenseItems: [{
        type: 'cloud_compute',
        description: '',
        amount: 0,
        accountCode: '5110',
        costCenter: 'Development'
      }],
      subtotal: 0,
      taxRate: 10,
      taxAmount: 0,
      total: 0,
      notes: '',
      status: 'pending',
      expenseAccount: '5110',
      costCenter: 'Development',
      projectSpecific: true,
      requiresApproval: true,
      approvedBy: '',
      approvedDate: '',
      recurring: false,
      recurringFrequency: 'monthly'
    });
  };

  if (loading) {
    return <LoadingSpinner message="Loading accounts payable..." className="min-h-[40vh] bg-transparent" />;
  }

  const totals = calculateTotals();
  const filteredBills = getFilteredBills();

  // ── Full-page Bill Form ───────────────────────────────────────────────────
  if (showForm) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Page Header */}
        <div className="glass-card-premium">
          <div className="px-6 py-5 sm:px-8 flex items-center gap-4">
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditingBill(null); resetForm(); }}
              className="glass-button p-2 rounded-xl hover-scale text-gray-800 dark:text-gray-100 text-lg font-semibold leading-none border-gray-300/70 dark:border-white/20"
              title="Back to Bills"
            >
              ←
            </button>
            <div>
              <h1 className="text-xl xl:text-2xl font-bold font-heading text-gray-900 dark:text-white">
                {editingBill ? 'Edit Bill' : 'New Bill'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Software house expense management with Chart of Accounts integration
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="glass-card-premium p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 pb-3 border-b border-gray-200/50 dark:border-gray-700/50">Bill Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Bill Number *</label>
                <input type="text" value={formData.billNumber} onChange={(e) => setFormData({...formData, billNumber: e.target.value})} className="glass-input w-full" placeholder="BILL-2024-XXX" required />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Vendor *</label>
                <select value={formData.vendorId} onChange={(e) => setFormData({...formData, vendorId: e.target.value})} className="glass-input w-full" required>
                  <option value="">Select Vendor</option>
                  {vendors.map(vendor => <option key={vendor._id} value={vendor._id}>{vendor.name}</option>)}
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
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Expense Category *</label>
                <select value={formData.expenseCategory} onChange={(e) => setFormData({...formData, expenseCategory: e.target.value})} className="glass-input w-full" required>
                  <option value="cloud_services">Cloud Services</option>
                  <option value="software_licenses">Software Licenses</option>
                  <option value="contractor_services">Contractor Services</option>
                  <option value="office_expenses">Office Expenses</option>
                  <option value="marketing_expenses">Marketing Expenses</option>
                  <option value="technology">Technology</option>
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
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Expense Account *</label>
                <select value={formData.expenseAccount} onChange={(e) => setFormData({...formData, expenseAccount: e.target.value})} className="glass-input w-full" required>
                  {accounts.filter(acc => acc.type === 'expense').map(account => (
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

          {/* Expense Items */}
          <div className="glass-card-premium p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200/50 dark:border-gray-700/50">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Expense Items</h3>
              <button type="button" onClick={addExpenseItem} className="glass-button px-3 py-2 rounded-xl hover-scale inline-flex items-center gap-2 text-sm text-gray-800 dark:text-gray-100 border-gray-300/70 dark:border-white/20">
                <PlusIcon className="h-4 w-4 shrink-0 text-gray-700 dark:text-gray-200" aria-hidden /> Add Item
              </button>
            </div>
            <div className="space-y-3">
              {formData.expenseItems.map((item, index) => (
                <div key={index} className="glass-card p-4 rounded-xl">
                  <div className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-3">
                      <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 block">Type</label>
                      <select value={item.type} onChange={(e) => updateExpenseItem(index, 'type', e.target.value)} className="glass-input w-full text-sm">
                        <option value="cloud_compute">Cloud Compute</option>
                        <option value="cloud_storage">Cloud Storage</option>
                        <option value="cloud_database">Cloud Database</option>
                        <option value="software_license">Software License</option>
                        <option value="contractor_work">Contractor Work</option>
                        <option value="office_rent">Office Rent</option>
                        <option value="utilities">Utilities</option>
                        <option value="marketing">Marketing</option>
                        <option value="hardware">Hardware</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="col-span-6">
                      <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 block">Description *</label>
                      <input type="text" value={item.description} onChange={(e) => updateExpenseItem(index, 'description', e.target.value)} className="glass-input w-full text-sm" placeholder="e.g., EC2 Instances - Production" required />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 block">Amount *</label>
                      <input type="number" value={item.amount} onChange={(e) => updateExpenseItem(index, 'amount', parseFloat(e.target.value) || 0)} className="glass-input w-full text-sm" min="0" step="0.01" required />
                    </div>
                    <div className="col-span-1">
                      <button type="button" onClick={() => removeExpenseItem(index)} className="w-full p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all" disabled={formData.expenseItems.length === 1}>
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
                  {[['projectSpecific','Project Specific'],['requiresApproval','Requires Approval'],['recurring','Recurring Bill']].map(([key, label]) => (
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
                <button type="button" onClick={() => { setShowForm(false); setEditingBill(null); resetForm(); }} className="glass-button px-5 py-2.5 rounded-xl hover-scale text-gray-800 dark:text-gray-100 border-gray-300/70 dark:border-white/20">
                  Cancel
                </button>
                <button type="submit" className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl hover-scale bg-gradient-to-r from-primary-500 to-accent-500 text-white font-medium shadow-md hover:opacity-95 border border-primary-600/20 dark:border-white/10">
                  {editingBill ? 'Update Bill' : 'Create Bill'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    );
  }

  // ── Full-page Vendor Form ─────────────────────────────────────────────────
  if (showVendorForm) {
    const resetVendor = () => setVendorFormData({ name: '', email: '', phone: '', address: '', paymentTerms: '30', taxId: '', vendorType: 'cloud_services', industry: 'Technology', contactPerson: '', creditLimit: 0, preferredPaymentMethod: 'bank_transfer' });
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="glass-card-premium">
          <div className="px-6 py-5 sm:px-8 flex items-center gap-4">
            <button type="button" onClick={() => { setShowVendorForm(false); resetVendor(); }} className="glass-button p-2 rounded-xl hover-scale text-gray-800 dark:text-gray-100 text-lg font-semibold leading-none border-gray-300/70 dark:border-white/20" title="Back to Bills">←</button>
            <div>
              <h1 className="text-xl xl:text-2xl font-bold font-heading text-gray-900 dark:text-white">Add New Vendor</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Comprehensive vendor management for software houses</p>
            </div>
          </div>
        </div>
        <form onSubmit={handleVendorSubmit} className="space-y-6">
          <div className="glass-card-premium p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 pb-3 border-b border-gray-200/50 dark:border-gray-700/50">Vendor Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Vendor Name *</label>
                <input type="text" value={vendorFormData.name} onChange={(e) => setVendorFormData({...vendorFormData, name: e.target.value})} className="glass-input w-full" required />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Email *</label>
                <input type="email" value={vendorFormData.email} onChange={(e) => setVendorFormData({...vendorFormData, email: e.target.value})} className="glass-input w-full" required />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Phone</label>
                <input type="tel" value={vendorFormData.phone} onChange={(e) => setVendorFormData({...vendorFormData, phone: e.target.value})} className="glass-input w-full" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Contact Person</label>
                <input type="text" value={vendorFormData.contactPerson} onChange={(e) => setVendorFormData({...vendorFormData, contactPerson: e.target.value})} className="glass-input w-full" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Vendor Type *</label>
                <select value={vendorFormData.vendorType} onChange={(e) => setVendorFormData({...vendorFormData, vendorType: e.target.value})} className="glass-input w-full" required>
                  <option value="cloud_services">Cloud Services</option>
                  <option value="software_licenses">Software Licenses</option>
                  <option value="contractor_services">Contractor Services</option>
                  <option value="office_expenses">Office Expenses</option>
                  <option value="marketing_expenses">Marketing Expenses</option>
                  <option value="technology">Technology</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Industry</label>
                <select value={vendorFormData.industry} onChange={(e) => setVendorFormData({...vendorFormData, industry: e.target.value})} className="glass-input w-full">
                  <option value="Technology">Technology</option>
                  <option value="Cloud Computing">Cloud Computing</option>
                  <option value="Software Development">Software Development</option>
                  <option value="Real Estate">Real Estate</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Payment Terms</label>
                <select value={vendorFormData.paymentTerms} onChange={(e) => setVendorFormData({...vendorFormData, paymentTerms: e.target.value})} className="glass-input w-full">
                  <option value="15">15 days</option>
                  <option value="30">30 days</option>
                  <option value="45">45 days</option>
                  <option value="60">60 days</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Preferred Payment Method</label>
                <select value={vendorFormData.preferredPaymentMethod} onChange={(e) => setVendorFormData({...vendorFormData, preferredPaymentMethod: e.target.value})} className="glass-input w-full">
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="check">Check</option>
                  <option value="paypal">PayPal</option>
                  <option value="stripe">Stripe</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Tax ID</label>
                <input type="text" value={vendorFormData.taxId} onChange={(e) => setVendorFormData({...vendorFormData, taxId: e.target.value})} className="glass-input w-full" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Credit Limit</label>
                <input type="number" value={vendorFormData.creditLimit} onChange={(e) => setVendorFormData({...vendorFormData, creditLimit: parseFloat(e.target.value) || 0})} className="glass-input w-full" min="0" step="1000" />
              </div>
            </div>
            <div className="mt-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Address</label>
              <textarea value={vendorFormData.address} onChange={(e) => setVendorFormData({...vendorFormData, address: e.target.value})} className="glass-input w-full" rows="3" placeholder="Vendor address..." />
            </div>
          </div>
          <div className="glass-card-premium p-6 flex justify-end gap-3">
            <button type="button" onClick={() => { setShowVendorForm(false); resetVendor(); }} className="glass-button px-5 py-2.5 rounded-xl hover-scale text-gray-800 dark:text-gray-100 border-gray-300/70 dark:border-white/20">Cancel</button>
            <button type="submit" className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl hover-scale bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium shadow-md hover:opacity-95 border border-emerald-700/25 dark:border-white/10">Add Vendor</button>
          </div>
        </form>
      </div>
    );
  }

  const statsData = [
    { label: 'Total Payable', value: formatCurrency(stats.total), icon: ArrowTrendingDownIcon, iconBg: 'bg-red-50 dark:bg-red-900/20', iconColor: 'text-red-600 dark:text-red-400' },
    { label: 'Paid', value: formatCurrency(stats.paid), icon: CheckCircleIcon, iconBg: 'bg-green-50 dark:bg-green-900/20', iconColor: 'text-green-600 dark:text-green-400' },
    { label: 'Pending', value: formatCurrency(stats.pending), icon: ClockIcon, iconBg: 'bg-amber-50 dark:bg-amber-900/20', iconColor: 'text-amber-600 dark:text-amber-400' },
    { label: 'Overdue', value: formatCurrency(stats.overdue), icon: ExclamationTriangleIcon, iconBg: 'bg-rose-50 dark:bg-rose-900/20', iconColor: 'text-rose-600 dark:text-rose-400' }
  ];

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Header */}
      <div className="glass-card-premium">
        <div className="px-6 py-8 sm:p-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl xl:text-3xl font-bold font-heading text-gray-900 dark:text-white">
                Accounts Payable
              </h1>
              <p className="mt-2 text-sm xl:text-base text-gray-600 dark:text-gray-300">
                Comprehensive expense management and vendor payment system for software houses
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                  Expense Categories
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                  Chart of Accounts Integration
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                  Approval Workflow
                </span>
              </div>
            </div>
            <div className="hidden sm:block">
              <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center">
                <ArrowTrendingDownIcon className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setShowVendorForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl hover-scale text-white bg-gradient-to-r from-green-500 to-emerald-600 shadow-md hover:opacity-95 border border-emerald-700/25 dark:border-white/10"
            >
              <BuildingOfficeIcon className="w-5 h-5 shrink-0" aria-hidden />
              <span className="font-medium">Add Vendor</span>
            </button>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl hover-scale text-white bg-gradient-to-r from-primary-500 to-accent-500 shadow-md hover:opacity-95 border border-primary-600/20 dark:border-white/10"
            >
              <PlusIcon className="w-5 h-5 shrink-0" aria-hidden />
              <span className="font-medium">New Bill</span>
            </button>
            <button type="button" className="glass-button px-4 py-2 rounded-xl hover-scale inline-flex items-center gap-2 text-gray-800 dark:text-gray-100 border-gray-300/70 dark:border-white/20">
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
            <button type="button" className="glass-button px-4 py-2 rounded-xl hover-scale inline-flex items-center gap-2 text-gray-800 dark:text-gray-100 border-gray-300/70 dark:border-white/20">
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
                placeholder="Search bills..."
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
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="partially_paid">Partially Paid</option>
              </select>
            </div>
            <div>
              <select
                value={filterVendor}
                onChange={(e) => setFilterVendor(e.target.value)}
                className="glass-input w-full px-4 py-3 text-sm font-medium rounded-xl"
              >
                <option value="all">All Vendors</option>
                {vendors.map(vendor => (
                  <option key={vendor._id} value={vendor._id}>{vendor.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setFilterStatus('all');
                  setFilterVendor('all');
                  setFilterCategory('all');
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

      {/* Bills Table */}
      <div className="glass-card-premium">
        <div className="px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50">
          <h2 className="text-lg xl:text-xl font-bold font-heading text-gray-900 dark:text-white flex items-center">
            <DocumentTextIcon className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
            Bills & Payments ({filteredBills.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          {filteredBills.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="glass-card">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Bill
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Vendor & Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Expense Category
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
                    Status & Aging
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="glass-card divide-y divide-gray-200 dark:divide-gray-700">
                {filteredBills.map((bill) => {
                  const CategoryIcon = getExpenseCategoryIcon(bill.expenseCategory || 'technology');
                  const aging = bill.aging || 0;
                  return (
                    <tr key={bill._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{bill.billNumber}</div>
                          {bill.recurring && (
                            <span className="text-xs text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded">
                              Recurring
                            </span>
                          )}
                          {bill.requiresApproval && bill.status === 'pending' && (
                            <span className="text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded">
                              Needs Approval
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{bill.vendorName}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{bill.projectName || 'General Expense'}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <CategoryIcon className="h-4 w-4 text-gray-500" />
                          <span className={`px-2 py-1 text-xs rounded-full font-medium ${getExpenseCategoryColor(bill.expenseCategory || 'technology')}`}>
                            {(bill.expenseCategory || 'technology').replace('_', ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">{formatDate(bill.issueDate)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">{formatDate(bill.dueDate)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(bill.total || 0)}</div>
                          {(bill.remainingAmount || 0) > 0 && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Outstanding: {formatCurrency(bill.remainingAmount)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(bill.status)}`}>
                            {(bill.status || 'pending').replace('_', ' ')}
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
                            onClick={() => setSelectedBill(bill)}
                            className="p-2 text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200"
                            title="View Details"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          {(bill.remainingAmount || 0) > 0 && (
                            <>
                              <button 
                                onClick={() => {
                                  setSelectedBill(bill);
                                  setPaymentData(prev => ({ ...prev, billId: bill._id, amount: bill.remainingAmount }));
                                  setShowPaymentForm(true);
                                }}
                                className="p-2 text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-all duration-200"
                                title="Record Payment"
                              >
                                <BanknotesIcon className="h-4 w-4" />
                              </button>
                              {bill.status === 'pending' && bill.requiresApproval && (
                                <button 
                                  onClick={() => handleApproveBill(bill._id)}
                                  className="p-2 text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200"
                                  title="Approve Bill"
                                >
                                  <CheckBadgeIcon className="h-4 w-4" />
                                </button>
                              )}
                            </>
                          )}
                          <button 
                            onClick={() => {
                              setEditingBill(bill);
                              setFormData({
                                ...bill,
                                expenseItems: bill.expenseItems || [{
                                  type: 'cloud_compute',
                                  description: '',
                                  amount: 0,
                                  accountCode: '5110',
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
              <EmptyState
                title="No bills found"
                message="Create your first bill to get started."
                className="max-w-lg mx-auto"
              />
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl hover-scale mx-auto text-white bg-gradient-to-r from-primary-500 to-accent-500 shadow-md hover:opacity-95 border border-primary-600/20 dark:border-white/10"
              >
                <PlusIcon className="w-5 h-5 shrink-0" aria-hidden />
                <span className="font-medium">Create Bill</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Payment Form Modal */}
      {showPaymentForm && selectedBill && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card-premium w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50">
              <h3 className="text-lg xl:text-xl font-bold font-heading text-gray-900 dark:text-white">
                Record Payment
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Record payment for bill: {selectedBill.billNumber}
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
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Payment Account</label>
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
                    <span className="text-sm text-gray-600 dark:text-gray-400">Bill Total:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(selectedBill.total || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Already Paid:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(selectedBill.paidAmount || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Outstanding:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(selectedBill.remainingAmount || 0)}</span>
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
                    setSelectedBill(null);
                    setPaymentData({
                      billId: '',
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

    </div>
  );
};

export default AccountsPayable;
