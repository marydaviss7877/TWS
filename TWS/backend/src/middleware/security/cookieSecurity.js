/**
 * Cookie Security Middleware
 * SECURITY FIX: Enforces secure cookie settings for production
 * Ensures cookies are only sent over HTTPS and protected from XSS/CSRF
 */

/**
 * Secure cookie options for production
 */
const getSecureCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isHTTPS = process.env.FORCE_HTTPS === 'true' || process.env.HTTPS_ENABLED === 'true';
  
  return {
    httpOnly: true, // Prevent JavaScript access (XSS protection)
    secure: isProduction || isHTTPS, // Only send over HTTPS in production
    // 'none' required for cross-origin requests (frontend/backend on different Railway subdomains).
    // 'strict' blocks all cross-origin cookies even on HTTPS.
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 15 * 60 * 1000, // 15 minutes for access tokens
    path: '/',
  };
};

/**
 * Secure refresh token cookie options
 */
const getRefreshTokenCookieOptions = () => {
  const baseOptions = getSecureCookieOptions();
  return {
    ...baseOptions,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days for refresh tokens
  };
};

/**
 * Middleware to enforce HTTPS for cookies in production
 * SECURITY FIX: Prevents cookies from being sent over HTTP
 */
const enforceHTTPS = (req, res, next) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isHTTPS = req.secure || 
                  req.headers['x-forwarded-proto'] === 'https' ||
                  process.env.FORCE_HTTPS === 'true';
  
  if (isProduction && !isHTTPS) {
    // In production, reject HTTP requests
    return res.status(403).json({
      success: false,
      message: 'HTTPS required in production',
      code: 'HTTPS_REQUIRED'
    });
  }
  
  next();
};

/**
 * Helper to set secure cookie
 */
const setSecureCookie = (res, name, value, options = {}) => {
  const cookieOptions = {
    ...getSecureCookieOptions(),
    ...options
  };
  
  res.cookie(name, value, cookieOptions);
};

/**
 * Helper to set secure refresh token cookie
 */
const setRefreshTokenCookie = (res, name, value, options = {}) => {
  const cookieOptions = {
    ...getRefreshTokenCookieOptions(),
    ...options
  };
  
  res.cookie(name, value, cookieOptions);
};

/**
 * Helper to clear secure cookie
 */
const clearSecureCookie = (res, name) => {
  const isProduction = process.env.NODE_ENV === 'production';
  res.clearCookie(name, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/'
  });
};

module.exports = {
  getSecureCookieOptions,
  getRefreshTokenCookieOptions,
  enforceHTTPS,
  setSecureCookie,
  setRefreshTokenCookie,
  clearSecureCookie
};

