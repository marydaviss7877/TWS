/**
 * Gantt Chart Component
 * Main container for Gantt chart visualization
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import GanttChartHeader from './GanttChartHeader';
import GanttTimeline from './GanttTimeline';
import GanttTaskRow from './GanttTaskRow';
import GanttDependencyLine from './GanttDependencyLine';
import GanttLegend from './GanttLegend';
import tenantProjectApiService from '../../services/tenantProjectApiService';
import { handleApiError } from '../../utils/errorHandler';

const GanttChart = ({ projectId: propProjectId }) => {
  const { tenantSlug, projectId: routeProjectId } = useParams();
  const projectId = propProjectId || routeProjectId;
  
  const [tasks, setTasks] = useState([]);
  const [criticalPath, setCriticalPath] = useState([]);
  const [settings, setSettings] = useState({
    showCriticalPath: true,
    showMilestones: true,
    showProgressIndicator: true,
    showDependencies: true,
    showResourceAllocation: false,
    viewType: 'weekly',
    zoomLevel: 1
  });
  const [filters, setFilters] = useState({
    category: 'all',
    sprint: 'all',
    assignee: 'all'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  
  const ganttContainerRef = useRef(null);

  // Calculate date range from tasks
  useEffect(() => {
    if (tasks.length > 0) {
      const dates = tasks
        .map(task => [
          task.startDate ? new Date(task.startDate) : null,
          task.endDate || task.dueDate ? new Date(task.endDate || task.dueDate) : null
        ])
        .flat()
        .filter(Boolean);
      
      if (dates.length > 0) {
        const start = new Date(Math.min(...dates));
        const end = new Date(Math.max(...dates));
        // Add padding
        start.setDate(start.getDate() - 7);
        end.setDate(end.getDate() + 7);
        setDateRange({ start, end });
      }
    }
  }, [tasks]);


  // Fetch Gantt data
  useEffect(() => {
    if (!projectId || !tenantSlug) {
      // If no projectId, show empty state (no demo data)
      setTasks([]);
      setCriticalPath([]);
      setLoading(false);
      return;
    }

    const fetchGanttData = async () => {
      try {
        setLoading(true);
        setError(null);

        let ganttTasks = [];
        let ganttCriticalPath = [];

        try {
          const response = await tenantProjectApiService.getGanttTimeline(tenantSlug, projectId);
          if (response.success && response.data && response.data.tasks?.length > 0) {
            ganttTasks = response.data.tasks;
            ganttCriticalPath = response.data.criticalPath || [];
            if (response.data.settings) {
              setSettings(prev => ({ ...prev, ...response.data.settings }));
            }
          }
        } catch (_) {
          // Gantt endpoint unavailable — fall through to task fallback
        }

        // Fallback: pull from regular tasks endpoint and adapt for Gantt display
        if (ganttTasks.length === 0) {
          const tasksRes = await tenantProjectApiService.getProjectTasks(tenantSlug, { projectId });
          const raw = tasksRes?.data?.tasks ?? tasksRes?.tasks;
          const list = Array.isArray(raw) ? raw : (raw ? Object.values(raw).flat() : []);
          ganttTasks = list
            .filter(t => t.startDate || t.dueDate)
            .map(t => ({
              ...t,
              startDate:    t.startDate || t.createdAt,
              endDate:      t.dueDate || t.startDate,
              progress:     t.status === 'completed' ? 100 : t.status === 'in_progress' ? 50 : 0,
              dependencies: t.dependencies || { predecessors: [], successors: [] },
            }));
        }

        setTasks(ganttTasks);
        setCriticalPath(ganttCriticalPath);
      } catch (err) {
        console.error('Error fetching Gantt data:', err);
        handleApiError(err, 'Failed to load Gantt chart data');
        setError('Failed to load Gantt chart data');
        setTasks([]);
        setCriticalPath([]);
      } finally {
        setLoading(false);
      }
    };

    fetchGanttData();
  }, [projectId, tenantSlug]);

  // Handle view type change
  const handleViewTypeChange = useCallback((viewType) => {
    setSettings(prev => ({ ...prev, viewType }));
  }, []);

  // Handle zoom change
  const handleZoomChange = useCallback((zoomLevel) => {
    setSettings(prev => ({ ...prev, zoomLevel }));
  }, []);

  // Filter tasks based on current filters
  const filteredTasks = React.useMemo(() => {
    let filtered = tasks;
    
    if (filters.category && filters.category !== 'all') {
      filtered = filtered.filter(task => task.category === filters.category);
    }
    
    if (filters.sprint && filters.sprint !== 'all') {
      filtered = filtered.filter(task => task.sprint === filters.sprint);
    }
    
    if (filters.assignee && filters.assignee !== 'all') {
      filtered = filtered.filter(task => 
        task.assignee?.email === filters.assignee || 
        task.assignee?.name === filters.assignee
      );
    }
    
    return filtered;
  }, [tasks, filters]);

  // Handle task reschedule
  const handleTaskReschedule = useCallback(async (taskId, newStartDate, newEndDate, autoAdjust = false) => {
    try {
      await tenantProjectApiService.rescheduleTask(tenantSlug, taskId, {
        startDate: newStartDate,
        endDate: newEndDate,
        autoAdjustDependents: autoAdjust
      });
      
      // Refresh data
      const response = await tenantProjectApiService.getGanttTimeline(tenantSlug, projectId);
      if (response.success && response.data) {
        setTasks(response.data.tasks || []);
        setCriticalPath(response.data.criticalPath || []);
      }
    } catch (err) {
      handleApiError(err, 'Failed to reschedule task');
      throw err;
    }
  }, [tenantSlug, projectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto" />
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Loading Gantt chart…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-200 dark:border-red-800/40">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 font-semibold">Failed to load Gantt chart</p>
          <p className="text-sm text-red-400 dark:text-red-500 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (tasks.length === 0 || !dateRange.start || !dateRange.end) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
        <div className="text-center px-6">
          <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
            </svg>
          </div>
          <p className="text-gray-600 dark:text-gray-300 font-semibold mb-1">No Gantt data yet</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Add tasks with start and due dates to see them on the Gantt chart
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="gantt-chart-container h-full flex flex-col bg-white rounded-lg shadow-sm border border-gray-200">
      <GanttChartHeader
        viewType={settings.viewType}
        zoomLevel={settings.zoomLevel}
        onViewTypeChange={handleViewTypeChange}
        onZoomChange={handleZoomChange}
        settings={settings}
        onSettingsChange={setSettings}
      />
      
      <div className="flex-1 overflow-auto" ref={ganttContainerRef}>
        <div className="gantt-content relative">
          <GanttTimeline
            startDate={dateRange.start}
            endDate={dateRange.end}
            viewType={settings.viewType}
            zoomLevel={settings.zoomLevel}
          />
          
          <div className="gantt-tasks-container relative">
            {filteredTasks.map((task, index) => (
              <GanttTaskRow
                key={task._id}
                task={task}
                index={index}
                startDate={dateRange.start}
                endDate={dateRange.end}
                viewType={settings.viewType}
                zoomLevel={settings.zoomLevel}
                isCritical={criticalPath.includes(task._id.toString())}
                showProgress={settings.showProgressIndicator}
                onReschedule={handleTaskReschedule}
              />
            ))}
            
            {/* Render dependency lines */}
            {settings.showDependencies && filteredTasks.map((task, taskIndex) => 
              task.dependencies?.successors?.map((dep, idx) => {
                const targetTask = filteredTasks.find(t => t._id.toString() === dep.taskId?.toString());
                const targetIndex = filteredTasks.findIndex(t => t._id.toString() === dep.taskId?.toString());
                if (!targetTask) return null;
                
                return (
                  <GanttDependencyLine
                    key={`${task._id}-${dep.taskId}-${idx}`}
                    sourceTask={task}
                    sourceRowIndex={taskIndex}
                    targetTask={targetTask}
                    targetRowIndex={targetIndex}
                    dependencyType={dep.dependencyType}
                    startDate={dateRange.start}
                    endDate={dateRange.end}
                    viewType={settings.viewType}
                    zoomLevel={settings.zoomLevel}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>
      
      <GanttLegend settings={settings} />
    </div>
  );
};

export default GanttChart;
