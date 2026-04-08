import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  ClockIcon,
  PlayIcon,
  StopIcon,
  ChartBarIcon,
  CalendarIcon,
  UserIcon,
  BriefcaseIcon
} from '@heroicons/react/24/outline';
import { tenantApiService } from '../../../../../../shared/services/tenant/tenant-api.service';
import { useTenantAuth } from '../../../../../../app/providers/TenantAuthContext';
import toast from 'react-hot-toast';

const TimeTracking = () => {
  const { tenantSlug } = useParams();
  const { isAuthenticated, loading: authLoading } = useTenantAuth();
  const [loading, setLoading] = useState(true);
  const [activeTracking, setActiveTracking] = useState(null);
  const [todayStats, setTodayStats] = useState({
    totalHours: 0,
    billableHours: 0,
    projects: []
  });
  const [timeEntries, setTimeEntries] = useState([]);
  const [projects, setProjects] = useState([]);
  const [newEntry, setNewEntry] = useState({
    projectId: '',
    task: '',
    description: '',
    startTime: new Date().toISOString().slice(0, 16)
  });

  useEffect(() => {
    // SECURITY FIX: Use isAuthenticated from context instead of localStorage token check
    if (!authLoading && isAuthenticated) {
      fetchTimeTrackingData();
      fetchProjects();
      checkActiveTracking();
      // Check for active tracking every minute
      const interval = setInterval(checkActiveTracking, 60000);
      return () => clearInterval(interval);
    } else if (!authLoading && !isAuthenticated) {
      setLoading(false);
    }
  }, [tenantSlug, isAuthenticated, authLoading]);

  const checkActiveTracking = async () => {
    // SECURITY FIX: Use isAuthenticated from context instead of localStorage token check
    if (!isAuthenticated || !tenantSlug) return;
    
    try {
      const response = await tenantApiService.getActiveTimer(tenantSlug);
      if (response?.success && response.data) {
        setActiveTracking({
          ...response.data,
          task: response.data.description || response.data.task
        });
      } else {
        setActiveTracking(null);
      }
    } catch (error) {
      console.error('Error checking active tracking:', error);
      setActiveTracking(null);
    }
  };

  const fetchTimeTrackingData = async () => {
    // SECURITY FIX: Use isAuthenticated from context instead of localStorage token check
    if (!isAuthenticated || !tenantSlug) return;
    
    try {
      setLoading(true);
      const response = await tenantApiService.getTodayTimeTracking(tenantSlug);
      if (response?.success) {
        const data = response.data;
        setTodayStats({
          totalHours: data.totalHours || 0,
          billableHours: data.billableHours || 0,
          projects: data.projects || []
        });
        setTimeEntries((data.entries || []).map(entry => ({
          id: entry._id,
          project: entry.projectId?.name || 'Unknown',
          task: entry.task || entry.description || 'No description',
          startTime: entry.createdAt ? new Date(entry.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '',
          endTime: entry.updatedAt ? new Date(entry.updatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '',
          duration: entry.hours || 0,
          billable: entry.billable !== false,
          date: entry.date ? new Date(entry.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
        })));
      } else {
        // Set empty data
        setTodayStats({ totalHours: 0, billableHours: 0, projects: [] });
        setTimeEntries([]);
      }
    } catch (error) {
      // Only show error if not auth-related
        console.error('Error fetching time tracking data:', error);
        toast.error('Failed to load time tracking data');
      setTodayStats({ totalHours: 0, billableHours: 0, projects: [] });
      setTimeEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    // SECURITY FIX: Use isAuthenticated from context instead of localStorage token check
    if (!isAuthenticated || !tenantSlug) return;
    
    try {
      const response = await tenantApiService.getProjects(tenantSlug);
      if (response?.success) {
        setProjects(response.data || []);
      } else {
        setProjects([]);
      }
    } catch (error) {
        console.error('Error fetching projects:', error);
      setProjects([]);
    }
  };

  const handleStartTracking = async () => {
    if (!newEntry.projectId || !newEntry.task) {
      toast.error('Please select a project and enter a task name');
      return;
    }

    try {
      const response = await tenantApiService.startTimeTracking(tenantSlug, {
        projectId: newEntry.projectId,
        taskId: null, // Can be added later if task selection is implemented
        description: newEntry.description || newEntry.task
      });

      if (response?.success) {
        setActiveTracking({
          ...response.data,
          task: newEntry.task
        });
        toast.success('Time tracking started');
        setNewEntry({
          projectId: '',
          task: '',
          description: '',
          startTime: new Date().toISOString().slice(0, 16)
        });
        fetchTimeTrackingData(); // Refresh data
      }
    } catch (error) {
      console.error('Error starting time tracking:', error);
      toast.error(error.message || 'Failed to start time tracking');
    }
  };

  const handleStopTracking = async () => {
    if (!activeTracking || !activeTracking._id) return;

    try {
      const response = await tenantApiService.stopTimeTracking(tenantSlug, activeTracking._id);

      if (response?.success && response.data) {
        const duration = response.data.hours || 0;
        toast.success(`Tracked ${duration.toFixed(2)} hours`);
        setActiveTracking(null);
        fetchTimeTrackingData();
      }
    } catch (error) {
      console.error('Error stopping time tracking:', error);
      toast.error(error.message || 'Failed to stop time tracking');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-[#0078d4] border-t-transparent mx-auto"></div>
          <p className="mt-4 text-[#605e5c]">Loading time tracking...</p>
        </div>
      </div>
    );
  }

  const formatDuration = (hours) => {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const getActiveDuration = () => {
    if (!activeTracking) return 0;
    if (activeTracking.currentElapsedHours !== undefined) {
      return activeTracking.currentElapsedHours;
    }
    if (activeTracking.timer?.startedAt) {
      const now = new Date();
      const start = new Date(activeTracking.timer.startedAt);
      return (now - start) / (1000 * 60 * 60); // hours
    }
    const now = new Date();
    const start = new Date(activeTracking.createdAt || activeTracking.startTime || now);
    return (now - start) / (1000 * 60 * 60); // hours
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <ClockIcon className="w-8 h-8 text-[#0078d4]" />
          Time Tracking
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Track time spent on projects and tasks
        </p>
      </div>

      {/* Today's Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Hours Today</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {formatDuration(todayStats.totalHours)}
              </p>
            </div>
            <ClockIcon className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Billable Hours</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                {formatDuration(todayStats.billableHours)}
              </p>
            </div>
            <BriefcaseIcon className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Projects</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                {todayStats.projects.length}
              </p>
            </div>
            <ChartBarIcon className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Active Tracking */}
      {activeTracking && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Tracking Active
                </h3>
              </div>
              <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <p><span className="font-medium">Project:</span> {projects.find(p => p._id === activeTracking.projectId)?.name || activeTracking.projectId?.name || 'Unknown'}</p>
                <p><span className="font-medium">Task:</span> {activeTracking.task || activeTracking.description || 'No task'}</p>
                <p><span className="font-medium">Duration:</span> {formatDuration(getActiveDuration())}</p>
              </div>
            </div>
            <button
              onClick={handleStopTracking}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 font-medium"
            >
              <StopIcon className="w-5 h-5" />
              Stop Tracking
            </button>
          </div>
        </div>
      )}

      {/* New Time Entry / Start Tracking */}
      {!activeTracking && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Start Time Tracking
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Project <span className="text-red-500">*</span>
              </label>
              <select
                value={newEntry.projectId}
                onChange={(e) => setNewEntry({ ...newEntry, projectId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="">Select a project</option>
                {projects.map((project) => (
                  <option key={project._id} value={project._id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Task <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newEntry.task}
                onChange={(e) => setNewEntry({ ...newEntry, task: e.target.value })}
                placeholder="e.g., Feature Development, Bug Fix"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={newEntry.description}
                onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                placeholder="Additional notes about the work..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleStartTracking}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium"
            >
              <PlayIcon className="w-5 h-5" />
              Start Tracking
            </button>
          </div>
        </div>
      )}

      {/* Today's Time Entries */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Today's Entries
          </h2>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>

        {timeEntries.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Project</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Task</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Time</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Duration</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Billable</th>
                </tr>
              </thead>
              <tbody>
                {timeEntries.map((entry) => (
                  <tr key={entry.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{entry.project}</td>
                    <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">{entry.task}</td>
                    <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                      {entry.startTime} - {entry.endTime}
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">
                      {formatDuration(entry.duration)}
                    </td>
                    <td className="py-3 px-4">
                      {entry.billable ? (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          Billable
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                          Non-billable
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <ClockIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">No time entries for today</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimeTracking;
