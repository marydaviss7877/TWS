/**
 * ChangeRequestCard Component
 * Individual change request display card
 * Nucleus Project OS - Change Request Workflow
 */

import React from 'react';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  UserIcon,
  CalendarIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

const ChangeRequestCard = ({ changeRequest, onAcknowledge, onEvaluate, onView }) => {
  const getStatusBadge = () => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    switch (changeRequest.status) {
      case 'submitted':
        return `${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300`;
      case 'acknowledged':
        return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300`;
      case 'evaluated':
        return `${baseClasses} bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300`;
      case 'accepted':
        return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300`;
      case 'rejected':
        return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300`;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const canAcknowledge = changeRequest.status === 'submitted';
  const canEvaluate = changeRequest.status === 'acknowledged';

  return (
    <div className="change-request-card bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <span className={getStatusBadge()}>
              {changeRequest.status.charAt(0).toUpperCase() + changeRequest.status.slice(1)}
            </span>
            {changeRequest.pm_recommendation && (
              <span className="text-xs text-gray-600 dark:text-gray-400">
                PM recommends: {changeRequest.pm_recommendation}
              </span>
            )}
          </div>
          
          <p className="text-gray-900 dark:text-white font-medium mb-2">
            {changeRequest.description}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div className="flex items-center text-gray-600 dark:text-gray-400">
          <UserIcon className="w-4 h-4 mr-2" />
          <span>Submitted by: {changeRequest.submitted_by}</span>
        </div>
        <div className="flex items-center text-gray-600 dark:text-gray-400">
          <CalendarIcon className="w-4 h-4 mr-2" />
          <span>{formatDate(changeRequest.submitted_at)}</span>
        </div>
      </div>

      {/* PM Evaluation Summary */}
      {changeRequest.status === 'evaluated' && (
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 mb-4">
          <h4 className="text-sm font-medium text-purple-800 dark:text-purple-300 mb-2">
            PM Evaluation:
          </h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-purple-600 dark:text-purple-400">Effort:</span>
              <span className="ml-2 text-purple-800 dark:text-purple-300">
                {changeRequest.effort_days || 0} days
              </span>
            </div>
            <div>
              <span className="text-purple-600 dark:text-purple-400">Cost:</span>
              <span className="ml-2 text-purple-800 dark:text-purple-300">
                ${changeRequest.cost_impact || 0}
              </span>
            </div>
            <div>
              <span className="text-purple-600 dark:text-purple-400">Date Impact:</span>
              <span className="ml-2 text-purple-800 dark:text-purple-300">
                +{changeRequest.date_impact_days || 0} days
              </span>
            </div>
          </div>
          {changeRequest.pm_notes && (
            <p className="mt-2 text-sm text-purple-700 dark:text-purple-400">
              {changeRequest.pm_notes}
            </p>
          )}
        </div>
      )}

      {/* Client Decision */}
      {changeRequest.client_decision && (
        <div className={`mb-4 p-3 rounded-lg ${
          changeRequest.client_decision === 'accept'
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
        }`}>
          <div className="flex items-center">
            {changeRequest.client_decision === 'accept' ? (
              <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" />
            ) : (
              <XCircleIcon className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
            )}
            <span className={`text-sm font-medium ${
              changeRequest.client_decision === 'accept'
                ? 'text-green-800 dark:text-green-300'
                : 'text-red-800 dark:text-red-300'
            }`}>
              Client {changeRequest.client_decision === 'accept' ? 'accepted' : 'rejected'} on {formatDate(changeRequest.decided_at)}
            </span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        {onView && (
          <button
            onClick={onView}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-md flex items-center space-x-1"
          >
            <EyeIcon className="w-4 h-4" />
            <span>View</span>
          </button>
        )}
        {canAcknowledge && (
          <button
            onClick={() => onAcknowledge(changeRequest._id || changeRequest.id)}
            className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 rounded-md flex items-center space-x-1"
          >
            <ClockIcon className="w-4 h-4" />
            <span>Acknowledge</span>
          </button>
        )}
        {canEvaluate && (
          <button
            onClick={() => onEvaluate(changeRequest)}
            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md flex items-center space-x-1"
          >
            <CheckCircleIcon className="w-4 h-4" />
            <span>Evaluate</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default ChangeRequestCard;
