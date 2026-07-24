import React, { useState, useEffect } from 'react';
import { 
  BanknotesIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import { tenantApiService } from '../../../../../../shared/services/tenant/tenant-api.service';
import { useTenantSlug } from '../../../../../../shared/hooks/useTenantSlug';

const CashFlow = () => {
  const tenantSlug = useTenantSlug();
  const [cashFlowData, setCashFlowData] = useState([]);
  const [forecasts, setForecasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForecastForm, setShowForecastForm] = useState(false);
  const [editingForecast, setEditingForecast] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [formData, setFormData] = useState({
    date: '',
    type: 'inflow',
    category: '',
    amount: 0,
    description: '',
    confidence: 'medium',
    isRecurring: false,
    recurringFrequency: 'monthly'
  });

  useEffect(() => {
    fetchData();
  }, [tenantSlug, selectedPeriod]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch cash flow data
      try {
        const cashFlowResponse = await tenantApiService.getCashFlow(tenantSlug, selectedPeriod);
        setCashFlowData(cashFlowResponse.transactions || []);
      } catch (err) {
        console.error('Error fetching cash flow:', err);
        setCashFlowData([]);
      }

      // Fetch forecasts using new API
      try {
        const forecastsResponse = await tenantApiService.getCashFlowForecast(tenantSlug, 12);
        setForecasts(forecastsResponse?.forecast || forecastsResponse?.data?.forecast || []);
      } catch (err) {
        console.error('Error fetching forecasts:', err);
        setForecasts([]);
      }
      
      // Fetch cash flow statement
      try {
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        const endDate = new Date();
        const statementResponse = await tenantApiService.getCashFlowStatement(
          tenantSlug, 
          startDate.toISOString().split('T')[0], 
          endDate.toISOString().split('T')[0]
        );
        // Merge statement data with cash flow data if needed
        if (statementResponse && statementResponse.data) {
          // Update cash flow data with statement data
        }
      } catch (err) {
        console.error('Error fetching cash flow statement:', err);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeColor = (type) => {
    return type === 'inflow' 
      ? 'text-green-600 dark:text-green-400' 
      : 'text-red-600 dark:text-red-400';
  };

  const getTypeIcon = (type) => {
    return type === 'inflow' ? ArrowTrendingUpIcon : ArrowTrendingDownIcon;
  };

  const getConfidenceColor = (confidence) => {
    const colors = {
      high: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      low: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
    };
    return colors[confidence] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
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

  const calculateNetCashFlow = () => {
    const inflows = cashFlowData.filter(item => item.type === 'inflow').reduce((sum, item) => sum + (item.amount || 0), 0);
    const outflows = cashFlowData.filter(item => item.type === 'outflow').reduce((sum, item) => sum + (item.amount || 0), 0);
    return inflows - outflows;
  };

  const calculateProjectedBalance = () => {
    const netCashFlow = calculateNetCashFlow();
    const forecastInflows = forecasts.filter(item => item.type === 'inflow').reduce((sum, item) => sum + (item.amount || 0), 0);
    const forecastOutflows = forecasts.filter(item => item.type === 'outflow').reduce((sum, item) => sum + (item.amount || 0), 0);
    return netCashFlow + forecastInflows - forecastOutflows;
  };

  const getFilteredCashFlow = () => {
    let filtered = cashFlowData;
    
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filterType !== 'all') {
      filtered = filtered.filter(item => item.type === filterType);
    }
    
    return filtered;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingForecast) {
        await tenantApiService.updateCashFlowForecast(
          tenantSlug,
          editingForecast.forecastId || editingForecast._id,
          formData
        );
      } else {
        await tenantApiService.createCashFlowForecast(tenantSlug, formData);
      }
      
      setShowForecastForm(false);
      setEditingForecast(null);
      setFormData({
        date: '',
        type: 'inflow',
        category: '',
        amount: 0,
        description: '',
        accountId: '',
        confidence: 'medium',
        isRecurring: false,
        recurringFrequency: 'monthly'
      });
      fetchData();
    } catch (error) {
      console.error('Error saving forecast:', error);
    }
  };

  const handleDeleteForecast = async (forecast) => {
    const forecastId = forecast?.forecastId || forecast?._id;
    if (!forecastId) return;
    if (!window.confirm('Delete this forecast entry?')) return;
    try {
      await tenantApiService.deleteCashFlowForecast(tenantSlug, forecastId);
      fetchData();
    } catch (error) {
      console.error('Error deleting forecast:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading cash flow data...</p>
        </div>
      </div>
    );
  }

  const filteredCashFlow = getFilteredCashFlow();
  const totalInflows = cashFlowData.filter(item => item.type === 'inflow').reduce((sum, item) => sum + (item.amount || 0), 0);
  const totalOutflows = cashFlowData.filter(item => item.type === 'outflow').reduce((sum, item) => sum + (item.amount || 0), 0);
  const netCashFlow = calculateNetCashFlow();
  const projectedBalance = calculateProjectedBalance();

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Header */}
      <div className="glass-card-premium">
        <div className="px-6 py-8 sm:p-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl xl:text-3xl font-bold font-heading text-gray-900 dark:text-white">
                Cash Flow & Forecasting 💸
              </h1>
              <p className="mt-2 text-sm xl:text-base text-gray-600 dark:text-gray-300">
                Track cash inflows, outflows, and forecast future cash positions
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                  Real-time Tracking
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                  Forecasting
                </span>
              </div>
            </div>
            <div className="hidden sm:block">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-500 via-cyan-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg">
                <BanknotesIcon className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3 items-center">
            <button
              onClick={() => setShowForecastForm(true)}
              className="glass-button px-4 py-2 rounded-xl hover-scale flex items-center gap-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white"
            >
              <PlusIcon className="w-5 h-5" />
              <span className="font-medium">Add Forecast</span>
            </button>
            <div className="flex space-x-2">
              {['week', 'month', 'quarter', 'year'].map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                    selectedPeriod === period
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                      : 'glass-button'
                  }`}
                >
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 xl:gap-6">
        <div className="glass-card-premium p-5 xl:p-6 hover-lift">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 xl:w-14 xl:h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-glow-lg">
              <ArrowTrendingUpIcon className="w-6 h-6 xl:w-7 xl:h-7 text-white" />
            </div>
            <div>
              <p className="text-xs xl:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Total Inflows
              </p>
              <p className="text-2xl xl:text-3xl font-bold font-heading text-gray-900 dark:text-white">
                {formatCurrency(totalInflows)}
              </p>
            </div>
          </div>
        </div>
        <div className="glass-card-premium p-5 xl:p-6 hover-lift">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 xl:w-14 xl:h-14 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-glow-lg">
              <ArrowTrendingDownIcon className="w-6 h-6 xl:w-7 xl:h-7 text-white" />
            </div>
            <div>
              <p className="text-xs xl:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Total Outflows
              </p>
              <p className="text-2xl xl:text-3xl font-bold font-heading text-gray-900 dark:text-white">
                {formatCurrency(totalOutflows)}
              </p>
            </div>
          </div>
        </div>
        <div className="glass-card-premium p-5 xl:p-6 hover-lift">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 xl:w-14 xl:h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-glow-lg">
              <BanknotesIcon className="w-6 h-6 xl:w-7 xl:h-7 text-white" />
            </div>
            <div>
              <p className="text-xs xl:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Net Cash Flow
              </p>
              <p className={`text-2xl xl:text-3xl font-bold font-heading ${netCashFlow >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatCurrency(netCashFlow)}
              </p>
            </div>
          </div>
        </div>
        <div className="glass-card-premium p-5 xl:p-6 hover-lift">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 xl:w-14 xl:h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-glow-lg">
              <ChartBarIcon className="w-6 h-6 xl:w-7 xl:h-7 text-white" />
            </div>
            <div>
              <p className="text-xs xl:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Projected Balance
              </p>
              <p className="text-2xl xl:text-3xl font-bold font-heading text-gray-900 dark:text-white">
                {formatCurrency(projectedBalance)}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search transactions..."
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
                <option value="all">All Types</option>
                <option value="inflow">Inflows</option>
                <option value="outflow">Outflows</option>
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
                <span className="font-medium">Clear</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Cash Flow History */}
      <div className="glass-card-premium">
        <div className="px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50">
          <h2 className="text-lg xl:text-xl font-bold font-heading text-gray-900 dark:text-white flex items-center">
            <DocumentTextIcon className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
            Recent Cash Flow ({filteredCashFlow.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          {filteredCashFlow.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="glass-card">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Account
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="glass-card divide-y divide-gray-200 dark:divide-gray-700">
                {filteredCashFlow.map((item) => {
                  const TypeIcon = getTypeIcon(item.type);
                  return (
                    <tr key={item._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">{formatDate(item.date)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <TypeIcon className={`h-4 w-4 mr-2 ${getTypeColor(item.type)}`} />
                          <span className={`text-sm font-medium ${getTypeColor(item.type)}`}>
                            {item.type}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">{item.category}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium ${getTypeColor(item.type)}`}>
                          {item.type === 'inflow' ? '+' : '-'}{formatCurrency(item.amount || 0)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">{item.accountName || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-white max-w-xs truncate">{item.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button className="p-2 text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200">
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          <button className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-all duration-200">
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
              <BanknotesIcon className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-2">No cash flow transactions found</p>
              <p className="text-sm text-gray-500 dark:text-gray-500">Transactions will appear here as they are recorded</p>
            </div>
          )}
        </div>
      </div>

      {/* Cash Flow Forecasts */}
      <div className="glass-card-premium">
        <div className="px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50">
          <h2 className="text-lg xl:text-xl font-bold font-heading text-gray-900 dark:text-white flex items-center">
            <ChartBarIcon className="h-5 w-5 mr-2 text-purple-600 dark:text-purple-400" />
            Cash Flow Forecasts ({forecasts.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          {forecasts.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="glass-card">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Confidence
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="glass-card divide-y divide-gray-200 dark:divide-gray-700">
                {forecasts.map((forecast) => {
                  const TypeIcon = getTypeIcon(forecast.type);
                  return (
                    <tr key={forecast._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">{formatDate(forecast.date)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <TypeIcon className={`h-4 w-4 mr-2 ${getTypeColor(forecast.type)}`} />
                          <span className={`text-sm font-medium ${getTypeColor(forecast.type)}`}>
                            {forecast.type}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">{forecast.category}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium ${getTypeColor(forecast.type)}`}>
                          {forecast.type === 'inflow' ? '+' : '-'}{formatCurrency(forecast.amount || 0)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getConfidenceColor(forecast.confidence)}`}>
                          {forecast.confidence || 'medium'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-white max-w-xs truncate">{forecast.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => {
                              setEditingForecast(forecast);
                              setFormData({
                                date: forecast.date || '',
                                type: forecast.type || 'inflow',
                                category: forecast.category || '',
                                amount: forecast.amount || 0,
                                description: forecast.description || '',
                                confidence: forecast.confidence || 'medium',
                                isRecurring: forecast.isRecurring || false,
                                recurringFrequency: forecast.recurringFrequency || 'monthly'
                              });
                              setShowForecastForm(true);
                            }}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-all duration-200"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteForecast(forecast)}
                            className="p-2 text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
                          >
                            <TrashIcon className="h-4 w-4" />
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
              <p className="text-gray-600 dark:text-gray-400 mb-2">No forecasts found</p>
              <p className="text-sm text-gray-500 dark:text-gray-500">Create forecasts to predict future cash positions</p>
              <button
                onClick={() => setShowForecastForm(true)}
                className="mt-4 glass-button px-4 py-2 rounded-xl hover-scale flex items-center gap-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white mx-auto"
              >
                <PlusIcon className="w-5 h-5" />
                <span className="font-medium">Add Forecast</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Forecast Form Modal */}
      {showForecastForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card-premium w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50">
              <h3 className="text-lg xl:text-xl font-bold font-heading text-gray-900 dark:text-white">
                {editingForecast ? 'Edit Forecast' : 'Add Cash Flow Forecast'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Predict future cash inflows and outflows
              </p>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Date *</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="glass-input w-full"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="glass-input w-full"
                    required
                  >
                    <option value="inflow">Inflow</option>
                    <option value="outflow">Outflow</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="glass-input w-full"
                    required
                  >
                    <option value="">Select Category</option>
                    <option value="Client Payment">Client Payment</option>
                    <option value="Payroll">Payroll</option>
                    <option value="Office Rent">Office Rent</option>
                    <option value="Software Licenses">Software Licenses</option>
                    <option value="Cloud Services">Cloud Services</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Equipment">Equipment</option>
                    <option value="Taxes">Taxes</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Amount *</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
                    className="glass-input w-full"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Confidence</label>
                  <select
                    value={formData.confidence}
                    onChange={(e) => setFormData({...formData, confidence: e.target.value})}
                    className="glass-input w-full"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="glass-input w-full"
                  rows="3"
                  required
                  placeholder="Describe the forecasted transaction..."
                />
              </div>
              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isRecurring}
                    onChange={(e) => setFormData({...formData, isRecurring: e.target.checked})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900 dark:text-gray-100">Recurring transaction</label>
                </div>
                {formData.isRecurring && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Frequency</label>
                    <select
                      value={formData.recurringFrequency}
                      onChange={(e) => setFormData({...formData, recurringFrequency: e.target.value})}
                      className="glass-input w-full"
                    >
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForecastForm(false);
                    setEditingForecast(null);
                    setFormData({
                      date: '',
                      type: 'inflow',
                      category: '',
                      amount: 0,
                      description: '',
                      confidence: 'medium',
                      isRecurring: false,
                      recurringFrequency: 'monthly'
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
                  {editingForecast ? 'Update' : 'Add'} Forecast
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashFlow;

