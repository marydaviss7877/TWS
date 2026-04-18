/**
 * TenantAdminDashboard — org admin overview at /:tenantSlug/org/dashboard.
 * Presentation lives in TenantAdminDashboard.css (scoped .tad-dashboard).
 */

import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowPathIcon,
  ArrowTrendingUpIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PresentationChartLineIcon,
  RocketLaunchIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { useTenantAuth } from '../../../../../../app/providers/TenantAuthContext';
import { tenantApiService } from '../../../../../../shared/services/tenant/tenant-api.service';
import { softwareHouseApi } from '../../../../../../shared/services/industry/softwareHouseApi';
import Breadcrumbs from '../../../../../../shared/components/navigation/Breadcrumbs';
import './TenantAdminDashboard.css';

const ADMIN_ROLES = ['owner', 'admin', 'super_admin', 'org_manager', 'org_admin', 'tenant_owner'];

const STATUS_CLASS = {
  completed: 'tad-status tad-status--completed',
  in_progress: 'tad-status tad-status--in_progress',
  pending: 'tad-status tad-status--pending',
  planning: 'tad-status tad-status--planning',
  on_hold: 'tad-status tad-status--on_hold',
  cancelled: 'tad-status tad-status--cancelled',
};

function statusAvatarClass(status) {
  const key = status || '';
  return STATUS_CLASS[key] || 'tad-status tad-status--default';
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function todayLabel() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

const fmtStatus = (s) => (s || 'unknown').replace(/_/g, ' ');

function deliveryHealthScore(projectPct, taskPct, totalProjectsListed, totalTasksListed) {
  if (totalProjectsListed <= 0 && totalTasksListed <= 0) return null;
  if (totalProjectsListed <= 0) return taskPct;
  if (totalTasksListed <= 0) return projectPct;
  return Math.round((projectPct + taskPct) / 2);
}

function buildDailyTaskUpdateSeries(rows, numDays = 7) {
  const counts = Array(numDays).fill(0);
  const dayStarts = [];
  const anchor = new Date();
  anchor.setHours(0, 0, 0, 0);
  for (let i = numDays - 1; i >= 0; i--) {
    const d = new Date(anchor);
    d.setDate(anchor.getDate() - i);
    dayStarts.push(d.getTime());
  }
  (rows || []).forEach((row) => {
    const t = new Date(row.updatedAt || row.createdAt || 0).getTime();
    if (!Number.isFinite(t)) return;
    for (let i = 0; i < numDays; i++) {
      const start = dayStarts[i];
      const end = start + 86400000;
      if (t >= start && t < end) {
        counts[i]++;
        break;
      }
    }
  });
  return counts;
}

function taskStatusMixSeries(taskStatus) {
  const order = ['completed', 'in_progress', 'pending', 'planning', 'on_hold'];
  const map = Object.fromEntries((taskStatus || []).map((x) => [String(x._id), x.count || 0]));
  return order.map((k) => map[k] ?? 0);
}

function sparkTrendPhrase(values) {
  if (!values || values.length < 4) return null;
  const mid = Math.floor(values.length / 2);
  if (mid < 1) return null;
  const first = values.slice(0, mid).reduce((s, v) => s + v, 0) / mid;
  const second = values.slice(mid).reduce((s, v) => s + v, 0) / (values.length - mid);
  if (second > first * 1.12) return 'Activity rising in this window';
  if (second < first * 0.88) return 'Activity easing in this window';
  return 'Steady through this window';
}

function healthNarrative(score) {
  if (score == null) return 'Add projects and tasks to unlock a blended delivery score.';
  if (score >= 78) return 'Completion is strong across the portfolio — keep finishing in-flight work.';
  if (score >= 55) return 'Healthy mix — tighten scope on aging items to lift completion.';
  return 'Pipeline-heavy — prioritize closing tasks and clearing blockers.';
}

function SparklineChart({ values, ariaLabel }) {
  const uid = useId().replace(/:/g, '');
  const fillId = `tad-spark-fill-${uid}`;
  const strokeId = `tad-spark-stroke-${uid}`;
  const n = values?.length || 0;
  if (n < 2) return null;
  const maxV = Math.max(1, ...values);
  const minV = 0;
  const w = 100;
  const h = 44;
  const padX = 1.5;
  const padY = 6;
  const xAt = (i) => padX + (n === 1 ? 0 : (i / (n - 1)) * (w - 2 * padX));
  const yAt = (v) => {
    const t = maxV === minV ? 0.5 : (v - minV) / (maxV - minV);
    return h - padY - t * (h - 2 * padY);
  };
  let lineD = '';
  values.forEach((v, i) => {
    lineD += `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(2)} ${yAt(v).toFixed(2)} `;
  });
  const areaD = `${lineD} L ${xAt(n - 1).toFixed(2)} ${h} L ${xAt(0).toFixed(2)} ${h} Z`;

  return (
    <figure className="tad-dashboard__spark" aria-label={ariaLabel}>
      <svg className="tad-dashboard__spark-svg" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img">
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary-500, #3b82f6)" stopOpacity="0.38" />
            <stop offset="100%" stopColor="var(--color-primary-500, #3b82f6)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={strokeId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--color-primary-600, #2563eb)" />
            <stop offset="100%" stopColor="var(--color-accent-500, #a855f7)" />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#${fillId})`} className="tad-dashboard__spark-area" />
        <path d={lineD.trim()} fill="none" stroke={`url(#${strokeId})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="tad-dashboard__spark-line" />
      </svg>
    </figure>
  );
}

function KpiMicro({ label, value, sub, icon: Icon }) {
  return (
    <div className="tad-dashboard__kpi">
      <div className="tad-dashboard__kpi-inner">
        <div className="tad-dashboard__kpi-body">
          <p className="tad-dashboard__kpi-label">{label}</p>
          <p className="tad-dashboard__kpi-value">{value ?? '—'}</p>
          {sub && <p className="tad-dashboard__kpi-sub">{sub}</p>}
        </div>
        {Icon && (
          <span className="tad-dashboard__kpi-icon-wrap" aria-hidden>
            <Icon className="tad-dashboard__kpi-icon-svg" />
          </span>
        )}
      </div>
    </div>
  );
}

function SegmentedBar({ rows, title, onViewAll, tenantSlug }) {
  const navigate = useNavigate();
  const total = rows.reduce((s, r) => s + (r.count || 0), 0);
  return (
    <div className="tad-segment">
      <div className="tad-segment__head">
        <h4 className="tad-segment__title">{title}</h4>
        {onViewAll && (
          <button
            type="button"
            className="tad-segment__open"
            onClick={() => navigate(`/${tenantSlug}/org/${onViewAll}`)}
          >
            Open
          </button>
        )}
      </div>
      {total > 0 ? (
        <div className="tad-segment__rows">
          {rows.map((r) => {
            const pct = total > 0 ? ((r.count || 0) / total) * 100 : 0;
            return (
              <div key={String(r._id)}>
                <div className="tad-segment__row-label">
                  <span className="capitalize">{fmtStatus(r._id)}</span>
                  <span className="tad-segment__row-count">{r.count}</span>
                </div>
                <div className="tad-segment__track">
                  <div className="tad-segment__fill" style={{ '--tad-pct': pct }} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="tad-segment__empty">No data</p>
      )}
    </div>
  );
}

function SidebarLink({ children, onClick }) {
  return (
    <button type="button" className="tad-dashboard__sidebar-link" onClick={onClick}>
      <span className="min-w-0">{children}</span>
      <ChevronRightIcon aria-hidden />
    </button>
  );
}

function DashboardSkeleton() {
  return (
    <div className="tad-dashboard tad-dashboard--skeleton" aria-busy="true" aria-label="Loading dashboard">
      <div className="tad-dashboard__shell tad-dashboard__stack">
        <div className="tad-skel tad-skel--breadcrumb" />
        <div className="tad-skel tad-skel--hero">
          <div className="tad-skel__hero-top">
            <span className="tad-skel tad-skel__pill" />
            <span className="tad-skel tad-skel__pill tad-skel__pill--short" />
          </div>
          <div className="tad-skel__line tad-skel__line--title" />
          <div className="tad-skel__line tad-skel__line--lede" />
          <div className="tad-skel__completion-pair">
            <div className="tad-skel__completion" />
            <div className="tad-skel__completion" />
          </div>
        </div>
        <div className="tad-skel__metrics-head">
          <span className="tad-skel tad-skel__pill tad-skel__pill--wide" />
          <span className="tad-skel__line tad-skel__line--hint" />
        </div>
        <div className="tad-skel-grid tad-skel-grid--kpi">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="tad-skel tad-skel--kpi" />
          ))}
        </div>
        <div className="tad-skel tad-skel--spotlight">
          <div className="tad-skel__spotlight-split">
            <div className="tad-skel__spotlight-main">
              <span className="tad-skel tad-skel__pill tad-skel__pill--wide" />
              <div className="tad-skel__line tad-skel__line--title" />
              <div className="tad-skel__line tad-skel__line--lede" />
              <div className="tad-skel__spark-placeholder" />
            </div>
            <div className="tad-skel__spotlight-aside">
              <span className="tad-skel tad-skel__pill" />
              <div className="tad-skel__line tad-skel__line--hint" />
              <div className="tad-skel__line tad-skel__line--hint" />
            </div>
          </div>
        </div>
        <div className="tad-skel-main">
          <div className="tad-skel tad-skel--panel tad-skel--panel-tall" />
          <div className="tad-skel tad-skel--side">
            <div className="tad-skel tad-skel--panel" />
            <div className="tad-skel tad-skel--panel tad-skel--panel-short" />
          </div>
        </div>
        <div className="tad-skel tad-skel--activity" />
      </div>
    </div>
  );
}

export default function TenantAdminDashboard() {
  const { tenantSlug } = useParams();
  const navigate = useNavigate();
  const { user, tenant } = useTenantAuth();
  const normalizedRole = String(user?.role || '').toLowerCase();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshedAt, setRefreshedAt] = useState(null);
  const [orgOverview, setOrgOverview] = useState(null);
  const [shDash, setShDash] = useState(null);
  const [hrOverview, setHrOverview] = useState(null);
  const [financeOverview, setFinanceOverview] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [userTotal, setUserTotal] = useState(null);
  const [pendingLeaveCount, setPendingLeaveCount] = useState(null);

  const erpCategory = tenant?.erpCategory || 'software_house';
  const isSoftwareHouse = erpCategory === 'software_house';

  const load = useCallback(async () => {
    if (!tenantSlug) return;
    setLoading(true);
    setError(null);

    const results = await Promise.allSettled([
      tenantApiService.getDashboardOverview(tenantSlug),
      isSoftwareHouse ? softwareHouseApi.getDashboard(tenantSlug) : Promise.resolve(null),
      tenantApiService.getHROverview(tenantSlug),
      isSoftwareHouse ? tenantApiService.getFinanceOverview(tenantSlug) : Promise.resolve(null),
      tenantApiService.getDepartments(tenantSlug),
      tenantApiService.getUsers(tenantSlug, { page: 1, limit: 1 }),
      tenantApiService.getLeaveRequests(tenantSlug, { status: 'pending', page: 1, limit: 50 }),
    ]);

    const [rOrg, rSh, rHr, rFin, rDept, rUsers, rLeave] = results;

    if (rOrg.status === 'fulfilled' && rOrg.value) setOrgOverview(rOrg.value);
    else setOrgOverview(null);

    if (rSh.status === 'fulfilled' && rSh.value) {
      const ax = rSh.value;
      const raw = ax?.data?.data ?? ax?.data ?? ax;
      setShDash(raw || null);
    } else setShDash(null);

    if (rHr.status === 'fulfilled') setHrOverview(rHr.value || null);
    else setHrOverview(null);

    if (rFin.status === 'fulfilled') setFinanceOverview(rFin.value || null);
    else setFinanceOverview(null);

    if (rDept.status === 'fulfilled') {
      const d = rDept.value;
      setDepartments(Array.isArray(d) ? d : d?.departments || []);
    } else setDepartments([]);

    if (rUsers.status === 'fulfilled' && rUsers.value?.pagination?.total != null) {
      setUserTotal(rUsers.value.pagination.total);
    } else if (rUsers.status === 'fulfilled' && Array.isArray(rUsers.value?.users)) {
      setUserTotal(rUsers.value.users.length);
    } else setUserTotal(null);

    if (rLeave.status === 'fulfilled' && rLeave.value) {
      const lv = rLeave.value;
      const list = lv.requests || lv.data || lv.items || (Array.isArray(lv) ? lv : []);
      const p = lv.pagination?.total;
      setPendingLeaveCount(typeof p === 'number' ? p : (Array.isArray(list) ? list.length : null));
    } else setPendingLeaveCount(null);

    const anyCore = rOrg.status === 'fulfilled' && rOrg.value;
    if (!anyCore && rOrg.status === 'rejected') {
      setError('Could not load organization overview.');
    }

    setRefreshedAt(new Date());
    setLoading(false);
  }, [tenantSlug, isSoftwareHouse]);

  useEffect(() => {
    load();
  }, [load]);

  const overview = orgOverview?.overview || {};
  const recentActivity = useMemo(() => orgOverview?.recentActivity || [], [orgOverview]);
  const projectStatus = useMemo(() => orgOverview?.projectStatus || [], [orgOverview]);
  const taskStatus = useMemo(() => orgOverview?.taskStatus || [], [orgOverview]);

  const totalProjectsListed = projectStatus.reduce((s, i) => s + (i.count || 0), 0);
  const completedProjects = projectStatus.find((i) => i._id === 'completed')?.count ?? 0;
  const projectPct = totalProjectsListed > 0 ? Math.round((completedProjects / totalProjectsListed) * 100) : 0;

  const totalTasksListed = taskStatus.reduce((s, i) => s + (i.count || 0), 0);
  const completedTasks = taskStatus.find((i) => i._id === 'completed')?.count ?? 0;
  const taskPct = totalTasksListed > 0 ? Math.round((completedTasks / totalTasksListed) * 100) : 0;

  const m = shDash?.metrics?.projects || {};
  const sprints = shDash?.metrics?.sprints || {};
  const teamN = shDash?.metrics?.team?.totalTeamMembers ?? shDash?.metrics?.team?.totalMembers ?? overview.totalEmployees;
  const recentProjects = shDash?.recentProjects || [];
  const activeSprints = shDash?.activeSprints || [];

  const displayUsers = userTotal ?? overview.totalUsers;
  const displayEmployees = overview.totalEmployees ?? teamN;

  const orgLabel = tenant?.name || tenantSlug;

  const attendanceStats = hrOverview?.attendanceStats || [];
  const totalAttendanceRows = attendanceStats.reduce((s, st) => s + (st.count || 0), 0);
  const presentAttendance = attendanceStats.find((st) => st._id === 'present')?.count || 0;
  const attendancePulsePct =
    totalAttendanceRows > 0 ? Math.round((presentAttendance / totalAttendanceRows) * 100) : null;

  const dailyActivitySeries = useMemo(() => buildDailyTaskUpdateSeries(recentActivity, 7), [recentActivity]);
  const statusMixSeries = useMemo(() => taskStatusMixSeries(taskStatus), [taskStatus]);

  const sparkBundle = useMemo(() => {
    const hasDaily = dailyActivitySeries.some((c) => c > 0);
    if (hasDaily) {
      return {
        values: dailyActivitySeries,
        source: 'daily',
        caption: 'Task updates recorded per day (last 7 days).',
      };
    }
    const mixSum = statusMixSeries.reduce((a, b) => a + b, 0);
    if (mixSum > 0) {
      return {
        values: statusMixSeries,
        source: 'status',
        caption: 'Task mix by status — use this shape when daily updates are quiet.',
      };
    }
    return {
      values: dailyActivitySeries,
      source: 'quiet',
      caption: 'No signal yet — create tasks and keep statuses fresh to populate this chart.',
    };
  }, [dailyActivitySeries, statusMixSeries]);

  const deliveryHealth = useMemo(
    () => deliveryHealthScore(projectPct, taskPct, totalProjectsListed, totalTasksListed),
    [projectPct, taskPct, totalProjectsListed, totalTasksListed],
  );

  const trendPhrase = useMemo(() => {
    if (sparkBundle.source !== 'daily') return null;
    return sparkTrendPhrase(sparkBundle.values);
  }, [sparkBundle.source, sparkBundle.values]);

  const showSparkline = sparkBundle.values.length >= 2 && sparkBundle.values.some((v) => v > 0);

  if (!ADMIN_ROLES.includes(normalizedRole)) {
    return <Navigate to="../home" replace />;
  }

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="tad-dashboard">
      <div className="tad-dashboard__shell tad-dashboard__stack tad-dashboard__shell--enter">
        <Breadcrumbs className="tad-dashboard__breadcrumbs" />

        <div className="tad-dashboard__hero">
          <header className="tad-dashboard__header">
            <div className="tad-dashboard__header-main">
              <div className="tad-dashboard__hero-kicker">
                <span className="tad-dashboard__hero-badge">Live workspace</span>
                <p className="tad-dashboard__section-label tad-dashboard__section-label--inline">Overview</p>
              </div>
              <h1 className="tad-dashboard__title tad-dashboard__title--display">
                {greeting()}, <span className="tad-dashboard__title-accent">{user?.fullName || user?.name || 'there'}</span>
              </h1>
              <p className="tad-dashboard__lede">
                <span className="tad-dashboard__org-mark">{orgLabel}</span>
                <span className="tad-dashboard__meta-dot"> · </span>
                {todayLabel()}
                <span className="tad-dashboard__meta-dot"> · </span>
                <span className="tad-dashboard__lede-role">Admin command center</span>
              </p>
            </div>
            <div className="tad-dashboard__header-actions">
              {refreshedAt && (
                <span className="tad-dashboard__meta-time">
                  Updated {refreshedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              <button type="button" className="tad-dashboard__btn tad-dashboard__btn--refresh" onClick={load} title="Refresh data">
                <ArrowPathIcon className="tad-dashboard__icon" />
                Refresh
              </button>
            </div>
          </header>

          {error && (
            <div className="tad-dashboard__alert" role="alert">
              <ExclamationTriangleIcon className="tad-dashboard__icon" />
              <span>{error}</span>
            </div>
          )}

          <div className="tad-dashboard__completion-grid">
            <div className="tad-dashboard__completion-card">
              <div className="tad-dashboard__completion-head">
                <span>Project completion</span>
                <span className="tad-dashboard__completion-value">{projectPct}%</span>
              </div>
              <div className="tad-dashboard__progress-track tad-dashboard__progress-track--lg">
                <div className="tad-dashboard__progress-fill" style={{ '--tad-pct': projectPct }} />
              </div>
            </div>
            <div className="tad-dashboard__completion-card">
              <div className="tad-dashboard__completion-head">
                <span>Task completion</span>
                <span className="tad-dashboard__completion-value">{taskPct}%</span>
              </div>
              <div className="tad-dashboard__progress-track tad-dashboard__progress-track--lg">
                <div className="tad-dashboard__progress-fill" style={{ '--tad-pct': taskPct }} />
              </div>
            </div>
          </div>

          <div className="tad-dashboard__pulse-row" aria-label="Workspace pulse">
            <button
              type="button"
              className="tad-dashboard__pulse-chip"
              onClick={() => navigate(`/${tenantSlug}/org/projects`)}
            >
              <span className="tad-dashboard__pulse-dot tad-dashboard__pulse-dot--brand" aria-hidden />
              <span className="tad-dashboard__pulse-copy">
                <span className="tad-dashboard__pulse-label">Project catalog</span>
                <span className="tad-dashboard__pulse-value">{overview.totalProjects ?? '—'} tracked</span>
              </span>
            </button>
            <button
              type="button"
              className="tad-dashboard__pulse-chip"
              onClick={() => navigate(`/${tenantSlug}/org/projects/tasks`)}
            >
              <span className="tad-dashboard__pulse-dot tad-dashboard__pulse-dot--violet" aria-hidden />
              <span className="tad-dashboard__pulse-copy">
                <span className="tad-dashboard__pulse-label">Work queue</span>
                <span className="tad-dashboard__pulse-value">{overview.totalTasks ?? '—'} open tasks</span>
              </span>
            </button>
            <button
              type="button"
              className="tad-dashboard__pulse-chip"
              onClick={() => navigate(`/${tenantSlug}/org/hr`)}
            >
              <span
                className={`tad-dashboard__pulse-dot ${attendancePulsePct != null ? 'tad-dashboard__pulse-dot--live' : 'tad-dashboard__pulse-dot--muted'}`}
                aria-hidden
              />
              <span className="tad-dashboard__pulse-copy">
                <span className="tad-dashboard__pulse-label">People pulse</span>
                <span className="tad-dashboard__pulse-value">
                  {attendancePulsePct != null ? `${attendancePulsePct}% attendance rate` : hrOverview ? 'HR synced' : 'Open HR'}
                </span>
              </span>
            </button>
            <button
              type="button"
              className="tad-dashboard__pulse-chip"
              onClick={() => navigate(`/${tenantSlug}/org/hr/leave-requests`)}
            >
              <span className="tad-dashboard__pulse-dot tad-dashboard__pulse-dot--amber" aria-hidden />
              <span className="tad-dashboard__pulse-copy">
                <span className="tad-dashboard__pulse-label">Approvals</span>
                <span className="tad-dashboard__pulse-value">
                  {pendingLeaveCount != null ? `${pendingLeaveCount} leave pending` : 'Leave queue'}
                </span>
              </span>
            </button>
          </div>
        </div>

        <section aria-label="Key metrics" className="tad-dashboard__metrics-block">
          <div className="tad-dashboard__metrics-head">
            <p className="tad-dashboard__section-label tad-dashboard__mb-0">Key metrics</p>
            <p className="tad-dashboard__metrics-hint">Snapshot across your organization</p>
          </div>
          <div className="tad-dashboard__kpi-grid">
            <KpiMicro label="Users" value={displayUsers} icon={UserIcon} />
            <KpiMicro label="Employees" value={displayEmployees} icon={UserGroupIcon} />
            <KpiMicro
              label="Active projects"
              value={isSoftwareHouse ? m.activeProjects ?? overview.totalProjects : overview.totalProjects}
              sub={isSoftwareHouse ? `${m.completedProjects ?? 0} done` : undefined}
              icon={ClipboardDocumentListIcon}
            />
            <KpiMicro label="Open tasks" value={overview.totalTasks} icon={CheckCircleIcon} />
            {isSoftwareHouse && <KpiMicro label="Active sprints" value={sprints.activeSprints} icon={RocketLaunchIcon} />}
            <KpiMicro label="Pending leave" value={pendingLeaveCount ?? '—'} sub="HR queue" icon={ClockIcon} />
          </div>
        </section>

        <section className="tad-dashboard__spotlight" aria-labelledby="tad-spotlight-heading">
          <div className="tad-dashboard__spotlight-grid">
            <div className="tad-dashboard__spotlight-main">
              <div className="tad-dashboard__spotlight-kicker">
                <PresentationChartLineIcon className="tad-dashboard__spotlight-icon" aria-hidden />
                <p className="tad-dashboard__section-label tad-dashboard__mb-0">Insight</p>
              </div>
              <h2 id="tad-spotlight-heading" className="tad-dashboard__spotlight-title">
                Delivery momentum
              </h2>
              <p className="tad-dashboard__spotlight-lede">{healthNarrative(deliveryHealth)}</p>
              <div className="tad-dashboard__spotlight-score-row">
                <div className="tad-dashboard__spotlight-score" aria-label="Blended delivery health">
                  <span className="tad-dashboard__spotlight-score-num">{deliveryHealth != null ? deliveryHealth : '—'}</span>
                  {deliveryHealth != null && <span className="tad-dashboard__spotlight-score-suffix">/ 100</span>}
                </div>
                {trendPhrase && (
                  <p className="tad-dashboard__spotlight-trend">
                    <ArrowTrendingUpIcon className="tad-dashboard__spotlight-trend-icon" aria-hidden />
                    {trendPhrase}
                  </p>
                )}
              </div>
              {showSparkline ? (
                <SparklineChart values={sparkBundle.values} ariaLabel={sparkBundle.caption} />
              ) : (
                <div className="tad-dashboard__spark tad-dashboard__spark--empty" aria-hidden />
              )}
              <p className="tad-dashboard__spotlight-caption">{sparkBundle.caption}</p>
              <div className="tad-dashboard__spotlight-actions">
                <button type="button" className="tad-dashboard__btn tad-dashboard__btn--primary" onClick={() => navigate(`/${tenantSlug}/org/analytics`)}>
                  Explore analytics
                </button>
                <button type="button" className="tad-dashboard__btn tad-dashboard__btn--secondary" onClick={() => navigate(`/${tenantSlug}/org/projects/tasks`)}>
                  Open tasks
                </button>
              </div>
            </div>
            <aside className="tad-dashboard__spotlight-aside" aria-label="Execution mix">
              <p className="tad-dashboard__section-label tad-dashboard__mb-2">Execution mix</p>
              <dl className="tad-dashboard__spotlight-dl">
                <div className="tad-dashboard__spotlight-dl-row">
                  <dt>Projects completed</dt>
                  <dd>{projectPct}%</dd>
                </div>
                <div className="tad-dashboard__spotlight-track-wrap">
                  <div className="tad-dashboard__progress-track tad-dashboard__progress-track--spot">
                    <div className="tad-dashboard__progress-fill" style={{ '--tad-pct': projectPct }} />
                  </div>
                </div>
                <div className="tad-dashboard__spotlight-dl-row tad-dashboard__mt-2">
                  <dt>Tasks completed</dt>
                  <dd>{taskPct}%</dd>
                </div>
                <div className="tad-dashboard__spotlight-track-wrap">
                  <div className="tad-dashboard__progress-track tad-dashboard__progress-track--spot">
                    <div className="tad-dashboard__progress-fill tad-dashboard__progress-fill--violet" style={{ '--tad-pct': taskPct }} />
                  </div>
                </div>
              </dl>
              <ul className="tad-dashboard__spotlight-mini">
                <li>
                  <strong>{overview.totalProjects ?? '—'}</strong>
                  <span>projects</span>
                </li>
                <li>
                  <strong>{overview.totalTasks ?? '—'}</strong>
                  <span>tasks</span>
                </li>
                <li>
                  <strong>{recentActivity.length}</strong>
                  <span>recent touches</span>
                </li>
              </ul>
            </aside>
          </div>
        </section>

        <div className="tad-dashboard__main-grid">
          <div className="tad-dashboard__main-col">
            <div className="tad-dashboard__panel tad-dashboard__panel--flush">
              <div className="tad-dashboard__panel-header">
                <div>
                  <p className="tad-dashboard__section-label">Delivery</p>
                  <h2 className="tad-dashboard__panel-title">Work in flight</h2>
                </div>
                <button
                  type="button"
                  className="tad-dashboard__link-row"
                  onClick={() => navigate(`/${tenantSlug}/org/projects`)}
                >
                  Projects
                  <ChevronRightIcon className="tad-dashboard__icon" />
                </button>
              </div>

              <div className="tad-dashboard__delivery-split">
                <div className="tad-dashboard__delivery-pane">
                  <h3 className="tad-dashboard__subhead">Recent projects</h3>
                  <ul className="tad-dashboard__list">
                    {recentProjects.slice(0, 6).map((p, i) => (
                      <li key={p._id || i}>
                        <button
                          type="button"
                          className="tad-dashboard__list-btn"
                          onClick={() => p._id && navigate(`/${tenantSlug}/org/projects/${p._id}`)}
                        >
                          <span className="min-w-0 truncate">{p.name}</span>
                          <span className="tad-dashboard__pill">{(p.health || p.status || 'active').replace(/_/g, ' ')}</span>
                        </button>
                      </li>
                    ))}
                    {!recentProjects.length && (
                      <li className="tad-dashboard__empty">
                        {isSoftwareHouse ? 'No recent projects yet' : 'Connect a software-house workspace for project highlights'}
                      </li>
                    )}
                  </ul>
                </div>

                <div className="tad-dashboard__delivery-pane">
                  <h3 className="tad-dashboard__subhead">Active sprints</h3>
                  <ul className="tad-dashboard__list">
                    {activeSprints.slice(0, 5).map((s, i) => {
                      const total = (s.completedPoints ?? 0) + (s.remainingPoints ?? s.totalPoints ?? 0);
                      const done = s.completedPoints ?? 0;
                      const pct = total > 0 ? (done / total) * 100 : 0;
                      return (
                        <li key={s._id || i} className="tad-dashboard__sprint-item">
                          <div className="tad-dashboard__sprint-head">
                            <span className="truncate">{s.name}</span>
                            <span className="tad-dashboard__sprint-date">
                              {s.endDate ? new Date(s.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}
                            </span>
                          </div>
                          <div className="tad-dashboard__progress-track">
                            <div className="tad-dashboard__progress-fill" style={{ '--tad-pct': pct }} />
                          </div>
                          <p className="tad-dashboard__sprint-meta">
                            {done} / {total} pts
                          </p>
                        </li>
                      );
                    })}
                    {!activeSprints.length && <li className="tad-dashboard__empty">No active sprints</li>}
                  </ul>
                </div>
              </div>

              <details className="tad-dashboard__details">
                <summary className="tad-dashboard__details-summary">
                  <span>Status breakdown</span>
                  <ChevronDownIcon className="tad-dashboard__details-chevron" aria-hidden />
                </summary>
                <div className="tad-dashboard__details-body">
                  <SegmentedBar rows={projectStatus} title="Projects by status" onViewAll="projects" tenantSlug={tenantSlug} />
                  <SegmentedBar rows={taskStatus} title="Tasks by status" onViewAll="projects/tasks" tenantSlug={tenantSlug} />
                </div>
              </details>
            </div>
          </div>

          <aside className="tad-dashboard__side-col tad-dashboard__side-stack" aria-label="Workspace shortcuts">
            <div className="tad-dashboard__panel tad-dashboard__divide-y">
              <div className="tad-dashboard__panel-padding">
                <p className="tad-dashboard__section-label tad-dashboard__mb-2">People</p>
                <dl>
                  <div className="tad-dashboard__dl-row">
                    <dt className="tad-dashboard__dt">Employees</dt>
                    <dd className="tad-dashboard__dd">{displayEmployees ?? '—'}</dd>
                  </div>
                  <div className="tad-dashboard__dl-row tad-dashboard__mt-2">
                    <dt className="tad-dashboard__dt">Pending leave</dt>
                    <dd className="tad-dashboard__dd">{pendingLeaveCount ?? '—'}</dd>
                  </div>
                </dl>
                {hrOverview && <p className="tad-dashboard__note">HR data is synced — open HR for full detail.</p>}
                <div className="tad-dashboard__link-stack">
                  <SidebarLink onClick={() => navigate(`/${tenantSlug}/org/software-house/hr`)}>HR overview</SidebarLink>
                  <SidebarLink onClick={() => navigate(`/${tenantSlug}/org/software-house/hr/leave-requests`)}>Leave requests</SidebarLink>
                </div>
              </div>

              <div className="tad-dashboard__panel-padding">
                <p className="tad-dashboard__section-label tad-dashboard__mb-2">Finance</p>
                <p className="tad-dashboard__body">
                  {financeOverview
                    ? 'Books are connected. Continue in Finance for AP, AR, and reporting.'
                    : 'Open Finance when you are ready to record movements and invoices.'}
                </p>
                <div className="tad-dashboard__link-stack">
                  <SidebarLink onClick={() => navigate(`/${tenantSlug}/org/finance`)}>Open finance</SidebarLink>
                </div>
              </div>

              <div className="tad-dashboard__panel-padding">
                <p className="tad-dashboard__section-label tad-dashboard__mb-2">Structure</p>
                <dl>
                  <div className="tad-dashboard__dl-row">
                    <dt className="tad-dashboard__dt">Departments</dt>
                    <dd className="tad-dashboard__dd">{departments.length}</dd>
                  </div>
                  <div className="tad-dashboard__dl-row tad-dashboard__mt-2">
                    <dt className="tad-dashboard__dt">Profile</dt>
                    <dd className="tad-dashboard__dd tad-dashboard__capitalize">{erpCategory.replace(/_/g, ' ')}</dd>
                  </div>
                </dl>
                <div className="tad-dashboard__link-stack">
                  <SidebarLink onClick={() => navigate(`/${tenantSlug}/org/departments`)}>Departments</SidebarLink>
                  <SidebarLink onClick={() => navigate(`/${tenantSlug}/org/operations`)}>Operations</SidebarLink>
                </div>
              </div>
            </div>

            <div className="tad-dashboard__panel tad-dashboard__panel-padding">
              <p className="tad-dashboard__section-label tad-dashboard__label-row tad-dashboard__mb-3">
                <ShieldCheckIcon className="tad-dashboard__icon" aria-hidden />
                Governance
              </p>
              <nav className="tad-dashboard__nav-stack" aria-label="Governance navigation">
                {[
                  ['Users', `/${tenantSlug}/org/users`],
                  ['Roles', `/${tenantSlug}/org/roles`],
                  ['Permissions', `/${tenantSlug}/org/permissions`],
                  ['Audit log', `/${tenantSlug}/org/audit`],
                  ['Settings', `/${tenantSlug}/org/settings`],
                ].map(([label, path]) => (
                  <button key={path} type="button" className="tad-dashboard__nav-btn" onClick={() => navigate(path)}>
                    {label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="tad-dashboard__panel tad-dashboard__panel-padding">
              <p className="tad-dashboard__section-label tad-dashboard__mb-2">Insights</p>
              <p className="tad-dashboard__body">Analytics and exports live in a dedicated space.</p>
              <button type="button" className="tad-dashboard__btn tad-dashboard__btn--primary" onClick={() => navigate(`/${tenantSlug}/org/analytics`)}>
                <ChartBarIcon className="tad-dashboard__icon tad-dashboard__icon--muted" />
                Open analytics
              </button>
              <button
                type="button"
                className="tad-dashboard__btn tad-dashboard__btn--secondary"
                onClick={() => navigate(`/${tenantSlug}/org/dashboard/analytics`)}
              >
                Dashboard analytics
              </button>
            </div>
          </aside>
        </div>

        <section className="tad-dashboard__panel tad-dashboard__panel--flush" aria-label="Recent activity">
          <div className="tad-dashboard__panel-header">
            <h2 className="tad-dashboard__panel-title">Recent activity</h2>
            <button type="button" className="tad-dashboard__link-inline" onClick={() => navigate(`/${tenantSlug}/org/projects`)}>
              View projects
            </button>
          </div>
          {recentActivity.length ? (
            <ul className="tad-dashboard__activity-list">
              {recentActivity.slice(0, 8).map((row, i) => (
                <li key={i} className="tad-dashboard__activity-row">
                  <span className={statusAvatarClass(row.status)}>{(row.title || row.name || '?')[0].toUpperCase()}</span>
                  <div className="tad-dashboard__activity-body">
                    <p className="tad-dashboard__activity-title">{row.title || row.name || 'Item'}</p>
                    <p className="tad-dashboard__activity-sub">
                      {[row.project?.name, row.assignedTo?.fullName, row.updatedAt && new Date(row.updatedAt).toLocaleString()]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  <span className="tad-dashboard__activity-status">{fmtStatus(row.status)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="tad-dashboard__empty">No recent activity yet</div>
          )}
        </section>

        <footer className="tad-dashboard__footer">
          <button type="button" className="tad-dashboard__link-inline" onClick={() => navigate(`/${tenantSlug}/org/clients`)}>
            Clients
          </button>
          <button type="button" className="tad-dashboard__link-inline" onClick={() => navigate(`/${tenantSlug}/org/documents`)}>
            Documents
          </button>
          <button type="button" className="tad-dashboard__link-inline" onClick={() => navigate(`/${tenantSlug}/org/my-work`)}>
            My work
          </button>
          <button type="button" className="tad-dashboard__link-inline" onClick={() => navigate(`/${tenantSlug}/org/home`)}>
            App launcher
          </button>
        </footer>
      </div>
    </div>
  );
}
