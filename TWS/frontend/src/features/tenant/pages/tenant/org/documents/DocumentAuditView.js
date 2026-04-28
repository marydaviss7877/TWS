import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeftIcon, ClipboardDocumentListIcon, FunnelIcon, XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import * as documentHubApi from './documentHubApi';

const ACTION_LABELS = {
  viewed: 'Viewed',
  created: 'Created',
  edited: 'Edited',
  submitted_for_review: 'Submitted for review',
  approved: 'Approved',
  rejected: 'Rejected',
  archived: 'Archived',
  restored: 'Restored',
  deleted: 'Deleted',
};

const DocumentAuditView = () => {
  const { tenantSlug } = useParams();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [documentSearch, setDocumentSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchAudit = useCallback(async (page = 1) => {
    if (!tenantSlug) return;
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (documentSearch) params.documentSearch = documentSearch;
      if (actionFilter) params.action = actionFilter;
      if (userSearch) params.userSearch = userSearch;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      const res = await documentHubApi.listAudit(tenantSlug, params);
      const data = res.data || res;
      setEvents(data.events ?? []);
      setPagination(data.pagination ?? { page: 1, limit: 20, total: 0, pages: 1 });
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, documentSearch, actionFilter, userSearch, dateFrom, dateTo]);

  useEffect(() => {
    fetchAudit(pagination.page);
  }, [fetchAudit, pagination.page]);

  const clearFilters = () => {
    setDocumentSearch('');
    setActionFilter('');
    setUserSearch('');
    setDateFrom('');
    setDateTo('');
  };

  const hasFilters = documentSearch || actionFilter || userSearch || dateFrom || dateTo;

  return (
    <div className="min-h-full bg-[var(--tenant-bg)] text-[var(--tenant-text)]">
      <header className="border-b border-[var(--tenant-border)] bg-[var(--tenant-bg-elevated)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <button
            type="button"
            onClick={() => navigate(`/${tenantSlug}/org/documents`)}
            className="inline-flex items-center gap-1.5 text-sm text-[var(--tenant-muted)] hover:text-[var(--tenant-primary)] mb-4"
          >
            <ChevronLeftIcon className="h-5 w-5" />
            Back to Documents
          </button>
          <h1 className="text-2xl font-bold text-[var(--tenant-text)]">Audit log</h1>
          <p className="mt-1 text-sm text-[var(--tenant-muted)]">
            View, edit, and approval events across documents.
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Filters */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-bg-elevated)] hover:bg-[var(--tenant-bg)] transition"
          >
            <FunnelIcon className="h-5 w-5" />
            Filters
            {hasFilters && <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-[var(--tenant-primary)] text-white">{[documentSearch, actionFilter, userSearch, dateFrom, dateTo].filter(Boolean).length}</span>}
          </button>
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="ml-2 inline-flex items-center gap-1 px-3 py-2 text-sm text-[var(--tenant-muted)] hover:text-[var(--tenant-text)]"
            >
              <XMarkIcon className="h-4 w-4" />
              Clear
            </button>
          )}
        </div>

        {showFilters && (
          <div className="mb-6 p-4 rounded-xl border border-[var(--tenant-border)] bg-[var(--tenant-bg-elevated)] space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--tenant-text)] mb-1.5">Document</label>
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--tenant-muted)]" />
                  <input
                    type="text"
                    value={documentSearch}
                    onChange={(e) => setDocumentSearch(e.target.value)}
                    placeholder="Search by document ID or name"
                    className="w-full pl-10 pr-3 py-2 rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-bg)] text-[var(--tenant-text)] placeholder-[var(--tenant-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--tenant-primary)]/50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--tenant-text)] mb-1.5">Action</label>
                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-bg)] text-[var(--tenant-text)] focus:outline-none focus:ring-2 focus:ring-[var(--tenant-primary)]/50"
                >
                  <option value="">All actions</option>
                  {Object.keys(ACTION_LABELS).map((action) => (
                    <option key={action} value={action}>{ACTION_LABELS[action]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--tenant-text)] mb-1.5">User</label>
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--tenant-muted)]" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search by user ID or name"
                    className="w-full pl-10 pr-3 py-2 rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-bg)] text-[var(--tenant-text)] placeholder-[var(--tenant-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--tenant-primary)]/50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--tenant-text)] mb-1.5">Date From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-bg)] text-[var(--tenant-text)] focus:outline-none focus:ring-2 focus:ring-[var(--tenant-primary)]/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--tenant-text)] mb-1.5">Date To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-bg)] text-[var(--tenant-text)] focus:outline-none focus:ring-2 focus:ring-[var(--tenant-primary)]/50"
                />
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-[var(--tenant-muted)]">Loading…</div>
        ) : events.length === 0 ? (
          <div className="py-16 text-center">
            <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-[var(--tenant-muted)]" />
            <h2 className="mt-4 text-lg font-semibold text-[var(--tenant-text)]">No activity yet</h2>
            <p className="mt-1 text-sm text-[var(--tenant-muted)]">Events will appear here as documents are viewed, edited, or approved.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-[var(--tenant-border)] overflow-hidden bg-[var(--tenant-bg-elevated)]">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--tenant-border)] bg-[var(--tenant-bg)]">
                  <th className="p-3 font-medium text-[var(--tenant-text)]">When</th>
                  <th className="p-3 font-medium text-[var(--tenant-text)]">Action</th>
                  <th className="p-3 font-medium text-[var(--tenant-text)]">User</th>
                  <th className="p-3 font-medium text-[var(--tenant-text)]">Document</th>
                  <th className="p-3 font-medium text-[var(--tenant-text)]">Comment</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => (
                  <tr key={ev._id} className="border-b border-[var(--tenant-border)] last:border-0">
                    <td className="p-3 text-[var(--tenant-muted)]">
                      {ev.createdAt ? new Date(ev.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                    </td>
                    <td className="p-3 font-medium text-[var(--tenant-text)]">{ACTION_LABELS[ev.action] || ev.action}</td>
                    <td className="p-3 text-[var(--tenant-muted)]">{ev.userId?.fullName || ev.userId?.email || '—'}</td>
                    <td className="p-3">
                      {ev.documentId?.title ? (
                        <button type="button" onClick={() => navigate(`/${tenantSlug}/org/documents/${ev.documentId?._id || ev.documentId}`)} className="text-[var(--tenant-primary)] hover:underline truncate max-w-[180px] block text-left">
                          {ev.documentId.title}
                        </button>
                      ) : (
                        <span className="text-[var(--tenant-muted)]">—</span>
                      )}
                    </td>
                    <td className="p-3 text-[var(--tenant-muted)] max-w-[200px] truncate">{ev.comment || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pagination.pages > 1 && (
          <div className="mt-4 flex justify-center gap-2">
            <button type="button" disabled={pagination.page <= 1} onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))} className="px-3 py-1.5 rounded-lg border border-[var(--tenant-border)] disabled:opacity-50">Previous</button>
            <span className="px-3 py-1.5 text-sm text-[var(--tenant-muted)]">Page {pagination.page} of {pagination.pages}</span>
            <button type="button" disabled={pagination.page >= pagination.pages} onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))} className="px-3 py-1.5 rounded-lg border border-[var(--tenant-border)] disabled:opacity-50">Next</button>
          </div>
        )}
      </main>
    </div>
  );
};

export default DocumentAuditView;
