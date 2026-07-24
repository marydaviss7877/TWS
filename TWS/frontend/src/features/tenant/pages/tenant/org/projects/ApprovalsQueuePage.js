/**
 * ApprovalsQueuePage
 * Nucleus Project OS - Approval Queue: deliverables pending current user's approval
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardDocumentCheckIcon,
  CheckCircleIcon,
  XCircleIcon,
  FlagIcon,
  BuildingOfficeIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import tenantProjectApiService from './services/tenantProjectApiService';
import { handleApiError } from './utils/errorHandler';
import { showSuccess, showError } from './utils/toastNotifications';
import DeliverableCardSkeleton from './components/deliverables/DeliverableCardSkeleton';
import { useTenantSlug } from '../../../../../../shared/hooks/useTenantSlug';

const STEP_NAMES = {
  1: 'Dev Lead',
  2: 'QA Lead',
  3: 'Security',
  4: 'Client'
};

const ApprovalsQueuePage = () => {
  const tenantSlug = useTenantSlug();
  const navigate = useNavigate();
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [approvingId, setApprovingId] = useState(null);
  const [notes, setNotes] = useState('');

  const fetchPending = async () => {
    if (!tenantSlug) return;
    try {
      setLoading(true);
      const response = await tenantProjectApiService.getPendingApprovals(tenantSlug);
      const data = response?.data ?? response ?? [];
      setPending(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching pending approvals:', err);
      setPending([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, [tenantSlug]);

  const handleApprove = async (approvalId) => {
    try {
      setApprovingId(approvalId);
      await tenantProjectApiService.approveStep(tenantSlug, approvalId, notes || null);
      showSuccess('Approved successfully');
      setNotes('');
      await fetchPending();
    } catch (err) {
      showError(handleApiError(err).message || 'Failed to approve');
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (approvalId, reason) => {
    if (!reason?.trim()) {
      showError('Rejection reason is required');
      return;
    }
    try {
      setRejectingId(approvalId);
      await tenantProjectApiService.rejectStep(tenantSlug, approvalId, reason);
      showSuccess('Rejected; deliverable moved to rework');
      setRejectReason('');
      setRejectingId(null);
      await fetchPending();
    } catch (err) {
      showError(handleApiError(err).message || 'Failed to reject');
    } finally {
      setRejectingId(null);
    }
  };

  const goToDeliverable = (deliverableId) => {
    navigate(`../deliverables/${deliverableId}`);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 animate-pulse" />
        <DeliverableCardSkeleton count={3} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl xl:text-3xl font-bold font-heading text-gray-900 dark:text-white">
          Approval Queue
        </h1>
        <p className="text-sm xl:text-base text-gray-600 dark:text-gray-300 mt-1">
          Deliverables waiting for your approval
        </p>
      </div>

      {pending.length === 0 ? (
        <div className="glass-card-premium p-12 text-center">
          <ClipboardDocumentCheckIcon className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">No pending approvals</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
            When a deliverable is ready for your review, it will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {pending.map((item) => {
            const d = item.deliverable || {};
            const p = item.project || {};
            const stepName = STEP_NAMES[item.step_number] || `Step ${item.step_number}`;
            const isApproving = approvingId === item._id;
            const isRejecting = rejectingId === item._id;
            const showRejectForm = rejectingId === item._id;

            return (
              <div
                key={item._id}
                className="glass-card p-6 hover-glow flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <FlagIcon className="w-5 h-5 text-primary-500 flex-shrink-0" />
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                      {d.name || 'Unnamed deliverable'}
                    </h3>
                  </div>
                  {p.name && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                      <BuildingOfficeIcon className="w-4 h-4 flex-shrink-0" />
                      <span>{p.name}</span>
                    </div>
                  )}
                  <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                    {stepName}
                  </div>
                  {d.target_date && (
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                      Target: {new Date(d.target_date).toLocaleDateString()}
                      {d.progress_percentage != null && ` · ${d.progress_percentage}% done`}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => goToDeliverable(d._id)}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    title="View deliverable"
                  >
                    <ChevronRightIcon className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApprove(item._id)}
                    disabled={isApproving || isRejecting}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    <CheckCircleIcon className="w-5 h-5" />
                    {isApproving ? 'Approving…' : 'Approve'}
                  </button>
                  {!showRejectForm ? (
                    <button
                      type="button"
                      onClick={() => setRejectingId(item._id)}
                      disabled={isApproving || isRejecting}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                    >
                      <XCircleIcon className="w-5 h-5" />
                      Reject
                    </button>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <input
                        type="text"
                        placeholder="Rejection reason (required)"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleReject(item._id, rejectReason)}
                          disabled={!rejectReason.trim() || isRejecting}
                          className="px-3 py-1.5 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          {isRejecting ? 'Rejecting…' : 'Confirm Reject'}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setRejectingId(null); setRejectReason(''); }}
                          className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ApprovalsQueuePage;
