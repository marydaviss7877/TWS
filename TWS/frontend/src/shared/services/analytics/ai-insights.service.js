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

// AI Insights API service
export const aiInsightsService = {
  // Get general AI insights for the tenant
  getInsights: async () => {
    try {
      const response = await api.get('/ai/insights');
      return response.data;
    } catch (error) {
      console.error('Error fetching AI insights:', error);
      throw error;
    }
  },

  // Get AI insights summary for dashboard
  getSummary: async (limit = 5) => {
    try {
      const response = await api.get('/ai/summary', {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching AI insights summary:', error);
      throw error;
    }
  },

  // Get AI recommendations
  getRecommendations: async (category = null, priority = null, limit = 10) => {
    try {
      const params = { limit };
      if (category) params.category = category;
      if (priority) params.priority = priority;
      
      const response = await api.get('/ai/recommendations', {
        params
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching AI recommendations:', error);
      throw error;
    }
  },

  // Predict project overrun for a specific project
  predictProjectOverrun: async (projectId) => {
    try {
      const response = await api.get(`/ai/projects/${projectId}/predict-overrun`);
      return response.data;
    } catch (error) {
      console.error('Error predicting project overrun:', error);
      throw error;
    }
  },

  // Predict client churn risk
  predictClientChurn: async (clientId) => {
    try {
      const response = await api.get(`/ai/clients/${clientId}/predict-churn`);
      return response.data;
    } catch (error) {
      console.error('Error predicting client churn:', error);
      throw error;
    }
  },

  // Analyze employee utilization and recommend optimizations
  analyzeResourceUtilization: async () => {
    try {
      const response = await api.get('/ai/resources/utilization-analysis');
      return response.data;
    } catch (error) {
      console.error('Error analyzing resource utilization:', error);
      throw error;
    }
  },

  // Generate revenue forecast
  generateRevenueForecast: async () => {
    try {
      const response = await api.get('/ai/financial/revenue-forecast');
      return response.data;
    } catch (error) {
      console.error('Error generating revenue forecast:', error);
      throw error;
    }
  },

  // Get project insights
  getProjectInsights: async () => {
    try {
      const response = await api.get('/ai/projects/insights');
      return response.data;
    } catch (error) {
      console.error('Error fetching project insights:', error);
      throw error;
    }
  },

  // Get client insights
  getClientInsights: async () => {
    try {
      const response = await api.get('/ai/clients/insights');
      return response.data;
    } catch (error) {
      console.error('Error fetching client insights:', error);
      throw error;
    }
  },

  // Get resource insights
  getResourceInsights: async () => {
    try {
      const response = await api.get('/ai/resources/insights');
      return response.data;
    } catch (error) {
      console.error('Error fetching resource insights:', error);
      throw error;
    }
  },

  // Get financial insights
  getFinancialInsights: async () => {
    try {
      const response = await api.get('/ai/financial/insights');
      return response.data;
    } catch (error) {
      console.error('Error fetching financial insights:', error);
      throw error;
    }
  }
};

export default aiInsightsService;
