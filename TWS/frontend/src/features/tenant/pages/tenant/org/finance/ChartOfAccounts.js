import React, { useState, useEffect } from 'react';
import { 
  DocumentTextIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  CogIcon,
  DocumentDuplicateIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { tenantApiService } from '../../../../../../shared/services/tenant/tenant-api.service';
import { useTenantSlug } from '../../../../../../shared/hooks/useTenantSlug';
import { useTenantCurrency } from '../../../../../../shared/hooks/useTenantCurrency';
import { formatCurrency } from '../../../../../../shared/utils/currency';
import LoadingSpinner from '../../../../../../shared/components/feedback/LoadingSpinner';
import toast from 'react-hot-toast';
import ConfirmDialog from '../../../../../../components/ConfirmDialog/ConfirmDialog';

const ChartOfAccounts = () => {
  const tenantSlug = useTenantSlug();
  const currency = useTenantCurrency(tenantSlug);
  const [accounts, setAccounts] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, onConfirm: null, title: '', message: '', confirmText: 'Confirm', variant: 'danger' });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [expandedAccounts, setExpandedAccounts] = useState(new Set());
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'asset',
    parentAccount: '',
    level: 1,
    description: '',
    tags: [],
    isActive: true,
    normalBalance: 'debit',
    category: '',
    subcategory: '',
    taxCategory: '',
    costCenter: '',
    projectSpecific: false,
    allowPosting: true,
    requireApproval: false,
    budgetAmount: 0,
    budgetPeriod: 'monthly'
  });

  useEffect(() => {
    fetchAccounts();
  }, [tenantSlug]);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      // Use new organization route
      const response = await tenantApiService.getChartOfAccountsOrg(tenantSlug);
      
      // makeRequest() already unwraps `data`, so response is typically an array.
      let accountsData = [];
      if (Array.isArray(response)) {
        accountsData = response;
      } else if (response && Array.isArray(response.accounts)) {
        accountsData = response.accounts;
      } else if (response && Array.isArray(response.flat)) {
        accountsData = response.flat;
      } else if (response && response.data && Array.isArray(response.data)) {
        accountsData = response.data;
      }
      
      // If API returns data, use it; otherwise use default structure
      if (accountsData && accountsData.length > 0) {
        setAccounts(accountsData);
      } else {
        // Default comprehensive Chart of Accounts for Software Houses
        const defaultAccounts = [
          // ASSETS (1000-1999)
          {
            _id: '1',
            code: '1000',
            name: 'ASSETS',
            type: 'asset',
            level: 1,
            description: 'All company assets',
            isActive: true,
            normalBalance: 'debit',
            category: 'asset',
            children: [
              {
                _id: '2',
                code: '1100',
                name: 'Current Assets',
                type: 'asset',
                level: 2,
                description: 'Assets expected to be converted to cash within one year',
                isActive: true,
                normalBalance: 'debit',
                category: 'current_asset',
                children: [
                  {
                    _id: '3',
                    code: '1110',
                    name: 'Cash and Cash Equivalents',
                    type: 'asset',
                    level: 3,
                    description: 'Cash, checking accounts, savings accounts',
                    isActive: true,
                    normalBalance: 'debit',
                    category: 'cash',
                    subcategory: 'operating_cash',
                    allowPosting: true,
                    budgetAmount: 50000,
                    budgetPeriod: 'monthly'
                  },
                  {
                    _id: '4',
                    code: '1120',
                    name: 'Accounts Receivable',
                    type: 'asset',
                    level: 3,
                    description: 'Amounts owed by clients for services rendered',
                    isActive: true,
                    normalBalance: 'debit',
                    category: 'receivables',
                    subcategory: 'trade_receivables',
                    allowPosting: true,
                    projectSpecific: true
                  },
                  {
                    _id: '5',
                    code: '1130',
                    name: 'Prepaid Expenses',
                    type: 'asset',
                    level: 3,
                    description: 'Insurance, software licenses, office rent paid in advance',
                    isActive: true,
                    normalBalance: 'debit',
                    category: 'prepaid',
                    allowPosting: true
                  }
                ]
              },
              {
                _id: '7',
                code: '1500',
                name: 'Fixed Assets',
                type: 'asset',
                level: 2,
                description: 'Long-term assets used in business operations',
                isActive: true,
                normalBalance: 'debit',
                category: 'fixed_asset',
                children: [
                  {
                    _id: '8',
                    code: '1510',
                    name: 'Computer Equipment',
                    type: 'asset',
                    level: 3,
                    description: 'Desktops, laptops, servers, networking equipment',
                    isActive: true,
                    normalBalance: 'debit',
                    category: 'equipment',
                    subcategory: 'computer_hardware',
                    costCenter: 'IT'
                  },
                  {
                    _id: '9',
                    code: '1520',
                    name: 'Software Licenses (Capitalized)',
                    type: 'asset',
                    level: 3,
                    description: 'Major software purchases capitalized for depreciation',
                    isActive: true,
                    normalBalance: 'debit',
                    category: 'software',
                    subcategory: 'capitalized_software'
                  }
                ]
              }
            ]
          },
          // LIABILITIES (2000-2999)
          {
            _id: '14',
            code: '2000',
            name: 'LIABILITIES',
            type: 'liability',
            level: 1,
            description: 'All company liabilities',
            isActive: true,
            normalBalance: 'credit',
            category: 'liability',
            children: [
              {
                _id: '15',
                code: '2100',
                name: 'Current Liabilities',
                type: 'liability',
                level: 2,
                description: 'Debts due within one year',
                isActive: true,
                normalBalance: 'credit',
                category: 'current_liability',
                children: [
                  {
                    _id: '16',
                    code: '2110',
                    name: 'Accounts Payable',
                    type: 'liability',
                    level: 3,
                    description: 'Amounts owed to vendors and suppliers',
                    isActive: true,
                    normalBalance: 'credit',
                    category: 'payables',
                    subcategory: 'trade_payables',
                    allowPosting: true
                  },
                  {
                    _id: '17',
                    code: '2120',
                    name: 'Accrued Salaries',
                    type: 'liability',
                    level: 3,
                    description: 'Unpaid salaries and wages',
                    isActive: true,
                    normalBalance: 'credit',
                    category: 'accrued',
                    subcategory: 'payroll',
                    costCenter: 'HR'
                  }
                ]
              }
            ]
          },
          // EQUITY (3000-3999)
          {
            _id: '22',
            code: '3000',
            name: 'EQUITY',
            type: 'equity',
            level: 1,
            description: 'Owner\'s equity and retained earnings',
            isActive: true,
            normalBalance: 'credit',
            category: 'equity',
            children: [
              {
                _id: '23',
                code: '3100',
                name: 'Owner\'s Equity',
                type: 'equity',
                level: 2,
                description: 'Initial investment and additional contributions',
                isActive: true,
                normalBalance: 'credit',
                category: 'owner_equity'
              },
              {
                _id: '24',
                code: '3200',
                name: 'Retained Earnings',
                type: 'equity',
                level: 2,
                description: 'Accumulated profits retained in the business',
                isActive: true,
                normalBalance: 'credit',
                category: 'retained_earnings'
              }
            ]
          },
          // REVENUE (4000-4999)
          {
            _id: '25',
            code: '4000',
            name: 'REVENUE',
            type: 'revenue',
            level: 1,
            description: 'All revenue accounts',
            isActive: true,
            normalBalance: 'credit',
            category: 'revenue',
            children: [
              {
                _id: '26',
                code: '4100',
                name: 'Software Development Revenue',
                type: 'revenue',
                level: 2,
                description: 'Revenue from custom software development projects',
                isActive: true,
                normalBalance: 'credit',
                category: 'service_revenue',
                subcategory: 'development',
                projectSpecific: true,
                allowPosting: true,
                budgetAmount: 100000,
                budgetPeriod: 'monthly'
              },
              {
                _id: '27',
                code: '4200',
                name: 'Software Licensing Revenue',
                type: 'revenue',
                level: 2,
                description: 'Revenue from software license sales',
                isActive: true,
                normalBalance: 'credit',
                category: 'product_revenue',
                subcategory: 'licenses'
              },
              {
                _id: '28',
                code: '4300',
                name: 'Consulting Revenue',
                type: 'revenue',
                level: 2,
                description: 'Revenue from IT consulting services',
                isActive: true,
                normalBalance: 'credit',
                category: 'service_revenue',
                subcategory: 'consulting',
                projectSpecific: true
              },
              {
                _id: '29',
                code: '4400',
                name: 'Maintenance & Support Revenue',
                type: 'revenue',
                level: 2,
                description: 'Recurring revenue from software maintenance',
                isActive: true,
                normalBalance: 'credit',
                category: 'service_revenue',
                subcategory: 'maintenance'
              }
            ]
          },
          // EXPENSES (5000-6999)
          {
            _id: '30',
            code: '5000',
            name: 'OPERATING EXPENSES',
            type: 'expense',
            level: 1,
            description: 'All operating expenses',
            isActive: true,
            normalBalance: 'debit',
            category: 'expense',
            children: [
              {
                _id: '31',
                code: '5100',
                name: 'Personnel Expenses',
                type: 'expense',
                level: 2,
                description: 'All employee-related costs',
                isActive: true,
                normalBalance: 'debit',
                category: 'personnel',
                costCenter: 'HR',
                children: [
                  {
                    _id: '32',
                    code: '5110',
                    name: 'Salaries - Development Team',
                    type: 'expense',
                    level: 3,
                    description: 'Salaries for software developers',
                    isActive: true,
                    normalBalance: 'debit',
                    category: 'salaries',
                    subcategory: 'development',
                    costCenter: 'Development',
                    projectSpecific: true,
                    budgetAmount: 80000,
                    budgetPeriod: 'monthly'
                  },
                  {
                    _id: '33',
                    code: '5120',
                    name: 'Salaries - Management',
                    type: 'expense',
                    level: 3,
                    description: 'Salaries for management team',
                    isActive: true,
                    normalBalance: 'debit',
                    category: 'salaries',
                    subcategory: 'management',
                    costCenter: 'Management'
                  }
                ]
              },
              {
                _id: '36',
                code: '5200',
                name: 'Technology Expenses',
                type: 'expense',
                level: 2,
                description: 'Technology-related operating expenses',
                isActive: true,
                normalBalance: 'debit',
                category: 'technology',
                costCenter: 'IT',
                children: [
                  {
                    _id: '37',
                    code: '5210',
                    name: 'Software Licenses & Subscriptions',
                    type: 'expense',
                    level: 3,
                    description: 'Monthly/annual software subscriptions',
                    isActive: true,
                    normalBalance: 'debit',
                    category: 'software',
                    subcategory: 'subscriptions',
                    budgetAmount: 5000,
                    budgetPeriod: 'monthly'
                  },
                  {
                    _id: '38',
                    code: '5220',
                    name: 'Cloud Services',
                    type: 'expense',
                    level: 3,
                    description: 'AWS, Azure, Google Cloud costs',
                    isActive: true,
                    normalBalance: 'debit',
                    category: 'cloud',
                    subcategory: 'infrastructure',
                    projectSpecific: true
                  }
                ]
              }
            ]
          }
        ];
        setAccounts(defaultAccounts);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const toggleExpanded = (accountId) => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId);
    } else {
      newExpanded.add(accountId);
    }
    setExpandedAccounts(newExpanded);
  };

  const flattenAccounts = (accounts, level = 0) => {
    let result = [];
    accounts.forEach(account => {
      result.push({ ...account, displayLevel: level });
      if (account.children) {
        result = result.concat(flattenAccounts(account.children, level + 1));
      }
    });
    return result;
  };

  const getFilteredAccounts = () => {
    let flatAccounts = flattenAccounts(accounts);
    
    if (searchTerm) {
      flatAccounts = flatAccounts.filter(account =>
        account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.code.includes(searchTerm) ||
        (account.description && account.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    if (filterType !== 'all') {
      flatAccounts = flatAccounts.filter(account => account.type === filterType);
    }
    
    return flatAccounts;
  };

  const getAccountTypeColor = (type) => {
    const colors = {
      asset: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      liability: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      equity: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      revenue: 'bg-accent-100 text-accent-800 dark:bg-accent-900/20 dark:text-accent-400',
      expense: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
    };
    return colors[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
  };

  const getAccountTypeIcon = (type) => {
    const icons = {
      asset: CurrencyDollarIcon,
      liability: ExclamationTriangleIcon,
      equity: ChartBarIcon,
      revenue: CheckCircleIcon,
      expense: InformationCircleIcon
    };
    return icons[type] || DocumentTextIcon;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingAccount) {
        await tenantApiService.updateAccountOrg(tenantSlug, editingAccount._id, formData);
      } else {
        await tenantApiService.createAccountOrg(tenantSlug, formData);
      }
      
      setShowForm(false);
      setEditingAccount(null);
      setFormData({
        code: '',
        name: '',
        type: 'asset',
        parentAccount: '',
        level: 1,
        description: '',
        tags: [],
        isActive: true,
        normalBalance: 'debit',
        category: '',
        subcategory: '',
        taxCategory: '',
        costCenter: '',
        projectSpecific: false,
        allowPosting: true,
        requireApproval: false,
        budgetAmount: 0,
        budgetPeriod: 'monthly'
      });
      await fetchAccounts();
    } catch (error) {
      console.error('Error saving account:', error);
      toast.error(error.message || 'Failed to save account. Please try again.');
    }
  };

  const handleDeleteAccount = (accountId) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete account',
      message: 'Are you sure you want to delete this account? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await tenantApiService.deleteAccountOrg(tenantSlug, accountId);
          await fetchAccounts();
          toast.success('Account deleted');
        } catch (error) {
          console.error('Error deleting account:', error);
          toast.error(error.message || 'Failed to delete account. Please try again.');
        }
      }
    });
  };

  const loadTemplate = (template) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Load chart of accounts template',
      message: `Load the ${template} chart of accounts template? This will create all accounts from the template.`,
      confirmText: 'Load template',
      variant: 'warning',
      onConfirm: async () => {
        try {
          setLoading(true);
          await tenantApiService.loadChartOfAccountsTemplateOrg(tenantSlug, template);
          setSelectedTemplate(template);
          setShowTemplates(false);
          await fetchAccounts();
          toast.success(`${template} template loaded successfully`);
        } catch (error) {
          console.error('Error loading template:', error);
          toast.error(error.message || 'Failed to load template. Please try again.');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const renderAccountTree = (account, level = 0) => {
    const IconComponent = getAccountTypeIcon(account.type);
    const hasChildren = account.children && account.children.length > 0;
    const isExpanded = expandedAccounts.has(account._id);
    
    return (
      <div key={account._id} className="mb-2">
        <div 
          className={`glass-card flex items-center justify-between p-4 rounded-xl hover:shadow-lg transition-all duration-200 ${
            level > 0 ? `ml-${level * 4}` : ''
          }`}
        >
          <div className="flex items-center space-x-3 flex-1">
            <div className="flex items-center space-x-3">
              {hasChildren && (
                <button
                  onClick={() => toggleExpanded(account._id)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  {isExpanded ? (
                    <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronRightIcon className="h-4 w-4 text-gray-500" />
                  )}
                </button>
              )}
              {!hasChildren && <div className="w-6" />}
              
              <IconComponent className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              
              <span className="font-mono text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-lg">
                {account.code}
              </span>
              
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {account.name}
              </span>
              
              <span className={`px-3 py-1 text-xs rounded-full font-medium ${getAccountTypeColor(account.type)}`}>
                {account.type.toUpperCase()}
              </span>
              
              {account.normalBalance && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  ({account.normalBalance})
                </span>
              )}
            </div>
            
            {account.description && (
              <span className="text-xs text-gray-500 dark:text-gray-400 hidden md:block">
                {account.description}
              </span>
            )}
            
            {account.costCenter && (
              <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                {account.costCenter}
              </span>
            )}
            
            {account.projectSpecific && (
              <span className="text-xs text-accent-600 dark:text-accent-400 bg-accent-50 dark:bg-accent-900/20 px-2 py-1 rounded">
                Project
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {account.budgetAmount > 0 && (
              <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                {formatCurrency(account.budgetAmount, currency)}
              </span>
            )}
            
            <button
              onClick={() => {
                setEditingAccount(account);
                setFormData({
                  code: account.code,
                  name: account.name,
                  type: account.type,
                  parentAccount: account.parentAccount || '',
                  level: account.level,
                  description: account.description || '',
                  tags: account.tags || [],
                  isActive: account.isActive,
                  normalBalance: account.normalBalance || 'debit',
                  category: account.category || '',
                  subcategory: account.subcategory || '',
                  taxCategory: account.taxCategory || '',
                  costCenter: account.costCenter || '',
                  projectSpecific: account.projectSpecific || false,
                  allowPosting: account.allowPosting !== false,
                  requireApproval: account.requireApproval || false,
                  budgetAmount: account.budgetAmount || 0,
                  budgetPeriod: account.budgetPeriod || 'monthly'
                });
                setShowForm(true);
              }}
              className="p-2 text-gray-400 dark:text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-all duration-200"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
            
            <button 
              onClick={() => handleDeleteAccount(account._id)}
              className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        {hasChildren && isExpanded && (
          <div className="ml-4">
            {account.children.map(child => renderAccountTree(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <LoadingSpinner message="Structuring your accounts…" className="min-h-[40vh] bg-transparent" />;
  }

  const flatAccounts = flattenAccounts(accounts);

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Header */}
      <div className="glass-card-premium">
        <div className="px-6 py-8 sm:p-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl xl:text-3xl font-bold font-heading text-gray-900 dark:text-white">
                Chart of Accounts
              </h1>
              <p className="mt-2 text-sm xl:text-base text-gray-600 dark:text-gray-300">
                Comprehensive accounting structure designed specifically for software houses
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                  Software Development Focused
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                  Project-Based Accounting
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                  Cost Center Management
                </span>
              </div>
            </div>
            <div className="hidden sm:block">
              <div className="w-16 h-16 bg-green-50 dark:bg-green-900/20 rounded-2xl flex items-center justify-center">
                <DocumentTextIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => setShowForm(true)}
              className="glass-button px-4 py-2 rounded-xl hover-scale flex items-center gap-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white"
            >
              <PlusIcon className="w-5 h-5" />
              <span className="font-medium">Add Account</span>
            </button>
            <button
              onClick={() => setShowTemplates(true)}
              className="glass-button px-4 py-2 rounded-xl hover-scale flex items-center gap-2"
            >
              <DocumentDuplicateIcon className="w-5 h-5" />
              <span className="font-medium">Load Template</span>
            </button>
            <button className="glass-button px-4 py-2 rounded-xl hover-scale flex items-center gap-2">
              <ArrowPathIcon className="w-5 h-5" />
              <span className="font-medium">Export Chart</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 xl:gap-6">
        <div className="glass-card-premium p-5 xl:p-6 hover-lift">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center justify-center">
                <CurrencyDollarIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-xs xl:text-sm font-medium text-gray-500 dark:text-gray-400">Total Accounts</p>
              <p className="text-2xl xl:text-3xl font-bold font-heading text-gray-900 dark:text-white">
                {flatAccounts.length}
              </p>
            </div>
          </div>
        </div>
        <div className="glass-card-premium p-5 xl:p-6 hover-lift">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
                <ChartBarIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-xs xl:text-sm font-medium text-gray-500 dark:text-gray-400">Account Types</p>
              <p className="text-2xl xl:text-3xl font-bold font-heading text-gray-900 dark:text-white">5</p>
            </div>
          </div>
        </div>
        <div className="glass-card-premium p-5 xl:p-6 hover-lift">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-accent-50 dark:bg-accent-900/20 rounded-xl flex items-center justify-center">
                <CogIcon className="w-6 h-6 text-accent-600 dark:text-accent-400" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-xs xl:text-sm font-medium text-gray-500 dark:text-gray-400">Project Accounts</p>
              <p className="text-2xl xl:text-3xl font-bold font-heading text-gray-900 dark:text-white">
                {flatAccounts.filter(acc => acc.projectSpecific).length}
              </p>
            </div>
          </div>
        </div>
        <div className="glass-card-premium p-5 xl:p-6 hover-lift">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-orange-50 dark:bg-orange-900/20 rounded-xl flex items-center justify-center">
                <CheckCircleIcon className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-xs xl:text-sm font-medium text-gray-500 dark:text-gray-400">Active Accounts</p>
              <p className="text-2xl xl:text-3xl font-bold font-heading text-gray-900 dark:text-white">
                {flatAccounts.filter(acc => acc.isActive).length}
              </p>
            </div>
          </div>
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
                placeholder="Search accounts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="glass-input w-full pl-10 pr-4 py-3 text-sm font-medium rounded-xl"
              />
            </div>
            <div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="glass-input w-full px-4 py-3 text-sm font-medium rounded-xl"
              >
                <option value="all">All Account Types</option>
                <option value="asset">Assets</option>
                <option value="liability">Liabilities</option>
                <option value="equity">Equity</option>
                <option value="revenue">Revenue</option>
                <option value="expense">Expenses</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterType('all');
                }}
                className="glass-button px-4 py-2 rounded-xl hover-scale flex items-center gap-2"
              >
                <FunnelIcon className="h-4 w-4" />
                <span className="font-medium">Clear Filters</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Account Structure */}
      <div className="glass-card-premium">
        <div className="px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50">
          <h2 className="text-lg xl:text-xl font-bold font-heading text-gray-900 dark:text-white flex items-center">
            <DocumentTextIcon className="h-5 w-5 mr-2 text-green-600 dark:text-green-400" />
            Account Structure
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Hierarchical view of all accounts with expandable categories
          </p>
        </div>
        <div className="p-6">
          {accounts.length > 0 ? (
            <div className="space-y-2">
              {accounts.map(account => renderAccountTree(account))}
            </div>
          ) : (
            <div className="text-center py-8">
              <DocumentTextIcon className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No accounts found. Create your first account to get started.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Account Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card-premium w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50">
              <h3 className="text-lg xl:text-xl font-bold font-heading text-gray-900 dark:text-white">
                {editingAccount ? 'Edit Account' : 'Add New Account'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Configure account settings for software house operations
              </p>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Account Code *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value})}
                    className="glass-input w-full"
                    placeholder="e.g., 5110"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Account Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="glass-input w-full"
                    placeholder="e.g., Salaries - Development Team"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Account Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="glass-input w-full"
                  >
                    <option value="asset">Asset</option>
                    <option value="liability">Liability</option>
                    <option value="equity">Equity</option>
                    <option value="revenue">Revenue</option>
                    <option value="expense">Expense</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Normal Balance</label>
                  <select
                    value={formData.normalBalance}
                    onChange={(e) => setFormData({...formData, normalBalance: e.target.value})}
                    className="glass-input w-full"
                  >
                    <option value="debit">Debit</option>
                    <option value="credit">Credit</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="glass-input w-full"
                    placeholder="e.g., salaries, software, equipment"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Subcategory</label>
                  <input
                    type="text"
                    value={formData.subcategory}
                    onChange={(e) => setFormData({...formData, subcategory: e.target.value})}
                    className="glass-input w-full"
                    placeholder="e.g., development, management, subscriptions"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Cost Center</label>
                  <select
                    value={formData.costCenter}
                    onChange={(e) => setFormData({...formData, costCenter: e.target.value})}
                    className="glass-input w-full"
                  >
                    <option value="">Select Cost Center</option>
                    <option value="Development">Development</option>
                    <option value="Management">Management</option>
                    <option value="Sales">Sales</option>
                    <option value="HR">HR</option>
                    <option value="IT">IT</option>
                    <option value="Administration">Administration</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Budget Amount</label>
                  <input
                    type="number"
                    value={formData.budgetAmount}
                    onChange={(e) => setFormData({...formData, budgetAmount: parseFloat(e.target.value) || 0})}
                    className="glass-input w-full"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="glass-input w-full"
                  rows="3"
                  placeholder="Detailed description of this account's purpose..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-900 dark:text-gray-100">Active Account</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.projectSpecific}
                      onChange={(e) => setFormData({...formData, projectSpecific: e.target.checked})}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-900 dark:text-gray-100">Project Specific</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.allowPosting}
                      onChange={(e) => setFormData({...formData, allowPosting: e.target.checked})}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-900 dark:text-gray-100">Allow Posting</label>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.requireApproval}
                      onChange={(e) => setFormData({...formData, requireApproval: e.target.checked})}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-900 dark:text-gray-100">Require Approval</label>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Budget Period</label>
                    <select
                      value={formData.budgetPeriod}
                      onChange={(e) => setFormData({...formData, budgetPeriod: e.target.value})}
                      className="glass-input w-full"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="annually">Annually</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingAccount(null);
                    setFormData({
                      code: '',
                      name: '',
                      type: 'asset',
                      parentAccount: '',
                      level: 1,
                      description: '',
                      tags: [],
                      isActive: true,
                      normalBalance: 'debit',
                      category: '',
                      subcategory: '',
                      taxCategory: '',
                      costCenter: '',
                      projectSpecific: false,
                      allowPosting: true,
                      requireApproval: false,
                      budgetAmount: 0,
                      budgetPeriod: 'monthly'
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
                  {editingAccount ? 'Update' : 'Create'} Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Template Selection Modal */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card-premium w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50">
              <h3 className="text-lg xl:text-xl font-bold font-heading text-gray-900 dark:text-white">
                Chart of Accounts Templates
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Choose from pre-configured templates designed for software houses
              </p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-card p-6 rounded-xl hover:shadow-lg transition-all duration-200 cursor-pointer"
                     onClick={() => loadTemplate('startup')}>
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center justify-center mr-4">
                      <CurrencyDollarIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-gray-900 dark:text-white">Startup Software House</h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Basic structure for new software companies</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Accounts:</span>
                      <span className="text-xs font-medium text-gray-900 dark:text-white">25</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Project Tracking:</span>
                      <span className="text-xs font-medium text-gray-900 dark:text-white">Basic</span>
                    </div>
                  </div>
                </div>

                <div className="glass-card p-6 rounded-xl hover:shadow-lg transition-all duration-200 cursor-pointer"
                     onClick={() => loadTemplate('enterprise')}>
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center mr-4">
                      <ChartBarIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-gray-900 dark:text-white">Enterprise Software House</h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Comprehensive structure for established companies</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Accounts:</span>
                      <span className="text-xs font-medium text-gray-900 dark:text-white">50+</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Project Tracking:</span>
                      <span className="text-xs font-medium text-gray-900 dark:text-white">Advanced</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowTemplates(false)}
                  className="glass-button px-4 py-2 rounded-xl hover-scale"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, onConfirm: null, title: '', message: '', confirmText: 'Confirm', variant: 'danger' })}
        onConfirm={confirmDialog.onConfirm || (() => {})}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        cancelText="Cancel"
        variant={confirmDialog.variant}
      />
    </div>
  );
};

export default ChartOfAccounts;
