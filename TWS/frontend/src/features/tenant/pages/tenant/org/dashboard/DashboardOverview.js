/**
 * DashboardOverview — clean ERP dashboard for general / business tenants.
 *
 * Data-only: every number comes from the API.
 * No fake trends, no hardcoded percentages, no seed-data tooling.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserIcon,
  UsersIcon,
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { tenantApiService } from '../../../../../../shared/services/tenant/tenant-api.service';
import LoadingSpinner from '../../../../../../shared/components/feedback/LoadingSpinner';
import ErrorState from '../../../../../../shared/components/feedback/ErrorState';
import EmptyState from '../../../../../../shared/components/feedback/EmptyState';
import { useTenantSlug } from '../../../../../../shared/hooks/useTenantSlug';

// ── Status badge styles (dark-mode safe) ─────────────────────────────────────
const STATUS_STYLES = {
  completed:   'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
  in_progress: 'bg-blue-100   dark:bg-blue-900/30   text-blue-700   dark:text-blue-300',
  pending:     'bg-amber-100  dark:bg-amber-900/30  text-amber-700  dark:text-amber-300',
  planning:    'bg-sky-100    dark:bg-sky-900/30    text-sky-700    dark:text-sky-300',
  on_hold:     'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
  cancelled:   'bg-red-100    dark:bg-red-900/30    text-red-700    dark:text-red-300',
};
const badge = (s) => STATUS_STYLES[s] || 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400';
const fmtLabel = (s) => (s || 'unknown').replace(/_/g, ' ');

// ── Sub-components ────────────────────────────────────────────────────────────
const KpiCard = ({ label, value, icon: Icon, color, bg }) => (
  <div className="bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
    <div className={`h-10 w-10 ${bg} rounded-lg flex items-center justify-center mb-4`}>
      <Icon className={`h-5 w-5 ${color}`} />
    </div>
    <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{value ?? '—'}</p>
  </div>
);

const ProgressCard = ({ title, total, completed, pct, breakdown, barColor }) => (
  <div className="bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
      <span className="text-xs text-gray-500 dark:text-gray-400">{total} total</span>
    </div>
    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
      <span>{completed} completed</span>
      <span className="font-semibold text-gray-900 dark:text-white">{pct.toFixed(0)}%</span>
    </div>
    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-4">
      <div
        className={`h-full ${barColor} rounded-full transition-all duration-500`}
        style={{ width: `${pct}%` }}
      />
    </div>
    <div className="flex flex-wrap gap-2">
      {breakdown.map(s => (
        <span key={s._id} className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${badge(s._id)}`}>
          {fmtLabel(s._id)} · {s.count}
        </span>
      ))}
    </div>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
const DashboardOverview = () => {
  const tenantSlug = useTenantSlug();
  const navigate       = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [data,    setData]    = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await tenantApiService.getDashboardOverview(tenantSlug);
      setData(result);
    } catch {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => { load(); }, [load]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) return <LoadingSpinner message="Loading dashboard..." className="min-h-[40vh] bg-transparent" />;

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) return <ErrorState title="Dashboard unavailable" message={error} onRetry={load} className="max-w-xl" />;

  if (!data) return <EmptyState title="No dashboard data" message="No overview metrics are available yet." className="max-w-xl" />;

  const { overview = {}, recentActivity = [], projectStatus = [], taskStatus = [] } = data;

  // Derived metrics (real data only)
  const totalProjects     = projectStatus.reduce((s, i) => s + i.count, 0);
  const completedProjects = projectStatus.find(i => i._id === 'completed')?.count ?? 0;
  const projectPct        = totalProjects > 0 ? (completedProjects / totalProjects) * 100 : 0;

  const totalTasks     = taskStatus.reduce((s, i) => s + i.count, 0);
  const completedTasks = taskStatus.find(i => i._id === 'completed')?.count ?? 0;
  const taskPct        = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const QUICK_ACTIONS = [
    { label: 'New Task',     path: `/${tenantSlug}/org/projects/tasks?create=task`, primary: true },
    { label: 'New Project',  path: `/${tenantSlug}/org/projects?create=project`,   primary: true },
    { label: 'My Work',      path: `/${tenantSlug}/org/my-work` },
    { label: 'Invite User',  path: `/${tenantSlug}/org/users/create` },
    { label: 'All Projects', path: `/${tenantSlug}/org/projects` },
    { label: 'HR & Payroll', path: `/${tenantSlug}/org/hr` },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Overview</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Organization at a glance</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 transition-colors"
        >
          <ArrowPathIcon className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Users"     value={overview.totalUsers}
          icon={UserIcon}         color="text-blue-600 dark:text-blue-400"
          bg="bg-blue-50 dark:bg-blue-900/30"
        />
        <KpiCard
          label="Employees"       value={overview.totalEmployees}
          icon={UsersIcon}        color="text-emerald-600 dark:text-emerald-400"
          bg="bg-emerald-50 dark:bg-emerald-900/30"
        />
        <KpiCard
          label="Active Projects" value={overview.totalProjects}
          icon={ClipboardDocumentListIcon} color="text-violet-600 dark:text-violet-400"
          bg="bg-violet-50 dark:bg-violet-900/30"
        />
        <KpiCard
          label="Total Tasks"     value={overview.totalTasks}
          icon={CheckCircleIcon}  color="text-amber-600 dark:text-amber-400"
          bg="bg-amber-50 dark:bg-amber-900/30"
        />
      </div>

      {/* Progress Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ProgressCard
          title="Projects"  total={totalProjects} completed={completedProjects}
          pct={projectPct}  breakdown={projectStatus} barColor="bg-violet-500"
        />
        <ProgressCard
          title="Tasks"     total={totalTasks}    completed={completedTasks}
          pct={taskPct}     breakdown={taskStatus}    barColor="bg-emerald-500"
        />
      </div>

      {/* Activity + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-gray-700/60">
            <div className="flex items-center gap-2">
              <ClockIcon className="h-4 w-4 text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
            </div>
            <button
              onClick={() => navigate(`/${tenantSlug}/org/projects`)}
              className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
            >
              View all →
            </button>
          </div>

          {recentActivity.length > 0 ? (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700/60">
              {recentActivity.map((item, i) => (
                <li key={i} className="px-5 py-3.5 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors">
                  <span className={`shrink-0 mt-0.5 h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ${badge(item.status)}`}>
                    {(item.title || item.name || '?')[0].toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {item.title || item.name || 'Untitled'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {[item.project?.name, item.assignedTo?.fullName, item.updatedAt && new Date(item.updatedAt).toLocaleDateString()].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${badge(item.status)}`}>
                    {fmtLabel(item.status)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-16 text-center">
              <ClockIcon className="h-10 w-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No recent activity yet</p>
              <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">Activity appears here as you use the system</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
          <div className="space-y-2">
            {QUICK_ACTIONS.map(({ label, path, primary }) => (
              <button
                key={label}
                onClick={() => navigate(path)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  primary
                    ? 'bg-primary-600 hover:bg-primary-700 text-white'
                    : 'border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default DashboardOverview;
