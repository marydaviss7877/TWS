import React, { useState, useEffect } from 'react';
import { 
  ChartBarIcon,
  DocumentTextIcon,
  UsersIcon,
  EyeIcon,
  PencilIcon,
  ArrowDownTrayIcon,
  FilterIcon,
  CalendarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  StarIcon,
  ChartBarSquareIcon,
  ChartPieIcon,
  TableCellsIcon,
  ShareIcon,
  PrinterIcon,
  MagnifyingGlassIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  TagIcon,
  UserIcon,
  BriefcaseIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  AcademicCapIcon,
  PhoneIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';

const ResponseDashboard = () => {
  const [activeView, setActiveView] = useState('overview'); // overview, responses, analytics, exports
  const [selectedForm, setSelectedForm] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDateRange, setFilterDateRange] = useState('30d');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('submittedAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Sample form responses data
  const [formResponses, setFormResponses] = useState([
    {
      id: '1',
      formId: '1',
      formTitle: 'Software Developer Job Posting',
      candidate: {
        name: 'Alex Johnson',
        email: 'alex.johnson@email.com',
        phone: '+1 (555) 123-4567',
        experience: '5 years',
        location: 'San Francisco, CA'
      },
      job: {
        title: 'Senior Full-Stack Developer',
        department: 'Engineering',
        location: 'Remote',
        salaryRange: { min: 120000, max: 180000 }
      },
      responses: {
        'Job Title': 'Senior Full-Stack Developer',
        'Department': 'Engineering',
        'Employment Type': 'Full-time',
        'Experience Level': 'Senior Level',
        'Location': 'San Francisco, CA',
        'Work Arrangement': 'Remote',
        'Required Skills': ['JavaScript', 'React', 'Node.js', 'Python'],
        'Preferred Skills': ['TypeScript', 'GraphQL', 'AWS'],
        'Job Description': 'We are looking for a senior full-stack developer to join our engineering team...',
        'Key Responsibilities': 'Lead development of web applications, mentor junior developers, collaborate with product team...',
        'Qualifications': '5+ years of experience in full-stack development, strong knowledge of modern JavaScript frameworks...'
      },
      status: 'submitted',
      submittedAt: '2024-01-22T14:30:00Z',
      reviewedBy: null,
      reviewedAt: null,
      score: null,
      notes: ''
    },
    {
      id: '2',
      formId: '1',
      formTitle: 'Software Developer Job Posting',
      candidate: {
        name: 'Sarah Chen',
        email: 'sarah.chen@email.com',
        phone: '+1 (555) 987-6543',
        experience: '3 years',
        location: 'New York, NY'
      },
      job: {
        title: 'Senior Full-Stack Developer',
        department: 'Engineering',
        location: 'Remote',
        salaryRange: { min: 120000, max: 180000 }
      },
      responses: {
        'Job Title': 'Senior Full-Stack Developer',
        'Department': 'Engineering',
        'Employment Type': 'Full-time',
        'Experience Level': 'Mid Level',
        'Location': 'New York, NY',
        'Work Arrangement': 'Hybrid',
        'Required Skills': ['JavaScript', 'React', 'Node.js'],
        'Preferred Skills': ['TypeScript', 'Docker'],
        'Job Description': 'Experienced developer seeking senior role...',
        'Key Responsibilities': 'Develop scalable web applications, work with cross-functional teams...',
        'Qualifications': '3+ years of experience, Bachelor\'s degree in Computer Science...'
      },
      status: 'under_review',
      submittedAt: '2024-01-21T10:15:00Z',
      reviewedBy: 'John Smith',
      reviewedAt: '2024-01-21T16:45:00Z',
      score: 8.5,
      notes: 'Strong technical background, good communication skills. Consider for next round.'
    },
    {
      id: '3',
      formId: '2',
      formTitle: 'UI/UX Designer Job Posting',
      candidate: {
        name: 'Maria Rodriguez',
        email: 'maria.rodriguez@email.com',
        phone: '+1 (555) 456-7890',
        experience: '4 years',
        location: 'Austin, TX'
      },
      job: {
        title: 'UI/UX Designer',
        department: 'Design',
        location: 'Hybrid (NYC)',
        salaryRange: { min: 80000, max: 120000 }
      },
      responses: {
        'Job Title': 'UI/UX Designer',
        'Department': 'Design',
        'Employment Type': 'Full-time',
        'Experience Level': 'Mid Level',
        'Location': 'Austin, TX',
        'Work Arrangement': 'Hybrid',
        'Required Skills': ['Figma', 'Adobe Creative Suite', 'User Research'],
        'Preferred Skills': ['Prototyping', 'Design Systems'],
        'Job Description': 'Creative designer with passion for user-centered design...',
        'Key Responsibilities': 'Design user interfaces, conduct user research, collaborate with development team...',
        'Qualifications': '4+ years of UI/UX design experience, portfolio demonstrating design skills...'
      },
      status: 'accepted',
      submittedAt: '2024-01-20T09:30:00Z',
      reviewedBy: 'David Kim',
      reviewedAt: '2024-01-20T14:20:00Z',
      score: 9.2,
      notes: 'Excellent portfolio, strong design thinking. Perfect fit for the role.'
    },
    {
      id: '4',
      formId: '3',
      formTitle: 'Product Manager Interview',
      candidate: {
        name: 'James Wilson',
        email: 'james.wilson@email.com',
        phone: '+1 (555) 321-9876',
        experience: '7 years',
        location: 'Seattle, WA'
      },
      job: {
        title: 'Product Manager',
        department: 'Product',
        location: 'On-site (SF)',
        salaryRange: { min: 140000, max: 200000 }
      },
      responses: {
        'Candidate Name': 'James Wilson',
        'Interview Round': 'Technical',
        'Communication Skills': 5,
        'Leadership Skills': 4,
        'Interview Notes': 'Strong product vision, excellent communication. Demonstrated deep understanding of user needs and market dynamics.'
      },
      status: 'rejected',
      submittedAt: '2024-01-19T16:00:00Z',
      reviewedBy: 'Lisa Wang',
      reviewedAt: '2024-01-19T17:30:00Z',
      score: 6.8,
      notes: 'Good candidate but not the right fit for our current needs. Consider for future opportunities.'
    }
  ]);

  const [filteredResponses, setFilteredResponses] = useState(formResponses);

  const statusOptions = [
    { value: 'all', label: 'All Responses', count: formResponses.length },
    { value: 'submitted', label: 'Submitted', count: formResponses.filter(r => r.status === 'submitted').length },
    { value: 'under_review', label: 'Under Review', count: formResponses.filter(r => r.status === 'under_review').length },
    { value: 'accepted', label: 'Accepted', count: formResponses.filter(r => r.status === 'accepted').length },
    { value: 'rejected', label: 'Rejected', count: formResponses.filter(r => r.status === 'rejected').length }
  ];

  const dateRangeOptions = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: '1y', label: 'Last year' },
    { value: 'all', label: 'All time' }
  ];

  useEffect(() => {
    let filtered = formResponses;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(response =>
        response.candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        response.candidate.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        response.job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        response.formTitle.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(response => response.status === filterStatus);
    }

    // Filter by date range
    if (filterDateRange !== 'all') {
      const now = new Date();
      const days = filterDateRange === '7d' ? 7 : filterDateRange === '30d' ? 30 : filterDateRange === '90d' ? 90 : 365;
      const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(response => new Date(response.submittedAt) >= cutoffDate);
    }

    // Sort responses
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
        case 'submittedAt':
          aValue = new Date(a.submittedAt);
          bValue = new Date(b.submittedAt);
          break;
        case 'score':
          aValue = a.score || 0;
          bValue = b.score || 0;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          aValue = new Date(a.submittedAt);
          bValue = new Date(b.submittedAt);
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredResponses(filtered);
  }, [formResponses, searchTerm, filterStatus, filterDateRange, sortBy, sortOrder]);

  const getStatusColor = (status) => {
    const colors = {
      submitted: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
      under_review: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
      accepted: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
    };
    return colors[status] || colors.submitted;
  };

  const getStatusIcon = (status) => {
    const icons = {
      submitted: ClockIcon,
      under_review: EyeIcon,
      accepted: CheckCircleIcon,
      rejected: XCircleIcon
    };
    return icons[status] || ClockIcon;
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

  const calculateAnalytics = () => {
    const total = formResponses.length;
    const accepted = formResponses.filter(r => r.status === 'accepted').length;
    const rejected = formResponses.filter(r => r.status === 'rejected').length;
    const underReview = formResponses.filter(r => r.status === 'under_review').length;
    const submitted = formResponses.filter(r => r.status === 'submitted').length;
    
    const avgScore = formResponses
      .filter(r => r.score !== null)
      .reduce((sum, r) => sum + r.score, 0) / formResponses.filter(r => r.score !== null).length || 0;

    const responseRate = total > 0 ? ((accepted + rejected) / total) * 100 : 0;
    const acceptanceRate = (accepted + rejected) > 0 ? (accepted / (accepted + rejected)) * 100 : 0;

    return {
      total,
      accepted,
      rejected,
      underReview,
      submitted,
      avgScore: avgScore.toFixed(1),
      responseRate: responseRate.toFixed(1),
      acceptanceRate: acceptanceRate.toFixed(1)
    };
  };

  const analytics = calculateAnalytics();

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Responses', value: analytics.total, icon: DocumentTextIcon, iconBg: 'bg-blue-50 dark:bg-blue-900/20', iconColor: 'text-blue-600 dark:text-blue-400', trend: '+12%' },
          { label: 'Acceptance Rate', value: `${analytics.acceptanceRate}%`, icon: CheckCircleIcon, iconBg: 'bg-green-50 dark:bg-green-900/20', iconColor: 'text-green-600 dark:text-green-400', trend: '+5%' },
          { label: 'Avg Score', value: analytics.avgScore, icon: StarIcon, iconBg: 'bg-purple-50 dark:bg-purple-900/20', iconColor: 'text-purple-600 dark:text-purple-400', trend: '+0.3' },
          { label: 'Response Rate', value: `${analytics.responseRate}%`, icon: ArrowTrendingUpIcon, iconBg: 'bg-orange-50 dark:bg-orange-900/20', iconColor: 'text-orange-600 dark:text-orange-400', trend: '+8%' }
        ].map((metric, index) => (
          <div key={index} className="glass-card-premium p-6 hover-glow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{metric.label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{metric.value}</p>
                <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 mt-1">
                  <ArrowTrendingUpIcon className="w-3 h-3" />
                  {metric.trend}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-xl ${metric.iconBg} flex items-center justify-center`}>
                <metric.icon className={`w-6 h-6 ${metric.iconColor}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card-premium p-6">
          <h3 className="text-lg font-bold font-heading text-gray-900 dark:text-white mb-4">
            Response Status Distribution
          </h3>
          <div className="space-y-4">
            {[
              { status: 'submitted', count: analytics.submitted, color: 'blue' },
              { status: 'under_review', count: analytics.underReview, color: 'yellow' },
              { status: 'accepted', count: analytics.accepted, color: 'green' },
              { status: 'rejected', count: analytics.rejected, color: 'red' }
            ].map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full bg-${item.color}-500`}></div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                    {item.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className={`bg-${item.color}-500 h-2 rounded-full`}
                      style={{ width: `${analytics.total > 0 ? (item.count / analytics.total) * 100 : 0}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white w-8 text-right">
                    {item.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card-premium p-6">
          <h3 className="text-lg font-bold font-heading text-gray-900 dark:text-white mb-4">
            Recent Activity
          </h3>
          <div className="space-y-4">
            {formResponses.slice(0, 5).map((response, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full bg-${getStatusColor(response.status).includes('green') ? 'green' : getStatusColor(response.status).includes('red') ? 'red' : getStatusColor(response.status).includes('yellow') ? 'yellow' : 'blue'}-500`}></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {response.candidate.name}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                    {response.job.title}
                  </p>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDate(response.submittedAt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderResponsesList = () => (
    <div className="space-y-6">
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
                  placeholder="Search responses..."
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

            {/* Date Range Filter */}
            <select
              value={filterDateRange}
              onChange={(e) => setFilterDateRange(e.target.value)}
              className="glass-input text-sm"
            >
              {dateRangeOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>

            {/* Sort Options */}
            <div className="flex items-center gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="glass-input text-sm"
              >
                <option value="submittedAt">Submitted Date</option>
                <option value="candidateName">Candidate Name</option>
                <option value="jobTitle">Job Title</option>
                <option value="score">Score</option>
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

          {/* Export Actions */}
          <div className="flex gap-3">
            <button className="glass-button px-4 py-2 rounded-xl hover-scale flex items-center gap-2">
              <ArrowDownTrayIcon className="w-5 h-5" />
              Export
            </button>
            <button className="glass-button px-4 py-2 rounded-xl hover-scale flex items-center gap-2">
              <ShareIcon className="w-5 h-5" />
              Share
            </button>
          </div>
        </div>
      </div>

      {/* Responses List */}
      <div className="space-y-4">
        {filteredResponses.map((response) => (
          <div key={response.id} className="glass-card-premium p-6 hover-glow group">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4 flex-1">
                <div className="w-12 h-12 rounded-xl bg-primary-600 flex items-center justify-center flex-shrink-0">
                  <UserIcon className="w-6 h-6 text-white" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                      {response.candidate.name}
                    </h3>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(response.status)}`}>
                      {response.status.replace('_', ' ').charAt(0).toUpperCase() + response.status.replace('_', ' ').slice(1)}
                    </span>
                    {response.score && (
                      <span className="inline-block px-2 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300 text-xs rounded-full">
                        Score: {response.score}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                    <div className="flex items-center gap-1">
                      <BriefcaseIcon className="w-4 h-4" />
                      <span>{response.job.title}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPinIcon className="w-4 h-4" />
                      <span>{response.candidate.location}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <AcademicCapIcon className="w-4 h-4" />
                      <span>{response.candidate.experience}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="w-4 h-4" />
                      <span>Submitted {formatDate(response.submittedAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <span>Form: {response.formTitle}</span>
                    {response.reviewedBy && (
                      <span>Reviewed by: {response.reviewedBy}</span>
                    )}
                    {response.reviewedAt && (
                      <span>Reviewed: {formatDate(response.reviewedAt)}</span>
                    )}
                  </div>

                  {response.notes && (
                    <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        <strong>Notes:</strong> {response.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setSelectedForm(response)}
                  className="glass-button p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  title="View Details"
                >
                  <EyeIcon className="w-4 h-4" />
                </button>
                <button
                  className="glass-button p-2 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
                  title="Edit Response"
                >
                  <PencilIcon className="w-4 h-4" />
                </button>
                <button
                  className="glass-button p-2 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20"
                  title="Download Resume"
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                </button>
                <button
                  className="glass-button p-2 text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                  title="Share Response"
                >
                  <ShareIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredResponses.length === 0 && (
        <div className="glass-card-premium p-12 text-center">
          <DocumentTextIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No responses found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {searchTerm || filterStatus !== 'all' || filterDateRange !== 'all'
              ? 'Try adjusting your search or filter criteria.'
              : 'No form responses yet.'}
          </p>
        </div>
      )}
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold font-heading text-gray-900 dark:text-white">
        Advanced Analytics
      </h2>
      <div className="glass-card-premium p-6">
        <p className="text-gray-600 dark:text-gray-400">
          Advanced analytics dashboard coming soon...
        </p>
      </div>
    </div>
  );

  const renderExports = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold font-heading text-gray-900 dark:text-white">
        Export & Reports
      </h2>
      <div className="glass-card-premium p-6">
        <p className="text-gray-600 dark:text-gray-400">
          Export and reporting features coming soon...
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
            { id: 'overview', label: 'Overview', icon: ChartBarIcon },
            { id: 'responses', label: 'Responses', icon: DocumentTextIcon },
            { id: 'analytics', label: 'Analytics', icon: ChartBarSquareIcon },
            { id: 'exports', label: 'Exports', icon: ArrowDownTrayIcon }
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
      {activeView === 'overview' && renderOverview()}
      {activeView === 'responses' && renderResponsesList()}
      {activeView === 'analytics' && renderAnalytics()}
      {activeView === 'exports' && renderExports()}

      {/* Response Detail Modal */}
      {selectedForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Response Details
                </h2>
                <button
                  onClick={() => setSelectedForm(null)}
                  className="glass-button p-2"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-6">
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
                          <p className="font-medium text-gray-900 dark:text-white">{selectedForm.candidate.name}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{selectedForm.candidate.experience}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <EnvelopeIcon className="w-5 h-5 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">{selectedForm.candidate.email}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <PhoneIcon className="w-5 h-5 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">{selectedForm.candidate.phone}</span>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <BriefcaseIcon className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{selectedForm.job.title}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{selectedForm.job.department}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <MapPinIcon className="w-5 h-5 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">{selectedForm.candidate.location}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <CurrencyDollarIcon className="w-5 h-5 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">{formatSalary(selectedForm.job.salaryRange)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form Responses */}
                <div className="glass-card-premium p-6">
                  <h3 className="text-lg font-bold font-heading text-gray-900 dark:text-white mb-4">
                    Form Responses
                  </h3>
                  <div className="space-y-4">
                    {Object.entries(selectedForm.responses).map(([key, value], index) => (
                      <div key={index} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-b-0">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">{key}</h4>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {Array.isArray(value) ? (
                            <div className="flex flex-wrap gap-1">
                              {value.map((item, itemIndex) => (
                                <span key={itemIndex} className="inline-block px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs rounded-md">
                                  {item}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p>{value}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResponseDashboard;
