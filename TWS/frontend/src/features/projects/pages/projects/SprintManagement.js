import React, { useState, useEffect } from 'react';
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
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';

const SprintManagement = () => {
  const [sprints, setSprints] = useState([]);
  const [activeSprint, setActiveSprint] = useState(null);
  const [selectedSprint, setSelectedSprint] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSprintDetails, setShowSprintDetails] = useState(false);

  // Mock data - in production, fetch from API
  useEffect(() => {
    const mockSprints = [
      {
        id: 1,
        name: 'Sprint 1 - User Authentication',
        sprintNumber: 1,
        startDate: '2025-10-01',
        endDate: '2025-10-15',
        status: 'completed',
        goal: 'Implement user authentication and basic user management',
        capacity: {
          totalStoryPoints: 40,
          committedStoryPoints: 35,
          completedStoryPoints: 32
        },
        metrics: {
          velocity: 32
        },
        team: [
          { userId: '1', name: 'John Doe', role: 'Developer', capacity: 40 },
          { userId: '2', name: 'Jane Smith', role: 'Designer', capacity: 30 },
          { userId: '3', name: 'Mike Wilson', role: 'QA', capacity: 20 }
        ]
      },
      {
        id: 2,
        name: 'Sprint 2 - Core Features',
        sprintNumber: 2,
        startDate: '2025-10-16',
        endDate: '2025-10-30',
        status: 'active',
        goal: 'Develop core application features and user interface',
        capacity: {
          totalStoryPoints: 45,
          committedStoryPoints: 40,
          completedStoryPoints: 18
        },
        metrics: {
          velocity: 0
        },
        team: [
          { userId: '1', name: 'John Doe', role: 'Developer', capacity: 40 },
          { userId: '2', name: 'Jane Smith', role: 'Designer', capacity: 30 },
          { userId: '3', name: 'Mike Wilson', role: 'QA', capacity: 20 },
          { userId: '4', name: 'Sarah Johnson', role: 'Developer', capacity: 35 }
        ]
      },
      {
        id: 3,
        name: 'Sprint 3 - Testing & Polish',
        sprintNumber: 3,
        startDate: '2025-10-31',
        endDate: '2025-11-14',
        status: 'planning',
        goal: 'Complete testing, bug fixes, and final polish',
        capacity: {
          totalStoryPoints: 30,
          committedStoryPoints: 0,
          completedStoryPoints: 0
        },
        metrics: {
          velocity: 0
        },
        team: [
          { userId: '1', name: 'John Doe', role: 'Developer', capacity: 40 },
          { userId: '2', name: 'Jane Smith', role: 'Designer', capacity: 30 },
          { userId: '3', name: 'Mike Wilson', role: 'QA', capacity: 20 }
        ]
      }
    ];

    setSprints(mockSprints);
    setActiveSprint(mockSprints.find(sprint => sprint.status === 'active'));
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'active': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'planning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircleIcon className="w-4 h-4" />;
      case 'active': return <PlayIcon className="w-4 h-4" />;
      case 'planning': return <CalendarIcon className="w-4 h-4" />;
      case 'cancelled': return <ExclamationTriangleIcon className="w-4 h-4" />;
      default: return <CalendarIcon className="w-4 h-4" />;
    }
  };

  const calculateProgress = (sprint) => {
    if (sprint.status === 'completed') return 100;
    if (sprint.status === 'planning') return 0;
    
    const now = new Date();
    const startDate = new Date(sprint.startDate);
    const endDate = new Date(sprint.endDate);
    const totalDuration = endDate - startDate;
    const elapsed = now - startDate;
    
    return Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100);
  };

  const calculateCompletionRate = (sprint) => {
    if (sprint.capacity.committedStoryPoints === 0) return 0;
    return (sprint.capacity.completedStoryPoints / sprint.capacity.committedStoryPoints) * 100;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sprint Management</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your Agile sprints and track team velocity</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-all"
        >
          <PlusIcon className="w-5 h-5" />
          Create Sprint
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
                <p className="text-sm text-gray-600 dark:text-gray-400">{activeSprint.name}</p>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${getStatusColor(activeSprint.status)}`}>
              {activeSprint.status.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <ChartBarIcon className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Velocity</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {activeSprint.metrics.velocity}
              </p>
            </div>
            
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircleIcon className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {activeSprint.capacity.completedStoryPoints}
              </p>
            </div>
            
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <UserGroupIcon className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Team Size</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {activeSprint.team.length}
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
          {sprints.map((sprint) => (
            <div 
              key={sprint.id} 
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
                      {sprint.status.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white">{sprint.name}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{sprint.goal}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {new Date(sprint.startDate).toLocaleDateString()} - {new Date(sprint.endDate).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    {sprint.team.length} team members
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {sprint.capacity.completedStoryPoints}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Completed Points</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {sprint.capacity.committedStoryPoints}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Committed Points</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {Math.round(calculateCompletionRate(sprint))}%
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Completion Rate</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Completion Progress</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {Math.round(calculateCompletionRate(sprint))}%
                  </span>
                </div>
                <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      calculateCompletionRate(sprint) >= 90 ? 'bg-green-500' :
                      calculateCompletionRate(sprint) >= 70 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${calculateCompletionRate(sprint)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sprint Details Modal */}
      {showSprintDetails && selectedSprint && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="glass-card-premium p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {selectedSprint.name}
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
                        {selectedSprint.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Duration:</span>
                      <span className="text-gray-900 dark:text-white">
                        {new Date(selectedSprint.startDate).toLocaleDateString()} - {new Date(selectedSprint.endDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Goal:</span>
                      <span className="text-gray-900 dark:text-white">{selectedSprint.goal}</span>
                    </div>
                  </div>
                </div>

                <div className="glass-card p-4">
                  <h3 className="font-bold text-gray-900 dark:text-white mb-2">Team Members</h3>
                  <div className="space-y-2">
                    {selectedSprint.team.map((member) => (
                      <div key={member.name} className="flex items-center justify-between text-sm">
                        <span className="text-gray-900 dark:text-white">{member.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600 dark:text-gray-400">{member.role}</span>
                          <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-xs">
                            {member.capacity}h
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="glass-card p-4">
                  <h3 className="font-bold text-gray-900 dark:text-white mb-2">Sprint Metrics</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Total Story Points:</span>
                      <span className="font-bold text-gray-900 dark:text-white">
                        {selectedSprint.capacity.totalStoryPoints}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Committed Points:</span>
                      <span className="font-bold text-gray-900 dark:text-white">
                        {selectedSprint.capacity.committedStoryPoints}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Completed Points:</span>
                      <span className="font-bold text-gray-900 dark:text-white">
                        {selectedSprint.capacity.completedStoryPoints}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Velocity:</span>
                      <span className="font-bold text-gray-900 dark:text-white">
                        {selectedSprint.metrics.velocity}
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
    </div>
  );
};

export default SprintManagement;
