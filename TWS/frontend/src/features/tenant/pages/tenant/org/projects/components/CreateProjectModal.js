import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import tenantProjectApiService from '../services/tenantProjectApiService';
import { validateProjectForm, sanitizeProjectData } from '../utils/validation';
import { handleApiError, handleSuccess } from '../utils/errorHandler';
import { SUCCESS_MESSAGES, PROJECT_PRIORITY, CURRENCIES, PROJECT_TYPE } from '../constants/projectConstants';
import { useTenantSlug } from '../../../../../../../shared/hooks/useTenantSlug';

const CreateProjectModal = ({ isOpen, onClose, onProjectCreated }) => {
  const tenantSlug = useTenantSlug();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    clientId: '',
    projectType: PROJECT_TYPE.GENERAL,
    budget: {
      total: '',
      currency: 'USD'
    },
    timeline: {
      startDate: '',
      endDate: '',
      estimatedHours: ''
    },
    priority: PROJECT_PRIORITY.MEDIUM,
    status: 'planning',
    primaryDepartmentId: '',
    departments: [],
    // Client Portal Settings - REMOVED COMPLETELY
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [clients, setClients] = useState([]);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    if (isOpen && tenantSlug) {
      fetchClients();
      fetchDepartments();
    }
  }, [isOpen, tenantSlug]);

  const fetchClients = async () => {
    try {
      const data = await tenantProjectApiService.getClients(tenantSlug);
      setClients(Array.isArray(data) ? data : (data?.clients || []));
    } catch (err) {
      console.error('Error fetching clients:', err);
      // Don't show error to user - just use empty clients list
      // This allows project creation even if clients can't be loaded
      setClients([]);
    }
  };

  const fetchDepartments = async () => {
    try {
      const data = await tenantProjectApiService.getDepartments(tenantSlug);
      setDepartments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching departments:', err);
      setDepartments([]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: type === 'checkbox' ? checked : value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const validation = validateProjectForm(formData);
    setErrors(validation.errors);
    return validation.isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // SECURITY FIX: Prevent double-click / multiple submissions
    if (isLoading) {
      console.warn('Project creation already in progress, ignoring duplicate submit');
      return;
    }
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      // Sanitize and prepare data for backend (matches express-validator rules)
      const payload = {
        ...formData,
        name: (formData.name || '').trim(),
        budget: {
          ...formData.budget,
          total: formData.budget.total ? parseFloat(formData.budget.total) : 0,
          currency: formData.budget.currency || 'USD'
        },
        timeline: {
          startDate: formData.timeline.startDate || undefined,
          endDate: formData.timeline.endDate || undefined,
          estimatedHours: formData.timeline.estimatedHours ? parseInt(formData.timeline.estimatedHours, 10) : undefined
        },
        status: formData.status || 'planning',
        priority: (formData.priority || 'medium').toLowerCase(),
        projectType: formData.projectType || 'general',
        clientId: formData.clientId || undefined,
        primaryDepartmentId: formData.primaryDepartmentId || undefined,
        departments: formData.departments?.length > 0 ? formData.departments : undefined
      };
      const sanitizedData = sanitizeProjectData(payload);
      
      const response = await tenantProjectApiService.createProject(tenantSlug, sanitizedData);
      
      if (response) {
        handleSuccess(SUCCESS_MESSAGES.PROJECT_CREATED);
        if (onProjectCreated) {
          try {
            await onProjectCreated();
          } catch (callbackError) {
            console.error('Error in onProjectCreated callback:', callbackError);
            // Don't fail the whole operation if callback fails
          }
        }
        onClose();
        resetForm();
      }
    } catch (error) {
      console.error('Project creation error:', error);
      
      // IMPROVEMENT: Better error message extraction with trace ID support
      let errorMessage = 'Failed to create project';
      let traceId = null;
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.data?.message) {
        errorMessage = error.data.message;
        traceId = error.data.traceId;
      } else if (error.data?.error?.message) {
        errorMessage = error.data.error.message;
        traceId = error.data.error.traceId;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
        traceId = error.response.data.traceId;
      } else if (error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
        traceId = error.response.data.error.traceId;
      }
      
      // Include trace ID in error message if available
      if (traceId) {
        errorMessage += ` (Trace ID: ${traceId})`;
      }
      
      // Handle validation errors (express-validator returns array of { path, msg })
      if (error.data?.errors && Array.isArray(error.data.errors)) {
        const errMap = error.data.errors.reduce((acc, e) => {
          let key = e.path || e.param || 'submit';
          const msg = e.msg || e.message || String(e);
          if (key.startsWith('timeline.')) key = key.replace('timeline.', '');
          if (key.startsWith('budget.')) key = key.replace('budget.', 'budget');
          acc[key] = msg;
          return acc;
        }, {});
        setErrors(errMap);
      } else if (error.data?.errors && typeof error.data.errors === 'object' && !Array.isArray(error.data.errors)) {
        setErrors(error.data.errors);
      } else if (error.data?.error) {
        setErrors({ submit: error.data.error });
      } else {
        setErrors({ submit: errorMessage });
      }
      
      // Show error notification
      handleApiError(error, errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      clientId: '',
      projectType: PROJECT_TYPE.GENERAL,
      budget: { total: '', currency: 'USD' },
      timeline: { startDate: '', endDate: '', estimatedHours: '' },
      priority: PROJECT_PRIORITY.MEDIUM,
      status: 'planning',
      primaryDepartmentId: '',
      departments: [],
      // Client Portal - REMOVED COMPLETELY
    });
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  const getProjectTypeOptions = () => {
    return Object.entries(PROJECT_TYPE).map(([key, value]) => ({
      label: key.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' '),
      value: value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="glass-card-premium max-w-2xl w-full max-h-[90vh] overflow-hidden rounded-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold font-heading text-gray-900 dark:text-white">Create New Project</h2>
          <button
            onClick={handleClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Basic Information</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`w-full glass-input rounded-xl px-4 py-2 ${
                      errors.name ? 'border-red-300 dark:border-red-700' : ''
                    }`}
                    placeholder="Enter project name"
                  />
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full glass-input rounded-xl px-4 py-2"
                    placeholder="Describe the project..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Project Type
                    </label>
                    <select
                      name="projectType"
                      value={formData.projectType}
                      onChange={handleInputChange}
                      className="w-full glass-input rounded-xl px-4 py-2"
                    >
                      {getProjectTypeOptions().map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Priority
                    </label>
                    <select
                      name="priority"
                      value={formData.priority}
                      onChange={handleInputChange}
                      className="w-full glass-input rounded-xl px-4 py-2"
                    >
                      <option value={PROJECT_PRIORITY.LOW}>Low</option>
                      <option value={PROJECT_PRIORITY.MEDIUM}>Medium</option>
                      <option value={PROJECT_PRIORITY.HIGH}>High</option>
                      <option value={PROJECT_PRIORITY.URGENT}>Urgent</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Client (Optional)
                  </label>
                  <select
                    name="clientId"
                    value={formData.clientId}
                    onChange={handleInputChange}
                    disabled={clients.length === 0}
                    className={`w-full glass-input rounded-xl px-4 py-2 ${
                      errors.clientId ? 'border-red-300 dark:border-red-700' : ''
                    } ${clients.length === 0 ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    <option value="">No client assigned</option>
                    {clients.map(client => (
                      <option key={client._id || client.id} value={client._id || client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                  {clients.length === 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      No eligible client users found. Create a client user from Users module first.
                    </p>
                  )}
                  {errors.clientId && <p className="text-red-500 text-sm mt-1">{errors.clientId}</p>}
                </div>

                {departments.length > 0 && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Primary Department (Optional)
                      </label>
                      <select
                        name="primaryDepartmentId"
                        value={formData.primaryDepartmentId}
                        onChange={handleInputChange}
                        className="w-full glass-input rounded-xl px-4 py-2"
                      >
                        <option value="">No primary department</option>
                        {departments.map(dept => (
                          <option key={dept._id || dept.id} value={dept._id || dept.id}>
                            {dept.name} {dept.code ? `(${dept.code})` : ''}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Select the main department responsible for this project
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Additional Departments (Optional)
                      </label>
                      <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-xl p-3">
                        {departments.map(dept => (
                          <label key={dept._id || dept.id} className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.departments.includes(dept._id || dept.id)}
                              onChange={(e) => {
                                const deptId = dept._id || dept.id;
                                if (e.target.checked) {
                                  setFormData(prev => ({
                                    ...prev,
                                    departments: [...prev.departments, deptId]
                                  }));
                                } else {
                                  setFormData(prev => ({
                                    ...prev,
                                    departments: prev.departments.filter(id => id !== deptId)
                                  }));
                                }
                              }}
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {dept.name} {dept.code ? `(${dept.code})` : ''}
                            </span>
                          </label>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Select departments that will collaborate on this project
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Budget & Timeline */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Budget & Timeline</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Budget
                  </label>
                  <div className="flex">
                    <select
                      name="budget.currency"
                      value={formData.budget.currency}
                      onChange={handleInputChange}
                      className="border border-gray-300 dark:border-gray-700 rounded-l-xl px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      <option value={CURRENCIES.USD}>USD</option>
                      <option value={CURRENCIES.EUR}>EUR</option>
                      <option value={CURRENCIES.GBP}>GBP</option>
                      <option value={CURRENCIES.PKR}>PKR</option>
                    </select>
                    <input
                      type="number"
                      name="budget.total"
                      value={formData.budget.total}
                      onChange={handleInputChange}
                      className={`flex-1 glass-input rounded-r-xl px-4 py-2 ${
                        errors.budget ? 'border-red-300 dark:border-red-700' : ''
                      }`}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  {errors.budget && <p className="text-red-500 text-sm mt-1">{errors.budget}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Estimated Hours
                  </label>
                  <input
                    type="number"
                    name="timeline.estimatedHours"
                    value={formData.timeline.estimatedHours}
                    onChange={handleInputChange}
                    className={`w-full glass-input rounded-xl px-4 py-2 ${
                      errors.estimatedHours ? 'border-red-300 dark:border-red-700' : ''
                    }`}
                    placeholder="0"
                    min="0"
                  />
                  {errors.estimatedHours && <p className="text-red-500 text-sm mt-1">{errors.estimatedHours}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    name="timeline.startDate"
                    value={formData.timeline.startDate}
                    onChange={handleInputChange}
                    className="w-full glass-input rounded-xl px-4 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    name="timeline.endDate"
                    value={formData.timeline.endDate}
                    onChange={handleInputChange}
                    className="w-full glass-input rounded-xl px-4 py-2"
                  />
                </div>
              </div>
            </div>

            {errors.submit && (
              <div className="glass-card p-4 border border-red-200 dark:border-red-800">
                <p className="text-red-600 dark:text-red-400 text-sm">{errors.submit}</p>
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={handleClose}
            className="glass-button px-4 py-2 rounded-xl hover-scale text-gray-700 dark:text-gray-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isLoading}
            className="glass-button px-4 py-2 rounded-xl hover-scale bg-gradient-to-r from-primary-500 to-accent-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateProjectModal;

