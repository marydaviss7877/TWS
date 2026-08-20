/**
 * Gantt Task Bar Component
 * Individual task bar with drag-to-reschedule functionality
 */

import React, { useState, useRef } from 'react';

const GanttTaskBar = ({
  task,
  position,
  isCritical,
  showProgress,
  onReschedule,
  viewType,
  zoomLevel
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const barRef = useRef(null);

  const getTaskColor = () => {
    // Color by category for software house projects
    if (task.category) {
      if (isCritical) {
        return task.category === 'frontend' ? 'bg-blue-600' :
               task.category === 'backend' ? 'bg-green-600' :
               task.category === 'testing' ? 'bg-orange-600' :
               task.category === 'deployment' ? 'bg-red-600' :
               'bg-accent-600';
      }
      return task.category === 'planning' ? 'bg-accent-500' :
             task.category === 'design' ? 'bg-pink-500' :
             task.category === 'frontend' ? 'bg-blue-500' :
             task.category === 'backend' ? 'bg-green-500' :
             task.category === 'integration' ? 'bg-yellow-500' :
             task.category === 'testing' ? 'bg-orange-500' :
             task.category === 'deployment' ? 'bg-red-500' :
             task.category === 'documentation' ? 'bg-gray-500' :
             task.category === 'optimization' ? 'bg-cyan-500' :
             'bg-blue-500';
    }
    // Fallback to priority/status
    if (isCritical) return 'bg-red-500';
    if (task.priority === 'critical' || task.priority === 'urgent') return 'bg-orange-500';
    if (task.priority === 'high') return 'bg-yellow-500';
    if (task.status === 'completed') return 'bg-green-500';
    return 'bg-blue-500';
  };

  const progress = task.progress || 0;
  const taskStart = task.startDate ? new Date(task.startDate) : null;
  const taskEnd = task.endDate || task.dueDate ? new Date(task.endDate || task.dueDate) : null;

  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // Only left mouse button
    setIsDragging(true);
    setDragStart({ x: e.clientX, initialLeft: position.left });
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !dragStart) return;

    const deltaX = e.clientX - dragStart.x;
    const newLeft = Math.max(0, dragStart.initialLeft + deltaX);

    // Update visual position
    if (barRef.current) {
      barRef.current.style.left = `${newLeft}px`;
    }
  };

  const handleMouseUp = async (e) => {
    if (!isDragging || !dragStart) return;

    const deltaX = e.clientX - dragStart.x;
    const getColumnWidth = () => {
      const baseWidth = viewType === 'daily' ? 60 : viewType === 'weekly' ? 80 : viewType === 'monthly' ? 120 : 150;
      return baseWidth * zoomLevel;
    };

    const daysPerColumn = viewType === 'daily' ? 1 : viewType === 'weekly' ? 7 : viewType === 'monthly' ? 30 : 90;
    const daysMoved = Math.round((deltaX / getColumnWidth()) * daysPerColumn);

    if (daysMoved !== 0 && taskStart) {
      const newStartDate = new Date(taskStart);
      newStartDate.setDate(newStartDate.getDate() + daysMoved);

      let newEndDate = null;
      if (taskEnd) {
        newEndDate = new Date(taskEnd);
        newEndDate.setDate(newEndDate.getDate() + daysMoved);
      } else {
        // If no end date, assume 1 day duration
        newEndDate = new Date(newStartDate);
        newEndDate.setDate(newEndDate.getDate() + 1);
      }

      try {
        await onReschedule(task._id, newStartDate.toISOString(), newEndDate.toISOString(), false);
      } catch (error) {
        console.error('Failed to reschedule task:', error);
        // Reset position on error
        if (barRef.current) {
          barRef.current.style.left = `${position.left}px`;
        }
      }
    } else {
      // Reset position if no movement
      if (barRef.current) {
        barRef.current.style.left = `${position.left}px`;
      }
    }

    setIsDragging(false);
    setDragStart(null);
  };

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  return (
    <div
      ref={barRef}
      className={`absolute top-1/2 -translate-y-1/2 h-6 rounded cursor-move ${getTaskColor()} ${
        isDragging ? 'opacity-75 shadow-lg' : 'hover:shadow-md'
      } ${isCritical ? 'ring-2 ring-red-300' : ''}`}
      style={{
        left: `${position.left}px`,
        width: `${position.width}px`,
        minWidth: '20px'
      }}
      onMouseDown={handleMouseDown}
      title={`${task.title}${taskEnd ? ` (${taskEnd.toLocaleDateString()})` : ''}`}
    >
      {/* Progress Indicator */}
      {showProgress && progress > 0 && (
        <div
          className="h-full bg-green-400 rounded-l"
          style={{ width: `${progress}%` }}
        />
      )}
      
      {/* Task Label on Bar */}
      {position.width > 80 && (
        <div className="absolute inset-0 flex items-center px-2 text-xs text-white font-medium truncate">
          {task.title}
        </div>
      )}
    </div>
  );
};

export default GanttTaskBar;
