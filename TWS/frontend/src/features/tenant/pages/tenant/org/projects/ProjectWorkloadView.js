/**
 * Project Workload View — capacity bars, status/priority breakdowns,
 * overload warnings, hours tracking, expandable task lists.
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  UserGroupIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import tenantProjectApiService from './services/tenantProjectApiService';
import LoadingSpinner from '../../../../../../shared/components/feedback/LoadingSpinner';
import EmptyState from '../../../../../../shared/components/feedback/EmptyState';

/* ─── constants ────────────────────────────────────────────────────────────── */
const STATUS_CHIP = {
  todo:         'bg-gray-100  dark:bg-gray-800  text-gray-600  dark:text-gray-300',
  in_progress:  'bg-blue-100  dark:bg-blue-900/30  text-blue-700  dark:text-blue-300',
  under_review: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  completed:    'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
};
const STATUS_LABEL = {
  todo: 'To Do', in_progress: 'Started', under_review: 'Review', completed: 'Done',
};
const PRIORITY_DOT = {
  urgent: 'bg-red-500', critical: 'bg-red-500',
  high: 'bg-orange-500', medium: 'bg-yellow-400', low: 'bg-green-500',
};
const OVERLOAD = 8; // tasks threshold

/* ─── helpers ──────────────────────────────────────────────────────────────── */
function initials(name = '') {
  return name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
}

function avatarGradient(name = '') {
  const colors = [
    'from-violet-500 to-purple-600',
    'from-blue-500 to-indigo-600',
    'from-emerald-500 to-teal-600',
    'from-rose-500 to-pink-600',
    'from-amber-500 to-orange-600',
    'from-cyan-500 to-sky-600',
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return colors[Math.abs(h) % colors.length];
}

/* ─── MemberCard ───────────────────────────────────────────────────────────── */
function MemberCard({ entry }) {
  const [expanded, setExpanded] = useState(false);

  const statusCounts = { todo: 0, in_progress: 0, under_review: 0, completed: 0 };
  entry.tasks.forEach(t => { if (statusCounts[t.status] !== undefined) statusCounts[t.status]++; });

  const total       = entry.tasks.length;
  const doneCount   = statusCounts.completed;
  const progressPct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const isOverloaded = entry.key !== '__unassigned' && total >= OVERLOAD;
  const estHours    = entry.tasks.reduce((s, t) => s + (Number(t.estimatedHours) || 0), 0);
  const actHours    = entry.tasks.reduce((s, t) => s + (Number(t.actualHours)    || 0), 0);
  const isUnassigned = entry.key === '__unassigned';

  return (
    <div className={[
      'rounded-2xl border bg-white dark:bg-gray-900 overflow-hidden transition-shadow hover:shadow-md',
      isOverloaded
        ? 'border-orange-300 dark:border-orange-700/60'
        : 'border-gray-200 dark:border-gray-700',
    ].join(' ')}>

      {/* Card header */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className={[
            'w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 bg-gradient-to-br',
            isUnassigned ? 'from-gray-400 to-gray-500' : avatarGradient(entry.name),
          ].join(' ')}>
            {initials(entry.name)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{entry.name}</p>
              {isOverloaded && (
                <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 font-semibold">
                  <ExclamationTriangleIcon className="w-3 h-3" />Overloaded
                </span>
              )}
            </div>
            {entry.role && !isUnassigned && (
              <p className="text-[10px] capitalize text-gray-500 dark:text-gray-400 mt-0.5">{entry.role}</p>
            )}
          </div>

          <button
            onClick={() => setExpanded(e => !e)}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 shrink-0 transition-colors"
          >
            {expanded ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
          </button>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="flex justify-between text-[10px] text-gray-500 dark:text-gray-400 mb-1">
            <span>{total} task{total !== 1 ? 's' : ''}</span>
            <span>{progressPct}% done</span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${isOverloaded ? 'bg-orange-500' : 'bg-emerald-500'}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Status chips */}
        <div className="flex items-center gap-1 mt-2.5 flex-wrap">
          {Object.entries(statusCounts)
            .filter(([, c]) => c > 0)
            .map(([status, count]) => (
              <span key={status} className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${STATUS_CHIP[status]}`}>
                {STATUS_LABEL[status]}: {count}
              </span>
            ))}
          {total === 0 && (
            <span className="text-[10px] text-gray-400 dark:text-gray-500 italic">No tasks assigned</span>
          )}
        </div>

        {/* Hours row */}
        {(estHours > 0 || actHours > 0) && (
          <div className="flex items-center gap-4 mt-2 text-[10px] text-gray-500 dark:text-gray-400">
            {estHours > 0 && <span>Est: <strong className="text-gray-700 dark:text-gray-300">{estHours}h</strong></span>}
            {actHours > 0 && <span>Logged: <strong className="text-gray-700 dark:text-gray-300">{actHours}h</strong></span>}
            {estHours > 0 && actHours > 0 && (
              <span className={actHours > estHours ? 'text-orange-500 font-semibold' : 'text-emerald-500'}>
                {actHours > estHours ? `+${(actHours - estHours).toFixed(1)}h over` : `${(estHours - actHours).toFixed(1)}h left`}
              </span>
            )}
          </div>
        )}

        {/* Capacity (if from formal member record) */}
        {entry.allocationPct > 0 && entry.allocationPct < 100 && (
          <div className="mt-2 text-[10px] text-gray-400 dark:text-gray-500">
            Capacity: {entry.allocationPct}% · {entry.capacityHours}h/week
          </div>
        )}
      </div>

      {/* Expanded task list */}
      {expanded && entry.tasks.length > 0 && (
        <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-2 space-y-1 max-h-52 overflow-y-auto">
          {entry.tasks.map(t => (
            <div key={t._id || t.id} className="flex items-center gap-2 py-1.5">
              <div className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[t.priority] || PRIORITY_DOT.medium}`} />
              <span className={`text-xs flex-1 truncate ${t.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                {t.title || t.name}
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0 ${STATUS_CHIP[t.status] || STATUS_CHIP.todo}`}>
                {STATUS_LABEL[t.status] || t.status}
              </span>
            </div>
          ))}
        </div>
      )}
      {expanded && entry.tasks.length === 0 && (
        <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-3 text-xs text-gray-400 dark:text-gray-500 italic">
          No tasks assigned to this member.
        </div>
      )}
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────────── */
const ProjectWorkloadView = () => {
  const { tenantSlug, projectId } = useParams();

  const [tasks,   setTasks]   = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy,  setSortBy]  = useState('load'); // 'load' | 'alpha'

  useEffect(() => {
    if (!tenantSlug || !projectId) return;
    setLoading(true);
    Promise.all([
      tenantProjectApiService.getProjectTasks(tenantSlug, { projectId }).catch(() => null),
      tenantProjectApiService.getProjectMembers(tenantSlug, projectId).catch(() => null),
    ]).then(([tr, mr]) => {
      const raw  = tr?.data?.tasks ?? tr?.tasks;
      const list = Array.isArray(raw) ? raw : (raw ? Object.values(raw).flat() : []);
      setTasks(list);
      const rawMembers = mr?.members ?? mr?.data?.members ?? (Array.isArray(mr) ? mr : []);
      setMembers(rawMembers);
    }).finally(() => setLoading(false));
  }, [tenantSlug, projectId]);

  /* ── build workload map ── */
  const workloadMap = {};

  // Seed from formal project members first
  members.forEach(m => {
    const userId = m.userId?._id || m.userId?.id || (typeof m.userId === 'string' ? m.userId : null);
    const user   = (typeof m.userId === 'object' && m.userId) ? m.userId : {};
    const key    = String(userId || m._id || m.id);
    const name   = user.fullName || user.name || user.email || m.memberName || 'Unknown';
    workloadMap[key] = {
      key, name,
      email:         user.email || '',
      role:          m.role || 'contributor',
      tasks:         [],
      capacityHours: m.capacity?.hoursPerWeek || 40,
      allocationPct: m.capacity?.allocationPercentage || 100,
    };
  });

  // Assign tasks to buckets
  tasks.forEach(t => {
    const assigneeId = t.assignee?._id || t.assignee?.id || t.assigneeId;
    if (!assigneeId) {
      if (!workloadMap['__unassigned']) {
        workloadMap['__unassigned'] = {
          key: '__unassigned', name: 'Unassigned',
          email: '', role: '', tasks: [], capacityHours: 0, allocationPct: 0,
        };
      }
      workloadMap['__unassigned'].tasks.push(t);
      return;
    }
    const key = String(assigneeId);
    if (!workloadMap[key]) {
      const a = t.assignee || {};
      workloadMap[key] = {
        key, name: a.fullName || a.name || a.email || 'Unknown',
        email: a.email || '', role: '', tasks: [], capacityHours: 40, allocationPct: 100,
      };
    }
    workloadMap[key].tasks.push(t);
  });

  // Sort entries
  let entries = Object.values(workloadMap);
  if (sortBy === 'load') entries.sort((a, b) => b.tasks.length - a.tasks.length);
  else                   entries.sort((a, b) => a.name.localeCompare(b.name));
  // Unassigned last
  const unassigned = entries.find(e => e.key === '__unassigned');
  const assigned   = entries.filter(e => e.key !== '__unassigned');
  if (unassigned) assigned.push(unassigned);

  /* ── summary ── */
  const totalTasks      = tasks.length;
  const completedTasks  = tasks.filter(t => t.status === 'completed').length;
  const activeMem       = assigned.filter(e => e.key !== '__unassigned').length;
  const overloadedCount = assigned.filter(e => e.key !== '__unassigned' && e.tasks.length >= OVERLOAD).length;

  if (loading) {
    return <LoadingSpinner message="Loading workload..." className="min-h-[40vh] bg-transparent" />;
  }

  return (
    <div className="p-4 space-y-4 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <UserGroupIcon className="w-5 h-5 text-rose-500" />
            Workload
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {activeMem} member{activeMem !== 1 ? 's' : ''} · {totalTasks} task{totalTasks !== 1 ? 's' : ''} · {completedTasks} done
            {overloadedCount > 0 && (
              <span className="ml-2 text-orange-500 font-semibold">
                · {overloadedCount} overloaded ({OVERLOAD}+ tasks)
              </span>
            )}
          </p>
        </div>

        {/* Sort toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">Sort:</span>
          {[
            { val: 'load',  label: 'By Load' },
            { val: 'alpha', label: 'A–Z' },
          ].map(o => (
            <button key={o.val}
              onClick={() => setSortBy(o.val)}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                sortBy === o.val
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Summary bar ── */}
      {totalTasks > 0 && (
        <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center gap-6 flex-wrap text-sm">
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900 dark:text-white">{totalTasks}</div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{completedTasks}</div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">Done</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {tasks.filter(t => t.status === 'in_progress').length}
            </div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">Active</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-red-500">
              {tasks.filter(t => t.dueDate && t.status !== 'completed' && new Date(t.dueDate) < new Date()).length}
            </div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">Overdue</div>
          </div>
          <div className="flex-1 min-w-[120px]">
            <div className="flex justify-between text-[10px] text-gray-500 dark:text-gray-400 mb-1">
              <span>Overall progress</span>
              <span>{totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%</span>
            </div>
            <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                style={{ width: `${totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Member cards ── */}
      {assigned.length === 0 ? (
        <EmptyState
          title="No team members or tasks found"
          message="Add tasks and assign them to team members."
          className="max-w-xl mx-auto"
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {assigned.map(entry => (
            <MemberCard key={entry.key} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectWorkloadView;
