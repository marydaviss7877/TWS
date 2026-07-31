/**
 * ClientApprovalView Component
 * Simplified client-facing approval interface
 * Nucleus Project OS - Client Portal Integration
 */

import React, { useState, useEffect } from 'react';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import tenantProjectApiService from '../../services/tenantProjectApiService';
import { handleApiError } from '../../utils/errorHandler';
import { showSuccess, showError } from '../../utils/toastNotifications';
import ConfirmDialog from '../../../../../../../../components/ConfirmDialog/ConfirmDialog';
import PromptDialog from '../PromptDialog';
import { useTenantSlug } from '../../../../../../../../shared/hooks/useTenantSlug';

const ClientApprovalView = ({ deliverableId, deliverable, onApproval }) => {
  const tenantSlug = useTenantSlug();
  const [approval, setApproval] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [comment, setComment] = useState('');
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [showReasonPrompt, setShowReasonPrompt] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    if (deliverableId && tenantSlug) {
      fetchClientApproval();
    }
  }, [deliverableId, tenantSlug]);

  const fetchClientApproval = async () => {
    try {
      setLoading(true);
      const response = await tenantProjectApiService.getApprovalsForDeliverable(
        tenantSlug,
        deliverableId
      );
      
      const approvalsData = response?.data || response || [];
      const clientApproval = Array.isArray(approvalsData)
        ? approvalsData.find(a => a.step_number === 4 && a.approver_type === 'client')
        : null;
      
      setApproval(clientApproval);
    } catch (err) {
      console.error('Error fetching client approval:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!approval) return;
    
    setIsSubmitting(true);
    try {
      await tenantProjectApiService.approveStep(
        tenantSlug,
        approval._id || approval.id,
        comment || null
      );
      await fetchClientApproval();
      if (onApproval) {
        onApproval();
      }
      showSuccess('Deliverable approved successfully!');
      setComment('');
    } catch (err) {
      const errorMessage = handleApiError(err).message;
      showError(errorMessage || 'Failed to approve deliverable');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestChanges = () => {
    if (!approval) return;
    setRejectionReason('');
    setShowReasonPrompt(true);
  };
    
  const handleReasonSubmit = (reason) => {
    if (!reason || reason.trim().length === 0) {
      return;
    }
    setRejectionReason(reason);
    setShowReasonPrompt(false);
    setShowRejectConfirm(true);
  };

  const confirmReject = async () => {
    if (!approval || !rejectionReason) return;

    setIsSubmitting(true);
    try {
      await tenantProjectApiService.rejectStep(
        tenantSlug,
        approval._id || approval.id,
        rejectionReason
      );
      await fetchClientApproval();
      if (onApproval) {
        onApproval();
      }
      showSuccess('Change request submitted successfully');
      setShowRejectConfirm(false);
      setRejectionReason('');
    } catch (err) {
      const errorMessage = handleApiError(err).message;
      showError(errorMessage || 'Failed to submit change request');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="tws-loading-pulse rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!approval) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <p className="text-yellow-800 dark:text-yellow-300">
          No approval request found for this deliverable.
        </p>
      </div>
    );
  }

  const isPending = approval.status === 'pending' && approval.can_proceed;
  const isApproved = approval.status === 'approved';
  const isRejected = approval.status === 'rejected';

  return (
    <div className="client-approval-view bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {deliverable?.name || deliverable?.title || 'Deliverable Approval'}
        </h2>
        {deliverable?.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {deliverable.description}
          </p>
        )}
      </div>

      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-4">
          {isApproved && (
            <>
              <CheckCircleIcon className="w-6 h-6 text-green-500" />
              <span className="text-green-600 dark:text-green-400 font-medium">
                ✓ Approved
              </span>
            </>
          )}
          {isRejected && (
            <>
              <XCircleIcon className="w-6 h-6 text-red-500" />
              <span className="text-red-600 dark:text-red-400 font-medium">
                ✗ Changes Requested
              </span>
            </>
          )}
          {isPending && (
            <>
              <ClockIcon className="w-6 h-6 text-gray-400" />
              <span className="text-gray-600 dark:text-gray-400 font-medium">
                ⏳ Pending Your Review
              </span>
            </>
          )}
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <strong>Internal approval:</strong> ✅ Complete
          </p>
          <p className="text-sm text-blue-800 dark:text-blue-300 mt-1">
            <strong>Your review:</strong> {
              isPending ? '⏳ Pending' : 
              isApproved ? '✅ Approved' : 
              '❌ Changes Requested'
            }
          </p>
        </div>

        {approval.rejection_reason && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
            <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">
              Previous Change Request:
            </p>
            <p className="text-sm text-red-700 dark:text-red-400">
              {approval.rejection_reason}
            </p>
          </div>
        )}

        {approval.signature_timestamp && (
          <p className="text-xs text-gray-500 dark:text-gray-500">
            {isApproved ? 'Approved' : 'Requested changes'} on:{' '}
            {new Date(approval.signature_timestamp).toLocaleString()}
          </p>
        )}
      </div>

      {isPending && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Comments (Optional):
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add any comments about this deliverable..."
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows="3"
            />
          </div>

          <div className="flex space-x-3">
            <button
              onClick={handleApprove}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <CheckCircleIcon className="w-5 h-5" />
              <span>{isSubmitting ? 'Approving...' : 'Approve Deliverable'}</span>
            </button>
            <button
              onClick={handleRequestChanges}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <XCircleIcon className="w-5 h-5" />
              <span>{isSubmitting ? 'Submitting...' : 'Request Changes'}</span>
            </button>
          </div>
        </div>
      )}

      {isApproved && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <p className="text-sm text-green-800 dark:text-green-300">
            ✓ This deliverable has been approved and is ready to ship.
          </p>
        </div>
      )}

      {isRejected && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-sm text-yellow-800 dark:text-yellow-300">
            The team is working on the requested changes. You'll be notified when it's ready for review again.
          </p>
        </div>
      )}

      {/* Reason Prompt Dialog */}
      <PromptDialog
        isOpen={showReasonPrompt}
        onClose={() => setShowReasonPrompt(false)}
        onConfirm={handleReasonSubmit}
        title="Request Changes"
        message="Please provide a reason for requesting changes:"
        placeholder="Enter reason for changes..."
        confirmText="Continue"
        cancelText="Cancel"
        required={true}
      />

      {/* Rejection Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showRejectConfirm}
        onClose={() => {
          setShowRejectConfirm(false);
          setRejectionReason('');
        }}
        onConfirm={confirmReject}
        title="Confirm Change Request"
        message="Are you sure you want to request changes? This will move the deliverable back to rework."
        confirmText="Request Changes"
        cancelText="Cancel"
        variant="warning"
      />
    </div>
  );
};

export default ClientApprovalView;
