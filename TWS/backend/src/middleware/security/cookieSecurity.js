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
  // Strip protocol and trailing slash so we get a bare hostname (e.g. tws.up.railway.app)
  const rawDomain = process.env.BASE_DOMAIN || 'tws.enterprises';
  const baseDomain = rawDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');

  // Only set a domain cookie when the host has real subdomains (not on *.railway.app).
  // On Railway the app lives at the root of a single hostname with no tenant subdomains,
  // so setting domain=.tws.up.railway.app is harmless but setting an invalid domain
  // (e.g. the full URL) would cause the cookie serializer to throw a 500.
  const usesDomainCookie = isProduction && !baseDomain.endsWith('.railway.app');

  return {
    httpOnly: true,
    secure: isProduction || isHTTPS,
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000,
    path: '/',
    ...(usesDomainCookie && { domain: `.${baseDomain}` }),
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
  const rawDomain = process.env.BASE_DOMAIN || 'tws.up.railway.app';
  const baseDomain = rawDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const usesDomainCookie = isProduction && !baseDomain.endsWith('.railway.app');
  res.clearCookie(name, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    ...(usesDomainCookie && { domain: `.${baseDomain}` }),
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

