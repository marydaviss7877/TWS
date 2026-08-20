/**
 * Gantt Task Row Component
 * Displays a single task row with task bar
 */

import React, { useMemo, useState } from 'react';
import GanttTaskBar from './GanttTaskBar';

const GanttTaskRow = ({
  task,
  index,
  startDate,
  endDate,
  viewType,
  zoomLevel,
  isCritical,
  showProgress,
  onReschedule
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const taskStart = task.startDate ? new Date(task.startDate) : null;
  const taskEnd = task.endDate || task.dueDate ? new Date(task.endDate || task.dueDate) : null;

  const getColumnWidth = () => {
    const baseWidth = viewType === 'daily' ? 60 : viewType === 'weekly' ? 80 : viewType === 'monthly' ? 120 : 150;
    return baseWidth * zoomLevel;
  };

  const getTaskPosition = useMemo(() => {
    if (!taskStart || !startDate) return { left: 0, width: 0 };

    const daysDiff = Math.floor((taskStart - startDate) / (1000 * 60 * 60 * 24));
    const left = daysDiff * (getColumnWidth() / (viewType === 'daily' ? 1 : viewType === 'weekly' ? 7 : viewType === 'monthly' ? 30 : 90));

    let width = 0;
    if (taskEnd) {
      const duration = Math.ceil((taskEnd - taskStart) / (1000 * 60 * 60 * 24));
      width = duration * (getColumnWidth() / (viewType === 'daily' ? 1 : viewType === 'weekly' ? 7 : viewType === 'monthly' ? 30 : 90));
    } else {
      width = getColumnWidth(); // Default width if no end date
    }

    return { left: Math.max(0, left), width: Math.max(getColumnWidth() * 0.5, width) };
  }, [taskStart, taskEnd, startDate, viewType, zoomLevel]);

  const rowHeight = 50;

  return (
    <div
      className="gantt-task-row relative border-b border-gray-200 hover:bg-gray-50"
      style={{ height: `${rowHeight}px` }}
    >
      {/* Task Label */}
      <div className="absolute left-0 top-0 h-full w-64 border-r border-gray-300 bg-white flex items-center px-3 z-20">
        <div className="flex items-center gap-2 w-full">
          <div className="flex-1 truncate min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {task.category && (
                <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${
                  task.category === 'planning' ? 'bg-accent-100 text-accent-700' :
                  task.category === 'design' ? 'bg-pink-100 text-pink-700' :
                  task.category === 'frontend' ? 'bg-blue-100 text-blue-700' :
                  task.category === 'backend' ? 'bg-green-100 text-green-700' :
                  task.category === 'integration' ? 'bg-yellow-100 text-yellow-700' :
                  task.category === 'testing' ? 'bg-orange-100 text-orange-700' :
                  task.category === 'deployment' ? 'bg-red-100 text-red-700' :
                  task.category === 'documentation' ? 'bg-gray-100 text-gray-700' :
                  task.category === 'optimization' ? 'bg-cyan-100 text-cyan-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {task.category}
                </span>
              )}
              {task.sprint && (
                <span className="px-1.5 py-0.5 text-xs font-medium bg-primary-100 text-primary-700 rounded">
                  {task.sprint}
                </span>
              )}
            </div>
            <div className="text-sm font-medium text-gray-900 truncate">{task.title}</div>
            <div className="flex items-center gap-3 mt-1">
              {task.assignee && (
                <div className="text-xs text-gray-500 truncate flex items-center gap-1">
                  <span className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px]">
                    {(task.assignee.name || task.assignee.email || 'U')[0].toUpperCase()}
                  </span>
                  <span className="truncate">{task.assignee.name || task.assignee.email}</span>
                </div>
              )}
              {task.estimatedHours && (
                <div className="text-xs text-gray-400">
                  {task.actualHours || 0}h / {task.estimatedHours}h
                </div>
              )}
            </div>
          </div>
          {isCritical && (
            <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" title="Critical Path" />
          )}
        </div>
      </div>

      {/* Task Bar Area */}
      <div className="ml-64 relative h-full">
        <GanttTaskBar
          task={task}
          position={getTaskPosition}
          isCritical={isCritical}
          showProgress={showProgress}
          onReschedule={onReschedule}
          viewType={viewType}
          zoomLevel={zoomLevel}
        />
      </div>
    </div>
  );
};

export default GanttTaskRow;
