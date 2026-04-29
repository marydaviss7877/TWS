const client = require('prom-client');
// Chat and Message models removed
const User = require('../../models/users-auth/User');
const mongoose = require('mongoose');

/**
 * Prometheus Metrics Service
 * Provides comprehensive metrics for monitoring the messaging system
 */
class MetricsService {
  constructor() {
    // Create a Registry to register the metrics
    this.register = new client.Registry();
    
    // Add default metrics (CPU, memory, etc.)
    client.collectDefaultMetrics({ register: this.register });
    
    // Initialize custom metrics
    this.initializeCustomMetrics();
    
    // Start periodic metric updates
    this.startPeriodicUpdates();
  }

  initializeCustomMetrics() {
    // Active sockets metric
    this.activeSockets = new client.Gauge({
      name: 'active_sockets',
      help: 'Number of active WebSocket connections',
      labelNames: ['namespace'],
      registers: [this.register]
    });

    // Messages per minute metric removed - messaging system removed

    // Upload queue length metric
    this.uploadQueueLength = new client.Gauge({
      name: 'upload_queue_length',
      help: 'Number of files in upload queue',
      labelNames: ['status'],
      registers: [this.register]
    });

    // Error count metric
    this.errorCount = new client.Counter({
      name: 'error_count_total',
      help: 'Total number of errors',
      labelNames: ['error_type', 'severity'],
      registers: [this.register]
    });

    // Database connection metric
    this.dbConnections = new client.Gauge({
      name: 'database_connections',
      help: 'Number of active database connections',
      registers: [this.register]
    });

    // Message processing time histogram removed - messaging system removed

    // User activity metric
    this.activeUsers = new client.Gauge({
      name: 'active_users',
      help: 'Number of active users',
      labelNames: ['timeframe'],
      registers: [this.register]
    });

    // Chat activity metric removed - messaging system removed

    // File upload metrics
    this.fileUploads = new client.Counter({
      name: 'file_uploads_total',
      help: 'Total number of file uploads',
      labelNames: ['file_type', 'status'],
      registers: [this.register]
    });

    // API request metrics
    this.apiRequests = new client.Counter({
      name: 'api_requests_total',
      help: 'Total number of API requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.register]
    });

    // Deprecated attendance compatibility endpoint usage
    this.deprecatedAttendanceRequests = new client.Counter({
      name: 'deprecated_attendance_requests_total',
      help: 'Total requests to deprecated attendance compatibility endpoints',
      labelNames: ['endpoint', 'method'],
      registers: [this.register]
    });

    // Response time histogram
    this.responseTime = new client.Histogram({
      name: 'api_response_time_seconds',
      help: 'API response time in seconds',
      labelNames: ['method', 'route'],
      buckets: [0.1, 0.5, 1, 2, 5, 10],
      registers: [this.register]
    });

    // Memory usage metric
    this.memoryUsage = new client.Gauge({
      name: 'memory_usage_bytes',
      help: 'Memory usage in bytes',
      labelNames: ['type'],
      registers: [this.register]
    });

    // Redis connection metric
    this.redisConnections = new client.Gauge({
      name: 'redis_connections',
      help: 'Number of Redis connections',
      registers: [this.register]
    });
  }

  startPeriodicUpdates() {
    // Update metrics every 30 seconds
    setInterval(() => {
      this.updateDatabaseMetrics();
      this.updateSystemMetrics();
    }, 30000);

    // Update user activity metrics every 5 minutes
    setInterval(() => {
      this.updateUserActivityMetrics();
    }, 300000);
  }

  async updateDatabaseMetrics() {
    try {
      // Messaging features have been removed - chat metrics disabled
      // const activeChats = await Chat.countDocuments({ 
      //   lastActivity: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } 
      // });

      // Update database connections - only if MongoDB is connected
      if (mongoose.connection.readyState === 1) {
        const dbStats = await mongoose.connection.db.stats();
        this.dbConnections.set(dbStats.connections?.current || 0);
      } else {
        // MongoDB not connected, set to 0
        this.dbConnections.set(0);
      }

    } catch (error) {
      // Only log if it's not a connection error to avoid spam
      if (error.name !== 'MongoServerSelectionError' && !error.message.includes('getaddrinfo ENOTFOUND')) {
        console.error('Error updating database metrics:', error.message);
      }
      this.incrementErrorCount('database_metrics', 'error');
    }
  }

  async updateUserActivityMetrics() {
    try {
      // Active users in last 24 hours
      const activeUsers24h = await User.countDocuments({
        lastActive: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      });
      this.activeUsers.set({ timeframe: '24h' }, activeUsers24h);

      // Active users in last hour
      const activeUsers1h = await User.countDocuments({
        lastActive: { $gte: new Date(Date.now() - 60 * 60 * 1000) }
      });
      this.activeUsers.set({ timeframe: '1h' }, activeUsers1h);

    } catch (error) {
      // Only log if it's not a connection error to avoid spam
      if (error.name !== 'MongoServerSelectionError' && !error.message.includes('getaddrinfo ENOTFOUND')) {
        console.error('Error updating user activity metrics:', error.message);
      }
      this.incrementErrorCount('user_metrics', 'error');
    }
  }

  updateSystemMetrics() {
    try {
      // Update memory usage
      const memUsage = process.memoryUsage();
      this.memoryUsage.set({ type: 'rss' }, memUsage.rss);
      this.memoryUsage.set({ type: 'heapTotal' }, memUsage.heapTotal);
      this.memoryUsage.set({ type: 'heapUsed' }, memUsage.heapUsed);
      this.memoryUsage.set({ type: 'external' }, memUsage.external);

    } catch (error) {
      console.error('Error updating system metrics:', error);
      this.incrementErrorCount('system_metrics', 'error');
    }
  }

  // Metric update methods
  setActiveSockets(count, namespace = 'default') {
    this.activeSockets.set({ namespace }, count);
  }

  // incrementMessagesPerMinute removed - messaging system removed

  setUploadQueueLength(count, status = 'pending') {
    this.uploadQueueLength.set({ status }, count);
  }

  incrementErrorCount(errorType, severity = 'error') {
    this.errorCount.inc({ error_type: errorType, severity });
  }

  // recordMessageProcessingTime removed - messaging system removed

  incrementFileUploads(fileType, status) {
    this.fileUploads.inc({ file_type: fileType, status });
  }

  incrementApiRequests(method, route, statusCode) {
    this.apiRequests.inc({ method, route, status_code: statusCode });
  }

  recordResponseTime(method, route, duration) {
    this.responseTime.observe({ method, route }, duration);
  }

  recordHttpRequest(method, route, statusCode, duration) {
    this.apiRequests.inc({ method, route, status_code: statusCode });
    this.responseTime.observe({ method, route }, duration);
  }

  incrementDeprecatedAttendanceRequests(endpoint, method = 'POST') {
    this.deprecatedAttendanceRequests.inc({ endpoint, method });
  }

  setRedisConnections(count) {
    this.redisConnections.set(count);
  }

  // Get metrics in Prometheus format
  async getMetrics() {
    return this.register.metrics();
  }

  // Get metrics as JSON
  async getMetricsAsJSON() {
    const metrics = await this.register.getMetricsAsJSON();
    return metrics;
  }

  // Get specific metric values
  async getMetricValue(metricName) {
    const metrics = await this.register.getMetricsAsJSON();
    const metric = metrics.find(m => m.name === metricName);
    return metric ? metric.values : null;
  }

  // Health check metrics
  async getHealthMetrics() {
    try {
      const dbConnected = mongoose.connection.readyState === 1;
      const activeUsers = await this.getMetricValue('active_users');
      const errorCount = await this.getMetricValue('error_count_total');

      return {
        database: {
          connected: dbConnected,
          connections: mongoose.connection.readyState
        },
        users: {
          active_24h: activeUsers?.find(v => v.labels?.timeframe === '24h')?.value || 0,
          active_1h: activeUsers?.find(v => v.labels?.timeframe === '1h')?.value || 0
        },
        // chats removed - messaging system removed
        errors: {
          total: errorCount?.reduce((sum, v) => sum + v.value, 0) || 0
        },
        memory: {
          rss: process.memoryUsage().rss,
          heapUsed: process.memoryUsage().heapUsed,
          heapTotal: process.memoryUsage().heapTotal
        },
        uptime: process.uptime()
      };
    } catch (error) {
      console.error('Error getting health metrics:', error);
      return null;
    }
  }

  // Reset metrics (useful for testing)
  resetMetrics() {
    this.register.clear();
    this.initializeCustomMetrics();
  }
}

// Create singleton instance
const metricsService = new MetricsService();

module.exports = metricsService;