import React, { useState, useEffect } from 'react';
import { 
  UserIcon,
  BriefcaseIcon,
  CalendarIcon,
  ClockIcon,
  StarIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentTextIcon,
  VideoCameraIcon,
  PhoneIcon,
  MapPinIcon,
  EnvelopeIcon,
  PhoneIcon as PhoneIconSolid,
  AcademicCapIcon,
  CurrencyDollarIcon,
  TagIcon,
  DocumentArrowDownIcon,
  SendIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  DocumentDuplicateIcon,
  ShareIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

const InterviewFormPortal = () => {
  const [activeView, setActiveView] = useState('interviews'); // interviews, forms, analytics
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('scheduledAt');
  const [formResponses, setFormResponses] = useState({});
  const [formNotes, setFormNotes] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');

  // Sample interview data
  const [interviews, setInterviews] = useState([
    {
      id: '1',
      candidate: {
        name: 'Alex Johnson',
        email: 'alex.johnson@email.com',
        phone: '+1 (555) 123-4567',
        position: 'Senior Full-Stack Developer',
        experience: '5 years',
        location: 'San Francisco, CA',
        resume: 'alex_johnson_resume.pdf',
        portfolio: 'https://alexjohnson.dev'
      },
      job: {
        id: '1',
        title: 'Senior Full-Stack Developer',
        department: 'Engineering',
        location: 'Remote',
        salaryRange: { min: 120000, max: 180000 }
      },
      interviewer: {
        name: 'Sarah Chen',
        role: 'Engineering Manager',
        email: 'sarah.chen@company.com'
      },
      scheduledAt: '2024-01-25T14:00:00Z',
      duration: 60,
      type: 'video',
      status: 'scheduled',
      formTemplate: {
        id: '1',
        title: 'Technical Interview Form',
        fields: [
          { type: 'rating', label: 'Technical Skills', required: true, maxRating: 5 },
          { type: 'rating', label: 'Problem Solving', required: true, maxRating: 5 },
          { type: 'rating', label: 'Communication', required: true, maxRating: 5 },
          { type: 'textarea', label: 'Technical Notes', required: false },
          { type: 'select', label: 'Recommendation', required: true, options: ['Strong Hire', 'Hire', 'No Hire', 'Strong No Hire'] }
        ]
      },
      responses: null,
      notes: '',
      createdAt: '2024-01-20T10:30:00Z',
      updatedAt: '2024-01-20T10:30:00Z'
    },
    {
      id: '2',
      candidate: {
        name: 'Maria Rodriguez',
        email: 'maria.rodriguez@email.com',
        phone: '+1 (555) 987-6543',
        position: 'UI/UX Designer',
        experience: '3 years',
        location: 'New York, NY',
        resume: 'maria_rodriguez_resume.pdf',
        portfolio: 'https://mariarodriguez.design'
      },
      job: {
        id: '2',
        title: 'UI/UX Designer',
        department: 'Design',
        location: 'Hybrid (NYC)',
        salaryRange: { min: 80000, max: 120000 }
      },
      interviewer: {
        name: 'David Kim',
        role: 'Design Director',
        email: 'david.kim@company.com'
      },
      scheduledAt: '2024-01-24T10:00:00Z',
      duration: 45,
      type: 'in-person',
      status: 'completed',
      formTemplate: {
        id: '2',
        title: 'Design Interview Form',
        fields: [
          { type: 'rating', label: 'Design Skills', required: true, maxRating: 5 },
          { type: 'rating', label: 'Creativity', required: true, maxRating: 5 },
          { type: 'rating', label: 'User Experience', required: true, maxRating: 5 },
          { type: 'textarea', label: 'Portfolio Review', required: false },
          { type: 'select', label: 'Recommendation', required: true, options: ['Strong Hire', 'Hire', 'No Hire', 'Strong No Hire'] }
        ]
      },
      responses: {
        'Technical Skills': 4,
        'Problem Solving': 5,
        'Communication': 4,
        'Technical Notes': 'Strong technical background, good problem-solving approach. Some areas for improvement in system design.',
        'Recommendation': 'Hire'
      },
      notes: 'Excellent candidate with strong technical skills. Would be a great addition to the team.',
      createdAt: '2024-01-18T14:15:00Z',
      updatedAt: '2024-01-24T11:00:00Z'
    },
    {
      id: '3',
      candidate: {
        name: 'James Wilson',
        email: 'james.wilson@email.com',
        phone: '+1 (555) 456-7890',
        position: 'Product Manager',
        experience: '7 years',
        location: 'Austin, TX',
        resume: 'james_wilson_resume.pdf',
        portfolio: 'https://jameswilson.pm'
      },
      job: {
        id: '3',
        title: 'Product Manager',
        department: 'Product',
        location: 'On-site (SF)',
        salaryRange: { min: 140000, max: 200000 }
      },
      interviewer: {
        name: 'Lisa Wang',
        role: 'VP of Product',
        email: 'lisa.wang@company.com'
      },
      scheduledAt: '2024-01-26T16:00:00Z',
      duration: 90,
      type: 'phone',
      status: 'scheduled',
      formTemplate: {
        id: '3',
        title: 'Product Manager Interview',
        fields: [
          { type: 'rating', label: 'Product Strategy', required: true, maxRating: 5 },
          { type: 'rating', label: 'Leadership', required: true, maxRating: 5 },
          { type: 'rating', label: 'Analytical Skills', required: true, maxRating: 5 },
          { type: 'textarea', label: 'Case Study Notes', required: false },
          { type: 'select', label: 'Recommendation', required: true, options: ['Strong Hire', 'Hire', 'No Hire', 'Strong No Hire'] }
        ]
      },
      responses: null,
      notes: '',
      createdAt: '2024-01-22T09:45:00Z',
      updatedAt: '2024-01-22T09:45:00Z'
    }
  ]);

  const [filteredInterviews, setFilteredInterviews] = useState(interviews);

  const statusOptions = [
    { value: 'all', label: 'All Interviews', count: interviews.length },
    { value: 'scheduled', label: 'Scheduled', count: interviews.filter(i => i.status === 'scheduled').length },
    { value: 'completed', label: 'Completed', count: interviews.filter(i => i.status === 'completed').length },
    { value: 'cancelled', label: 'Cancelled', count: interviews.filter(i => i.status === 'cancelled').length }
  ];

  useEffect(() => {
    let filtered = interviews;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(interview =>
        interview.candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        interview.job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        interview.interviewer.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(interview => interview.status === filterStatus);
    }

    // Sort interviews
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'candidateName':
          aValue = a.candidate.name.toLowerCase();
          bValue = b.candidate.name.toLowerCase();
          break;
        case 'jobTitle':
          aValue = a.job.title.toLowerCase();
          bValue = b.job.title.toLowerCase();
          break;
        case 'scheduledAt':
          aValue = new Date(a.scheduledAt);
          bValue = new Date(b.scheduledAt);
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          aValue = new Date(a.scheduledAt);
          bValue = new Date(b.scheduledAt);
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredInterviews(filtered);
  }, [interviews, searchTerm, filterStatus, sortBy, sortOrder]);

  const getStatusColor = (status) => {
    const colors = {
      scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
      completed: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
    };
    return colors[status] || colors.scheduled;
  };

  const getStatusIcon = (status) => {
    const icons = {
      scheduled: ClockIcon,
      completed: CheckCircleIcon,
      cancelled: XCircleIcon
    };
    return icons[status] || ClockIcon;
  };

  const getInterviewTypeIcon = (type) => {
    const icons = {
      video: VideoCameraIcon,
      phone: PhoneIcon,
      'in-person': MapPinIcon
    };
    return icons[type] || VideoCameraIcon;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatSalary = (salaryRange) => {
    if (salaryRange.min && salaryRange.max) {
      return `$${salaryRange.min.toLocaleString()} - $${salaryRange.max.toLocaleString()}`;
    }
    return 'Salary not specified';
  };

  const handleStartInterview = (interview) => {
    setSelectedInterview(interview);
    setFormResponses(interview.responses || {});
    setFormNotes(interview.notes || '');
    setShowFormModal(true);
  };

  const handleSaveForm = (interviewId, responses) => {
    setFormResponses(prev => ({
      ...prev,
      [interviewId]: responses
    }));
    
    // Update interview status
    setInterviews(prev => prev.map(interview =>
      interview.id === interviewId
        ? { ...interview, status: 'completed', responses, updatedAt: new Date().toISOString() }
        : interview
    ));
    
    setShowFormModal(false);
    setSelectedInterview(null);
  };

  const renderInterviewForm = (interview) => {
    if (!interview) return null;

    const handleFieldChange = (fieldLabel, value) => {
      setFormResponses(prev => ({
        ...prev,
        [fieldLabel]: value
      }));
    };

    const handleSubmit = () => {
      handleSaveForm(interview.id, formResponses);
    };

    return (
      <div className="space-y-6">
        {/* Candidate Info */}
        <div className="glass-card-premium p-6">
          <h3 className="text-lg font-bold font-heading text-gray-900 dark:text-white mb-4">
            Candidate Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <UserIcon className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{interview.candidate.name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{interview.candidate.position}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <EnvelopeIcon className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400">{interview.candidate.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <PhoneIconSolid className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400">{interview.candidate.phone}</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <BriefcaseIcon className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{interview.job.title}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{interview.job.department}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPinIcon className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400">{interview.candidate.location}</span>
              </div>
              <div className="flex items-center gap-3">
                <CurrencyDollarIcon className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400">{formatSalary(interview.job.salaryRange)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Interview Form */}
        <div className="glass-card-premium p-6">
          <h3 className="text-lg font-bold font-heading text-gray-900 dark:text-white mb-4">
            Interview Evaluation Form
          </h3>
          <form className="space-y-6">
            {interview.formTemplate.fields.map((field, index) => (
              <div key={index} className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                
                {field.type === 'rating' && (
                  <div className="flex gap-1">
                    {Array.from({ length: field.maxRating || 5 }, (_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleFieldChange(field.label, i + 1)}
                        className={`text-3xl transition-colors ${
                          formResponses[field.label] > i
                            ? 'text-yellow-400'
                            : 'text-gray-300 hover:text-yellow-400'
                        }`}
                      >
                        ★
                      </button>
                    ))}
                    <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                      {formResponses[field.label] || 0} / {field.maxRating || 5}
                    </span>
                  </div>
                )}

                {field.type === 'select' && (
                  <select
                    value={formResponses[field.label] || ''}
                    onChange={(e) => handleFieldChange(field.label, e.target.value)}
                    className="glass-input w-full"
                    required={field.required}
                  >
                    <option value="">Select an option</option>
                    {field.options.map((option, optionIndex) => (
                      <option key={optionIndex} value={option}>{option}</option>
                    ))}
                  </select>
                )}

                {field.type === 'textarea' && (
                  <textarea
                    value={formResponses[field.label] || ''}
                    onChange={(e) => handleFieldChange(field.label, e.target.value)}
                    className="glass-input w-full"
                    rows="4"
                    placeholder={field.placeholder || 'Enter your notes...'}
                    required={field.required}
                  />
                )}
              </div>
            ))}

            {/* Additional Notes */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Additional Notes
              </label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                className="glass-input w-full"
                rows="4"
                placeholder="Any additional observations or comments..."
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-6">
              <button
                type="button"
                onClick={handleSubmit}
                className="glass-button px-6 py-3 rounded-xl hover-scale flex items-center gap-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white font-medium"
              >
                <DocumentArrowDownIcon className="w-5 h-5" />
                Save Interview Results
              </button>
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                className="glass-button px-6 py-3 rounded-xl hover-scale"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderInterviewsList = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Scheduled', value: interviews.filter(i => i.status === 'scheduled').length, icon: ClockIcon, iconBg: 'bg-blue-50 dark:bg-blue-900/20', iconColor: 'text-blue-600 dark:text-blue-400' },
          { label: 'Completed', value: interviews.filter(i => i.status === 'completed').length, icon: CheckCircleIcon, iconBg: 'bg-green-50 dark:bg-green-900/20', iconColor: 'text-green-600 dark:text-green-400' },
          { label: 'This Week', value: interviews.filter(i => {
            const interviewDate = new Date(i.scheduledAt);
            const now = new Date();
            const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            return interviewDate >= now && interviewDate <= weekFromNow;
          }).length, icon: CalendarIcon, iconBg: 'bg-purple-50 dark:bg-purple-900/20', iconColor: 'text-purple-600 dark:text-purple-400' },
          { label: 'Total Interviews', value: interviews.length, icon: UserIcon, iconBg: 'bg-gray-100 dark:bg-gray-800', iconColor: 'text-gray-600 dark:text-gray-400' }
        ].map((stat, index) => (
          <div key={index} className="glass-card-premium p-6 hover-glow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl ${stat.iconBg} flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters and Search */}
      <div className="glass-card-premium p-6">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col lg:flex-row gap-4 flex-1">
            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search interviews..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="glass-input pl-10 w-full"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex gap-2">
              {statusOptions.map((status) => (
                <button
                  key={status.value}
                  onClick={() => setFilterStatus(status.value)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    filterStatus === status.value
                      ? 'bg-primary-500 text-white'
                      : 'glass-button hover-scale'
                  }`}
                >
                  {status.label} ({status.count})
                </button>
              ))}
            </div>

            {/* Sort Options */}
            <div className="flex items-center gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="glass-input text-sm"
              >
                <option value="scheduledAt">Scheduled Date</option>
                <option value="candidateName">Candidate Name</option>
                <option value="jobTitle">Job Title</option>
                <option value="status">Status</option>
              </select>
              
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="glass-button p-2"
              >
                {sortOrder === 'asc' ? (
                  <ChevronUpIcon className="w-4 h-4" />
                ) : (
                  <ChevronDownIcon className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Interviews List */}
      <div className="space-y-4">
        {filteredInterviews.map((interview) => (
          <div key={interview.id} className="glass-card-premium p-6 hover-glow group">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4 flex-1">
                <div className="w-12 h-12 rounded-xl bg-primary-600 flex items-center justify-center flex-shrink-0">
                  <UserIcon className="w-6 h-6 text-white" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                      {interview.candidate.name}
                    </h3>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(interview.status)}`}>
                      {interview.status.charAt(0).toUpperCase() + interview.status.slice(1)}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                    <div className="flex items-center gap-1">
                      <BriefcaseIcon className="w-4 h-4" />
                      <span>{interview.job.title}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="w-4 h-4" />
                      <span>{formatDate(interview.scheduledAt)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ClockIcon className="w-4 h-4" />
                      <span>{interview.duration} min</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {React.createElement(getInterviewTypeIcon(interview.type), { className: "w-4 h-4" })}
                      <span className="capitalize">{interview.type}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <span>Interviewer: {interview.interviewer.name}</span>
                    <span>Form: {interview.formTemplate.title}</span>
                    {interview.responses && (
                      <span className="text-green-600 dark:text-green-400">✓ Completed</span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {interview.status === 'scheduled' && (
                  <button
                    onClick={() => handleStartInterview(interview)}
                    className="glass-button px-4 py-2 rounded-xl hover-scale flex items-center gap-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white"
                  >
                    <EyeIcon className="w-4 h-4" />
                    Start Interview
                  </button>
                )}
                
                {interview.status === 'completed' && (
                  <button
                    onClick={() => {
                      setSelectedInterview(interview);
                      setShowFormModal(true);
                    }}
                    className="glass-button p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    title="View Results"
                  >
                    <EyeIcon className="w-4 h-4" />
                  </button>
                )}
                
                <button
                  className="glass-button p-2 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
                  title="Edit Interview"
                >
                  <PencilIcon className="w-4 h-4" />
                </button>
                
                <button
                  className="glass-button p-2 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20"
                  title="Share Results"
                >
                  <ShareIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredInterviews.length === 0 && (
        <div className="glass-card-premium p-12 text-center">
          <UserIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No interviews found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {searchTerm || filterStatus !== 'all'
              ? 'Try adjusting your search or filter criteria.'
              : 'No interviews scheduled yet.'}
          </p>
        </div>
      )}
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold font-heading text-gray-900 dark:text-white">
        Interview Analytics
      </h2>
      <div className="glass-card-premium p-6">
        <p className="text-gray-600 dark:text-gray-400">
          Analytics dashboard coming soon...
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="glass-card-premium p-2">
        <div className="flex gap-2">
          {[
            { id: 'interviews', label: 'Interviews', icon: UserIcon },
            { id: 'forms', label: 'Forms', icon: DocumentTextIcon },
            { id: 'analytics', label: 'Analytics', icon: ChartBarIcon }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                activeView === tab.id
                  ? 'bg-primary-500 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {activeView === 'interviews' && renderInterviewsList()}
      {activeView === 'analytics' && renderAnalytics()}

      {/* Interview Form Modal */}
      {showFormModal && selectedInterview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {selectedInterview.status === 'completed' ? 'Interview Results' : 'Interview Form'}
                </h2>
                <button
                  onClick={() => {
                    setShowFormModal(false);
                    setSelectedInterview(null);
                  }}
                  className="glass-button p-2"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-6">
              {renderInterviewForm(selectedInterview)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewFormPortal;
