import { API_BASE_URL } from '../../../../constants/apiEndpoints';
import React, { useState, useEffect } from 'react';
import AdminPageTemplate from '../../../../components/AdminPageTemplate/AdminPageTemplate';
import { 
  StarIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ChatBubbleLeftRightIcon,
  HandThumbUpIcon,
  HandThumbDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  UserIcon,
  CalendarIcon,
  ChartBarIcon,
  FunnelIcon,
  HeartIcon,
  FaceFrownIcon,
  FaceSmileIcon
} from '@heroicons/react/24/outline';

const ClientsFeedback = () => {
  const [feedback, setFeedback] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [stats, setStats] = useState({
    totalFeedback: 0,
    averageRating: 0,
    positiveFeedback: 0,
    negativeFeedback: 0,
    pendingReview: 0,
    thisMonth: 0,
    responseRate: 0,
    satisfactionScore: 0
  });

  useEffect(() => {
    fetchFeedback();
    fetchClients();
    fetchStats();
  }, []);

  const fetchFeedback = async () => {
    try {
      // Mock data - in real implementation, this would come from API
      const mockFeedback = [
        {
          _id: '1',
          clientId: '1',
          clientName: 'Acme Corporation',
          projectId: 'proj-1',
          projectName: 'Website Development',
          rating: 5,
          category: 'service_quality',
          title: 'Excellent work and communication',
          content: 'The team delivered an outstanding website that exceeded our expectations. The communication throughout the project was excellent, and they were always responsive to our feedback. Highly recommended!',
          status: 'published',
          date: '2024-01-15T10:30:00Z',
          response: {
            text: 'Thank you for your kind words! We\'re thrilled that you\'re happy with the final result.',
            date: '2024-01-15T14:20:00Z',
            respondedBy: 'Sarah Smith'
          },
          tags: ['communication', 'quality', 'timeline'],
          sentiment: 'positive',
          source: 'project_completion',
          attachments: []
        },
        {
          _id: '2',
          clientId: '2',
          clientName: 'TechStart Inc',
          projectId: 'proj-2',
          projectName: 'Mobile App Development',
          rating: 4,
          category: 'technical_expertise',
          title: 'Great technical skills, minor delays',
          content: 'The technical implementation was excellent and the team demonstrated deep expertise. There were some minor delays in the timeline, but overall we\'re very satisfied with the quality of work.',
          status: 'published',
          date: '2024-01-14T16:45:00Z',
          response: {
            text: 'We appreciate your feedback about the timeline. We\'re implementing new processes to ensure better time management.',
            date: '2024-01-15T09:15:00Z',
            respondedBy: 'Mike Johnson'
          },
          tags: ['technical', 'timeline', 'quality'],
          sentiment: 'positive',
          source: 'project_completion',
          attachments: []
        },
        {
          _id: '3',
          clientId: '3',
          clientName: 'Global Solutions Ltd',
          projectId: 'proj-3',
          projectName: 'Enterprise Software',
          rating: 2,
          category: 'communication',
          title: 'Communication issues during project',
          content: 'While the final deliverable was acceptable, we experienced significant communication gaps during the project. Updates were infrequent and it was difficult to get timely responses to our questions.',
          status: 'pending_review',
          date: '2024-01-13T11:20:00Z',
          response: null,
          tags: ['communication', 'response_time'],
          sentiment: 'negative',
          source: 'project_completion',
          attachments: []
        },
        {
          _id: '4',
          clientId: '1',
          clientName: 'Acme Corporation',
          projectId: 'proj-1',
          projectName: 'Website Development',
          rating: 5,
          category: 'support',
          title: 'Outstanding post-launch support',
          content: 'The support team has been incredibly helpful after the website launch. They quickly resolved any issues and provided excellent guidance on content management.',
          status: 'published',
          date: '2024-01-12T14:30:00Z',
          response: {
            text: 'We\'re committed to providing ongoing support. Thank you for recognizing our team\'s efforts!',
            date: '2024-01-12T16:45:00Z',
            respondedBy: 'Alex Chen'
          },
          tags: ['support', 'response_time', 'helpfulness'],
          sentiment: 'positive',
          source: 'support_ticket',
          attachments: []
        },
        {
          _id: '5',
          clientId: '4',
          clientName: 'StartupXYZ',
          projectId: 'proj-4',
          projectName: 'E-commerce Platform',
          rating: 3,
          category: 'value_for_money',
          title: 'Good work but over budget',
          content: 'The final product is good quality, but the project went significantly over budget. We would have appreciated more transparency about potential additional costs upfront.',
          status: 'pending_review',
          date: '2024-01-11T09:15:00Z',
          response: null,
          tags: ['budget', 'transparency', 'cost'],
          sentiment: 'neutral',
          source: 'project_completion',
          attachments: []
        }
      ];
      setFeedback(mockFeedback);
    } catch (error) {
      console.error('Error fetching feedback:', error);
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
        totalFeedback: 156,
        averageRating: 4.2,
        positiveFeedback: 89,
        negativeFeedback: 12,
        pendingReview: 8,
        thisMonth: 24,
        responseRate: 92,
        satisfactionScore: 87
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const filteredFeedback = feedback.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRating = ratingFilter === 'all' || 
                         (ratingFilter === '5' && item.rating === 5) ||
                         (ratingFilter === '4' && item.rating === 4) ||
                         (ratingFilter === '3' && item.rating === 3) ||
                         (ratingFilter === '2' && item.rating === 2) ||
                         (ratingFilter === '1' && item.rating === 1);
    
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    
    return matchesSearch && matchesRating && matchesStatus;
  });

  const getRatingStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <StarIcon
        key={i}
        className={'w-4 h-4 ' + 
          i < rating
            ? 'text-yellow-400 fill-current'
            : 'text-gray-300 dark:text-gray-600'
         + ''}
      />
    ));
  };

  const getSentimentIcon = (sentiment) => {
    switch (sentiment) {
      case 'positive': return <FaceSmileIcon className="w-5 h-5 text-green-600" />;
      case 'negative': return <FaceFrownIcon className="w-5 h-5 text-red-600" />;
      case 'neutral': return <ChatBubbleLeftRightIcon className="w-5 h-5 text-gray-600" />;
      default: return <ChatBubbleLeftRightIcon className="w-5 h-5 text-gray-600" />;
    }
  };

  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'negative': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'neutral': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'pending_review': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'service_quality': return 'text-blue-600 dark:text-blue-400';
      case 'technical_expertise': return 'text-green-600 dark:text-green-400';
      case 'communication': return 'text-accent-600 dark:text-accent-400';
      case 'support': return 'text-orange-600 dark:text-orange-400';
      case 'value_for_money': return 'text-pink-600 dark:text-pink-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const dashboardStats = [
    { 
      label: 'Total Feedback', 
      value: stats.totalFeedback.toString(), 
      icon: ChatBubbleLeftRightIcon, 
      iconBg: 'bg-gradient-to-br from-blue-500 to-primary-600',
      change: '+18%'
    },
    { 
      label: 'Average Rating', 
      value: stats.averageRating.toFixed(1), 
      icon: StarIcon, 
      iconBg: 'bg-gradient-to-br from-yellow-500 to-orange-600',
      change: '+0.3'
    },
    { 
      label: 'Positive Feedback', 
      value: stats.positiveFeedback.toString(), 
      icon: HandThumbUpIcon, 
      iconBg: 'bg-gradient-to-br from-green-500 to-emerald-600',
      change: '+12%'
    },
    { 
      label: 'Satisfaction Score', 
      value: stats.satisfactionScore + '%', 
      icon: HeartIcon, 
      iconBg: 'bg-gradient-to-br from-pink-500 to-rose-600',
      change: '+5%'
    }
  ];

  const actions = (
    <div className="flex items-center gap-3">
      <div className="relative">
        <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search feedback..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      
      <select
        value={ratingFilter}
        onChange={(e) => setRatingFilter(e.target.value)}
        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="all">All Ratings</option>
        <option value="5">5 Stars</option>
        <option value="4">4 Stars</option>
        <option value="3">3 Stars</option>
        <option value="2">2 Stars</option>
        <option value="1">1 Star</option>
      </select>
      
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="all">All Status</option>
        <option value="published">Published</option>
        <option value="pending_review">Pending Review</option>
        <option value="draft">Draft</option>
      </select>
      
      <button
        onClick={() => setShowAddModal(true)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <PlusIcon className="w-5 h-5" />
        Add Feedback
      </button>
    </div>
  );

  if (loading) {
    return (
      <AdminPageTemplate title="Client Feedback" description="Collect and analyze client feedback" stats={dashboardStats}>
        <div className="flex items-center justify-center h-64">
          <div className="tws-loading-pulse rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminPageTemplate>
    );
  }

  return (
    <AdminPageTemplate title="Client Feedback" description="Collect and analyze client feedback" stats={dashboardStats} actions={actions}>
      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card-premium p-6 hover-glow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Negative Feedback</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.negativeFeedback}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center">
              <HandThumbDownIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        
        <div className="glass-card-premium p-6 hover-glow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Review</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pendingReview}</p>
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
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-primary-600 rounded-xl flex items-center justify-center">
              <CalendarIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        
        <div className="glass-card-premium p-6 hover-glow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Response Rate</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.responseRate}%</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <CheckCircleIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Table */}
      <div className="glass-card-premium overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Feedback Management</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Client & Project
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Rating
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Sentiment
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
              {filteredFeedback.map((item) => (
                <tr key={item._id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-primary-600 rounded-lg flex items-center justify-center">
                        <UserIcon className="w-5 h-5 text-white" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {item.clientName}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {item.projectName}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getRatingStars(item.rating)}
                      <span className="ml-2 text-sm text-gray-900 dark:text-white">
                        ({item.rating}/5)
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-medium capitalize ${getCategoryColor(item.category)}`}>
                      {item.category.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {item.title}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                      {item.content}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getSentimentIcon(item.sentiment)}
                      <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSentimentColor(item.sentiment)}`}>
                        {item.sentiment}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.status)}`}>
                      {item.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(item.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedFeedback(item);
                          setShowDetailsModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        title="View Details"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedFeedback(item);
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
        
        {filteredFeedback.length === 0 && (
          <div className="text-center py-12">
            <StarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No feedback found</p>
          </div>
        )}
      </div>

      {/* Feedback Details Modal */}
      {showDetailsModal && selectedFeedback && (
        <FeedbackDetailsModal
          feedback={selectedFeedback}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedFeedback(null);
          }}
        />
      )}
    </AdminPageTemplate>
  );
};

// Feedback Details Modal Component
const FeedbackDetailsModal = ({ feedback, onClose }) => {
  const getRatingStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <StarIcon
        key={i}
        className={'w-5 h-5 ' + (
          i < rating
            ? 'text-yellow-400 fill-current'
            : 'text-gray-300 dark:text-gray-600'
        )}
      />
    ));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Feedback Details</h2>
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
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Feedback Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Client</label>
                  <p className="text-gray-900 dark:text-white">{feedback.clientName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Project</label>
                  <p className="text-gray-900 dark:text-white">{feedback.projectName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Category</label>
                  <p className="text-gray-900 dark:text-white capitalize">{feedback.category.replace('_', ' ')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Source</label>
                  <p className="text-gray-900 dark:text-white capitalize">{feedback.source.replace('_', ' ')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Status</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    feedback.status === 'published' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                    feedback.status === 'pending_review' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {feedback.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Rating & Sentiment</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Rating</label>
                  <div className="flex items-center">
                    {getRatingStars(feedback.rating)}
                    <span className="ml-2 text-gray-900 dark:text-white">({feedback.rating}/5)</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Sentiment</label>
                  <span className={'inline-flex px-2 py-1 text-xs font-semibold rounded-full ' + (
                    feedback.sentiment === 'positive' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                    feedback.sentiment === 'negative' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  )}>
                    {feedback.sentiment}
                  </span>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Date</label>
                  <p className="text-gray-900 dark:text-white">
                    {new Date(feedback.date).toLocaleDateString()} at {new Date(feedback.date).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Feedback Content</h3>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">{feedback.title}</h4>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {feedback.content}
                </p>
              </div>
            </div>
            
            {feedback.tags && feedback.tags.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {feedback.tags.map((tag, index) => (
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
            
            {feedback.response && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Response</h3>
                <div className="bg-green-50 dark:bg-green-900 p-4 rounded-lg">
                  <p className="text-gray-700 dark:text-gray-300 mb-2">{feedback.response.text}</p>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <p>Responded by: {feedback.response.respondedBy}</p>
                    <p>Date: {new Date(feedback.response.date).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            )}
            
            {!feedback.response && feedback.status === 'pending_review' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add Response</h3>
                <div className="space-y-3">
                  <textarea
                    rows={4}
                    placeholder="Write your response to this feedback..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Send Response
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientsFeedback;