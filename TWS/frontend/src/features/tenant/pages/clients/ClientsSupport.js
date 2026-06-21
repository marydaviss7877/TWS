import { API_BASE_URL } from '../../../../constants/apiEndpoints';
import React, { useState, useEffect } from 'react';
import AdminPageTemplate from '../../../../components/AdminPageTemplate/AdminPageTemplate';
import { 
  TicketIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  UserIcon,
  CalendarIcon,
  ChartBarIcon,
  FunnelIcon,
  ArrowPathIcon,
  XMarkIcon,
  ChatBubbleBottomCenterTextIcon,
  PhoneIcon,
  EnvelopeIcon,
  VideoCameraIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';

const ClientsSupport = () => {
  const [tickets, setTickets] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [stats, setStats] = useState({
    totalTickets: 0,
    openTickets: 0,
    closedTickets: 0,
    pendingTickets: 0,
    highPriority: 0,
    averageResolutionTime: 0,
    thisWeek: 0,
    satisfactionScore: 0
  });

  useEffect(() => {
    fetchTickets();
    fetchClients();
    fetchStats();
  }, []);

  const fetchTickets = async () => {
    try {
      // Mock data - in real implementation, this would come from API
      const mockTickets = [
        {
          _id: '1',
          ticketNumber: 'TKT-2024-001',
          clientId: '1',
          clientName: 'Acme Corporation',
          projectId: 'proj-1',
          projectName: 'Website Development',
          title: 'Login functionality not working',
          description: 'Users are unable to log into the website. Getting a 500 error when trying to authenticate.',
          category: 'technical',
          priority: 'high',
          status: 'open',
          assignedTo: 'John Smith',
          createdBy: 'Sarah Johnson',
          createdAt: '2024-01-15T10:30:00Z',
          updatedAt: '2024-01-15T14:20:00Z',
          dueDate: '2024-01-16T10:30:00Z',
          resolutionTime: null,
          source: 'email',
          tags: ['authentication', 'login', 'error'],
          attachments: ['error-log.txt', 'screenshot.png'],
          comments: [
            {
              id: '1',
              author: 'John Smith',
              text: 'I\'ve identified the issue. It\'s related to the database connection timeout. Working on a fix.',
              timestamp: '2024-01-15T11:15:00Z',
              type: 'internal'
            },
            {
              id: '2',
              author: 'Sarah Johnson',
              text: 'Thank you for the quick response. Please let me know when this is resolved.',
              timestamp: '2024-01-15T11:30:00Z',
              type: 'external'
            }
          ]
        },
        {
          _id: '2',
          ticketNumber: 'TKT-2024-002',
          clientId: '2',
          clientName: 'TechStart Inc',
          projectId: 'proj-2',
          projectName: 'Mobile App Development',
          title: 'Feature request: Dark mode',
          description: 'Our users have requested a dark mode feature for the mobile app. This would improve user experience, especially for night-time usage.',
          category: 'feature_request',
          priority: 'medium',
          status: 'pending',
          assignedTo: 'Mike Chen',
          createdBy: 'Alex Rodriguez',
          createdAt: '2024-01-14T16:45:00Z',
          updatedAt: '2024-01-14T16:45:00Z',
          dueDate: '2024-01-21T16:45:00Z',
          resolutionTime: null,
          source: 'phone',
          tags: ['feature', 'ui', 'dark-mode'],
          attachments: [],
          comments: [
            {
              id: '1',
              author: 'Mike Chen',
              text: 'This is a great suggestion. I\'ll add this to our roadmap for the next sprint.',
              timestamp: '2024-01-14T17:00:00Z',
              type: 'internal'
            }
          ]
        },
        {
          _id: '3',
          ticketNumber: 'TKT-2024-003',
          clientId: '3',
          clientName: 'Global Solutions Ltd',
          projectId: 'proj-3',
          projectName: 'Enterprise Software',
          title: 'Performance issues on dashboard',
          description: 'The dashboard is loading very slowly, especially when viewing reports. This is affecting our daily operations.',
          category: 'performance',
          priority: 'high',
          status: 'in_progress',
          assignedTo: 'Emily Davis',
          createdBy: 'Robert Wilson',
          createdAt: '2024-01-13T09:20:00Z',
          updatedAt: '2024-01-15T10:15:00Z',
          dueDate: '2024-01-17T09:20:00Z',
          resolutionTime: null,
          source: 'portal',
          tags: ['performance', 'dashboard', 'slow'],
          attachments: ['performance-report.pdf'],
          comments: [
            {
              id: '1',
              author: 'Emily Davis',
              text: 'I\'ve identified the bottleneck in the database queries. Optimizing the queries and adding caching.',
              timestamp: '2024-01-13T10:30:00Z',
              type: 'internal'
            },
            {
              id: '2',
              author: 'Emily Davis',
              text: 'Update: Query optimization is complete. Testing the performance improvements now.',
              timestamp: '2024-01-15T10:15:00Z',
              type: 'internal'
            }
          ]
        },
        {
          _id: '4',
          ticketNumber: 'TKT-2024-004',
          clientId: '1',
          clientName: 'Acme Corporation',
          projectId: 'proj-1',
          projectName: 'Website Development',
          title: 'Password reset email not sending',
          description: 'Users are not receiving password reset emails. This is preventing them from accessing their accounts.',
          category: 'technical',
          priority: 'medium',
          status: 'closed',
          assignedTo: 'John Smith',
          createdBy: 'Sarah Johnson',
          createdAt: '2024-01-12T14:30:00Z',
          updatedAt: '2024-01-13T16:45:00Z',
          dueDate: '2024-01-15T14:30:00Z',
          resolutionTime: 26.25, // hours
          source: 'email',
          tags: ['email', 'password', 'reset'],
          attachments: ['email-config.log'],
          comments: [
            {
              id: '1',
              author: 'John Smith',
              text: 'Found the issue - SMTP server configuration was incorrect. Fixed and tested.',
              timestamp: '2024-01-13T16:45:00Z',
              type: 'internal'
            },
            {
              id: '2',
              author: 'Sarah Johnson',
              text: 'Confirmed working. Thank you for the quick fix!',
              timestamp: '2024-01-13T17:00:00Z',
              type: 'external'
            }
          ]
        },
        {
          _id: '5',
          ticketNumber: 'TKT-2024-005',
          clientId: '4',
          clientName: 'StartupXYZ',
          projectId: 'proj-4',
          projectName: 'E-commerce Platform',
          title: 'Payment gateway integration issue',
          description: 'Payments are failing intermittently. Some transactions go through while others fail with no clear pattern.',
          category: 'technical',
          priority: 'high',
          status: 'open',
          assignedTo: 'David Kim',
          createdBy: 'Lisa Park',
          createdAt: '2024-01-11T11:15:00Z',
          updatedAt: '2024-01-15T09:30:00Z',
          dueDate: '2024-01-16T11:15:00Z',
          resolutionTime: null,
          source: 'portal',
          tags: ['payment', 'gateway', 'integration'],
          attachments: ['payment-logs.csv', 'error-screenshots.zip'],
          comments: [
            {
              id: '1',
              author: 'David Kim',
              text: 'Investigating the payment gateway logs. This appears to be related to API rate limiting.',
              timestamp: '2024-01-11T12:00:00Z',
              type: 'internal'
            },
            {
              id: '2',
              author: 'David Kim',
              text: 'Update: Found the issue with the API key rotation. Implementing a fix.',
              timestamp: '2024-01-15T09:30:00Z',
              type: 'internal'
            }
          ]
        }
      ];
      setTickets(mockTickets);
    } catch (error) {
      console.error('Error fetching tickets:', error);
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
        totalTickets: 18,
        openTickets: 8,
        closedTickets: 6,
        pendingTickets: 4,
        highPriority: 3,
        averageResolutionTime: 18.5,
        thisWeek: 12,
        satisfactionScore: 4.2
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'in_progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'closed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'resolved': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600 dark:text-red-400';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400';
      case 'low': return 'text-green-600 dark:text-green-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'technical': return <ExclamationTriangleIcon className="w-4 h-4" />;
      case 'feature_request': return <ChatBubbleLeftRightIcon className="w-4 h-4" />;
      case 'performance': return <ChartBarIcon className="w-4 h-4" />;
      case 'bug': return <XMarkIcon className="w-4 h-4" />;
      default: return <TicketIcon className="w-4 h-4" />;
    }
  };

  const getSourceIcon = (source) => {
    switch (source) {
      case 'email': return <EnvelopeIcon className="w-4 h-4" />;
      case 'phone': return <PhoneIcon className="w-4 h-4" />;
      case 'portal': return <ChatBubbleBottomCenterTextIcon className="w-4 h-4" />;
      case 'chat': return <VideoCameraIcon className="w-4 h-4" />;
      default: return <TicketIcon className="w-4 h-4" />;
    }
  };

  const isOverdue = (dueDate) => {
    return new Date(dueDate) < new Date() && !['closed', 'resolved'].includes(tickets.find(t => t.dueDate === dueDate)?.status);
  };

  const dashboardStats = [
    { 
      label: 'Total Tickets', 
      value: stats.totalTickets.toString(), 
      icon: TicketIcon, 
      iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-600',
      change: '+15%'
    },
    { 
      label: 'Open Tickets', 
      value: stats.openTickets.toString(), 
      icon: ExclamationTriangleIcon, 
      iconBg: 'bg-gradient-to-br from-red-500 to-pink-600',
      change: '+8%'
    },
    { 
      label: 'Closed Tickets', 
      value: stats.closedTickets.toString(), 
      icon: CheckCircleIcon, 
      iconBg: 'bg-gradient-to-br from-green-500 to-emerald-600',
      change: '+12%'
    },
    { 
      label: 'Avg. Resolution Time', 
      value: stats.averageResolutionTime + 'h', 
      icon: ClockIcon, 
      iconBg: 'bg-gradient-to-br from-purple-500 to-pink-600',
      change: '-2h'
    }
  ];

  const actions = (
    <div className="flex items-center gap-3">
      <div className="relative">
        <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search tickets..."
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
        <option value="open">Open</option>
        <option value="in_progress">In Progress</option>
        <option value="pending">Pending</option>
        <option value="closed">Closed</option>
        <option value="resolved">Resolved</option>
      </select>
      
      <select
        value={priorityFilter}
        onChange={(e) => setPriorityFilter(e.target.value)}
        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="all">All Priority</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>
      
      <button
        onClick={() => setShowAddModal(true)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <PlusIcon className="w-5 h-5" />
        Create Ticket
      </button>
    </div>
  );

  if (loading) {
    return (
      <AdminPageTemplate title="Support Tickets" description="Manage client support requests" stats={dashboardStats}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminPageTemplate>
    );
  }

  return (
    <AdminPageTemplate title="Support Tickets" description="Manage client support requests" stats={dashboardStats} actions={actions}>
      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card-premium p-6 hover-glow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Tickets</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pendingTickets}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center">
              <ClockIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        
        <div className="glass-card-premium p-6 hover-glow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">High Priority</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.highPriority}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center">
              <ExclamationTriangleIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        
        <div className="glass-card-premium p-6 hover-glow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">This Week</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.thisWeek}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <CalendarIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        
        <div className="glass-card-premium p-6 hover-glow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Satisfaction Score</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.satisfactionScore}/5</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <CheckCircleIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="glass-card-premium overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Support Ticket Management</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Ticket
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Client & Project
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Assigned To
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
              {filteredTickets.map((ticket) => (
                <tr key={ticket._id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                        <TicketIcon className="w-5 h-5 text-white" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {ticket.ticketNumber}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                          {ticket.title}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {ticket.clientName}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {ticket.projectName}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getCategoryIcon(ticket.category)}
                      <span className="ml-2 text-sm text-gray-900 dark:text-white capitalize">
                        {ticket.category.replace('_', ' ')}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-medium capitalize ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(ticket.status)}`}>
                      {ticket.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {ticket.assignedTo?.fullName || ticket.assignedTo?.name || ticket.assignedTo?.email || ticket.assignedTo || '—'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {new Date(ticket.dueDate).toLocaleDateString()}
                    </div>
                    {isOverdue(ticket.dueDate) && (
                      <div className="text-xs text-red-600 dark:text-red-400">
                        Overdue
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedTicket(ticket);
                          setShowDetailsModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        title="View Details"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedTicket(ticket);
                          setShowAddModal(true);
                        }}
                        className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300"
                        title="Edit Ticket"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredTickets.length === 0 && (
          <div className="text-center py-12">
            <TicketIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No tickets found</p>
          </div>
        )}
      </div>

      {/* Ticket Details Modal */}
      {showDetailsModal && selectedTicket && (
        <TicketDetailsModal
          ticket={selectedTicket}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedTicket(null);
          }}
        />
      )}
    </AdminPageTemplate>
  );
};

// Ticket Details Modal Component
const TicketDetailsModal = ({ ticket, onClose }) => {
  const [newComment, setNewComment] = useState('');

  const handleAddComment = () => {
    if (newComment.trim()) {
      // In real implementation, this would call the API
      console.log('Adding comment:', newComment);
      setNewComment('');
    }
  };

  const getSourceIcon = (source) => {
    switch (source) {
      case 'email': return <EnvelopeIcon className="w-4 h-4" />;
      case 'phone': return <PhoneIcon className="w-4 h-4" />;
      case 'portal': return <ChatBubbleBottomCenterTextIcon className="w-4 h-4" />;
      case 'chat': return <VideoCameraIcon className="w-4 h-4" />;
      default: return <TicketIcon className="w-4 h-4" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Ticket Details</h2>
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
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Ticket Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Ticket Number</label>
                  <p className="text-gray-900 dark:text-white">{ticket.ticketNumber}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Title</label>
                  <p className="text-gray-900 dark:text-white">{ticket.title}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Client</label>
                  <p className="text-gray-900 dark:text-white">{ticket.clientName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Project</label>
                  <p className="text-gray-900 dark:text-white">{ticket.projectName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Category</label>
                  <p className="text-gray-900 dark:text-white capitalize">{ticket.category.replace('_', ' ')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Priority</label>
                  <p className="text-gray-900 dark:text-white capitalize">{ticket.priority}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Status</label>
                  <span className={'inline-flex px-2 py-1 text-xs font-semibold rounded-full ' + (
                    ticket.status === 'open' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                    ticket.status === 'in_progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                    ticket.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                  )}>
                    {ticket.status.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Assigned To</label>
                  <p className="text-gray-900 dark:text-white">{ticket.assignedTo?.fullName || ticket.assignedTo?.name || ticket.assignedTo?.email || ticket.assignedTo || '—'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Created By</label>
                  <p className="text-gray-900 dark:text-white">{ticket.createdBy?.fullName || ticket.createdBy?.name || ticket.createdBy?.email || ticket.createdBy || '—'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Source</label>
                  <div className="flex items-center">
                    {getSourceIcon(ticket.source)}
                    <span className="ml-2 text-gray-900 dark:text-white capitalize">{ticket.source}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Timing</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Created</label>
                  <p className="text-gray-900 dark:text-white">
                    {new Date(ticket.createdAt).toLocaleDateString()} at {new Date(ticket.createdAt).toLocaleTimeString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Last Updated</label>
                  <p className="text-gray-900 dark:text-white">
                    {new Date(ticket.updatedAt).toLocaleDateString()} at {new Date(ticket.updatedAt).toLocaleTimeString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Due Date</label>
                  <p className="text-gray-900 dark:text-white">
                    {new Date(ticket.dueDate).toLocaleDateString()} at {new Date(ticket.dueDate).toLocaleTimeString()}
                  </p>
                </div>
                {ticket.resolutionTime && (
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Resolution Time</label>
                    <p className="text-gray-900 dark:text-white">{ticket.resolutionTime} hours</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Description</h3>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {ticket.description}
                </p>
              </div>
            </div>
            
            {ticket.tags && ticket.tags.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {ticket.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {ticket.attachments && ticket.attachments.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Attachments</h3>
                <div className="space-y-2">
                  {ticket.attachments.map((attachment, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <DocumentTextIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900 dark:text-white">{attachment}</span>
                      <button className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                        <ArrowDownTrayIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Comments</h3>
              <div className="space-y-4 max-h-64 overflow-y-auto">
                {ticket.comments.map((comment) => (
                  <div key={comment.id} className={`p-3 rounded-lg ${
                    comment.type === 'internal' 
                      ? 'bg-blue-50 dark:bg-blue-900' 
                      : 'bg-gray-50 dark:bg-gray-700'
                  }`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-gray-900 dark:text-white">{comment.author}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(comment.timestamp).toLocaleDateString()} {new Date(comment.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{comment.text}</p>
                    {comment.type === 'internal' && (
                      <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded-full mt-2">
                        Internal
                      </span>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Add Comment</h4>
                <div className="space-y-3">
                  <textarea
                    rows={3}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddComment}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Add Comment
                    </button>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Internal only</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientsSupport;