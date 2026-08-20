import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import PropTypes from 'prop-types';

/**
 * Generic Entity Manager Page Component
 * Provides a reusable interface for managing entities (CRUD operations)
 * 
 * @param {string} title - Page title
 * @param {string} description - Page description
 * @param {Array} fields - Form field definitions
 * @param {Array} columns - Table column definitions (must have 'key' and 'header', optional 'render' and 'align')
 * @param {Function} fetchEntities - Function to fetch entities
 * @param {Function} createEntity - Function to create entity
 * @param {Function} updateEntity - Function to update entity
 * @param {Function} deleteEntity - Function to delete entity
 * @param {Array} searchKeys - Keys to search by
 * @param {string} tenantSlug - Tenant slug (optional)
 */
const EntityManagerPage = ({
  title,
  description,
  fields,
  columns,
  fetchEntities,
  createEntity,
  updateEntity,
  deleteEntity,
  searchKeys = [],
  tenantSlug,
  mapEntityToForm,
  mapFormToPayload,
  searchPlaceholder,
  emptyStateMessage
}) => {
  const [entities, setEntities] = useState([]);
  const [filteredEntities, setFilteredEntities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingEntity, setEditingEntity] = useState(null);
  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});

  // Load entities
  const loadEntities = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetchEntities();
      // Handle different response formats
      let data = [];
      if (Array.isArray(response)) {
        data = response;
      } else if (response && response.data) {
        data = Array.isArray(response.data) ? response.data : (response.data.data || []);
      } else if (response && response.success && response.data) {
        data = Array.isArray(response.data) ? response.data : [];
      }
      setEntities(data);
      setFilteredEntities(data);
    } catch (error) {
      console.error(`Error loading ${title}:`, error);
      setEntities([]);
      setFilteredEntities([]);
    } finally {
      setLoading(false);
    }
  }, [fetchEntities, title]);

  useEffect(() => {
    loadEntities();
  }, [loadEntities]);

  // Search filter
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredEntities(entities);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = entities.filter(entity => {
      if (searchKeys.length === 0) {
        // If no search keys specified, search all string fields
        return Object.values(entity).some(value => 
          String(value).toLowerCase().includes(term)
        );
      }
      return searchKeys.some(key => {
        // Handle both string keys and function keys
        if (typeof key === 'function') {
          const searchValue = key(entity);
          return searchValue && String(searchValue).toLowerCase().includes(term);
        }
        const value = entity[key];
        return value && String(value).toLowerCase().includes(term);
      });
    });
    setFilteredEntities(filtered);
  }, [searchTerm, entities, searchKeys]);

  // Handle form input change
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

  // Initialize form data
  const initializeForm = (entity = null) => {
    let initialData = {};
    if (entity && mapEntityToForm) {
      // Use mapping function if provided
      initialData = mapEntityToForm(entity);
    } else {
      // Default initialization
      fields.forEach(field => {
        if (entity && entity[field.name] !== undefined) {
          initialData[field.name] = entity[field.name];
        } else if (field.defaultValue !== undefined) {
          initialData[field.name] = field.defaultValue;
        } else if (field.type === 'number') {
          initialData[field.name] = '';
        } else {
          initialData[field.name] = '';
        }
      });
    }
    setFormData(initialData);
    setFormErrors({});
    setEditingEntity(entity);
    setShowForm(true);
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
      // Use mapping function if provided
      const payload = mapFormToPayload ? mapFormToPayload(formData) : formData;
      
      if (editingEntity) {
        await updateEntity(editingEntity._id || editingEntity.id, payload);
      } else {
        await createEntity(payload);
      }
      setShowForm(false);
      setEditingEntity(null);
      setFormData({});
      await loadEntities();
    } catch (error) {
      console.error(`Error ${editingEntity ? 'updating' : 'creating'} ${title}:`, error);
      alert(error.message || `Failed to ${editingEntity ? 'update' : 'create'} ${title}`);
    }
  };

  // Handle delete
  const handleDelete = async (entity) => {
    if (!window.confirm(`Are you sure you want to delete this ${title.toLowerCase()}?`)) {
      return;
    }

    try {
      await deleteEntity(entity._id || entity.id);
      await loadEntities();
    } catch (error) {
      console.error(`Error deleting ${title}:`, error);
      alert(error.message || `Failed to delete ${title}`);
    }
  };

  // Render form field
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
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <motion.textarea
              whileFocus={{ scale: 1.02 }}
              name={field.name}
              value={value}
              onChange={handleInputChange}
              rows={field.rows || 3}
              className={`${fieldClassName} px-4 py-2.5 rounded-lg border-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all`}
              placeholder={field.placeholder}
            />
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>
        );

      case 'select':
        return (
          <div key={field.name}>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <motion.select
              whileFocus={{ scale: 1.02 }}
              name={field.name}
              value={value}
              onChange={handleInputChange}
              className={`${fieldClassName} px-4 py-2.5 rounded-lg border-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all`}
            >
              <option value="">Select {field.label}</option>
              {field.options?.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </motion.select>
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
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <motion.input
              whileFocus={{ scale: 1.02 }}
              type={field.type || 'text'}
              name={field.name}
              value={value}
              onChange={handleInputChange}
              min={field.min}
              max={field.max}
              step={field.step}
              className={`${fieldClassName} px-4 py-2.5 rounded-lg border-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all`}
              placeholder={field.placeholder}
            />
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>
        );
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 15
      }
    },
    hover: {
      scale: 1.02,
      y: -5,
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 17
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-4"
          />
          <p className="text-gray-600 font-medium">Loading {title}...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-6 space-y-6"
    >
      {/* Header */}
      <motion.div variants={cardVariants} className="mb-8">
        <motion.h1
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-accent-600 to-primary-600 bg-clip-text text-transparent mb-2"
        >
          {title}
        </motion.h1>
        {description && (
          <p className="text-gray-600 text-lg mt-1">{description}</p>
        )}
      </motion.div>

      {/* Actions Bar */}
      <motion.div
        variants={cardVariants}
        className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 flex justify-between items-center"
      >
        <div className="flex-1 max-w-lg">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <motion.input
              whileFocus={{ scale: 1.02 }}
              type="text"
              placeholder={searchPlaceholder || "Search..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-4 py-3 block w-full rounded-lg border-2 border-gray-200 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-sm"
            />
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => initializeForm()}
          className="ml-4 inline-flex items-center px-6 py-3 border border-transparent text-sm font-semibold rounded-lg shadow-lg text-white bg-gradient-to-r from-blue-600 to-primary-600 hover:from-blue-700 hover:to-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add New
        </motion.button>
      </motion.div>

      {/* Table */}
      <motion.div
        variants={cardVariants}
        className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-gray-50 to-blue-50">
              <tr>
                {columns.map(column => {
                  const safeKey = typeof column.key === 'symbol' ? column.key.toString() : column.key;
                  return (
                    <th
                      key={safeKey}
                      className={`px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider ${
                        column.align === 'right' ? 'text-right' : ''
                      }`}
                    >
                      {column.header}
                    </th>
                  );
                })}
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <AnimatePresence>
                {filteredEntities.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + 1} className="px-6 py-12 text-center">
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-gray-500"
                      >
                        <p className="text-lg font-medium">{emptyStateMessage || `No ${title.toLowerCase()} found`}</p>
                      </motion.div>
                    </td>
                  </tr>
                ) : (
                  filteredEntities.map((entity, index) => (
                    <motion.tr
                      key={entity._id || entity.id || index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ backgroundColor: '#f9fafb' }}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      {columns.map(column => {
                        const safeKey = typeof column.key === 'symbol' ? column.key.toString() : column.key;
                        return (
                          <td
                            key={safeKey}
                            className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 ${
                              column.align === 'right' ? 'text-right' : ''
                            }`}
                          >
                            {column.render ? column.render(entity) : entity[safeKey]}
                          </td>
                        );
                      })}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-3">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => initializeForm(entity)}
                            className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                            title="Edit"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleDelete(entity)}
                            className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50 transition-colors"
                            title="Delete"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </motion.button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4"
            onClick={() => {
              setShowForm(false);
              setEditingEntity(null);
              setFormData({});
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-100"
            >
              <motion.h3
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-primary-600 bg-clip-text text-transparent mb-6"
              >
                {editingEntity ? `Edit ${title}` : `Create New ${title}`}
              </motion.h3>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  {fields.map(field => renderField(field))}
                </div>
                <div className="mt-8 flex justify-end gap-4 pt-6 border-t border-gray-200">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setShowForm(false);
                      setEditingEntity(null);
                      setFormData({});
                    }}
                    className="px-6 py-3 border-2 border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-6 py-3 border border-transparent rounded-lg shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-primary-600 hover:from-blue-700 hover:to-primary-700 transition-all"
                  >
                    {editingEntity ? 'Update' : 'Create'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

EntityManagerPage.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  fields: PropTypes.arrayOf(PropTypes.object).isRequired,
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      header: PropTypes.string.isRequired,
      render: PropTypes.func,
      align: PropTypes.string
    })
  ).isRequired,
  fetchEntities: PropTypes.func.isRequired,
  createEntity: PropTypes.func.isRequired,
  updateEntity: PropTypes.func.isRequired,
  deleteEntity: PropTypes.func.isRequired,
  searchKeys: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.func])),
  tenantSlug: PropTypes.string,
  mapEntityToForm: PropTypes.func,
  mapFormToPayload: PropTypes.func,
  searchPlaceholder: PropTypes.string,
  emptyStateMessage: PropTypes.string
};

export default EntityManagerPage;

