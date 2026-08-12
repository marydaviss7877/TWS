import React, { useState } from 'react';
import { 
  CalendarIcon, 
  CurrencyDollarIcon,
  UsersIcon,
  ClockIcon,
  EllipsisHorizontalIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import projectApiService from '../../services/projectApiService';
import { handleApiError, handleSuccess } from '../../utils/errorHandler';
import { PROJECT_STATUS, STATUS_COLORS, PROJECT_PRIORITY, PRIORITY_COLORS, SUCCESS_MESSAGES } from '../../constants/projectConstants';
import ConfirmDialog from '../../../../components/ConfirmDialog/ConfirmDialog';

const ProjectCard = ({ project, onUpdate }) => {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, onConfirm: null });

  const getStatusColor = (status) => {
    const statusColors = STATUS_COLORS[status];
    if (statusColors) {
      return `${statusColors.bg} ${statusColors.text}`;
    }
    return 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority) => {
    const priorityColors = PRIORITY_COLORS[priority];
    if (priorityColors) {
      return priorityColors.bg.replace('bg-', 'bg-').replace('-100', '-500');
    }
    return 'bg-gray-500';
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatDate = (date) => {
    if (!date) return 'No date set';
    return new Date(date).toLocaleDateString();
  };

  const handleDelete = () => {
    setConfirmDialog({
      isOpen: true,
      onConfirm: async () => {
        try {
          setIsDeleting(true);
          const response = await projectApiService.deleteProject(project._id);
          if (response.success) {
            handleSuccess(SUCCESS_MESSAGES.PROJECT_DELETED);
            onUpdate();
          } else {
            handleApiError(new Error(response.message || 'Failed to delete project'));
          }
        } catch (error) {
          handleApiError(error, 'Failed to delete project');
        } finally {
          setIsDeleting(false);
        }
      }
    });
  };

  const handleViewProject = () => {
    navigate(`/projects/${project._id}/board`);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {project.name}
          </h3>
          <p className="text-sm text-gray-600 line-clamp-2">
            {project.description || 'No description provided'}
          </p>
        </div>
        
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <EllipsisHorizontalIcon className="h-5 w-5" />
          </button>
          
          {showMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
              <div className="py-1">
                <button
                  onClick={() => {
                    handleViewProject();
                    setShowMenu(false);
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <EyeIcon className="h-4 w-4 mr-2" />
                  View Project
                </button>
                <button
                  onClick={() => {
                    // Handle edit
                    setShowMenu(false);
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <PencilIcon className="h-4 w-4 mr-2" />
                  Edit Project
                </button>
                <button
                  onClick={() => {
                    handleDelete();
                    setShowMenu(false);
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                >
                  <TrashIcon className="h-4 w-4 mr-2" />
                  Delete Project
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status and Priority */}
      <div className="flex items-center space-x-2 mb-4">
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(project.status)}`}>
          {project.status.charAt(0).toUpperCase() + project.status.slice(1).replace('_', ' ')}
        </span>
        {project.priority && project.priority !== 'medium' && (
          <div className={`w-3 h-3 rounded-full ${getPriorityColor(project.priority)}`} />
        )}
      </div>

      {/* Client Info */}
      <div className="mb-4">
        <div className="flex items-center text-sm text-gray-600">
          <UsersIcon className="h-4 w-4 mr-2" />
          <span>{project.clientId?.name || 'No client assigned'}</span>
        </div>
      </div>

      {/* Project Details */}
      <div className="space-y-2 mb-4">
        {project.timeline?.startDate && (
          <div className="flex items-center text-sm text-gray-600">
            <CalendarIcon className="h-4 w-4 mr-2" />
            <span>Start: {formatDate(project.timeline.startDate)}</span>
          </div>
        )}
        
        {project.timeline?.endDate && (
          <div className="flex items-center text-sm text-gray-600">
            <CalendarIcon className="h-4 w-4 mr-2" />
            <span>End: {formatDate(project.timeline.endDate)}</span>
          </div>
        )}
        
        {project.budget?.total > 0 && (
          <div className="flex items-center text-sm text-gray-600">
            <CurrencyDollarIcon className="h-4 w-4 mr-2" />
            <span>Budget: {formatCurrency(project.budget.total, project.budget.currency)}</span>
          </div>
        )}
        
        {project.timeline?.estimatedHours && (
          <div className="flex items-center text-sm text-gray-600">
            <ClockIcon className="h-4 w-4 mr-2" />
            <span>Est. Hours: {project.timeline.estimatedHours}h</span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {project.metrics?.completionRate !== undefined && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
            <span>Progress</span>
            <span>{Math.round(project.metrics.completionRate)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${project.metrics.completionRate}%` }}
            />
          </div>
        </div>
      )}

      {/* Tags */}
      {project.tags && project.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {project.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
            >
              {tag}
            </span>
          ))}
          {project.tags.length > 3 && (
            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
              +{project.tags.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={handleViewProject}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Open Project
      </button>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, onConfirm: null })}
        onConfirm={confirmDialog.onConfirm || (() => {})}
        title="Delete Project"
        message={`Are you sure you want to delete "${project.name}"? This action cannot be undone.`}
        confirmText={isDeleting ? 'Deleting...' : 'Delete'}
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default ProjectCard;
