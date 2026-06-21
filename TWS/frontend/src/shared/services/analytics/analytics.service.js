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

// Analytics API service
export const analyticsService = {
  // Get overall tenant analytics summary
  getSummary: async () => {
    try {
      const response = await api.get('/analytics/summary');
      return response.data;
    } catch (error) {
      console.error('Error fetching analytics summary:', error);
      throw error;
    }
  },

  // Get comprehensive analytics overview for executive dashboard
  getOverview: async (period = 'monthly') => {
    try {
      const response = await api.get('/analytics/overview', {
        params: { period }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching analytics overview:', error);
      throw error;
    }
  },

  // Get project profitability trends
  getProjectProfitabilityTrends: async (period = 'monthly') => {
    try {
      const response = await api.get('/analytics/projects/profitability-trends', {
        params: { period }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching project profitability trends:', error);
      throw error;
    }
  },

  // Get project profitability breakdown
  getProjectProfitability: async (projectId = null, period = 'monthly') => {
    try {
      const params = { period };
      if (projectId) params.projectId = projectId;
      
      const response = await api.get('/analytics/projects/profitability', {
        params
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching project profitability:', error);
      throw error;
    }
  },

  // Get employee performance metrics
  getEmployeePerformance: async (employeeId = null, period = 'monthly') => {
    try {
      const params = { period };
      if (employeeId) params.employeeId = employeeId;
      
      const response = await api.get('/analytics/employees/performance', {
        params
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching employee performance:', error);
      throw error;
    }
  },

  // Get employee performance summary
  getEmployeePerformanceSummary: async (period = 'monthly') => {
    try {
      const response = await api.get('/analytics/employees/performance-summary', {
        params: { period }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching employee performance summary:', error);
      throw error;
    }
  },

  // Get client health trends
  getClientHealthTrends: async (clientId = null, period = 'monthly') => {
    try {
      const params = { period };
      if (clientId) params.clientId = clientId;
      
      const response = await api.get('/analytics/clients/health-trends', {
        params
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching client health trends:', error);
      throw error;
    }
  },

  // Get client health breakdown
  getClientHealth: async (clientId = null, period = 'monthly') => {
    try {
      const params = { period };
      if (clientId) params.clientId = clientId;
      
      const response = await api.get('/analytics/clients/health', {
        params
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching client health:', error);
      throw error;
    }
  },

  // Get feature usage statistics
  getFeatureUsage: async () => {
    try {
      const response = await api.get('/analytics/feature-usage');
      return response.data;
    } catch (error) {
      console.error('Error fetching feature usage:', error);
      throw error;
    }
  },

  // Export analytics data
  exportData: async (type = 'overview', format = 'json', period = 'monthly') => {
    try {
      const response = await api.get('/analytics/export', {
        params: { type, format, period },
        responseType: format === 'csv' ? 'blob' : 'json'
      });
      
      if (format === 'csv') {
        // Handle CSV download
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${type}-${period}-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        return { success: true, message: 'Data exported successfully' };
      }
      
      return response.data;
    } catch (error) {
      console.error('Error exporting analytics data:', error);
      throw error;
    }
  }
};

export default analyticsService;
