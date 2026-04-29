/**
 * API Client Factory
 * Creates reusable CRUD API clients following DRY principles
 * Reduces code duplication across industry modules
 * 
 * @module industry/utils/apiClientFactory
 */

import axiosInstance from '../../../utils/axiosInstance';
import { getAuthHeaders } from './tokenUtils';

/**
 * Creates a standard CRUD API client for a given resource path
 * 
 * @param {string} basePath - Base API path (e.g., 'tenant/students')
 * @param {Object} options - Configuration options
 * @param {boolean} options.requireAuth - Whether authentication is required (default: true)
 * @param {number} options.timeout - Request timeout in milliseconds (default: 30000)
 * @returns {Object} - API client with CRUD methods
 * 
 * @example
 * const studentsApi = createCrudClient('tenant/students');
 * await studentsApi.getAll('school-slug', { page: 1, limit: 10 });
 */
export const createCrudClient = (basePath, options = {}) => {
  const { requireAuth = true, timeout = 30000 } = options;

  /**
   * Builds the full API URL for a tenant resource
   * 
   * @param {string} tenantSlug - Tenant identifier
   * @param {string} resourcePath - Additional path segments
   * @returns {string} - Full API URL
   */
  const buildUrl = (tenantSlug, resourcePath = '') => {
    const path = resourcePath 
      ? `/api/tenant/${tenantSlug}/${basePath}/${resourcePath}`
      : `/api/tenant/${tenantSlug}/${basePath}`;
    return path.replace(/\/+/g, '/'); // Remove duplicate slashes
  };

  /**
   * Builds query string from params object
   * 
   * @param {Object} params - Query parameters
   * @returns {string} - Query string
   */
  const buildQueryString = (params = {}) => {
    if (!params || Object.keys(params).length === 0) {
      return '';
    }
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, String(value));
      }
    });
    const queryString = queryParams.toString();
    return queryString ? `?${queryString}` : '';
  };

  /**
   * Gets request configuration with auth headers
   * 
   * @returns {Object} - Axios request config
   */
  const getRequestConfig = () => {
    const config = {
      timeout,
      headers: requireAuth ? getAuthHeaders() : { 'Content-Type': 'application/json' },
    };
    return config;
  };

  return {
    /**
     * Get all resources with optional filtering
     * 
     * @param {string} tenantSlug - Tenant identifier
     * @param {Object} params - Query parameters (filtering, pagination, etc.)
     * @param {AbortSignal} signal - Optional AbortSignal for request cancellation
     * @returns {Promise} - Axios response
     */
    getAll: (tenantSlug, params = {}, signal = null) => {
      const url = buildUrl(tenantSlug) + buildQueryString(params);
      const config = getRequestConfig();
      if (signal) {
        config.signal = signal;
      }
      return axiosInstance.get(url, config);
    },

    /**
     * Get a single resource by ID
     * 
     * @param {string} tenantSlug - Tenant identifier
     * @param {string|number} id - Resource ID
     * @param {AbortSignal} signal - Optional AbortSignal for request cancellation
     * @returns {Promise} - Axios response
     */
    get: (tenantSlug, id, signal = null) => {
      const url = buildUrl(tenantSlug, String(id));
      const config = getRequestConfig();
      if (signal) {
        config.signal = signal;
      }
      return axiosInstance.get(url, config);
    },

    /**
     * Create a new resource
     * 
     * @param {string} tenantSlug - Tenant identifier
     * @param {Object} data - Resource data
     * @param {AbortSignal} signal - Optional AbortSignal for request cancellation
     * @returns {Promise} - Axios response
     */
    create: (tenantSlug, data, signal = null) => {
      const url = buildUrl(tenantSlug);
      const config = getRequestConfig();
      if (signal) {
        config.signal = signal;
      }
      return axiosInstance.post(url, data, config);
    },

    /**
     * Update an existing resource
     * 
     * @param {string} tenantSlug - Tenant identifier
     * @param {string|number} id - Resource ID
     * @param {Object} data - Updated resource data
     * @param {AbortSignal} signal - Optional AbortSignal for request cancellation
     * @returns {Promise} - Axios response
     */
    update: (tenantSlug, id, data, signal = null) => {
      const url = buildUrl(tenantSlug, String(id));
      const config = getRequestConfig();
      if (signal) {
        config.signal = signal;
      }
      return axiosInstance.put(url, data, config);
    },

    /**
     * Delete a resource
     * 
     * @param {string} tenantSlug - Tenant identifier
     * @param {string|number} id - Resource ID
     * @param {AbortSignal} signal - Optional AbortSignal for request cancellation
     * @returns {Promise} - Axios response
     */
    delete: (tenantSlug, id, signal = null) => {
      const url = buildUrl(tenantSlug, String(id));
      const config = getRequestConfig();
      if (signal) {
        config.signal = signal;
      }
      return axiosInstance.delete(url, config);
    },
  };
};

/**
 * Creates a custom API client with additional methods
 * Extends the base CRUD client with custom endpoints
 * 
 * @param {string} basePath - Base API path
 * @param {Object} customMethods - Custom method definitions
 * @param {Object} options - Configuration options
 * @returns {Object} - Extended API client
 * 
 * @example
 * const studentsApi = createCustomClient('tenant/students', {
 *   register: (tenantSlug, data) => axiosInstance.post(`/api/tenant/${tenantSlug}/tenant/students/register`, data, getRequestConfig()),
 *   bulkImport: (tenantSlug, students) => axiosInstance.post(`/api/tenant/${tenantSlug}/tenant/students/bulk-import`, { students }, getRequestConfig())
 * });
 */
export const createCustomClient = (basePath, customMethods = {}, options = {}) => {
  const crudClient = createCrudClient(basePath, options);
  return {
    ...crudClient,
    ...customMethods,
  };
};

