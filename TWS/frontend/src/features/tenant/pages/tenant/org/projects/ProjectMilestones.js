import React, { useState, useEffect } from 'react';
import { 
  FlagIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  CalendarIcon,
  LinkIcon,
  ChartBarIcon,
  FolderIcon
} from '@heroicons/react/24/outline';
import tenantProjectApiService from './services/tenantProjectApiService';
import tenantApiService from '../../../../../../shared/services/tenant/tenant-api.service';
import { MILESTONE_STATUS } from './constants/projectConstants';
import { ApprovalProgress, ApprovalChainSetup } from './components/approvals';
import { showSuccess, showError } from './utils/toastNotifications';
import { useTenantSlug } from '../../../../../../shared/hooks/useTenantSlug';

const ProjectMilestones = () => {
  const tenantSlug = useTenantSlug();
  const [viewMode, setViewMode] = useState('timeline'); // 'timeline' or 'list'
  const [loading, setLoading] = useState(true);
  const [milestones, setMilestones] = useState([]);
  const [selectedMilestone, setSelectedMilestone] = useState(null);
  const [showApprovalChain, setShowApprovalChain] = useState(false);
  const [showApprovalProgress, setShowApprovalProgress] = useState(null);

  useEffect(() => {
    if (tenantSlug) {
      fetchMilestones();
    }
  }, [tenantSlug]);

  const fetchMilestones = async () => {
    try {
      setLoading(true);
      const data = await tenantProjectApiService.getProjectMilestones(tenantSlug);
      setMilestones(Array.isArray(data) ? data : (data.milestones || []));
    } catch (err) {
      console.error('Error fetching milestones:', err);
      setMilestones([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case MILESTONE_STATUS.COMPLETED:
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-500';
      case MILESTONE_STATUS.IN_PROGRESS:
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-500';
      case MILESTONE_STATUS.AT_RISK:
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-500';
      case MILESTONE_STATUS.DELAYED:
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-500';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-500';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case MILESTONE_STATUS.COMPLETED:
        return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
      case MILESTONE_STATUS.IN_PROGRESS:
        return <ClockIcon className="w-5 h-5 text-blue-600" />;
      case MILESTONE_STATUS.AT_RISK:
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />;
      case MILESTONE_STATUS.DELAYED:
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />;
      default:
        return <FlagIcon className="w-5 h-5 text-gray-600" />;
    }
  };

  const calculateProgress = (milestone) => {
    if (milestone.status === MILESTONE_STATUS.COMPLETED) return 100;
    if (milestone.status === MILESTONE_STATUS.PENDING) return 0;
    
    if (milestone.tasks) {
      const { total = 0, completed = 0 } = milestone.tasks;
      if (total > 0) {
        return Math.round((completed / total) * 100);
      }
    }
    
    return milestone.progress || 0;
  };

  const handleDeleteMilestone = async (milestoneId) => {
    if (!window.confirm('Are you sure you want to delete this milestone? This action cannot be undone.')) {
      return;
    }
    try {
      await tenantApiService.deleteMilestone(tenantSlug, milestoneId);
      showSuccess('Milestone deleted successfully!');
      fetchMilestones();
    } catch (error) {
      console.error('Error deleting milestone:', error);
      showError(error.message || 'Failed to delete milestone. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading milestones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl xl:text-3xl font-bold font-heading text-gray-900 dark:text-white">
            Project Milestones
          </h1>
          <p className="text-sm xl:text-base text-gray-600 dark:text-gray-300 mt-1">
            Track project milestones and deliverables
          </p>
        </div>
        <button className="glass-button px-4 py-2 rounded-xl hover-scale flex items-center gap-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white">
          <PlusIcon className="w-5 h-5" />
          <span className="font-medium">Create Milestone</span>
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('timeline')}
            className={`glass-button px-4 py-2 rounded-xl hover-scale ${
              viewMode === 'timeline' ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white' : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            <ChartBarIcon className="w-5 h-5 inline mr-2" />
            Timeline View
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`glass-button px-4 py-2 rounded-xl hover-scale ${
              viewMode === 'list' ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white' : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            <FlagIcon className="w-5 h-5 inline mr-2" />
            List View
          </button>
        </div>
      </div>

      {/* Timeline View */}
      {viewMode === 'timeline' && (
        <div className="glass-card-premium p-6">
          <h3 className="text-lg font-bold font-heading text-gray-900 dark:text-white mb-6">
            Project Timeline
          </h3>
          <div className="space-y-6">
            {milestones.length > 0 ? (
              milestones.map((milestone, index) => {
                const progress = calculateProgress(milestone);
                return (
                  <div key={milestone._id || milestone.id} className="relative">
                    {/* Connection Line */}
                    {index < milestones.length - 1 && (
                      <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gray-300 dark:bg-gray-700"></div>
                    )}
                    
                    <div className="flex gap-4">
                      {/* Timeline Marker */}
                      <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center border-4 ${getStatusColor(milestone.status)} bg-white dark:bg-gray-900`}>
                        {getStatusIcon(milestone.status)}
                      </div>

                      {/* Milestone Card */}
                      <div className="flex-1 glass-card p-6 hover-glow">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                              {milestone.title || milestone.name}
                            </h4>
                            {milestone.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                {milestone.description}
                              </p>
                            )}
                            {(milestone.projectId?.name || milestone.project) && (
                              <p className="text-xs text-gray-500 dark:text-gray-500">
                                Project: {milestone.projectId?.name || milestone.project}
                              </p>
                            )}
                          </div>
                          <span className={`px-3 py-1 rounded-lg text-xs font-semibold border ${getStatusColor(milestone.status)}`}>
                            {(milestone.status || MILESTONE_STATUS.PENDING).replace('_', ' ')}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-4">
                          <div className="flex items-center justify-between text-xs mb-2">
                            <span className="text-gray-600 dark:text-gray-400">Progress</span>
                            <span className="font-bold text-gray-900 dark:text-white">{progress}%</span>
                          </div>
                          <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                milestone.status === MILESTONE_STATUS.COMPLETED ? 'bg-green-500' :
                                milestone.status === MILESTONE_STATUS.IN_PROGRESS ? 'bg-blue-500' :
                                'bg-gray-400'
                              }`}
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Tasks Summary */}
                        {milestone.tasks && (
                          <div className="grid grid-cols-3 gap-4 mb-4">
                            <div className="glass-card p-3">
                              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Tasks</p>
                              <p className="text-lg font-bold text-gray-900 dark:text-white">{milestone.tasks.total || 0}</p>
                            </div>
                            <div className="glass-card p-3">
                              <p className="text-xs text-green-600 dark:text-green-400 mb-1">Completed</p>
                              <p className="text-lg font-bold text-green-600">{milestone.tasks.completed || 0}</p>
                            </div>
                            <div className="glass-card p-3">
                              <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Remaining</p>
                              <p className="text-lg font-bold text-blue-600">{(milestone.tasks.total || 0) - (milestone.tasks.completed || 0)}</p>
                            </div>
                          </div>
                        )}

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                          {milestone.ownerId || milestone.owner && (
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-bold">
                                {(milestone.owner?.name || milestone.ownerId?.name || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-xs text-gray-600 dark:text-gray-400">Owner</p>
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {milestone.owner?.name || milestone.ownerId?.name || 'Unassigned'}
                                </p>
                              </div>
                            </div>
                          )}
                          {milestone.dueDate && (
                            <div className="text-right">
                              <p className="text-xs text-gray-600 dark:text-gray-400">Due Date</p>
                              <p className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1">
                                <CalendarIcon className="w-4 h-4" />
                                {new Date(milestone.dueDate).toLocaleDateString()}
                              </p>
                            </div>
                          )}
                          {milestone.dependencies && milestone.dependencies.length > 0 && (
                            <div className="text-right">
                              <p className="text-xs text-gray-600 dark:text-gray-400">Dependencies</p>
                              <p className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1">
                                <LinkIcon className="w-4 h-4" />
                                {milestone.dependencies.length}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Nucleus Project OS - Approval Workflow */}
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex items-center justify-between">
                            <button
                              onClick={() => setShowApprovalProgress(milestone._id || milestone.id)}
                              className="px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-md"
                            >
                              View Approval Progress
                            </button>
                            <button
                              onClick={() => {
                                setSelectedMilestone(milestone);
                                setShowApprovalChain(true);
                              }}
                              className="px-3 py-1.5 text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-md"
                            >
                              Setup Approval Chain
                            </button>
                          </div>
                          {showApprovalProgress === (milestone._id || milestone.id) && (
                            <div className="mt-4">
                              <ApprovalProgress
                                deliverableId={milestone._id || milestone.id}
                                onApprovalChange={fetchMilestones}
                              />
                              <button
                                onClick={() => setShowApprovalProgress(null)}
                                className="mt-2 text-xs text-gray-500 hover:text-gray-700"
                              >
                                Close
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12">
                <FlagIcon className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 mb-2">No milestones found</p>
                <p className="text-sm text-gray-500 dark:text-gray-500">Create your first milestone to track project progress</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="glass-card-premium p-6">
          <h3 className="text-lg font-bold font-heading text-gray-900 dark:text-white mb-6">
            All Milestones ({milestones.length})
          </h3>
          <div className="space-y-4">
            {milestones.length > 0 ? (
              milestones.map((milestone) => {
                const progress = calculateProgress(milestone);
                return (
                  <div key={milestone._id || milestone.id} className="glass-card p-4 hover-glow">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-4 flex-1">
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 ${getStatusColor(milestone.status)} bg-white dark:bg-gray-900`}>
                          {getStatusIcon(milestone.status)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                              {milestone.title || milestone.name}
                            </h4>
                            <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${getStatusColor(milestone.status)}`}>
                              {(milestone.status || MILESTONE_STATUS.PENDING).replace('_', ' ')}
                            </span>
                          </div>
                          {milestone.description && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                              {milestone.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                            {(milestone.projectId?.name || milestone.project) && (
                              <span className="inline-flex items-center gap-1">
                                <FolderIcon className="w-3.5 h-3.5" />
                                {milestone.projectId?.name || milestone.project}
                              </span>
                            )}
                            {milestone.dueDate && (
                              <span className="inline-flex items-center gap-1">
                                <CalendarIcon className="w-3.5 h-3.5" />
                                {new Date(milestone.dueDate).toLocaleDateString()}
                              </span>
                            )}
                            {milestone.tasks && (
                              <span className="inline-flex items-center gap-1">
                                <CheckCircleIcon className="w-3.5 h-3.5" />
                                {milestone.tasks.completed || 0}/{milestone.tasks.total || 0} tasks
                              </span>
                            )}
                            {(milestone.ownerId || milestone.owner) && (
                              <div className="flex items-center gap-1">
                                <div className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-bold">
                                  {(milestone.owner?.name || milestone.ownerId?.name || 'U').charAt(0).toUpperCase()}
                                </div>
                                <span>{milestone.owner?.name || milestone.ownerId?.name || 'Unassigned'}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">{progress}%</p>
                        <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              milestone.status === MILESTONE_STATUS.COMPLETED ? 'bg-green-500' :
                              milestone.status === MILESTONE_STATUS.IN_PROGRESS ? 'bg-blue-500' :
                              'bg-gray-400'
                            }`}
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12">
                <FlagIcon className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 mb-2">No milestones found</p>
                <p className="text-sm text-gray-500 dark:text-gray-500">Create your first milestone to track project progress</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Approval Chain Setup Modal */}
      {showApprovalChain && selectedMilestone && (
        <ApprovalChainSetup
          isOpen={showApprovalChain}
          onClose={() => {
            setShowApprovalChain(false);
            setSelectedMilestone(null);
          }}
          deliverableId={selectedMilestone._id || selectedMilestone.id}
          onChainCreated={() => {
            fetchMilestones();
            setShowApprovalChain(false);
            setSelectedMilestone(null);
          }}
        />
      )}
    </div>
  );
};

export default ProjectMilestones;
