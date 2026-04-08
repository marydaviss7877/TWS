/**
 * SECURE AXIOS INSTANCE
 * 
 * SECURITY FIX: Uses HttpOnly cookies instead of localStorage
 * - Tokens stored in HttpOnly cookies (not accessible to JavaScript)
 * - Automatic cookie handling (credentials: 'include')
 * - No localStorage token management
 * - Unified token refresh via cookies
 * 
 * In production (when REACT_APP_API_URL is set), baseURL is the backend
 * so requests hit the API server. In dev with proxy, baseURL can be '' and proxy forwards.
 * @module shared/utils/axiosInstance
 */

import axios from 'axios';

// Always use relative URLs — requests go through the proxy (frontend/server.js)
// so cookies stay on the same origin. Setting REACT_APP_API_URL here used to
// send requests directly to the backend domain, breaking cookie auth in production.
const getApiBaseUrl = () => '';

// Use backend URL when set (production); empty in dev so proxy forwards /api/* to backend
const axiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
  withCredentials: true, // SECURITY FIX: Include cookies in all requests
});

// Track refresh token promise to prevent multiple simultaneous refresh attempts
let refreshTokenPromise = null;

/**
 * Attempts to refresh the authentication token using cookies
 */
const attemptTokenRefresh = async () => {
  // If already refreshing, return the existing promise
  if (refreshTokenPromise) {
    console.log('🔄 Token refresh already in progress, waiting for existing refresh...');
    return refreshTokenPromise;
  }

  // Create new refresh promise
  refreshTokenPromise = (async () => {
    try {
      console.log('🔄 Attempting token refresh via cookies...');

      // Attempt refresh - cookies are sent automatically with credentials: 'include'
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include', // SECURITY FIX: Include cookies
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Token refresh failed');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error('Token refresh failed');
      }

      console.log('✅ Token refresh successful (tokens in cookies)');
      return true; // Success - tokens are now in cookies

    } catch (error) {
      console.error('❌ Token refresh failed:', error.message);
      throw error;
    } finally {
      // Clear the promise so we can retry later
      refreshTokenPromise = null;
    }
  })();

  return refreshTokenPromise;
};

// Request interceptor - Cookies are sent automatically, no need to set Authorization header
axiosInstance.interceptors.request.use(
  (config) => {
    // SECURITY FIX: Don't set Authorization header - cookies are sent automatically
    // Backend will read from req.cookies.accessToken
    
    // Add request timestamp for debugging (development only)
    if (process.env.NODE_ENV === 'development') {
      config.metadata = { startTime: Date.now() };
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
axiosInstance.interceptors.response.use(
  (response) => {
    // Log request duration in development
    if (process.env.NODE_ENV === 'development' && response.config.metadata) {
      const duration = Date.now() - response.config.metadata.startTime;
      if (duration > 1000) {
        console.warn(`Slow API request: ${response.config.url} took ${duration}ms`);
      }
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized - attempt token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const errorMessage = error.response?.data?.message || error.message || '';
      
      // If error is "Invalid token" or "expired", try to refresh
      if (errorMessage.includes('Invalid token') || errorMessage.includes('expired') || errorMessage.includes('Token')) {
        try {
          // Attempt to refresh token using cookies
          await attemptTokenRefresh();
          
          // Retry original request - cookies will be sent automatically
          return axiosInstance(originalRequest);
        } catch (refreshError) {
          // Refresh failed - redirect to login or handle gracefully
          console.warn('Token refresh failed, returning null for:', originalRequest.url);
          
          // Clear any remaining localStorage data
          localStorage.removeItem('user');
          localStorage.removeItem('tenantData');
          
          // Return a resolved promise with proper response structure to indicate failure
          return Promise.resolve({
            data: null,
            status: 401,
            statusText: 'Unauthorized',
            headers: {},
            config: originalRequest
          });
        }
      } else {
        // Other 401 errors - don't try to refresh, just return null gracefully
        console.warn('Unauthorized request (non-token error), returning null for:', originalRequest.url);
        // Return a proper axios response structure
        return Promise.resolve({
          data: null,
          status: 401,
          statusText: 'Unauthorized',
          headers: {},
          config: originalRequest
        });
      }
    }

    // Handle network errors
    if (!error.response) {
      // Network error or timeout
      const networkError = new Error(
        error.code === 'ECONNABORTED' 
          ? 'Request timeout. Please check your connection and try again.'
          : 'Network error. Please check your internet connection.'
      );
      networkError.isNetworkError = true;
      return Promise.reject(networkError);
    }

    // Handle other HTTP errors
    const status = error.response.status;
    const message = error.response.data?.message || error.message || 'An error occurred';

    // Don't log 401 errors - they're handled gracefully above
    // Only log other errors in development
    if (status !== 401 && process.env.NODE_ENV === 'development') {
      console.error('API Error:', {
        url: originalRequest?.url,
        status,
        message,
        data: error.response.data,
      });
    }

    // For 401 errors, return a resolved promise with proper response structure instead of rejecting
    // This prevents error handlers from logging them
    if (status === 401) {
      return Promise.resolve({
        data: null,
        status: 401,
        statusText: 'Unauthorized',
        headers: error.response.headers || {},
        config: originalRequest
      });
    }

    // Enhance error object with useful information
    const enhancedError = new Error(message);
    enhancedError.status = status;
    enhancedError.data = error.response.data;
    enhancedError.isApiError = true;

    return Promise.reject(enhancedError);
  }
);

export default axiosInstance;

