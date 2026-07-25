/**
 * ApprovalProgress Component
 * Displays the sequential approval chain progress for a deliverable
 * Nucleus Project OS - Approval Workflow
 */

import React, { useState, useEffect } from 'react';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import {
  CheckCircleIcon as CheckCircleIconSolid
} from '@heroicons/react/24/solid';
import tenantProjectApiService from '../../services/tenantProjectApiService';
import { handleApiError } from '../../utils/errorHandler';
import { showSuccess, showError } from '../../utils/toastNotifications';
import ApprovalStep from './ApprovalStep';
import ConfirmDialog from '../../../../../../../../components/ConfirmDialog/ConfirmDialog';
import ApprovalProgressSkeleton from './ApprovalProgressSkeleton';
import { useTenantSlug } from '../../../../../../../../shared/hooks/useTenantSlug';

const ApprovalProgress = ({ deliverableId, isClientView = false, onApprovalChange }) => {
  const tenantSlug = useTenantSlug();
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [pendingReject, setPendingReject] = useState(null);

  useEffect(() => {
    if (deliverableId && tenantSlug) {
      fetchApprovals();
    }
  }, [deliverableId, tenantSlug]);

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await tenantProjectApiService.getApprovalsForDeliverable(
        tenantSlug,
        deliverableId
      );
      
      // Handle different response structures
      const approvalsData = response?.data || response || [];
      setApprovals(Array.isArray(approvalsData) ? approvalsData : []);
    } catch (err) {
      console.error('Error fetching approvals:', err);
      setError(handleApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (approvalId, notes = null) => {
    try {
      await tenantProjectApiService.approveStep(tenantSlug, approvalId, notes);
      await fetchApprovals();
      if (onApprovalChange) {
        onApprovalChange();
      }
      showSuccess('Approval step approved successfully');
    } catch (err) {
      const errorMessage = handleApiError(err).message;
      showError(errorMessage || 'Failed to approve step');
    }
  };

  const handleReject = async (approvalId, reason) => {
    if (!reason || reason.trim().length === 0) {
      showError('Please provide a rejection reason');
      return;
    }

    // Store pending rejection for confirmation
    setPendingReject({ approvalId, reason });
    setShowRejectConfirm(true);
  };

  const confirmReject = async () => {
    if (!pendingReject) return;

    try {
      await tenantProjectApiService.rejectStep(
        tenantSlug, 
        pendingReject.approvalId, 
        pendingReject.reason
      );
      await fetchApprovals();
      if (onApprovalChange) {
        onApprovalChange();
      }
      showSuccess('Approval step rejected. Deliverable moved to rework.');
      setShowRejectConfirm(false);
      setPendingReject(null);
    } catch (err) {
      const errorMessage = handleApiError(err).message;
      showError(errorMessage || 'Failed to reject step');
      setShowRejectConfirm(false);
      setPendingReject(null);
    }
  };

  const getStepName = (stepNumber, approverType) => {
    const stepNames = {
      1: 'Dev Lead',
      2: 'QA Lead',
      3: 'Security',
      4: 'Client'
    };
    return stepNames[stepNumber] || approverType.replace('_', ' ').toUpperCase();
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircleIconSolid className="w-6 h-6 text-green-500" />;
      case 'rejected':
        return <XCircleIcon className="w-6 h-6 text-red-500" />;
      case 'pending':
        return <ClockIcon className="w-6 h-6 text-gray-400" />;
      default:
        return <ClockIcon className="w-6 h-6 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'pending':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  if (loading) {
    return <ApprovalProgressSkeleton />;
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div className="flex items-center">
          <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
          <p className="text-red-800 dark:text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  if (approvals.length === 0) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <p className="text-yellow-800 dark:text-yellow-300">
          No approval chain set up for this deliverable. Please create an approval chain first.
        </p>
      </div>
    );
  }

  // Filter approvals for client view (only show client step)
  const displayApprovals = isClientView
    ? approvals.filter(a => a.step_number === 4)
    : approvals;

  return (
    <div className="approval-progress">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Approval Progress
      </h3>
      
      <div className="space-y-4">
        {displayApprovals.map((approval, index) => (
          <div key={approval._id || approval.id || index}>
            {/* Connection line (except for first item) */}
            {index > 0 && (
              <div className="flex justify-center mb-2">
                <div className="w-0.5 h-4 bg-gray-300 dark:bg-gray-600"></div>
              </div>
            )}
            
            <ApprovalStep
              approval={approval}
              stepName={getStepName(approval.step_number, approval.approver_type)}
              onApprove={handleApprove}
              onReject={handleReject}
              isClientView={isClientView}
            />
          </div>
        ))}
      </div>

      {/* Summary */}
      {!isClientView && (
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              Steps completed: {approvals.filter(a => a.status === 'approved').length} / {approvals.length}
            </span>
            {approvals.every(a => a.status === 'approved') && (
              <span className="text-green-600 dark:text-green-400 font-medium">
                ✓ All approvals complete
              </span>
            )}
            {approvals.some(a => a.status === 'rejected') && (
              <span className="text-red-600 dark:text-red-400 font-medium">
                ✗ Approval rejected - deliverable in rework
              </span>
            )}
          </div>
        </div>
      )}

      {/* Rejection Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showRejectConfirm}
        onClose={() => {
          setShowRejectConfirm(false);
          setPendingReject(null);
        }}
        onConfirm={confirmReject}
        title="Confirm Rejection"
        message="Are you sure you want to reject this approval step? This will move the deliverable to rework."
        confirmText="Reject"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default ApprovalProgress;
