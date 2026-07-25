/**
 * ChangeRequestDetailPage
 * Single change request view with audit trail and actions: Acknowledge, Evaluate, Decide
 * Nucleus Project OS - Change Request Workflow
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTenantSlug } from '../../../../../../shared/hooks/useTenantSlug';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  UserIcon,
  CalendarIcon,
  FlagIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import tenantProjectApiService from './services/tenantProjectApiService';
import { handleApiError } from './utils/errorHandler';
import { showSuccess, showError } from './utils/toastNotifications';
import { useTenantAuth } from '../../../../../../app/providers/TenantAuthContext';
import { useTenantPermissions } from '../../../../contexts/TenantPermissionsContext';
import ChangeRequestAuditTrail from './components/changeRequests/ChangeRequestAuditTrail';
import ChangeRequestEvaluationForm from './components/changeRequests/ChangeRequestEvaluationForm';
import DeliverableCardSkeleton from './components/deliverables/DeliverableCardSkeleton';

const ChangeRequestDetailPage = () => {
  const { changeRequestId } = useParams();
  const tenantSlug = useTenantSlug();
  const navigate = useNavigate();
  const { user } = useTenantAuth();
  const { hasModulePermission } = useTenantPermissions();
  const [cr, setCr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showEvaluateModal, setShowEvaluateModal] = useState(false);

  const fetchCr = async () => {
    if (!tenantSlug || !changeRequestId) return;
    try {
      setLoading(true);
      const data = await tenantProjectApiService.getChangeRequestById(tenantSlug, changeRequestId);
      setCr(data?.data || data);
    } catch (err) {
      console.error('Error fetching change request:', err);
      setCr(null);
      showError(handleApiError(err).message || 'Failed to load change request');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCr();
  }, [tenantSlug, changeRequestId]);

  const handleAcknowledge = async () => {
    try {
      setActionLoading(true);
      await tenantProjectApiService.acknowledgeChangeRequest(tenantSlug, changeRequestId);
      showSuccess('Change request acknowledged');
      await fetchCr();
    } catch (err) {
      showError(handleApiError(err).message || 'Failed to acknowledge');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEvaluateComplete = () => {
    setShowEvaluateModal(false);
    fetchCr();
  };

  const handleDecide = async (decision) => {
    try {
      setActionLoading(true);
      await tenantProjectApiService.decideChangeRequest(tenantSlug, changeRequestId, decision);
      showSuccess(decision === 'accept' ? 'Change request accepted' : 'Change request rejected');
      await fetchCr();
    } catch (err) {
      showError(handleApiError(err).message || 'Failed to submit decision');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ';
    const map = {
      submitted: base + 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      acknowledged: base + 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      evaluated: base + 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      accepted: base + 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      rejected: base + 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
    };
    return map[status] || base + 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  };

  const deliverable = cr?.deliverable_id;
  const project = deliverable?.project_id;
  const projectName = project?.name || (typeof project === 'object' && project?.name) || '—';
  const isSubmitter = user?.email && cr?.submitted_by && user.email === cr.submitted_by;
  const isAdminOrOwner =
    hasModulePermission?.('projects', 'admin') ||
    hasModulePermission?.('users', 'admin') ||
    hasModulePermission?.('settings', 'admin');
  const canDecide = cr?.status === 'evaluated' && (isSubmitter || isAdminOrOwner);
  const canAcknowledge = cr?.status === 'submitted';
  const canEvaluate = cr?.status === 'acknowledged';

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 animate-pulse" />
        <DeliverableCardSkeleton count={2} />
      </div>
    );
  }

  if (!cr) {
    return (
      <div className="glass-card-premium p-12 text-center">
        <DocumentTextIcon className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400 mb-2">Change request not found</p>
        <button
          onClick={() => navigate(`/${tenantSlug}/org/projects/change-requests`)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Back to Change Requests
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/${tenantSlug}/org/projects/change-requests`)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            aria-label="Back"
          >
            <ArrowLeftIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl xl:text-3xl font-bold font-heading text-gray-900 dark:text-white">
              Change Request
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {deliverable?.name ? `Deliverable: ${deliverable.name}` : 'Change request details'}
            </p>
          </div>
        </div>
        <span className={getStatusBadge(cr.status)}>
          {String(cr.status).charAt(0).toUpperCase() + String(cr.status).slice(1)}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card-premium p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Description</h2>
            <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
              {cr.description || 'No description'}
            </p>
          </div>

          {(canAcknowledge || canEvaluate || canDecide) && (
            <div className="glass-card-premium p-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Actions</h2>
              <div className="flex flex-wrap gap-3">
                {canAcknowledge && (
                  <button
                    type="button"
                    onClick={handleAcknowledge}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
                  >
                    <ClockIcon className="w-5 h-5" />
                    {actionLoading ? 'Acknowledging…' : 'Acknowledge'}
                  </button>
                )}
                {canEvaluate && (
                  <button
                    type="button"
                    onClick={() => setShowEvaluateModal(true)}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
                  >
                    <CheckCircleIcon className="w-5 h-5" />
                    Evaluate
                  </button>
                )}
                {canDecide && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleDecide('accept')}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      <CheckCircleIcon className="w-5 h-5" />
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDecide('reject')}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                    >
                      <XCircleIcon className="w-5 h-5" />
                      Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="glass-card-premium p-6">
            <ChangeRequestAuditTrail changeRequestId={changeRequestId} />
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card-premium p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Details</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-gray-600 dark:text-gray-400">Submitted by:</span>
                <span className="font-medium text-gray-900 dark:text-white">{cr.submitted_by || '—'}</span>
              </div>
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-gray-600 dark:text-gray-400">Submitted:</span>
                <span className="font-medium text-gray-900 dark:text-white">{formatDate(cr.submitted_at)}</span>
              </div>
              <div className="flex items-center gap-2">
                <FlagIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-gray-600 dark:text-gray-400">Deliverable:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {deliverable?.name || '—'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600 dark:text-gray-400">Project:</span>
                <span className="font-medium text-gray-900 dark:text-white">{projectName}</span>
              </div>
            </dl>
          </div>

          {(cr.status === 'evaluated' || cr.status === 'accepted' || cr.status === 'rejected') && (
            <div className="glass-card-premium p-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">PM Evaluation</h2>
              <dl className="space-y-2 text-sm">
                <div><span className="text-gray-600 dark:text-gray-400">Effort:</span> <span className="font-medium text-gray-900 dark:text-white">{cr.effort_days ?? '—'} days</span></div>
                <div><span className="text-gray-600 dark:text-gray-400">Cost impact:</span> <span className="font-medium text-gray-900 dark:text-white">{cr.cost_impact != null ? `$${cr.cost_impact}` : '—'}</span></div>
                <div><span className="text-gray-600 dark:text-gray-400">Date impact:</span> <span className="font-medium text-gray-900 dark:text-white">{cr.date_impact_days != null ? `+${cr.date_impact_days} days` : '—'}</span></div>
                <div><span className="text-gray-600 dark:text-gray-400">Recommendation:</span> <span className="font-medium text-gray-900 dark:text-white capitalize">{cr.pm_recommendation || '—'}</span></div>
                {cr.pm_notes && (
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400 block mb-1">Notes:</span>
                    <p className="text-gray-900 dark:text-white">{cr.pm_notes}</p>
                  </div>
                )}
              </dl>
            </div>
          )}
        </div>
      </div>

      {showEvaluateModal && cr && (
        <ChangeRequestEvaluationForm
          changeRequest={cr}
          onSubmit={handleEvaluateComplete}
          onCancel={() => setShowEvaluateModal(false)}
        />
      )}
    </div>
  );
};

export default ChangeRequestDetailPage;
