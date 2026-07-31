/**
 * Tenant audit trail — ERP-style activity register (who / what / when / where).
 * GET /api/tenant/:tenantSlug/audit
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ClipboardDocumentListIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  XMarkIcon,
  ClockIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useTenantSlug } from '../../../../../../shared/hooks/useTenantSlug';

const API = (tenantSlug, qs) => `/api/tenant/${tenantSlug}/audit${qs ? `?${qs}` : ''}`;

const MODULE_OPTIONS = [
  { value: '', label: 'All modules' },
  { value: 'payroll', label: 'Payroll' },
  { value: 'finance', label: 'Finance' },
  { value: 'project', label: 'Projects' },
  { value: 'employee', label: 'HR / Employees' },
  { value: 'attendance', label: 'Attendance' },
  { value: 'audit', label: 'Audit & compliance' },
  { value: 'settings', label: 'Settings' },
  { value: 'report', label: 'Reporting' },
  { value: 'client', label: 'Clients' },
  { value: 'invoice', label: 'Invoicing' }
];

const ACTION_OPTIONS = [
  { value: '', label: 'All actions' },
  { value: 'READ', label: 'Read / view' },
  { value: 'CREATE', label: 'Create' },
  { value: 'UPDATE', label: 'Update' },
  { value: 'DELETE', label: 'Delete' },
  { value: 'EXPORT', label: 'Export' },
  { value: 'IMPORT', label: 'Import' },
  { value: 'APPROVE', label: 'Approve' },
  { value: 'POST', label: 'POST' },
  { value: 'PUT', label: 'PUT' },
  { value: 'PATCH', label: 'PATCH' }
];

function actionBadgeClass(action) {
  const a = String(action || '').toUpperCase();
  if (a.includes('DELETE') || a.includes('FAIL')) return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200';
  if (a.includes('CREATE') || a.includes('POST')) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200';
  if (a.includes('UPDATE') || a.includes('PUT') || a.includes('PATCH')) return 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100';
  if (a.includes('EXPORT') || a.includes('IMPORT')) return 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200';
  if (a.includes('READ') || a === 'GET') return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200';
  return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
}

function formatUa(ua) {
  if (!ua) return '—';
  return ua.length > 48 ? `${ua.slice(0, 48)}…` : ua;
}

function setPresetRange(preset) {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  let start = new Date();
  start.setHours(0, 0, 0, 0);
  if (preset === 'today') {
    return { dateFrom: start.toISOString().slice(0, 10), dateTo: end.toISOString().slice(0, 10) };
  }
  if (preset === '7d') {
    start = new Date();
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);
    return { dateFrom: start.toISOString().slice(0, 10), dateTo: end.toISOString().slice(0, 10) };
  }
  if (preset === '30d') {
    start = new Date();
    start.setDate(start.getDate() - 30);
    start.setHours(0, 0, 0, 0);
    return { dateFrom: start.toISOString().slice(0, 10), dateTo: end.toISOString().slice(0, 10) };
  }
  if (preset === 'mtd') {
    start = new Date(end.getFullYear(), end.getMonth(), 1);
    return { dateFrom: start.toISOString().slice(0, 10), dateTo: end.toISOString().slice(0, 10) };
  }
  if (preset === 'ytd') {
    start = new Date(end.getFullYear(), 0, 1);
    return { dateFrom: start.toISOString().slice(0, 10), dateTo: end.toISOString().slice(0, 10) };
  }
  return { dateFrom: '', dateTo: '' };
}

export default function AuditLogPage() {
  const tenantSlug = useTenantSlug();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    resourceType: '',
    action: '',
    userId: '',
    searchDraft: '',
    pageSize: 25
  });
  /** Applied on “Run selection” so typing search does not hit the API each keystroke. */
  const [committedSearch, setCommittedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [summary, setSummary] = useState(null);
  const [lastLoadedAt, setLastLoadedAt] = useState(null);
  const [detail, setDetail] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);

  const skip = useMemo(() => (page - 1) * filters.pageSize, [page, filters.pageSize]);

  const buildParams = useCallback(
    (overrides = {}) => {
      const params = new URLSearchParams();
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);
      if (filters.resourceType) params.set('resourceType', filters.resourceType);
      if (filters.action) params.set('action', filters.action);
      if (filters.userId?.trim()) params.set('userId', filters.userId.trim());
      if (committedSearch?.trim()) params.set('search', committedSearch.trim());
      params.set('limit', String(overrides.limit ?? filters.pageSize));
      params.set('skip', String(overrides.skip ?? skip));
      params.set('includeSummary', overrides.includeSummary === false ? '0' : '1');
      return params;
    },
    [filters.dateFrom, filters.dateTo, filters.resourceType, filters.action, filters.userId, filters.pageSize, committedSearch, skip]
  );

  const fetchLogs = useCallback(
    async (opts = {}) => {
      const soft = opts.soft === true;
      if (soft) setRefreshing(true);
      else setLoading(true);
      try {
        const params = buildParams({ skip: (page - 1) * filters.pageSize });
        const res = await fetch(API(tenantSlug, params.toString()), { credentials: 'include' });
        const json = await res.json();
        if (json.success && json.data) {
          setLogs(json.data);
          setTotal(json.pagination?.total ?? json.data.length);
          setHasMore(Boolean(json.pagination?.hasMore));
          setSummary(json.summary || null);
          setLastLoadedAt(new Date());
        } else {
          setLogs([]);
          setTotal(0);
          setHasMore(false);
          setSummary(null);
          toast.error(json.message || 'Could not load audit register');
        }
      } catch (e) {
        toast.error('Failed to load audit log');
        setLogs([]);
        setTotal(0);
        setHasMore(false);
        setSummary(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [tenantSlug, page, filters.pageSize, buildParams]
  );

  useEffect(() => {
    setCommittedSearch('');
    setFilters((f) => ({ ...f, searchDraft: '' }));
  }, [tenantSlug]);

  useEffect(() => {
    setPage(1);
  }, [tenantSlug, filters.dateFrom, filters.dateTo, filters.resourceType, filters.action, filters.userId, filters.pageSize, committedSearch]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize) || 1);
  const rangeStart = total === 0 ? 0 : skip + 1;
  const rangeEnd = Math.min(skip + logs.length, total);

  const exportCsv = async () => {
    try {
      const params = buildParams({ limit: 500, skip: 0, includeSummary: false });
      const res = await fetch(API(tenantSlug, params.toString()), { credentials: 'include' });
      const json = await res.json();
      const rows = (json.data || []).map((l) => [
        l.createdAt ? new Date(l.createdAt).toISOString() : '',
        l.userId?.fullName || '',
        l.userId?.email || '',
        l.userId?.role || '',
        l.action || '',
        l.resourceType || '',
        l.resourceId || '',
        l.metadata?.outcome || l.metadata?.result || '',
        l.ip || '',
        (l.userAgent || '').replace(/\r?\n/g, ' ')
      ]);
      const headers = [
        'Timestamp (UTC)',
        'User name',
        'User email',
        'Role',
        'Action',
        'Module',
        'Resource ID',
        'Outcome',
        'IP address',
        'User agent'
      ];
      const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `audit-register-${tenantSlug}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success(rows.length ? `Exported ${rows.length} row(s)` : 'No rows to export');
    } catch (e) {
      toast.error('Export failed');
    }
  };

  return (
    <div className="px-3 py-3 sm:px-4 max-w-[1600px] mx-auto space-y-2.5">
      {/* Compact title bar */}
      <div className="glass-card-premium rounded-xl px-3 py-2 sm:px-4 flex flex-wrap items-center justify-between gap-2 border border-gray-200/60 dark:border-gray-700/50 shadow-sm">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
            <ClipboardDocumentListIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold truncate">
              Org / Governance / <span className="text-gray-800 dark:text-gray-200">Audit</span>
            </div>
            <h1 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white leading-tight truncate">
              Audit register
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {lastLoadedAt && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400 mr-1 tabular-nums">
              <ClockIcon className="w-3 h-3 shrink-0" />
              {lastLoadedAt.toLocaleTimeString()}
            </span>
          )}
          <button
            type="button"
            title="Refresh"
            onClick={() => fetchLogs({ soft: true })}
            disabled={refreshing || loading}
            className="glass-button inline-flex items-center justify-center h-8 w-8 sm:w-auto sm:px-2.5 rounded-lg text-xs"
          >
            <ArrowPathIcon className={`w-3.5 h-3.5 ${refreshing ? 'tws-loading-pulse' : ''}`} />
            <span className="hidden sm:inline ml-1.5">Refresh</span>
          </button>
          <button
            type="button"
            title="Export CSV"
            onClick={exportCsv}
            className="inline-flex items-center justify-center h-8 gap-1 rounded-lg border border-indigo-200/80 bg-indigo-50/80 px-2 text-[11px] font-medium text-indigo-900 hover:bg-indigo-100/90 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-100 dark:hover:bg-indigo-900/60"
          >
            <ArrowDownTrayIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">CSV</span>
          </button>
        </div>
      </div>

      {/* Inline metrics */}
      <div className="glass-card-premium rounded-xl px-3 py-2 border border-gray-200/60 dark:border-gray-700/50 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px]">
        <div className="flex items-baseline gap-1.5">
          <span className="text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Lines</span>
          <span className="text-base font-semibold tabular-nums text-gray-900 dark:text-white">{total.toLocaleString()}</span>
        </div>
        <span className="hidden sm:inline h-4 w-px bg-gray-200 dark:bg-gray-700" aria-hidden />
        <div className="flex items-baseline gap-1.5">
          <span className="text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Actors</span>
          <span className="text-base font-semibold tabular-nums text-gray-900 dark:text-white">
            {typeof summary?.uniqueUserCount === 'number' ? summary.uniqueUserCount.toLocaleString() : '—'}
          </span>
        </div>
        <span className="hidden sm:inline h-4 w-px bg-gray-200 dark:bg-gray-700" aria-hidden />
        <div className="flex flex-wrap items-center gap-1.5 min-w-0 flex-1">
          <span className="text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide shrink-0">Modules</span>
          <div className="flex flex-wrap gap-1 min-w-0">
            {(summary?.byResourceType || []).slice(0, 10).map((row) => (
              <span
                key={row.key}
                className="inline-flex items-center gap-1 rounded-md bg-slate-100/90 dark:bg-slate-800/90 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-slate-600/50"
              >
                <span className="truncate max-w-[100px]">{row.key}</span>
                <span className="tabular-nums text-slate-500 dark:text-slate-400">{row.count}</span>
              </span>
            ))}
            {(!summary?.byResourceType || summary.byResourceType.length === 0) && (
              <span className="text-gray-400 italic">No facet data</span>
            )}
          </div>
        </div>
      </div>

      {/* Collapsible filters */}
      <div className="glass-card-premium rounded-xl border border-gray-200/60 dark:border-gray-700/50 overflow-hidden">
        <button
          type="button"
          onClick={() => setFiltersOpen((o) => !o)}
          className="w-full flex items-center justify-between px-3 py-2 text-left text-xs font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-50/80 dark:hover:bg-gray-900/40"
        >
          <span>Selection criteria</span>
          {filtersOpen ? <ChevronUpIcon className="w-4 h-4 text-gray-500" /> : <ChevronDownIcon className="w-4 h-4 text-gray-500" />}
        </button>
        {filtersOpen && (
          <div className="px-3 pb-3 pt-0 space-y-2.5 border-t border-gray-100 dark:border-gray-800/80">
            <div className="flex flex-wrap gap-1 pt-2">
              {[
                { id: 'today', label: 'Today' },
                { id: '7d', label: '7d' },
                { id: '30d', label: '30d' },
                { id: 'mtd', label: 'MTD' },
                { id: 'ytd', label: 'YTD' },
                { id: 'all', label: 'Clear' }
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    if (p.id === 'all') setFilters((f) => ({ ...f, dateFrom: '', dateTo: '' }));
                    else setFilters((f) => ({ ...f, ...setPresetRange(p.id) }));
                    setPage(1);
                  }}
                  className="px-2 py-0.5 rounded-md text-[10px] font-semibold border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200"
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 xl:grid-cols-8 gap-2">
              <label className="flex flex-col gap-0.5 col-span-1">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">From</span>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
                  className="glass-input rounded-md px-2 py-1 text-[11px]"
                />
              </label>
              <label className="flex flex-col gap-0.5 col-span-1">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">To</span>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
                  className="glass-input rounded-md px-2 py-1 text-[11px]"
                />
              </label>
              <label className="flex flex-col gap-0.5 col-span-2 sm:col-span-1">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Module</span>
                <select
                  value={filters.resourceType}
                  onChange={(e) => setFilters((f) => ({ ...f, resourceType: e.target.value }))}
                  className="glass-input rounded-md px-2 py-1 text-[11px]"
                >
                  {MODULE_OPTIONS.map((o) => (
                    <option key={o.label} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-0.5 col-span-2 sm:col-span-1">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Action</span>
                <select
                  value={filters.action}
                  onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
                  className="glass-input rounded-md px-2 py-1 text-[11px]"
                >
                  {ACTION_OPTIONS.map((o) => (
                    <option key={o.label} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-0.5 col-span-2 lg:col-span-1">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">User id</span>
                <input
                  type="text"
                  placeholder="ObjectId"
                  value={filters.userId}
                  onChange={(e) => setFilters((f) => ({ ...f, userId: e.target.value }))}
                  className="glass-input rounded-md px-2 py-1 text-[10px] font-mono"
                />
              </label>
              <label className="flex flex-col gap-0.5 col-span-2 xl:col-span-2 min-w-0">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Search</span>
                <span className="relative">
                  <MagnifyingGlassIcon className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="search"
                    placeholder="Then Run — action, module, id, IP…"
                    value={filters.searchDraft}
                    onChange={(e) => setFilters((f) => ({ ...f, searchDraft: e.target.value }))}
                    className="glass-input rounded-md pl-7 pr-2 py-1 text-[11px] w-full"
                  />
                </span>
              </label>
              <label className="flex flex-col gap-0.5 col-span-1">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Rows</span>
                <select
                  value={filters.pageSize}
                  onChange={(e) => setFilters((f) => ({ ...f, pageSize: Number(e.target.value) }))}
                  className="glass-input rounded-md px-2 py-1 text-[11px]"
                >
                  {[25, 50, 100, 200].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setCommittedSearch(filters.searchDraft.trim());
                  setPage(1);
                }}
                className="h-7 px-3 rounded-md bg-gray-900 text-white text-[11px] font-semibold hover:bg-gray-800 dark:bg-indigo-600 dark:hover:bg-indigo-500"
              >
                Run selection
              </button>
              <span className="text-[10px] text-gray-500 dark:text-gray-400">Search applies on Run · tenant-scoped</span>
            </div>
          </div>
        )}
      </div>

      {/* Collapsible action mix */}
      {summary?.byAction?.length > 0 && (
        <div className="glass-card-premium rounded-xl border border-gray-200/60 dark:border-gray-700/50 overflow-hidden">
          <button
            type="button"
            onClick={() => setAnalyticsOpen((o) => !o)}
            className="w-full flex items-center justify-between px-3 py-1.5 text-left text-[11px] font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50/80 dark:hover:bg-gray-900/40"
          >
            <span>Action distribution</span>
            {analyticsOpen ? <ChevronUpIcon className="w-3.5 h-3.5" /> : <ChevronDownIcon className="w-3.5 h-3.5" />}
          </button>
          {analyticsOpen && (
            <div className="px-3 pb-2 flex gap-2 overflow-x-auto border-t border-gray-100 dark:border-gray-800/80 pt-2">
              {summary.byAction.map((row) => {
                const pct = total ? Math.round((row.count / total) * 100) : 0;
                return (
                  <div key={row.key} className="shrink-0 w-24">
                    <div className="flex justify-between text-[10px] mb-0.5 gap-1">
                      <span className="font-medium text-gray-700 dark:text-gray-200 truncate">{row.key}</span>
                      <span className="tabular-nums text-gray-400">{row.count}</span>
                    </div>
                    <div className="h-1 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                      <div className="h-full rounded-full bg-indigo-500 dark:bg-indigo-400" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Data grid */}
      {loading ? (
        <div className="glass-card-premium rounded-xl py-10 text-center text-xs text-gray-500">Loading…</div>
      ) : (
        <div className="glass-card-premium rounded-xl overflow-hidden border border-gray-200/60 dark:border-gray-700/50 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-1.5 border-b border-gray-200/80 dark:border-gray-700/80 bg-gray-50/90 dark:bg-gray-900/50">
            <div className="text-[11px] text-gray-600 dark:text-gray-400 tabular-nums">
              <span className="font-semibold text-gray-800 dark:text-gray-200">{rangeStart}</span>–
              <span className="font-semibold text-gray-800 dark:text-gray-200">{rangeEnd}</span>
              <span className="text-gray-400"> / </span>
              {total.toLocaleString()}
            </div>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1 rounded-md border border-gray-200 dark:border-gray-600 disabled:opacity-35 hover:bg-white dark:hover:bg-gray-800"
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </button>
              <span className="text-[11px] tabular-nums text-gray-600 dark:text-gray-400 px-1.5 min-w-[4.5rem] text-center">
                {page}/{totalPages}
              </span>
              <button
                type="button"
                disabled={!hasMore && page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1 rounded-md border border-gray-200 dark:border-gray-600 disabled:opacity-35 hover:bg-white dark:hover:bg-gray-800"
              >
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[min(70vh,720px)] overflow-y-auto">
            <table className="min-w-full text-[11px] leading-snug">
              <thead className="sticky top-0 z-10 bg-gray-100/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
                <tr className="text-left text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <th className="px-2 py-1.5 whitespace-nowrap">When</th>
                  <th className="px-2 py-1.5 min-w-[140px]">User</th>
                  <th className="px-2 py-1.5">Act</th>
                  <th className="px-2 py-1.5">Module</th>
                  <th className="px-2 py-1.5 min-w-[100px] max-w-[200px]">Resource</th>
                  <th className="px-2 py-1.5 hidden md:table-cell">Out</th>
                  <th className="px-2 py-1.5 whitespace-nowrap">IP</th>
                  <th className="px-2 py-1.5 hidden xl:table-cell max-w-[140px]">Client</th>
                  <th className="px-2 py-1.5 w-8 text-right pr-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/80">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-gray-500 dark:text-gray-400 text-xs">
                      No rows match.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const outcome = log.metadata?.outcome || log.metadata?.result || log.metadata?.status || '—';
                    const u = log.userId;
                    return (
                      <tr
                        key={log._id}
                        className="bg-white/80 dark:bg-gray-950/40 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/25 transition-colors"
                      >
                        <td className="px-2 py-1 align-top whitespace-nowrap tabular-nums text-gray-800 dark:text-gray-200">
                          {log.createdAt ? new Date(log.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td className="px-2 py-1 align-top max-w-[200px]">
                          <div className="font-medium text-gray-900 dark:text-gray-100 truncate" title={u?.fullName}>
                            {u?.fullName || '—'}
                          </div>
                          <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate" title={u?.email}>
                            {u?.email || ''}
                            {u?.role ? <span className="text-gray-400"> · {u.role}</span> : null}
                          </div>
                        </td>
                        <td className="px-2 py-1 align-top">
                          <span
                            className={`inline-flex px-1 py-0 rounded text-[10px] font-bold ${actionBadgeClass(log.action)}`}
                            title={log.action || ''}
                          >
                            {log.action || '—'}
                          </span>
                        </td>
                        <td className="px-2 py-1 align-top capitalize text-gray-700 dark:text-gray-300 truncate max-w-[120px]" title={log.resourceType}>
                          {log.resourceType || '—'}
                        </td>
                        <td className="px-2 py-1 align-top font-mono text-[10px] text-gray-600 dark:text-gray-400 truncate max-w-[200px]" title={log.resourceId}>
                          {log.resourceId || '—'}
                        </td>
                        <td className="px-2 py-1 align-top text-[10px] text-gray-500 dark:text-gray-400 hidden md:table-cell truncate max-w-[72px]" title={outcome}>
                          {outcome}
                        </td>
                        <td className="px-2 py-1 align-top font-mono text-[10px] text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {log.ip || '—'}
                        </td>
                        <td className="px-2 py-1 align-top text-[10px] text-gray-400 dark:text-gray-500 hidden xl:table-cell truncate max-w-[140px]" title={log.userAgent}>
                          {formatUa(log.userAgent)}
                        </td>
                        <td className="px-1 py-1 align-top text-right">
                          <button
                            type="button"
                            title="Line detail"
                            onClick={() => setDetail(log)}
                            className="inline-flex p-1 rounded-md text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100/80 dark:hover:bg-indigo-950/50"
                          >
                            <EyeIcon className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail drawer — compact */}
      {detail && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0 bg-black/45 backdrop-blur-[1px]" aria-label="Close" onClick={() => setDetail(null)} />
          <div className="relative w-full max-w-md h-full bg-white dark:bg-gray-950 shadow-2xl border-l border-gray-200 dark:border-gray-800 flex flex-col">
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Line detail</h2>
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-900"
                aria-label="Close"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
              <dl className="space-y-2 text-[11px]">
                <div>
                  <dt className="text-gray-500 font-semibold uppercase text-[10px]">When</dt>
                  <dd className="font-mono text-[10px] break-all mt-0.5">{detail.createdAt ? new Date(detail.createdAt).toISOString() : '—'}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 font-semibold uppercase text-[10px]">User</dt>
                  <dd className="break-words mt-0.5">
                    {detail.userId?.fullName}{' '}
                    <span className="text-gray-500">({detail.userId?.email})</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500 font-semibold uppercase text-[10px]">Action · module</dt>
                  <dd className="mt-0.5">
                    {detail.action} · {detail.resourceType}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500 font-semibold uppercase text-[10px]">Resource</dt>
                  <dd className="font-mono text-[10px] break-all mt-0.5">{detail.resourceId || '—'}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 font-semibold uppercase text-[10px]">IP</dt>
                  <dd className="font-mono text-[10px] mt-0.5">{detail.ip || '—'}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 font-semibold uppercase text-[10px]">Agent</dt>
                  <dd className="text-[10px] text-gray-600 dark:text-gray-400 break-all mt-0.5">{detail.userAgent || '—'}</dd>
                </div>
              </dl>
              <div>
                <div className="text-[10px] font-semibold text-gray-500 uppercase mb-1">Metadata</div>
                <pre className="text-[10px] font-mono bg-gray-50 dark:bg-gray-900 rounded-md p-2 overflow-x-auto border border-gray-200 dark:border-gray-800 leading-relaxed">
                  {JSON.stringify(detail.metadata && Object.keys(detail.metadata).length ? detail.metadata : {}, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
