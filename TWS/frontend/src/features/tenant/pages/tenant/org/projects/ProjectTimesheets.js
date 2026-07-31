import React, { useState, useEffect } from 'react';
import { 
  ClockIcon,
  PlusIcon,
  CalendarIcon,
  DocumentArrowDownIcon,
  FunnelIcon,
  ChartBarIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  FolderIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import tenantProjectApiService from './services/tenantProjectApiService';
import { TIMESHEET_STATUS } from './constants/projectConstants';
import { useTenantSlug } from '../../../../../../shared/hooks/useTenantSlug';

const ProjectTimesheets = () => {
  const tenantSlug = useTenantSlug();
  const [activeTimer, setActiveTimer] = useState(null);
  const [filterPeriod, setFilterPeriod] = useState('this_week');
  const [filterProject, setFilterProject] = useState('all');
  const [loading, setLoading] = useState(true);
  const [timesheets, setTimesheets] = useState([]);
  const [projects, setProjects] = useState([]);
  const [weekSummary, setWeekSummary] = useState({
    totalHours: 0,
    billableHours: 0,
    nonBillableHours: 0,
    projectBreakdown: []
  });

  useEffect(() => {
    if (tenantSlug) {
      fetchTimesheets();
      fetchProjects();
    }
  }, [tenantSlug, filterPeriod]);

  useEffect(() => {
    let interval;
    if (activeTimer) {
      interval = setInterval(() => {
        // Timer is running, update UI if needed
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTimer]);

  const fetchTimesheets = async () => {
    try {
      setLoading(true);
      const params = {
        period: filterPeriod,
        ...(filterProject !== 'all' && { projectId: filterProject })
      };
      
      const data = await tenantProjectApiService.getProjectTimesheets(tenantSlug, params);
      
      if (Array.isArray(data)) {
        setTimesheets(data);
      } else if (data?.timesheets) {
        setTimesheets(data.timesheets);
      } else {
        setTimesheets([]);
      }

      // Calculate summary
      const totalHours = timesheets.reduce((sum, entry) => sum + (entry.hours || 0), 0);
      const billableHours = timesheets
        .filter(e => e.billable)
        .reduce((sum, entry) => sum + (entry.hours || 0), 0);
      
      // Project breakdown
      const breakdown = {};
      timesheets.forEach(entry => {
        const projectName = entry.projectId?.name || entry.project || 'Unknown';
        if (!breakdown[projectName]) {
          breakdown[projectName] = 0;
        }
        breakdown[projectName] += entry.hours || 0;
      });

      const totalForBreakdown = Object.values(breakdown).reduce((sum, hours) => sum + hours, 0);
      
      setWeekSummary({
        totalHours,
        billableHours,
        nonBillableHours: totalHours - billableHours,
        projectBreakdown: Object.entries(breakdown).map(([project, hours]) => ({
          project,
          hours,
          percentage: totalForBreakdown > 0 ? Math.round((hours / totalForBreakdown) * 100) : 0
        }))
      });
    } catch (err) {
      console.error('Error fetching timesheets:', err);
      setTimesheets([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const data = await tenantProjectApiService.getProjects(tenantSlug);
      setProjects(Array.isArray(data) ? data : (data.projects || []));
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case TIMESHEET_STATUS.APPROVED:
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
      case TIMESHEET_STATUS.SUBMITTED:
      case TIMESHEET_STATUS.DRAFT:
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300';
      case TIMESHEET_STATUS.REJECTED:
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
    }
  };

  const startTimer = async (projectId, taskId) => {
    setActiveTimer({ 
      projectId, 
      taskId, 
      startTime: new Date(),
      project: projects.find(p => (p._id || p.id) === projectId)
    });
  };

  const stopTimer = async () => {
    if (activeTimer) {
      try {
        const endTime = new Date();
        const hours = ((endTime - activeTimer.startTime) / (1000 * 60 * 60)).toFixed(2);
        
        // Submit timesheet entry
        await tenantProjectApiService.submitTimesheet(tenantSlug, {
          projectId: activeTimer.projectId,
          taskId: activeTimer.taskId,
          hours: parseFloat(hours),
          date: new Date().toISOString().split('T')[0],
          description: `Time tracked for ${activeTimer.project?.name || 'project'}`,
          billable: true,
          status: TIMESHEET_STATUS.SUBMITTED
        });

        // Refresh timesheets
        await fetchTimesheets();
        setActiveTimer(null);
      } catch (error) {
        console.error('Error stopping timer:', error);
        setActiveTimer(null);
      }
    }
  };

  const filteredTimesheets = timesheets.filter(entry => {
    const matchesProject = filterProject === 'all' || 
                          (entry.projectId?._id || entry.projectId?.id || entry.projectId) === filterProject ||
                          (entry.project || '') === filterProject;
    return matchesProject;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="tws-loading-pulse rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading timesheets...</p>
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
            Project Timesheets
          </h1>
          <p className="text-sm xl:text-base text-gray-600 dark:text-gray-300 mt-1">
            Track time spent on projects and tasks
          </p>
        </div>
      </div>

      {/* Timer Card */}
      <div className="glass-card-premium p-6 hover-glow">
        <h3 className="text-lg font-bold font-heading text-gray-900 dark:text-white mb-4">
          Quick Time Tracker
        </h3>
        {activeTimer ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center animate-pulse">
                <ClockIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">Timer Running</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {activeTimer.project?.name || 'Project'} • Started at {activeTimer.startTime.toLocaleTimeString()}
                </p>
              </div>
            </div>
            <button
              onClick={stopTimer}
              className="glass-button px-6 py-3 rounded-xl hover-scale bg-gradient-to-r from-red-500 to-rose-600 text-white font-semibold"
            >
              <StopIcon className="w-5 h-5 inline mr-2" />
              Stop Timer
            </button>
          </div>
        ) : (
          <div className="flex gap-4">
            <select 
              id="timer-project"
              className="flex-1 glass-input px-4 py-3 rounded-xl"
              defaultValue=""
            >
              <option value="">Select Project</option>
              {projects.map(project => (
                <option key={project._id || project.id} value={project._id || project.id}>
                  {project.name || project.title}
                </option>
              ))}
            </select>
            <select 
              id="timer-task"
              className="flex-1 glass-input px-4 py-3 rounded-xl"
              defaultValue=""
            >
              <option value="">Select Task</option>
            </select>
            <button
              onClick={() => {
                const projectSelect = document.getElementById('timer-project');
                const taskSelect = document.getElementById('timer-task');
                if (projectSelect.value) {
                  startTimer(projectSelect.value, taskSelect.value || null);
                }
              }}
              className="glass-button px-6 py-3 rounded-xl hover-scale bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold"
            >
              <PlayIcon className="w-5 h-5 inline mr-2" />
              Start Timer
            </button>
          </div>
        )}
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex gap-4">
          <select
            value={filterPeriod}
            onChange={(e) => {
              setFilterPeriod(e.target.value);
              fetchTimesheets();
            }}
            className="glass-input px-4 py-2 rounded-xl"
          >
            <option value="today">Today</option>
            <option value="this_week">This Week</option>
            <option value="last_week">Last Week</option>
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
          </select>
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="glass-input px-4 py-2 rounded-xl"
          >
            <option value="all">All Projects</option>
            {projects.map(project => (
              <option key={project._id || project.id} value={project._id || project.id}>
                {project.name || project.title}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button className="glass-button px-4 py-2 rounded-xl hover-scale text-gray-700 dark:text-gray-300 font-semibold">
            <DocumentArrowDownIcon className="w-5 h-5 inline mr-2" />
            Export
          </button>
          <button className="glass-button px-4 py-2 rounded-xl hover-scale bg-gradient-to-r from-primary-500 to-accent-500 text-white font-semibold">
            <PlusIcon className="w-5 h-5 inline mr-2" />
            Add Entry
          </button>
        </div>
      </div>

      {/* Project Breakdown */}
      {weekSummary.projectBreakdown.length > 0 && (
        <div className="glass-card-premium p-6 hover-glow">
          <h3 className="text-lg font-bold font-heading text-gray-900 dark:text-white mb-6">
            Project Time Breakdown
          </h3>
          <div className="space-y-4">
            {weekSummary.projectBreakdown.map((project, idx) => (
              <div key={idx}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{project.project}</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {project.hours.toFixed(1)}h ({project.percentage}%)
                  </span>
                </div>
                <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-primary-500 to-accent-500 h-3 rounded-full"
                    style={{ width: `${project.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timesheet Entries */}
      <div className="glass-card-premium p-6">
        <h3 className="text-lg font-bold font-heading text-gray-900 dark:text-white mb-6">
          Time Entries
        </h3>
        <div className="space-y-3">
          {filteredTimesheets.length > 0 ? (
            filteredTimesheets.map((entry) => (
              <div key={entry._id || entry.id} className="glass-card p-4 hover-glow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                        {entry.taskId?.title || entry.task || 'General Work'}
                      </h4>
                      <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${getStatusColor(entry.status || TIMESHEET_STATUS.SUBMITTED)}`}>
                        {(entry.status || TIMESHEET_STATUS.SUBMITTED).replace('_', ' ')}
                      </span>
                      {entry.billable && (
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-xs font-semibold">
                          Billable
                        </span>
                      )}
                    </div>
                    {entry.description && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{entry.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <FolderIcon className="w-3.5 h-3.5" />
                        {entry.projectId?.name || entry.project || 'Unknown Project'}
                      </span>
                      {entry.memberId?.name || entry.member && (
                        <span className="inline-flex items-center gap-1">
                          <UserIcon className="w-3.5 h-3.5" />
                          {entry.memberId?.name || entry.member}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <CalendarIcon className="w-3.5 h-3.5" />
                        {entry.date ? new Date(entry.date).toLocaleDateString() : 'No date'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <div className="flex items-center gap-2 mb-1">
                      <ClockIcon className="w-4 h-4 text-primary-600" />
                      <span className="text-xl font-bold text-gray-900 dark:text-white">
                        {(entry.hours || 0).toFixed(1)}h
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <ClockIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                No time entries found
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Start tracking your time or adjust your filters
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectTimesheets;

