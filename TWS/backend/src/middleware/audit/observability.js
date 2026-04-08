const { loggerService } = require('../../services/core/logger.service');
const { logRequest, logError, logUserActivity, logSecurityEvent, logDatabaseQuery, logMessageOperation, logPerformanceMetric } = require('../../config/logging');
const metricsService = require('../../services/analytics/metrics.service');
const sentryService = require('../../services/sentryService');

/**
 * Request logging middleware
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  const requestId = loggerService.generateRequestId();
  
  // Set request context
  loggerService.setContext(requestId, req.user?._id, req.params?.chatId);
  sentryService.setRequestContext(req);
  
  // Add request ID to response headers
  res.set('X-Request-ID', requestId);
  
  // Log request
  loggerService.info('Request started', {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
  
  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const responseTime = Date.now() - startTime;
    
    // Log response
    logRequest(req, res, responseTime);
    
    // Record metrics
    metricsService.incrementApiRequests(req.method, req.route?.path || req.url, res.statusCode);
    metricsService.recordResponseTime(req.method, req.route?.path || req.url, responseTime / 1000);
    
    // Clear context
    loggerService.clearContext();
    sentryService.clearContext();
    
    // Call original end
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

/**
 * Error tracking middleware
 */
const errorTracker = (error, req, res, next) => {
  // Set context for error tracking
  sentryService.setRequestContext(req);
  
  if (req.user) {
    sentryService.setUserContext(req.user._id, {
      email: req.user.email,
      role: req.user.role
    });
  }
  
  if (req.params?.chatId) {
    sentryService.setChatContext(req.params.chatId);
  }
  
  // Add breadcrumb
  sentryService.addBreadcrumb(
    `Error in ${req.method} ${req.url}`,
    'error',
    'error',
    {
      statusCode: res.statusCode,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    }
  );
  
  // Capture error in Sentry
  sentryService.captureException(error, {
    request: {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body
    },
    user: req.user ? {
      id: req.user._id,
      email: req.user.email,
      role: req.user.role
    } : null
  });
  
  // Log error
  logError(error, {
    method: req.method,
    url: req.url,
    userId: req.user?._id,
    chatId: req.params?.chatId
  });
  
  // Record error metric
  metricsService.incrementErrorCount('api_error', 'error');
  
  next(error);
};

/**
 * Database query logging middleware
 */
const databaseLogger = (operation, collection, duration, query = null) => {
  logDatabaseQuery(operation, collection, duration, query);
  metricsService.recordMessageProcessingTime(`db_${operation}`, duration / 1000);
};

/**
 * Message operation logging middleware
 */
const messageLogger = (operation, messageId, userId, chatId, details = {}) => {
  logMessageOperation(operation, messageId, userId, chatId, details);
  
  // Add Sentry breadcrumb
  sentryService.addBreadcrumb(
    `Message ${operation}`,
    'message',
    'info',
    {
      messageId,
      userId,
      chatId,
      ...details
    }
  );
};

/**
 * User activity logging middleware
 */
const userActivityLogger = (activity, userId, details = {}) => {
  logUserActivity(activity, userId, details);
  
  // Add Sentry breadcrumb
  sentryService.addBreadcrumb(
    `User activity: ${activity}`,
    'user',
    'info',
    {
      userId,
      ...details
    }
  );
};

/**
 * Security event logging middleware
 */
const securityLogger = (event, userId, details = {}) => {
  logSecurityEvent(event, userId, details);
  
  // Add Sentry breadcrumb with higher severity
  sentryService.addBreadcrumb(
    `Security event: ${event}`,
    'security',
    'warning',
    {
      userId,
      ...details
    }
  );
  
  // Capture as message in Sentry
  sentryService.captureMessage(`Security event: ${event}`, 'warning', {
    userId,
    event,
    ...details
  });
};

/**
 * Performance monitoring middleware
 */
const performanceMonitor = (operation) => {
  const startTime = Date.now();
  
  return {
    end: (details = {}) => {
      const duration = Date.now() - startTime;
      logPerformanceMetric(operation, duration, details);
      metricsService.recordMessageProcessingTime(operation, duration / 1000);
    }
  };
};

/**
 * Socket connection tracking middleware
 */
const socketTracker = (io) => {
  let activeConnections = 0;
  
  io.on('connection', (socket) => {
    activeConnections++;
    metricsService.setActiveSockets(activeConnections);
    
    loggerService.info('Socket connected', {
      socketId: socket.id,
      activeConnections
    });
    
    // Set Sentry context for socket
    sentryService.setContext('socket', {
      socketId: socket.id,
      activeConnections
    });
    
    socket.on('disconnect', () => {
      activeConnections--;
      metricsService.setActiveSockets(activeConnections);
      
      loggerService.info('Socket disconnected', {
        socketId: socket.id,
        activeConnections
      });
    });
    
    // Track socket errors
    socket.on('error', (error) => {
      sentryService.setContext('socket', {
        socketId: socket.id,
        activeConnections
      });
      
      sentryService.captureException(error, {
        socket: {
          id: socket.id,
          activeConnections
        }
      });
      
      loggerService.error('Socket error', error, {
        socketId: socket.id
      });
      
      metricsService.incrementErrorCount('socket_error', 'error');
    });
  });
  
  return {
    getActiveConnections: () => activeConnections
  };
};

/**
 * Queue monitoring middleware
 */
const queueMonitor = (queueName, queue) => {
  // Monitor queue events
  queue.on('waiting', (job) => {
    loggerService.info('Job waiting in queue', {
      queueName,
      jobId: job.id,
      jobName: job.name
    });
  });
  
  queue.on('active', (job) => {
    loggerService.info('Job started processing', {
      queueName,
      jobId: job.id,
      jobName: job.name
    });
  });
  
  queue.on('completed', (job, result) => {
    loggerService.info('Job completed', {
      queueName,
      jobId: job.id,
      jobName: job.name,
      duration: Date.now() - job.processedOn
    });
  });
  
  queue.on('failed', (job, error) => {
    sentryService.captureException(error, {
      queue: {
        name: queueName,
        jobId: job.id,
        jobName: job.name
      }
    });
    
    loggerService.error('Job failed', error, {
      queueName,
      jobId: job.id,
      jobName: job.name
    });
    
    metricsService.incrementErrorCount('queue_job_failed', 'error');
  });
  
  // Update queue length metrics periodically
  setInterval(async () => {
    try {
      const waiting = await queue.getWaiting();
      const active = await queue.getActive();
      const completed = await queue.getCompleted();
      const failed = await queue.getFailed();
      
      metricsService.setUploadQueueLength(waiting.length, 'waiting');
      metricsService.setUploadQueueLength(active.length, 'active');
      metricsService.setUploadQueueLength(completed.length, 'completed');
      metricsService.setUploadQueueLength(failed.length, 'failed');
      
    } catch (error) {
      loggerService.error('Error updating queue metrics', error, {
        queueName
      });
    }
  }, 30000); // Update every 30 seconds
};

/**
 * Health check middleware
 */
const healthCheck = async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.APP_VERSION || '1.0.0'
    };
    
    // Check database connection
    const mongoose = require('mongoose');
    health.database = {
      connected: mongoose.connection.readyState === 1,
      state: mongoose.connection.readyState
    };
    
    // Redis replaced with in-memory store
    health.redis = { connected: false, disabled: true };
    
    // Check Sentry
    health.sentry = {
      initialized: sentryService.isHealthy()
    };
    
    res.json(health);
    
  } catch (error) {
    loggerService.error('Health check failed', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date()
    });
  }
};

module.exports = {
  requestLogger,
  errorTracker,
  databaseLogger,
  messageLogger,
  userActivityLogger,
  securityLogger,
  performanceMonitor,
  socketTracker,
  queueMonitor,
  healthCheck
};
