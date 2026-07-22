/**
 * Secure Logging Service for Backend
 * Sanitizes error output, then delegates to the real Winston logger
 * (src/services/core/logger.service.js) and Sentry (src/services/sentryService.js).
 */

const Sentry = require('@sentry/node');
const { loggerService } = require('../services/core/logger.service');

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Sanitize error object to remove sensitive information
 */
const sanitizeError = (error) => {
  if (!error) return null;

  const sanitized = {
    message: error.message || 'Unknown error',
    name: error.name || 'Error',
    code: error.code,
  };

  // Only include stack trace in development
  if (isDevelopment && error.stack) {
    sanitized.stack = error.stack;
  }

  // Remove sensitive fields from response
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization', 'cookie', 'apiKey'];
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
 */
const logError = (message, error = null, context = {}) => {
  const sanitizedError = error ? sanitizeError(error) : null;

  if (isDevelopment) {
    console.error(`[ERROR] ${message}`, sanitizedError || '', context);
  }

  loggerService.error(message, error, context);

  if (error instanceof Error) {
    Sentry.captureException(error, { extra: { message, ...context } });
  }
};

/**
 * Log warning message
 */
const logWarn = (message, context = {}) => {
  if (isDevelopment) {
    console.warn(`[WARN] ${message}`, context);
  }

  loggerService.warn(message, context);
};

/**
 * Log info message
 */
const logInfo = (message, context = {}) => {
  if (isDevelopment) {
    console.log(`[INFO] ${message}`, context);
  }

  loggerService.info(message, context);
};

/**
 * Log debug message
 */
const logDebug = (message, context = {}) => {
  if (isDevelopment) {
    console.debug(`[DEBUG] ${message}`, context);
  }
  loggerService.debug(message, context);
};

module.exports = {
  error: logError,
  warn: logWarn,
  info: logInfo,
  debug: logDebug,
};
