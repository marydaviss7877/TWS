/**
 * SoftwareHouseDashboard — clean ERP dashboard for software house tenants.
 *
 * Data-only: all numbers come from the API.
 * No Chart.js, no hardcoded percentages, no random data generators.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardDocumentListIcon,
  UsersIcon,
  RocketLaunchIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { softwareHouseApi } from '../../../shared/services/industry/softwareHouseApi';
import { useTenantSlug } from '../../../shared/hooks/useTenantSlug';

// ── Helpers ───────────────────────────────────────────────────────────────────
const badge = (type) => ({
  success:  'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
  warning:  'bg-amber-100  dark:bg-amber-900/30  text-amber-700  dark:text-amber-300',
  danger:   'bg-red-100    dark:bg-red-900/30    text-red-700    dark:text-red-300',
  info:     'bg-blue-100   dark:bg-blue-900/30   text-blue-700   dark:text-blue-300',
  neutral:  'bg-gray-100   dark:bg-gray-800      text-gray-600   dark:text-gray-400',
}[type] || 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400');

const projectHealthBadge = (p) => {
  const health = p.health || p.status || '';
  if (health === 'on_track' || health === 'active')   return badge('success');
  if (health === 'at_risk')                            return badge('warning');
  if (health === 'delayed' || health === 'overdue')    return badge('danger');
  if (health === 'completed')                          return badge('info');
  return badge('neutral');
};

const healthLabel = (p) => {
  const h = p.health || p.status || 'unknown';
  return h.replace(/_/g, ' ');
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';

// ── Sub-components ────────────────────────────────────────────────────────────
const KpiCard = ({ label, value, icon: Icon, color, bg, sub }) => (
  <div className="bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
    <div className={`h-10 w-10 ${bg} rounded-lg flex items-center justify-center mb-4`}>
      <Icon className={`h-5 w-5 ${color}`} />
    </div>
    <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{value ?? '—'}</p>
    {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
  </div>
);

const HealthBar = ({ label, count, total, colorClass }) => {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-600 dark:text-gray-400 capitalize">{label.replace(/_/g, ' ')}</span>
        <span className="font-medium text-gray-900 dark:text-white">{count}</span>
      </div>
      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${colorClass} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const SoftwareHouseDashboard = () => {
  const tenantSlug = useTenantSlug();
  const navigate       = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [dash,    setDash]    = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await softwareHouseApi.getDashboard(tenantSlug);
      const d   = res?.data?.data ?? res?.data ?? res;
      setDash(d);
    } catch {
      setError('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="h-10 w-10 rounded-full border-2 border-primary-500 border-t-transparent tws-loading-pulse" />
    </div>
  );

  if (error) return (
    <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 flex items-start gap-3">
      <ExclamationTriangleIcon className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-medium text-red-700 dark:text-red-300">{error}</p>
        <button onClick={load} className="mt-2 text-xs text-red-600 dark:text-red-400 underline">Retry</button>
      </div>
    </div>
  );

  if (!dash) return null;

  const m              = dash.metrics         ?? {};
  const projects       = m.projects           ?? {};
  const sprints        = m.sprints            ?? {};
  const recentProjects = dash.recentProjects  ?? [];
  const activeSprints  = dash.activeSprints   ?? [];

  const totalProjects = projects.totalProjects ?? 0;
  const onTrack  = projects.onTrackProjects ?? projects.onTrack ?? 0;
  const atRisk   = projects.atRiskProjects ?? projects.atRisk ?? 0;
  const delayed  = projects.delayedProjects ?? projects.delayed ?? 0;
  const healthTotal   = onTrack + atRisk + delayed;
  const teamMembers =
    m.team?.totalTeamMembers ?? m.team?.totalMembers ?? 0;
  const avgVelocity =
    sprints.averageVelocity ?? sprints.totalVelocity;

  const QUICK_ACTIONS = [
    { label: 'New Project',   path: `/${tenantSlug}/org/projects?create=project`,     primary: true },
    { label: 'New Task',      path: `/${tenantSlug}/org/projects/tasks?create=task`,  primary: true },
    { label: 'My Work',       path: `/${tenantSlug}/org/my-work` },
    { label: 'All Projects',  path: `/${tenantSlug}/org/projects` },
    { label: 'Team',          path: `/${tenantSlug}/org/software-house/hr/employees` },
    { label: 'Time Tracking', path: `/${tenantSlug}/org/software-house/time-tracking` },
  ];

  return (
    <div className="space-y-6 pb-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Software house at a glance</p>
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
          label="Active Projects"    value={projects.activeProjects}
          icon={ClipboardDocumentListIcon}  color="text-blue-600 dark:text-blue-400"
          bg="bg-blue-50 dark:bg-blue-900/30"
          sub={`${projects.completedProjects ?? 0} completed`}
        />
        <KpiCard
          label="Team Members"       value={teamMembers}
          icon={UsersIcon}           color="text-emerald-600 dark:text-emerald-400"
          bg="bg-emerald-50 dark:bg-emerald-900/30"
        />
        <KpiCard
          label="Active Sprints"     value={sprints.activeSprints}
          icon={RocketLaunchIcon}    color="text-violet-600 dark:text-violet-400"
          bg="bg-violet-50 dark:bg-violet-900/30"
          sub={avgVelocity != null && avgVelocity > 0 ? `Avg velocity: ${avgVelocity}` : undefined}
        />
        <KpiCard
          label="Completed Projects" value={projects.completedProjects}
          icon={CheckCircleIcon}     color="text-amber-600 dark:text-amber-400"
          bg="bg-amber-50 dark:bg-amber-900/30"
          sub={totalProjects > 0 ? `${((projects.completedProjects ?? 0) / totalProjects * 100).toFixed(0)}% of total` : undefined}
        />
      </div>

      {/* Project Health */}
      <div className="bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Project Health</h3>
        {healthTotal > 0 ? (
          <div className="space-y-3">
            <HealthBar label="On Track" count={onTrack} total={healthTotal} colorClass="bg-emerald-500" />
            <HealthBar label="At Risk"  count={atRisk} total={healthTotal} colorClass="bg-amber-500" />
            <HealthBar label="Delayed"  count={delayed} total={healthTotal} colorClass="bg-red-500" />
          </div>
        ) : (
          <p className="text-sm text-gray-400 dark:text-gray-600">No project health data yet</p>
        )}
      </div>

      {/* Recent Projects + Active Sprints + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Recent Projects */}
        <div className="bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-gray-700/60">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Recent Projects</h3>
            <button onClick={() => navigate(`/${tenantSlug}/org/projects`)} className="text-xs text-primary-600 dark:text-primary-400 hover:underline">
              All →
            </button>
          </div>
          {recentProjects.length > 0 ? (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700/60">
              {recentProjects.slice(0, 5).map((p, i) => (
                <li
                  key={p._id || i}
                  className="px-5 py-3 flex items-center justify-between gap-2 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors cursor-pointer"
                  onClick={() => navigate(`/${tenantSlug}/org/projects/${p.slug || p._id}`)}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{p.name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{p.clientName || p.client?.name || '—'}</p>
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${projectHealthBadge(p)}`}>
                    {healthLabel(p)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-12 text-center text-gray-400 dark:text-gray-600">
              <ClipboardDocumentListIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No projects yet</p>
            </div>
          )}
        </div>

        {/* Active Sprints */}
        <div className="bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-gray-700/60">
            <div className="flex items-center gap-2">
              <ClockIcon className="h-4 w-4 text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Active Sprints</h3>
            </div>
          </div>
          {activeSprints.length > 0 ? (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700/60">
              {activeSprints.slice(0, 5).map((s, i) => {
                const total  = (s.completedPoints ?? 0) + (s.remainingPoints ?? s.totalPoints ?? 0);
                const done   = s.completedPoints ?? 0;
                const pct    = total > 0 ? (done / total) * 100 : 0;
                return (
                  <li key={s._id || i} className="px-5 py-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{s.name}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 shrink-0 ml-2">{fmtDate(s.endDate)}</p>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-violet-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{done} / {total} pts</p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="py-12 text-center text-gray-400 dark:text-gray-600">
              <RocketLaunchIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No active sprints</p>
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

export default SoftwareHouseDashboard;
