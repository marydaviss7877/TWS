/**
 * ApprovalChainSetup Component
 * Setup approval chain for a deliverable
 * Nucleus Project OS - Approval Workflow
 */

import React, { useState, useEffect } from 'react';
import { XMarkIcon, UserIcon } from '@heroicons/react/24/outline';
import tenantProjectApiService from '../../services/tenantProjectApiService';
import { handleApiError } from '../../utils/errorHandler';
import { showSuccess, showError } from '../../utils/toastNotifications';
import { useTenantSlug } from '../../../../../../../../shared/hooks/useTenantSlug';

const ApprovalChainSetup = ({ isOpen, onClose, deliverableId, onChainCreated }) => {
  const tenantSlug = useTenantSlug();
  const [formData, setFormData] = useState({
    devLeadId: '',
    qaLeadId: '',
    securityId: '',
    clientEmail: ''
  });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen && tenantSlug) {
      fetchUsers();
    }
  }, [isOpen, tenantSlug]);

  const fetchUsers = async () => {
    try {
      const response = await tenantProjectApiService.getUsers(tenantSlug, { limit: 100 });
      const usersData = response?.data?.users || response?.users || [];
      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setUsers([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    // Validation
    if (!formData.devLeadId) {
      setErrors({ devLeadId: 'Dev Lead is required' });
      return;
    }
    if (!formData.qaLeadId) {
      setErrors({ qaLeadId: 'QA Lead is required' });
      return;
    }
    if (!formData.clientEmail) {
      setErrors({ clientEmail: 'Client email is required' });
      return;
    }

    setLoading(true);
    try {
      await tenantProjectApiService.createApprovalChain(
        tenantSlug,
        deliverableId,
        {
          devLeadId: formData.devLeadId,
          qaLeadId: formData.qaLeadId,
          securityId: formData.securityId || null,
          clientEmail: formData.clientEmail
        }
      );
      
      if (onChainCreated) {
        onChainCreated();
      }
      showSuccess('Approval chain created successfully');
      onClose();
    } catch (err) {
      const errorMessage = handleApiError(err).message;
      const errorMsg = errorMessage || 'Failed to create approval chain';
      setErrors({ submit: errorMsg });
      showError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Setup Approval Chain
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Dev Lead */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Dev Lead <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.devLeadId}
                  onChange={(e) => setFormData({ ...formData, devLeadId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Dev Lead...</option>
                  {users.map(user => (
                    <option key={user._id || user.id} value={user._id || user.id}>
                      {user.fullName || user.name || user.email} {user.email ? `(${user.email})` : ''}
                    </option>
                  ))}
                </select>
                {errors.devLeadId && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.devLeadId}</p>
                )}
              </div>

              {/* QA Lead */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  QA Lead <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.qaLeadId}
                  onChange={(e) => setFormData({ ...formData, qaLeadId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select QA Lead...</option>
                  {users.map(user => (
                    <option key={user._id || user.id} value={user._id || user.id}>
                      {user.fullName || user.name || user.email} {user.email ? `(${user.email})` : ''}
                    </option>
                  ))}
                </select>
                {errors.qaLeadId && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.qaLeadId}</p>
                )}
              </div>

              {/* Security (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Security (Optional)
                </label>
                <select
                  value={formData.securityId}
                  onChange={(e) => setFormData({ ...formData, securityId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Security Lead (optional)...</option>
                  {users.map(user => (
                    <option key={user._id || user.id} value={user._id || user.id}>
                      {user.fullName || user.name || user.email} {user.email ? `(${user.email})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Client Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Client Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.clientEmail}
                  onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                  placeholder="client@example.com"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                {errors.clientEmail && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.clientEmail}</p>
                )}
              </div>

              {errors.submit && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <p className="text-sm text-red-800 dark:text-red-300">{errors.submit}</p>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : 'Create Approval Chain'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApprovalChainSetup;
