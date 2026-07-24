/**
 * DeliverableForm Component
 * Create/edit deliverable form
 * Nucleus Project OS - Deliverable Management
 */

import React, { useState, useEffect } from 'react';
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import tenantProjectApiService from '../../services/tenantProjectApiService';
import { handleApiError } from '../../utils/errorHandler';
import { showSuccess, showError } from '../../utils/toastNotifications';
import { useTenantSlug } from '../../../../../../../../shared/hooks/useTenantSlug';

const DELIVERABLE_STATUSES = [
  { value: 'created', label: 'Created' },
  { value: 'in_dev', label: 'In Development' },
  { value: 'ready_approval', label: 'Ready for Approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'in_rework', label: 'In Rework' }
];

const DeliverableForm = ({ isOpen, onClose, deliverable, projectId, onSuccess }) => {
  const tenantSlug = useTenantSlug();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: '',
    target_date: '',
    status: 'created',
    acceptance_criteria: [],
    blocking_criteria_met: false
  });
  const [newCriterion, setNewCriterion] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  // Project selector — used when no projectId prop is provided
  const [selectedProjectId, setSelectedProjectId] = useState(projectId || '');
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);

  // Fetch projects list when no projectId prop is supplied
  useEffect(() => {
    if (isOpen && !projectId && tenantSlug) {
      setProjectsLoading(true);
      tenantProjectApiService.getProjects(tenantSlug)
        .then((data) => {
          const list = Array.isArray(data) ? data : (data?.data || data?.projects || []);
          setProjects(list);
        })
        .catch(() => setProjects([]))
        .finally(() => setProjectsLoading(false));
    }
    if (projectId) {
      setSelectedProjectId(projectId);
    }
  }, [isOpen, projectId, tenantSlug]);

  useEffect(() => {
    if (deliverable) {
      setFormData({
        name: deliverable.name || deliverable.title || '',
        description: deliverable.description || '',
        start_date: deliverable.start_date || deliverable.startDate 
          ? new Date(deliverable.start_date || deliverable.startDate).toISOString().split('T')[0]
          : '',
        target_date: deliverable.target_date || deliverable.dueDate
          ? new Date(deliverable.target_date || deliverable.dueDate).toISOString().split('T')[0]
          : '',
        status: deliverable.status || 'created',
        acceptance_criteria: deliverable.acceptance_criteria || [],
        blocking_criteria_met: deliverable.blocking_criteria_met || false
      });
    } else {
      // Reset form for new deliverable
      setFormData({
        name: '',
        description: '',
        start_date: '',
        target_date: '',
        status: 'created',
        acceptance_criteria: [],
        blocking_criteria_met: false
      });
    }
  }, [deliverable, isOpen]);

  const handleAddCriterion = () => {
    if (newCriterion.trim()) {
      setFormData({
        ...formData,
        acceptance_criteria: [
          ...formData.acceptance_criteria,
          { description: newCriterion.trim(), met: false }
        ]
      });
      setNewCriterion('');
    }
  };

  const handleRemoveCriterion = (index) => {
    setFormData({
      ...formData,
      acceptance_criteria: formData.acceptance_criteria.filter((_, i) => i !== index)
    });
  };

  const handleToggleCriterion = (index) => {
    const updated = [...formData.acceptance_criteria];
    updated[index].met = !updated[index].met;
    setFormData({ ...formData, acceptance_criteria: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    // Validation
    if (!formData.name.trim()) {
      setErrors({ name: 'Name is required' });
      return;
    }
    if (!formData.start_date) {
      setErrors({ start_date: 'Start date is required' });
      return;
    }
    if (!formData.target_date) {
      setErrors({ target_date: 'Target date is required' });
      return;
    }
    if (new Date(formData.target_date) < new Date(formData.start_date)) {
      setErrors({ target_date: 'Target date must be after start date' });
      return;
    }

    // If no projectId prop and no project selected, ask user to pick one
    if (!projectId && !selectedProjectId) {
      setErrors({ project: 'Please select a project for this deliverable' });
      return;
    }

    setLoading(true);
    try {
      const deliverableData = {
        ...(selectedProjectId ? { project_id: selectedProjectId } : {}),
        name: formData.name.trim(),
        description: formData.description || null,
        start_date: formData.start_date,
        target_date: formData.target_date,
        status: formData.status,
        acceptance_criteria: formData.acceptance_criteria,
        blocking_criteria_met: formData.blocking_criteria_met
      };

      if (deliverable && deliverable._id) {
        await tenantProjectApiService.updateDeliverable(tenantSlug, deliverable._id, deliverableData);
      } else {
        await tenantProjectApiService.createDeliverable(tenantSlug, deliverableData);
      }
      
      if (onSuccess) {
        onSuccess();
      }
      showSuccess(deliverable ? 'Deliverable updated successfully!' : 'Deliverable created successfully!');
      onClose();
    } catch (err) {
      const errorMessage = handleApiError(err).message;
      const errorMsg = errorMessage || 'Failed to save deliverable';
      setErrors({ submit: errorMsg });
      showError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true" aria-label={deliverable ? 'Edit Deliverable' : 'Create Deliverable'}>
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" aria-hidden="true" onClick={onClose}></div>

        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {deliverable ? 'Edit Deliverable' : 'Create Deliverable'}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Project Selector — shown only when no projectId prop is passed */}
              {!projectId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Project <span className="text-red-500">*</span>
                  </label>
                  {projectsLoading ? (
                    <div className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-500 text-sm">
                      Loading projects…
                    </div>
                  ) : (
                    <select
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">— Select a project —</option>
                      {projects.map((p) => (
                        <option key={p._id || p.id} value={p._id || p.id}>
                          {p.name || p.title || '(Unnamed)'}
                        </option>
                      ))}
                    </select>
                  )}
                  {errors.project && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.project}</p>
                  )}
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  {errors.start_date && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.start_date}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Target Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.target_date}
                    onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  {errors.target_date && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.target_date}</p>
                  )}
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {DELIVERABLE_STATUSES.map(status => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Acceptance Criteria */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Acceptance Criteria
                </label>
                <div className="space-y-2 mb-2">
                  {formData.acceptance_criteria.map((criterion, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={criterion.met}
                        onChange={() => handleToggleCriterion(index)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className={`flex-1 text-sm ${criterion.met ? 'line-through text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                        {criterion.description}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCriterion(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newCriterion}
                    onChange={(e) => setNewCriterion(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCriterion())}
                    placeholder="Add acceptance criterion..."
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddCriterion}
                    className="px-3 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                  >
                    <PlusIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Blocking Criteria */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="blockingCriteria"
                  checked={formData.blocking_criteria_met}
                  onChange={(e) => setFormData({ ...formData, blocking_criteria_met: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="blockingCriteria" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  All blocking criteria are met
                </label>
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
                  {loading ? 'Saving...' : deliverable ? 'Update Deliverable' : 'Create Deliverable'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliverableForm;
