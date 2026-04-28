import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  DocumentChartBarIcon,
  ArrowLeftIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import { tenantApiService } from '../../../../../../shared/services/tenant/tenant-api.service';
import LoadingSpinner from '../../../../../../shared/components/feedback/LoadingSpinner';
import ErrorState from '../../../../../../shared/components/feedback/ErrorState';
import EmptyState from '../../../../../../shared/components/feedback/EmptyState';

const REPORT_TYPES = [
  { value: 'summary', label: 'Summary' },
  { value: 'users', label: 'Users' },
  { value: 'projects', label: 'Projects' },
  { value: 'tasks', label: 'Tasks' },
  { value: 'financial', label: 'Financial' },
];

const PERIODS = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
];

const AnalyticsReports = () => {
  const { tenantSlug } = useParams();
  const navigate = useNavigate();
  const [reportType, setReportType] = useState('summary');
  const [period, setPeriod] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const fetchReport = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await tenantApiService.getAnalyticsReports(tenantSlug, { type: reportType, period });
        if (!cancelled) setReport(res?.data ?? res);
      } catch (err) {
        if (!cancelled) {
          console.error('Analytics reports fetch error:', err);
          setError(err.message || 'Failed to load report');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (tenantSlug) fetchReport();
    return () => { cancelled = true; };
  }, [tenantSlug, reportType, period]);

  const formatDate = (d) => (d ? new Date(d).toLocaleString() : '—');

  const exportCsv = () => {
    if (!report) return;
    const rows = [];
    if (report.reportType === 'users' && report.list?.length) {
      rows.push(['Name', 'Email', 'Role', 'Department', 'Created']);
      report.list.forEach((u) => rows.push([u.fullName || '', u.email || '', u.role || '', u.department?.name ?? '', formatDate(u.createdAt)]));
    } else if (report.reportType === 'projects' && report.list?.length) {
      rows.push(['Name', 'Status', 'Budget', 'Start', 'End', 'Created']);
      report.list.forEach((p) => rows.push([p.name || '', p.status || '', p.budget ?? '', formatDate(p.startDate), formatDate(p.endDate), formatDate(p.createdAt)]));
    } else if (report.reportType === 'tasks' && report.list?.length) {
      rows.push(['Title', 'Status', 'Priority', 'Due', 'Created']);
      report.list.forEach((t) => rows.push([t.title || '', t.status || '', t.priority || '', formatDate(t.dueDate), formatDate(t.createdAt)]));
    } else if (report.reportType === 'financial' && report.list?.length) {
      rows.push(['Type', 'Amount', 'Description', 'Date', 'Created']);
      report.list.forEach((f) => rows.push([f.type || '', f.amount ?? '', f.description || '', formatDate(f.date), formatDate(f.createdAt)]));
    }
    if (rows.length === 0) return;
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `analytics-report-${report.reportType}-${period}-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const canExport = report?.list?.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(`/${tenantSlug}/org/analytics`)}
            className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Back to analytics"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Analytics Reports</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-0.5">
              Generate and view detailed analytics reports
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800/80 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <FunnelIcon className="w-5 h-5" />
            <span className="text-sm font-medium">Filters</span>
          </div>
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Report type</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm min-w-[140px]"
              >
                {REPORT_TYPES.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Period</label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm min-w-[140px]"
              >
                {PERIODS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            {canExport && (
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={exportCsv}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium"
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  Export CSV
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && <ErrorState title="Report unavailable" message={error} className="max-w-xl" />}

      {loading ? (
        <LoadingSpinner message="Loading report..." className="min-h-[40vh] bg-transparent" />
      ) : report && (
        <div className="bg-white dark:bg-gray-800/80 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DocumentChartBarIcon className="w-5 h-5 text-indigo-500" />
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {REPORT_TYPES.find((r) => r.value === report.reportType)?.label || report.reportType} Report
              </span>
              <span className="text-gray-500 dark:text-gray-400 text-sm">
                ({PERIODS.find((p) => p.value === report.period)?.label || report.period})
              </span>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Generated {formatDate(report.generatedAt)}
            </span>
          </div>

          <div className="p-5">
            {/* Summary report: show all sections */}
            {report.reportType === 'summary' && (
              <div className="space-y-6">
                {report.users && (
                  <section>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">Users</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm text-gray-500 dark:text-gray-400 mb-2">By role</h4>
                        <ul className="space-y-1">
                          {(report.users.byRole || []).map((r, i) => (
                            <li key={i} className="flex justify-between text-sm">
                              <span className="text-gray-700 dark:text-gray-300">{String(r._id)}</span>
                              <span className="font-medium text-gray-900 dark:text-gray-100">{r.count}</span>
                            </li>
                          ))}
                          {(report.users.byRole || []).length === 0 && <li className="text-gray-500 text-sm">No data</li>}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-sm text-gray-500 dark:text-gray-400 mb-2">By department</h4>
                        <ul className="space-y-1">
                          {(report.users.byDepartment || []).map((r, i) => (
                            <li key={i} className="flex justify-between text-sm">
                              <span className="text-gray-700 dark:text-gray-300">{String(r._id)}</span>
                              <span className="font-medium text-gray-900 dark:text-gray-100">{r.count}</span>
                            </li>
                          ))}
                          {(report.users.byDepartment || []).length === 0 && <li className="text-gray-500 text-sm">No data</li>}
                        </ul>
                      </div>
                    </div>
                  </section>
                )}
                {report.projects && (
                  <section>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">Projects</h3>
                    <ul className="space-y-1">
                      {(report.projects.byStatus || []).map((r, i) => (
                        <li key={i} className="flex justify-between text-sm">
                          <span className="text-gray-700 dark:text-gray-300">{String(r._id)}</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">{r.count} (budget: {Number(r.totalBudget || 0).toLocaleString()})</span>
                        </li>
                      ))}
                      {(report.projects.byStatus || []).length === 0 && <li className="text-gray-500 text-sm">No data</li>}
                    </ul>
                  </section>
                )}
                {report.tasks && (
                  <section>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">Tasks</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm text-gray-500 dark:text-gray-400 mb-2">By status</h4>
                        <ul className="space-y-1">
                          {(report.tasks.byStatus || []).map((r, i) => (
                            <li key={i} className="flex justify-between text-sm">
                              <span className="text-gray-700 dark:text-gray-300">{String(r._id)}</span>
                              <span className="font-medium text-gray-900 dark:text-gray-100">{r.count}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-sm text-gray-500 dark:text-gray-400 mb-2">By priority</h4>
                        <ul className="space-y-1">
                          {(report.tasks.byPriority || []).map((r, i) => (
                            <li key={i} className="flex justify-between text-sm">
                              <span className="text-gray-700 dark:text-gray-300">{String(r._id)}</span>
                              <span className="font-medium text-gray-900 dark:text-gray-100">{r.count}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </section>
                )}
                {report.financial && (
                  <section>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">Financial</h3>
                    <ul className="space-y-1">
                      {(report.financial.byType || []).map((r, i) => (
                        <li key={i} className="flex justify-between text-sm">
                          <span className="text-gray-700 dark:text-gray-300">{String(r._id)}</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {Number(r.totalAmount || 0).toLocaleString()} ({r.count} entries)
                          </span>
                        </li>
                      ))}
                      {(report.financial.byType || []).length === 0 && <li className="text-gray-500 text-sm">No data</li>}
                    </ul>
                  </section>
                )}
              </div>
            )}

            {/* List reports: table */}
            {report.list && report.list.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                  <thead>
                    <tr>
                      {report.reportType === 'users' && (
                        <>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Email</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Role</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Department</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Created</th>
                        </>
                      )}
                      {report.reportType === 'projects' && (
                        <>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Budget</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Start</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">End</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Created</th>
                        </>
                      )}
                      {report.reportType === 'tasks' && (
                        <>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Title</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Priority</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Due</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Created</th>
                        </>
                      )}
                      {report.reportType === 'financial' && (
                        <>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Description</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Created</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                    {report.reportType === 'users' && report.list.map((u, i) => (
                      <tr key={i} className="text-sm">
                        <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{u.fullName || '—'}</td>
                        <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{u.email || '—'}</td>
                        <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{u.role || '—'}</td>
                        <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{u.department?.name ?? '—'}</td>
                        <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{formatDate(u.createdAt)}</td>
                      </tr>
                    ))}
                    {report.reportType === 'projects' && report.list.map((p, i) => (
                      <tr key={i} className="text-sm">
                        <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{p.name || '—'}</td>
                        <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{p.status || '—'}</td>
                        <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{p.budget != null ? Number(p.budget).toLocaleString() : '—'}</td>
                        <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{formatDate(p.startDate)}</td>
                        <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{formatDate(p.endDate)}</td>
                        <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{formatDate(p.createdAt)}</td>
                      </tr>
                    ))}
                    {report.reportType === 'tasks' && report.list.map((t, i) => (
                      <tr key={i} className="text-sm">
                        <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{t.title || '—'}</td>
                        <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{t.status || '—'}</td>
                        <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{t.priority || '—'}</td>
                        <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{formatDate(t.dueDate)}</td>
                        <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{formatDate(t.createdAt)}</td>
                      </tr>
                    ))}
                    {report.reportType === 'financial' && report.list.map((f, i) => (
                      <tr key={i} className="text-sm">
                        <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{f.type || '—'}</td>
                        <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{f.amount != null ? Number(f.amount).toLocaleString() : '—'}</td>
                        <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{f.description || '—'}</td>
                        <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{formatDate(f.date)}</td>
                        <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{formatDate(f.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">
                  Showing up to {report.list.length} records.
                </p>
              </div>
            )}

            {/* Aggregates only (e.g. users report has byRole, byDepartment but maybe no list in some edge case) */}
            {report.reportType !== 'summary' && (!report.list || report.list.length === 0) && (
              <div className="py-8 text-center">
                <p className="text-gray-500 dark:text-gray-400">No records for this report.</p>
                {report.byRole?.length > 0 && (
                  <ul className="mt-4 text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    {report.byRole.map((r, i) => (
                      <li key={i}>{String(r._id)}: {r.count}</li>
                    ))}
                  </ul>
                )}
                {report.byStatus?.length > 0 && (
                  <ul className="mt-4 text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    {report.byStatus.map((r, i) => (
                      <li key={i}>{String(r._id)}: {r.count}</li>
                    ))}
                  </ul>
                )}
                {report.byType?.length > 0 && (
                  <ul className="mt-4 text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    {report.byType.map((r, i) => (
                      <li key={i}>{String(r._id)}: {Number(r.totalAmount || 0).toLocaleString()} ({r.count} entries)</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {report.message && (
              <p className="text-gray-500 dark:text-gray-400 py-4">{report.message}</p>
            )}
          </div>
        </div>
      )}
      {!loading && !report && !error && (
        <EmptyState title="No report available" message="No report data is available for the selected filters." className="max-w-xl" />
      )}
    </div>
  );
};

export default AnalyticsReports;
