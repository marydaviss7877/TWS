import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import PropTypes from 'prop-types';

/**
 * Generic Entity Form Modal Component
 * Provides a reusable form modal for creating/editing entities
 * 
 * @param {boolean} isOpen - Whether modal is open
 * @param {Function} onClose - Function to close modal
 * @param {Function} onSubmit - Function to handle form submission
 * @param {Array} fields - Form field definitions
 * @param {Object} initialData - Initial form data (for editing)
 * @param {string} title - Modal title
 */
const EntityFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  fields,
  initialData = {},
  title = 'Form',
  description,
  submitLabel,
  isSaving,
  errorMessage,
  initialValues
}) => {
  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});

  // Initialize form data when modal opens or initialData/initialValues changes
  useEffect(() => {
    if (isOpen) {
      const sourceData = initialValues || initialData;
      const data = {};
      fields.forEach(field => {
        if (sourceData[field.name] !== undefined) {
          data[field.name] = sourceData[field.name];
        } else if (field.defaultValue !== undefined) {
          data[field.name] = field.defaultValue;
        } else if (field.type === 'number') {
          data[field.name] = '';
        } else {
          data[field.name] = '';
        }
      });
      setFormData(data);
      setFormErrors({});
    }
  }, [isOpen, initialData, initialValues, fields]);

  // Handle input change
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Validate form
  const validateForm = () => {
    const errors = {};
    fields.forEach(field => {
      if (field.required && !formData[field.name]) {
        errors[field.name] = `${field.label} is required`;
      }
    });
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Form submission error:', error);
      alert(error.message || 'Failed to submit form');
    }
  };

  // Render field
  const renderField = (field) => {
    const value = formData[field.name] || '';
    const error = formErrors[field.name];
    const fieldClassName = `block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm ${
      error ? 'border-red-300' : ''
    }`;

    switch (field.type) {
      case 'textarea':
        return (
          <div key={field.name} className={field.fullWidth ? 'col-span-2' : ''}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <textarea
              name={field.name}
              value={value}
              onChange={handleInputChange}
              rows={field.rows || 3}
              className={fieldClassName}
              placeholder={field.placeholder}
            />
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>
        );

      case 'select':
        return (
          <div key={field.name}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <select
              name={field.name}
              value={value}
              onChange={handleInputChange}
              className={fieldClassName}
            >
              <option value="">Select {field.label}</option>
              {field.options?.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>
        );

      case 'checkbox':
        return (
          <div key={field.name} className="flex items-center">
            <input
              type="checkbox"
              name={field.name}
              checked={!!value}
              onChange={handleInputChange}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-700">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>
        );

      default:
        return (
          <div key={field.name}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <input
              type={field.type || 'text'}
              name={field.name}
              value={value}
              onChange={handleInputChange}
              min={field.min}
              max={field.max}
              step={field.step}
              className={fieldClassName}
              placeholder={field.placeholder}
            />
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
            {description && <p className="text-sm text-gray-600 mt-1">{description}</p>}
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="text-gray-400 hover:text-gray-500 disabled:opacity-50"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{errorMessage}</p>
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            {fields.map(field => renderField(field))}
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 flex items-center"
            >
              {isSaving && (
                <div className="tws-loading-pulse rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              )}
              {submitLabel || 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

EntityFormModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  fields: PropTypes.arrayOf(PropTypes.object).isRequired,
  initialData: PropTypes.object,
  initialValues: PropTypes.object,
  title: PropTypes.string,
  description: PropTypes.string,
  submitLabel: PropTypes.string,
  isSaving: PropTypes.bool,
  errorMessage: PropTypes.string
};

export default EntityFormModal;

