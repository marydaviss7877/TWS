/**
 * Project Timeline View — horizontal CSS-based Gantt bars showing task duration,
 * milestone diamonds, today line, priority colour coding, zoom levels, pan controls.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  ClockIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  FlagIcon,
} from '@heroicons/react/24/outline';
import tenantProjectApiService from './services/tenantProjectApiService';

/* ─── constants ─────────────────────────────────────────────────────────────── */
const STATUS_FILL = {
  todo:         'bg-gray-400   dark:bg-gray-600',
  in_progress:  'bg-blue-500',
  under_review: 'bg-amber-500',
  completed:    'bg-emerald-500',
};
const STATUS_BG = {
  todo:         'bg-gray-100   dark:bg-gray-800',
  in_progress:  'bg-blue-50   dark:bg-blue-900/20',
  under_review: 'bg-amber-50  dark:bg-amber-900/20',
  completed:    'bg-emerald-50 dark:bg-emerald-900/20',
};
const STATUS_LABEL = {
  todo: 'To Do', in_progress: 'Started', under_review: 'Review', completed: 'Done',
};
const PRIORITY_LEFT = {
  urgent:   'bg-red-500',
  critical: 'bg-red-500',
  high:     'bg-orange-400',
  medium:   'bg-blue-500',
  low:      'bg-green-500',
};

/* ─── time helpers ───────────────────────────────────────────────────────────── */
const DAY = 86400000;
const addDays  = (d, n) => new Date(d.getTime() + n * DAY);
const diffDays = (a, b) => Math.round((b.getTime() - a.getTime()) / DAY);
function fmtShort(d) {
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}
function fmtRange(s, e) {
  if (!s) return '—';
  const sStr = fmtShort(new Date(s));
  const eStr = e && new Date(e).getTime() !== new Date(s).getTime() ? ` → ${fmtShort(new Date(e))}` : '';
  return sStr + eStr;
}

/* ─── buildTicks: weekly marks across the window ────────────────────────────── */
function buildTicks(windowStart, windowDays) {
  const ticks = [];
  // Start from nearest Monday on or before windowStart
  let t = new Date(windowStart); t.setHours(0, 0, 0, 0);
  const dow = t.getDay();
  if (dow !== 1) t = addDays(t, dow === 0 ? -6 : 1 - dow);
  const windowEnd = addDays(windowStart, windowDays);
  while (t <= windowEnd) {
    const pct = (diffDays(windowStart, t) / windowDays) * 100;
    ticks.push({ date: new Date(t), pct });
    t = addDays(t, 7);
  }
  return ticks;
}

/* ─── MonthBands: shaded month regions ──────────────────────────────────────── */
function MonthBands({ windowStart, windowDays }) {
  const bands = [];
  let cur = new Date(windowStart.getFullYear(), windowStart.getMonth(), 1);
  const windowEnd = addDays(windowStart, windowDays);
  while (cur < windowEnd) {
    const next = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    const left  = Math.max(0, (diffDays(windowStart, cur)  / windowDays) * 100);
    const right = Math.min(100, (diffDays(windowStart, next) / windowDays) * 100);
    if (right > 0 && left < 100) {
      const label = cur.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
      bands.push({ left, width: right - left, label, idx: cur.getMonth() });
    }
    cur = next;
  }
  return (
    <>
      {bands.map((b, i) => (
        <div key={i} className="absolute inset-y-0 pointer-events-none"
          style={{ left: `${b.left}%`, width: `${b.width}%` }}>
          <div className={`absolute inset-0 ${b.idx % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800/30' : ''}`} />
          <div className="absolute top-0 left-1 text-[9px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide select-none">
            {b.label}
          </div>
        </div>
      ))}
    </>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────────── */
const ProjectTimelineView = () => {
  const { tenantSlug, projectId } = useParams();

  const [tasks,      setTasks]      = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [windowDays, setWindowDays] = useState(60);
  const [windowStart, setWindowStart] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7); d.setHours(0, 0, 0, 0); return d;
  });
  const barZoneRef = useRef(null);

  /* ── data fetch ── */
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

  /* ── window & today ── */
  const windowEnd = addDays(windowStart, windowDays);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayPct = (diffDays(windowStart, today) / windowDays) * 100;
  const showToday = todayPct >= -1 && todayPct <= 101;

  const ticks = buildTicks(windowStart, windowDays);

  /* ── navigation ── */
  const slide    = dir => setWindowStart(d => addDays(d, dir * Math.round(windowDays / 2)));
  const goToday  = () => {
    const d = new Date(); d.setDate(d.getDate() - 7); d.setHours(0, 0, 0, 0);
    setWindowStart(d);
  };

  /* ── filtered tasks ── */
  const filtered = tasks
    .filter(t => {
      const hasDate  = t.startDate || t.dueDate;
      const matchSrch = !search || (t.title || t.name || '').toLowerCase().includes(search.toLowerCase());
      const matchStat = statusFilter === 'all' || t.status === statusFilter;
      return hasDate && matchSrch && matchStat;
    })
    .sort((a, b) => new Date(a.startDate || a.dueDate) - new Date(b.startDate || b.dueDate));

  /* ── bar geometry ── */
  function barGeometry(task) {
    const s = new Date(task.startDate || task.dueDate); s.setHours(0, 0, 0, 0);
    const e = new Date(task.dueDate   || task.startDate); e.setHours(0, 0, 0, 0);
    const left  = (diffDays(windowStart, s) / windowDays) * 100;
    const right = (diffDays(windowStart, addDays(e, 1)) / windowDays) * 100;
    return {
      left:    Math.max(0,   left),
      width:   Math.max(0,   Math.min(100, right) - Math.max(0, left)),
      visible: right > 0 && left < 100,
      outLeft: right <= 0,
      outRight: left >= 100,
    };
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Loading timeline…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 animate-fade-in">

      {/* ── Header / toolbar ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ClockIcon className="w-5 h-5 text-cyan-500" />
            Timeline
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
              ({filtered.length} task{filtered.length !== 1 ? 's' : ''})
            </span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {fmtShort(windowStart)} → {fmtShort(windowEnd)}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input type="text" placeholder="Search…" value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-sm glass-input rounded-lg w-36" />
          </div>

          {/* Status filter */}
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="glass-input px-2 py-1.5 text-sm rounded-lg">
            <option value="all">All Status</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="under_review">In Review</option>
            <option value="completed">Done</option>
          </select>

          {/* Zoom */}
          <select value={windowDays} onChange={e => setWindowDays(Number(e.target.value))}
            className="glass-input px-2 py-1.5 text-sm rounded-lg">
            <option value={14}>2 Weeks</option>
            <option value={30}>1 Month</option>
            <option value={60}>2 Months</option>
            <option value={90}>3 Months</option>
          </select>

          <button onClick={goToday}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            Today
          </button>
          <button onClick={() => slide(-1)}
            className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <ChevronLeftIcon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
          <button onClick={() => slide(1)}
            className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <ChevronRightIcon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
      </div>

      {/* ── Empty state ── */}
      {filtered.length === 0 && milestones.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
          <ClockIcon className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="font-medium text-gray-500 dark:text-gray-400">No tasks with dates found</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Add start or due dates to tasks to see them here</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900">

          {/* ── Date axis header ── */}
          <div className="flex border-b border-gray-200 dark:border-gray-700" style={{ minHeight: 40 }}>
            {/* Left label column */}
            <div className="shrink-0 w-52 px-4 flex items-end pb-1 border-r border-gray-200 dark:border-gray-700 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
              Task
            </div>
            {/* Date axis */}
            <div className="flex-1 relative overflow-hidden" ref={barZoneRef} style={{ minHeight: 40 }}>
              <MonthBands windowStart={windowStart} windowDays={windowDays} />
              {/* Week ticks */}
              {ticks.map((tick, i) => (
                <div key={i} className="absolute bottom-0 flex flex-col items-center pointer-events-none"
                  style={{ left: `${tick.pct}%`, transform: 'translateX(-50%)' }}>
                  <span className="text-[9px] text-gray-400 dark:text-gray-500 whitespace-nowrap pb-1">
                    {fmtShort(tick.date)}
                  </span>
                  <div className="w-px h-2 bg-gray-300 dark:bg-gray-600" />
                </div>
              ))}
              {/* Today marker in header */}
              {showToday && (
                <div className="absolute inset-y-0 w-0.5 bg-primary-400 opacity-60 pointer-events-none z-10"
                  style={{ left: `${todayPct}%` }}>
                  <div className="absolute -top-0.5 -left-1 w-2 h-2 rounded-full bg-primary-500" />
                </div>
              )}
            </div>
          </div>

          {/* ── Task rows ── */}
          {filtered.map((task, rowIdx) => {
            const g = barGeometry(task);
            const isOverdue = task.dueDate && task.status !== 'completed' && new Date(task.dueDate) < today;
            const progress  = task.progress ?? (task.status === 'completed' ? 100 : task.status === 'in_progress' ? 50 : 0);
            const priLeft   = PRIORITY_LEFT[task.priority] || PRIORITY_LEFT.medium;
            const fillCls   = STATUS_FILL[task.status] || STATUS_FILL.todo;

            return (
              <div key={task._id || task.id}
                className={`flex border-b border-gray-100 dark:border-gray-800 last:border-0 group hover:bg-gray-50/60 dark:hover:bg-gray-800/30 transition-colors ${rowIdx % 2 === 0 ? '' : 'bg-gray-50/30 dark:bg-gray-800/10'}`}>

                {/* Left: task label */}
                <div className="shrink-0 w-52 px-4 py-2.5 flex items-center gap-2 border-r border-gray-100 dark:border-gray-800 min-w-0">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${fillCls}`} />
                  <div className="min-w-0">
                    <p className={`text-xs font-medium truncate leading-tight ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                      {task.title || task.name}
                    </p>
                    <p className="text-[9px] text-gray-400 dark:text-gray-500 truncate mt-0.5">
                      {STATUS_LABEL[task.status] || task.status} · {fmtRange(task.startDate, task.dueDate)}
                    </p>
                  </div>
                </div>

                {/* Right: bar zone */}
                <div className="flex-1 relative py-3 px-1 overflow-hidden" style={{ minHeight: 48 }}>
                  {/* Month bands (faint) */}
                  <MonthBands windowStart={windowStart} windowDays={windowDays} />

                  {/* Week gridlines */}
                  {ticks.map((tick, i) => (
                    <div key={i} className="absolute inset-y-0 border-l border-dashed border-gray-100 dark:border-gray-800 pointer-events-none"
                      style={{ left: `${tick.pct}%` }} />
                  ))}

                  {/* Today line */}
                  {showToday && (
                    <div className="absolute inset-y-0 w-0.5 bg-primary-400/40 pointer-events-none z-10"
                      style={{ left: `${todayPct}%` }} />
                  )}

                  {/* Task bar */}
                  {g.visible && (
                    <div
                      className="absolute top-2 bottom-2 rounded-md overflow-hidden shadow-sm group/bar"
                      style={{ left: `${g.left}%`, width: `${Math.max(g.width, 0.4)}%` }}
                    >
                      {/* BG */}
                      <div className={`absolute inset-0 opacity-20 ${fillCls}`} />
                      {/* Priority left stripe */}
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${priLeft}`} />
                      {/* Progress fill */}
                      <div
                        className={`absolute top-0 bottom-0 left-0 opacity-50 transition-all ${fillCls}`}
                        style={{ width: `${progress}%` }}
                      />
                      {/* Label (only if wide enough) */}
                      {g.width > 6 && (
                        <div className="absolute inset-0 flex items-center pl-2 pr-1 overflow-hidden">
                          <span className="text-[9px] font-semibold text-gray-800 dark:text-white drop-shadow-sm truncate">
                            {task.title || task.name}
                            {progress > 0 && progress < 100 && (
                              <span className="opacity-70"> {progress}%</span>
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Out-of-range arrows */}
                  {g.outRight && (
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] text-gray-400 dark:text-gray-500 flex items-center gap-0.5">
                      <span>future</span><ChevronRightIcon className="w-2.5 h-2.5" />
                    </div>
                  )}
                  {g.outLeft && (
                    <div className="absolute left-1 top-1/2 -translate-y-1/2 text-[9px] text-gray-400 dark:text-gray-500 flex items-center gap-0.5">
                      <ChevronLeftIcon className="w-2.5 h-2.5" /><span>past</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* ── Milestones row ── */}
          {milestones.length > 0 && (
            <div className="flex border-t-2 border-amber-200 dark:border-amber-800/40 bg-amber-50/40 dark:bg-amber-900/10">
              <div className="shrink-0 w-52 px-4 py-2 flex items-center gap-2 border-r border-amber-100 dark:border-amber-800/30">
                <FlagIcon className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Milestones</span>
              </div>
              <div className="flex-1 relative py-1 px-1" style={{ minHeight: 36 }}>
                <MonthBands windowStart={windowStart} windowDays={windowDays} />
                {ticks.map((tick, i) => (
                  <div key={i} className="absolute inset-y-0 border-l border-dashed border-amber-100 dark:border-amber-800/20 pointer-events-none"
                    style={{ left: `${tick.pct}%` }} />
                ))}
                {showToday && (
                  <div className="absolute inset-y-0 w-0.5 bg-primary-400/30 pointer-events-none z-10"
                    style={{ left: `${todayPct}%` }} />
                )}
                {milestones.map(m => {
                  const d = new Date(m.dueDate || m.targetDate || m.date || m.createdAt);
                  d.setHours(0, 0, 0, 0);
                  const pct = (diffDays(windowStart, d) / windowDays) * 100;
                  if (pct < -2 || pct > 102) return null;
                  return (
                    <div key={m._id || m.id}
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 group/ms cursor-default"
                      style={{ left: `${pct}%` }}
                      title={`${m.name || m.title} — ${fmtShort(d)}`}
                    >
                      <div className="w-3.5 h-3.5 rotate-45 bg-amber-500 rounded-sm shadow-sm" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover/ms:block z-30">
                        <div className="bg-gray-900 dark:bg-gray-700 text-white text-[10px] px-2 py-1 rounded-lg whitespace-nowrap shadow-lg">
                          {m.name || m.title}<br />
                          <span className="text-gray-300">{fmtShort(d)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Legend ── */}
      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-0.5 h-4 bg-primary-500 rounded-full" /><span>Today</span>
        </div>
        {Object.entries(STATUS_FILL).map(([s, cls]) => (
          <div key={s} className="flex items-center gap-1.5">
            <div className={`w-5 h-2.5 rounded-sm ${cls} opacity-60`} />
            <span>{STATUS_LABEL[s]}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rotate-45 bg-amber-500 rounded-sm" /><span>Milestone</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-4 rounded-sm bg-red-500" /><span>Urgent</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-4 rounded-sm bg-orange-400" /><span>High</span>
        </div>
        <div className="flex items-center gap-1.5 ml-2 text-gray-400 italic">
          Left stripe = priority · Fill opacity = progress
        </div>
      </div>
    </div>
  );
};

export default ProjectTimelineView;
