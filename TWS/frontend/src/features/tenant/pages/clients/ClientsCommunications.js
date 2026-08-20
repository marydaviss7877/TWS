import { API_BASE_URL } from '../../../../constants/apiEndpoints';
import React, { useState, useEffect } from 'react';
import AdminPageTemplate from '../../../../components/AdminPageTemplate/AdminPageTemplate';
import { 
  ChatBubbleLeftRightIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  EnvelopeIcon,
  PhoneIcon,
  VideoCameraIcon,
  CalendarIcon,
  UserIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

const ClientsCommunications = () => {
  const [communications, setCommunications] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCommunication, setSelectedCommunication] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [stats, setStats] = useState({
    totalCommunications: 0,
    emails: 0,
    calls: 0,
    meetings: 0,
    pendingFollowUps: 0,
    thisWeek: 0,
    thisMonth: 0,
    responseRate: 0
  });

  useEffect(() => {
    fetchCommunications();
    fetchClients();
    fetchStats();
  }, []);

  const fetchCommunications = async () => {
    try {
      // Mock data - in real implementation, this would come from API
      const mockCommunications = [
        {
          _id: '1',
          clientId: '1',
          clientName: 'Acme Corporation',
          type: 'email',
          subject: 'Project Update - Phase 1 Completion',
          content: 'Hi John, I wanted to update you on the progress of Phase 1. We have successfully completed the frontend development and are now moving to backend integration...',
          direction: 'outbound',
          status: 'sent',
          priority: 'medium',
          date: '2024-01-15T10:30:00Z',
          followUpDate: '2024-01-20T10:30:00Z',
          attachments: ['project-update.pdf'],
          participants: ['john.doe@acme.com', 'sarah.smith@techcorp.com']
        },
        {
          _id: '2',
          clientId: '2',
          clientName: 'TechStart Inc',
          type: 'call',
          subject: 'Weekly Check-in Call',
          content: 'Discussed project timeline, budget concerns, and next phase requirements. Client is satisfied with current progress.',
          direction: 'inbound',
          status: 'completed',
          priority: 'high',
          date: '2024-01-14T14:00:00Z',
          duration: 45,
          participants: ['mike.johnson@techstart.com', 'alex.chen@techcorp.com']
        },
        {
          _id: '3',
          clientId: '3',
          clientName: 'Global Solutions Ltd',
          type: 'meeting',
          subject: 'Project Kickoff Meeting',
          content: 'Initial project discussion, requirements gathering, and timeline establishment. All stakeholders present.',
          direction: 'outbound',
          status: 'scheduled',
          priority: 'high',
          date: '2024-01-16T09:00:00Z',
          duration: 60,
          location: 'Conference Room A',
          participants: ['ceo@globalsolutions.com', 'cto@globalsolutions.com', 'pm@techcorp.com']
        },
        {
          _id: '4',
          clientId: '1',
          clientName: 'Acme Corporation',
          type: 'email',
          subject: 'Re: Project Update - Phase 1 Completion',
          content: 'Thank you for the update. The progress looks great. I have a few questions about the backend integration timeline...',
          direction: 'inbound',
          status: 'received',
          priority: 'medium',
          date: '2024-01-15T16:45:00Z',
          participants: ['john.doe@acme.com', 'sarah.smith@techcorp.com']
        }
      ];
      setCommunications(mockCommunications);
    } catch (error) {
      console.error('Error fetching communications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/clients`, {
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
        totalCommunications: 1240,
        emails: 856,
        calls: 234,
        meetings: 150,
        pendingFollowUps: 12,
        thisWeek: 45,
        thisMonth: 180,
        responseRate: 87
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const filteredCommunications = communications.filter(comm => {
    const matchesSearch = comm.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         comm.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         comm.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'all' || comm.type === typeFilter;
    const matchesClient = clientFilter === 'all' || comm.clientId === clientFilter;
    
    return matchesSearch && matchesType && matchesClient;
  });

  const getTypeIcon = (type) => {
    switch (type) {
      case 'email': return <EnvelopeIcon className="w-5 h-5" />;
      case 'call': return <PhoneIcon className="w-5 h-5" />;
      case 'meeting': return <VideoCameraIcon className="w-5 h-5" />;
      default: return <ChatBubbleLeftRightIcon className="w-5 h-5" />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'email': return 'text-blue-600 dark:text-blue-400';
      case 'call': return 'text-green-600 dark:text-green-400';
      case 'meeting': return 'text-accent-600 dark:text-accent-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'sent': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'received': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'scheduled': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'pending': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
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

  const dashboardStats = [
    { 
      label: 'Total Communications', 
      value: stats.totalCommunications.toLocaleString(), 
      icon: ChatBubbleLeftRightIcon, 
      iconBg: 'bg-gradient-to-br from-blue-500 to-primary-600',
      change: '+12%'
    },
    { 
      label: 'Emails', 
      value: stats.emails.toLocaleString(), 
      icon: EnvelopeIcon, 
      iconBg: 'bg-gradient-to-br from-green-500 to-emerald-600',
      change: '+8%'
    },
    { 
      label: 'Calls', 
      value: stats.calls.toLocaleString(), 
      icon: PhoneIcon, 
      iconBg: 'bg-gradient-to-br from-accent-500 to-pink-600',
      change: '+15%'
    },
    { 
      label: 'Meetings', 
      value: stats.meetings.toLocaleString(), 
      icon: VideoCameraIcon, 
      iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600',
      change: '+20%'
    }
  ];

  const actions = (
    <div className="flex items-center gap-3">
      <div className="relative">
        <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search communications..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      
      <select
        value={typeFilter}
        onChange={(e) => setTypeFilter(e.target.value)}
        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="all">All Types</option>
        <option value="email">Email</option>
        <option value="call">Call</option>
        <option value="meeting">Meeting</option>
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
        Log Communication
      </button>
    </div>
  );

  if (loading) {
    return (
      <AdminPageTemplate title="Communication Logs" description="Track client communications" stats={dashboardStats}>
        <div className="flex items-center justify-center h-64">
          <div className="tws-loading-pulse rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminPageTemplate>
    );
  }

  return (
    <AdminPageTemplate title="Communication Logs" description="Track client communications" stats={dashboardStats} actions={actions}>
      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card-premium p-6 hover-glow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Follow-ups</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pendingFollowUps}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
              <ClockIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        
        <div className="glass-card-premium p-6 hover-glow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">This Week</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.thisWeek}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-primary-600 rounded-xl flex items-center justify-center">
              <CalendarIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        
        <div className="glass-card-premium p-6 hover-glow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">This Month</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.thisMonth}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <CheckCircleIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        
      <div className="glass-card-premium p-6 hover-glow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Response Rate</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.responseRate}%</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-accent-500 to-pink-600 rounded-xl flex items-center justify-center">
              <ExclamationTriangleIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Communications Table */}
      <div className="glass-card-premium overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Communication History</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Subject
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Direction
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredCommunications.map((comm) => (
                <tr key={comm._id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={'w-10 h-10 rounded-lg flex items-center justify-center ' + getTypeColor(comm.type)}>
                        {getTypeIcon(comm.type)}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                          {comm.type}
                        </div>
                        <div className={'text-sm ' + getPriorityColor(comm.priority)}>
                          {comm.priority} priority
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {comm.clientName}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {comm.subject}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                      {comm.content}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={'inline-flex px-2 py-1 text-xs font-semibold rounded-full ' + (
                      comm.direction === 'inbound' 
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                        : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                    )}>
                      {comm.direction}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={'inline-flex px-2 py-1 text-xs font-semibold rounded-full ' + getStatusColor(comm.status)}>
                      {comm.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(comm.date).toLocaleDateString()}
                    <div className="text-xs">
                      {new Date(comm.date).toLocaleTimeString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedCommunication(comm);
                          setShowDetailsModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        title="View Details"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedCommunication(comm);
                          setShowAddModal(true);
                        }}
                        className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300"
                        title="Edit"
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
        
        {filteredCommunications.length === 0 && (
        <div className="text-center py-12">
          <ChatBubbleLeftRightIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No communications found</p>
        </div>
        )}
      </div>

      {/* Communication Details Modal */}
      {showDetailsModal && selectedCommunication && (
        <CommunicationDetailsModal
          communication={selectedCommunication}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedCommunication(null);
          }}
        />
      )}
    </AdminPageTemplate>
  );
};

// Communication Details Modal Component
const CommunicationDetailsModal = ({ communication, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Communication Details</h2>
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
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Communication Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Type</label>
                  <p className="text-gray-900 dark:text-white capitalize">{communication.type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Client</label>
                  <p className="text-gray-900 dark:text-white">{communication.clientName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Subject</label>
                  <p className="text-gray-900 dark:text-white">{communication.subject}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Direction</label>
                  <span className={'inline-flex px-2 py-1 text-xs font-semibold rounded-full ' + (
                    communication.direction === 'inbound' 
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                      : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                  )}>
                    {communication.direction}
                  </span>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Status</label>
                  <span className={'inline-flex px-2 py-1 text-xs font-semibold rounded-full ' + (
                    communication.status === 'sent' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                    communication.status === 'received' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                    communication.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                    communication.status === 'scheduled' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  )}>
                    {communication.status}
                  </span>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Priority</label>
                  <p className="text-gray-900 dark:text-white capitalize">{communication.priority}</p>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Timing</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Date & Time</label>
                  <p className="text-gray-900 dark:text-white">
                    {new Date(communication.date).toLocaleDateString()} at {new Date(communication.date).toLocaleTimeString()}
                  </p>
                </div>
                {communication.duration && (
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Duration</label>
                    <p className="text-gray-900 dark:text-white">{communication.duration} minutes</p>
                  </div>
                )}
                {communication.followUpDate && (
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Follow-up Date</label>
                    <p className="text-gray-900 dark:text-white">{new Date(communication.followUpDate).toLocaleDateString()}</p>
                  </div>
                )}
                {communication.location && (
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Location</label>
                    <p className="text-gray-900 dark:text-white">{communication.location}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Content</h3>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {communication.content}
                </p>
              </div>
            </div>
            
            {communication.participants && communication.participants.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Participants</h3>
                <div className="space-y-2">
                  {communication.participants.map((participant, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <UserIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900 dark:text-white">{participant}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {communication.attachments && communication.attachments.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Attachments</h3>
                <div className="space-y-2">
                  {communication.attachments.map((attachment, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <DocumentTextIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900 dark:text-white">{attachment}</span>
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

export default ClientsCommunications;
