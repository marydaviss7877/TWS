/**
 * TenantAdminDashboard — org admin overview at /:tenantSlug/org/dashboard.
 * Presentation lives in TenantAdminDashboard.css (scoped .tad-dashboard).
 */

import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  ArrowPathIcon,
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  ChartPieIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  PresentationChartLineIcon,
  RocketLaunchIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  UserIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline';
import { useTenantAuth } from '../../../../../../app/providers/TenantAuthContext';
import { useTenantPermissions } from '../../../../contexts/TenantPermissionsContext';
import { tenantApiService } from '../../../../../../shared/services/tenant/tenant-api.service';
import { softwareHouseApi } from '../../../../../../shared/services/industry/softwareHouseApi';
import './TenantAdminDashboard.css';
import { useTenantSlug } from '../../../../../../shared/hooks/useTenantSlug';
import ProfileAvatar from '../../../../../../shared/components/ui/ProfileAvatar';

const STATUS_CLASS = {
  completed: 'tad-status tad-status--completed',
  in_progress: 'tad-status tad-status--in_progress',
  active: 'tad-status tad-status--in_progress',
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

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
});

function formatCompactCurrency(value) {
  if (value == null || Number.isNaN(value)) return '—';
  return currencyFormatter.format(value);
}

function formatDeadline(date) {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** pct: signed percent (or percentage-point delta when unit is 'pt'). null = no baseline to compare against. */
function TrendBadge({ pct, unit = '%', period = 'vs last period' }) {
  if (pct == null) return <span className="tad-trend tad-trend--muted">New this period</span>;
  const isUp = pct > 0;
  const isFlat = pct === 0;
  const Icon = isFlat ? null : isUp ? ArrowTrendingUpIcon : ArrowTrendingDownIcon;
  const cls = isFlat ? 'tad-trend tad-trend--flat' : isUp ? 'tad-trend tad-trend--up' : 'tad-trend tad-trend--down';
  const sign = pct > 0 ? '+' : '';
  return (
    <span className={cls}>
      {Icon && <Icon className="tad-trend__icon" aria-hidden />}
      {sign}
      {pct}
      {unit === 'pt' ? 'pt' : '%'} <span className="tad-trend__period">{period}</span>
    </span>
  );
}

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

/** Builds a CSS conic-gradient() value from [{ pct, color }] segments (pct sums to <=100). */
function conicGradient(segments, emptyColor = 'var(--tad-track)') {
  const total = segments.reduce((s, x) => s + (x.pct || 0), 0);
  if (total <= 0) return emptyColor;
  let acc = 0;
  const stops = segments
    .filter((s) => s.pct > 0)
    .map((s) => {
      const from = acc;
      acc += s.pct;
      return `${s.color} ${from}% ${acc}%`;
    });
  if (acc < 100) stops.push(`${emptyColor} ${acc}% 100%`);
  return `conic-gradient(${stops.join(', ')})`;
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
            <stop offset="0%" stopColor="var(--tad-accent)" stopOpacity="0.32" />
            <stop offset="100%" stopColor="var(--tad-accent)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={strokeId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--tad-accent)" />
            <stop offset="100%" stopColor="var(--tad-accent-2)" />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#${fillId})`} className="tad-dashboard__spark-area" />
        <path d={lineD.trim()} fill="none" stroke={`url(#${strokeId})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="tad-dashboard__spark-line" />
      </svg>
    </figure>
  );
}

function StatCard({ label, value, sub, trendPct, trendUnit, trendPeriod, icon: Icon }) {
  return (
    <div className="tad-stat">
      <div className="tad-stat__top">
        <span className="tad-stat__icon" aria-hidden>
          <Icon />
        </span>
        {trendPct !== undefined && <TrendBadge pct={trendPct} unit={trendUnit} period={trendPeriod} />}
      </div>
      <p className="tad-stat__label">{label}</p>
      <p className="tad-stat__value">{value ?? '—'}</p>
      {sub && <p className="tad-stat__sub">{sub}</p>}
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
        </div>
        <div className="tad-skel-grid tad-skel-grid--kpi">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="tad-skel tad-skel--kpi" />
          ))}
        </div>
        <div className="tad-skel-grid tad-skel-grid--charts">
          <div className="tad-skel tad-skel--panel tad-skel--panel-tall" />
          <div className="tad-skel tad-skel--panel tad-skel--panel-tall" />
          <div className="tad-skel tad-skel--panel tad-skel--panel-tall" />
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
  const tenantSlug = useTenantSlug();
  const navigate = useNavigate();
  const { user, tenant } = useTenantAuth();
  const { userPermissions, hasModulePermission } = useTenantPermissions();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshedAt, setRefreshedAt] = useState(null);
  const [orgOverview, setOrgOverview] = useState(null);
  const [shDash, setShDash] = useState(null);
  const [hrOverview, setHrOverview] = useState(null);
  const [financeOverview, setFinanceOverview] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [userTotal, setUserTotal] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
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
      tenantApiService.getUsers(tenantSlug, { page: 1, limit: 6 }),
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
    setTeamMembers(rUsers.status === 'fulfilled' && Array.isArray(rUsers.value?.users) ? rUsers.value.users : []);

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
  const orgTrends = orgOverview?.trends || {};
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
  const attendanceTrend = hrOverview?.attendanceTrend;

  const financeCurrent = financeOverview?.currentMonth || null;
  const financeTrends = financeOverview?.trends || {};
  const overdueInvoiceCount = financeOverview?.overdueInvoiceCount ?? 0;
  const overdueBillCount = financeOverview?.overdueBillCount ?? 0;

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

  const projectDonutSegments = useMemo(() => {
    const colors = {
      completed: 'var(--tad-good)',
      active: 'var(--tad-accent)',
      in_progress: 'var(--tad-accent)',
      planning: 'var(--tad-accent-2)',
      on_hold: 'var(--tad-warn)',
      cancelled: 'var(--tad-bad)',
    };
    return projectStatus
      .filter((s) => (s.count || 0) > 0)
      .map((s) => ({
        key: s._id,
        label: fmtStatus(s._id),
        count: s.count,
        pct: totalProjectsListed > 0 ? Math.round((s.count / totalProjectsListed) * 100) : 0,
        color: colors[s._id] || 'var(--tad-ink-3)',
      }));
  }, [projectStatus, totalProjectsListed]);

  const attentionItems = useMemo(() => {
    const items = [];
    if (pendingLeaveCount) {
      items.push({
        key: 'leave',
        icon: ClockIcon,
        title: 'Leave requests',
        sub: `${pendingLeaveCount} awaiting approval`,
        tag: pendingLeaveCount > 5 ? 'high' : 'medium',
        onClick: () => navigate(`/${tenantSlug}/org/hr/leave-requests`),
      });
    }
    if (isSoftwareHouse && m.atRiskProjects) {
      items.push({
        key: 'at-risk',
        icon: ExclamationTriangleIcon,
        title: `${m.atRiskProjects} project${m.atRiskProjects > 1 ? 's' : ''} at risk`,
        sub: 'Needs a check-in',
        tag: 'medium',
        onClick: () => navigate(`/${tenantSlug}/org/projects`),
      });
    }
    if (isSoftwareHouse && m.delayedProjects) {
      items.push({
        key: 'delayed',
        icon: ExclamationTriangleIcon,
        title: `${m.delayedProjects} project${m.delayedProjects > 1 ? 's' : ''} delayed`,
        sub: 'Behind schedule',
        tag: 'high',
        onClick: () => navigate(`/${tenantSlug}/org/projects`),
      });
    }
    if (isSoftwareHouse && overdueInvoiceCount) {
      items.push({
        key: 'ar-overdue',
        icon: BanknotesIcon,
        title: `${overdueInvoiceCount} invoice${overdueInvoiceCount > 1 ? 's' : ''} overdue`,
        sub: 'Payment past due',
        tag: 'high',
        onClick: () => navigate(`/${tenantSlug}/org/finance/accounts-receivable`),
      });
    }
    if (isSoftwareHouse && overdueBillCount) {
      items.push({
        key: 'ap-overdue',
        icon: BanknotesIcon,
        title: `${overdueBillCount} bill${overdueBillCount > 1 ? 's' : ''} overdue`,
        sub: 'Vendor payment due',
        tag: 'medium',
        onClick: () => navigate(`/${tenantSlug}/org/finance/accounts-payable`),
      });
    }
    return items;
  }, [pendingLeaveCount, isSoftwareHouse, m.atRiskProjects, m.delayedProjects, overdueInvoiceCount, overdueBillCount, navigate, tenantSlug]);

  const upcomingDeadlines = useMemo(() => {
    if (!isSoftwareHouse) return [];
    const items = [];
    activeSprints.forEach((s) => {
      if (s.endDate) {
        items.push({ key: `sprint-${s._id}`, title: s.name, sub: 'Sprint ends', date: new Date(s.endDate), icon: RocketLaunchIcon });
      }
    });
    recentProjects.forEach((p) => {
      if (p.timeline?.endDate) {
        items.push({ key: `proj-${p._id}`, title: p.name, sub: 'Project deadline', date: new Date(p.timeline.endDate), icon: ClipboardDocumentListIcon });
      }
    });
    return items
      .filter((i) => !Number.isNaN(i.date?.getTime()))
      .sort((a, b) => a.date - b.date)
      .slice(0, 5);
  }, [isSoftwareHouse, activeSprints, recentProjects]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  // userPermissions === null means still being fetched — wait before deciding access
  if (userPermissions === null) {
    return <DashboardSkeleton />;
  }

  const adminRoles = ['owner', 'admin', 'super_admin', 'org_manager', 'org_admin', 'tenant_owner'];
  const isAdminByRole = adminRoles.includes(String(user?.role || '').toLowerCase());
  const canViewAdminDashboard =
    isAdminByRole ||
    hasModulePermission?.('users', 'admin') ||
    hasModulePermission?.('projects', 'admin') ||
    hasModulePermission?.('finance', 'admin') ||
    hasModulePermission?.('payroll', 'admin');
  if (!canViewAdminDashboard) {
    return <Navigate to="../home" replace />;
  }

  return (
    <div className="tad-dashboard">
      <div className="tad-dashboard__shell tad-dashboard__stack tad-dashboard__shell--enter">
        <div className="tad-dashboard__hero">
          <header className="tad-dashboard__header">
            <div className="tad-dashboard__header-main">
              <div className="tad-dashboard__hero-kicker">
                <span className="tad-dashboard__hero-badge">Live workspace</span>
              </div>
              <h1 className="tad-dashboard__title tad-dashboard__title--display">
                {greeting()}, {user?.fullName || user?.name || 'there'}
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
              <div className="tad-health" aria-label="Organization delivery health">
                <div className="tad-health__ring" style={{ background: conicGradient([{ pct: deliveryHealth ?? 0, color: 'var(--tad-accent)' }]) }}>
                  <div className="tad-health__ring-label">
                    <span className="tad-health__num">{deliveryHealth != null ? deliveryHealth : '—'}</span>
                    <span className="tad-health__tag">Health</span>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {error && (
            <div className="tad-dashboard__alert" role="alert">
              <ExclamationTriangleIcon className="tad-dashboard__icon" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* STAT GRID */}
        <section aria-label="Key metrics" className="tad-dashboard__metrics-block">
          <div className="tad-dashboard__metrics-head">
            <p className="tad-dashboard__section-label tad-dashboard__mb-0">Key metrics</p>
            <p className="tad-dashboard__metrics-hint">Snapshot across your organization</p>
          </div>
          {isSoftwareHouse ? (
            <div className="tad-stat-grid">
              <StatCard
                label="Revenue MTD"
                value={formatCompactCurrency(financeCurrent?.revenue)}
                icon={BanknotesIcon}
                trendPct={financeTrends.revenue}
                trendPeriod="vs last month"
              />
              <StatCard
                label="Expenses MTD"
                value={formatCompactCurrency(financeCurrent?.expenses)}
                icon={BanknotesIcon}
                trendPct={financeTrends.expenses}
                trendPeriod="vs last month"
              />
              <StatCard
                label="Active Projects"
                value={m.activeProjects ?? overview.totalProjects}
                sub={`${m.completedProjects ?? 0} completed`}
                icon={ClipboardDocumentListIcon}
                trendPct={orgTrends.totalProjects}
                trendPeriod="vs last week"
              />
              <StatCard
                label="Team Utilization"
                value={attendancePulsePct != null ? `${attendancePulsePct}%` : '—'}
                sub="Attendance this month"
                icon={UserGroupIcon}
                trendPct={attendanceTrend}
                trendUnit="pt"
                trendPeriod="vs last month"
              />
              <StatCard
                label="Pending Invoices"
                value={formatCompactCurrency(financeOverview?.accountsReceivable)}
                icon={ClipboardDocumentListIcon}
                trendPct={financeTrends.accountsReceivable}
                trendPeriod="issuance vs last month"
              />
              <StatCard
                label="Cash Flow"
                value={formatCompactCurrency(financeCurrent?.netIncome)}
                sub="Net income MTD"
                icon={PresentationChartLineIcon}
                trendPct={financeTrends.netIncome}
                trendPeriod="vs last month"
              />
            </div>
          ) : (
            <div className="tad-stat-grid">
              <StatCard label="Users" value={displayUsers} icon={UserIcon} />
              <StatCard label="Employees" value={displayEmployees} icon={UserGroupIcon} />
              <StatCard label="Active projects" value={overview.totalProjects} icon={ClipboardDocumentListIcon} trendPct={orgTrends.totalProjects} trendPeriod="vs last week" />
              <StatCard label="Open tasks" value={overview.totalTasks} icon={CheckCircleIcon} />
              <StatCard label="Pending leave" value={pendingLeaveCount ?? '—'} sub="HR queue" icon={ClockIcon} />
            </div>
          )}
        </section>

        {/* QUICK ACTIONS */}
        <div className="tad-qa-row">
          <button type="button" className="tad-btn tad-btn--primary" onClick={() => navigate(`/${tenantSlug}/org/projects`)}>
            <PlusIcon className="tad-btn__icon" />
            New project
          </button>
          <button type="button" className="tad-btn" onClick={() => navigate(`/${tenantSlug}/org/projects/tasks`)}>
            <CheckCircleIcon className="tad-btn__icon" />
            New task
          </button>
          {isSoftwareHouse && (
            <button type="button" className="tad-btn" onClick={() => navigate(`/${tenantSlug}/org/finance/accounts-receivable`)}>
              <BanknotesIcon className="tad-btn__icon" />
              Create invoice
            </button>
          )}
          <button type="button" className="tad-btn" onClick={() => navigate(`/${tenantSlug}/org/users?create=user`)}>
            <UserPlusIcon className="tad-btn__icon" />
            Add employee
          </button>
          {isSoftwareHouse && (
            <button type="button" className="tad-btn" onClick={() => navigate(`/${tenantSlug}/org/projects/sprints`)}>
              <RocketLaunchIcon className="tad-btn__icon" />
              Start sprint
            </button>
          )}
        </div>

        {/* CHART ROW */}
        <div className="tad-chart-row">
          <div className="tad-panel">
            <div className="tad-panel__head">
              <div>
                <p className="tad-panel__title">Delivery momentum</p>
                <p className="tad-panel__meta">{sparkBundle.source === 'daily' ? 'Last 7 days' : 'Task mix'}</p>
              </div>
            </div>
            <p className="tad-dashboard__spotlight-lede tad-mb-2">{healthNarrative(deliveryHealth)}</p>
            {showSparkline ? (
              <SparklineChart values={sparkBundle.values} ariaLabel={sparkBundle.caption} />
            ) : (
              <div className="tad-dashboard__spark tad-dashboard__spark--empty" aria-hidden />
            )}
            {trendPhrase && (
              <p className="tad-trend tad-trend--up tad-mt-2">
                <ArrowTrendingUpIcon className="tad-trend__icon" aria-hidden />
                {trendPhrase}
              </p>
            )}
            <p className="tad-panel__caption">{sparkBundle.caption}</p>
          </div>

          <div className="tad-panel">
            <div className="tad-panel__head">
              <div>
                <p className="tad-panel__title">{isSoftwareHouse ? 'Revenue vs Expenses' : 'Task status'}</p>
                <p className="tad-panel__meta">{isSoftwareHouse ? 'Last 2 months' : 'Current mix'}</p>
              </div>
            </div>
            {isSoftwareHouse ? (
              <>
                <div className="tad-mini-compare">
                  {[
                    { label: 'Last month', revenue: financeOverview?.previousMonth?.revenue || 0, expense: financeOverview?.previousMonth?.expenses || 0 },
                    { label: 'This month', revenue: financeCurrent?.revenue || 0, expense: financeCurrent?.expenses || 0 },
                  ].map((group) => {
                    const max = Math.max(1, financeOverview?.previousMonth?.revenue || 0, financeOverview?.previousMonth?.expenses || 0, financeCurrent?.revenue || 0, financeCurrent?.expenses || 0);
                    return (
                      <div className="tad-mini-compare__group" key={group.label}>
                        <div className="tad-mini-compare__bars">
                          <div className="tad-bar tad-bar--revenue" style={{ height: `${Math.max(4, (group.revenue / max) * 100)}%` }} title={`Revenue: ${formatCompactCurrency(group.revenue)}`} />
                          <div className="tad-bar tad-bar--expense" style={{ height: `${Math.max(4, (group.expense / max) * 100)}%` }} title={`Expenses: ${formatCompactCurrency(group.expense)}`} />
                        </div>
                        <span className="tad-mini-compare__label">{group.label}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="tad-legend">
                  <span><i className="tad-legend__dot" style={{ background: 'var(--tad-accent)' }} />Revenue</span>
                  <span><i className="tad-legend__dot" style={{ background: 'var(--tad-ink-3)' }} />Expenses</span>
                </div>
              </>
            ) : (
              <div className="tad-mini-compare">
                {taskStatus.filter((s) => (s.count || 0) > 0).map((s) => {
                  const max = Math.max(1, ...taskStatus.map((x) => x.count || 0));
                  return (
                    <div className="tad-mini-compare__group" key={String(s._id)}>
                      <div className="tad-mini-compare__bars">
                        <div className="tad-bar tad-bar--revenue" style={{ height: `${Math.max(4, (s.count / max) * 100)}%` }} title={`${s.count}`} />
                      </div>
                      <span className="tad-mini-compare__label capitalize">{fmtStatus(s._id)}</span>
                    </div>
                  );
                })}
                {!totalTasksListed && <p className="tad-dashboard__empty">No tasks yet</p>}
              </div>
            )}
          </div>

          <div className="tad-panel">
            <div className="tad-panel__head">
              <div>
                <p className="tad-panel__title">Project status</p>
                <p className="tad-panel__meta">This workspace</p>
              </div>
            </div>
            {projectDonutSegments.length ? (
              <div className="tad-donut-wrap">
                <div className="tad-donut" style={{ background: conicGradient(projectDonutSegments.map((s) => ({ pct: s.pct, color: s.color }))) }}>
                  <div className="tad-donut__label">
                    <span className="tad-donut__num">{totalProjectsListed}</span>
                    <span className="tad-donut__tag">Total</span>
                  </div>
                </div>
                <div className="tad-donut-legend">
                  {projectDonutSegments.map((s) => (
                    <div className="tad-donut-legend__row" key={s.key}>
                      <span className="tad-donut-legend__dot" style={{ background: s.color }} />
                      <span className="tad-donut-legend__label capitalize">{s.label}</span>
                      <span className="tad-donut-legend__val">{s.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="tad-dashboard__empty">
                <ChartPieIcon className="tad-dashboard__icon" aria-hidden />
                No projects yet
              </div>
            )}
          </div>
        </div>

        {/* MID ROW */}
        <div className="tad-mid-row">
          <div className="tad-panel">
            <div className="tad-panel__head">
              <div>
                <p className="tad-panel__title">Attention center</p>
                <p className="tad-panel__meta">{attentionItems.length} item{attentionItems.length === 1 ? '' : 's'}</p>
              </div>
            </div>
            {attentionItems.length ? (
              <div className="tad-att-list">
                {attentionItems.map((item) => (
                  <button type="button" key={item.key} className="tad-att-item" onClick={item.onClick}>
                    <span className="tad-att-item__icon"><item.icon aria-hidden /></span>
                    <span className="tad-att-item__body">
                      <span className="tad-att-item__title">{item.title}</span>
                      <span className="tad-att-item__sub">{item.sub}</span>
                    </span>
                    <span className={`tad-tag tad-tag--${item.tag}`}>{item.tag}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="tad-dashboard__empty">All caught up — nothing needs attention right now.</div>
            )}
          </div>

          <div className="tad-panel">
            <div className="tad-panel__head">
              <div>
                <p className="tad-panel__title">{isSoftwareHouse ? 'Finance summary' : 'Workforce'}</p>
                <p className="tad-panel__meta">This month</p>
              </div>
            </div>
            {isSoftwareHouse ? (
              <dl className="tad-fin-rows">
                <div className="tad-fin-row">
                  <dt>Revenue</dt>
                  <dd><b>{formatCompactCurrency(financeCurrent?.revenue)}</b><TrendBadge pct={financeTrends.revenue} period="" /></dd>
                </div>
                <div className="tad-fin-row">
                  <dt>Expenses</dt>
                  <dd><b>{formatCompactCurrency(financeCurrent?.expenses)}</b><TrendBadge pct={financeTrends.expenses} period="" /></dd>
                </div>
                <div className="tad-fin-row">
                  <dt>Net income</dt>
                  <dd><b>{formatCompactCurrency(financeCurrent?.netIncome)}</b><TrendBadge pct={financeTrends.netIncome} period="" /></dd>
                </div>
                <div className="tad-fin-row">
                  <dt>Pending invoices</dt>
                  <dd><b>{formatCompactCurrency(financeOverview?.accountsReceivable)}</b></dd>
                </div>
                <div className="tad-fin-row">
                  <dt>Pending bills</dt>
                  <dd><b>{formatCompactCurrency(financeOverview?.accountsPayable)}</b></dd>
                </div>
              </dl>
            ) : (
              <dl className="tad-fin-rows">
                <div className="tad-fin-row">
                  <dt>Employees</dt>
                  <dd><b>{displayEmployees ?? '—'}</b></dd>
                </div>
                <div className="tad-fin-row">
                  <dt>Departments</dt>
                  <dd><b>{departments.length}</b></dd>
                </div>
                <div className="tad-fin-row">
                  <dt>Pending leave</dt>
                  <dd><b>{pendingLeaveCount ?? '—'}</b></dd>
                </div>
                <div className="tad-fin-row">
                  <dt>Attendance</dt>
                  <dd><b>{attendancePulsePct != null ? `${attendancePulsePct}%` : '—'}</b></dd>
                </div>
              </dl>
            )}
          </div>

          <div className="tad-panel">
            <div className="tad-panel__head">
              <div>
                <p className="tad-panel__title">{isSoftwareHouse ? 'Sprint overview' : 'Task completion'}</p>
                <p className="tad-panel__meta">{isSoftwareHouse ? 'Active sprint' : 'This workspace'}</p>
              </div>
            </div>
            {isSoftwareHouse ? (
              <>
                <div className="tad-ring-lg" style={{ background: conicGradient([{ pct: taskPct, color: 'var(--tad-accent)' }]) }}>
                  <div className="tad-ring-lg__label">
                    <span className="tad-ring-lg__num">{taskPct}%</span>
                    <span className="tad-ring-lg__tag">Completed</span>
                  </div>
                </div>
                <dl className="tad-fin-rows">
                  <div className="tad-fin-row"><dt>Completed tasks</dt><dd><b>{completedTasks}</b></dd></div>
                  <div className="tad-fin-row"><dt>Total tasks</dt><dd><b>{totalTasksListed}</b></dd></div>
                  <div className="tad-fin-row"><dt>Active sprints</dt><dd><b>{sprints.activeSprints ?? 0}</b></dd></div>
                  <div className="tad-fin-row"><dt>Avg. velocity</dt><dd><b>{sprints.averageVelocity ?? 0}</b></dd></div>
                </dl>
              </>
            ) : (
              <>
                <div className="tad-ring-lg" style={{ background: conicGradient([{ pct: taskPct, color: 'var(--tad-accent)' }]) }}>
                  <div className="tad-ring-lg__label">
                    <span className="tad-ring-lg__num">{taskPct}%</span>
                    <span className="tad-ring-lg__tag">Completed</span>
                  </div>
                </div>
                <dl className="tad-fin-rows">
                  <div className="tad-fin-row"><dt>Completed tasks</dt><dd><b>{completedTasks}</b></dd></div>
                  <div className="tad-fin-row"><dt>Total tasks</dt><dd><b>{totalTasksListed}</b></dd></div>
                </dl>
              </>
            )}
          </div>
        </div>

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
                          onClick={() => p._id && navigate(`/${tenantSlug}/org/projects/${p.slug || p._id}`)}
                        >
                          <span className="min-w-0 truncate">{p.name}</span>
                          <span className="tad-dashboard__pill">{(p.status || 'active').replace(/_/g, ' ')}</span>
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

            {isSoftwareHouse && (
              <div className="tad-dashboard__panel tad-dashboard__panel--flush tad-mt-4">
                <div className="tad-dashboard__panel-header">
                  <div>
                    <p className="tad-dashboard__section-label">Portfolio</p>
                    <h2 className="tad-dashboard__panel-title">Project control center</h2>
                  </div>
                  <button type="button" className="tad-dashboard__link-row" onClick={() => navigate(`/${tenantSlug}/org/projects`)}>
                    View projects
                    <ChevronRightIcon className="tad-dashboard__icon" />
                  </button>
                </div>
                {recentProjects.length ? (
                  <div className="tad-table-scroll">
                    <table className="tad-table">
                      <thead>
                        <tr>
                          <th>Project</th>
                          <th>Status</th>
                          <th>Client</th>
                          <th>Deadline</th>
                          <th>Budget used</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentProjects.map((p, i) => {
                          const total = p.budget?.total || 0;
                          const spent = p.budget?.spent || 0;
                          const pct = total > 0 ? Math.min(100, Math.round((spent / total) * 100)) : null;
                          return (
                            <tr key={p._id || i} onClick={() => p._id && navigate(`/${tenantSlug}/org/projects/${p.slug || p._id}`)}>
                              <td className="tad-table__name">{p.name}</td>
                              <td><span className={`tad-health-pill tad-health-pill--${p.status === 'completed' ? 'ok' : p.status === 'on_hold' ? 'risk' : p.status === 'cancelled' ? 'delay' : 'ok'}`}>{fmtStatus(p.status)}</span></td>
                              <td>{p.clientId?.name || '—'}</td>
                              <td className="mono">{formatDeadline(p.timeline?.endDate) || '—'}</td>
                              <td>
                                {pct != null ? (
                                  <span className="tad-progress-inline">
                                    <span className="tad-progress-inline__track"><span className="tad-progress-inline__fill" style={{ width: `${pct}%` }} /></span>
                                    <span className="mono">{pct}%</span>
                                  </span>
                                ) : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="tad-dashboard__empty">No recent projects yet</div>
                )}
              </div>
            )}
          </div>

          <aside className="tad-dashboard__side-col tad-dashboard__side-stack" aria-label="Workspace shortcuts">
            <div className="tad-dashboard__panel tad-dashboard__panel-padding">
              <p className="tad-dashboard__section-label tad-dashboard__mb-2">Team overview</p>
              {teamMembers.length ? (
                <ul className="tad-team-list">
                  {teamMembers.slice(0, 6).map((tm) => (
                    <li key={tm._id} className="tad-team-row">
                      <ProfileAvatar person={tm} tenantSlug={tenantSlug} className="tad-team-row__avatar" fallbackClassName="" />
                      <span className="tad-team-row__body">
                        <span className="tad-team-row__name">{tm.fullName || tm.email || 'Team member'}</span>
                        <span className="tad-team-row__role capitalize">{fmtStatus(tm.role)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="tad-dashboard__body">No team members yet.</p>
              )}
              <div className="tad-dashboard__link-stack">
                <SidebarLink onClick={() => navigate(`/${tenantSlug}/org/users`)}>All users</SidebarLink>
              </div>
            </div>

            {isSoftwareHouse && upcomingDeadlines.length > 0 && (
              <div className="tad-dashboard__panel tad-dashboard__panel-padding">
                <p className="tad-dashboard__section-label tad-dashboard__mb-2">Upcoming deadlines</p>
                <ul className="tad-ev-list">
                  {upcomingDeadlines.map((ev) => (
                    <li key={ev.key} className="tad-ev-row">
                      <span className="tad-ev-row__icon"><ev.icon aria-hidden /></span>
                      <span className="tad-ev-row__body">
                        <span className="tad-ev-row__title">{ev.title}</span>
                        <span className="tad-ev-row__sub">{ev.sub}</span>
                      </span>
                      <span className="tad-ev-row__date mono">
                        <CalendarDaysIcon className="tad-dashboard__icon" aria-hidden />
                        {formatDeadline(ev.date)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

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
                <PresentationChartLineIcon className="tad-dashboard__icon tad-dashboard__icon--muted" />
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
