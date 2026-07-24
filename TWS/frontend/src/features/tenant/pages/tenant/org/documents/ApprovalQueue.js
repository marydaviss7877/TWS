import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  DocumentTextIcon,
  ArrowRightIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChevronLeftIcon,
} from '@heroicons/react/24/outline';
import * as documentHubApi from './documentHubApi';
import { useTenantSlug } from '../../../../../../shared/hooks/useTenantSlug';

const ApprovalQueue = () => {
  const tenantSlug = useTenantSlug();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentsByDocId, setCommentsByDocId] = useState({});
  const [actingId, setActingId] = useState(null);

  const fetchQueue = useCallback(async () => {
    if (!tenantSlug) return;
    setLoading(true);
    try {
      const res = await documentHubApi.getInReview(tenantSlug);
      const list = res.data?.documents ?? res.documents ?? [];
      setDocuments(Array.isArray(list) ? list : []);
    } catch (e) {
      toast.error(e.message);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const handleApprove = async (id) => {
    setActingId(id);
    try {
      const comment = (commentsByDocId[id] || '').trim();
      await documentHubApi.approveDocument(tenantSlug, id, comment);
      setDocuments((prev) => prev.filter((d) => d._id !== id));
      setCommentsByDocId((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      toast.success('Document approved');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (id) => {
    setActingId(id);
    try {
      const comment = (commentsByDocId[id] || '').trim();
      await documentHubApi.rejectDocument(tenantSlug, id, comment);
      setDocuments((prev) => prev.filter((d) => d._id !== id));
      setCommentsByDocId((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      toast.success('Document returned to draft');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setActingId(null);
    }
  };

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
          <h1 className="text-2xl font-bold text-[var(--tenant-text)]">Approval queue</h1>
          <p className="mt-1 text-sm text-[var(--tenant-muted)]">
            Documents waiting for your review. Approve or reject with an optional comment.
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {loading ? (
          <div className="py-12 text-center text-[var(--tenant-muted)]">Loading…</div>
        ) : documents.length === 0 ? (
          <div className="py-16 text-center">
            <CheckCircleIcon className="mx-auto h-12 w-12 text-[var(--tenant-muted)]" />
            <h2 className="mt-4 text-lg font-semibold text-[var(--tenant-text)]">No documents in review</h2>
            <p className="mt-1 text-sm text-[var(--tenant-muted)]">When someone submits a document for review, it will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {documents.map((doc) => (
              <article
                key={doc._id}
                className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border border-[var(--tenant-border)] bg-[var(--tenant-bg-elevated)]"
              >
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => navigate(`/${tenantSlug}/org/documents/${doc._id}`)}
                >
                  <h3 className="font-semibold text-[var(--tenant-text)] truncate">{doc.title || 'Untitled'}</h3>
                  <p className="text-xs text-[var(--tenant-muted)] flex items-center gap-1.5 mt-0.5">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    Updated {doc.updatedAt ? new Date(doc.updatedAt).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—'}
                    {doc.createdBy?.fullName && ` · ${doc.createdBy.fullName}`}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                  <input
                    type="text"
                    placeholder="Comment (optional)"
                    value={commentsByDocId[doc._id] || ''}
                    onChange={(e) => setCommentsByDocId((prev) => ({ ...prev, [doc._id]: e.target.value }))}
                    className="sm:w-48 rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-bg)] px-3 py-2 text-sm placeholder-[var(--tenant-muted)]"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleApprove(doc._id)}
                      disabled={actingId !== null}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <CheckCircleIcon className="h-5 w-5" />
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReject(doc._id)}
                      disabled={actingId !== null}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium border border-red-500/50 text-red-600 hover:bg-red-500/10 disabled:opacity-50"
                    >
                      <XCircleIcon className="h-5 w-5" />
                      Reject
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/${tenantSlug}/org/documents/${doc._id}`)}
                  className="p-2 rounded-lg text-[var(--tenant-muted)] hover:bg-[var(--tenant-bg)] hover:text-[var(--tenant-primary)]"
                  aria-label="Open document"
                >
                  <ArrowRightIcon className="h-5 w-5" />
                </button>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default ApprovalQueue;
