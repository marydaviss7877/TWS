// TLS Verification Middleware
// This middleware ensures TLS/HTTPS is used in production environments

/**
 * Middleware to verify TLS/HTTPS is being used
 * In development, this is a no-op
 * In production, it enforces HTTPS
 */
function verifyTLS(req, res, next) {
  // Skip TLS verification in development
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }

  // Allow Railway's internal healthcheck through without TLS enforcement
  if (req.path === '/health') {
    return next();
  }

  // In production, check if request is over HTTPS
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    return next();
  }

  // If not secure, redirect to HTTPS or return error
  if (req.method === 'GET' || req.method === 'HEAD') {
    const httpsUrl = `https://${req.headers.host}${req.url}`;
    return res.redirect(301, httpsUrl);
  }

  // For non-GET requests, return error
  return res.status(403).json({
    success: false,
    message: 'HTTPS is required for this operation',
    error: 'TLS_REQUIRED'
  });
}

/**
 * Check TLS configuration on startup
 * Logs warnings if TLS is not properly configured in production
 */
function checkTLSConfiguration() {
  if (process.env.NODE_ENV === 'production') {
    console.log('🔒 TLS Verification: Enabled for production');
    console.log('⚠️  Ensure your reverse proxy (nginx/Apache) is configured with SSL/TLS');
    console.log('⚠️  Ensure X-Forwarded-Proto header is set correctly');
  } else {
    console.log('🔓 TLS Verification: Disabled in development');
  }
}

module.exports = {
  verifyTLS,
  checkTLSConfiguration
};
