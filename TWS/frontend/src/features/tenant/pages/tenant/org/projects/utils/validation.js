/**
 * Validation Utilities
 * Centralized validation functions for tenant project-related data
 */

import {
  VALIDATION,
  ERROR_MESSAGES,
  PROJECT_PRIORITY,
  PROJECT_STATUS,
  CURRENCIES
} from '../constants/projectConstants';

/**
 * Validate project name
 * @param {string} name - Project name
 * @returns {Object} Validation result { isValid, error }
 */
export const validateProjectName = (name) => {
  if (!name || typeof name !== 'string') {
    return { isValid: false, error: ERROR_MESSAGES.PROJECT_NAME_REQUIRED };
  }

  const trimmed = name.trim();

  if (trimmed.length < VALIDATION.PROJECT_NAME_MIN_LENGTH) {
    return { isValid: false, error: ERROR_MESSAGES.PROJECT_NAME_TOO_SHORT };
  }

  if (trimmed.length > VALIDATION.PROJECT_NAME_MAX_LENGTH) {
    return { isValid: false, error: ERROR_MESSAGES.PROJECT_NAME_TOO_LONG };
  }

  return { isValid: true, error: null };
};

/**
 * Validate budget amount
 * @param {string|number} budget - Budget amount
 * @returns {Object} Validation result { isValid, error, value }
 */
export const validateBudget = (budget) => {
  if (!budget && budget !== 0) {
    return { isValid: true, error: null, value: null }; // Budget is optional
  }

  const numValue = typeof budget === 'string' ? parseFloat(budget) : budget;

  if (isNaN(numValue)) {
    return { isValid: false, error: ERROR_MESSAGES.BUDGET_INVALID, value: null };
  }

  if (numValue < VALIDATION.BUDGET_MIN) {
    return { isValid: false, error: ERROR_MESSAGES.BUDGET_NEGATIVE, value: null };
  }

  if (numValue > VALIDATION.BUDGET_MAX) {
    return { isValid: false, error: `Budget cannot exceed ${VALIDATION.BUDGET_MAX.toLocaleString()}`, value: null };
  }

  return { isValid: true, error: null, value: numValue };
};

/**
 * Validate estimated hours
 * @param {string|number} hours - Estimated hours
 * @returns {Object} Validation result { isValid, error, value }
 */
export const validateEstimatedHours = (hours) => {
  if (!hours && hours !== 0) {
    return { isValid: true, error: null, value: null }; // Hours are optional
  }

  const numValue = typeof hours === 'string' ? parseInt(hours, 10) : hours;

  if (isNaN(numValue)) {
    return { isValid: false, error: ERROR_MESSAGES.ESTIMATED_HOURS_INVALID, value: null };
  }

  if (numValue < VALIDATION.ESTIMATED_HOURS_MIN) {
    return { isValid: false, error: ERROR_MESSAGES.ESTIMATED_HOURS_NEGATIVE, value: null };
  }

  if (numValue > VALIDATION.ESTIMATED_HOURS_MAX) {
    return { isValid: false, error: `Estimated hours cannot exceed ${VALIDATION.ESTIMATED_HOURS_MAX.toLocaleString()}`, value: null };
  }

  return { isValid: true, error: null, value: numValue };
};

/**
 * Validate client ID
 * @param {string} clientId - Client ID
 * @returns {Object} Validation result { isValid, error }
 */
export const validateClientId = (clientId) => {
  if (!clientId || clientId.trim() === '') {
    return { isValid: false, error: ERROR_MESSAGES.CLIENT_REQUIRED };
  }

  return { isValid: true, error: null };
};

/**
 * Validate priority
 * @param {string} priority - Priority value
 * @returns {boolean} True if valid
 */
export const validatePriority = (priority) => {
  return Object.values(PROJECT_PRIORITY).includes(priority);
};

/**
 * Validate status
 * @param {string} status - Status value
 * @returns {boolean} True if valid
 */
export const validateStatus = (status) => {
  return Object.values(PROJECT_STATUS).includes(status);
};

/**
 * Validate currency code
 * @param {string} currency - Currency code
 * @returns {boolean} True if valid
 */
export const validateCurrency = (currency) => {
  return Object.values(CURRENCIES).includes(currency);
};

/**
 * Validate email address
 * @param {string} email - Email address
 * @returns {Object} Validation result { isValid, error }
 */
export const validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: 'Email is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return { isValid: false, error: 'Invalid email address' };
  }

  return { isValid: true, error: null };
};

/**
 * Validate hours worked
 * @param {string|number} hours - Hours worked
 * @returns {Object} Validation result { isValid, error, value }
 */
export const validateHours = (hours) => {
  if (!hours && hours !== 0) {
    return { isValid: false, error: 'Hours are required', value: null };
  }

  const numValue = typeof hours === 'string' ? parseFloat(hours) : hours;

  if (isNaN(numValue)) {
    return { isValid: false, error: 'Invalid hours value', value: null };
  }

  if (numValue < 0) {
    return { isValid: false, error: 'Hours cannot be negative', value: null };
  }

  if (numValue > 24) {
    return { isValid: false, error: 'Hours cannot exceed 24 per day', value: null };
  }

  return { isValid: true, error: null, value: numValue };
};

/**
 * Validate project form data
 * @param {Object} formData - Form data object
 * @returns {Object} Validation result { isValid, errors }
 */
export const validateProjectForm = (formData) => {
  const errors = {};

  // Validate project name
  const nameValidation = validateProjectName(formData.name);
  if (!nameValidation.isValid) {
    errors.name = nameValidation.error;
  }

  // Validate client ID (optional for tenant projects)
  if (formData.clientId) {
    const clientValidation = validateClientId(formData.clientId);
    if (!clientValidation.isValid) {
      errors.clientId = clientValidation.error;
    }
  }

  // Validate budget
  if (formData.budget?.total) {
    const budgetValidation = validateBudget(formData.budget.total);
    if (!budgetValidation.isValid) {
      errors.budget = budgetValidation.error;
    }
  }

  // Validate estimated hours
  if (formData.timeline?.estimatedHours) {
    const hoursValidation = validateEstimatedHours(formData.timeline.estimatedHours);
    if (!hoursValidation.isValid) {
      errors.estimatedHours = hoursValidation.error;
    }
  }

  // Validate priority
  if (formData.priority && !validatePriority(formData.priority)) {
    errors.priority = 'Invalid priority value';
  }

  // Validate currency
  if (formData.budget?.currency && !validateCurrency(formData.budget.currency)) {
    errors.currency = 'Invalid currency code';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Sanitize string input
 * @param {string} input - Input string
 * @returns {string} Sanitized string
 */
export const sanitizeString = (input) => {
  if (typeof input !== 'string') {
    return '';
  }
  return input.trim().replace(/[<>]/g, '');
};

/**
 * Sanitize project name to match backend validation: only [a-zA-Z0-9\s\-_\.]
 * @param {string} name - Raw name
 * @returns {string} Sanitized name
 */
export const sanitizeProjectNameForApi = (name) => {
  if (!name || typeof name !== 'string') return '';
  return name
    .trim()
    .replace(/[^a-zA-Z0-9\s\-_.]/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 255)
    .trim();
};

/**
 * Sanitize project data before sending to API
 * Ensures payload matches backend express-validator rules (name chars, types, omit empty optionals).
 * @param {Object} data - Project data
 * @returns {Object} Sanitized data
 */
export const sanitizeProjectData = (data) => {
  const sanitized = { ...data };
  delete sanitized.logoUrl;

  if (sanitized.name) {
    sanitized.name = sanitizeProjectNameForApi(sanitized.name);
  }

  if (sanitized.description) {
    sanitized.description = sanitizeString(sanitized.description);
  }

  // Backend optional fields: omit empty string to avoid validation errors (e.g. clientId "" fails isMongoId)
  if (!sanitized.clientId || sanitized.clientId === '') {
    delete sanitized.clientId;
  }

  // timeline.estimatedHours must be integer; omit empty; omit empty dates
  if (sanitized.timeline) {
    const t = { ...sanitized.timeline };
    if (t.estimatedHours !== undefined && t.estimatedHours !== '' && t.estimatedHours !== null) {
      const n = parseInt(t.estimatedHours, 10);
      t.estimatedHours = Number.isNaN(n) ? undefined : Math.max(0, n);
    } else {
      delete t.estimatedHours;
    }
    if (!t.startDate || t.startDate === '') delete t.startDate;
    if (!t.endDate || t.endDate === '') delete t.endDate;
    sanitized.timeline = t;
  }

  // Optional fields backend may not validate; omit empty to keep payload clean
  if (!sanitized.primaryDepartmentId || sanitized.primaryDepartmentId === '') {
    delete sanitized.primaryDepartmentId;
  }
  if (!Array.isArray(sanitized.departments) || sanitized.departments.length === 0) {
    delete sanitized.departments;
  }

  return sanitized;
};

/**
 * Normalize populated refs / ObjectIds to a 24-char hex Mongo id string.
 * Returns undefined when missing or not a valid id (never "[object Object]").
 */
export function toMongoIdString(value) {
  if (value == null || value === '') return undefined;
  if (typeof value === 'string') {
    return /^[0-9a-f]{24}$/i.test(value.trim()) ? value.trim() : undefined;
  }
  if (typeof value === 'object') {
    const inner = value._id ?? value.id ?? value.$oid;
    if (inner != null) return toMongoIdString(inner);
  }
  if (typeof value?.toString === 'function') {
    const s = String(value);
    if (/^[0-9a-f]{24}$/i.test(s)) return s;
  }
  return undefined;
}

