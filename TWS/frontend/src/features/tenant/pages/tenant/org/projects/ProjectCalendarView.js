/**
 * Project Calendar View — enhanced monthly calendar with priority-coloured
 * task pills, milestone flags, today highlight, day-click detail panel, and legend.
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarDaysIcon,
  FlagIcon,
  XMarkIcon,
  PlusIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import tenantProjectApiService from './services/tenantProjectApiService';
import LoadingSpinner from '../../../../../../shared/components/feedback/LoadingSpinner';

/* ─── constants ─────────────────────────────────────────────────────────────── */
const DAYS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const PRIORITY_PILL = {
  urgent:   'bg-red-100    dark:bg-red-900/40    text-red-700    dark:text-red-300',
  critical: 'bg-red-100    dark:bg-red-900/40    text-red-700    dark:text-red-300',
  high:     'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300',
  medium:   'bg-blue-100   dark:bg-blue-900/40   text-blue-700   dark:text-blue-300',
  low:      'bg-green-100  dark:bg-green-900/40  text-green-700  dark:text-green-300',
};

const STATUS_LABEL = {
  todo: 'To Do', in_progress: 'Started', under_review: 'Review', completed: 'Done',
};

const STATUS_COLOR = {
  todo:         'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300',
  in_progress:  'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  under_review: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  completed:    'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
};

/* ─── helpers ────────────────────────────────────────────────────────────────── */
function toKey(d) {
  if (!d) return '';
  const x = d instanceof Date ? d : new Date(d);
  if (isNaN(x)) return '';
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

function buildCells(year, month) {
  const first      = new Date(year, month, 1);
  const startPad   = first.getDay();
  const daysInMon  = new Date(year, month + 1, 0).getDate();
  const prevDays   = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = startPad - 1; i >= 0; i--)
    cells.push({ date: prevDays - i, current: false, full: new Date(year, month - 1, prevDays - i) });
  for (let d = 1; d <= daysInMon; d++)
    cells.push({ date: d, current: true, full: new Date(year, month, d) });
  const rem = 42 - cells.length;
  for (let r = 1; r <= rem; r++)
    cells.push({ date: r, current: false, full: new Date(year, month + 1, r) });
  return cells;
}

function initials(name = '') {
  return name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
}

/* ─── component ──────────────────────────────────────────────────────────────── */
const ProjectCalendarView = () => {
  const { tenantSlug, projectId } = useParams();
  const today     = new Date(); today.setHours(0, 0, 0, 0);
  const todayKey  = toKey(today);

  const [cur, setCur]             = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [tasks, setTasks]         = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    if (!tenantSlug || !projectId) return;
    setLoading(true);
    Promise.all([
      tenantProjectApiService.getProjectTasks(tenantSlug, { projectId }).catch(() => null),
      tenantProjectApiService.getProjectMilestones(tenantSlug, { projectId }).catch(() => null),
    ]).then(([tr, mr]) => {
      const raw  = tr?.data?.tasks ?? tr?.tasks;
      const list = Array.isArray(raw) ? raw : (raw ? Object.values(raw).flat() : []);
      setTasks(list);
      const mlist = Array.isArray(mr?.milestones) ? mr.milestones : (mr?.data?.milestones || []);
      setMilestones(mlist);
    }).finally(() => setLoading(false));
  }, [tenantSlug, projectId]);

  /* ── build day→items map ── */
  const itemsByDay = {};
  tasks.forEach(t => {
    const key = toKey(t.dueDate || t.startDate || t.createdAt);
    if (!key) return;
    if (!itemsByDay[key]) itemsByDay[key] = { tasks: [], milestones: [] };
    itemsByDay[key].tasks.push(t);
  });
  milestones.forEach(m => {
    const key = toKey(m.dueDate || m.targetDate || m.date || m.createdAt);
    if (!key) return;
    if (!itemsByDay[key]) itemsByDay[key] = { tasks: [], milestones: [] };
    itemsByDay[key].milestones.push(m);
  });

  /* ── navigation ── */
  const prevMonth = () => setCur(m => m.month === 0  ? { year: m.year - 1, month: 11 } : { year: m.year, month: m.month - 1 });
  const nextMonth = () => setCur(m => m.month === 11 ? { year: m.year + 1, month: 0  } : { year: m.year, month: m.month + 1 });
  const goToday   = () => { setCur({ year: today.getFullYear(), month: today.getMonth() }); setSelectedDay(null); };

  /* ── stats ── */
  const monthTasks = Object.entries(itemsByDay)
    .filter(([k]) => { const [y, mo] = k.split('-').map(Number); return y === cur.year && mo === cur.month + 1; })
    .flatMap(([, v]) => v.tasks);
  const overdueTasks = monthTasks.filter(t => t.dueDate && t.status !== 'completed' && new Date(t.dueDate) < today);

  const cells        = buildCells(cur.year, cur.month);
  const selectedItems = selectedDay ? (itemsByDay[selectedDay] || { tasks: [], milestones: [] }) : null;

  if (loading) {
    return <LoadingSpinner message="Loading calendar..." className="min-h-[40vh] bg-transparent" />;
  }

  return (
    <div className="p-4 space-y-4 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <CalendarDaysIcon className="w-5 h-5 text-amber-500" />
            Calendar
          </h2>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
            <span>{monthTasks.length} task{monthTasks.length !== 1 ? 's' : ''} this month</span>
            {overdueTasks.length > 0 && (
              <span className="flex items-center gap-1 text-red-500 font-medium">
                <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                {overdueTasks.length} overdue
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={goToday}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            Today
          </button>
          <button onClick={prevMonth}
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <ChevronLeftIcon className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-gray-900 dark:text-white min-w-[140px] text-center">
            {MONTHS[cur.month]} {cur.year}
          </span>
          <button onClick={nextMonth}
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Calendar grid ── */}
      <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
          {DAYS.map(d => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {d}
            </div>
          ))}
        </div>

        {/* Cell grid */}
        <div className="grid grid-cols-7 divide-x divide-y divide-gray-100 dark:divide-gray-800">
          {cells.map((cell, idx) => {
            const key      = toKey(cell.full);
            const items    = itemsByDay[key] || { tasks: [], milestones: [] };
            const hasItems = items.tasks.length > 0 || items.milestones.length > 0;
            const isToday    = key === todayKey;
            const isSelected = selectedDay === key;

            return (
              <div
                key={idx}
                onClick={() => hasItems && setSelectedDay(isSelected ? null : key)}
                className={[
                  'min-h-[96px] p-1.5 group relative transition-colors',
                  cell.current ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/80 dark:bg-gray-900/60',
                  hasItems ? 'cursor-pointer hover:bg-amber-50/60 dark:hover:bg-amber-900/10' : '',
                  isSelected ? 'ring-2 ring-inset ring-amber-400 bg-amber-50/60 dark:bg-amber-900/10' : '',
                ].join(' ')}
              >
                {/* Date number + add button */}
                <div className="flex items-center justify-between mb-1">
                  <span className={[
                    'w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold',
                    isToday
                      ? 'bg-primary-500 text-white'
                      : cell.current
                        ? 'text-gray-900 dark:text-white'
                        : 'text-gray-400 dark:text-gray-600',
                  ].join(' ')}>
                    {cell.date}
                  </span>
                  {cell.current && (
                    <button
                      onClick={e => { e.stopPropagation(); /* future: open create modal for this date */ }}
                      className="p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-primary-500"
                      title="Add task on this day"
                    >
                      <PlusIcon className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Milestone pills */}
                {items.milestones.slice(0, 1).map(m => (
                  <div key={m._id || m.id}
                    className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 truncate mb-0.5"
                    title={m.name || m.title}>
                    <FlagIcon className="w-2.5 h-2.5 shrink-0" />
                    <span className="truncate">{m.name || m.title}</span>
                  </div>
                ))}

                {/* Task pills */}
                {items.tasks.slice(0, 3).map(t => {
                  const isOverdue = t.dueDate && t.status !== 'completed' && new Date(t.dueDate) < today;
                  const pill = isOverdue ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' : (PRIORITY_PILL[t.priority] || PRIORITY_PILL.medium);
                  return (
                    <div key={t._id || t.id}
                      className={`text-[10px] px-1.5 py-0.5 rounded-full truncate mb-0.5 ${pill}`}
                      title={t.title || t.name}>
                      {t.title || t.name}
                    </div>
                  );
                })}

                {/* Overflow count */}
                {(items.tasks.length > 3 || items.milestones.length > 1) && (
                  <div className="text-[10px] text-gray-400 dark:text-gray-500 pl-1">
                    +{Math.max(0, items.tasks.length - 3) + Math.max(0, items.milestones.length - 1)} more
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Selected-day detail panel ── */}
      {selectedItems && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-800/40 bg-amber-50/60 dark:bg-amber-900/10 p-4 animate-fade-in-fast">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              {new Date(`${selectedDay}T00:00:00`).toLocaleDateString('en-GB', {
                weekday: 'long', day: 'numeric', month: 'long',
              })}
            </h3>
            <button onClick={() => setSelectedDay(null)}
              className="p-1 rounded-lg hover:bg-white/60 dark:hover:bg-gray-700 text-gray-400 transition-colors">
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2">
            {/* Milestones */}
            {selectedItems.milestones.map(m => (
              <div key={m._id || m.id}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800/40">
                <FlagIcon className="w-4 h-4 text-amber-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-200">{m.name || m.title}</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 capitalize">{m.status || 'milestone'}</p>
                </div>
              </div>
            ))}

            {/* Tasks */}
            {selectedItems.tasks.map(t => {
              const isOverdue = t.dueDate && t.status !== 'completed' && new Date(t.dueDate) < today;
              return (
                <div key={t._id || t.id}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-white dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700">
                  {t.status === 'completed'
                    ? <CheckCircleIcon className="w-4 h-4 text-emerald-500 shrink-0" />
                    : <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isOverdue ? 'bg-red-500' : 'bg-primary-500'}`} />
                  }
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${t.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                      {t.title || t.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${STATUS_COLOR[t.status] || STATUS_COLOR.todo}`}>
                        {STATUS_LABEL[t.status] || t.status}
                      </span>
                      {t.priority && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize ${PRIORITY_PILL[t.priority] || PRIORITY_PILL.medium}`}>
                          {t.priority}
                        </span>
                      )}
                      {isOverdue && <span className="text-[10px] text-red-500 font-semibold">Overdue</span>}
                    </div>
                  </div>
                  {t.assignee && (
                    <div
                      title={t.assignee.fullName || t.assignee.name || t.assignee.email}
                      className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                      {initials(t.assignee.fullName || t.assignee.name || t.assignee.email || '?')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Legend ── */}
      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
        <div className="flex items-center gap-1.5"><div className="w-5 h-5 rounded-full bg-primary-500" /><span>Today</span></div>
        <div className="flex items-center gap-1.5"><div className="w-8 h-3.5 rounded-full bg-red-100 dark:bg-red-900/40 border border-red-200 dark:border-red-800/40" /><span>Urgent / Overdue</span></div>
        <div className="flex items-center gap-1.5"><div className="w-8 h-3.5 rounded-full bg-orange-100 dark:bg-orange-900/40 border border-orange-200 dark:border-orange-800/40" /><span>High</span></div>
        <div className="flex items-center gap-1.5"><div className="w-8 h-3.5 rounded-full bg-blue-100 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800/40" /><span>Medium</span></div>
        <div className="flex items-center gap-1.5"><div className="w-8 h-3.5 rounded-full bg-amber-100 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800/40" /><span>Milestone</span></div>
        <div className="flex items-center gap-1.5"><div className="w-8 h-3.5 rounded-full bg-green-100 dark:bg-green-900/40 border border-green-200 dark:border-green-800/40" /><span>Low</span></div>
      </div>
    </div>
  );
};

export default ProjectCalendarView;
