import React, { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  UserCircleIcon,
  CalendarIcon,
  FlagIcon,
  TagIcon,
  Bars3Icon,
  Squares2X2Icon,
  TableCellsIcon
} from '@heroicons/react/24/outline';
import axiosInstance from '../../../../shared/utils/axiosInstance';
import { handleApiError } from '../../utils/errorHandler';
import { CARD_TYPE, CARD_STATUS, PROJECT_PRIORITY, PRIORITY_COLORS } from '../../constants/projectConstants';

const ProjectTasks = () => {
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban', 'list', 'calendar'
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProject, setFilterProject] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [isAddingTask, setIsAddingTask] = useState(null); // column id or null
  const [draggedTask, setDraggedTask] = useState(null);

  // Card type display mapping
  const getCardTypeDisplay = (type) => {
    const types = {
      'user_story': 'User Story',
      'epic': 'Epic',
      'bug': 'Bug',
      'feature': 'Feature',
      'technical_task': 'Technical Task',
      'code_review': 'Code Review',
      'story': 'Story',
      'task': 'Task',
      'improvement': 'Improvement',
      'custom': 'Custom'
    };
    return types[type] || 'Task';
  };

  const getCardTypeIcon = (type) => {
    const icons = {
      'user_story': '👤',
      'epic': '🎯',
      'bug': '🐛',
      'feature': '✨',
      'technical_task': '⚙️',
      'code_review': '👀',
      'story': '📖',
      'task': '📋',
      'improvement': '🔧',
      'custom': '📌'
    };
    return icons[type] || '📋';
  };

  const [tasks, setTasks] = useState({
    todo: [],
    in_progress: [],
    under_review: [],
    completed: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/api/cards?groupBy=status');
      if (response.data?.success && response.data?.data) {
        const tasksData = response.data.data;
        setTasks({
          todo: tasksData[CARD_STATUS.TODO] || [],
          in_progress: tasksData[CARD_STATUS.IN_PROGRESS] || [],
          under_review: tasksData[CARD_STATUS.UNDER_REVIEW] || [],
          completed: tasksData[CARD_STATUS.COMPLETED] || []
        });
      }
    } catch (error) {
      handleApiError(error, 'Failed to load tasks', { showToast: false });
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { id: 'todo', title: 'To Do', color: 'from-gray-500 to-gray-600', count: tasks.todo.length },
    { id: 'in_progress', title: 'In Progress', color: 'from-blue-500 to-indigo-600', count: tasks.in_progress.length },
    { id: 'under_review', title: 'Under Review', color: 'from-yellow-500 to-orange-600', count: tasks.under_review.length },
    { id: 'completed', title: 'Completed', color: 'from-green-500 to-emerald-600', count: tasks.completed.length }
  ];

  const getPriorityColor = (priority) => {
    const priorityColors = PRIORITY_COLORS[priority];
    if (priorityColors) {
      return `${priorityColors.bg} ${priorityColors.text} ${priorityColors.border}`;
    }
    return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300';
  };

  const handleDragStart = (e, task, columnId) => {
    setDraggedTask({ task, sourceColumn: columnId });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetColumnId) => {
    e.preventDefault();
    
    if (!draggedTask) return;

    const { task, sourceColumn } = draggedTask;

    if (sourceColumn === targetColumnId) {
      setDraggedTask(null);
      return;
    }

    // Remove task from source column
    setTasks(prev => ({
      ...prev,
      [sourceColumn]: prev[sourceColumn].filter(t => t.id !== task.id),
      [targetColumnId]: [...prev[targetColumnId], task]
    }));

    setDraggedTask(null);
  };

  const totalTasks = Object.values(tasks).reduce((acc, col) => acc + col.length, 0);

  return (
    <div className="space-y-6">
      {/* Stats & Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex gap-4">
          <div className="glass-card-premium px-4 py-2">
            <p className="text-xs text-gray-600 dark:text-gray-400">Total Tasks</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalTasks}</p>
          </div>
          <div className="glass-card-premium px-4 py-2">
            <p className="text-xs text-gray-600 dark:text-gray-400">In Progress</p>
            <p className="text-2xl font-bold text-blue-600">{tasks.in_progress.length}</p>
          </div>
          <div className="glass-card-premium px-4 py-2">
            <p className="text-xs text-gray-600 dark:text-gray-400">Completed</p>
            <p className="text-2xl font-bold text-green-600">{tasks.completed.length}</p>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('kanban')}
            className={`glass-button px-4 py-2 rounded-xl hover-scale ${
              viewMode === 'kanban' ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white' : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            <Squares2X2Icon className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`glass-button px-4 py-2 rounded-xl hover-scale ${
              viewMode === 'list' ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white' : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            <Bars3Icon className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`glass-button px-4 py-2 rounded-xl hover-scale ${
              viewMode === 'calendar' ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white' : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            <CalendarIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card-premium p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 glass-input"
            />
          </div>
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
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="glass-input px-4 py-2"
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Kanban Board */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {columns.map((column) => (
            <div key={column.id} className="flex flex-col h-full">
              {/* Column Header */}
              <div className={`glass-card-premium p-4 mb-4 bg-gradient-to-r ${column.color}`}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-white font-bold text-sm">{column.title}</h3>
                  <span className="bg-white/30 text-white px-2 py-1 rounded-full text-xs font-bold">
                    {column.count}
                  </span>
                </div>
                <button
                  onClick={() => setIsAddingTask(column.id)}
                  className="w-full bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2"
                >
                  <PlusIcon className="w-4 h-4" />
                  Add Task
                </button>
              </div>

              {/* Tasks Container */}
              <div
                className="flex-1 space-y-3 min-h-[400px]"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, column.id)}
              >
                {tasks[column.id]
                  .filter(task => {
                    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase());
                    const matchesProject = filterProject === 'all' || task.project === filterProject;
                    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
                    return matchesSearch && matchesProject && matchesPriority;
                  })
                  .map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task, column.id)}
                      className="glass-card-premium p-4 hover-glow cursor-move group"
                    >
                      {/* Card Type and Priority */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{getCardTypeIcon(task.type)}</span>
                          <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                            {getCardTypeDisplay(task.type)}
                          </span>
                          {task.storyPoints && (
                            <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-xs font-bold">
                              {task.storyPoints}pts
                            </span>
                          )}
                        </div>
                        <FlagIcon className={`w-4 h-4 ${
                          task.priority === 'critical' ? 'text-red-600' :
                          task.priority === 'high' ? 'text-orange-600' :
                          task.priority === 'medium' ? 'text-yellow-600' :
                          'text-green-600'
                        }`} />
                      </div>
                      
                      {/* Priority Badge */}
                      <div className="mb-2">
                        <span className={`px-2 py-1 rounded-lg text-xs font-semibold border ${getPriorityColor(task.priority)}`}>
                          {task.priority.toUpperCase()}
                        </span>
                      </div>

                      {/* Task Title */}
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">
                        {task.title}
                      </h4>

                      {/* Task Description */}
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                        {task.description}
                      </p>

                      {/* Project */}
                      <p className="text-xs text-gray-500 dark:text-gray-500 mb-3">
                        📁 {task.project}
                      </p>

                      {/* Labels */}
                      {task.labels.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {task.labels.map((label) => (
                            <span
                              key={label}
                              className="px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded text-xs"
                            >
                              {label}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-xs font-bold">
                            {task.assignee.avatar}
                          </div>
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {task.assignee.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
                          <CalendarIcon className="w-3 h-3" />
                          {task.dueDate}
                        </div>
                      </div>

                      {task.attachments > 0 && (
                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                          📎 {task.attachments} attachment{task.attachments !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="glass-card-premium p-6">
          <div className="space-y-2">
            {Object.entries(tasks).flatMap(([column, columnTasks]) =>
              columnTasks
                .filter(task => {
                  const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase());
                  const matchesProject = filterProject === 'all' || task.project === filterProject;
                  const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
                  return matchesSearch && matchesProject && matchesPriority;
                })
                .map((task) => (
                  <div key={task.id} className="glass-card p-4 hover-glow flex items-center gap-4">
                    <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">{task.title}</h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{task.project}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-xs font-bold">
                        {task.assignee.avatar}
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-500">{task.dueDate}</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      column === 'todo' ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300' :
                      column === 'in_progress' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                      column === 'under_review' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                      'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                    }`}>
                      {columns.find(c => c.id === column)?.title}
                    </span>
                  </div>
                ))
            )}
          </div>
        </div>
      )}

      {/* Calendar View Placeholder */}
      {viewMode === 'calendar' && (
        <div className="glass-card-premium p-12 text-center">
          <CalendarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            Calendar View
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Calendar view with task scheduling coming soon
          </p>
        </div>
      )}
    </div>
  );
};

export default ProjectTasks;