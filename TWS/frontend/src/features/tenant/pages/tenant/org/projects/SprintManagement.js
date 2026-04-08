import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  PlusIcon, 
  PlayIcon, 
  StopIcon,
  CalendarIcon,
  UserGroupIcon,
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';
import tenantProjectApiService from './services/tenantProjectApiService';
import tenantApiService from '../../../../../../shared/services/tenant/tenant-api.service';
import { SPRINT_STATUS } from './constants/projectConstants';
import CreateSprintModal from './components/CreateSprintModal';
import { showSuccess, showError } from './utils/toastNotifications';

const SprintManagement = () => {
  const { tenantSlug } = useParams();
  const [sprints, setSprints] = useState([]);
  const [activeSprint, setActiveSprint] = useState(null);
  const [selectedSprint, setSelectedSprint] = useState(null);
  const [showSprintDetails, setShowSprintDetails] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tenantSlug) {
      fetchSprints();
    }
  }, [tenantSlug]);

  const fetchSprints = async () => {
    try {
      setLoading(true);
      const data = await tenantProjectApiService.getProjectSprints(tenantSlug);
      
      let sprintsList = [];
      if (Array.isArray(data)) {
        sprintsList = data;
      } else if (data?.sprints) {
        sprintsList = data.sprints;
      } else if (data?.data) {
        sprintsList = Array.isArray(data.data) ? data.data : (data.data.sprints || []);
      } else {
        sprintsList = [];
      }

      setSprints(sprintsList);

      // Find active sprint
      const active = sprintsList.find(sprint => sprint.status === SPRINT_STATUS.ACTIVE);
      setActiveSprint(active || null);
    } catch (err) {
      console.error('Error fetching sprints:', err);
      setSprints([]);
      setActiveSprint(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case SPRINT_STATUS.COMPLETED:
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300';
      case SPRINT_STATUS.ACTIVE:
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300';
      case SPRINT_STATUS.PLANNING:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300';
      case SPRINT_STATUS.CANCELLED:
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case SPRINT_STATUS.COMPLETED:
        return <CheckCircleIcon className="w-4 h-4" />;
      case SPRINT_STATUS.ACTIVE:
        return <PlayIcon className="w-4 h-4" />;
      case SPRINT_STATUS.PLANNING:
        return <CalendarIcon className="w-4 h-4" />;
      case SPRINT_STATUS.CANCELLED:
        return <ExclamationTriangleIcon className="w-4 h-4" />;
      default:
        return <CalendarIcon className="w-4 h-4" />;
    }
  };

  const calculateProgress = (sprint) => {
    if (sprint.status === SPRINT_STATUS.COMPLETED) return 100;
    if (sprint.status === SPRINT_STATUS.PLANNING) return 0;
    
    if (sprint.startDate && sprint.endDate) {
      const now = new Date();
      const startDate = new Date(sprint.startDate);
      const endDate = new Date(sprint.endDate);
      const totalDuration = endDate - startDate;
      const elapsed = now - startDate;
      
      return Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100);
    }
    
    return 0;
  };

  const calculateCompletionRate = (sprint) => {
    if (sprint.capacity?.committedStoryPoints === 0 || !sprint.capacity?.committedStoryPoints) return 0;
    return (sprint.capacity.completedStoryPoints / sprint.capacity.committedStoryPoints) * 100;
  };

  const handleCalculateVelocity = async (sprintId) => {
    try {
      await tenantApiService.calculateSprintVelocity(tenantSlug, sprintId);
      showSuccess('Velocity calculated successfully!');
      fetchSprints();
    } catch (error) {
      console.error('Error calculating velocity:', error);
      showError(error.message || 'Failed to calculate velocity. Please try again.');
    }
  };

  const handleSprintCreated = () => {
    fetchSprints();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading sprints...</p>
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
            Sprint Management
          </h1>
          <p className="text-sm xl:text-base text-gray-600 dark:text-gray-300 mt-1">
            Manage your Agile sprints and track team velocity
          </p>
        </div>
        <button
         
          onClick={() => setShowCreateModal(true)}
          className="glass-button px-4 py-2 rounded-xl hover-scale flex items-center gap-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white"
        >
          <PlusIcon className="w-5 h-5" />
          <span className="font-medium">Create Sprint</span>
        </button>
      </div>

      {/* Active Sprint Overview */}
      {activeSprint && (
        <div className="glass-card-premium p-6 hover-glow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <PlayIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Active Sprint</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {activeSprint.name || `Sprint ${activeSprint.sprintNumber || ''}`}
                </p>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${getStatusColor(activeSprint.status)}`}>
              {activeSprint.status?.toUpperCase() || 'ACTIVE'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <ChartBarIcon className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Velocity</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {activeSprint.metrics?.velocity || 0}
              </p>
            </div>
            
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircleIcon className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {activeSprint.capacity?.completedStoryPoints || 0}
              </p>
            </div>
            
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <UserGroupIcon className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Team Size</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {activeSprint.team?.length || 0}
              </p>
            </div>
            
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <ClockIcon className="w-5 h-5 text-orange-600" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Progress</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {Math.round(calculateProgress(activeSprint))}%
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Sprint Progress</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {Math.round(calculateProgress(activeSprint))}%
              </span>
            </div>
            <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${calculateProgress(activeSprint)}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Sprint List */}
      <div className="glass-card-premium p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">All Sprints</h3>
        
        <div className="space-y-4">
          {sprints.length > 0 ? (
            sprints.map((sprint) => {
              const completionRate = calculateCompletionRate(sprint);
              const progress = calculateProgress(sprint);
              
              return (
                <div 
                  key={sprint._id || sprint.id} 
                  className="glass-card p-4 hover-glow cursor-pointer"
                  onClick={() => {
                    setSelectedSprint(sprint);
                    setShowSprintDetails(true);
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(sprint.status)}
                        <span className={`px-2 py-1 rounded-lg text-xs font-semibold border ${getStatusColor(sprint.status)}`}>
                          {sprint.status?.toUpperCase() || 'PLANNING'}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-white">
                          {sprint.name || `Sprint ${sprint.sprintNumber || ''}`}
                        </h4>
                        {sprint.goal && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">{sprint.goal}</p>
                        )}
                      </div>
                    </div>
                    {sprint.startDate && sprint.endDate && (
                      <div className="text-right">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {new Date(sprint.startDate).toLocaleDateString()} - {new Date(sprint.endDate).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          {sprint.team?.length || 0} team members
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {sprint.capacity?.completedStoryPoints || 0}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Completed Points</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {sprint.capacity?.committedStoryPoints || 0}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Committed Points</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {Math.round(completionRate)}%
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Completion Rate</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Completion Progress</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {Math.round(completionRate)}%
                      </span>
                    </div>
                    <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          completionRate >= 90 ? 'bg-green-500' :
                          completionRate >= 70 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${completionRate}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12">
              <CalendarIcon className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                No sprints found
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Create your first sprint to start agile project management
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Sprint Details Modal */}
      {showSprintDetails && selectedSprint && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="glass-card-premium p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {selectedSprint.name || `Sprint ${selectedSprint.sprintNumber || ''}`}
              </h2>
              <button
                onClick={() => setShowSprintDetails(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="glass-card p-4">
                  <h3 className="font-bold text-gray-900 dark:text-white mb-2">Sprint Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Status:</span>
                      <span className={`px-2 py-1 rounded text-xs font-semibold border ${getStatusColor(selectedSprint.status)}`}>
                        {selectedSprint.status?.toUpperCase() || 'PLANNING'}
                      </span>
                    </div>
                    {selectedSprint.startDate && selectedSprint.endDate && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Duration:</span>
                        <span className="text-gray-900 dark:text-white">
                          {new Date(selectedSprint.startDate).toLocaleDateString()} - {new Date(selectedSprint.endDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {selectedSprint.goal && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Goal:</span>
                        <span className="text-gray-900 dark:text-white">{selectedSprint.goal}</span>
                      </div>
                    )}
                  </div>
                </div>

                {selectedSprint.team && selectedSprint.team.length > 0 && (
                  <div className="glass-card p-4">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-2">Team Members</h3>
                    <div className="space-y-2">
                      {selectedSprint.team.map((member, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <span className="text-gray-900 dark:text-white">
                            {member.name || member.userId?.name || `Member ${index + 1}`}
                          </span>
                          <div className="flex items-center gap-2">
                            {member.role && (
                              <span className="text-gray-600 dark:text-gray-400">{member.role}</span>
                            )}
                            {member.capacity && (
                              <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-xs">
                                {member.capacity}h
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="glass-card p-4">
                  <h3 className="font-bold text-gray-900 dark:text-white mb-2">Sprint Metrics</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Total Story Points:</span>
                      <span className="font-bold text-gray-900 dark:text-white">
                        {selectedSprint.capacity?.totalStoryPoints || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Committed Points:</span>
                      <span className="font-bold text-gray-900 dark:text-white">
                        {selectedSprint.capacity?.committedStoryPoints || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Completed Points:</span>
                      <span className="font-bold text-gray-900 dark:text-white">
                        {selectedSprint.capacity?.completedStoryPoints || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Velocity:</span>
                      <span className="font-bold text-gray-900 dark:text-white">
                        {selectedSprint.metrics?.velocity || 0}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="glass-card p-4">
                  <h3 className="font-bold text-gray-900 dark:text-white mb-2">Progress</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Completion Rate:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {Math.round(calculateCompletionRate(selectedSprint))}%
                      </span>
                    </div>
                    <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full transition-all duration-300 ${
                          calculateCompletionRate(selectedSprint) >= 90 ? 'bg-green-500' :
                          calculateCompletionRate(selectedSprint) >= 70 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${calculateCompletionRate(selectedSprint)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Sprint Modal */}
      <CreateSprintModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSprintCreated={handleSprintCreated}
      />
    </div>
  );
};

export default SprintManagement;

