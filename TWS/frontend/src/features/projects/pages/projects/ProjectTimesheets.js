import React, { useState } from 'react';
import { 
  ClockIcon, 
  PlusIcon, 
  CalendarIcon,
  DocumentArrowDownIcon,
  FunnelIcon,
  ChartBarIcon,
  PlayIcon,
  PauseIcon,
  StopIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../../../app/providers/AuthContext';

const ProjectTimesheets = () => {
  const { user } = useAuth();
  const [activeTimer, setActiveTimer] = useState(null);
  const [filterPeriod, setFilterPeriod] = useState('this_week');
  const [filterProject, setFilterProject] = useState('all');

  // Mock data - in production, fetch from API
  const [timesheets, setTimesheets] = useState([
    {
      id: 1,
      date: '2025-10-05',
      project: 'E-Commerce Platform',
      task: 'Implement user authentication',
      member: 'John Doe',
      hours: 6.5,
      description: 'Built JWT authentication system with refresh tokens',
      status: 'approved',
      billable: true
    },
    {
      id: 2,
      date: '2025-10-05',
      project: 'E-Commerce Platform',
      task: 'Design product catalog',
      member: 'Jane Smith',
      hours: 4.0,
      description: 'Created wireframes and mockups for product listing page',
      status: 'approved',
      billable: true
    },
    {
      id: 3,
      date: '2025-10-04',
      project: 'Mobile Banking App',
      task: 'API documentation',
      member: 'Mike Johnson',
      hours: 3.5,
      description: 'Documented authentication and transaction endpoints',
      status: 'pending',
      billable: true
    },
    {
      id: 4,
      date: '2025-10-04',
      project: 'CRM System',
      task: 'Bug fixes',
      member: 'Sarah Lee',
      hours: 2.0,
      description: 'Fixed dashboard loading issues',
      status: 'approved',
      billable: true
    },
    {
      id: 5,
      date: '2025-10-03',
      project: 'Internal Tools',
      task: 'Code review',
      member: 'Tom Brown',
      hours: 1.5,
      description: 'Reviewed pull requests for team members',
      status: 'approved',
      billable: false
    }
  ]);

  const [weekSummary, setWeekSummary] = useState({
    totalHours: 17.5,
    billableHours: 16.0,
    nonBillableHours: 1.5,
    projectBreakdown: [
      { project: 'E-Commerce Platform', hours: 10.5, percentage: 60 },
      { project: 'Mobile Banking App', hours: 3.5, percentage: 20 },
      { project: 'CRM System', hours: 2.0, percentage: 11 },
      { project: 'Internal Tools', hours: 1.5, percentage: 9 }
    ]
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
      case 'pending':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300';
      case 'rejected':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
    }
  };

  const startTimer = (projectId, taskId) => {
    setActiveTimer({ projectId, taskId, startTime: new Date() });
  };

  const stopTimer = () => {
    if (activeTimer) {
      const endTime = new Date();
      const hours = (endTime - activeTimer.startTime) / (1000 * 60 * 60);
      // TODO: Save to backend via API
      // For now, just update local state
      setActiveTimer(null);
    }
  };

  const filteredTimesheets = timesheets.filter(entry => {
    const matchesProject = filterProject === 'all' || entry.project === filterProject;
    // Add date filtering based on filterPeriod
    return matchesProject;
  });

  const stats = {
    totalHours: weekSummary.totalHours,
    billableHours: weekSummary.billableHours,
    nonBillableHours: weekSummary.nonBillableHours,
    entries: timesheets.length
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card-premium p-4 hover-glow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">Total Hours</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalHours}h</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-primary-600 flex items-center justify-center">
              <ClockIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        <div className="glass-card-premium p-4 hover-glow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">Billable Hours</p>
              <p className="text-2xl font-bold text-green-600">{stats.billableHours}h</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <ChartBarIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        <div className="glass-card-premium p-4 hover-glow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">Non-Billable</p>
              <p className="text-2xl font-bold text-orange-600">{stats.nonBillableHours}h</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
              <ClockIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        <div className="glass-card-premium p-4 hover-glow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">Entries</p>
              <p className="text-2xl font-bold text-accent-600">{stats.entries}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-500 to-pink-600 flex items-center justify-center">
              <CalendarIcon className="w-6 h-6 text-white" />
            </div>
          </div>
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
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center animate-pulse">
                <ClockIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">Timer Running</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Started at {activeTimer.startTime.toLocaleTimeString()}</p>
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
            <select className="flex-1 glass-input px-4 py-3">
              <option>Select Project</option>
              <option>E-Commerce Platform</option>
              <option>Mobile Banking App</option>
              <option>CRM System</option>
            </select>
            <select className="flex-1 glass-input px-4 py-3">
              <option>Select Task</option>
              <option>Development</option>
              <option>Design</option>
              <option>Testing</option>
              <option>Meetings</option>
            </select>
            <button
              onClick={() => startTimer(1, 1)}
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
            onChange={(e) => setFilterPeriod(e.target.value)}
            className="glass-input px-4 py-2"
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
            className="glass-input px-4 py-2"
          >
            <option value="all">All Projects</option>
            <option value="E-Commerce Platform">E-Commerce Platform</option>
            <option value="Mobile Banking App">Mobile Banking App</option>
            <option value="CRM System">CRM System</option>
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
      <div className="glass-card-premium p-6 hover-glow">
        <h3 className="text-lg font-bold font-heading text-gray-900 dark:text-white mb-6">
          Project Time Breakdown
        </h3>
        <div className="space-y-4">
          {weekSummary.projectBreakdown.map((project) => (
            <div key={project.project}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{project.project}</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{project.hours}h ({project.percentage}%)</span>
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

      {/* Timesheet Entries */}
      <div className="glass-card-premium p-6">
        <h3 className="text-lg font-bold font-heading text-gray-900 dark:text-white mb-6">
          Time Entries
        </h3>
        <div className="space-y-3">
          {filteredTimesheets.map((entry) => (
            <div key={entry.id} className="glass-card p-4 hover-glow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">{entry.task}</h4>
                    <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${getStatusColor(entry.status)}`}>
                      {entry.status}
                    </span>
                    {entry.billable && (
                      <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-xs font-semibold">
                        Billable
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{entry.description}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                    <span>📁 {entry.project}</span>
                    <span>👤 {entry.member}</span>
                    <span>📅 {entry.date}</span>
                  </div>
                </div>
                <div className="text-right ml-4">
                  <div className="flex items-center gap-2 mb-1">
                    <ClockIcon className="w-4 h-4 text-primary-600" />
                    <span className="text-xl font-bold text-gray-900 dark:text-white">{entry.hours}h</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {filteredTimesheets.length === 0 && (
        <div className="glass-card-premium p-12 text-center">
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
  );
};

export default ProjectTimesheets;