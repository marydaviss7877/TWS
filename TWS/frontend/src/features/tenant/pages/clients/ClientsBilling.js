import { API_BASE_URL } from '../../../../constants/apiEndpoints';
import React, { useState, useEffect } from 'react';
import AdminPageTemplate from '../../../../components/AdminPageTemplate/AdminPageTemplate';
import { 
  CurrencyDollarIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
  ChartBarIcon,
  PrinterIcon
} from '@heroicons/react/24/outline';

const ClientsBilling = () => {
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    pendingAmount: 0,
    overdueAmount: 0,
    paidAmount: 0,
    totalInvoices: 0,
    overdueInvoices: 0,
    pendingInvoices: 0,
    paidInvoices: 0
  });

  useEffect(() => {
    fetchInvoices();
    fetchClients();
    fetchStats();
  }, []);

  const fetchInvoices = async () => {
    try {
      // Mock data - in real implementation, this would come from API
      const mockInvoices = [
        {
          _id: '1',
          invoiceNumber: 'INV-2024-001',
          clientId: '1',
          clientName: 'Acme Corporation',
          amount: 15000,
          tax: 1500,
          total: 16500,
          status: 'paid',
          dueDate: '2024-01-15',
          issueDate: '2024-01-01',
          paidDate: '2024-01-10',
          description: 'Website Development - Phase 1',
          items: [
            { description: 'Frontend Development', quantity: 40, rate: 150, amount: 6000 },
            { description: 'Backend Development', quantity: 30, rate: 150, amount: 4500 },
            { description: 'UI/UX Design', quantity: 20, rate: 150, amount: 3000 },
            { description: 'Project Management', quantity: 10, rate: 150, amount: 1500 }
          ]
        },
        {
          _id: '2',
          invoiceNumber: 'INV-2024-002',
          clientId: '2',
          clientName: 'TechStart Inc',
          amount: 8500,
          tax: 850,
          total: 9350,
          status: 'pending',
          dueDate: '2024-02-15',
          issueDate: '2024-02-01',
          description: 'Mobile App Development',
          items: [
            { description: 'iOS Development', quantity: 25, rate: 150, amount: 3750 },
            { description: 'Android Development', quantity: 25, rate: 150, amount: 3750 },
            { description: 'API Integration', quantity: 10, rate: 100, amount: 1000 }
          ]
        },
        {
          _id: '3',
          invoiceNumber: 'INV-2024-003',
          clientId: '3',
          clientName: 'Global Solutions Ltd',
          amount: 25000,
          tax: 2500,
          total: 27500,
          status: 'overdue',
          dueDate: '2024-01-30',
          issueDate: '2024-01-15',
          description: 'Enterprise Software Development',
          items: [
            { description: 'System Architecture', quantity: 50, rate: 200, amount: 10000 },
            { description: 'Database Design', quantity: 30, rate: 150, amount: 4500 },
            { description: 'API Development', quantity: 40, rate: 150, amount: 6000 },
            { description: 'Testing & QA', quantity: 30, rate: 150, amount: 4500 }
          ]
        }
      ];
      setInvoices(mockInvoices);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await fetch((API_BASE_URL) + '/api/clients', {
        credentials: 'include' // SECURITY FIX: Use cookies instead of localStorage token
      });
      
      if (response.ok) {
        const data = await response.json();
        setClients(data.data.clients || []);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchStats = async () => {
    try {
      setStats({
        totalRevenue: 53350,
        pendingAmount: 9350,
        overdueAmount: 27500,
        paidAmount: 16500,
        totalInvoices: 3,
        overdueInvoices: 1,
        pendingInvoices: 1,
        paidInvoices: 1
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'overdue': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid': return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
      case 'pending': return <ClockIcon className="w-5 h-5 text-yellow-600" />;
      case 'overdue': return <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />;
      case 'draft': return <DocumentTextIcon className="w-5 h-5 text-gray-600" />;
      default: return <DocumentTextIcon className="w-5 h-5 text-gray-600" />;
    }
  };

  const dashboardStats = [
    { 
      label: 'Total Revenue', 
      value: '$' + (stats.totalRevenue / 1000).toFixed(0) + 'K', 
      icon: CurrencyDollarIcon, 
      iconBg: 'bg-gradient-to-br from-green-500 to-emerald-600',
      change: '+15%'
    },
    { 
      label: 'Pending Amount', 
      value: '$' + (stats.pendingAmount / 1000).toFixed(0) + 'K', 
      icon: ClockIcon, 
      iconBg: 'bg-gradient-to-br from-yellow-500 to-orange-600',
      change: '+8%'
    },
    { 
      label: 'Overdue Amount', 
      value: '$' + (stats.overdueAmount / 1000).toFixed(0) + 'K', 
      icon: ExclamationTriangleIcon, 
      iconBg: 'bg-gradient-to-br from-red-500 to-pink-600',
      change: '+12%'
    },
    { 
      label: 'Total Invoices', 
      value: stats.totalInvoices.toString(), 
      icon: DocumentTextIcon, 
      iconBg: 'bg-gradient-to-br from-blue-500 to-primary-600',
      change: '+20%'
    }
  ];

  const actions = (
    <div className="flex items-center gap-3">
      <div className="relative">
        <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search invoices..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="all">All Status</option>
        <option value="draft">Draft</option>
        <option value="pending">Pending</option>
        <option value="paid">Paid</option>
        <option value="overdue">Overdue</option>
      </select>
      
      <button
        onClick={() => setShowAddModal(true)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <PlusIcon className="w-5 h-5" />
        Create Invoice
      </button>
    </div>
  );

  if (loading) {
    return (
      <AdminPageTemplate title="Client Billing" description="Manage client billing and invoices" stats={dashboardStats}>
        <div className="flex items-center justify-center h-64">
          <div className="tws-loading-pulse rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminPageTemplate>
    );
  }

  return (
    <AdminPageTemplate title="Client Billing" description="Manage client billing and invoices" stats={dashboardStats} actions={actions}>
      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card-premium p-6 hover-glow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Paid Invoices</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.paidInvoices}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <CheckCircleIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        
        <div className="glass-card-premium p-6 hover-glow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Invoices</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pendingInvoices}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center">
              <ClockIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        
        <div className="glass-card-premium p-6 hover-glow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Overdue Invoices</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.overdueInvoices}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center">
              <ExclamationTriangleIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        
      <div className="glass-card-premium p-6 hover-glow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg. Invoice Value</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">${(stats.totalRevenue / stats.totalInvoices / 1000).toFixed(0)}K</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-primary-600 rounded-xl flex items-center justify-center">
              <ChartBarIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="glass-card-premium overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Invoice Management</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Invoice
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredInvoices.map((invoice) => (
                <tr key={invoice._id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-primary-600 rounded-lg flex items-center justify-center">
                        <DocumentTextIcon className="w-5 h-5 text-white" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {invoice.invoiceNumber}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                          {invoice.description}
                        </div>
        </div>
      </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {invoice.clientName}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      ${invoice.total.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(invoice.status)}
                      <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                        {invoice.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {new Date(invoice.dueDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedInvoice(invoice);
                          setShowDetailsModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        title="View Details"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => window.print()}
                        className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                        title="Print Invoice"
                      >
                        <PrinterIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredInvoices.length === 0 && (
          <div className="text-center py-12">
            <DocumentTextIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No invoices found</p>
          </div>
        )}
      </div>

      {/* Invoice Details Modal */}
      {showDetailsModal && selectedInvoice && (
        <InvoiceDetailsModal
          invoice={selectedInvoice}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedInvoice(null);
          }}
        />
      )}
    </AdminPageTemplate>
  );
};

// Invoice Details Modal Component
const InvoiceDetailsModal = ({ invoice, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Invoice Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Invoice Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Invoice Number</label>
                  <p className="text-gray-900 dark:text-white">{invoice.invoiceNumber}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Client</label>
                  <p className="text-gray-900 dark:text-white">{invoice.clientName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Description</label>
                  <p className="text-gray-900 dark:text-white">{invoice.description}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Status</label>
                  <span className={'inline-flex px-2 py-1 text-xs font-semibold rounded-full ' + (
                    invoice.status === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                    invoice.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                    invoice.status === 'overdue' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  )}>
                    {invoice.status}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Invoice Items</h3>
              <div className="space-y-3">
                {invoice.items.map((item, index) => (
                  <div key={index} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">{item.description}</h4>
                      <span className="font-medium text-gray-900 dark:text-white">${item.amount.toFixed(2)}</span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {item.quantity} × ${item.rate.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Totals</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Subtotal:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">${invoice.amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Tax:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">${invoice.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 dark:border-gray-600 pt-2">
                  <span className="text-lg font-bold text-gray-900 dark:text-white">Total:</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">${invoice.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientsBilling;
