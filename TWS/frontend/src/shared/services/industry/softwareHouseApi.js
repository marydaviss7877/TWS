/**
 * Software House API Service
 * Provides comprehensive API methods for software house operations
 * 
 * @module industry/softwareHouseApi
 */

import axiosInstance from '../../utils/axiosInstance';

/**
 * SECURITY FIX: Removed localStorage token access
 * Tokens are now in HttpOnly cookies, sent automatically with axiosInstance
 * (axiosInstance is configured with withCredentials: true)
 */
const getTenantAuthHeaders = () => {
  // SECURITY FIX: No Authorization header needed - cookies are sent automatically
  return {
    'Content-Type': 'application/json',
  };
};

/**
 * Software House API Service
 * Handles all software house-related API operations
 */
export const softwareHouseApi = {
  // Configuration
  getConfig: (tenantSlug) => {
    const url = `/api/tenant/${tenantSlug}/software-house/config`;
    return axiosInstance.get(url, { headers: getTenantAuthHeaders(), withCredentials: true });
  },

  updateConfig: (tenantSlug, config) => {
    const url = `/api/tenant/${tenantSlug}/software-house/config`;
    return axiosInstance.put(url, config, { headers: getTenantAuthHeaders(), withCredentials: true });
  },

  // Tech Stack
  getTechStack: (tenantSlug) => {
    const url = `/api/tenant/${tenantSlug}/software-house/tech-stack`;
    return axiosInstance.get(url, { headers: getTenantAuthHeaders() });
  },

  updateTechStack: (tenantSlug, techStack) => {
    const url = `/api/tenant/${tenantSlug}/software-house/tech-stack`;
    return axiosInstance.put(url, techStack, { headers: getTenantAuthHeaders() });
  },

  getTechStackStats: (tenantSlug) => {
    const url = `/api/tenant/${tenantSlug}/software-house/tech-stack/stats`;
    return axiosInstance.get(url, { headers: getTenantAuthHeaders() });
  },

  // Metrics
  getMetrics: (tenantSlug) => {
    const url = `/api/tenant/${tenantSlug}/software-house/metrics`;
    return axiosInstance.get(url, { headers: getTenantAuthHeaders() });
  },

  // Dashboard
  getDashboard: (tenantSlug) => {
    const url = `/api/tenant/${tenantSlug}/software-house/dashboard`;
    return axiosInstance.get(url, { headers: getTenantAuthHeaders() });
  },

  // Projects
  getProjects: (tenantSlug, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const url = `/api/tenant/${tenantSlug}/software-house/projects${queryParams ? '?' + queryParams : ''}`;
    return axiosInstance.get(url, { headers: getTenantAuthHeaders() });
  },

  // Sprints
  getSprints: (tenantSlug, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const url = `/api/tenant/${tenantSlug}/software-house/sprints${queryParams ? '?' + queryParams : ''}`;
    return axiosInstance.get(url, { headers: getTenantAuthHeaders() });
  },

  // Analytics
  getAnalytics: (tenantSlug, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const url = `/api/tenant/${tenantSlug}/software-house/analytics${queryParams ? '?' + queryParams : ''}`;
    return axiosInstance.get(url, { headers: getTenantAuthHeaders() });
  },

  // Team
  getTeam: (tenantSlug) => {
    const url = `/api/tenant/${tenantSlug}/software-house/team`;
    return axiosInstance.get(url, { headers: getTenantAuthHeaders() });
  },

  // Time Tracking
  getTimeTracking: (tenantSlug, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const url = `/api/tenant/${tenantSlug}/software-house/time-tracking${queryParams ? '?' + queryParams : ''}`;
    return axiosInstance.get(url, { headers: getTenantAuthHeaders() });
  },

  getTodayTimeTracking: (tenantSlug) => {
    const url = `/api/tenant/${tenantSlug}/software-house/time-tracking/today`;
    return axiosInstance.get(url, { headers: getTenantAuthHeaders() });
  },

  startTimeTracking: (tenantSlug, data) => {
    const url = `/api/tenant/${tenantSlug}/software-house/time-tracking/start`;
    return axiosInstance.post(url, data, { headers: getTenantAuthHeaders() });
  },

  stopTimeTracking: (tenantSlug, entryId, data) => {
    const url = `/api/tenant/${tenantSlug}/software-house/time-tracking/stop/${entryId}`;
    return axiosInstance.post(url, data, { headers: getTenantAuthHeaders() });
  },

  createTimeEntry: (tenantSlug, data) => {
    const url = `/api/tenant/${tenantSlug}/software-house/time-tracking/entry`;
    return axiosInstance.post(url, data, { headers: getTenantAuthHeaders() });
  },

  getActiveTracking: (tenantSlug) => {
    const url = `/api/tenant/${tenantSlug}/software-house/time-tracking/active`;
    return axiosInstance.get(url, { headers: getTenantAuthHeaders() });
  },

  // Code Quality
  getCodeQuality: (tenantSlug, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const url = `/api/tenant/${tenantSlug}/software-house/code-quality${queryParams ? '?' + queryParams : ''}`;
    return axiosInstance.get(url, { headers: getTenantAuthHeaders() });
  },

  getProjectCodeQuality: (tenantSlug, projectId, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const url = `/api/tenant/${tenantSlug}/software-house/code-quality/project/${projectId}${queryParams ? '?' + queryParams : ''}`;
    return axiosInstance.get(url, { headers: getTenantAuthHeaders() });
  },

  // Client Portal - REMOVED from software house ERP
};

export default softwareHouseApi;

