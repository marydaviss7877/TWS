import React, { useState, useEffect } from 'react';
import { 
  CurrencyDollarIcon, 
  ChartBarIcon, 
  BanknotesIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  CreditCardIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';
import { useTenantAuth } from '../../../../app/providers/TenantAuthContext';
import FeatureUnavailable from '../../../../shared/components/feedback/FeatureUnavailable';
import LoadingSpinner from '../../../../shared/components/feedback/LoadingSpinner';
import ErrorState from '../../../../shared/components/feedback/ErrorState';
import EmptyState from '../../../../shared/components/feedback/EmptyState';

const TenantFinanceDashboard = () => {
  const [financeData, setFinanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user, tenant, isAuthenticated } = useTenantAuth();

  useEffect(() => {
    if (isAuthenticated) {
      fetchFinanceData();
    }
  }, [isAuthenticated]);

  const fetchFinanceData = async () => {
    try {
      setLoading(true);
      setError(null);

      // SECURITY FIX: Removed localStorage token check - use cookies instead
      const response = await fetch('/api/finance/kpis/summary', {
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include' // SECURITY FIX: Use cookies instead of localStorage token
      });

      if (!response.ok) {
        throw new Error('Failed to fetch finance data');
      }

      const result = await response.json();
      if (result.success) {
        setFinanceData(result.data);
      } else {
        throw new Error(result.message || 'Failed to load finance data');
      }
    } catch (err) {
      console.error('Error fetching finance data:', err);
      setError('Failed to load finance data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Not Authenticated</h2>
          <p className="text-gray-600">Please log in to access finance dashboard.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <LoadingSpinner message="Loading finance dashboard..." />;
  }

  if (error) {
    return <ErrorState title="Finance dashboard error" message={error} onRetry={fetchFinanceData} />;
  }

  if (!financeData) {
    return <EmptyState title="No finance dashboard data" message="No finance metrics are available for this tenant yet." className="max-w-3xl mx-auto mt-10" />;
  }

  const stats = [
    {
      name: 'Total Revenue',
      value: `$${(financeData?.stats?.totalRevenue || 0).toLocaleString()}`,
      icon: CurrencyDollarIcon,
      change: '+12%',
      changeType: 'positive',
      color: 'green'
    },
    {
      name: 'Monthly Revenue',
      value: `$${(financeData?.stats?.monthlyRevenue || 0).toLocaleString()}`,
      icon: BanknotesIcon,
      change: '+8%',
      changeType: 'positive',
      color: 'emerald'
    },
    {
      name: 'Total Expenses',
      value: `$${(financeData?.stats?.totalExpenses || 0).toLocaleString()}`,
      icon: CreditCardIcon,
      change: '+5%',
      changeType: 'negative',
      color: 'red'
    },
    {
      name: 'Profit Margin',
      value: `${financeData?.stats?.profitMargin || 0}%`,
      icon: ChartBarIcon,
      change: '+2.1%',
      changeType: 'positive',
      color: 'blue'
    },
    {
      name: 'Accounts Receivable',
      value: `$${(financeData?.stats?.accountsReceivable || 0).toLocaleString()}`,
      icon: DocumentTextIcon,
      change: '-3%',
      changeType: 'negative',
      color: 'yellow'
    },
    {
      name: 'Cash Flow',
      value: `$${(financeData?.stats?.cashFlow || 0).toLocaleString()}`,
      icon: BuildingOfficeIcon,
      change: '+15%',
      changeType: 'positive',
      color: 'indigo'
    }
  ];

  return (
    <div className="space-y-6">
      <FeatureUnavailable
        title="Tenant finance dashboard unavailable"
        description="This dashboard is not available in this release yet. Use Organization > Finance modules for live data."
      />
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Finance Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              Financial overview and management for {tenant?.name}.
            </p>
          </div>
          <div className="flex space-x-3">
            <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center">
              <DocumentTextIcon className="h-5 w-5 mr-2" />
              Create Invoice
            </button>
            <button className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center">
              <ChartBarIcon className="h-5 w-5 mr-2" />
              Reports
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <div key={stat.name} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className={`w-12 h-12 bg-${stat.color}-100 dark:bg-${stat.color}-900 rounded-lg flex items-center justify-center`}>
                      <stat.icon className={`h-6 w-6 text-${stat.color}-600 dark:text-${stat.color}-400`} />
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.name}</p>
                    <div className="flex items-baseline">
                      <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stat.value}</p>
                      {stat.change && (
                        <p className={`ml-2 text-sm font-medium ${
                          stat.changeType === 'positive' ? 'text-green-600' :
                          stat.changeType === 'negative' ? 'text-red-600' :
                          'text-gray-500'
                        }`}>
                          {stat.change}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Revenue Trend</h3>
          <div className="h-64 flex items-center justify-center">
            <div className="text-center">
              <ChartBarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Revenue chart will be displayed here</p>
            </div>
          </div>
        </div>

        {/* Expenses Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Expenses Trend</h3>
          <div className="h-64 flex items-center justify-center">
            <div className="text-center">
              <ChartBarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Expenses chart will be displayed here</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Recent Transactions</h3>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {financeData?.recentTransactions?.map((transaction) => (
            <div key={transaction.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{transaction.description}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(transaction.date).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center">
                  <span className={`text-sm font-medium ${
                    transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.amount > 0 ? '+' : ''}${transaction.amount.toLocaleString()}
                  </span>
                  <div className="ml-2">
                    {transaction.amount > 0 ? (
                      <ArrowUpIcon className="h-4 w-4 text-green-500" />
                    ) : (
                      <ArrowDownIcon className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TenantFinanceDashboard;
