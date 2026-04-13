/**
 * Industry API Configuration
 * Centralized configuration for all industry-specific API endpoints
 * Enables easy API versioning and path management
 * 
 * @module industry/config/apiConfig
 */

/**
 * API version configuration
 * Change this to update all API paths when versioning is needed
 */
export const API_VERSION = 'v1'; // Future-proofing for API versioning

/**
 * Base API path for tenant-specific endpoints
 */
export const TENANT_API_BASE = '/api/tenant';

/**
 * Builds a tenant API URL
 * 
 * @param {string} tenantSlug - Tenant identifier
 * @param {string} path - API path (e.g., 'software-house/tech-stack')
 * @param {string} resourceId - Optional resource ID
 * @returns {string} - Full API URL
 */
export const buildTenantUrl = (tenantSlug, path, resourceId = null) => {
  const base = `${TENANT_API_BASE}/${tenantSlug}/${path}`;
  return resourceId ? `${base}/${resourceId}` : base;
};

/**
 * Industry-specific API path mappings (Software House only)
 */
export const API_PATHS = {
  softwareHouse: {
    base: 'software-house',
    techStack: 'software-house/tech-stack',
    timeTracking: 'software-house/time-tracking',
    codeQuality: 'software-house/code-quality',
  },
};

/**
 * Gets API path for a specific industry and resource
 * 
 * @param {string} industry - Industry name ('software_house')
 * @param {string} resource - Resource name
 * @returns {string|null} - API path or null if not found
 */
export const getApiPath = (industry, resource) => {
  const industryPaths = API_PATHS[industry];
  if (!industryPaths) {
    return null;
  }

  // Handle nested paths (e.g., 'library.books')
  const pathParts = resource.split('.');
  let current = industryPaths;
  
  for (const part of pathParts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return null;
    }
  }

  return typeof current === 'string' ? current : null;
};

