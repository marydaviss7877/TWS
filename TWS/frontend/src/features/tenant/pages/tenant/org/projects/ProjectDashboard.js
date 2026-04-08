/**
 * Project Overview Dashboard — redesigned
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChartBarIcon,
  ClipboardDocumentListIcon,
  FlagIcon,
  ClockIcon,
  CalendarDaysIcon,
  UsersIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  RocketLaunchIcon,
  BoltIcon,
  EllipsisHorizontalIcon,
  ChevronRightIcon,
  FireIcon,
  Squares2X2Icon,
  PresentationChartLineIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';
import tenantProjectApiService from './services/tenantProjectApiService';
import ErrorBoundary from './components/ErrorBoundary';
import { AtRiskDeliverables } from './components/deliverables';
import { handleApiError } from './utils/errorHandler';

/* ─── helpers ─────────────────────────────────────────────────────────────── */

const STATUS_STYLES = {
  planning:    { bg: 'bg-slate-100 dark:bg-slate-800',   text: 'text-slate-600 dark:text-slate-300',  dot: 'bg-slate-400' },
  active:      { bg: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
  in_progress: { bg: 'bg-blue-50 dark:bg-blue-900/30',   text: 'text-blue-700 dark:text-blue-300',    dot: 'bg-blue-500' },
  on_hold:     { bg: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300',  dot: 'bg-amber-500' },
  completed:   { bg: 'bg-green-50 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300',  dot: 'bg-green-500' },
  cancelled:   { bg: 'bg-red-50 dark:bg-red-900/30',     text: 'text-red-700 dark:text-red-300',      dot: 'bg-red-500' }
};

const PRIORITY_STYLES = {
  low:      'text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400',
  medium:   'text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-300',
  high:     'text-orange-600 bg-orange-50 dark:bg-orange-900/30 dark:text-orange-300',
  critical: 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-300'
};

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.planning;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {(status || 'planning').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
    </span>
  );
}

function PriorityBadge({ priority }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${PRIORITY_STYLES[priority] || PRIORITY_STYLES.medium}`}>
      {(priority || 'medium').toUpperCase()}
    </span>
  );
}

function CircleProgress({ pct = 0, size = 80, stroke = 8, color = '#6366f1' }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(pct, 100) / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="currentColor" strokeWidth={stroke} className="text-gray-200 dark:text-gray-700" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
    </svg>
  );
}

function daysRemaining(endDate) {
  if (!endDate) return null;
  const diff = Math.ceil((new Date(endDate) - new Date()) / 86400000);
  return diff;
}

function timeElapsedPct(startDate, endDate) {
  if (!startDate || !endDate) return null;
  const total = new Date(endDate) - new Date(startDate);
  const elapsed = new Date() - new Date(startDate);
  return Math.max(0, Math.min(100, (elapsed / total) * 100));
}

function projectHealth(completionRate, startDate, endDate) {
  const elapsed = timeElapsedPct(startDate, endDate);
  if (elapsed === null) return null;
  const gap = completionRate - elapsed;
  if (gap >= -10) return { label: 'On Track', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', bar: 'bg-emerald-500', icon: CheckCircleSolid };
  if (gap >= -25) return { label: 'At Risk',  color: 'text-amber-600 dark:text-amber-400',   bg: 'bg-amber-50 dark:bg-amber-900/20',   bar: 'bg-amber-500',   icon: ExclamationTriangleIcon };
  return               { label: 'Delayed',   color: 'text-red-600 dark:text-red-400',       bg: 'bg-red-50 dark:bg-red-900/20',       bar: 'bg-red-500',     icon: FireIcon };
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtNum(n) {
  if (n == null) return '—';
  return Number(n).toLocaleString();
}

/* ─── sub-components ──────────────────────────────────────────────────────── */

function KpiCard({ icon: Icon, label, value, sub, color, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`glass-card-premium rounded-2xl p-5 text-left flex items-start gap-4 transition-all duration-200
        ${onClick ? 'hover:shadow-lg hover:-translate-y-0.5 cursor-pointer' : 'cursor-default'}`}
    >
      <div className={`p-2.5 rounded-xl ${color} shrink-0`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold font-heading text-gray-900 dark:text-white leading-tight">{value}</p>
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </button>
  );
}

function NavTile({ icon: Icon, label, sub, onClick, accent = 'from-primary-500 to-accent-500' }) {
  return (
    <button
      onClick={onClick}
      className="group glass-card-premium rounded-2xl p-4 text-left hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-3"
    >
      <div className={`p-2 rounded-xl bg-gradient-to-br ${accent} shrink-0`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">{label}</p>
        {sub && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{sub}</p>}
      </div>
      <ChevronRightIcon className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 shrink-0 transition-colors" />
    </button>
  );
}

/* ─── main component ──────────────────────────────────────────────────────── */

const ProjectDashboard = () => {
  const { tenantSlug, projectId } = useParams();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      setError(null);
      const response = await tenantProjectApiService.getProjectDashboard(tenantSlug, projectId);
      const data = response?.data ?? response;
      if (data && (data.project || data.metrics)) setDashboard(data);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError(err.message || 'Failed to load dashboard');
      handleApiError(err, 'Failed to load project dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tenantSlug, projectId]);

  useEffect(() => {
    if (projectId && tenantSlug) fetchDashboard();
  }, [fetchDashboard]);

  /* ── loading / error states ── */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading project overview…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4 text-center px-4">
        <ExclamationTriangleIcon className="w-12 h-12 text-red-400" />
        <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
        <button onClick={() => fetchDashboard()}
          className="px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700">
          Retry
        </button>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-400 dark:text-gray-500">No project data available.</p>
      </div>
    );
  }

  /* ── derived data ── */
  const { project, settings, metrics: rawMetrics, tasks = [], sprints = [], milestones = [] } = dashboard;

  const metrics = {
    totalTasks: 0, completedTasks: 0, completionRate: 0,
    activeSprints: 0, totalMilestones: 0, completedMilestones: 0,
    totalEstimatedHours: 0, totalActualHours: 0, hoursVariance: 0,
    ...rawMetrics
  };

  const startDate   = project?.timeline?.startDate || project?.startDate;
  const endDate     = project?.timeline?.endDate   || project?.endDate;
  const days        = daysRemaining(endDate);
  const elapsed     = timeElapsedPct(startDate, endDate);
  const health      = projectHealth(metrics.completionRate, startDate, endDate);
  const HealthIcon  = health?.icon || InformationCircleIcon;

  const workload = {
    todo:         tasks.filter(t => ['todo', 'to-do'].includes(t.status)).length,
    in_progress:  tasks.filter(t => ['in_progress', 'in-progress'].includes(t.status)).length,
    under_review: tasks.filter(t => ['under_review', 'under-review'].includes(t.status)).length,
    completed:    tasks.filter(t => t.status === 'completed').length,
    blocked:      tasks.filter(t => t.status === 'blocked').length
  };
  const totalTasks = Object.values(workload).reduce((a, b) => a + b, 0) || 1;

  const activeSprints     = Array.isArray(sprints)    ? sprints.filter(s => s.status === 'active') : [];
  const upcomingMilestones = Array.isArray(milestones) ? milestones.filter(m => m.status !== 'completed').slice(0, 4) : [];

  const hoursUsedPct = metrics.totalEstimatedHours
    ? Math.min(100, (metrics.totalActualHours / metrics.totalEstimatedHours) * 100)
    : 0;

  const statusBars = [
    { key: 'todo',         label: 'To Do',        count: workload.todo,         color: 'bg-slate-400' },
    { key: 'in_progress',  label: 'In Progress',  count: workload.in_progress,  color: 'bg-blue-500' },
    { key: 'under_review', label: 'Under Review', count: workload.under_review, color: 'bg-amber-500' },
    { key: 'blocked',      label: 'Blocked',      count: workload.blocked,      color: 'bg-red-500' },
    { key: 'completed',    label: 'Completed',    count: workload.completed,    color: 'bg-emerald-500' }
  ];

  return (
    <ErrorBoundary>
      <div className="space-y-6 animate-fade-in pb-8">

        {/* ── Page header ──────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <StatusBadge status={project?.status} />
              {project?.priority && <PriorityBadge priority={project.priority} />}
              {settings?.projectType && (
                <span className="text-xs text-gray-400 dark:text-gray-500 px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-medium">
                  {settings.projectType.replace(/_/g, ' ')}
                </span>
              )}
            </div>
            <h1 className="text-2xl xl:text-3xl font-bold font-heading text-gray-900 dark:text-white truncate">
              {project?.name || 'Project Overview'}
            </h1>
            {(startDate || endDate) && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1.5">
                <CalendarDaysIcon className="w-4 h-4 shrink-0" />
                {fmtDate(startDate)} → {fmtDate(endDate)}
                {days !== null && (
                  <span className={`ml-1 font-medium ${days < 0 ? 'text-red-500' : days <= 7 ? 'text-amber-500' : 'text-gray-500 dark:text-gray-400'}`}>
                    ({days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'due today' : `${days}d left`})
                  </span>
                )}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => fetchDashboard(true)}
              disabled={refreshing}
              className="glass-button p-2 rounded-xl"
              title="Refresh"
            >
              <ArrowPathIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => navigate(`/${tenantSlug}/org/projects/${projectId}/board`)}
              className="glass-button px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2"
            >
              <Squares2X2Icon className="w-4 h-4" />
              Board
            </button>
            <button
              onClick={() => navigate(`/${tenantSlug}/org/projects/${projectId}/gantt`)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary-500 to-accent-500 text-white text-sm font-semibold flex items-center gap-2 hover:opacity-90"
            >
              <PresentationChartLineIcon className="w-4 h-4" />
              Gantt
            </button>
          </div>
        </div>

        {/* ── KPI row ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            icon={CheckCircleIcon}
            label="Tasks Completed"
            value={`${metrics.completedTasks} / ${metrics.totalTasks}`}
            sub={`${Math.round(metrics.completionRate)}% done`}
            color="bg-emerald-500"
            onClick={() => navigate(`/${tenantSlug}/org/projects/${projectId}/board`)}
          />
          <KpiCard
            icon={BoltIcon}
            label="Active Sprints"
            value={metrics.activeSprints}
            sub={activeSprints[0]?.name || (metrics.activeSprints === 0 ? 'No active sprint' : undefined)}
            color="bg-violet-500"
            onClick={() => navigate(`/${tenantSlug}/org/projects/sprints?projectId=${projectId}`)}
          />
          <KpiCard
            icon={FlagIcon}
            label="Milestones"
            value={`${metrics.completedMilestones} / ${metrics.totalMilestones}`}
            sub={upcomingMilestones[0]?.title || 'No upcoming milestones'}
            color="bg-amber-500"
            onClick={() => navigate(`/${tenantSlug}/org/projects/milestones?projectId=${projectId}`)}
          />
          <KpiCard
            icon={ClockIcon}
            label="Hours Logged"
            value={`${(metrics.totalActualHours || 0).toFixed(1)}h`}
            sub={metrics.totalEstimatedHours ? `of ${metrics.totalEstimatedHours}h estimated` : 'No estimate set'}
            color="bg-sky-500"
            onClick={() => navigate(`/${tenantSlug}/org/projects/timesheets?projectId=${projectId}`)}
          />
        </div>

        {/* ── Main content ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left column (2/3) */}
          <div className="lg:col-span-2 space-y-6">

            {/* Completion ring + task status */}
            <div className="glass-card-premium rounded-2xl p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-semibold font-heading text-gray-900 dark:text-white flex items-center gap-2">
                  <ChartBarIcon className="w-5 h-5 text-primary-500" />
                  Task Breakdown
                </h2>
                <button
                  onClick={() => navigate(`/${tenantSlug}/org/projects/${projectId}/board`)}
                  className="text-xs text-primary-600 dark:text-primary-400 font-medium hover:underline flex items-center gap-1"
                >
                  View all <ChevronRightIcon className="w-3 h-3" />
                </button>
              </div>

              <div className="flex items-center gap-8">
                {/* Ring */}
                <div className="relative shrink-0 flex items-center justify-center">
                  <CircleProgress pct={metrics.completionRate} size={96} stroke={9} color="#10b981" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold text-gray-900 dark:text-white leading-none">
                      {Math.round(metrics.completionRate)}%
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">done</span>
                  </div>
                </div>

                {/* Stacked + legend */}
                <div className="flex-1 min-w-0 space-y-3">
                  {/* stacked bar */}
                  <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
                    {statusBars.filter(b => b.count > 0).map(b => (
                      <div key={b.key} className={`${b.color} transition-all`}
                        style={{ width: `${(b.count / totalTasks) * 100}%` }}
                        title={`${b.label}: ${b.count}`} />
                    ))}
                    {totalTasks === 1 && metrics.totalTasks === 0 && (
                      <div className="bg-gray-200 dark:bg-gray-700 w-full rounded-full" />
                    )}
                  </div>

                  {/* legend */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
                    {statusBars.map(b => (
                      <div key={b.key} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${b.color}`} />
                        <span className="truncate">{b.label}</span>
                        <span className="font-semibold text-gray-900 dark:text-white ml-auto">{b.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Hours tracking */}
            {(metrics.totalEstimatedHours > 0 || metrics.totalActualHours > 0) && (
              <div className="glass-card-premium rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold font-heading text-gray-900 dark:text-white flex items-center gap-2">
                    <ClockIcon className="w-5 h-5 text-sky-500" />
                    Hours Tracking
                  </h2>
                  <button
                    onClick={() => navigate(`/${tenantSlug}/org/projects/timesheets?projectId=${projectId}`)}
                    className="text-xs text-primary-600 dark:text-primary-400 font-medium hover:underline flex items-center gap-1"
                  >
                    Timesheets <ChevronRightIcon className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex items-end gap-6 mb-3">
                  <div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{(metrics.totalActualHours || 0).toFixed(1)}h</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">logged</p>
                  </div>
                  <div className="text-gray-300 dark:text-gray-600 text-2xl font-light">/</div>
                  <div>
                    <p className="text-xl font-semibold text-gray-500 dark:text-gray-400">{(metrics.totalEstimatedHours || 0).toFixed(1)}h</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">estimated</p>
                  </div>
                  {metrics.hoursVariance !== 0 && (
                    <div className={`ml-auto text-right ${metrics.hoursVariance > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                      <p className="text-sm font-semibold">{metrics.hoursVariance > 0 ? '+' : ''}{(metrics.hoursVariance || 0).toFixed(1)}h</p>
                      <p className="text-xs opacity-70">variance</p>
                    </div>
                  )}
                </div>
                <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${hoursUsedPct > 90 ? 'bg-red-500' : hoursUsedPct > 70 ? 'bg-amber-500' : 'bg-sky-500'}`}
                    style={{ width: `${hoursUsedPct}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{hoursUsedPct.toFixed(0)}% of estimated budget used</p>
              </div>
            )}

            {/* Active sprints */}
            {activeSprints.length > 0 && (
              <div className="glass-card-premium rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold font-heading text-gray-900 dark:text-white flex items-center gap-2">
                    <RocketLaunchIcon className="w-5 h-5 text-violet-500" />
                    Active Sprints
                  </h2>
                  <button
                    onClick={() => navigate(`/${tenantSlug}/org/projects/sprints?projectId=${projectId}`)}
                    className="text-xs text-primary-600 dark:text-primary-400 font-medium hover:underline flex items-center gap-1"
                  >
                    All sprints <ChevronRightIcon className="w-3 h-3" />
                  </button>
                </div>
                <div className="space-y-3">
                  {activeSprints.slice(0, 3).map(sprint => {
                    const sprintPct = sprint.completionPercentage ?? 0;
                    return (
                      <div key={sprint._id} className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{sprint.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {fmtDate(sprint.startDate)} → {fmtDate(sprint.endDate)}
                          </p>
                          <div className="mt-1.5 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full bg-violet-500 rounded-full" style={{ width: `${sprintPct}%` }} />
                          </div>
                        </div>
                        <span className="text-sm font-bold text-violet-600 dark:text-violet-400 shrink-0">{Math.round(sprintPct)}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Upcoming milestones */}
            {upcomingMilestones.length > 0 && (
              <div className="glass-card-premium rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold font-heading text-gray-900 dark:text-white flex items-center gap-2">
                    <FlagIcon className="w-5 h-5 text-amber-500" />
                    Upcoming Milestones
                  </h2>
                  <button
                    onClick={() => navigate(`/${tenantSlug}/org/projects/milestones?projectId=${projectId}`)}
                    className="text-xs text-primary-600 dark:text-primary-400 font-medium hover:underline flex items-center gap-1"
                  >
                    All milestones <ChevronRightIcon className="w-3 h-3" />
                  </button>
                </div>
                <div className="space-y-2">
                  {upcomingMilestones.map(m => {
                    const mDays = daysRemaining(m.dueDate);
                    return (
                      <div key={m._id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${
                          m.status === 'at_risk' ? 'bg-red-500' : mDays !== null && mDays <= 7 ? 'bg-amber-500' : 'bg-amber-400'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{m.title || m.name}</p>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                          {fmtDate(m.dueDate)}
                          {mDays !== null && (
                            <span className={`ml-1 ${mDays < 0 ? 'text-red-500' : mDays <= 7 ? 'text-amber-500' : ''}`}>
                              {mDays < 0 ? `(${Math.abs(mDays)}d late)` : mDays === 0 ? '(today)' : `(${mDays}d)`}
                            </span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Description / Scope */}
            {(project?.description || project?.scope) && (
              <div className="glass-card-premium rounded-2xl p-6">
                <h2 className="font-semibold font-heading text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                  <DocumentTextIcon className="w-5 h-5 text-indigo-500" />
                  Project Scope
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {project.description || project.scope}
                </p>
              </div>
            )}
          </div>

          {/* Right column (1/3) */}
          <div className="space-y-6">

            {/* Health card */}
            {health ? (
              <div className={`rounded-2xl p-5 border ${
                health.label === 'On Track' ? 'border-emerald-200 dark:border-emerald-800' :
                health.label === 'At Risk'  ? 'border-amber-200 dark:border-amber-800' :
                                              'border-red-200 dark:border-red-800'
              } ${health.bg}`}>
                <div className="flex items-center gap-3 mb-4">
                  <HealthIcon className={`w-6 h-6 ${health.color} shrink-0`} />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Project Health</p>
                    <p className={`text-lg font-bold font-heading ${health.color}`}>{health.label}</p>
                  </div>
                </div>
                {elapsed !== null && (
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                        <span>Time elapsed</span>
                        <span className="font-semibold">{elapsed.toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 bg-white/60 dark:bg-gray-700/60 rounded-full overflow-hidden">
                        <div className="h-full bg-gray-400 dark:bg-gray-500 rounded-full" style={{ width: `${elapsed}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                        <span>Tasks complete</span>
                        <span className="font-semibold">{Math.round(metrics.completionRate)}%</span>
                      </div>
                      <div className="h-1.5 bg-white/60 dark:bg-gray-700/60 rounded-full overflow-hidden">
                        <div className={`h-full ${health.bar} rounded-full`} style={{ width: `${metrics.completionRate}%` }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="glass-card-premium rounded-2xl p-5">
                <p className="text-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide mb-1">Project Health</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Set project start and end dates to see health status.</p>
              </div>
            )}

            {/* Quick details */}
            <div className="glass-card-premium rounded-2xl p-5 space-y-3">
              <h2 className="font-semibold font-heading text-gray-900 dark:text-white text-sm">Project Details</h2>
              {[
                { label: 'Start Date', value: fmtDate(startDate) },
                { label: 'End Date',   value: fmtDate(endDate) },
                { label: 'Budget',     value: project?.budget?.total ? `$${fmtNum(project.budget.total)}` : null },
                { label: 'Type',       value: settings?.projectType?.replace(/_/g, ' ') },
                { label: 'Team Size',  value: project?.teamSize || project?.members?.length || null }
              ].filter(r => r.value).map(r => (
                <div key={r.label} className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{r.label}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{r.value}</span>
                </div>
              ))}
            </div>

            {/* Feature flags */}
            {settings && (
              <div className="glass-card-premium rounded-2xl p-5">
                <h2 className="font-semibold font-heading text-gray-900 dark:text-white text-sm mb-3">Enabled Features</h2>
                <div className="space-y-2">
                  {[
                    { key: 'requiresSprint',    label: 'Sprints' },
                    { key: 'requiresMilestone', label: 'Milestones' },
                    { key: 'requiresTimesheet', label: 'Timesheets' },
                    { key: 'requiresGantt',     label: 'Gantt Chart' }
                  ].map(f => (
                    <div key={f.key} className="flex items-center gap-2 text-sm">
                      {settings[f.key] ? (
                        <CheckCircleSolid className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-gray-600 shrink-0" />
                      )}
                      <span className={settings[f.key] ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}>
                        {f.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Navigate tiles */}
            <div className="space-y-2">
              <NavTile icon={ClipboardDocumentListIcon} label="Board" sub={`${metrics.totalTasks} tasks`}
                accent="from-blue-500 to-blue-600"
                onClick={() => navigate(`/${tenantSlug}/org/projects/${projectId}/board`)} />
              <NavTile icon={UsersIcon} label="Resources" sub="Team & allocation"
                accent="from-violet-500 to-violet-600"
                onClick={() => navigate(`/${tenantSlug}/org/projects/${projectId}/team`)} />
              <NavTile icon={DocumentTextIcon} label="Deliverables" sub="Track deliverables"
                accent="from-indigo-500 to-indigo-600"
                onClick={() => navigate(`/${tenantSlug}/org/projects/deliverables?projectId=${projectId}`)} />
              <NavTile icon={ExclamationTriangleIcon} label="Change Requests" sub="Scope changes"
                accent="from-orange-500 to-orange-600"
                onClick={() => navigate(`/${tenantSlug}/org/projects/change-requests?projectId=${projectId}`)} />
            </div>
          </div>
        </div>

        {/* ── At-risk deliverables ──────────────────────────────────── */}
        <AtRiskDeliverables projectId={projectId} />
      </div>
    </ErrorBoundary>
  );
};

export default ProjectDashboard;
