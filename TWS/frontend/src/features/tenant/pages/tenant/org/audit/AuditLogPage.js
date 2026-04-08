/**
 * Tenant audit log (Plan Phase 2, §10).
 * Filters: user, date range, resource type. Access: CEO / owner / admin.
 */
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const API = (tenantSlug, qs) => `/api/tenant/${tenantSlug}/audit${qs ? `?${qs}` : ''}`;

export default function AuditLogPage() {
  const { tenantSlug } = useParams();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '', resourceType: '', limit: 50 });
  const [total, setTotal] = useState(0);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);
      if (filters.resourceType) params.set('resourceType', filters.resourceType);
      if (filters.userId) params.set('userId', filters.userId);
      params.set('limit', String(filters.limit || 50));
      params.set('skip', '0');
      const res = await fetch(API(tenantSlug, params.toString()), { credentials: 'include' });
      const json = await res.json();
      if (json.success && json.data) {
        setLogs(json.data);
        setTotal(json.pagination?.total ?? json.data.length);
      } else {
        setLogs([]);
        setTotal(0);
      }
    } catch (e) {
      toast.error('Failed to load audit log');
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [tenantSlug, filters.dateFrom, filters.dateTo, filters.resourceType, filters.limit]);

  const exportCsv = () => {
    const headers = ['Date', 'User', 'Action', 'Resource Type', 'Resource ID', 'IP'];
    const rows = logs.map((l) => [
      l.createdAt ? new Date(l.createdAt).toISOString() : '',
      l.userId?.fullName || l.userId?.email || l.userId || '',
      l.action || '',
      l.resourceType || '',
      l.resourceId || '',
      l.ip || ''
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `audit-log-${tenantSlug}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success('Export started');
  };

  return (
    <div className="px-4 py-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <ClipboardDocumentListIcon className="w-6 h-6" />
          Audit Log
        </h1>
        <button
          type="button"
          onClick={exportCsv}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Export CSV
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-3 items-end">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600">From date</span>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
            className="border border-gray-300 rounded px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600">To date</span>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
            className="border border-gray-300 rounded px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600">Resource type</span>
          <input
            type="text"
            placeholder="e.g. payroll, project"
            value={filters.resourceType}
            onChange={(e) => setFilters((f) => ({ ...f, resourceType: e.target.value }))}
            className="border border-gray-300 rounded px-3 py-2 w-40"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600">Limit</span>
          <select
            value={filters.limit}
            onChange={(e) => setFilters((f) => ({ ...f, limit: Number(e.target.value) }))}
            className="border border-gray-300 rounded px-3 py-2"
          >
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
            <option value={500}>500</option>
          </select>
        </label>
        <button type="button" onClick={fetchLogs} className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700">
          Apply
        </button>
      </div>

      {loading ? (
        <div className="py-8 text-center text-gray-500">Loading...</div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="text-sm text-gray-600 px-4 py-2 bg-gray-50 border-b">
            {total} record(s)
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Resource</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">IP</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No audit records match your filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id}>
                    <td className="px-4 py-2 text-sm text-gray-900 whitespace-nowrap">
                      {log.createdAt ? new Date(log.createdAt).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      {log.userId?.fullName || log.userId?.email || log.userId || '—'}
                    </td>
                    <td className="px-4 py-2 text-sm">{log.action || '—'}</td>
                    <td className="px-4 py-2 text-sm">
                      {log.resourceType || '—'}
                      {log.resourceId ? ` (${log.resourceId})` : ''}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">{log.ip || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
