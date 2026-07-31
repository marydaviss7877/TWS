/**
 * DateValidationAlerts Component
 * PM dashboard alerts for deliverables needing validation
 * Nucleus Project OS - Date Confidence Tracking
 */

import React, { useState, useEffect } from 'react';
import {
  ExclamationTriangleIcon,
  CalendarIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import tenantProjectApiService from '../../services/tenantProjectApiService';
import { handleApiError } from '../../utils/errorHandler';
import DateValidationForm from './DateValidationForm';
import { useTenantSlug } from '../../../../../../../../shared/hooks/useTenantSlug';

const DateValidationAlerts = () => {
  const tenantSlug = useTenantSlug();
  const [deliverables, setDeliverables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [validatingId, setValidatingId] = useState(null);

  useEffect(() => {
    if (tenantSlug) {
      fetchDeliverablesNeedingValidation();
    }
  }, [tenantSlug]);

  const fetchDeliverablesNeedingValidation = async () => {
    try {
      setLoading(true);
      const response = await tenantProjectApiService.getDeliverablesNeedingValidation(tenantSlug, 14);
      const deliverablesData = response?.data || response || [];
      setDeliverables(Array.isArray(deliverablesData) ? deliverablesData : []);
    } catch (err) {
      console.error('Error fetching deliverables:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = () => {
    fetchDeliverablesNeedingValidation();
    setValidatingId(null);
  };

  const getDaysSinceValidation = (deliverable) => {
    if (!deliverable.last_date_validation) {
      return 999; // Never validated
    }
    const now = new Date();
    const lastValidation = new Date(deliverable.last_date_validation);
    return Math.floor((now - lastValidation) / (1000 * 60 * 60 * 24));
  };

  const getAlertLevel = (days) => {
    if (days > 30) return 'critical'; // Red
    if (days > 14) return 'warning'; // Yellow
    return 'info'; // Green
  };

  const getAlertIcon = (level) => {
    switch (level) {
      case 'critical':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400" />;
      case 'warning':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />;
      default:
        return <CalendarIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
    }
  };

  const getAlertColor = (level) => {
    switch (level) {
      case 'critical':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      default:
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="tws-loading-pulse rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (deliverables.length === 0) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <div className="flex items-center">
          <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" />
          <p className="text-green-800 dark:text-green-300">
            All deliverables are up to date with date validation
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="date-validation-alerts">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
        Deliverables Needing Attention ({deliverables.length})
      </h2>

      <div className="space-y-3">
        {deliverables.map((deliverable) => {
          const daysSinceValidation = getDaysSinceValidation(deliverable);
          const alertLevel = getAlertLevel(daysSinceValidation);
          const deliverableName = deliverable.name || deliverable.title || 'Unnamed Deliverable';
          const targetDate = deliverable.target_date || deliverable.dueDate;
          const progress = deliverable.progress_percentage || deliverable.progress || 0;

          return (
            <div
              key={deliverable._id || deliverable.id}
              className={`deliverable-alert ${getAlertColor(alertLevel)} border rounded-lg p-4`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  {getAlertIcon(alertLevel)}
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                      {deliverableName}
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                      Date not validated in <strong>{daysSinceValidation}</strong> days
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Target:</span>
                        <span className="ml-2 text-gray-900 dark:text-white">
                          {targetDate ? new Date(targetDate).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Progress:</span>
                        <span className="ml-2 text-gray-900 dark:text-white">{progress}%</span>
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setValidatingId(deliverable._id || deliverable.id)}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                >
                  Validate Date
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Validation Form Modal */}
      {validatingId && (
        <DateValidationForm
          deliverableId={validatingId}
          onSuccess={handleValidate}
          onCancel={() => setValidatingId(null)}
        />
      )}
    </div>
  );
};

export default DateValidationAlerts;
