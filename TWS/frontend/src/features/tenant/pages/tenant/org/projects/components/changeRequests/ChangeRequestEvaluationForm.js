/**
 * ChangeRequestEvaluationForm Component
 * PM evaluation form for change requests
 * Nucleus Project OS - Change Request Workflow
 */

import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import tenantProjectApiService from '../../services/tenantProjectApiService';
import { handleApiError } from '../../utils/errorHandler';
import { showSuccess, showError } from '../../utils/toastNotifications';
import { useTenantSlug } from '../../../../../../../../shared/hooks/useTenantSlug';

const ChangeRequestEvaluationForm = ({ changeRequest, onSubmit, onCancel }) => {
  const tenantSlug = useTenantSlug();
  const [formData, setFormData] = useState({
    effort_days: '',
    cost_impact: '',
    date_impact_days: '',
    pm_recommendation: 'accept',
    pm_notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    // Validation
    if (!formData.effort_days || formData.effort_days < 0) {
      setErrors({ effort_days: 'Effort days must be 0 or greater' });
      return;
    }
    if (formData.cost_impact === '' || formData.cost_impact < 0) {
      setErrors({ cost_impact: 'Cost impact must be 0 or greater' });
      return;
    }
    if (!formData.date_impact_days || formData.date_impact_days < 0) {
      setErrors({ date_impact_days: 'Date impact must be 0 or greater' });
      return;
    }
    if (!formData.pm_recommendation) {
      setErrors({ pm_recommendation: 'PM recommendation is required' });
      return;
    }

    setLoading(true);
    try {
      await tenantProjectApiService.evaluateChangeRequest(tenantSlug, changeRequest._id || changeRequest.id, {
        effort_days: parseInt(formData.effort_days),
        cost_impact: parseFloat(formData.cost_impact),
        date_impact_days: parseInt(formData.date_impact_days),
        pm_recommendation: formData.pm_recommendation,
        pm_notes: formData.pm_notes || null
      });
      
      if (onSubmit) {
        onSubmit();
      }
      showSuccess('Change request evaluated successfully');
    } catch (err) {
      const errorMessage = handleApiError(err).message;
      const errorMsg = errorMessage || 'Failed to evaluate change request';
      setErrors({ submit: errorMsg });
      showError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onCancel}></div>

        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Evaluate Change Request
              </h3>
              <button
                onClick={onCancel}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                <strong>Request:</strong> {changeRequest.description}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                Submitted by: {changeRequest.submitted_by} on {new Date(changeRequest.submitted_at).toLocaleDateString()}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Effort Days */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Effort (Days) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.effort_days}
                  onChange={(e) => setFormData({ ...formData, effort_days: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                {errors.effort_days && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.effort_days}</p>
                )}
              </div>

              {/* Cost Impact */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cost Impact ($) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.cost_impact}
                  onChange={(e) => setFormData({ ...formData, cost_impact: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                {errors.cost_impact && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.cost_impact}</p>
                )}
              </div>

              {/* Date Impact */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date Impact (Days) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.date_impact_days}
                  onChange={(e) => setFormData({ ...formData, date_impact_days: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                {errors.date_impact_days && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.date_impact_days}</p>
                )}
              </div>

              {/* PM Recommendation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  PM Recommendation <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.pm_recommendation}
                  onChange={(e) => setFormData({ ...formData, pm_recommendation: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="accept">Accept</option>
                  <option value="reject">Reject</option>
                  <option value="negotiate">Negotiate</option>
                </select>
                {errors.pm_recommendation && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.pm_recommendation}</p>
                )}
              </div>

              {/* PM Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  PM Notes
                </label>
                <textarea
                  value={formData.pm_notes}
                  onChange={(e) => setFormData({ ...formData, pm_notes: e.target.value })}
                  placeholder="Add any notes about this evaluation..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="4"
                />
              </div>

              {errors.submit && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <p className="text-sm text-red-800 dark:text-red-300">{errors.submit}</p>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onCancel}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Evaluating...' : 'Submit Evaluation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangeRequestEvaluationForm;
