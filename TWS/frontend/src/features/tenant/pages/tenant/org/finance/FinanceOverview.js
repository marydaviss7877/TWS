import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  BanknotesIcon,
  CreditCardIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  EyeIcon,
  DocumentTextIcon,
  ClockIcon,
  ChartPieIcon,
  DocumentChartBarIcon,
  BuildingOfficeIcon,
  CloudIcon,
  ShieldCheckIcon,
  CogIcon,
  CalendarIcon,
  CheckCircleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import { tenantApiService } from '../../../../../../shared/services/tenant/tenant-api.service';
import { useTenantAuth } from '../../../../../../app/providers/TenantAuthContext';

const FinanceOverview = () => {
  const { tenantSlug } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useTenantAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [financeData, setFinanceData] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [overdueInvoices, setOverdueInvoices] = useState([]);
  const [upcomingBills, setUpcomingBills] = useState([]);
  const [projectProfitability, setProjectProfitability] = useState([]);
  const [cashFlowData, setCashFlowData] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  // Finance Ecosystem Modules
  const financeModules = [
    {
      id: 'chart-of-accounts',
      name: 'Chart of Accounts',
      icon: DocumentTextIcon,
      description: 'Manage your accounting structure',
      color: 'green',
      path: `/${tenantSlug}/org/finance/chart-of-accounts`
    },
    {
      id: 'accounts-receivable',
      name: 'Accounts Receivable',
      icon: ArrowTrendingUpIcon,
      description: 'Invoices, payments, and collections',
      color: 'emerald',
      path: `/${tenantSlug}/org/finance/accounts-receivable`
    },
    {
      id: 'accounts-payable',
      name: 'Accounts Payable',
      icon: ArrowTrendingDownIcon,
      description: 'Bills, vendors, and payments',
      color: 'red',
      path: `/${tenantSlug}/org/finance/accounts-payable`
    },
    {
      id: 'project-costing',
      name: 'Project Costing',
      icon: ChartBarIcon,
      description: 'Track project profitability',
      color: 'blue',
      path: `/${tenantSlug}/org/finance/project-costing`
    },
    {
      id: 'time-expenses',
      name: 'Time & Expenses',
      icon: ClockIcon,
      description: 'Track employee time and expenses',
      color: 'purple',
      path: `/${tenantSlug}/org/finance/time-expenses`
    },
    {
      id: 'billing-engine',
      name: 'Billing Engine',
      icon: DocumentChartBarIcon,
      description: 'Automated billing and invoicing',
      color: 'indigo',
      path: `/${tenantSlug}/org/finance/billing-engine`
    },
    {
      id: 'cash-flow',
      name: 'Cash Flow',
      icon: BanknotesIcon,
      description: 'Forecasting and cash management',
      color: 'yellow',
      path: `/${tenantSlug}/org/finance/cash-flow`
    },
    {
      id: 'banking',
      name: 'Banking',
      icon: BuildingOfficeIcon,
      description: 'Bank reconciliation and accounts',
      color: 'gray',
      path: `/${tenantSlug}/org/finance/banking`
    },
    {
      id: 'reporting',
      name: 'Reporting',
      icon: ChartPieIcon,
      description: 'Financial reports and analytics',
      color: 'pink',
      path: `/${tenantSlug}/org/finance/reporting`
    },
    {
      id: 'integrations',
      name: 'Integrations',
      icon: CloudIcon,
      description: 'Connect external services',
      color: 'cyan',
      path: `/${tenantSlug}/org/finance/integrations`
    },
    {
      id: 'security',
      name: 'Security',
      icon: ShieldCheckIcon,
      description: 'Security and compliance',
      color: 'orange',
      path: `/${tenantSlug}/org/finance/security`
    },
    {
      id: 'settings',
      name: 'Settings',
      icon: CogIcon,
      description: 'Finance system configuration',
      color: 'slate',
      path: `/${tenantSlug}/org/finance/settings`
    }
  ];

  useEffect(() => {
    // SECURITY FIX: Removed localStorage token check - use isAuthenticated from context
    if (isAuthenticated && !authLoading && tenantSlug) {
      fetchFinanceOverview();
    } else if (!authLoading && !isAuthenticated) {
      // If not authenticated and auth check is complete, set loading to false
      setLoading(false);
    }
  }, [tenantSlug, selectedPeriod, isAuthenticated, authLoading]);

  const fetchFinanceOverview = async () => {
    // SECURITY FIX: Removed localStorage token check - use isAuthenticated from context
    if (!isAuthenticated || !tenantSlug) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await tenantApiService.getFinanceOverview(tenantSlug);
      if (data) {
        setFinanceData(data);
      } else {
        // Data is null (likely no token) - set empty state
        setFinanceData({
          totalRevenue: 0,
          totalExpenses: 0,
          netIncome: 0,
          accountsPayable: 0,
          accountsReceivable: 0,
          cashBalance: 0
        });
      }
      
      // Fetch additional data
      try {
        const transactions = await tenantApiService.getRecentTransactions(tenantSlug, { limit: 10 });
        setRecentTransactions(transactions || []);
      } catch (err) {
        console.error('Error fetching transactions:', err);
        setRecentTransactions([]);
      }

      try {
        const overdue = await tenantApiService.getOverdueInvoices(tenantSlug);
        setOverdueInvoices(overdue || []);
      } catch (err) {
        console.error('Error fetching overdue invoices:', err);
        setOverdueInvoices([]);
      }

      try {
        const bills = await tenantApiService.getUpcomingBills(tenantSlug);
        setUpcomingBills(bills || []);
      } catch (err) {
        console.error('Error fetching upcoming bills:', err);
        setUpcomingBills([]);
      }

      try {
        const projects = await tenantApiService.getProjectProfitability(tenantSlug);
        setProjectProfitability(projects || []);
      } catch (err) {
        console.error('Error fetching project profitability:', err);
        setProjectProfitability([]);
      }

      try {
        const cashFlow = await tenantApiService.getCashFlowData(tenantSlug, { period: selectedPeriod });
        setCashFlowData(cashFlow || []);
      } catch (err) {
        console.error('Error fetching cash flow data:', err);
        setCashFlowData([]);
      }
    } catch (err) {
      console.error('Error fetching finance overview:', err);
      setError('Failed to load finance overview data');
    } finally {
      setLoading(false);
    }
  };

  // Show loading if auth is loading or data is loading
  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            {authLoading ? 'Authenticating...' : 'Loading finance overview...'}
          </p>
        </div>
      </div>
    );
  }

  // If not authenticated, show message (TenantAuthContext should redirect, but just in case)
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Please log in to view finance data.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card-premium p-6 border border-red-200 dark:border-red-800">
        <div className="flex">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-400">Error</h3>
            <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
            <button
              onClick={fetchFinanceOverview}
              className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Extract data with defaults
  const {
    totalRevenue = 0,
    totalExpenses = 0,
    netIncome = 0,
    accountsPayable = 0,
    accountsReceivable = 0,
    cashBalance = 0,
    grossMargin = 0,
    monthlyRecurringRevenue = 0,
    utilizationRate = 0,
    financialMetrics = {}
  } = financeData || {};

  const profitMargin = totalRevenue > 0 ? ((netIncome / totalRevenue) * 100) : 0;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString();
  };

  const getColorClass = (color) => {
    const colors = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      emerald: 'bg-emerald-500',
      red: 'bg-red-500',
      purple: 'bg-purple-500',
      indigo: 'bg-indigo-500',
      yellow: 'bg-yellow-500',
      gray: 'bg-gray-500',
      pink: 'bg-pink-500',
      cyan: 'bg-cyan-500',
      orange: 'bg-orange-500',
      slate: 'bg-slate-500'
    };
    return colors[color] || 'bg-gray-500';
  };

  const getStatusColor = (status) => {
    const colors = {
      completed: 'text-green-600',
      pending: 'text-yellow-600',
      overdue: 'text-red-600',
      draft: 'text-gray-600'
    };
    return colors[status] || 'text-gray-600';
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Hero Section */}
      <div className="glass-card-premium">
        <div className="px-6 py-8 sm:p-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl xl:text-3xl font-bold font-heading text-gray-900 dark:text-white">
                Finance Ecosystem 💰
              </h1>
              <p className="mt-2 text-sm xl:text-base text-gray-600 dark:text-gray-300">
                Profit, predict, and pay with confidence — designed for software houses
              </p>
            </div>
            <div className="hidden sm:block">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 via-emerald-600 to-teal-700 rounded-2xl flex items-center justify-center shadow-lg">
                <CurrencyDollarIcon className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Period Selector */}
      <div className="glass-card-premium">
        <div className="px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50">
          <h2 className="text-lg xl:text-xl font-bold font-heading text-gray-900 dark:text-white flex items-center">
            <CalendarIcon className="h-5 w-5 mr-2 text-indigo-600 dark:text-indigo-400" />
            Financial Overview
          </h2>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Select time period for financial metrics
            </p>
            <div className="flex space-x-2">
              {['week', 'month', 'quarter', 'year'].map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    selectedPeriod === period
                      ? 'bg-indigo-600 text-white shadow-lg'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 xl:gap-6">
        <div className="glass-card-premium p-5 xl:p-6 hover-lift">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                    <CurrencyDollarIcon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-xs xl:text-sm font-medium text-gray-500 dark:text-gray-400">Total Revenue</p>
                  <p className="text-2xl xl:text-3xl font-bold font-heading text-gray-900 dark:text-white">
                    {formatCurrency(totalRevenue)}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400">+12.5% from last month</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card-premium p-5 xl:p-6 hover-lift">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                    <ChartBarIcon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-xs xl:text-sm font-medium text-gray-500 dark:text-gray-400">Net Profit</p>
                  <p className="text-2xl xl:text-3xl font-bold font-heading text-gray-900 dark:text-white">
                    {formatCurrency(netIncome)}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">+8.2% from last month</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card-premium p-5 xl:p-6 hover-lift">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg">
                    <ArrowTrendingUpIcon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-xs xl:text-sm font-medium text-gray-500 dark:text-gray-400">Gross Margin</p>
                  <p className="text-2xl xl:text-3xl font-bold font-heading text-gray-900 dark:text-white">
                    {grossMargin || profitMargin.toFixed(1)}%
                  </p>
                  <p className="text-xs text-purple-600 dark:text-purple-400">+2.1% from last month</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card-premium p-5 xl:p-6 hover-lift">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                    <BanknotesIcon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-xs xl:text-sm font-medium text-gray-500 dark:text-gray-400">Cash on Hand</p>
                  <p className="text-2xl xl:text-3xl font-bold font-heading text-gray-900 dark:text-white">
                    {formatCurrency(cashBalance)}
                  </p>
                  <p className="text-xs text-yellow-600 dark:text-yellow-400">+5.3% from last month</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Finance Ecosystem Modules Navigation */}
      <div className="glass-card-premium">
        <div className="px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50">
          <h2 className="text-lg xl:text-xl font-bold font-heading text-gray-900 dark:text-white flex items-center">
            <CogIcon className="h-5 w-5 mr-2 text-indigo-600 dark:text-indigo-400" />
            Finance Ecosystem Modules
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Comprehensive financial management tools designed for software houses
          </p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {financeModules.map((module, index) => {
              const Icon = module.icon;
              return (
                <button
                  key={module.id}
                  onClick={() => navigate(module.path)}
                  className="glass-card p-4 rounded-xl hover:shadow-lg transition-all duration-200 text-left group"
                >
                  <div className="flex items-center mb-3">
                    <div className={`w-12 h-12 ${getColorClass(module.color)} rounded-xl flex items-center justify-center mr-3 group-hover:scale-110 transition-transform shadow-lg`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{module.name}</h3>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{module.description}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="glass-card-premium">
        <div className="px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50">
          <h2 className="text-lg xl:text-xl font-bold font-heading text-gray-900 dark:text-white flex items-center">
            <PlusIcon className="h-5 w-5 mr-2 text-green-600 dark:text-green-400" />
            Quick Actions
          </h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => navigate(`/${tenantSlug}/org/finance/accounts-receivable`)}
              className="glass-card p-4 rounded-xl hover:shadow-lg transition-all duration-200 group"
            >
              <div className="flex items-center">
                <PlusIcon className="h-6 w-6 text-green-600 dark:text-green-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Create Invoice</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Send new invoice to client</p>
                </div>
              </div>
            </button>
            <button
              onClick={() => navigate(`/${tenantSlug}/org/finance/accounts-payable`)}
              className="glass-card p-4 rounded-xl hover:shadow-lg transition-all duration-200 group"
            >
              <div className="flex items-center">
                <PlusIcon className="h-6 w-6 text-red-600 dark:text-red-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Record Bill</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Add new vendor bill</p>
                </div>
              </div>
            </button>
            <button
              onClick={() => navigate(`/${tenantSlug}/org/finance/project-costing`)}
              className="glass-card p-4 rounded-xl hover:shadow-lg transition-all duration-200 group"
            >
              <div className="flex items-center">
                <PlusIcon className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">New Project</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Set up project budget</p>
                </div>
              </div>
            </button>
            <button
              onClick={() => navigate(`/${tenantSlug}/org/finance/time-expenses`)}
              className="glass-card p-4 rounded-xl hover:shadow-lg transition-all duration-200 group"
            >
              <div className="flex items-center">
                <PlusIcon className="h-6 w-6 text-purple-600 dark:text-purple-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Log Time</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Record work hours</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Alerts & Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overdue Invoices */}
        <div className="glass-card-premium">
          <div className="px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center justify-between">
              <h2 className="text-lg xl:text-xl font-bold font-heading text-gray-900 dark:text-white flex items-center">
                <ExclamationTriangleIcon className="h-5 w-5 mr-2 text-red-600 dark:text-red-400" />
                Overdue Invoices
              </h2>
              <span className="px-3 py-1 text-xs font-semibold text-red-800 bg-red-100 dark:bg-red-900/20 dark:text-red-400 rounded-full">
                {overdueInvoices.length} overdue
              </span>
            </div>
          </div>
          <div className="p-6">
            {overdueInvoices.length > 0 ? (
              <div className="space-y-3">
                {overdueInvoices.map((invoice) => (
                  <div key={invoice._id} className="glass-card border-l-4 border-red-400 bg-red-50/50 dark:bg-red-900/20 p-4 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{invoice.invoiceNumber}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{invoice.clientName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-red-600 dark:text-red-400">{formatCurrency(invoice.amount)}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{invoice.daysOverdue} days overdue</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <CheckCircleIcon className="h-8 w-8 text-green-500 dark:text-green-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No overdue invoices</p>
              </div>
            )}
          </div>
        </div>
                      
        {/* Upcoming Bills */}
        <div className="glass-card-premium">
          <div className="px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center justify-between">
              <h2 className="text-lg xl:text-xl font-bold font-heading text-gray-900 dark:text-white flex items-center">
                <ClockIcon className="h-5 w-5 mr-2 text-yellow-600 dark:text-yellow-400" />
                Upcoming Bills
              </h2>
              <span className="px-3 py-1 text-xs font-semibold text-yellow-800 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400 rounded-full">
                {upcomingBills.length} due soon
              </span>
            </div>
          </div>
          <div className="p-6">
            {upcomingBills.length > 0 ? (
              <div className="space-y-3">
                {upcomingBills.map((bill) => (
                  <div key={bill._id} className="glass-card border-l-4 border-yellow-400 bg-yellow-50/50 dark:bg-yellow-900/20 p-4 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{bill.billNumber}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{bill.vendorName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">{formatCurrency(bill.amount)}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Due in {bill.daysUntilDue} days</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <CheckCircleIcon className="h-8 w-8 text-green-500 dark:text-green-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No upcoming bills</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Project Profitability */}
      {projectProfitability.length > 0 && (
        <div className="glass-card-premium">
          <div className="px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50">
            <h2 className="text-lg xl:text-xl font-bold font-heading text-gray-900 dark:text-white flex items-center">
              <ChartBarIcon className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
              Project Profitability
            </h2>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
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
                  </tr>
                </thead>
                <tbody className="glass-card divide-y divide-gray-200 dark:divide-gray-700">
                  {projectProfitability.map((project) => (
                    <tr key={project._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{project.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">{project.clientName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(project.budget)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(project.actualCost)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(project.revenue)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium ${project.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {formatCurrency(project.profit)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium ${project.margin >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {project.margin}%
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
                
      {/* Recent Activity */}
      <div className="glass-card-premium">
        <div className="px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50">
          <h2 className="text-lg xl:text-xl font-bold font-heading text-gray-900 dark:text-white flex items-center">
            <ClockIcon className="h-5 w-5 mr-2 text-purple-600 dark:text-purple-400" />
            Recent Activity
          </h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {recentTransactions.length > 0 ? (
              recentTransactions.map((transaction) => (
                <div key={transaction._id} className="glass-card p-4 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${
                        transaction.type === 'income' ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-red-500 to-rose-600'
                      }`}>
                        {transaction.type === 'income' ? (
                          <ArrowUpIcon className="h-5 w-5 text-white" />
                        ) : (
                          <ArrowDownIcon className="h-5 w-5 text-white" />
                        )}
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{transaction.description}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(transaction.date)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${transaction.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </p>
                      <p className={`text-xs ${getStatusColor(transaction.status)}`}>
                        {transaction.status}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <ClockIcon className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No recent transactions</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinanceOverview;
