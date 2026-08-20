import React, { useState, useEffect } from 'react';
import { 
  DocumentDuplicateIcon, 
  PlusIcon, 
  MagnifyingGlassIcon,
  RocketLaunchIcon,
  CodeBracketIcon,
  PaintBrushIcon,
  ShoppingCartIcon,
  DevicePhoneMobileIcon,
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  EyeIcon,
  PencilIcon
} from '@heroicons/react/24/outline';
import axiosInstance from '../../../shared/utils/axiosInstance';
import { handleApiError } from '../utils/errorHandler';

const Templates = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/api/projects/templates');
      if (response.data?.success && response.data?.data) {
        setTemplates(Array.isArray(response.data.data) ? response.data.data : []);
      }
    } catch (error) {
      handleApiError(error, 'Failed to load templates', { showToast: false });
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };


  const categories = [
    { id: 'all', name: 'All Templates', count: templates.length },
    { id: 'development', name: 'Development', count: templates.filter(t => t.category === 'development').length },
    { id: 'design', name: 'Design', count: templates.filter(t => t.category === 'design').length },
    { id: 'marketing', name: 'Marketing', count: templates.filter(t => t.category === 'marketing').length },
    { id: 'web', name: 'Web', count: templates.filter(t => t.category === 'web').length },
    { id: 'process', name: 'Process', count: templates.filter(t => t.category === 'process').length }
  ];

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || template.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const stats = {
    totalTemplates: templates.length,
    totalUsage: templates.reduce((acc, t) => acc + t.usageCount, 0),
    avgRating: (templates.reduce((acc, t) => acc + t.rating, 0) / templates.length).toFixed(1),
    avgDuration: '10 weeks'
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card-premium p-4 hover-glow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">Total Templates</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalTemplates}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-primary-600 flex items-center justify-center">
              <DocumentDuplicateIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        <div className="glass-card-premium p-4 hover-glow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">Total Usage</p>
              <p className="text-2xl font-bold text-green-600">{stats.totalUsage}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <RocketLaunchIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        <div className="glass-card-premium p-4 hover-glow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">Avg Rating</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.avgRating}★</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center">
              <CheckCircleIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        <div className="glass-card-premium p-4 hover-glow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">Avg Duration</p>
              <p className="text-2xl font-bold text-accent-600">{stats.avgDuration}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-500 to-pink-600 flex items-center justify-center">
              <ClockIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Categories Filter */}
      <div className="glass-card-premium p-4">
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setFilterCategory(category.id)}
              className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all hover-scale ${
                filterCategory === category.id
                  ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white'
                  : 'glass-button text-gray-700 dark:text-gray-300'
              }`}
            >
              {category.name}
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                filterCategory === category.id
                  ? 'bg-white/30'
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}>
                {category.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Search & Actions */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 glass-input"
          />
        </div>
        <button className="glass-button px-4 py-2 rounded-xl hover-scale bg-gradient-to-r from-primary-500 to-accent-500 text-white font-semibold">
          <PlusIcon className="w-5 h-5 inline mr-2" />
          Create Custom Template
        </button>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredTemplates.map((template) => {
          const Icon = template.icon;
          return (
            <div key={template.id} className="glass-card-premium hover-glow">
              {/* Header */}
              <div className={`p-6 bg-gradient-to-r ${template.color} rounded-t-2xl`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{template.name}</h3>
                      <p className="text-sm text-white/90 capitalize">{template.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-white/20 px-3 py-1 rounded-lg">
                    <span className="text-white font-bold">{template.rating}</span>
                    <span className="text-white">★</span>
                  </div>
                </div>
                <p className="text-sm text-white/90">{template.description}</p>
              </div>

              {/* Body */}
              <div className="p-6">
                {/* Stats */}
                <div className="grid grid-cols-4 gap-3 mb-6">
                  <div className="glass-card p-3 text-center">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Tasks</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{template.tasks}</p>
                  </div>
                  <div className="glass-card p-3 text-center">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Milestones</p>
                    <p className="text-lg font-bold text-blue-600">{template.milestones}</p>
                  </div>
                  <div className="glass-card p-3 text-center">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Duration</p>
                    <p className="text-sm font-bold text-accent-600">{template.estimatedDuration.split(' ')[0]}w</p>
                  </div>
                  <div className="glass-card p-3 text-center">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Used</p>
                    <p className="text-lg font-bold text-green-600">{template.usageCount}</p>
                  </div>
                </div>

                {/* Phases */}
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Project Phases</h4>
                  <div className="flex flex-wrap gap-2">
                    {template.phases.map((phase, idx) => (
                      <span
                        key={phase}
                        className="px-3 py-1 glass-card text-xs font-medium text-gray-900 dark:text-white"
                      >
                        {idx + 1}. {phase}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Features */}
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Included Features</h4>
                  <div className="space-y-2">
                    {template.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <CheckCircleIcon className="w-4 h-4 text-green-600 flex-shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button className="flex-1 glass-button px-4 py-3 rounded-xl hover-scale bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold">
                    <RocketLaunchIcon className="w-4 h-4 inline mr-2" />
                    Use Template
                  </button>
                  <button className="glass-button px-4 py-3 rounded-xl hover-scale text-gray-700 dark:text-gray-300 font-semibold">
                    <EyeIcon className="w-4 h-4 inline mr-2" />
                    Preview
                  </button>
                  <button className="glass-button px-4 py-3 rounded-xl hover-scale text-gray-700 dark:text-gray-300">
                    <PencilIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="glass-card-premium p-12 text-center">
          <DocumentDuplicateIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            No templates found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Try adjusting your search or create a custom template
          </p>
        </div>
      )}
    </div>
  );
};

export default Templates;