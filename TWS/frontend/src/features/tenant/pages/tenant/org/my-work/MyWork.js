/**
 * MyWork — personal task hub for the logged-in user.
 *
 * Features:
 *  • Filter tabs: All / Due Today / This Week / Overdue / by Status
 *  • Live search (title) + Priority filter
 *  • View toggle: Flat list | Grouped by Status | Grouped by Project
 *  • Inline status update (no page navigation required)
 *  • Show-more pagination (no hard 8-task cap)
 *  • Refresh button + auto-refresh on window focus
 *  • Overdue alert banner
 *  • Context-aware Quick Actions (software-house vs general tenant)
 *  • Pending approvals widget
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTenantSlug } from '../../../../../../shared/hooks/useTenantSlug';
import {
  ClipboardDocumentCheckIcon,
  ClockIcon,
  CalendarIcon,
  PlusIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  Squares2X2Icon,
  ListBulletIcon,
  FunnelIcon,
  ChevronDownIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useTenantAuth } from '../../../../../../app/providers/TenantAuthContext';
import tenantProjectApiService from '../projects/services/tenantProjectApiService';
import CreateTaskModal from '../projects/components/CreateTaskModal';
import { CARD_STATUS, API_ENDPOINTS } from '../projects/constants/projectConstants';
import LoadingSpinner from '../../../../../../shared/components/feedback/LoadingSpinner';

// ── Constants ─────────────────────────────────────────────────────────────────
const PRIORITY_STYLES = {
  urgent: 'bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-300',
  high:   'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  low:    'bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-300',
};

const STATUS_STYLES = {
  [CARD_STATUS.TODO]:         'bg-gray-100   text-gray-700   dark:bg-gray-800      dark:text-gray-300',
  [CARD_STATUS.IN_PROGRESS]:  'bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-300',
  [CARD_STATUS.UNDER_REVIEW]: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  [CARD_STATUS.COMPLETED]:    'bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-300',
};

const STATUS_LABELS = {
  [CARD_STATUS.TODO]:         'To Do',
  [CARD_STATUS.IN_PROGRESS]:  'In Progress',
  [CARD_STATUS.UNDER_REVIEW]: 'Under Review',
  [CARD_STATUS.COMPLETED]:    'Completed',
};

const FILTER_TABS = [
  { id: 'all',                      label: 'All' },
  { id: 'today',                    label: 'Due Today' },
  { id: 'week',                     label: 'This Week' },
  { id: 'overdue',                  label: 'Overdue' },
  { id: CARD_STATUS.TODO,           label: 'To Do' },
  { id: CARD_STATUS.IN_PROGRESS,    label: 'In Progress' },
  { id: CARD_STATUS.UNDER_REVIEW,   label: 'Under Review' },
  { id: CARD_STATUS.COMPLETED,      label: 'Done' },
];

const PRIORITY_OPTIONS = ['', 'urgent', 'high', 'medium', 'low'];
const PAGE_SIZE = 12;
const PANEL_CLASS =
  'rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900';

const QUICK_ACTION_STYLES = {
  blue: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-600 dark:text-blue-400',
  },
  green: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-600 dark:text-green-400',
  },
  purple: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-600 dark:text-purple-400',
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const isOverdue = (task) =>
  task.dueDate && new Date(task.dueDate) < new Date() && task.status !== CARD_STATUS.COMPLETED;

const fmtDate = (d) => {
  if (!d) return null;
  const date = new Date(d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((date - today) / 86400000);
  if (diff < 0)   return { label: `${Math.abs(diff)}d overdue`, cls: 'text-red-600 dark:text-red-400' };
  if (diff === 0) return { label: 'Due today',                  cls: 'text-amber-600 dark:text-amber-400' };
  if (diff === 1) return { label: 'Due tomorrow',               cls: 'text-amber-500 dark:text-amber-300' };
  return { label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), cls: 'text-gray-400 dark:text-gray-500' };
};

// ── Sub-components ────────────────────────────────────────────────────────────
const StatCard = ({ label, value, icon: Icon, iconBg, iconColor, valueColor, isUrgent }) => (
  <div className={`${PANEL_CLASS} ${isUrgent ? 'border-red-200 dark:border-red-800' : ''}`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
        <p className={`text-3xl font-bold mt-1 leading-none ${valueColor || 'text-gray-900 dark:text-white'}`}>{value}</p>
      </div>
      <div className={`p-2.5 ${iconBg} rounded-lg`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
    </div>
  </div>
);

const StatusDropdown = ({ taskId, currentStatus, onSelect, updatingId }) => {
  const statuses = Object.values(CARD_STATUS);
  return (
    <div className="absolute left-0 top-full mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-1 min-w-[150px]">
      {statuses.map(s => (
        <button
          key={s}
          onClick={(e) => { e.stopPropagation(); onSelect(taskId, s); }}
          disabled={s === currentStatus || updatingId === taskId}
          className={`w-full text-left px-3 py-1.5 text-xs font-medium transition-colors
            ${s === currentStatus ? 'opacity-50 cursor-default' : 'hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer'}
          `}
        >
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full ${STATUS_STYLES[s]}`}>
            {STATUS_LABELS[s]}
          </span>
        </button>
      ))}
    </div>
  );
};

const TaskCard = ({ task, onStatusChange, statusMenuId, onToggleStatusMenu, updatingId, navigate, tenantSlug }) => {
  const due      = fmtDate(task.dueDate);
  const overdue  = isOverdue(task);
  const updating = updatingId === (task._id || task.id);

  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md dark:border-gray-800 dark:bg-gray-900 transition-all duration-200 cursor-pointer group relative
        ${overdue ? 'border-l-2 border-red-400' : ''}
      `}
      onClick={() => navigate(`/${tenantSlug}/org/projects/tasks?taskId=${task._id || task.id}`)}
    >
      <div className="flex items-start gap-3">
        {/* Status badge — inline update trigger */}
        <div className="relative shrink-0" onClick={e => e.stopPropagation()}>
          <button
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium
              ${STATUS_STYLES[task.status] || STATUS_STYLES[CARD_STATUS.TODO]}
              ${updating ? 'opacity-60 cursor-wait' : 'hover:opacity-80 cursor-pointer'}
            `}
            onClick={() => onToggleStatusMenu(task._id || task.id)}
            title="Click to change status"
          >
            {updating
              ? <span className="tws-loading-pulse h-2.5 w-2.5 border border-current border-t-transparent rounded-full inline-block" />
              : null
            }
            {STATUS_LABELS[task.status] || 'To Do'}
            <ChevronDownIcon className="w-2.5 h-2.5 opacity-60" />
          </button>
          {statusMenuId === (task._id || task.id) && (
            <StatusDropdown
              taskId={task._id || task.id}
              currentStatus={task.status}
              onSelect={onStatusChange}
              updatingId={updatingId}
            />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate leading-snug">
            {task.title || task.name}
          </p>
          {task.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
              {task.description}
            </p>
          )}
          <div className="flex items-center gap-2 flex-wrap mt-1.5">
            {task.priority && (
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium capitalize ${PRIORITY_STYLES[task.priority] || ''}`}>
                {task.priority}
              </span>
            )}
            {task.project?.name && (
              <span className="text-[11px] text-gray-400 dark:text-gray-500 truncate max-w-[120px]">
                {task.project.name}
              </span>
            )}
          </div>
        </div>

        {/* Due date */}
        {due && (
          <div className={`shrink-0 flex items-center gap-1 text-[11px] font-medium ${due.cls}`}>
            <CalendarIcon className="w-3.5 h-3.5" />
            {due.label}
          </div>
        )}

        {/* Navigate arrow */}
        <ArrowRightIcon className="w-4 h-4 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const MyWork = () => {
  const tenantSlug = useTenantSlug();
  const navigate        = useNavigate();
  const { user, tenant } = useTenantAuth();
  const isSH            = tenant?.erpCategory === 'software_house';

  // ── Data state ──────────────────────────────────────────────────────────────
  const [loading,    setLoading]    = useState(true);
  const [myTasks,    setMyTasks]    = useState({ todo: [], in_progress: [], under_review: [], completed: [] });
  const [stats,      setStats]      = useState({ totalTasks: 0, completedTasks: 0, inProgressTasks: 0, overdueTasks: 0 });
  const [projects,   setProjects]   = useState([]);
  const [approvals,  setApprovals]  = useState([]);

  // ── UI state ────────────────────────────────────────────────────────────────
  const [filter,       setFilter]       = useState('all');
  const [search,       setSearch]       = useState('');
  const [priority,     setPriority]     = useState('');
  const [viewMode,     setViewMode]     = useState('list');  // 'list' | 'status' | 'project'
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [statusMenu,   setStatusMenu]   = useState(null);
  const [updatingId,   setUpdatingId]   = useState(null);
  const [showCreate,   setShowCreate]   = useState(false);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const priorityBtnRef = useRef(null);

  // ── Fetch tasks ─────────────────────────────────────────────────────────────
  const loadTasks = useCallback(async () => {
    if (!user?.id || !tenantSlug) return;
    setLoading(true);
    try {
      const data = await tenantProjectApiService.getProjectTasks(tenantSlug, {
        groupBy: 'status',
        assigneeId: user.id,
      });

      let grouped = { todo: [], in_progress: [], under_review: [], completed: [] };

      if (data?.tasks) {
        grouped = {
          todo:         data.tasks[CARD_STATUS.TODO]         || [],
          in_progress:  data.tasks[CARD_STATUS.IN_PROGRESS]  || [],
          under_review: data.tasks[CARD_STATUS.UNDER_REVIEW] || [],
          completed:    data.tasks[CARD_STATUS.COMPLETED]    || [],
        };
      } else if (Array.isArray(data)) {
        const me = data.filter(t =>
          t.assigneeId === user.id || t.assignee?.id === user.id || t.assignee?._id === user.id
        );
        me.forEach(t => {
          const s = t.status || CARD_STATUS.TODO;
          if (grouped[s]) grouped[s].push(t);
        });
      }

      setMyTasks(grouped);

      const all       = Object.values(grouped).flat();
      const completed = grouped.completed.length;
      const inProg    = grouped.in_progress.length;
      const overdue   = all.filter(isOverdue).length;
      setStats({ totalTasks: all.length, completedTasks: completed, inProgressTasks: inProg, overdueTasks: overdue });
    } catch (e) {
      console.error('MyWork: failed to load tasks', e);
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, user?.id]);

  // ── Fetch projects ───────────────────────────────────────────────────────────
  const loadProjects = useCallback(async () => {
    if (!user?.id || !tenantSlug) return;
    try {
      const data = await tenantProjectApiService.getProjects(tenantSlug);
      const list  = Array.isArray(data) ? data : (data?.projects || []);
      const mine  = list.filter(p =>
        p.teamMembers?.some(m => m.userId === user.id || m.user?._id === user.id || m.user?.id === user.id)
        || p.createdBy === user.id
      ).slice(0, 5);
      setProjects(mine);
    } catch { /* silent */ }
  }, [tenantSlug, user?.id]);

  // ── Fetch approvals ──────────────────────────────────────────────────────────
  const loadApprovals = useCallback(async () => {
    if (!tenantSlug) return;
    try {
      const res  = await fetch(API_ENDPOINTS.APPROVALS_PENDING(tenantSlug), { credentials: 'include' });
      if (!res.ok) return;
      const json = await res.json();
      setApprovals((json.data || json || []).slice(0, 5));
    } catch { /* silent */ }
  }, [tenantSlug]);

  // ── Initial load + window focus refresh ─────────────────────────────────────
  useEffect(() => {
    loadTasks();
    loadProjects();
    loadApprovals();
  }, [loadTasks, loadProjects, loadApprovals]);

  useEffect(() => {
    const onFocus = () => { loadTasks(); loadApprovals(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [loadTasks, loadApprovals]);

  // ── Close dropdowns on outside click ────────────────────────────────────────
  useEffect(() => {
    const handler = () => { setStatusMenu(null); setShowPriorityMenu(false); };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // ── Inline status update ─────────────────────────────────────────────────────
  const handleStatusChange = useCallback(async (taskId, newStatus) => {
    setUpdatingId(taskId);
    setStatusMenu(null);
    try {
      await tenantProjectApiService.updateTask(tenantSlug, taskId, { status: newStatus });
      setMyTasks(prev => {
        const all  = Object.values(prev).flat();
        const task = all.find(t => (t._id || t.id) === taskId);
        if (!task) return prev;
        const next = { ...prev };
        const old  = task.status || CARD_STATUS.TODO;
        next[old]      = (next[old] || []).filter(t => (t._id || t.id) !== taskId);
        next[newStatus] = [...(next[newStatus] || []), { ...task, status: newStatus }];
        return next;
      });
      setStats(prev => {
        const all = Object.values(myTasks).flat();
        const overdue = all.map(t => (t._id || t.id) === taskId ? { ...t, status: newStatus } : t).filter(isOverdue).length;
        return {
          ...prev,
          completedTasks:  newStatus === CARD_STATUS.COMPLETED ? prev.completedTasks + 1 : prev.completedTasks - (myTasks.completed.some(t => (t._id || t.id) === taskId) ? 1 : 0),
          inProgressTasks: newStatus === CARD_STATUS.IN_PROGRESS ? prev.inProgressTasks + 1 : prev.inProgressTasks,
          overdueTasks: overdue,
        };
      });
    } catch (e) {
      console.error('Failed to update task status', e);
    } finally {
      setUpdatingId(null);
    }
  }, [tenantSlug, myTasks]);

  // ── Filtering logic ──────────────────────────────────────────────────────────
  const allTasks = [
    ...myTasks.todo,
    ...myTasks.in_progress,
    ...myTasks.under_review,
    ...myTasks.completed,
  ];

  const today   = new Date(); today.setHours(23, 59, 59, 999);
  const weekEnd = new Date(); weekEnd.setDate(weekEnd.getDate() + 7); weekEnd.setHours(23, 59, 59, 999);

  const filtered = allTasks
    .filter(t => search ? (t.title || t.name || '').toLowerCase().includes(search.toLowerCase()) : true)
    .filter(t => priority ? t.priority === priority : true)
    .filter(t => {
      if (filter === 'all')      return true;
      if (filter === 'today')    return t.dueDate && new Date(t.dueDate) <= today;
      if (filter === 'week')     return t.dueDate && new Date(t.dueDate) <= weekEnd;
      if (filter === 'overdue')  return isOverdue(t);
      return t.status === filter;
    });

  // ── Grouped views ────────────────────────────────────────────────────────────
  const byStatus = Object.values(CARD_STATUS).map(s => ({
    status: s,
    label:  STATUS_LABELS[s],
    style:  STATUS_STYLES[s],
    tasks:  filtered.filter(t => t.status === s),
  })).filter(g => g.tasks.length > 0);

  const byProject = Object.values(
    filtered.reduce((acc, t) => {
      const key = t.project?.name || t.project?._id || '—';
      if (!acc[key]) acc[key] = { name: t.project?.name || 'No project', tasks: [] };
      acc[key].tasks.push(t);
      return acc;
    }, {})
  );

  // ── Quick actions (context-aware) ────────────────────────────────────────────
  const hrBase = isSH ? `/${tenantSlug}/org/software-house/hr` : `/${tenantSlug}/org/hr`;
  const QUICK_ACTIONS = [
    { label: 'Log Time',      desc: 'Track hours',        icon: ClockIcon,        color: 'blue',
      path: isSH ? `/${tenantSlug}/org/software-house/time-tracking` : `/${tenantSlug}/org/hr` },
    { label: 'Request Leave', desc: 'Submit leave',       icon: CalendarIcon,     color: 'green',
      path: `${hrBase}/leave-requests` },
    { label: 'Attendance',    desc: 'Check in / out',     icon: CheckCircleIcon,  color: 'purple',
      path: `/${tenantSlug}/org/employee/attendance` },
  ];

  const MY_LINKS = [
    { label: 'My Leave',    path: `${hrBase}/leave-requests` },
    { label: 'My Payroll',  path: `${hrBase}/payroll` },
    { label: 'My Expenses', path: `/${tenantSlug}/org/finance/time-expenses` },
    { label: 'My Profile',  path: `/${tenantSlug}/org/employee/profile` },
  ];

  const handleTaskCreated = () => { setShowCreate(false); loadTasks(); };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) return (
    <LoadingSpinner message="Loading your work..." className="min-h-[40vh] bg-transparent" />
  );

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 animate-fade-in pb-8" onClick={() => setStatusMenu(null)}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className={`${PANEL_CLASS} flex flex-wrap items-center justify-between gap-3`}>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white leading-tight">My Work</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            {user?.fullName || user?.email || 'Your'} tasks &amp; activity
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={() => { loadTasks(); loadApprovals(); }}
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Refresh"
          >
            <ArrowPathIcon className="w-4 h-4" />
          </button>
          <button
           
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg font-semibold text-sm hover:bg-primary-700 transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            Add Task
          </button>
        </div>
      </div>

      {/* ── Overdue alert ───────────────────────────────────────────────────── */}
      {stats.overdueTasks > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm">
          <ExclamationTriangleIcon className="w-4 h-4 text-red-500 shrink-0" />
          <span className="text-red-700 dark:text-red-300 font-medium">
            {stats.overdueTasks} task{stats.overdueTasks > 1 ? 's are' : ' is'} overdue
          </span>
          <button
            onClick={() => setFilter('overdue')}
            className="ml-auto text-red-600 dark:text-red-400 text-xs font-semibold hover:underline"
          >
            View overdue →
          </button>
        </div>
      )}

      {/* ── Stats ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-flow-col auto-cols-[minmax(180px,1fr)] lg:grid-flow-row lg:grid-cols-4 gap-3 overflow-x-auto pb-1">
        <StatCard label="Overdue"      value={stats.overdueTasks}    icon={ExclamationTriangleIcon}
          iconBg="bg-red-50 dark:bg-red-900/30"       iconColor="text-red-600 dark:text-red-400" isUrgent={stats.overdueTasks > 0}
          valueColor={stats.overdueTasks > 0 ? 'text-red-600 dark:text-red-400' : undefined} />
        <StatCard label="In Progress"  value={stats.inProgressTasks} icon={ClockIcon}
          iconBg="bg-indigo-50 dark:bg-indigo-900/30" iconColor="text-indigo-600 dark:text-indigo-400" valueColor="text-indigo-600 dark:text-indigo-400" />
        <StatCard label="Completed"    value={stats.completedTasks}  icon={CheckCircleIcon}
          iconBg="bg-green-50 dark:bg-green-900/30"   iconColor="text-green-600 dark:text-green-400"  valueColor="text-green-600 dark:text-green-400" />
        <StatCard label="Total Tasks"  value={stats.totalTasks}     icon={ClipboardDocumentCheckIcon}
          iconBg="bg-blue-50 dark:bg-blue-900/30"    iconColor="text-blue-600 dark:text-blue-400" />
      </div>

      {/* ── Main content + sidebar ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Task panel (left 2/3) ────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Filter bar */}
          <div className={`${PANEL_CLASS} space-y-3`}>

            {/* Search + priority + view toggle */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative flex-1 min-w-[160px]">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search tasks…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-8 h-11 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 dark:text-gray-100 placeholder-gray-400"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <XMarkIcon className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                onClick={() => setShowMobileFilters(prev => !prev)}
                className="sm:hidden flex items-center gap-1.5 px-3 h-11 text-sm border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800"
              >
                <FunnelIcon className="w-4 h-4" />
                Filters
              </button>
            </div>

            <div className={`${showMobileFilters ? 'flex' : 'hidden'} sm:flex flex-col gap-3`}>
              {/* Priority filter */}
              <div className="relative" ref={priorityBtnRef}>
                <button
                  onClick={e => { e.stopPropagation(); setShowPriorityMenu(p => !p); }}
                  className={`flex items-center gap-1.5 px-3 h-11 text-sm border rounded-lg transition-colors
                    ${priority
                      ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                >
                  <FunnelIcon className="w-3.5 h-3.5" />
                  {priority ? priority.charAt(0).toUpperCase() + priority.slice(1) : 'Priority'}
                  <ChevronDownIcon className="w-3 h-3 opacity-60" />
                </button>
                {showPriorityMenu && (
                  <div
                    onClick={e => e.stopPropagation()}
                    className="absolute left-0 top-full mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-1 min-w-[120px]"
                  >
                    {PRIORITY_OPTIONS.map(p => (
                      <button
                        key={p}
                        onClick={() => { setPriority(p); setShowPriorityMenu(false); }}
                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
                          ${priority === p ? 'font-semibold text-primary-600 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'}`}
                      >
                        {p ? p.charAt(0).toUpperCase() + p.slice(1) : 'All priorities'}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* View toggle */}
              <div className="flex items-center h-11 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-800">
                {[
                  { id: 'list',    icon: ListBulletIcon,  title: 'List' },
                  { id: 'status',  icon: Squares2X2Icon,  title: 'By Status' },
                  { id: 'project', icon: FunnelIcon,      title: 'By Project' },
                ].map(({ id, icon: Icon, title }) => (
                  <button
                    key={id}
                    onClick={() => setViewMode(id)}
                    title={title}
                    className={`h-full px-3 transition-colors ${viewMode === id
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                ))}
              </div>
            </div>

            {/* Tab filters */}
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {FILTER_TABS.map(tab => {
                const count = tab.id === 'all'     ? allTasks.length
                            : tab.id === 'today'   ? allTasks.filter(t => t.dueDate && new Date(t.dueDate) <= today).length
                            : tab.id === 'week'    ? allTasks.filter(t => t.dueDate && new Date(t.dueDate) <= weekEnd).length
                            : tab.id === 'overdue' ? stats.overdueTasks
                            : (myTasks[tab.id] || []).length;
                return (
                  <button
                    key={tab.id}
                    onClick={() => { setFilter(tab.id); setVisibleCount(PAGE_SIZE); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5
                      ${filter === tab.id
                        ? 'bg-primary-600 text-white'
                        : tab.id === 'overdue'
                          ? 'text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                  >
                    {tab.label}
                    {count > 0 && (
                      <span className={`rounded-full px-1.5 py-0 text-[10px] font-bold
                        ${filter === tab.id ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}
                        ${tab.id === 'overdue' && count > 0 && filter !== tab.id ? '!bg-red-100 dark:!bg-red-900/30 !text-red-600 dark:!text-red-400' : ''}
                      `}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Task list ─────────────────────────────────────────────────── */}
          {filtered.length === 0 ? (
            <div className="glass-card-premium py-16 text-center">
              <ClipboardDocumentCheckIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">No tasks match this filter</p>
              <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">Try a different filter or add a new task</p>
              <button
                onClick={() => setShowCreate(true)}
                className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
              >
                Add Task
              </button>
            </div>
          ) : viewMode === 'list' ? (
            /* Flat list */
            <div className="space-y-2">
              {filtered.slice(0, visibleCount).map(task => (
                <TaskCard
                  key={task._id || task.id}
                  task={task}
                  onStatusChange={handleStatusChange}
                  statusMenuId={statusMenu}
                  onToggleStatusMenu={id => { setStatusMenu(prev => prev === id ? null : id); }}
                  updatingId={updatingId}
                  navigate={navigate}
                  tenantSlug={tenantSlug}
                />
              ))}
              {filtered.length > visibleCount && (
                <button
                  onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
                  className="w-full py-2.5 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-xl border border-primary-200 dark:border-primary-800 transition-colors"
                >
                  Show more ({filtered.length - visibleCount} remaining)
                </button>
              )}
            </div>
          ) : viewMode === 'status' ? (
            /* Grouped by status */
            <div className="space-y-4">
              {byStatus.map(group => (
                <div key={group.status} className={`${PANEL_CLASS} overflow-hidden`}>
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 dark:border-gray-700/60">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${group.style}`}>
                      {group.label}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">{group.tasks.length} task{group.tasks.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="p-3 space-y-2">
                    {group.tasks.map(task => (
                      <TaskCard
                        key={task._id || task.id}
                        task={task}
                        onStatusChange={handleStatusChange}
                        statusMenuId={statusMenu}
                        onToggleStatusMenu={id => setStatusMenu(prev => prev === id ? null : id)}
                        updatingId={updatingId}
                        navigate={navigate}
                        tenantSlug={tenantSlug}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Grouped by project */
            <div className="space-y-4">
              {byProject.map(group => (
                <div key={group.name} className={`${PANEL_CLASS} overflow-hidden`}>
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 dark:border-gray-700/60">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{group.name}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">{group.tasks.length}</span>
                  </div>
                  <div className="p-3 space-y-2">
                    {group.tasks.map(task => (
                      <TaskCard
                        key={task._id || task.id}
                        task={task}
                        onStatusChange={handleStatusChange}
                        statusMenuId={statusMenu}
                        onToggleStatusMenu={id => setStatusMenu(prev => prev === id ? null : id)}
                        updatingId={updatingId}
                        navigate={navigate}
                        tenantSlug={tenantSlug}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Sidebar (right 1/3) ──────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Pending Approvals */}
          {approvals.length > 0 && (
            <div className={PANEL_CLASS}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  Pending Approvals
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full">
                    {approvals.length}
                  </span>
                </h2>
              </div>
              <div className="space-y-2">
                {approvals.map((a, i) => (
                  <button
                    key={a._id || i}
                    onClick={() => navigate(`/${tenantSlug}/org/projects/approvals`)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                  >
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{a.title || a.name || 'Approval request'}</p>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Awaiting your review</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className={PANEL_CLASS}>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Quick Actions</h2>
            <div className="space-y-2">
              {QUICK_ACTIONS.map(({ label, desc, icon: Icon, color, path }) => (
                <button
                  key={label}
                  onClick={() => navigate(path)}
                  className="w-full rounded-xl border border-gray-200 bg-white p-3 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 text-left flex items-center gap-3 transition-all"
                >
                  <div className={`p-2 rounded-lg shrink-0 ${(QUICK_ACTION_STYLES[color] || QUICK_ACTION_STYLES.blue).bg}`}>
                    <Icon className={`w-4 h-4 ${(QUICK_ACTION_STYLES[color] || QUICK_ACTION_STYLES.blue).text}`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* My Links */}
          <div className={PANEL_CLASS}>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-3">My Links</h2>
            <div className="space-y-1">
              {MY_LINKS.map(({ label, path }) => (
                <button
                  key={label}
                  onClick={() => navigate(path)}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex items-center justify-between group"
                >
                  {label}
                  <ArrowRightIcon className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>

          {/* Recent Projects */}
          {projects.length > 0 && (
            <div className={PANEL_CLASS}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-gray-900 dark:text-white">My Projects</h2>
                <button onClick={() => navigate(`/${tenantSlug}/org/projects`)} className="text-xs text-primary-600 dark:text-primary-400 hover:underline">
                  All →
                </button>
              </div>
              <div className="space-y-1">
                {projects.map(p => (
                  <button
                    key={p.slug || p._id || p.id}
                    onClick={() => navigate(`/${tenantSlug}/org/projects/${p.slug || p._id || p.id}/board`)}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex items-center justify-between group"
                  >
                    <span className="truncate">{p.name || p.title}</span>
                    <ArrowRightIcon className="w-3.5 h-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Create Task Modal ──────────────────────────────────────────────── */}
      {showCreate && (
        <CreateTaskModal
          isOpen={showCreate}
          onClose={() => setShowCreate(false)}
          onTaskCreated={handleTaskCreated}
          defaultAssigneeId={user?.id}
        />
      )}

      <div className="sm:hidden fixed bottom-4 left-4 right-4 z-40 rounded-2xl border border-gray-200 bg-white/95 backdrop-blur p-2 shadow-lg dark:border-gray-800 dark:bg-gray-900/95">
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => { loadTasks(); loadApprovals(); }}
            className="col-span-1 h-11 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Refresh"
          >
            <ArrowPathIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="col-span-2 h-11 rounded-lg bg-primary-600 text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-primary-700"
          >
            <PlusIcon className="w-4 h-4" />
            Add Task
          </button>
        </div>
      </div>
    </div>
  );
};

export default MyWork;
