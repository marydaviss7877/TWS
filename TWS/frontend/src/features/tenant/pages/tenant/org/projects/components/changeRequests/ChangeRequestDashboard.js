/**
 * ChangeRequestDashboard Component
 * PM dashboard to view and manage change requests
 * Nucleus Project OS - Change Request Workflow
 */

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  FunnelIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import tenantProjectApiService from '../../services/tenantProjectApiService';
import { handleApiError } from '../../utils/errorHandler';
import { showSuccess, showError } from '../../utils/toastNotifications';
import ChangeRequestCard from './ChangeRequestCard';
import ChangeRequestEvaluationForm from './ChangeRequestEvaluationForm';
import DeliverableCardSkeleton from '../deliverables/DeliverableCardSkeleton';
import ProjectSelector from '../ProjectSelector';

const ChangeRequestDashboard = () => {
  const { tenantSlug } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId');
  const [changeRequests, setChangeRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, submitted, acknowledged, evaluated
  const [evaluatingRequest, setEvaluatingRequest] = useState(null);

  useEffect(() => {
    if (tenantSlug) {
      fetchChangeRequests();
    }
  }, [tenantSlug, filter]);

  const fetchChangeRequests = async () => {
    try {
      setLoading(true);
      const filters = {};
      if (projectId) {
        // If we have projectId, we'd need to filter by project's deliverables
        // For now, fetching all change requests
      }
      if (filter !== 'all') {
        filters.status = filter;
      }

      const response = await tenantProjectApiService.getChangeRequests(tenantSlug, filters);
      const requests = response?.data || response || [];
      setChangeRequests(Array.isArray(requests) ? requests : []);
    } catch (err) {
      console.error('Error fetching change requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (changeRequestId) => {
    try {
      await tenantProjectApiService.acknowledgeChangeRequest(tenantSlug, changeRequestId);
      await fetchChangeRequests();
      showSuccess('Change request acknowledged successfully');
    } catch (err) {
      const errorMessage = handleApiError(err).message;
      showError(errorMessage || 'Failed to acknowledge change request');
    }
  };

  const handleEvaluate = (changeRequest) => {
    setEvaluatingRequest(changeRequest);
  };

  const handleEvaluationComplete = () => {
    setEvaluatingRequest(null);
    fetchChangeRequests();
  };

  const getStatusCounts = () => {
    return {
      all: changeRequests.length,
      submitted: changeRequests.filter(cr => cr.status === 'submitted').length,
      acknowledged: changeRequests.filter(cr => cr.status === 'acknowledged').length,
      evaluated: changeRequests.filter(cr => cr.status === 'evaluated').length,
      pending: changeRequests.filter(cr => ['submitted', 'acknowledged', 'evaluated'].includes(cr.status)).length
    };
  };

  const statusCounts = getStatusCounts();

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 animate-pulse"></div>
        <DeliverableCardSkeleton count={3} />
      </div>
    );
  }

  return (
    <div className="change-request-dashboard p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Change Requests
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Manage scope changes and client requests
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center space-x-4">
          <FunnelIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          <div className="flex space-x-2">
            {[
              { key: 'all', label: 'All', count: statusCounts.all },
              { key: 'submitted', label: 'Submitted', count: statusCounts.submitted },
              { key: 'acknowledged', label: 'Acknowledged', count: statusCounts.acknowledged },
              { key: 'evaluated', label: 'Evaluated', count: statusCounts.evaluated }
            ].map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  filter === key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {label} ({count})
              </button>
            ))}
          </div>
        </div>
        <ProjectSelector 
          currentProjectId={projectId}
          onProjectChange={(projectId) => {
            fetchChangeRequests();
          }}
        />
      </div>

      {/* Pending Requests Alert */}
      {statusCounts.pending > 0 && (
        <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center">
            <ExclamationCircleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2" />
            <p className="text-yellow-800 dark:text-yellow-300">
              <strong>{statusCounts.pending} pending change request(s)</strong> need your attention
            </p>
          </div>
        </div>
      )}

      {/* Change Requests List */}
      {changeRequests.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
          <ClockIcon className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            No change requests found
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {changeRequests.map((changeRequest) => (
            <ChangeRequestCard
              key={changeRequest._id || changeRequest.id}
              changeRequest={changeRequest}
              onAcknowledge={handleAcknowledge}
              onEvaluate={handleEvaluate}
              onView={() => navigate(String(changeRequest._id || changeRequest.id))}
            />
          ))}
        </div>
      )}

      {/* Evaluation Modal */}
      {evaluatingRequest && (
        <ChangeRequestEvaluationForm
          changeRequest={evaluatingRequest}
          onSubmit={handleEvaluationComplete}
          onCancel={() => setEvaluatingRequest(null)}
        />
      )}
    </div>
  );
};

export default ChangeRequestDashboard;
