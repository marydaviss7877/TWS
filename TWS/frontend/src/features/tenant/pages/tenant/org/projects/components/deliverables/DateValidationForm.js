/**
 * DateValidationForm Component
 * Form to validate deliverable date
 * Nucleus Project OS - Date Confidence Tracking
 */

import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import tenantProjectApiService from '../../services/tenantProjectApiService';
import { handleApiError } from '../../utils/errorHandler';
import { showSuccess, showError } from '../../utils/toastNotifications';
import { useTenantSlug } from '../../../../../../../../shared/hooks/useTenantSlug';

const DateValidationForm = ({ deliverableId, onSuccess, onCancel }) => {
  const tenantSlug = useTenantSlug();
  const [formData, setFormData] = useState({
    confidence: 80,
    notes: '',
    isOnTrack: true
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    if (formData.confidence < 0 || formData.confidence > 100) {
      setErrors({ confidence: 'Confidence must be between 0 and 100' });
      return;
    }

    setLoading(true);
    try {
      await tenantProjectApiService.validateDeliverableDate(tenantSlug, deliverableId, {
        confidence: formData.confidence,
        notes: formData.notes || null
      });
      
      if (onSuccess) {
        onSuccess();
      }
      showSuccess('Date validated successfully');
    } catch (err) {
      const errorMessage = handleApiError(err).message;
      const errorMsg = errorMessage || 'Failed to validate date';
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

        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Validate Deliverable Date
              </h3>
              <button
                onClick={onCancel}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Confidence Slider */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Confidence Level: <span className="font-semibold">{formData.confidence}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formData.confidence}
                  onChange={(e) => setFormData({ ...formData, confidence: parseInt(e.target.value) })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>0% (Low)</span>
                  <span>50% (Medium)</span>
                  <span>100% (High)</span>
                </div>
                {errors.confidence && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.confidence}</p>
                )}
              </div>

              {/* Is On Track */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isOnTrack"
                  checked={formData.isOnTrack}
                  onChange={(e) => setFormData({ ...formData, isOnTrack: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="isOnTrack" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Deliverable is on track to meet target date
                </label>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes (Optional):
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Add any notes about the date validation..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
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
                  {loading ? 'Validating...' : 'Submit Validation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DateValidationForm;
