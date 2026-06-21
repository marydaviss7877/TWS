import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // SECURITY FIX: Include cookies for authentication
});

// SECURITY FIX: Removed localStorage token access - tokens are in HttpOnly cookies
// Cookies are sent automatically with withCredentials: true
api.interceptors.request.use((config) => {
  // SECURITY FIX: No Authorization header needed - cookies are sent automatically
  return config;
});

// Resource API service
export const resourceService = {
  // Get all resources with filtering
  getResources: async (params = {}) => {
    try {
      const response = await api.get('/resources', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching resources:', error);
      throw error;
    }
  },

  // Get resource statistics
  getResourceStats: async () => {
    try {
      const response = await api.get('/resources/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching resource stats:', error);
      throw error;
    }
  },

  // Get single resource
  getResource: async (resourceId) => {
    try {
      const response = await api.get(`/resources/${resourceId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching resource:', error);
      throw error;
    }
  },

  // Create new resource
  createResource: async (resourceData) => {
    try {
      const response = await api.post('/resources', resourceData);
      return response.data;
    } catch (error) {
      console.error('Error creating resource:', error);
      throw error;
    }
  },

  // Update resource
  updateResource: async (resourceId, updates) => {
    try {
      const response = await api.patch(`/resources/${resourceId}`, updates);
      return response.data;
    } catch (error) {
      console.error('Error updating resource:', error);
      throw error;
    }
  },

  // Add project allocation to resource
  addProjectAllocation: async (resourceId, projectData) => {
    try {
      const response = await api.post(`/resources/${resourceId}/projects`, projectData);
      return response.data;
    } catch (error) {
      console.error('Error adding project allocation:', error);
      throw error;
    }
  },

  // Update project allocation
  updateProjectAllocation: async (resourceId, projectId, updates) => {
    try {
      const response = await api.patch(`/resources/${resourceId}/projects/${projectId}`, updates);
      return response.data;
    } catch (error) {
      console.error('Error updating project allocation:', error);
      throw error;
    }
  },

  // Remove project allocation
  removeProjectAllocation: async (resourceId, projectId) => {
    try {
      const response = await api.delete(`/resources/${resourceId}/projects/${projectId}`);
      return response.data;
    } catch (error) {
      console.error('Error removing project allocation:', error);
      throw error;
    }
  },

  // Add skill to resource
  addSkill: async (resourceId, skillData) => {
    try {
      const response = await api.post(`/resources/${resourceId}/skills`, skillData);
      return response.data;
    } catch (error) {
      console.error('Error adding skill:', error);
      throw error;
    }
  },

  // Update skill
  updateSkill: async (resourceId, skillId, updates) => {
    try {
      const response = await api.patch(`/resources/${resourceId}/skills/${skillId}`, updates);
      return response.data;
    } catch (error) {
      console.error('Error updating skill:', error);
      throw error;
    }
  },

  // Remove skill
  removeSkill: async (resourceId, skillId) => {
    try {
      const response = await api.delete(`/resources/${resourceId}/skills/${skillId}`);
      return response.data;
    } catch (error) {
      console.error('Error removing skill:', error);
      throw error;
    }
  },

  // Update time tracking
  updateTimeTracking: async (resourceId, timeData) => {
    try {
      const response = await api.patch(`/resources/${resourceId}/time-tracking`, timeData);
      return response.data;
    } catch (error) {
      console.error('Error updating time tracking:', error);
      throw error;
    }
  },

  // Delete resource
  deleteResource: async (resourceId) => {
    try {
      const response = await api.delete(`/resources/${resourceId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting resource:', error);
      throw error;
    }
  }
};

export default resourceService;
