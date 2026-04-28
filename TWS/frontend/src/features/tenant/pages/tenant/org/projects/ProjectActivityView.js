/**
 * Project Activity View — grouped activity feed with type icons, user avatars,
 * inferred event types, milestone/CR entries, date grouping, and filtering.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  BoltIcon,
  CheckCircleIcon,
  PlusCircleIcon,
  ArrowPathIcon,
  FlagIcon,
  DocumentTextIcon,
  ClockIcon,
  UserCircleIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';
import tenantProjectApiService from './services/tenantProjectApiService';
import LoadingSpinner from '../../../../../../shared/components/feedback/LoadingSpinner';
import EmptyState from '../../../../../../shared/components/feedback/EmptyState';

/* ─── constants ─────────────────────────────────────────────────────────────── */
const STATUS_COLOR = {
  todo:         'bg-gray-100  dark:bg-gray-800  text-gray-600  dark:text-gray-300',
  in_progress:  'bg-blue-100  dark:bg-blue-900/30  text-blue-700  dark:text-blue-300',
  under_review: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  completed:    'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
};
const STATUS_LABEL = {
  todo: 'To Do', in_progress: 'In Progress', under_review: 'In Review', completed: 'Done',
};
const PRIORITY_DOT = {
  urgent: 'bg-red-500', critical: 'bg-red-500',
  high: 'bg-orange-500', medium: 'bg-yellow-400', low: 'bg-green-500',
};

/* ─── helpers ────────────────────────────────────────────────────────────────── */
function initials(name = '') {
  return name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
}
function avatarBg(name = '') {
  const colors = ['from-violet-500 to-purple-600','from-blue-500 to-indigo-600','from-emerald-500 to-teal-600','from-rose-500 to-pink-600','from-amber-500 to-orange-600','from-cyan-500 to-sky-600'];
  let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return colors[Math.abs(h) % colors.length];
}
function fmtTime(d) {
  if (!d) return '';
  return new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
function dayKey(d) {
  if (!d) return '';
  const x = new Date(d); x.setHours(0,0,0,0);
  return x.toISOString().slice(0,10);
}
function dayLabel(key) {
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(key + 'T00:00:00');
  const diff = Math.round((today - d) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

/* ─── infer activity type from a task ────────────────────────────────────────── */
function inferTaskEvents(task) {
  const events = [];
  const created = new Date(task.createdAt);
  const updated = new Date(task.updatedAt || task.createdAt);
  const isNew = Math.abs(updated - created) < 60000; // within 1 min → just created

  if (isNew) {
    events.push({ type: 'created', ts: task.createdAt, task });
  } else {
    if (task.status === 'completed') {
      events.push({ type: 'completed', ts: task.updatedAt, task });
    } else if (task.status === 'in_progress') {
      events.push({ type: 'started', ts: task.updatedAt, task });
    } else {
      events.push({ type: 'updated', ts: task.updatedAt, task });
    }
  }
  return events;
}

/* ─── ActivityItem ─────────────────────────────────────────────────────────── */
function ActivityItem({ item }) {
  const { type, ts, task, milestone, cr } = item;

  let Icon, iconBg, headline, subline;

  if (milestone) {
    Icon = FlagIcon;
    iconBg = 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400';
    headline = <>Milestone <strong className="text-gray-900 dark:text-white">{milestone.name || milestone.title}</strong> reached</>;
    subline = milestone.status ? <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold capitalize ${STATUS_COLOR[milestone.status] || 'bg-gray-100 text-gray-600'}`}>{milestone.status.replace('_',' ')}</span> : null;
  } else if (cr) {
    Icon = DocumentTextIcon;
    iconBg = 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400';
    headline = <>Change request <strong className="text-gray-900 dark:text-white">"{cr.title}"</strong> {cr.status}</>;
    subline = <span className="text-xs text-gray-500 dark:text-gray-400">{cr.description?.slice(0,60)}{cr.description?.length > 60 ? '…' : ''}</span>;
  } else if (task) {
    const assigneeName = task.assignee?.fullName || task.assignee?.name || task.assignee?.email || '';
    switch (type) {
      case 'created':
        Icon = PlusCircleIcon;
        iconBg = 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400';
        headline = <>Task <strong className="text-gray-900 dark:text-white">"{task.title || task.name}"</strong> created</>;
        subline = assigneeName ? <span className="text-xs text-gray-500 dark:text-gray-400">Assigned to {assigneeName}</span> : null;
        break;
      case 'completed':
        Icon = CheckCircleSolid;
        iconBg = 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400';
        headline = <>Task <strong className="text-gray-900 dark:text-white">"{task.title || task.name}"</strong> marked done</>;
        subline = task.priority ? <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold capitalize ${STATUS_COLOR.completed}`}>Done</span> : null;
        break;
      case 'started':
        Icon = ClockIcon;
        iconBg = 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400';
        headline = <>Task <strong className="text-gray-900 dark:text-white">"{task.title || task.name}"</strong> started</>;
        subline = assigneeName ? <span className="text-xs text-gray-500 dark:text-gray-400">By {assigneeName}</span> : null;
        break;
      default:
        Icon = ArrowPathIcon;
        iconBg = 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400';
        headline = <>Task <strong className="text-gray-900 dark:text-white">"{task.title || task.name}"</strong> updated</>;
        subline = <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${STATUS_COLOR[task.status] || ''}`}>{STATUS_LABEL[task.status] || task.status}</span>;
    }
  }

  const actorName = task?.assignee?.fullName || task?.assignee?.name || task?.assignee?.email || milestone?.createdBy || cr?.submittedBy || '';
  const showPriorityDot = task?.priority && type !== 'completed';

  return (
    <div className="flex items-start gap-3 py-3 group">
      {/* Icon */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
        {Icon && <Icon className="w-4 h-4" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm text-gray-700 dark:text-gray-300">{headline}</p>
          {showPriorityDot && (
            <div className={`w-2 h-2 rounded-full ${PRIORITY_DOT[task.priority] || PRIORITY_DOT.medium}`} title={task.priority} />
          )}
        </div>
        {subline && <div className="mt-0.5">{subline}</div>}
      </div>

      {/* Right: actor + time */}
      <div className="flex items-center gap-2 shrink-0">
        {actorName && (
          <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${avatarBg(actorName)} flex items-center justify-center text-white text-[9px] font-bold`} title={actorName}>
            {initials(actorName)}
          </div>
        )}
        <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">{fmtTime(ts)}</span>
      </div>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────────── */
const ProjectActivityView = () => {
  const { tenantSlug, projectId } = useParams();

  const [feed,    setFeed]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all'); // all | task | milestone | cr
  const [page, setPage]       = useState(1);
  const PAGE_SIZE = 20;

  const fetchData = useCallback(async () => {
    if (!tenantSlug || !projectId) return;
    setLoading(true);
    try {
      const [tr, mr, crr] = await Promise.all([
        tenantProjectApiService.getProjectTasks(tenantSlug, { projectId }).catch(() => null),
        tenantProjectApiService.getProjectMilestones(tenantSlug, { projectId }).catch(() => null),
        tenantProjectApiService.getChangeRequests(tenantSlug, { projectId }).catch(() => null),
      ]);

      const allItems = [];

      // Tasks → infer events
      const raw = tr?.data?.tasks ?? tr?.tasks;
      const tasks = Array.isArray(raw) ? raw : (raw ? Object.values(raw).flat() : []);
      tasks.forEach(t => inferTaskEvents(t).forEach(ev => allItems.push({ ...ev, _category: 'task' })));

      // Milestones
      const mlist = Array.isArray(mr?.milestones) ? mr.milestones : (mr?.data?.milestones || []);
      mlist.forEach(m => allItems.push({ type: 'milestone', ts: m.updatedAt || m.createdAt, milestone: m, _category: 'milestone' }));

      // Change Requests
      const crs = Array.isArray(crr?.changeRequests) ? crr.changeRequests : (crr?.data?.changeRequests || Array.isArray(crr) ? (crr || []) : []);
      (Array.isArray(crs) ? crs : []).forEach(c => allItems.push({ type: 'cr', ts: c.updatedAt || c.createdAt, cr: c, _category: 'cr' }));

      // Sort newest first
      allItems.sort((a, b) => new Date(b.ts) - new Date(a.ts));
      setFeed(allItems);
    } catch (e) {
      console.error(e);
      setFeed([]);
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, projectId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── filter + paginate ── */
  const filtered = typeFilter === 'all' ? feed : feed.filter(i => i._category === typeFilter);
  const pages    = Math.ceil(filtered.length / PAGE_SIZE);
  const visible  = filtered.slice(0, page * PAGE_SIZE);

  /* ── group by day ── */
  const byDay = {};
  visible.forEach(item => {
    const key = dayKey(item.ts);
    if (!byDay[key]) byDay[key] = [];
    byDay[key].push(item);
  });
  const dayKeys = Object.keys(byDay).sort((a, b) => b.localeCompare(a));

  if (loading) {
    return <LoadingSpinner message="Loading activity..." className="min-h-[40vh] bg-transparent" />;
  }

  return (
    <div className="p-4 space-y-4 animate-fade-in max-w-3xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BoltIcon className="w-5 h-5 text-yellow-500" />
            Activity
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {filtered.length} event{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-1.5">
          <FunnelIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          {[
            { val: 'all',       label: 'All' },
            { val: 'task',      label: 'Tasks' },
            { val: 'milestone', label: 'Milestones' },
            { val: 'cr',        label: 'Changes' },
          ].map(f => (
            <button key={f.val}
              onClick={() => { setTypeFilter(f.val); setPage(1); }}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                typeFilter === f.val
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}>
              {f.label}
            </button>
          ))}
          <button onClick={fetchData}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors" title="Refresh">
            <ArrowPathIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Feed ── */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No activity yet"
          message="Tasks, milestones, and changes will appear here."
          className="max-w-xl mx-auto"
        />
      ) : (
        <div className="space-y-6">
          {dayKeys.map(key => (
            <div key={key}>
              {/* Day separator */}
              <div className="flex items-center gap-3 mb-1">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">{dayLabel(key)}</span>
                <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
              </div>

              {/* Items */}
              <div className="glass-card-premium rounded-xl px-4 divide-y divide-gray-100 dark:divide-gray-800">
                {byDay[key].map((item, i) => (
                  <ActivityItem key={`${key}-${i}`} item={item} />
                ))}
              </div>
            </div>
          ))}

          {/* Load more */}
          {page < pages && (
            <div className="text-center">
              <button onClick={() => setPage(p => p + 1)}
                className="px-4 py-2 text-sm font-medium text-primary-500 hover:underline">
                Load more ({filtered.length - page * PAGE_SIZE} remaining)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProjectActivityView;
