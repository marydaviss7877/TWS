/**
 * ChangeRequestForm Component
 * Client form to submit change requests
 * Nucleus Project OS - Change Request Workflow
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';
import tenantProjectApiService from '../../services/tenantProjectApiService';
import { handleApiError } from '../../utils/errorHandler';
import { showSuccess, showError } from '../../utils/toastNotifications';
import { useTenantSlug } from '../../../../../../../../shared/hooks/useTenantSlug';

const ChangeRequestForm = ({ projectId, deliverableId, onSuccess }) => {
  const tenantSlug = useTenantSlug();
  const [searchParams] = useSearchParams();
  const actualProjectId = projectId || searchParams.get('projectId');
  const [formData, setFormData] = useState({
    deliverable_id: deliverableId || '',
    description: ''
  });
  const [deliverables, setDeliverables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (actualProjectId && tenantSlug) {
      fetchDeliverables();
    }
  }, [actualProjectId, tenantSlug]);

  const fetchDeliverables = async () => {
    try {
      const response = await tenantProjectApiService.getDeliverables(tenantSlug, { projectId: actualProjectId });
      const deliverablesData = response?.data || response || [];
      setDeliverables(Array.isArray(deliverablesData) ? deliverablesData : []);
    } catch (err) {
      console.error('Error fetching deliverables:', err);
      setDeliverables([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!formData.deliverable_id) {
      setError('Please select a deliverable');
      return;
    }

    if (!formData.description || formData.description.trim().length === 0) {
      setError('Please provide a description of the change');
      return;
    }

    setLoading(true);
    try {
      await tenantProjectApiService.submitChangeRequest(tenantSlug, {
        deliverable_id: formData.deliverable_id,
        description: formData.description.trim()
      });
      
      setSuccess(true);
      setFormData({ deliverable_id: deliverableId || '', description: '' });
      
      if (onSuccess) {
        onSuccess();
      }

      // Reset success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      const errorMessage = handleApiError(err).message;
      setError(errorMessage || 'Failed to submit change request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="change-request-form bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Submit Change Request
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Deliverable Selector */}
        {!deliverableId && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Deliverable <span className="text-red-500">*</span>
            </label>
            {deliverables.length > 0 ? (
              <select
                value={formData.deliverable_id}
                onChange={(e) => setFormData({ ...formData, deliverable_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select a deliverable...</option>
                {deliverables.map(deliverable => (
                  <option key={deliverable._id || deliverable.id} value={deliverable._id || deliverable.id}>
                    {deliverable.name || deliverable.title || 'Unnamed Deliverable'}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={formData.deliverable_id}
                onChange={(e) => setFormData({ ...formData, deliverable_id: e.target.value })}
                placeholder="Deliverable ID"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {deliverables.length > 0 
                ? 'Select the deliverable you want to request changes for'
                : 'Enter the deliverable ID you want to request changes for'}
            </p>
          </div>
        )}

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Change Description <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Describe the change you'd like to request..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows="5"
            required
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Be specific about what changes you need and why
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
            <p className="text-sm text-green-800 dark:text-green-300">
              ✓ Change request submitted successfully! The PM will review it shortly.
            </p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          <PaperAirplaneIcon className="w-5 h-5" />
          <span>{loading ? 'Submitting...' : 'Submit Change Request'}</span>
        </button>
      </form>
    </div>
  );
};

export default ChangeRequestForm;
