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

// Billing API service
export const billingService = {
  // Get current usage for tenant
  getUsage: async () => {
    try {
      const response = await api.get('/billing/usage');
      return response.data;
    } catch (error) {
      console.error('Error fetching usage data:', error);
      throw error;
    }
  },

  // Get usage for a specific metric
  getUsageByMetric: async (metric, startDate = null, endDate = null, granularity = 'daily') => {
    try {
      const params = { granularity };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      
      const response = await api.get(`/billing/usage/${metric}`, {
        params
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching ${metric} usage:`, error);
      throw error;
    }
  },

  // Get available subscription plans
  getPlans: async (currentPlan = null) => {
    try {
      const params = {};
      if (currentPlan) params.currentPlan = currentPlan;
      
      const response = await api.get('/billing/plans', {
        params
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching subscription plans:', error);
      throw error;
    }
  },

  // Get specific subscription plan details
  getPlan: async (slug) => {
    try {
      const response = await api.get(`/billing/plans/${slug}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching subscription plan:', error);
      throw error;
    }
  },

  // Upgrade subscription plan
  upgradePlan: async (planSlug, billingCycle = 'monthly') => {
    try {
      const response = await api.post('/billing/upgrade', {
        planSlug,
        billingCycle
      });
      return response.data;
    } catch (error) {
      console.error('Error upgrading subscription:', error);
      throw error;
    }
  },

  // Downgrade subscription plan
  downgradePlan: async (planSlug, billingCycle = 'monthly', effectiveDate = 'end_of_period') => {
    try {
      const response = await api.post('/billing/downgrade', {
        planSlug,
        billingCycle,
        effectiveDate
      });
      return response.data;
    } catch (error) {
      console.error('Error downgrading subscription:', error);
      throw error;
    }
  },

  // Get billing invoices
  getInvoices: async (status = 'all', limit = 20, offset = 0) => {
    try {
      const response = await api.get('/billing/invoices', {
        params: { status, limit, offset }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching invoices:', error);
      throw error;
    }
  },

  // Get specific invoice details
  getInvoice: async (invoiceId) => {
    try {
      const response = await api.get(`/billing/invoices/${invoiceId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching invoice:', error);
      throw error;
    }
  },

  // Cancel subscription
  cancelSubscription: async (reason = null, effectiveDate = 'end_of_period', feedback = null) => {
    try {
      const response = await api.post('/billing/cancel', {
        reason,
        effectiveDate,
        feedback
      });
      return response.data;
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      throw error;
    }
  },

  // Download invoice as PDF
  downloadInvoice: async (invoiceId) => {
    try {
      const response = await api.get(`/billing/invoices/${invoiceId}/download`, {
        responseType: 'blob'
      });
      
      // Create blob and download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${invoiceId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      return { success: true, message: 'Invoice downloaded successfully' };
    } catch (error) {
      console.error('Error downloading invoice:', error);
      throw error;
    }
  },

  // Get billing history
  getBillingHistory: async (startDate = null, endDate = null, limit = 50, offset = 0) => {
    try {
      const params = { limit, offset };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      
      const response = await api.get('/billing/history', {
        params
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching billing history:', error);
      throw error;
    }
  },

  // Get payment methods
  getPaymentMethods: async () => {
    try {
      const response = await api.get('/billing/payment-methods');
      return response.data;
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      throw error;
    }
  },

  // Add payment method
  addPaymentMethod: async (paymentMethodData) => {
    try {
      const response = await api.post('/billing/payment-methods', paymentMethodData);
      return response.data;
    } catch (error) {
      console.error('Error adding payment method:', error);
      throw error;
    }
  },

  // Update payment method
  updatePaymentMethod: async (paymentMethodId, updates) => {
    try {
      const response = await api.put(`/billing/payment-methods/${paymentMethodId}`, updates);
      return response.data;
    } catch (error) {
      console.error('Error updating payment method:', error);
      throw error;
    }
  },

  // Delete payment method
  deletePaymentMethod: async (paymentMethodId) => {
    try {
      const response = await api.delete(`/billing/payment-methods/${paymentMethodId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting payment method:', error);
      throw error;
    }
  },

  // Set default payment method
  setDefaultPaymentMethod: async (paymentMethodId) => {
    try {
      const response = await api.post(`/billing/payment-methods/${paymentMethodId}/set-default`);
      return response.data;
    } catch (error) {
      console.error('Error setting default payment method:', error);
      throw error;
    }
  }
};

export default billingService;
