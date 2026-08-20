import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CalendarIcon, 
  CurrencyDollarIcon,
  UsersIcon,
  ClockIcon,
  EyeIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import { PROJECT_STATUS, STATUS_COLORS, PROJECT_PRIORITY } from '../constants/projectConstants';
import { formatDate } from '../utils/dateUtils';

const ProjectCard = ({ project, tenantSlug }) => {
  const navigate = useNavigate();

  const getStatusColor = (status) => {
    const statusColors = STATUS_COLORS[status];
    if (statusColors) {
      return `${statusColors.bg} ${statusColors.text}`;
    }
    return 'bg-gray-100 text-gray-800';
  };

  const formatCurrency = (amount, currency = 'USD') => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleViewProject = () => {
    if (tenantSlug) {
      navigate(`/${tenantSlug}/org/projects/${project.slug || project._id || project.id}/board`);
    }
  };

  return (
    <div className="glass-card-premium p-6 hover-glow transition-all">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            {project.name || project.title || 'Unnamed Project'}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
            {project.description || 'No description provided'}
          </p>
        </div>
      </div>

      {/* Status and Priority */}
      <div className="flex items-center space-x-2 mb-4">
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(project.status || PROJECT_STATUS.PLANNING)}`}>
          {(project.status || PROJECT_STATUS.PLANNING).charAt(0).toUpperCase() + (project.status || PROJECT_STATUS.PLANNING).slice(1).replace('_', ' ')}
        </span>
        {project.priority && project.priority !== PROJECT_PRIORITY.MEDIUM && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {project.priority.toUpperCase()} Priority
          </span>
        )}
      </div>

      {/* Client Info */}
      {(project.clientId?.name || project.client) && (
        <div className="mb-4">
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <UsersIcon className="h-4 w-4 mr-2" />
            <span>{project.clientId?.name || project.client}</span>
          </div>
        </div>
      )}

      {/* Project Details */}
      <div className="space-y-2 mb-4">
        {project.timeline?.startDate && (
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <CalendarIcon className="h-4 w-4 mr-2" />
            <span>Start: {formatDate(project.timeline.startDate)}</span>
          </div>
        )}
        
        {project.timeline?.endDate && (
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <CalendarIcon className="h-4 w-4 mr-2" />
            <span>End: {formatDate(project.timeline.endDate)}</span>
          </div>
        )}
        
        {project.budget?.total > 0 && (
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <CurrencyDollarIcon className="h-4 w-4 mr-2" />
            <span>Budget: {formatCurrency(project.budget.total, project.budget.currency)}</span>
          </div>
        )}
        
        {project.timeline?.estimatedHours && (
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <ClockIcon className="h-4 w-4 mr-2" />
            <span>Est. Hours: {project.timeline.estimatedHours}h</span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {project.metrics?.completionRate !== undefined && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
            <span>Progress</span>
            <span>{Math.round(project.metrics.completionRate)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${project.metrics.completionRate}%` }}
            />
          </div>
        </div>
      )}

      {/* Tags */}
      {project.tags && project.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {project.tags.slice(0, 3).map((tag, index) => (
            <span
              key={index}
              className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded"
            >
              {tag}
            </span>
          ))}
          {project.tags.length > 3 && (
            <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded">
              +{project.tags.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={handleViewProject}
        className="w-full glass-button px-4 py-2 rounded-xl hover-scale flex items-center justify-center gap-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white"
      >
        <EyeIcon className="w-5 h-5" />
        <span>View Project</span>
        <ArrowRightIcon className="w-4 h-4" />
      </button>
    </div>
  );
};

export default ProjectCard;

