import React, { useState, useEffect } from 'react';
import { formTemplatesAPI } from '@/shared/services/business/form-management.service';
import { 
  PlusIcon, 
  DocumentDuplicateIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  StarIcon,
  TagIcon,
  CalendarIcon,
  UserIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  FolderIcon,
  DocumentTextIcon,
  PlayIcon,
  ShareIcon
} from '@heroicons/react/24/outline';

const FormTemplateManager = ({ onSelectTemplate, onEditTemplate, onDeleteTemplate, onDuplicateTemplate }) => {
  const [templates, setTemplates] = useState([]);
  const [filteredTemplates, setFilteredTemplates] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('updatedAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [viewMode, setViewMode] = useState('grid'); // grid or list

  // Sample templates data - in real app, this would come from API
  const sampleTemplates = [
    {
      id: '1',
      title: 'Software Developer Job Posting',
      description: 'Comprehensive form for software developer positions including technical skills, experience, and cultural fit assessment.',
      category: 'job_posting',
      tags: ['engineering', 'technical', 'full-time'],
      fields: [
        { type: 'text', label: 'Job Title', required: true },
        { type: 'select', label: 'Department', required: true, options: ['Engineering', 'Product', 'Design'] },
        { type: 'multiselect', label: 'Required Skills', required: true, options: ['JavaScript', 'React', 'Node.js', 'Python'] },
        { type: 'textarea', label: 'Job Description', required: true },
        { type: 'rating', label: 'Experience Level', required: true, maxRating: 5 }
      ],
      usageCount: 45,
      isFavorite: true,
      createdBy: 'John Smith',
      createdAt: '2024-01-15T10:30:00Z',
      updatedAt: '2024-01-20T14:45:00Z',
      version: 2
    },
    {
      id: '2',
      title: 'Marketing Manager Interview',
      description: 'Structured interview form for marketing manager candidates with behavioral and technical questions.',
      category: 'interview_form',
      tags: ['marketing', 'management', 'interview'],
      fields: [
        { type: 'text', label: 'Candidate Name', required: true },
        { type: 'select', label: 'Interview Round', required: true, options: ['Phone Screen', 'Technical', 'Final'] },
        { type: 'rating', label: 'Communication Skills', required: true, maxRating: 5 },
        { type: 'rating', label: 'Leadership Skills', required: true, maxRating: 5 },
        { type: 'textarea', label: 'Interview Notes', required: false }
      ],
      usageCount: 23,
      isFavorite: false,
      createdBy: 'Sarah Johnson',
      createdAt: '2024-01-10T09:15:00Z',
      updatedAt: '2024-01-18T16:20:00Z',
      version: 1
    },
    {
      id: '3',
      title: 'Employee Performance Review',
      description: 'Quarterly performance review form with goals, achievements, and development areas.',
      category: 'evaluation_form',
      tags: ['performance', 'review', 'quarterly'],
      fields: [
        { type: 'text', label: 'Employee Name', required: true },
        { type: 'select', label: 'Review Period', required: true, options: ['Q1', 'Q2', 'Q3', 'Q4'] },
        { type: 'rating', label: 'Goal Achievement', required: true, maxRating: 5 },
        { type: 'rating', label: 'Team Collaboration', required: true, maxRating: 5 },
        { type: 'textarea', label: 'Strengths', required: true },
        { type: 'textarea', label: 'Areas for Improvement', required: true }
      ],
      usageCount: 67,
      isFavorite: true,
      createdBy: 'Mike Chen',
      createdAt: '2024-01-05T11:00:00Z',
      updatedAt: '2024-01-22T13:30:00Z',
      version: 3
    },
    {
      id: '4',
      title: 'Client Feedback Survey',
      description: 'Post-project client feedback form to measure satisfaction and gather improvement suggestions.',
      category: 'feedback_form',
      tags: ['client', 'feedback', 'satisfaction'],
      fields: [
        { type: 'text', label: 'Client Name', required: true },
        { type: 'text', label: 'Project Name', required: true },
        { type: 'rating', label: 'Overall Satisfaction', required: true, maxRating: 5 },
        { type: 'rating', label: 'Communication Quality', required: true, maxRating: 5 },
        { type: 'rating', label: 'Deliverable Quality', required: true, maxRating: 5 },
        { type: 'textarea', label: 'Additional Comments', required: false }
      ],
      usageCount: 34,
      isFavorite: false,
      createdBy: 'Lisa Wang',
      createdAt: '2024-01-12T15:45:00Z',
      updatedAt: '2024-01-19T10:15:00Z',
      version: 1
    },
    {
      id: '5',
      title: 'Internship Application',
      description: 'Application form for internship positions with academic background and interest areas.',
      category: 'job_posting',
      tags: ['internship', 'entry-level', 'students'],
      fields: [
        { type: 'text', label: 'Full Name', required: true },
        { type: 'email', label: 'Email Address', required: true },
        { type: 'text', label: 'University', required: true },
        { type: 'select', label: 'Major', required: true, options: ['Computer Science', 'Business', 'Design', 'Marketing'] },
        { type: 'select', label: 'Graduation Year', required: true, options: ['2024', '2025', '2026', '2027'] },
        { type: 'multiselect', label: 'Interest Areas', required: true, options: ['Frontend Development', 'Backend Development', 'Data Science', 'UI/UX Design'] },
        { type: 'textarea', label: 'Why are you interested in this internship?', required: true }
      ],
      usageCount: 89,
      isFavorite: true,
      createdBy: 'Alex Rodriguez',
      createdAt: '2024-01-08T12:30:00Z',
      updatedAt: '2024-01-21T09:45:00Z',
      version: 2
    }
  ];

  const categories = [
    { value: 'all', label: 'All Templates', count: sampleTemplates.length },
    { value: 'job_posting', label: 'Job Postings', count: sampleTemplates.filter(t => t.category === 'job_posting').length },
    { value: 'interview_form', label: 'Interview Forms', count: sampleTemplates.filter(t => t.category === 'interview_form').length },
    { value: 'evaluation_form', label: 'Evaluations', count: sampleTemplates.filter(t => t.category === 'evaluation_form').length },
    { value: 'feedback_form', label: 'Feedback Forms', count: sampleTemplates.filter(t => t.category === 'feedback_form').length }
  ];

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await formTemplatesAPI.getAll();
      setTemplates(response.data);
      setFilteredTemplates(response.data);
    } catch (error) {
      console.error('Error loading templates:', error);
      // Fallback to sample data
      setTemplates(sampleTemplates);
      setFilteredTemplates(sampleTemplates);
    }
  };

  useEffect(() => {
    let filtered = templates;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(template =>
        template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(template => template.category === selectedCategory);
    }

    // Sort templates
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
        case 'updatedAt':
          aValue = new Date(a.updatedAt);
          bValue = new Date(b.updatedAt);
          break;
        case 'usageCount':
          aValue = a.usageCount;
          bValue = b.usageCount;
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

    setFilteredTemplates(filtered);
  }, [templates, searchTerm, selectedCategory, sortBy, sortOrder]);

  const handleToggleFavorite = (templateId) => {
    setTemplates(prev => prev.map(template =>
      template.id === templateId
        ? { ...template, isFavorite: !template.isFavorite }
        : template
    ));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getCategoryColor = (category) => {
    const colors = {
      job_posting: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
      interview_form: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
      evaluation_form: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
      feedback_form: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300'
    };
    return colors[category] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
  };

  const renderGridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredTemplates.map((template) => (
        <div key={template.id} className="glass-card-premium p-6 hover-glow group">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center flex-shrink-0">
                <DocumentTextIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                  {template.title}
                </h3>
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(template.category)}`}>
                  {categories.find(c => c.value === template.category)?.label}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleToggleFavorite(template.id)}
                className={`p-1 rounded-lg transition-colors ${
                  template.isFavorite 
                    ? 'text-yellow-500 hover:text-yellow-600' 
                    : 'text-gray-400 hover:text-yellow-500'
                }`}
              >
                <StarIcon className={`w-4 h-4 ${template.isFavorite ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
            {template.description}
          </p>

          <div className="flex flex-wrap gap-1 mb-4">
            {template.tags.slice(0, 3).map((tag, index) => (
              <span key={index} className="inline-block px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs rounded-md">
                #{tag}
              </span>
            ))}
            {template.tags.length > 3 && (
              <span className="inline-block px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs rounded-md">
                +{template.tags.length - 3}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-4">
            <div className="flex items-center gap-1">
              <UserIcon className="w-3 h-3" />
              <span>{template.createdBy?.fullName || template.createdBy?.name || template.createdBy?.email || 'Unknown'}</span>
            </div>
            <div className="flex items-center gap-1">
              <CalendarIcon className="w-3 h-3" />
              <span>{formatDate(template.updatedAt)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span>{template.fields.length} fields</span>
              <span>{template.usageCount} uses</span>
            </div>
            
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onSelectTemplate(template)}
                className="glass-button p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                title="Use Template"
              >
                <PlayIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => onEditTemplate(template)}
                className="glass-button p-2 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
                title="Edit Template"
              >
                <PencilIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDuplicateTemplate(template)}
                className="glass-button p-2 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20"
                title="Duplicate Template"
              >
                <DocumentDuplicateIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderListView = () => (
    <div className="space-y-4">
      {filteredTemplates.map((template) => (
        <div key={template.id} className="glass-card-premium p-6 hover-glow group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <div className="w-12 h-12 rounded-xl bg-primary-600 flex items-center justify-center flex-shrink-0">
                <DocumentTextIcon className="w-6 h-6 text-white" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors truncate">
                    {template.title}
                  </h3>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(template.category)}`}>
                    {categories.find(c => c.value === template.category)?.label}
                  </span>
                  {template.isFavorite && (
                    <StarIcon className="w-4 h-4 text-yellow-500 fill-current" />
                  )}
                </div>
                
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-1">
                  {template.description}
                </p>
                
                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                  <span>{template.fields.length} fields</span>
                  <span>{template.usageCount} uses</span>
                  <span>v{template.version}</span>
                  <span>Updated {formatDate(template.updatedAt)}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleToggleFavorite(template.id)}
                className={`p-2 rounded-lg transition-colors ${
                  template.isFavorite 
                    ? 'text-yellow-500 hover:text-yellow-600' 
                    : 'text-gray-400 hover:text-yellow-500'
                }`}
              >
                <StarIcon className={`w-4 h-4 ${template.isFavorite ? 'fill-current' : ''}`} />
              </button>
              
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onSelectTemplate(template)}
                  className="glass-button p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  title="Use Template"
                >
                  <PlayIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onEditTemplate(template)}
                  className="glass-button p-2 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
                  title="Edit Template"
                >
                  <PencilIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDuplicateTemplate(template)}
                  className="glass-button p-2 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20"
                  title="Duplicate Template"
                >
                  <DocumentDuplicateIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDeleteTemplate(template.id)}
                  className="glass-button p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                  title="Delete Template"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-heading text-gray-900 dark:text-white">
            Form Templates
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage and organize your form templates
          </p>
        </div>
        <button className="glass-button px-4 py-2 rounded-xl hover-scale flex items-center gap-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white">
          <PlusIcon className="w-5 h-5" />
          Create New Template
        </button>
      </div>

      {/* Filters and Search */}
      <div className="glass-card-premium p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="glass-input pl-10 w-full"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex gap-2">
            {categories.map((category) => (
              <button
                key={category.value}
                onClick={() => setSelectedCategory(category.value)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  selectedCategory === category.value
                    ? 'bg-primary-500 text-white'
                    : 'glass-button hover-scale'
                }`}
              >
                {category.label} ({category.count})
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
              <option value="createdAt">Date Created</option>
              <option value="title">Title</option>
              <option value="usageCount">Most Used</option>
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

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-primary-500 text-white' : 'glass-button'
              }`}
            >
              <div className="w-4 h-4 grid grid-cols-2 gap-0.5">
                <div className="bg-current rounded-sm"></div>
                <div className="bg-current rounded-sm"></div>
                <div className="bg-current rounded-sm"></div>
                <div className="bg-current rounded-sm"></div>
              </div>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-primary-500 text-white' : 'glass-button'
              }`}
            >
              <div className="w-4 h-4 flex flex-col gap-0.5">
                <div className="bg-current rounded-sm h-1"></div>
                <div className="bg-current rounded-sm h-1"></div>
                <div className="bg-current rounded-sm h-1"></div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Templates List */}
      {filteredTemplates.length === 0 ? (
        <div className="glass-card-premium p-12 text-center">
          <FolderIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No templates found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {searchTerm || selectedCategory !== 'all'
              ? 'Try adjusting your search or filter criteria.'
              : 'Create your first form template to get started.'}
          </p>
          <button className="glass-button px-6 py-3 rounded-xl hover-scale flex items-center gap-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white mx-auto">
            <PlusIcon className="w-5 h-5" />
            Create New Template
          </button>
        </div>
      ) : (
        viewMode === 'grid' ? renderGridView() : renderListView()
      )}
    </div>
  );
};

export default FormTemplateManager;
