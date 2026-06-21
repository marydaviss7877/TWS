// API Configuration
// This file centralizes all API endpoints and configuration

// Always use relative URLs so every request goes through the production proxy
// (frontend/server.js), which forwards to BACKEND_URL. This keeps all cookies
// on the same origin and prevents the 401 / auto-logout on portal load.
const getBaseUrl = () => '';

const API_CONFIG = {
  BASE_URL: getBaseUrl(),
  ENDPOINTS: {
    // Authentication
    AUTH: {
      LOGIN: '/api/auth/login',
      LOGOUT: '/api/auth/logout',
      REFRESH: '/api/auth/refresh',
      ME: '/api/auth/me',
      SUPRA_ADMIN_LOGIN: '/api/auth/supra-admin/login'
    },
    
    // Supra Admin
    SUPRA_ADMIN: {
      DASHBOARD: '/api/supra-admin/dashboard',
      TENANTS: '/api/supra-admin/tenants',
      USERS: '/api/supra-admin/users',
      ANALYTICS: '/api/supra-admin/analytics'
    },
    
    // Master ERP
    MASTER_ERP: {
      BASE: '/api/master-erp',
      INDUSTRIES: '/api/master-erp/meta/industries',
      STATS: '/api/master-erp/stats/overview',
      TEMPLATES: '/api/master-erp/templates'
    },
    
    // Tenant Management
    TENANT: {
      AUTH: '/api/tenant-auth',
      DASHBOARD: '/api/tenant-dashboard',
      ORG: '/api/tenant'
    }
  }
};

// Helper function to build full API URLs
export const buildApiUrl = (endpoint) => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// Helper function for authenticated requests
export const apiRequest = async (endpoint, options = {}) => {
  // SECURITY FIX: Removed localStorage token access - tokens are in HttpOnly cookies
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    credentials: 'include' // SECURITY FIX: Include cookies for authentication
  };
  
  const response = await fetch(buildApiUrl(endpoint), {
    ...defaultOptions,
    ...options
  });
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
};

export default API_CONFIG;
