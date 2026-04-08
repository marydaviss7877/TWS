/**
 * Auth utilities for API clients.
 * The app uses HttpOnly cookies for token storage, so getToken() returns null
 * and getAuthHeaders() returns an empty object — credentials are sent via
 * cookies automatically when credentials: 'include' is set on fetch/axios.
 */

/**
 * Returns the current access token.
 * With HttpOnly-cookie auth this is always null on the JS side.
 * @returns {string|null}
 */
export const getToken = () => {
  // Tokens live in HttpOnly cookies — not accessible from JS
  return null;
};

/**
 * Returns Authorization headers if a token is available.
 * Falls back to an empty object when using cookie-based auth.
 * @returns {Object}
 */
export const getAuthHeaders = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Authenticated fetch wrapper.
 * Always includes credentials (cookies) so HttpOnly tokens are sent.
 * @param {string} url
 * @param {Object} options
 * @returns {Promise<Response>}
 */
export const authenticatedFetch = (url, options = {}) => {
  return fetch(url, {
    ...options,
    credentials: 'include',
  });
};
