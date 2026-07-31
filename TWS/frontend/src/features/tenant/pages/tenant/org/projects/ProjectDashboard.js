/**
 * Project Overview Dashboard — redesigned
 */

import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTenantSlug } from '../../../../../../shared/hooks/useTenantSlug';
import {
  ChartBarIcon,
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
  ChevronRightIcon,
  Squares2X2Icon,
  PresentationChartLineIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';
import ErrorBoundary from './components/ErrorBoundary';
import { AtRiskDeliverables } from './components/deliverables';
import { useProjectDashboard, fmtDate, fmtNum } from './useProjectDashboard';
import LoadingSpinner from '../../../../../../shared/components/feedback/LoadingSpinner';
import ErrorState from '../../../../../../shared/components/feedback/ErrorState';
import EmptyState from '../../../../../../shared/components/feedback/EmptyState';

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
    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
      <span className={`w-2 h-2 rounded-full ${s.dot}`} />
      {(status || 'planning').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
    </span>
  );
}

function PriorityBadge({ priority }) {
  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold ${PRIORITY_STYLES[priority] || PRIORITY_STYLES.medium}`}>
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

/* ─── sub-components ──────────────────────────────────────────────────────── */

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  iconTone = 'neutral',
  isEmpty,
  emptyCta,
  onClick,
}) {
  const iconBg =
    iconTone === 'danger'
      ? 'bg-red-500'
      : iconTone === 'warning'
        ? 'bg-amber-500'
        : 'bg-slate-500/90 dark:bg-slate-600';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`glass-card-premium rounded-2xl p-6 text-left flex items-start gap-4 transition-all duration-200 border border-transparent
        ${onClick ? 'hover:shadow-md hover:border-white/20 dark:hover:border-white/10 cursor-pointer' : 'cursor-default'}`}
    >
      <div className={`p-3 rounded-xl ${iconBg} shrink-0`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-2xl font-bold font-heading text-gray-900 dark:text-white leading-tight">{value}</p>
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mt-2">{label}</p>
        {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{sub}</p>}
        {isEmpty && emptyCta && onClick && (
          <p className="text-xs text-primary-600 dark:text-primary-400 font-medium mt-2">{emptyCta}</p>
        )}
      </div>
    </button>
  );
}

function NavTile({ icon: Icon, label, sub, onClick, accent = 'bg-primary-50 dark:bg-primary-900/20', iconColor = 'text-primary-600 dark:text-primary-400' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group glass-card-premium rounded-2xl p-6 text-left transition-all duration-200 flex items-center gap-4 border border-transparent hover:shadow-md hover:border-white/20 dark:hover:border-white/10"
    >
      <div className={`p-3 rounded-xl ${accent} shrink-0`}>
        <Icon className={`w-4 h-4 ${iconColor}`} />
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
  const { projectId } = useParams();
  const tenantSlug = useTenantSlug();
  const navigate = useNavigate();
  const {
    dashboard,
    loading,
    error,
    refreshing,
    fetchDashboard,
    project,
    settings,
    metrics,
    startDate,
    endDate,
    days,
    elapsed,
    health,
    HealthIcon,
    statusBarDenominator,
    activeSprintsList,
    upcomingMilestones,
    hoursUsedPct,
    statusBars,
    sprints,
  } = useProjectDashboard();

  const plannedSprintsList = useMemo(
    () => (Array.isArray(sprints) ? sprints : []).filter((s) => s.status === 'planning'),
    [sprints]
  );

  const inactiveSprintCount = Math.max(0, (metrics.totalSprints || 0) - (metrics.activeSprints || 0));
  const sprintKpiSub =
    (metrics.totalSprints || 0) === 0
      ? 'No sprints yet'
      : (metrics.activeSprints || 0) > 0
        ? activeSprintsList[0]?.name || `${metrics.activeSprints} active`
        : `${inactiveSprintCount} in planning — mark a sprint Active when the team starts it`;

  const tasksKpiTone =
    metrics.totalTasks > 0 && days !== null && days < 0 && metrics.completionRate < 100
      ? 'danger'
      : metrics.totalTasks > 0 &&
          (metrics.completionRate < 40 || (days !== null && days <= 7 && elapsed !== null && metrics.completionRate + 10 < elapsed))
        ? 'warning'
        : 'neutral';

  const sprintsKpiTone =
    metrics.totalTasks > 0 && (metrics.totalSprints || 0) > 0 && (metrics.activeSprints || 0) === 0
      ? 'warning'
      : 'neutral';

  const firstMilestoneDays = upcomingMilestones[0]?.dueDate
    ? Math.ceil((new Date(upcomingMilestones[0].dueDate) - new Date()) / 86400000)
    : null;
  const milestonesKpiTone =
    metrics.totalMilestones > 0 &&
    firstMilestoneDays !== null &&
    firstMilestoneDays <= 7 &&
    firstMilestoneDays >= 0
      ? 'warning'
      : 'neutral';

  const hoursOverBudget =
    metrics.totalEstimatedHours > 0 && metrics.totalActualHours > metrics.totalEstimatedHours;
  const hoursKpiTone = hoursOverBudget ? 'danger' : hoursUsedPct > 90 ? 'warning' : 'neutral';

  const healthCard = health ? (
    <div className={`rounded-2xl p-6 border ${
      health.label === 'On Track' ? 'border-emerald-200 dark:border-emerald-800' :
      health.label === 'At Risk'  ? 'border-amber-200 dark:border-amber-800' :
                                    'border-red-200 dark:border-red-800'
    } ${health.bg}`}>
      <div className="flex items-center gap-4 mb-4">
        <HealthIcon className={`w-6 h-6 ${health.color} shrink-0`} />
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Project Health</p>
          <p className={`text-lg font-bold font-heading ${health.color}`}>{health.label}</p>
        </div>
      </div>
      {elapsed !== null && (
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
              <span>Time elapsed</span>
              <span className="font-semibold">{elapsed.toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-white/60 dark:bg-gray-700/60 rounded-full overflow-hidden">
              <div className="h-full bg-gray-400 dark:bg-gray-500 rounded-full" style={{ width: `${elapsed}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
              <span>Tasks complete</span>
              <span className="font-semibold">{Math.round(metrics.completionRate)}%</span>
            </div>
            <div className="h-2 bg-white/60 dark:bg-gray-700/60 rounded-full overflow-hidden">
              <div className={`h-full ${health.bar} rounded-full`} style={{ width: `${metrics.completionRate}%` }} />
            </div>
          </div>
        </div>
      )}
    </div>
  ) : (
    <div className="glass-card-premium rounded-2xl p-6">
      <p className="text-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide mb-2">Project Health</p>
      <p className="text-sm text-gray-500 dark:text-gray-400">Set project start and end dates to see health status.</p>
    </div>
  );

  if (loading) {
    return <LoadingSpinner message="Loading project overview..." className="min-h-[40vh] bg-transparent" />;
  }

  if (error) {
    return <ErrorState title="Project overview unavailable" message={error} onRetry={() => fetchDashboard()} className="max-w-xl mx-auto" />;
  }

  if (!dashboard) {
    return <EmptyState title="No project data available" message="Project metrics will appear once data is available." className="max-w-xl mx-auto" />;
  }

  return (
    <ErrorBoundary>
      <div className="space-y-8 animate-fade-in pb-8">

        {/* ── Page header ──────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <StatusBadge status={project?.status} />
              {project?.priority && <PriorityBadge priority={project.priority} />}
              {settings?.projectType && (
                <span className="text-xs text-gray-400 dark:text-gray-500 px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 font-medium">
                  {settings.projectType.replace(/_/g, ' ')}
                </span>
              )}
            </div>
            <h1 className="text-2xl xl:text-3xl font-bold font-heading text-gray-900 dark:text-white line-clamp-2 break-words">
              {project?.name || 'Project Overview'}
            </h1>
            {(startDate || endDate) && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-2">
                <CalendarDaysIcon className="w-4 h-4 shrink-0" />
                {fmtDate(startDate)} → {fmtDate(endDate)}
                {days !== null && (
                  <span className={`ml-2 font-medium ${days < 0 ? 'text-red-500' : days <= 7 ? 'text-amber-500' : 'text-gray-500 dark:text-gray-400'}`}>
                    ({days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'due today' : `${days}d left`})
                  </span>
                )}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => fetchDashboard(true)}
              disabled={refreshing}
              className="p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border border-transparent hover:border-white/20 transition-colors"
              title="Refresh"
            >
              <ArrowPathIcon className={`w-4 h-4 ${refreshing ? 'tws-loading-pulse' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => navigate(`/${tenantSlug}/org/projects/${projectId}/board`)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary-500 to-accent-500 text-white text-sm font-semibold flex items-center gap-2 hover:opacity-90"
            >
              <Squares2X2Icon className="w-4 h-4" />
              Open Board
            </button>
            <button
              type="button"
              onClick={() => navigate(`/${tenantSlug}/org/projects/${projectId}/gantt`)}
              className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-100 bg-white/40 dark:bg-gray-900/40 hover:bg-white/60 dark:hover:bg-gray-800/60 transition-colors"
            >
              <PresentationChartLineIcon className="w-4 h-4" />
              Gantt
            </button>
          </div>
        </div>

        <div className="lg:hidden space-y-0">
          {healthCard}
        </div>

        {/* ── KPI row ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            icon={CheckCircleIcon}
            label="Tasks Completed"
            value={`${metrics.completedTasks} / ${metrics.totalTasks}`}
            sub={metrics.totalTasks === 0 ? 'No tasks yet' : `${Math.round(metrics.completionRate)}% done`}
            iconTone={tasksKpiTone}
            isEmpty={metrics.totalTasks === 0}
            emptyCta="Create first task →"
            onClick={() => navigate(`/${tenantSlug}/org/projects/${projectId}/board`)}
          />
          <KpiCard
            icon={BoltIcon}
            label="Sprints"
            value={metrics.totalSprints ?? 0}
            sub={sprintKpiSub}
            iconTone={sprintsKpiTone}
            isEmpty={(metrics.totalSprints || 0) === 0}
            emptyCta="Create sprint →"
            onClick={() => navigate(`/${tenantSlug}/org/projects/sprints?projectId=${projectId}`)}
          />
          <KpiCard
            icon={FlagIcon}
            label="Milestones"
            value={`${metrics.completedMilestones} / ${metrics.totalMilestones}`}
            sub={upcomingMilestones[0]?.title || 'No upcoming milestones'}
            iconTone={milestonesKpiTone}
            isEmpty={metrics.totalMilestones === 0}
            emptyCta="Add milestones →"
            onClick={() => navigate(`/${tenantSlug}/org/projects/milestones?projectId=${projectId}`)}
          />
          <KpiCard
            icon={ClockIcon}
            label="Hours Logged"
            value={`${(metrics.totalActualHours || 0).toFixed(1)}h`}
            sub={metrics.totalEstimatedHours ? `of ${metrics.totalEstimatedHours}h estimated` : 'No estimate set'}
            iconTone={hoursKpiTone}
            isEmpty={(metrics.totalActualHours || 0) === 0 && (metrics.totalEstimatedHours || 0) === 0}
            emptyCta="Log hours →"
            onClick={() => navigate(`/${tenantSlug}/org/projects/timesheets?projectId=${projectId}`)}
          />
        </div>

        {/* ── Main content ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left column (2/3) */}
          <div className="lg:col-span-2 space-y-8">

            {/* Completion ring + task status */}
            <div className="glass-card-premium rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-semibold font-heading text-gray-900 dark:text-white flex items-center gap-2">
                  <ChartBarIcon className="w-5 h-5 text-primary-500" />
                  Task Breakdown
                </h2>
                <button
                  type="button"
                  onClick={() => navigate(`/${tenantSlug}/org/projects/${projectId}/board`)}
                  className="text-xs text-primary-600 dark:text-primary-400 font-medium hover:underline flex items-center gap-2"
                >
                  View all <ChevronRightIcon className="w-3 h-3" />
                </button>
              </div>

              <div className="flex items-center gap-8">
                <div className="relative shrink-0 flex items-center justify-center">
                  <CircleProgress pct={metrics.completionRate} size={96} stroke={9} color="#10b981" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold text-gray-900 dark:text-white leading-none">
                      {Math.round(metrics.completionRate)}%
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">done</span>
                  </div>
                </div>

                <div className="flex-1 min-w-0 space-y-4">
                  <div className="flex h-3 rounded-full overflow-hidden gap-1">
                    {statusBars.filter(b => b.count > 0).map(b => (
                      <div
                        key={b.key}
                        className={`${b.color} transition-all`}
                        style={{ width: `${(b.count / statusBarDenominator) * 100}%` }}
                        title={`${b.label}: ${b.count}`}
                      />
                    ))}
                    {metrics.totalTasks === 0 && (
                      <div className="bg-gray-200 dark:bg-gray-700 w-full rounded-full" />
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
                    {statusBars.map(b => (
                      <div key={b.key} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${b.color}`} />
                        <span className="truncate">{b.label}</span>
                        <span className="font-semibold text-gray-900 dark:text-white ml-auto">{b.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {(metrics.totalEstimatedHours > 0 || metrics.totalActualHours > 0) && (
              <div className="glass-card-premium rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold font-heading text-gray-900 dark:text-white flex items-center gap-2">
                    <ClockIcon className="w-5 h-5 text-sky-500" />
                    Hours Tracking
                  </h2>
                  <button
                    type="button"
                    onClick={() => navigate(`/${tenantSlug}/org/projects/timesheets?projectId=${projectId}`)}
                    className="text-xs text-primary-600 dark:text-primary-400 font-medium hover:underline flex items-center gap-2"
                  >
                    Timesheets <ChevronRightIcon className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex items-end gap-6 mb-4">
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
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${hoursUsedPct > 90 ? 'bg-red-500' : hoursUsedPct > 70 ? 'bg-amber-500' : 'bg-sky-500'}`}
                    style={{ width: `${hoursUsedPct}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{hoursUsedPct.toFixed(0)}% of estimated budget used</p>
              </div>
            )}

            {activeSprintsList.length > 0 && (
              <div className="glass-card-premium rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold font-heading text-gray-900 dark:text-white flex items-center gap-2">
                    <RocketLaunchIcon className="w-5 h-5 text-violet-500" />
                    Active Sprints
                  </h2>
                  <button
                    type="button"
                    onClick={() => navigate(`/${tenantSlug}/org/projects/sprints?projectId=${projectId}`)}
                    className="text-xs text-primary-600 dark:text-primary-400 font-medium hover:underline flex items-center gap-2"
                  >
                    All sprints <ChevronRightIcon className="w-3 h-3" />
                  </button>
                </div>
                <div className="space-y-4">
                  {activeSprintsList.slice(0, 3).map(sprint => {
                    const sprintPct = sprint.completionPercentage ?? 0;
                    return (
                      <div key={sprint._id} className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{sprint.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {fmtDate(sprint.startDate)} → {fmtDate(sprint.endDate)}
                          </p>
                          <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
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

            {activeSprintsList.length === 0 && plannedSprintsList.length > 0 && (
              <div className="glass-card-premium rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold font-heading text-gray-900 dark:text-white flex items-center gap-2">
                    <RocketLaunchIcon className="w-5 h-5 text-slate-500" />
                    Planned sprints
                  </h2>
                  <button
                    type="button"
                    onClick={() => navigate(`/${tenantSlug}/org/projects/sprints?projectId=${projectId}`)}
                    className="text-xs text-primary-600 dark:text-primary-400 font-medium hover:underline flex items-center gap-2"
                  >
                    Manage sprints <ChevronRightIcon className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  These are in <strong>planning</strong>. The overview highlights <strong>active</strong> sprints once you start one.
                </p>
                <div className="space-y-3">
                  {plannedSprintsList.slice(0, 5).map((sprint) => (
                    <div key={sprint._id} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{sprint.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {fmtDate(sprint.startDate)} → {fmtDate(sprint.endDate)}
                        </p>
                      </div>
                      <StatusBadge status="planning" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {upcomingMilestones.length > 0 && (
              <div className="glass-card-premium rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold font-heading text-gray-900 dark:text-white flex items-center gap-2">
                    <FlagIcon className="w-5 h-5 text-amber-500" />
                    Upcoming Milestones
                  </h2>
                  <button
                    type="button"
                    onClick={() => navigate(`/${tenantSlug}/org/projects/milestones?projectId=${projectId}`)}
                    className="text-xs text-primary-600 dark:text-primary-400 font-medium hover:underline flex items-center gap-2"
                  >
                    All milestones <ChevronRightIcon className="w-3 h-3" />
                  </button>
                </div>
                <div className="space-y-2">
                  {upcomingMilestones.map(m => {
                    const mDays = m.dueDate
                      ? Math.ceil((new Date(m.dueDate) - new Date()) / 86400000)
                      : null;
                    return (
                      <div key={m._id} className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${
                          m.status === 'at_risk' ? 'bg-red-500' : mDays !== null && mDays <= 7 ? 'bg-amber-500' : 'bg-amber-400'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{m.title || m.name}</p>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                          {fmtDate(m.dueDate)}
                          {mDays !== null && (
                            <span className={`ml-2 ${mDays < 0 ? 'text-red-500' : mDays <= 7 ? 'text-amber-500' : ''}`}>
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

            {(project?.description || project?.scope) && (
              <div className="glass-card-premium rounded-2xl p-6">
                <h2 className="font-semibold font-heading text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                  <DocumentTextIcon className="w-5 h-5 text-indigo-500" />
                  Project Scope
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {project.description || project.scope}
                </p>
              </div>
            )}
          </div>

          <div className="hidden lg:flex lg:flex-col space-y-8">
            {healthCard}

            <details className="glass-card-premium rounded-2xl p-0 group border border-transparent open:border-white/10">
              <summary className="cursor-pointer list-none px-6 py-4 font-semibold font-heading text-gray-900 dark:text-white text-sm flex items-center justify-between">
                <span>Project details</span>
                <ChevronRightIcon className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-90" />
              </summary>
              <div className="px-6 pb-6 pt-0 space-y-4 border-t border-gray-100 dark:border-gray-800">
                {[
                  { label: 'Budget', value: project?.budget?.total ? `$${fmtNum(project.budget.total)}` : null },
                  { label: 'Type', value: settings?.projectType?.replace(/_/g, ' ') },
                  { label: 'Team Size', value: project?.teamSize || project?.members?.length || null },
                ].filter(r => r.value).map(r => (
                  <div key={r.label} className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">{r.label}</span>
                    <span className="font-medium text-gray-900 dark:text-white">{r.value}</span>
                  </div>
                ))}
                {!project?.budget?.total && !settings?.projectType && !(project?.teamSize || project?.members?.length) && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">No extra details yet.</p>
                )}
              </div>
            </details>

            {settings && (
              <div className="glass-card-premium rounded-2xl p-6">
                <h2 className="font-semibold font-heading text-gray-900 dark:text-white text-sm mb-4">Enabled Features</h2>
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

            <div className="space-y-4">
              <NavTile icon={UsersIcon} label="Resources" sub="Team & allocation"
                accent="bg-violet-50 dark:bg-violet-900/20" iconColor="text-violet-600 dark:text-violet-400"
                onClick={() => navigate(`/${tenantSlug}/org/projects/${projectId}/team`)} />
              <NavTile icon={DocumentTextIcon} label="Deliverables" sub="Track deliverables"
                accent="bg-indigo-50 dark:bg-indigo-900/20" iconColor="text-indigo-600 dark:text-indigo-400"
                onClick={() => navigate(`/${tenantSlug}/org/projects/deliverables?projectId=${projectId}`)} />
              <NavTile icon={ExclamationTriangleIcon} label="Change Requests" sub="Scope changes"
                accent="bg-orange-50 dark:bg-orange-900/20" iconColor="text-orange-600 dark:text-orange-400"
                onClick={() => navigate(`/${tenantSlug}/org/projects/change-requests?projectId=${projectId}`)} />
            </div>
          </div>
        </div>

        {/* Mobile: details, features, nav (desktop shows these in the right column) */}
        <div className="lg:hidden space-y-8">
          <details className="glass-card-premium rounded-2xl p-0 group border border-transparent open:border-white/10">
            <summary className="cursor-pointer list-none px-6 py-4 font-semibold font-heading text-gray-900 dark:text-white text-sm flex items-center justify-between">
              <span>Project details</span>
              <ChevronRightIcon className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-90" />
            </summary>
            <div className="px-6 pb-6 pt-0 space-y-4 border-t border-gray-100 dark:border-gray-800">
              {[
                { label: 'Budget', value: project?.budget?.total ? `$${fmtNum(project.budget.total)}` : null },
                { label: 'Type', value: settings?.projectType?.replace(/_/g, ' ') },
                { label: 'Team Size', value: project?.teamSize || project?.members?.length || null },
              ].filter(r => r.value).map(r => (
                <div key={r.label} className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{r.label}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{r.value}</span>
                </div>
              ))}
              {!project?.budget?.total && !settings?.projectType && !(project?.teamSize || project?.members?.length) && (
                <p className="text-xs text-gray-500 dark:text-gray-400">No extra details yet.</p>
              )}
            </div>
          </details>

          {settings && (
            <div className="glass-card-premium rounded-2xl p-6">
              <h2 className="font-semibold font-heading text-gray-900 dark:text-white text-sm mb-4">Enabled Features</h2>
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

          <div className="space-y-4">
            <NavTile icon={UsersIcon} label="Resources" sub="Team & allocation"
              accent="bg-violet-50 dark:bg-violet-900/20" iconColor="text-violet-600 dark:text-violet-400"
              onClick={() => navigate(`/${tenantSlug}/org/projects/${projectId}/team`)} />
            <NavTile icon={DocumentTextIcon} label="Deliverables" sub="Track deliverables"
              accent="bg-indigo-50 dark:bg-indigo-900/20" iconColor="text-indigo-600 dark:text-indigo-400"
              onClick={() => navigate(`/${tenantSlug}/org/projects/deliverables?projectId=${projectId}`)} />
            <NavTile icon={ExclamationTriangleIcon} label="Change Requests" sub="Scope changes"
              accent="bg-orange-50 dark:bg-orange-900/20" iconColor="text-orange-600 dark:text-orange-400"
              onClick={() => navigate(`/${tenantSlug}/org/projects/change-requests?projectId=${projectId}`)} />
          </div>
        </div>

        <AtRiskDeliverables projectId={projectId} />
      </div>
    </ErrorBoundary>
  );
};

export default ProjectDashboard;
