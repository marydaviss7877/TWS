/**
 * SECURE Token Refresh Service
 * 
 * SECURITY FIX: Uses HttpOnly cookies instead of localStorage
 * - Tokens stored in HttpOnly cookies (not accessible to JavaScript)
 * - Automatic cookie handling (credentials: 'include')
 * - No localStorage token management
 * - Works for both main auth and tenant auth
 * 
 * Multi-ERP, Multi-Tenant Support:
 * - Supports main auth (education users)
 * - Supports tenant auth (tenant owners)
 * - Automatically detects which endpoint to use based on cookies
 */

// Global refresh promise to prevent concurrent refreshes
let activeRefreshPromise = null;
let refreshLock = false;

/**
 * Clear all tokens from storage
 * SECURITY FIX: Only clears user data, tokens are in cookies
 */
const clearAllTokens = () => {
  // SECURITY FIX: Don't clear tokens from localStorage - they're in HttpOnly cookies
  // Only clear user data (non-sensitive)
  localStorage.removeItem('user');
  localStorage.removeItem('tenantData');
};

/**
 * Unified token refresh function using HttpOnly cookies
 * Prevents race conditions by ensuring only one refresh happens at a time
 * @returns {Promise<string|null>} - Success indicator (tokens in cookies)
 */
export const refreshToken = async () => {
  // If already refreshing, return the existing promise
  if (activeRefreshPromise) {
    console.log('🔄 Token refresh already in progress, waiting for existing refresh...');
    return activeRefreshPromise;
  }

  // If refresh is locked (e.g., after multiple failures), don't attempt
  if (refreshLock) {
    console.warn('⚠️ Token refresh is locked due to previous failures');
    return null;
  }

  // Create new refresh promise
  activeRefreshPromise = (async () => {
    try {
      // SECURITY FIX: Try tenant auth refresh first (for tenant owners)
      // Then fall back to main auth refresh (for education users)
      // Cookies are sent automatically with credentials: 'include'
      
      let refreshEndpoint = '/api/tenant-auth/refresh';
      let response = await fetch(refreshEndpoint, {
        method: 'POST',
        credentials: 'include', // SECURITY FIX: Include cookies
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // If tenant auth refresh fails, try main auth refresh
      if (!response.ok) {
        refreshEndpoint = '/api/auth/refresh';
        response = await fetch(refreshEndpoint, {
          method: 'POST',
          credentials: 'include', // SECURITY FIX: Include cookies
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Token refresh failed');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error('Token refresh failed');
      }

      // SECURITY FIX: Tokens are now in HttpOnly cookies, not in response
      // No need to store in localStorage
      console.log('✅ Token refresh successful (tokens in HttpOnly cookies)');
      return 'cookie-based'; // Success indicator

    } catch (error) {
      console.error('❌ Token refresh failed:', error.message);
      
      // Only clear user data on critical errors (invalid token, not network errors)
      if (error.message.includes('Invalid token') ||
          error.message.includes('Token expired') ||
          error.message.includes('Token revoked')) {
        console.warn('⚠️ Clearing user data due to critical refresh error');
        clearAllTokens();
        
        // Lock refresh for a short period to prevent rapid retries
        refreshLock = true;
        setTimeout(() => {
          refreshLock = false;
        }, 5000); // 5 second lock
      }
      
      throw error;
    } finally {
      // Clear the promise so we can retry later
      activeRefreshPromise = null;
    }
  })();

  return activeRefreshPromise;
};

/**
 * Reset refresh lock (for testing or manual reset)
 */
export const resetRefreshLock = () => {
  refreshLock = false;
  activeRefreshPromise = null;
};

/**
 * SECURITY FIX: Get token info from cookies (via API)
 * Since cookies are HttpOnly, we can't read them directly
 * This function checks authentication status via API
 */
export const getBestToken = async () => {
  try {
    // Check authentication status via API (cookies sent automatically)
    const response = await fetch('/api/auth/token-info', {
      method: 'GET',
      credentials: 'include' // SECURITY FIX: Include cookies
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data?.authenticated) {
        return 'cookie-based'; // Token exists in cookie
      }
    }
    return null;
  } catch (error) {
    console.error('Error checking token:', error);
    return null;
  }
};

export default {
  refreshToken,
  resetRefreshLock,
  getBestToken,
  clearAllTokens
};
