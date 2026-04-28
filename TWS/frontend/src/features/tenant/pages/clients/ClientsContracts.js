import React, { useState, useEffect } from 'react';
import AdminPageTemplate from '../../../../features/admin/components/admin/AdminPageTemplate';
import { 
  DocumentCheckIcon,
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
  UserIcon,
  CurrencyDollarIcon,
  ArrowDownTrayIcon,
  PrinterIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';

const ClientsContracts = () => {
  const [contracts, setContracts] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [stats, setStats] = useState({
    totalContracts: 0,
    activeContracts: 0,
    expiredContracts: 0,
    pendingContracts: 0,
    totalValue: 0,
    expiringSoon: 0,
    thisMonth: 0,
    renewalRate: 0
  });

  useEffect(() => {
    fetchContracts();
    fetchClients();
    fetchStats();
  }, []);

  const fetchContracts = async () => {
    try {
      // Mock data - in real implementation, this would come from API
      const mockContracts = [
        {
          _id: '1',
          contractNumber: 'CON-2024-001',
          clientId: '1',
          clientName: 'Acme Corporation',
          title: 'Website Development Agreement',
          type: 'development',
          status: 'active',
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          value: 150000,
          currency: 'USD',
          paymentTerms: 'monthly',
          description: 'Full-stack website development with ongoing maintenance',
          terms: [
            'Monthly deliverables',
            '24/7 support included',
            'Source code ownership transfer',
            '3-month warranty period'
          ],
          milestones: [
            { name: 'Design Phase', dueDate: '2024-02-15', status: 'completed' },
            { name: 'Development Phase', dueDate: '2024-06-30', status: 'in_progress' },
            { name: 'Testing Phase', dueDate: '2024-08-15', status: 'pending' },
            { name: 'Launch Phase', dueDate: '2024-09-30', status: 'pending' }
          ],
          contacts: [
            { name: 'John Doe', email: 'john.doe@acme.com', role: 'Project Manager' },
            { name: 'Sarah Smith', email: 'sarah.smith@acme.com', role: 'Technical Lead' }
          ],
          documents: ['contract.pdf', 'sow.pdf', 'nda.pdf']
        },
        {
          _id: '2',
          contractNumber: 'CON-2024-002',
          clientId: '2',
          clientName: 'TechStart Inc',
          title: 'Mobile App Development Contract',
          type: 'development',
          status: 'active',
          startDate: '2024-02-01',
          endDate: '2024-08-31',
          value: 85000,
          currency: 'USD',
          paymentTerms: 'milestone',
          description: 'iOS and Android mobile application development',
          terms: [
            'Agile development methodology',
            'Weekly progress reports',
            'App store deployment included',
            '6-month post-launch support'
          ],
          milestones: [
            { name: 'Requirements Analysis', dueDate: '2024-02-15', status: 'completed' },
            { name: 'UI/UX Design', dueDate: '2024-03-15', status: 'completed' },
            { name: 'Development Phase 1', dueDate: '2024-05-15', status: 'in_progress' },
            { name: 'Development Phase 2', dueDate: '2024-07-15', status: 'pending' },
            { name: 'Testing & Launch', dueDate: '2024-08-31', status: 'pending' }
          ],
          contacts: [
            { name: 'Mike Johnson', email: 'mike@techstart.com', role: 'CEO' },
            { name: 'Alex Chen', email: 'alex@techstart.com', role: 'CTO' }
          ],
          documents: ['contract.pdf', 'sow.pdf']
        },
        {
          _id: '3',
          contractNumber: 'CON-2024-003',
          clientId: '3',
          clientName: 'Global Solutions Ltd',
          title: 'Enterprise Software Maintenance',
          type: 'maintenance',
          status: 'expired',
          startDate: '2023-01-01',
          endDate: '2023-12-31',
          value: 50000,
          currency: 'USD',
          paymentTerms: 'quarterly',
          description: 'Ongoing maintenance and support for enterprise software',
          terms: [
            '24/7 technical support',
            'Monthly security updates',
            'Performance monitoring',
            'Bug fixes and patches'
          ],
          milestones: [
            { name: 'Q1 Maintenance', dueDate: '2023-03-31', status: 'completed' },
            { name: 'Q2 Maintenance', dueDate: '2023-06-30', status: 'completed' },
            { name: 'Q3 Maintenance', dueDate: '2023-09-30', status: 'completed' },
            { name: 'Q4 Maintenance', dueDate: '2023-12-31', status: 'completed' }
          ],
          contacts: [
            { name: 'CEO Global', email: 'ceo@globalsolutions.com', role: 'CEO' },
            { name: 'CTO Global', email: 'cto@globalsolutions.com', role: 'CTO' }
          ],
          documents: ['contract.pdf', 'maintenance-agreement.pdf']
        }
      ];
      setContracts(mockContracts);
    } catch (error) {
      console.error('Error fetching contracts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await fetch((process.env.REACT_APP_API_URL || 'http://localhost:5000') + '/api/clients', {
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
        totalContracts: 42,
        activeContracts: 28,
        expiredContracts: 8,
        pendingContracts: 6,
        totalValue: 2850000,
        expiringSoon: 5,
        thisMonth: 3,
        renewalRate: 75
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = contract.contractNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contract.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contract.clientName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || contract.status === statusFilter;
    const matchesClient = clientFilter === 'all' || contract.clientId === clientFilter;
    
    return matchesSearch && matchesStatus && matchesClient;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'expired': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'development': return 'text-blue-600 dark:text-blue-400';
      case 'maintenance': return 'text-green-600 dark:text-green-400';
      case 'consulting': return 'text-purple-600 dark:text-purple-400';
      case 'support': return 'text-orange-600 dark:text-orange-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getMilestoneStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'in_progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'pending': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'overdue': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const isExpiringSoon = (endDate) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays > 0;
  };

  const dashboardStats = [
    { 
      label: 'Total Contracts', 
      value: stats.totalContracts.toString(), 
      icon: DocumentCheckIcon, 
      iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-600',
      change: '+8%'
    },
    { 
      label: 'Active Contracts', 
      value: stats.activeContracts.toString(), 
      icon: CheckCircleIcon, 
      iconBg: 'bg-gradient-to-br from-green-500 to-emerald-600',
      change: '+12%'
    },
    { 
      label: 'Total Value', 
      value: '$' + (stats.totalValue / 1000000).toFixed(1) + 'M', 
      icon: CurrencyDollarIcon, 
      iconBg: 'bg-gradient-to-br from-purple-500 to-pink-600',
      change: '+15%'
    },
    { 
      label: 'Expiring Soon', 
      value: stats.expiringSoon.toString(), 
      icon: ExclamationTriangleIcon, 
      iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600',
      change: '+5%'
    }
  ];

  const actions = (
    <div className="flex items-center gap-3">
      <div className="relative">
        <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search contracts..."
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
        <option value="active">Active</option>
        <option value="expired">Expired</option>
        <option value="pending">Pending</option>
        <option value="draft">Draft</option>
      </select>
      
      <select
        value={clientFilter}
        onChange={(e) => setClientFilter(e.target.value)}
        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="all">All Clients</option>
        {clients.map(client => (
          <option key={client._id} value={client._id}>{client.name}</option>
        ))}
      </select>
      
      <button
        onClick={() => setShowAddModal(true)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <PlusIcon className="w-5 h-5" />
        Create Contract
      </button>
    </div>
  );

  if (loading) {
    return (
      <AdminPageTemplate title="Contracts" description="Manage client contracts and agreements" stats={dashboardStats}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminPageTemplate>
    );
  }

  return (
    <AdminPageTemplate title="Contracts" description="Manage client contracts and agreements" stats={dashboardStats} actions={actions}>
      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card-premium p-6 hover-glow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Expired Contracts</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.expiredContracts}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center">
              <ExclamationTriangleIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        
        <div className="glass-card-premium p-6 hover-glow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Contracts</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pendingContracts}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center">
              <ClockIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        
        <div className="glass-card-premium p-6 hover-glow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">This Month</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.thisMonth}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <CalendarIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        
      <div className="glass-card-premium p-6 hover-glow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Renewal Rate</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.renewalRate}%</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <CheckCircleIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Contracts Table */}
      <div className="glass-card-premium overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Contract Management</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Contract
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  End Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredContracts.map((contract) => (
                <tr key={contract._id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                        <DocumentCheckIcon className="w-5 h-5 text-white" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {contract.contractNumber}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                          {contract.title}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {contract.clientName}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={'text-sm font-medium capitalize ${getTypeColor(contract.type)}'}>
                      {contract.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      ${contract.value.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {contract.paymentTerms}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(contract.status)}`}>
                        {contract.status}
                      </span>
                      {isExpiringSoon(contract.endDate) && contract.status === 'active' && (
                        <ExclamationTriangleIcon className="w-4 h-4 text-amber-500 ml-2" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(contract.endDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedContract(contract);
                          setShowDetailsModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        title="View Details"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedContract(contract);
                          setShowAddModal(true);
                        }}
                        className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300"
                        title="Edit Contract"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => window.print()}
                        className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                        title="Print Contract"
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
        
        {filteredContracts.length === 0 && (
        <div className="text-center py-12">
          <DocumentCheckIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No contracts found</p>
        </div>
        )}
      </div>

      {/* Contract Details Modal */}
      {showDetailsModal && selectedContract && (
        <ContractDetailsModal
          contract={selectedContract}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedContract(null);
          }}
        />
      )}
    </AdminPageTemplate>
  );
};

// Contract Details Modal Component
const ContractDetailsModal = ({ contract, onClose }) => {
  const getMilestoneStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'in_progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'pending': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'overdue': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Contract Details</h2>
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
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Contract Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Contract Number</label>
                  <p className="text-gray-900 dark:text-white">{contract.contractNumber}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Title</label>
                  <p className="text-gray-900 dark:text-white">{contract.title}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Client</label>
                  <p className="text-gray-900 dark:text-white">{contract.clientName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Type</label>
                  <p className="text-gray-900 dark:text-white capitalize">{contract.type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Status</label>
                  <span className={'inline-flex px-2 py-1 text-xs font-semibold rounded-full ' + (
                    contract.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                    contract.status === 'expired' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                    contract.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  )}>
                    {contract.status}
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Financial Details</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Value</label>
                  <p className="text-gray-900 dark:text-white">${contract.value.toLocaleString()} {contract.currency}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Payment Terms</label>
                  <p className="text-gray-900 dark:text-white capitalize">{contract.paymentTerms}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Start Date</label>
                  <p className="text-gray-900 dark:text-white">{new Date(contract.startDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">End Date</label>
                  <p className="text-gray-900 dark:text-white">{new Date(contract.endDate).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Description</h3>
              <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                {contract.description}
              </p>
            </div>
          </div>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Milestones</h3>
              <div className="space-y-3">
                {contract.milestones.map((milestone, index) => (
                  <div key={index} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">{milestone.name}</h4>
                      <span className={'inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getMilestoneStatusColor(milestone.status)}'}>
                        {milestone.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Due: {new Date(milestone.dueDate).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Key Terms</h3>
              <div className="space-y-2">
                {contract.terms.map((term, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{term}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Contacts</h3>
              <div className="space-y-3">
                {contract.contacts.map((contact, index) => (
                  <div key={index} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <UserIcon className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900 dark:text-white">{contact.name}</span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{contact.email}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-500">{contact.role}</div>
                  </div>
                ))}
              </div>
            </div>
            
            {contract.documents && contract.documents.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Documents</h3>
                <div className="space-y-2">
                  {contract.documents.map((document, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <DocumentTextIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900 dark:text-white">{document}</span>
                      <button className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                        <ArrowDownTrayIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientsContracts;
