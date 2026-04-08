/**
 * Secure Logging Service
 * Replaces console.log with secure, production-safe logging
 */

const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug'
};

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Sanitize error object to remove sensitive information
 * @param {Error|Object} error - Error object to sanitize
 * @returns {Object} Sanitized error object
 */
const sanitizeError = (error) => {
  if (!error) return null;

  const sanitized = {
    message: error.message || 'Unknown error',
    name: error.name || 'Error',
  };

  // Only include stack trace in development
  if (isDevelopment && error.stack) {
    sanitized.stack = error.stack;
  }

  // Remove sensitive fields
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization', 'cookie'];
  if (error.response?.data) {
    sanitized.response = {};
    Object.keys(error.response.data).forEach(key => {
      if (!sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        sanitized.response[key] = error.response.data[key];
      } else {
        sanitized.response[key] = '[REDACTED]';
      }
    });
  }

  return sanitized;
};

/**
 * Log error message
 * @param {string} message - Error message
 * @param {Error|Object} error - Error object (optional)
 * @param {Object} context - Additional context (optional)
 */
export const logError = (message, error = null, context = {}) => {
  const sanitizedError = error ? sanitizeError(error) : null;
  const _logPayload = {
    level: LOG_LEVELS.ERROR,
    message,
    error: sanitizedError,
    context,
    timestamp: new Date().toISOString(),
  };

  // In development, use console.error
  if (isDevelopment) {
    console.error(`[ERROR] ${message}`, sanitizedError || '', context);
  }

  // In production, send to logging service
  if (isProduction) {
    // TODO: Send to logging service (e.g., Sentry, LogRocket, etc.)
    // fetch('/api/logs', { method: 'POST', body: JSON.stringify(logData) });
  }
};

/**
 * Log warning message
 * @param {string} message - Warning message
 * @param {Object} context - Additional context (optional)
 */
export const logWarn = (message, context = {}) => {
  const _logPayload = {
    level: LOG_LEVELS.WARN,
    message,
    context,
    timestamp: new Date().toISOString(),
  };

  if (isDevelopment) {
    console.warn(`[WARN] ${message}`, context);
  }

  if (isProduction) {
    // TODO: Send to logging service
  }
};

/**
 * Log info message
 * @param {string} message - Info message
 * @param {Object} context - Additional context (optional)
 */
export const logInfo = (message, context = {}) => {
  const logData = {
    level: LOG_LEVELS.INFO,
    message,
    context,
    timestamp: new Date().toISOString(),
  };

  if (isDevelopment) {
    console.log(`[INFO] ${message}`, context);
  }

  if (isProduction) {
    // Only log important info in production
    // TODO: Send to logging service for important messages
  }
};

/**
 * Log debug message (only in development)
 * @param {string} message - Debug message
 * @param {Object} context - Additional context (optional)
 */
export const logDebug = (message, context = {}) => {
  if (isDevelopment) {
    console.debug(`[DEBUG] ${message}`, context);
  }
  // Never log debug in production
};

/**
 * Create a logger instance with context
 * @param {string} component - Component name
 * @returns {Object} Logger instance with methods
 */
export const createLogger = (component) => {
  return {
    error: (message, error, context) => logError(`[${component}] ${message}`, error, context),
    warn: (message, context) => logWarn(`[${component}] ${message}`, context),
    info: (message, context) => logInfo(`[${component}] ${message}`, context),
    debug: (message, context) => logDebug(`[${component}] ${message}`, context),
  };
};
