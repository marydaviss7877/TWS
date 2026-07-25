import React, { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  BriefcaseIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ShareIcon,
  DocumentDuplicateIcon,
  PlayIcon,
  PauseIcon,
  CheckCircleIcon,
  ClockIcon,
  UsersIcon,
  CalendarIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  TagIcon,
  FilterIcon,
  MagnifyingGlassIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  DocumentTextIcon,
  LinkIcon
} from '@heroicons/react/24/outline';
import FormBuilder from './FormBuilder';
import FormTemplateManager from './FormTemplateManager';

const JobPostingSystem = () => {
  const [activeView, setActiveView] = useState('dashboard'); // dashboard, builder, templates, analytics
  const [selectedJob, setSelectedJob] = useState(null);
  const [showFormBuilder, setShowFormBuilder] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('updatedAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Sample job postings data
  const [jobPostings, setJobPostings] = useState([
    {
      id: '1',
      title: 'Senior Full-Stack Developer',
      department: 'Engineering',
      location: 'Remote',
      employmentType: 'Full-time',
      experienceLevel: 'Senior',
      salaryRange: { min: 120000, max: 180000 },
      status: 'active',
      applicants: 23,
      views: 156,
      formTemplate: {
        id: '1',
        title: 'Software Developer Job Posting',
        fields: 8
      },
      postedBy: 'John Smith',
      postedAt: '2024-01-15T10:30:00Z',
      updatedAt: '2024-01-20T14:45:00Z',
      expiresAt: '2024-02-15T10:30:00Z',
      tags: ['javascript', 'react', 'nodejs', 'remote']
    },
    {
      id: '2',
      title: 'UI/UX Designer',
      department: 'Design',
      location: 'Hybrid (NYC)',
      employmentType: 'Full-time',
      experienceLevel: 'Mid',
      salaryRange: { min: 80000, max: 120000 },
      status: 'active',
      applicants: 18,
      views: 98,
      formTemplate: {
        id: '2',
        title: 'Designer Job Posting',
        fields: 6
      },
      postedBy: 'Sarah Johnson',
      postedAt: '2024-01-10T09:15:00Z',
      updatedAt: '2024-01-18T16:20:00Z',
      expiresAt: '2024-02-10T09:15:00Z',
      tags: ['design', 'ui', 'ux', 'figma']
    },
    {
      id: '3',
      title: 'Product Manager',
      department: 'Product',
      location: 'On-site (SF)',
      employmentType: 'Full-time',
      experienceLevel: 'Senior',
      salaryRange: { min: 140000, max: 200000 },
      status: 'draft',
      applicants: 0,
      views: 0,
      formTemplate: {
        id: '3',
        title: 'Product Manager Job Posting',
        fields: 10
      },
      postedBy: 'Mike Chen',
      postedAt: '2024-01-12T15:45:00Z',
      updatedAt: '2024-01-19T10:15:00Z',
      expiresAt: null,
      tags: ['product', 'management', 'strategy']
    },
    {
      id: '4',
      title: 'Marketing Intern',
      department: 'Marketing',
      location: 'Hybrid',
      employmentType: 'Internship',
      experienceLevel: 'Entry',
      salaryRange: { min: 20, max: 25 },
      status: 'paused',
      applicants: 45,
      views: 234,
      formTemplate: {
        id: '4',
        title: 'Internship Application',
        fields: 7
      },
      postedBy: 'Lisa Wang',
      postedAt: '2024-01-08T12:30:00Z',
      updatedAt: '2024-01-21T09:45:00Z',
      expiresAt: '2024-02-08T12:30:00Z',
      tags: ['internship', 'marketing', 'entry-level']
    }
  ]);

  const [filteredJobs, setFilteredJobs] = useState(jobPostings);

  const statusOptions = [
    { value: 'all', label: 'All Jobs', count: jobPostings.length },
    { value: 'active', label: 'Active', count: jobPostings.filter(j => j.status === 'active').length },
    { value: 'draft', label: 'Draft', count: jobPostings.filter(j => j.status === 'draft').length },
    { value: 'paused', label: 'Paused', count: jobPostings.filter(j => j.status === 'paused').length },
    { value: 'expired', label: 'Expired', count: jobPostings.filter(j => j.status === 'expired').length }
  ];

  useEffect(() => {
    let filtered = jobPostings;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(job =>
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(job => job.status === filterStatus);
    }

    // Sort jobs
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'applicants':
          aValue = a.applicants;
          bValue = b.applicants;
          break;
        case 'views':
          aValue = a.views;
          bValue = b.views;
          break;
        case 'postedAt':
          aValue = new Date(a.postedAt);
          bValue = new Date(b.postedAt);
          break;
        case 'updatedAt':
          aValue = new Date(a.updatedAt);
          bValue = new Date(b.updatedAt);
          break;
        default:
          aValue = new Date(a.updatedAt);
          bValue = new Date(b.updatedAt);
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredJobs(filtered);
  }, [jobPostings, searchTerm, filterStatus, sortBy, sortOrder]);

  const handleCreateJob = () => {
    setShowFormBuilder(true);
    setActiveView('builder');
  };

  const handleSelectTemplate = (template) => {
    setShowFormBuilder(true);
    setActiveView('builder');
    // In real app, would load template into form builder
  };

  const handleEditTemplate = (template) => {
    setShowTemplateManager(true);
    setActiveView('templates');
  };

  const handleDuplicateTemplate = (template) => {
    // In real app, would duplicate template
    console.log('Duplicate template:', template);
  };

  const handleDeleteTemplate = (templateId) => {
    // In real app, would delete template
    console.log('Delete template:', templateId);
  };

  const handleSaveForm = (formData) => {
    // In real app, would save form and create job posting
    console.log('Save form:', formData);
    setShowFormBuilder(false);
    setActiveView('dashboard');
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300',
      paused: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
      expired: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
    };
    return colors[status] || colors.draft;
  };

  const getStatusIcon = (status) => {
    const icons = {
      active: CheckCircleIcon,
      draft: DocumentTextIcon,
      paused: PauseIcon,
      expired: ClockIcon
    };
    return icons[status] || DocumentTextIcon;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatSalary = (salaryRange) => {
    if (salaryRange.min && salaryRange.max) {
      return `$${salaryRange.min.toLocaleString()} - $${salaryRange.max.toLocaleString()}`;
    }
    return 'Salary not specified';
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Active Jobs', value: jobPostings.filter(j => j.status === 'active').length, icon: BriefcaseIcon, iconBg: 'bg-green-50 dark:bg-green-900/20', iconColor: 'text-green-600 dark:text-green-400' },
          { label: 'Total Applicants', value: jobPostings.reduce((sum, job) => sum + job.applicants, 0), icon: UsersIcon, iconBg: 'bg-blue-50 dark:bg-blue-900/20', iconColor: 'text-blue-600 dark:text-blue-400' },
          { label: 'Total Views', value: jobPostings.reduce((sum, job) => sum + job.views, 0), icon: EyeIcon, iconBg: 'bg-purple-50 dark:bg-purple-900/20', iconColor: 'text-purple-600 dark:text-purple-400' },
          { label: 'Draft Jobs', value: jobPostings.filter(j => j.status === 'draft').length, icon: DocumentTextIcon, iconBg: 'bg-gray-100 dark:bg-gray-800', iconColor: 'text-gray-600 dark:text-gray-400' }
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

      {/* Filters and Actions */}
      <div className="glass-card-premium p-6">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col lg:flex-row gap-4 flex-1">
            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search job postings..."
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
                <option value="updatedAt">Last Updated</option>
                <option value="postedAt">Date Posted</option>
                <option value="title">Title</option>
                <option value="applicants">Most Applicants</option>
                <option value="views">Most Views</option>
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

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => setShowTemplateManager(true)}
              className="glass-button px-4 py-2 rounded-xl hover-scale flex items-center gap-2"
            >
              <DocumentTextIcon className="w-5 h-5" />
              Templates
            </button>
            <button
              onClick={handleCreateJob}
              className="glass-button px-4 py-2 rounded-xl hover-scale flex items-center gap-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white"
            >
              <PlusIcon className="w-5 h-5" />
              Post New Job
            </button>
          </div>
        </div>
      </div>

      {/* Job Postings List */}
      <div className="space-y-4">
        {filteredJobs.map((job) => (
          <div key={job.id} className="glass-card-premium p-6 hover-glow group">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4 flex-1">
                <div className="w-12 h-12 rounded-xl bg-primary-600 flex items-center justify-center flex-shrink-0">
                  <BriefcaseIcon className="w-6 h-6 text-white" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                      {job.title}
                    </h3>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                      {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                    <div className="flex items-center gap-1">
                      <MapPinIcon className="w-4 h-4" />
                      <span>{job.location}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <UsersIcon className="w-4 h-4" />
                      <span>{job.department}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CurrencyDollarIcon className="w-4 h-4" />
                      <span>{formatSalary(job.salaryRange)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="w-4 h-4" />
                      <span>Posted {formatDate(job.postedAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <span>{job.applicants} applicants</span>
                    <span>{job.views} views</span>
                    <span>Form: {job.formTemplate.title}</span>
                  </div>

                  <div className="flex flex-wrap gap-1 mt-3">
                    {job.tags.slice(0, 4).map((tag, index) => (
                      <span key={index} className="inline-block px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs rounded-md">
                        #{tag}
                      </span>
                    ))}
                    {job.tags.length > 4 && (
                      <span className="inline-block px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs rounded-md">
                        +{job.tags.length - 4}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setSelectedJob(job)}
                  className="glass-button p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  title="View Details"
                >
                  <EyeIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setSelectedJob(job);
                    setShowFormBuilder(true);
                    setActiveView('builder');
                  }}
                  className="glass-button p-2 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
                  title="Edit Job"
                >
                  <PencilIcon className="w-4 h-4" />
                </button>
                <button
                  className="glass-button p-2 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20"
                  title="Share Job"
                >
                  <ShareIcon className="w-4 h-4" />
                </button>
                <button
                  className="glass-button p-2 text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                  title="View Analytics"
                >
                  <ChartBarIcon className="w-4 h-4" />
                </button>
                <button
                  className="glass-button p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                  title="Delete Job"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredJobs.length === 0 && (
        <div className="glass-card-premium p-12 text-center">
          <BriefcaseIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No job postings found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {searchTerm || filterStatus !== 'all'
              ? 'Try adjusting your search or filter criteria.'
              : 'Create your first job posting to get started.'}
          </p>
          <button
            onClick={handleCreateJob}
            className="glass-button px-6 py-3 rounded-xl hover-scale flex items-center gap-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white mx-auto"
          >
            <PlusIcon className="w-5 h-5" />
            Post New Job
          </button>
        </div>
      )}
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold font-heading text-gray-900 dark:text-white">
        Job Posting Analytics
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
            { id: 'dashboard', label: 'Dashboard', icon: BriefcaseIcon },
            { id: 'builder', label: 'Form Builder', icon: Cog6ToothIcon },
            { id: 'templates', label: 'Templates', icon: DocumentTextIcon },
            { id: 'analytics', label: 'Analytics', icon: ChartBarIcon }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveView(tab.id);
                if (tab.id === 'builder') setShowFormBuilder(true);
                if (tab.id === 'templates') setShowTemplateManager(true);
              }}
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
      {activeView === 'dashboard' && renderDashboard()}
      {activeView === 'analytics' && renderAnalytics()}
      
      {/* Form Builder Modal */}
      {showFormBuilder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {selectedJob ? 'Edit Job Posting' : 'Create New Job Posting'}
                </h2>
                <button
                  onClick={() => {
                    setShowFormBuilder(false);
                    setSelectedJob(null);
                    setActiveView('dashboard');
                  }}
                  className="glass-button p-2"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-6">
              <FormBuilder
                onSave={handleSaveForm}
                onPreview={() => {}}
                initialForm={selectedJob ? {
                  id: selectedJob.id,
                  title: selectedJob.title,
                  description: '',
                  category: 'job_posting',
                  fields: [],
                  settings: {
                    allowMultipleSubmissions: false,
                    requireAuthentication: true,
                    showProgressBar: true,
                    autoSave: true
                  },
                  metadata: {
                    createdBy: selectedJob.postedBy,
                    createdAt: selectedJob.postedAt,
                    version: 1,
                    tags: selectedJob.tags
                  }
                } : null}
              />
            </div>
          </div>
        </div>
      )}

      {/* Template Manager Modal */}
      {showTemplateManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Form Templates
                </h2>
                <button
                  onClick={() => {
                    setShowTemplateManager(false);
                    setActiveView('dashboard');
                  }}
                  className="glass-button p-2"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-6">
              <FormTemplateManager
                onSelectTemplate={handleSelectTemplate}
                onEditTemplate={handleEditTemplate}
                onDuplicateTemplate={handleDuplicateTemplate}
                onDeleteTemplate={handleDeleteTemplate}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobPostingSystem;
