/**
 * Tenant Project API Service
 * Comprehensive API service for tenant project management
 * Extends tenantApiService with project-specific methods
 */

import tenantApiService from '../../../../../../../shared/services/tenant/tenant-api.service';
import { refreshToken as refreshSessionCookies } from '../../../../../../../shared/services/auth/token-refresh.service';
import { API_ENDPOINTS, ERROR_MESSAGES } from '../constants/projectConstants';

// Helper to process response with timeout handling
const processResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    let msg = errorData.message || `API request failed: ${response.status} ${response.statusText}`;
    const errs = errorData.errors;
    if (Array.isArray(errs) && errs.length) {
      const detail = errs.map((e) => e.msg || e.message || JSON.stringify(e)).filter(Boolean).join('; ');
      if (detail) msg = `${msg}: ${detail}`;
    }
    const error = new Error(msg);
    error.status = response.status;
    error.data = errorData;
    error.isApiError = true;
    // Extract trace ID from response headers
    error.traceId = response.headers.get('X-Request-ID') || errorData.traceId;
    throw error;
  }

  const data = await response.json();
  return data.data || data;
};

// SECURITY FIX: Internal makeRequest helper using HttpOnly cookies
// This ensures token refresh and error handling work consistently across all modules
const makeRequest = async (endpoint, options = {}, retry = true) => {
  // SECURITY FIX: Don't read tokens from localStorage - they're in HttpOnly cookies
  // Cookies are sent automatically with credentials: 'include'

  // Use empty string to leverage proxy configuration (setupProxy.js)
  const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  // IMPROVEMENT: Add request timeout (30 seconds)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

  // SECURITY FIX: Build headers - cookies sent automatically, no Authorization header needed
  // JWT tokens provide sufficient protection for API requests
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  let response;
  try {
    response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers,
      credentials: 'include' // IMPORTANT: Include cookies for CSRF token
    });

    clearTimeout(timeoutId);
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      const timeoutError = new Error('Request timeout. Please try again.');
      timeoutError.isTimeout = true;
      timeoutError.isApiError = true;
      throw timeoutError;
    }
    throw error;
  }

  // SECURITY FIX: Handle token expiration with circuit breaker pattern
  // Track retry attempts to prevent abuse
  const retryKey = `token-retry-${endpoint}`;
  const maxRetries = 1;
  const retryCount = parseInt(sessionStorage.getItem(retryKey) || '0', 10);
  
  if (response.status === 401 && retry && retryCount < maxRetries) {
    const errorData = await response.json().catch(() => ({}));
    
    // DEBUG: Log authentication error details
    console.error('🔐 Authentication Error (401):', {
      message: errorData.message,
      error: errorData.error,
      endpoint,
      retryCount
    });
    
    // Check if it's a token expiration error
    if (errorData.error === 'TokenExpiredError' || errorData.message?.includes('expired') || errorData.message?.includes('Token expired')) {
      try {
        // SECURITY FIX: Increment retry counter
        sessionStorage.setItem(retryKey, String(retryCount + 1));
        
        // Use shared refresh (tries /api/auth/refresh then /api/tenant-auth/refresh).
        // Org staff use main auth cookies; tenant-only refresh would 403 and wrongly log users out.
        await refreshSessionCookies();
        
        // SECURITY FIX: Clear retry counter on success
        sessionStorage.removeItem(retryKey);
        
        console.log('✅ Token refreshed successfully (cookies), retrying request...');
        
        // Retry the request - cookies will be sent automatically (retry = false to prevent infinite loop)
        return makeRequest(endpoint, options, false);
      } catch (refreshError) {
        // SECURITY FIX: Clear retry counter on failure
        sessionStorage.removeItem(retryKey);
        console.error('❌ Token refresh failed:', refreshError);
        // SECURITY FIX: Only clear user data, tokens are in cookies
        localStorage.removeItem('tenantData');
        window.location.href = '/landing';
        throw new Error('Session expired. Please log in again.');
      }
    }
    
    // Other 401 errors - clear retry counter
    sessionStorage.removeItem(retryKey);
    
    // If it's an authentication required error, check if user needs to log in
    if (errorData.message?.includes('Authentication required') || errorData.message?.includes('No token')) {
      console.error('❌ No valid authentication token. Please log in.');
      // Don't redirect automatically - let the UI handle it
    }
    
    const error = new Error(errorData.message || 'Authentication failed');
    error.status = 401;
    error.data = errorData;
    error.traceId = response.headers.get('X-Request-ID') || errorData.traceId;
    throw error;
  } else if (response.status === 401 && retryCount >= maxRetries) {
    // SECURITY FIX: Circuit breaker - too many retries
    sessionStorage.removeItem(retryKey);
    throw new Error('Too many authentication retry attempts. Please log in again.');
  }

  return processResponse(response);
};

/**
 * Tenant Projects API Service
 */
class TenantProjectApiService {
  /**
   * Get all projects for tenant
   * @param {string} tenantSlug - Tenant slug
   * @param {Object} params - Query parameters (filters, pagination)
   * @returns {Promise} API response
   */
  async getProjects(tenantSlug, params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const url = `${API_ENDPOINTS.PROJECTS(tenantSlug)}${queryParams ? '?' + queryParams : ''}`;
      return await makeRequest(url);
    } catch (error) {
      throw this.handleError(error, ERROR_MESSAGES.NETWORK_ERROR);
    }
  }

  /**
   * Get a single project by ID
   * @param {string} tenantSlug - Tenant slug
   * @param {string} projectId - Project ID
   * @returns {Promise} API response
   */
  async getProject(tenantSlug, projectId) {
    if (!projectId) {
      throw new Error('Project ID is required');
    }
    try {
      return await makeRequest(API_ENDPOINTS.PROJECT(tenantSlug, projectId));
    } catch (error) {
      throw this.handleError(error, ERROR_MESSAGES.NOT_FOUND);
    }
  }

  /**
   * Create a new project
   * @param {string} tenantSlug - Tenant slug
   * @param {Object} projectData - Project data
   * @returns {Promise} API response
   */
  async createProject(tenantSlug, projectData) {
    try {
      return await makeRequest(API_ENDPOINTS.PROJECTS(tenantSlug), {
        method: 'POST',
        body: JSON.stringify(projectData)
      });
    } catch (error) {
      throw this.handleError(error, ERROR_MESSAGES.VALIDATION_ERROR);
    }
  }

  /**
   * Update a project
   * @param {string} tenantSlug - Tenant slug
   * @param {string} projectId - Project ID
   * @param {Object} projectData - Updated project data
   * @returns {Promise} API response
   */
  async updateProject(tenantSlug, projectId, projectData) {
    if (!projectId) {
      throw new Error('Project ID is required');
    }
    try {
      return await makeRequest(API_ENDPOINTS.PROJECT(tenantSlug, projectId), {
        method: 'PATCH',
        body: JSON.stringify(projectData)
      });
    } catch (error) {
      throw this.handleError(error, ERROR_MESSAGES.VALIDATION_ERROR);
    }
  }

  /**
   * Upload project workspace logo (multipart field: logo)
   * @param {string} tenantSlug
   * @param {string} projectId
   * @param {File} file
   * @returns {Promise<{ logoUrl?: string }>}
   */
  async uploadProjectLogo(tenantSlug, projectId, file) {
    if (!projectId || !file) {
      throw new Error('Project ID and file are required');
    }
    const form = new FormData();
    form.append('logo', file);
    const url = `/api/tenant/${tenantSlug}/organization/projects/${projectId}/logo`;
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      body: form
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      const err = new Error(json.message || 'Failed to upload project logo');
      err.status = response.status;
      throw err;
    }
    return json.data || json;
  }

  /**
   * Remove project logo
   */
  async deleteProjectLogo(tenantSlug, projectId) {
    if (!projectId) {
      throw new Error('Project ID is required');
    }
    const url = `/api/tenant/${tenantSlug}/organization/projects/${projectId}/logo`;
    const response = await fetch(url, {
      method: 'DELETE',
      credentials: 'include'
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      const err = new Error(json.message || 'Failed to remove project logo');
      err.status = response.status;
      throw err;
    }
    return json.data || json;
  }

  /**
   * Delete a project
   * @param {string} tenantSlug - Tenant slug
   * @param {string} projectId - Project ID
   * @returns {Promise} API response
   */
  async deleteProject(tenantSlug, projectId) {
    if (!projectId) {
      throw new Error('Project ID is required');
    }
    try {
      return await makeRequest(API_ENDPOINTS.PROJECT(tenantSlug, projectId), {
        method: 'DELETE'
      });
    } catch (error) {
      throw this.handleError(error, ERROR_MESSAGES.SERVER_ERROR);
    }
  }

  /**
   * Get project metrics
   * @param {string} tenantSlug - Tenant slug
   * @param {Object} params - Query parameters
   * @returns {Promise} API response
   */
  async getProjectMetrics(tenantSlug, params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const url = `${API_ENDPOINTS.PROJECT_METRICS(tenantSlug)}${queryParams ? '?' + queryParams : ''}`;
      return await makeRequest(url);
    } catch (error) {
      throw this.handleError(error, ERROR_MESSAGES.NETWORK_ERROR);
    }
  }

  /**
   * Get project tasks
   * @param {string} tenantSlug - Tenant slug
   * @param {Object} params - Query parameters
   * @returns {Promise} API response
   */
  async getProjectTasks(tenantSlug, params = {}) {
    try {
      return await tenantApiService.getProjectTasks(tenantSlug, params);
    } catch (error) {
      throw this.handleError(error, ERROR_MESSAGES.NETWORK_ERROR);
    }
  }

  /**
   * Create a task
   * @param {string} tenantSlug - Tenant slug
   * @param {Object} taskData - Task data
   * @returns {Promise} API response
   */
  async createTask(tenantSlug, taskData) {
    try {
      return await makeRequest(API_ENDPOINTS.PROJECT_TASKS(tenantSlug), {
        method: 'POST',
        body: JSON.stringify(taskData)
      });
    } catch (error) {
      throw this.handleError(error, ERROR_MESSAGES.VALIDATION_ERROR);
    }
  }

  /**
   * Update a task
   * @param {string} tenantSlug - Tenant slug
   * @param {string} taskId - Task ID
   * @param {Object} taskData - Updated task data
   * @returns {Promise} API response
   */
  async deleteTask(tenantSlug, taskId) {
    if (!taskId) throw new Error('Task ID is required');
    try {
      return await makeRequest(API_ENDPOINTS.PROJECT_TASK(tenantSlug, taskId), { method: 'DELETE' });
    } catch (error) {
      throw this.handleError(error, ERROR_MESSAGES.NETWORK_ERROR);
    }
  }

  async updateTask(tenantSlug, taskId, taskData) {
    if (!taskId) {
      throw new Error('Task ID is required');
    }
    try {
      return await makeRequest(API_ENDPOINTS.PROJECT_TASK(tenantSlug, taskId), {
        method: 'PATCH',
        body: JSON.stringify(taskData)
      });
    } catch (error) {
      throw this.handleError(error, ERROR_MESSAGES.VALIDATION_ERROR);
    }
  }

  /**
   * Get project milestones
   * @param {string} tenantSlug - Tenant slug
   * @param {Object} params - Query parameters
   * @returns {Promise} API response
   */
  async getProjectMilestones(tenantSlug, params = {}) {
    try {
      return await tenantApiService.getProjectMilestones(tenantSlug, params);
    } catch (error) {
      throw this.handleError(error, ERROR_MESSAGES.NETWORK_ERROR);
    }
  }

  /**
   * Create a milestone
   * @param {string} tenantSlug - Tenant slug
   * @param {Object} milestoneData - Milestone data
   * @returns {Promise} API response
   */
  async createMilestone(tenantSlug, milestoneData) {
    try {
      return await makeRequest(API_ENDPOINTS.PROJECT_MILESTONES(tenantSlug), {
        method: 'POST',
        body: JSON.stringify(milestoneData)
      });
    } catch (error) {
      throw this.handleError(error, ERROR_MESSAGES.VALIDATION_ERROR);
    }
  }

  /**
   * Update a milestone
   * @param {string} tenantSlug - Tenant slug
   * @param {string} milestoneId - Milestone ID
   * @param {Object} milestoneData - Updated milestone data
   * @returns {Promise} API response
   */
  async updateMilestone(tenantSlug, milestoneId, milestoneData) {
    if (!milestoneId) {
      throw new Error('Milestone ID is required');
    }
    try {
      return await makeRequest(API_ENDPOINTS.PROJECT_MILESTONE(tenantSlug, milestoneId), {
        method: 'PATCH',
        body: JSON.stringify(milestoneData)
      });
    } catch (error) {
      throw this.handleError(error, ERROR_MESSAGES.VALIDATION_ERROR);
    }
  }

  /**
   * Get project resources
   * @param {string} tenantSlug - Tenant slug
   * @param {Object} params - Query parameters
   * @returns {Promise} API response
   */
  async getProjectResources(tenantSlug, params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const url = `${API_ENDPOINTS.PROJECT_RESOURCES(tenantSlug)}${queryParams ? '?' + queryParams : ''}`;
      return await makeRequest(url);
    } catch (error) {
      throw this.handleError(error, ERROR_MESSAGES.NETWORK_ERROR);
    }
  }

  // ── Project Members ──────────────────────────────────────────────────────

  async getProjectMembers(tenantSlug, projectId) {
    try {
      return await makeRequest(`/api/tenant/${tenantSlug}/organization/projects/${projectId}/members`);
    } catch (error) {
      throw this.handleError(error, ERROR_MESSAGES.NETWORK_ERROR);
    }
  }

  async addProjectMember(tenantSlug, projectId, data) {
    try {
      return await makeRequest(`/api/tenant/${tenantSlug}/organization/projects/${projectId}/members`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
    } catch (error) {
      throw this.handleError(error, ERROR_MESSAGES.VALIDATION_ERROR);
    }
  }

  async updateProjectMember(tenantSlug, projectId, memberId, data) {
    try {
      return await makeRequest(`/api/tenant/${tenantSlug}/organization/projects/${projectId}/members/${memberId}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      });
    } catch (error) {
      throw this.handleError(error, ERROR_MESSAGES.VALIDATION_ERROR);
    }
  }

  async removeProjectMember(tenantSlug, projectId, memberId) {
    try {
      return await makeRequest(`/api/tenant/${tenantSlug}/organization/projects/${projectId}/members/${memberId}`, {
        method: 'DELETE'
      });
    } catch (error) {
      throw this.handleError(error, ERROR_MESSAGES.NETWORK_ERROR);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Create a resource (add team member to org pool)
   * @param {string} tenantSlug - Tenant slug
   * @param {Object} data - { userId, department, jobTitle, skills? }
   * @returns {Promise} API response
   */
  async createResource(tenantSlug, data) {
    try {
      return await makeRequest(API_ENDPOINTS.PROJECT_RESOURCES(tenantSlug), {
        method: 'POST',
        body: JSON.stringify(data)
      });
    } catch (error) {
      throw this.handleError(error, ERROR_MESSAGES.VALIDATION_ERROR);
    }
  }

  /**
   * Get project timesheets
   * @param {string} tenantSlug - Tenant slug
   * @param {Object} params - Query parameters
   * @returns {Promise} API response
   */
  async getProjectTimesheets(tenantSlug, params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const url = `${API_ENDPOINTS.PROJECT_TIMESHEETS(tenantSlug)}${queryParams ? '?' + queryParams : ''}`;
      return await makeRequest(url);
    } catch (error) {
      throw this.handleError(error, ERROR_MESSAGES.NETWORK_ERROR);
    }
  }

  /**
   * Submit timesheet entry
   * @param {string} tenantSlug - Tenant slug
   * @param {Object} timesheetData - Timesheet data
   * @returns {Promise} API response
   */
  async submitTimesheet(tenantSlug, timesheetData) {
    try {
      return await makeRequest(API_ENDPOINTS.PROJECT_TIMESHEETS(tenantSlug), {
        method: 'POST',
        body: JSON.stringify(timesheetData)
      });
    } catch (error) {
      throw this.handleError(error, ERROR_MESSAGES.VALIDATION_ERROR);
    }
  }

  /**
   * Get project sprints
   * @param {string} tenantSlug - Tenant slug
   * @param {Object} params - Query parameters
   * @returns {Promise} API response
   */
  async getProjectSprints(tenantSlug, params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const url = `${API_ENDPOINTS.PROJECT_SPRINTS(tenantSlug)}${queryParams ? '?' + queryParams : ''}`;
      return await makeRequest(url);
    } catch (error) {
      throw this.handleError(error, ERROR_MESSAGES.NETWORK_ERROR);
    }
  }

  /**
   * Create a sprint
   * @param {string} tenantSlug - Tenant slug
   * @param {Object} sprintData - Sprint data
   * @returns {Promise} API response
   */
  async createSprint(tenantSlug, sprintData) {
    try {
      return await makeRequest(API_ENDPOINTS.PROJECT_SPRINTS(tenantSlug), {
        method: 'POST',
        body: JSON.stringify(sprintData)
      });
    } catch (error) {
      throw this.handleError(error, ERROR_MESSAGES.VALIDATION_ERROR);
    }
  }

  /**
   * Update a sprint (e.g. status: planning → active)
   * @param {string} tenantSlug
   * @param {string} sprintId
   * @param {Object} updates — partial fields (status, goal, dates, …)
   */
  async updateSprint(tenantSlug, sprintId, updates) {
    try {
      return await makeRequest(API_ENDPOINTS.PROJECT_SPRINT(tenantSlug, sprintId), {
        method: 'PATCH',
        body: JSON.stringify(updates)
      });
    } catch (error) {
      throw this.handleError(error, ERROR_MESSAGES.VALIDATION_ERROR);
    }
  }

  /**
   * Get boards for a project (multiple boards per project are supported)
   * @param {string} tenantSlug - Tenant slug
   * @param {Object} params - Query parameters (e.g. { projectId })
   * @returns {Promise} API response
   */
  async getBoards(tenantSlug, params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const url = `${API_ENDPOINTS.PROJECT_BOARDS(tenantSlug)}${queryParams ? '?' + queryParams : ''}`;
      return await makeRequest(url);
    } catch (error) {
      throw this.handleError(error, ERROR_MESSAGES.NETWORK_ERROR);
    }
  }

  /**
   * Create a board on a project
   * @param {string} tenantSlug - Tenant slug
   * @param {Object} boardData - { projectId, name, description?, type?, color? }
   * @returns {Promise} API response
   */
  async createBoard(tenantSlug, boardData) {
    try {
      return await makeRequest(API_ENDPOINTS.PROJECT_BOARDS(tenantSlug), {
        method: 'POST',
        body: JSON.stringify(boardData)
      });
    } catch (error) {
      throw this.handleError(error, ERROR_MESSAGES.VALIDATION_ERROR);
    }
  }

  /**
   * Update a board (rename, recolor, reorder)
   * @param {string} tenantSlug - Tenant slug
   * @param {string} boardId - Board ID
   * @param {Object} updates - Partial fields
   * @returns {Promise} API response
   */
  async updateBoard(tenantSlug, boardId, updates) {
    try {
      return await makeRequest(API_ENDPOINTS.PROJECT_BOARD(tenantSlug, boardId), {
        method: 'PATCH',
        body: JSON.stringify(updates)
      });
    } catch (error) {
      throw this.handleError(error, ERROR_MESSAGES.VALIDATION_ERROR);
    }
  }

  /**
   * Archive a board
   * @param {string} tenantSlug - Tenant slug
   * @param {string} boardId - Board ID
   * @returns {Promise} API response
   */
  async deleteBoard(tenantSlug, boardId) {
    try {
      return await makeRequest(API_ENDPOINTS.PROJECT_BOARD(tenantSlug, boardId), { method: 'DELETE' });
    } catch (error) {
      throw this.handleError(error, ERROR_MESSAGES.NETWORK_ERROR);
    }
  }

  /**
   * Get all clients
   * @param {string} tenantSlug - Tenant slug
   * @returns {Promise} API response
   */
  async getClients(tenantSlug) {
    try {
      const response = await makeRequest(API_ENDPOINTS.CLIENTS(tenantSlug));
      // Handle different response formats
      if (Array.isArray(response)) {
        return response;
      }
      if (response && response.clients) {
        return response.clients;
      }
      if (response && response.data && Array.isArray(response.data)) {
        return response.data;
      }
      if (response && response.data && response.data.clients) {
        return response.data.clients;
      }
      return [];
    } catch (error) {
      console.error('Error fetching clients:', error);
      // Return empty array instead of throwing to prevent modal from breaking
      if (error.status === 500 || error.status === 401) {
        console.warn('Client fetch failed, returning empty array:', error.message);
        return [];
      }
      throw this.handleError(error, ERROR_MESSAGES.NETWORK_ERROR);
    }
  }

  /**
   * Create a client
   * @param {string} tenantSlug - Tenant slug
   * @param {Object} clientData - Client data
   * @returns {Promise} API response
   */
  async createClient(tenantSlug, clientData) {
    try {
      return await makeRequest(API_ENDPOINTS.CLIENTS(tenantSlug), {
        method: 'POST',
        body: JSON.stringify(clientData)
      });
    } catch (error) {
      throw this.handleError(error, ERROR_MESSAGES.VALIDATION_ERROR);
    }
  }

  /**
   * Get Gantt timeline data for a project
   * @param {string} tenantSlug - Tenant slug
   * @param {string} projectId - Project ID
   * @returns {Promise} API response with tasks, critical path, timeline, and settings
   */
  async getGanttTimeline(tenantSlug, projectId) {
    if (!projectId) {
      throw new Error('Project ID is required');
    }
    try {
      return await makeRequest(API_ENDPOINTS.GANTT_TIMELINE(tenantSlug, projectId));
    } catch (error) {
      throw this.handleError(error, ERROR_MESSAGES.NETWORK_ERROR);
    }
  }

  /**
   * Get tasks with dependencies for Gantt chart
   * @param {string} tenantSlug - Tenant slug
   * @param {string} projectId - Project ID
   * @returns {Promise} API response with tasks
   */
  async getGanttTasks(tenantSlug, projectId) {
    if (!projectId) {
      throw new Error('Project ID is required');
    }
    try {
      return await makeRequest(API_ENDPOINTS.GANTT_TASKS(tenantSlug, projectId));
    } catch (error) {
      throw this.handleError(error, ERROR_MESSAGES.NETWORK_ERROR);
    }
  }

  /**
   * Get critical path for a project
   * @param {string} tenantSlug - Tenant slug
   * @param {string} projectId - Project ID
   * @returns {Promise} API response with critical path data
   */
  async getCriticalPath(tenantSlug, projectId) {
    if (!projectId) {
      throw new Error('Project ID is required');
    }
    try {
      return await makeRequest(API_ENDPOINTS.GANTT_CRITICAL_PATH(tenantSlug, projectId));
    } catch (error) {
      throw this.handleError(error, ERROR_MESSAGES.NETWORK_ERROR);
    }
  }

  /**
   * Create task dependency
   * @param {string} tenantSlug - Tenant slug
   * @param {string} taskId - Source task ID
   * @param {Object} dependencyData - Dependency data (targetTaskId, dependencyType, lagTime)
   * @returns {Promise} API response
   */
  async createTaskDependency(tenantSlug, taskId, dependencyData) {
    if (!taskId) {
      throw new Error('Task ID is required');
    }
    try {
      return await makeRequest(API_ENDPOINTS.TASK_DEPENDENCY(tenantSlug, taskId), {
        method: 'POST',
        body: JSON.stringify(dependencyData)
      });
    } catch (error) {
      throw this.handleError(error, ERROR_MESSAGES.VALIDATION_ERROR);
    }
  }

  /**
   * Delete task dependency
   * @param {string} tenantSlug - Tenant slug
   * @param {string} taskId - Task ID
   * @param {string} dependencyId - Dependency ID
   * @returns {Promise} API response
   */
  async deleteTaskDependency(tenantSlug, taskId, dependencyId) {
    if (!taskId || !dependencyId) {
      throw new Error('Task ID and Dependency ID are required');
    }
    try {
      return await makeRequest(API_ENDPOINTS.TASK_DEPENDENCY_DELETE(tenantSlug, taskId, dependencyId), {
        method: 'DELETE'
      });
    } catch (error) {
      throw this.handleError(error, ERROR_MESSAGES.SERVER_ERROR);
    }
  }

  /**
   * Reschedule task
   * @param {string} tenantSlug - Tenant slug
   * @param {string} taskId - Task ID
   * @param {Object} scheduleData - Schedule data (startDate, endDate, autoAdjustDependents)
   * @returns {Promise} API response
   */
  async rescheduleTask(tenantSlug, taskId, scheduleData) {
    if (!taskId) {
      throw new Error('Task ID is required');
    }
    try {
      return await makeRequest(API_ENDPOINTS.TASK_RESCHEDULE(tenantSlug, taskId), {
        method: 'PUT',
        body: JSON.stringify(scheduleData)
      });
    } catch (error) {
      throw this.handleError(error, ERROR_MESSAGES.VALIDATION_ERROR);
    }
  }

  /**
   * Save Gantt settings
   * @param {string} tenantSlug - Tenant slug
   * @param {string} projectId - Project ID
   * @param {Object} settings - Gantt settings
   * @returns {Promise} API response
   */
  async saveGanttSettings(tenantSlug, projectId, settings) {
    if (!projectId) {
      throw new Error('Project ID is required');
    }
    try {
      return await makeRequest(API_ENDPOINTS.GANTT_SETTINGS(tenantSlug, projectId), {
        method: 'POST',
        body: JSON.stringify(settings)
      });
    } catch (error) {
      throw this.handleError(error, ERROR_MESSAGES.VALIDATION_ERROR);
    }
  }

  /**
   * Save project timeline preferences
   * @param {string} tenantSlug - Tenant slug
   * @param {string} projectId - Project ID
   * @param {Object} timelineData - Timeline preferences
   * @returns {Promise} API response
   */
  async saveProjectTimeline(tenantSlug, projectId, timelineData) {
    if (!projectId) {
      throw new Error('Project ID is required');
    }
    try {
      return await makeRequest(API_ENDPOINTS.GANTT_TIMELINE_SAVE(tenantSlug, projectId), {
        method: 'POST',
        body: JSON.stringify(timelineData)
      });
    } catch (error) {
      throw this.handleError(error, ERROR_MESSAGES.VALIDATION_ERROR);
    }
  }

  /**
   * Get project dashboard with integrated data
   * @param {string} tenantSlug - Tenant slug
   * @param {string} projectId - Project ID
   * @returns {Promise} API response with dashboard data
   */
  async getProjectDashboard(tenantSlug, projectId) {
    if (!projectId) {
      throw new Error('Project ID is required');
    }
    try {
      return await makeRequest(API_ENDPOINTS.PROJECT(tenantSlug, projectId) + '/dashboard');
    } catch (error) {
      throw this.handleError(error, ERROR_MESSAGES.NETWORK_ERROR);
    }
  }

  /**
   * Get tasks with full context (sprint, milestone, timesheet, gantt)
   * @param {string} tenantSlug - Tenant slug
   * @param {string} projectId - Project ID
   * @param {Object} filters - Filter options
   * @returns {Promise} API response with tasks
   */
  async getTasksWithContext(tenantSlug, projectId, filters = {}) {
    if (!projectId) {
      throw new Error('Project ID is required');
    }
    try {
      const queryParams = new URLSearchParams(filters).toString();
      const url = `${API_ENDPOINTS.PROJECT(tenantSlug, projectId)}/tasks-with-context${queryParams ? '?' + queryParams : ''}`;
      return await makeRequest(url);
    } catch (error) {
      throw this.handleError(error, ERROR_MESSAGES.NETWORK_ERROR);
    }
  }

  /**
   * Get integration status/health check
   * @param {string} tenantSlug - Tenant slug
   * @param {string} projectId - Project ID
   * @returns {Promise} API response with integration health
   */
  async getIntegrationStatus(tenantSlug, projectId) {
    if (!projectId) {
      throw new Error('Project ID is required');
    }
    try {
      return await makeRequest(API_ENDPOINTS.PROJECT(tenantSlug, projectId) + '/integration-status');
    } catch (error) {
      throw this.handleError(error, ERROR_MESSAGES.NETWORK_ERROR);
    }
  }

  /**
   * Validate task completion
   * @param {string} tenantSlug - Tenant slug
   * @param {string} taskId - Task ID
   * @returns {Promise} API response with validation result
   */
  async validateTaskCompletion(tenantSlug, taskId) {
    if (!taskId) {
      throw new Error('Task ID is required');
    }
    try {
      return await makeRequest(API_ENDPOINTS.PROJECT_TASK(tenantSlug, taskId) + '/validate-completion', {
        method: 'POST'
      });
    } catch (error) {
      throw this.handleError(error, ERROR_MESSAGES.VALIDATION_ERROR);
    }
  }

  /**
   * Sync task with related features
   * @param {string} tenantSlug - Tenant slug
   * @param {string} taskId - Task ID
   * @returns {Promise} API response
   */
  async syncTask(tenantSlug, taskId) {
    if (!taskId) {
      throw new Error('Task ID is required');
    }
    try {
      return await makeRequest(API_ENDPOINTS.PROJECT_TASK(tenantSlug, taskId) + '/sync', {
        method: 'POST'
      });
    } catch (error) {
      throw this.handleError(error, ERROR_MESSAGES.SERVER_ERROR);
    }
  }

  // Client Portal API Methods - REMOVED COMPLETELY

  // ============================================
  // NUCLEUS PROJECT OS - APPROVAL WORKFLOW APIs
  // ============================================

  /**
   * Get approval steps pending for the current user (Approval Queue)
   * @param {string} tenantSlug - Tenant slug
   * @returns {Promise} List of { _id, step_number, approver_type, deliverable, project }
   */
  async getPendingApprovals(tenantSlug) {
    try {
      const endpoint = API_ENDPOINTS.APPROVALS_PENDING(tenantSlug);
      return await makeRequest(endpoint);
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch pending approvals');
    }
  }

  /**
   * Get approvals for a deliverable
   * @param {string} tenantSlug - Tenant slug
   * @param {string} deliverableId - Deliverable ID
   * @returns {Promise} Approval chain
   */
  async getApprovalsForDeliverable(tenantSlug, deliverableId) {
    try {
      const endpoint = API_ENDPOINTS.APPROVALS_FOR_DELIVERABLE(tenantSlug, deliverableId);
      return await makeRequest(endpoint);
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch approvals');
    }
  }

  /**
   * Approve an approval step
   * @param {string} tenantSlug - Tenant slug
   * @param {string} approvalId - Approval ID
   * @param {string} notes - Optional notes
   * @returns {Promise} Updated approval
   */
  async approveStep(tenantSlug, approvalId, notes = null) {
    try {
      const endpoint = API_ENDPOINTS.APPROVAL_APPROVE(tenantSlug, approvalId);
      return await makeRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify({ notes })
      });
    } catch (error) {
      throw this.handleError(error, 'Failed to approve step');
    }
  }

  /**
   * Reject an approval step
   * @param {string} tenantSlug - Tenant slug
   * @param {string} approvalId - Approval ID
   * @param {string} reason - Rejection reason (required)
   * @returns {Promise} Updated approval
   */
  async rejectStep(tenantSlug, approvalId, reason) {
    try {
      const endpoint = API_ENDPOINTS.APPROVAL_REJECT(tenantSlug, approvalId);
      return await makeRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify({ reason })
      });
    } catch (error) {
      throw this.handleError(error, 'Failed to reject step');
    }
  }

  /**
   * Create approval chain for a deliverable
   * @param {string} tenantSlug - Tenant slug
   * @param {string} deliverableId - Deliverable ID
   * @param {Object} config - Approval chain configuration
   * @param {string} config.devLeadId - Dev Lead user ID
   * @param {string} config.qaLeadId - QA Lead user ID
   * @param {string} config.securityId - Security user ID (optional)
   * @param {string} config.clientEmail - Client email
   * @returns {Promise} Created approvals
   */
  async createApprovalChain(tenantSlug, deliverableId, config) {
    try {
      const endpoint = API_ENDPOINTS.APPROVAL_CREATE_CHAIN(tenantSlug, deliverableId);
      return await makeRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(config)
      });
    } catch (error) {
      throw this.handleError(error, 'Failed to create approval chain');
    }
  }

  // ============================================
  // NUCLEUS PROJECT OS - CHANGE REQUEST APIs
  // ============================================

  /**
   * Submit a change request
   * @param {string} tenantSlug - Tenant slug
   * @param {Object} data - Change request data
   * @param {string} data.deliverable_id - Deliverable ID
   * @param {string} data.description - Change description
   * @returns {Promise} Created change request
   */
  async submitChangeRequest(tenantSlug, data) {
    try {
      const endpoint = API_ENDPOINTS.CHANGE_REQUESTS(tenantSlug);
      return await makeRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(data)
      });
    } catch (error) {
      throw this.handleError(error, 'Failed to submit change request');
    }
  }

  /**
   * Get change requests
   * @param {string} tenantSlug - Tenant slug
   * @param {Object} filters - Filter options
   * @returns {Promise} Change requests list
   */
  async getChangeRequests(tenantSlug, filters = {}) {
    try {
      const queryParams = new URLSearchParams(filters).toString();
      const endpoint = `${API_ENDPOINTS.CHANGE_REQUESTS(tenantSlug)}${queryParams ? '?' + queryParams : ''}`;
      return await makeRequest(endpoint);
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch change requests');
    }
  }

  /**
   * Get a single change request by ID
   * @param {string} tenantSlug - Tenant slug
   * @param {string} changeRequestId - Change request ID
   * @returns {Promise} Change request
   */
  async getChangeRequestById(tenantSlug, changeRequestId) {
    try {
      const endpoint = API_ENDPOINTS.CHANGE_REQUEST(tenantSlug, changeRequestId);
      return await makeRequest(endpoint);
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch change request');
    }
  }

  /**
   * Acknowledge a change request (PM action)
   * @param {string} tenantSlug - Tenant slug
   * @param {string} changeRequestId - Change request ID
   * @returns {Promise} Updated change request
   */
  async acknowledgeChangeRequest(tenantSlug, changeRequestId) {
    try {
      const endpoint = API_ENDPOINTS.CHANGE_REQUEST_ACKNOWLEDGE(tenantSlug, changeRequestId);
      return await makeRequest(endpoint, {
        method: 'POST'
      });
    } catch (error) {
      throw this.handleError(error, 'Failed to acknowledge change request');
    }
  }

  /**
   * Evaluate a change request (PM action)
   * @param {string} tenantSlug - Tenant slug
   * @param {string} changeRequestId - Change request ID
   * @param {Object} evaluation - Evaluation data
   * @returns {Promise} Updated change request
   */
  async evaluateChangeRequest(tenantSlug, changeRequestId, evaluation) {
    try {
      const endpoint = API_ENDPOINTS.CHANGE_REQUEST_EVALUATE(tenantSlug, changeRequestId);
      return await makeRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(evaluation)
      });
    } catch (error) {
      throw this.handleError(error, 'Failed to evaluate change request');
    }
  }

  /**
   * Decide on a change request (Client action)
   * @param {string} tenantSlug - Tenant slug
   * @param {string} changeRequestId - Change request ID
   * @param {string} decision - 'accept' or 'reject'
   * @returns {Promise} Updated change request
   */
  async decideChangeRequest(tenantSlug, changeRequestId, decision) {
    try {
      const endpoint = API_ENDPOINTS.CHANGE_REQUEST_DECIDE(tenantSlug, changeRequestId);
      return await makeRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify({ decision })
      });
    } catch (error) {
      throw this.handleError(error, 'Failed to decide on change request');
    }
  }

  /**
   * Get audit trail for a change request
   * @param {string} tenantSlug - Tenant slug
   * @param {string} changeRequestId - Change request ID
   * @returns {Promise} Audit trail
   */
  async getChangeRequestAudit(tenantSlug, changeRequestId) {
    try {
      const endpoint = API_ENDPOINTS.CHANGE_REQUEST_AUDIT(tenantSlug, changeRequestId);
      return await makeRequest(endpoint);
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch audit trail');
    }
  }

  // ============================================
  // NUCLEUS PROJECT OS - DELIVERABLE APIs
  // ============================================

  /**
   * Validate deliverable date (PM action)
   * @param {string} tenantSlug - Tenant slug
   * @param {string} deliverableId - Deliverable ID
   * @param {Object} data - Validation data
   * @param {number} data.confidence - Confidence level (0-100)
   * @param {string} data.notes - Optional notes
   * @returns {Promise} Updated deliverable
   */
  async validateDeliverableDate(tenantSlug, deliverableId, data) {
    try {
      const endpoint = API_ENDPOINTS.DELIVERABLE_VALIDATE_DATE(tenantSlug, deliverableId);
      return await makeRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(data)
      });
    } catch (error) {
      throw this.handleError(error, 'Failed to validate deliverable date');
    }
  }

  /**
   * Get deliverables needing validation
   * @param {string} tenantSlug - Tenant slug
   * @param {number} daysThreshold - Days threshold (default: 14)
   * @returns {Promise} List of deliverables
   */
  // Deliverable CRUD operations
  async getDeliverables(tenantSlug, filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    const url = `${API_ENDPOINTS.DELIVERABLES(tenantSlug)}${queryParams ? `?${queryParams}` : ''}`;
    return await makeRequest(url, { method: 'GET' });
  }

  async getDeliverable(tenantSlug, deliverableId) {
    return await makeRequest(API_ENDPOINTS.DELIVERABLE(tenantSlug, deliverableId), { method: 'GET' });
  }

  async createDeliverable(tenantSlug, deliverableData) {
    return await makeRequest(API_ENDPOINTS.DELIVERABLES(tenantSlug), {
      method: 'POST',
      body: JSON.stringify(deliverableData)
    });
  }

  async updateDeliverable(tenantSlug, deliverableId, deliverableData) {
    return makeRequest(API_ENDPOINTS.DELIVERABLE(tenantSlug, deliverableId), {
      method: 'PUT',
      body: JSON.stringify(deliverableData)
    });
  }

  async deleteDeliverable(tenantSlug, deliverableId) {
    return makeRequest(API_ENDPOINTS.DELIVERABLE(tenantSlug, deliverableId), { method: 'DELETE' });
  }

  async updateDeliverableStatus(tenantSlug, deliverableId, status) {
    return makeRequest(API_ENDPOINTS.DELIVERABLE(tenantSlug, deliverableId), {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  }

  async shipDeliverable(tenantSlug, deliverableId) {
    return makeRequest(API_ENDPOINTS.DELIVERABLE(tenantSlug, deliverableId), {
      method: 'PUT',
      body: JSON.stringify({ status: 'shipped' })
    });
  }

  async linkTaskToDeliverable(tenantSlug, deliverableId, taskId) {
    return makeRequest(`/api/tenant/${tenantSlug}/organization/deliverables/${deliverableId}/tasks/${taskId}/link`, {
      method: 'POST'
    });
  }

  async unlinkTaskFromDeliverable(tenantSlug, deliverableId, taskId) {
    return makeRequest(`/api/tenant/${tenantSlug}/organization/deliverables/${deliverableId}/tasks/${taskId}`, {
      method: 'DELETE'
    });
  }

  /**
   * Get users for the organization (for approval chain setup)
   * @param {string} tenantSlug - Tenant slug
   * @param {Object} params - Query parameters (page, limit, role, etc.)
   * @returns {Promise} Users data
   */
  async getUsers(tenantSlug, params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const url = `/api/tenant/${tenantSlug}/organization/users${queryParams ? `?${queryParams}` : ''}`;
      return await makeRequest(url, { method: 'GET' });
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch users');
    }
  }

  /**
   * Get departments for the organization
   * @param {string} tenantSlug - Tenant slug
   * @returns {Promise} Departments data
   */
  async getDepartments(tenantSlug) {
    try {
      const url = `/api/tenant/${tenantSlug}/departments`;
      const response = await makeRequest(url, { method: 'GET' });
      // Handle different response structures
      if (Array.isArray(response)) {
        return response;
      } else if (response?.data && Array.isArray(response.data)) {
        return response.data;
      } else if (response?.departments && Array.isArray(response.departments)) {
        return response.departments;
      }
      return [];
    } catch (error) {
      console.error('Error fetching departments:', error);
      // Return empty array on error - don't block project/task creation
      return [];
    }
  }

  async getDeliverablesNeedingValidation(tenantSlug, daysThreshold = 14) {
    try {
      const endpoint = `${API_ENDPOINTS.DELIVERABLES_NEEDING_VALIDATION(tenantSlug)}?daysThreshold=${daysThreshold}`;
      return await makeRequest(endpoint);
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch deliverables needing validation');
    }
  }

  /**
   * Handle API errors consistently
   * @param {Error} error - Error object
   * @param {string} defaultMessage - Default error message
   * @returns {Error} Enhanced error object
   */
  handleError(error, defaultMessage) {
    // If already an API error with proper structure, return as-is
    if (error.isApiError && error.status && error.data) {
      return error;
    }

    // Handle network errors
    if (error.isNetworkError || error.message?.includes('fetch')) {
      const networkError = new Error(ERROR_MESSAGES.NETWORK_ERROR);
      networkError.isNetworkError = true;
      networkError.isApiError = true;
      return networkError;
    }

    // Extract error message from various sources
    const message = error.data?.message || 
                   error.message || 
                   error.response?.data?.message || 
                   defaultMessage || 
                   'An unexpected error occurred';

    const enhancedError = new Error(message);
    enhancedError.status = error.status || error.response?.status || 500;
    enhancedError.data = error.data || error.response?.data || {};
    enhancedError.isApiError = true;

    // Preserve original error for debugging
    enhancedError.originalError = error;

    return enhancedError;
  }
}

// Export singleton instance
const tenantProjectApiService = new TenantProjectApiService();
export default tenantProjectApiService;
