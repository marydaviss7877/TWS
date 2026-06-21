const mongoose = require('mongoose');
const config = require('../../config/environment-validator');
const Tenant = require('../../models/tenant/Tenant');
const logger = require('../../utils/logger');

/**
 * Tenant Connection Pool Service
 * Manages database connections for each tenant
 * Provides connection pooling and reuse across requests
 */
class TenantConnectionPool {
  constructor() {
    this.connections = new Map(); // Map<tenantId, connection>
    this.connectionStats = new Map(); // Map<tenantId, stats>
    this.isInitialized = false;
    this.defaultConnection = null; // Default connection for tenant management
  }

  /**
   * Initialize the connection pool
   */
  async initialize() {
    try {
      // Store default connection (for Tenant model and tenant management)
      this.defaultConnection = mongoose.connection;
      this.isInitialized = true;
      logger.info('TenantConnectionPool initialized');
    } catch (error) {
      logger.error('Failed to initialize TenantConnectionPool:', error);
      throw error;
    }
  }

  /**
   * Get or create connection for a tenant
   * @param {String} tenantId - Tenant ID
   * @param {String} tenantSlug - Tenant slug (optional, for lookup)
   * @returns {mongoose.Connection} Tenant database connection
   */
  async getTenantConnection(tenantId, tenantSlug = null) {
    try {
      // Check if connection already exists
      if (this.connections.has(tenantId)) {
        const connection = this.connections.get(tenantId);
        
        // Verify connection is still alive
        if (connection.readyState === 1) {
          this.updateConnectionStats(tenantId, 'reused');
          return connection;
        } else {
          // Connection is dead, remove it
          this.connections.delete(tenantId);
          logger.warn(`Removed dead connection for tenant: ${tenantId}`);
        }
      }

      // Get tenant from database to get connection string
      const tenant = await Tenant.findOne({
        $or: [
          { tenantId: tenantId },
          { slug: tenantSlug || tenantId },
          { _id: tenantId }
        ]
      });

      if (!tenant) {
        throw new Error(`Tenant not found: ${tenantId}`);
      }

      // Check if tenant has database configuration
      if (!tenant.database || !tenant.database.connectionString) {
        throw new Error(`Tenant ${tenantId} does not have database configuration`);
      }

      // Create new connection
      const connection = await this.createTenantConnection(
        tenantId,
        tenant.database.connectionString,
        tenant.database.name
      );

      // Store connection
      this.connections.set(tenantId, connection);
      this.updateConnectionStats(tenantId, 'created');

      logger.info(`Created database connection for tenant: ${tenantId} (${tenant.database.name})`);
      return connection;

    } catch (error) {
      logger.error(`Failed to get connection for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Create a new connection for a tenant
   * @param {String} tenantId - Tenant ID
   * @param {String} connectionString - MongoDB connection string
   * @param {String} dbName - Database name
   * @returns {mongoose.Connection} New connection
   */
  async createTenantConnection(tenantId, connectionString, dbName) {
    try {
      const connectionOptions = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 10000,
        bufferMaxEntries: 0,
        bufferCommands: false,
      };

      const connection = await mongoose.createConnection(connectionString, connectionOptions);

      // Set up connection event listeners
      connection.on('connected', () => {
        logger.info(`Tenant database connected: ${tenantId} (${dbName})`);
        this.updateConnectionStats(tenantId, 'connected');
      });

      connection.on('error', (error) => {
        logger.error(`Tenant database error: ${tenantId}`, error);
        this.updateConnectionStats(tenantId, 'error');
      });

      connection.on('disconnected', () => {
        logger.warn(`Tenant database disconnected: ${tenantId}`);
        this.updateConnectionStats(tenantId, 'disconnected');
      });

      connection.on('reconnected', () => {
        logger.info(`Tenant database reconnected: ${tenantId}`);
        this.updateConnectionStats(tenantId, 'reconnected');
      });

      return connection;

    } catch (error) {
      logger.error(`Failed to create connection for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Close connection for a tenant
   * @param {String} tenantId - Tenant ID
   */
  async closeTenantConnection(tenantId) {
    try {
      if (this.connections.has(tenantId)) {
        const connection = this.connections.get(tenantId);
        await connection.close();
        this.connections.delete(tenantId);
        this.connectionStats.delete(tenantId);
        logger.info(`Closed connection for tenant: ${tenantId}`);
      }
    } catch (error) {
      logger.error(`Failed to close connection for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Close all tenant connections
   */
  async closeAllConnections() {
    try {
      const closePromises = Array.from(this.connections.keys()).map(tenantId =>
        this.closeTenantConnection(tenantId)
      );
      await Promise.all(closePromises);
      logger.info('All tenant connections closed');
    } catch (error) {
      logger.error('Failed to close all connections:', error);
      throw error;
    }
  }

  /**
   * Update connection statistics
   * @param {String} tenantId - Tenant ID
   * @param {String} event - Event type
   */
  updateConnectionStats(tenantId, event) {
    if (!this.connectionStats.has(tenantId)) {
      this.connectionStats.set(tenantId, {
        tenantId,
        created: new Date(),
        lastUsed: new Date(),
        events: [],
        connectionCount: 0
      });
    }

    const stats = this.connectionStats.get(tenantId);
    stats.lastUsed = new Date();
    stats.events.push({ event, timestamp: new Date() });
    
    if (event === 'created') {
      stats.connectionCount++;
    }
  }

  /**
   * Get connection statistics
   * @param {String} tenantId - Tenant ID (optional)
   * @returns {Object} Connection statistics
   */
  getConnectionStats(tenantId = null) {
    if (tenantId) {
      return this.connectionStats.get(tenantId) || null;
    }

    return {
      totalConnections: this.connections.size,
      connections: Array.from(this.connectionStats.values()),
      activeConnections: Array.from(this.connections.values())
        .filter(conn => conn.readyState === 1).length
    };
  }

  /**
   * Check if tenant has an active connection
   * @param {String} tenantId - Tenant ID
   * @returns {Boolean} True if connection exists and is active
   */
  hasActiveConnection(tenantId) {
    if (!this.connections.has(tenantId)) {
      return false;
    }

    const connection = this.connections.get(tenantId);
    return connection.readyState === 1;
  }

  /**
   * Get default connection (for tenant management)
   * @returns {mongoose.Connection} Default connection
   */
  getDefaultConnection() {
    return this.defaultConnection || mongoose.connection;
  }

  /**
   * Health check for all connections
   * @returns {Object} Health status
   */
  async healthCheck() {
    const health = {
      totalConnections: this.connections.size,
      activeConnections: 0,
      inactiveConnections: 0,
      connections: []
    };

    for (const [tenantId, connection] of this.connections.entries()) {
      try {
        await connection.db.admin().ping();
        health.activeConnections++;
        health.connections.push({
          tenantId,
          status: 'healthy',
          readyState: connection.readyState
        });
      } catch (error) {
        health.inactiveConnections++;
        health.connections.push({
          tenantId,
          status: 'unhealthy',
          readyState: connection.readyState,
          error: error.message
        });
      }
    }

    return health;
  }

  /**
   * Cleanup stale connections
   * Removes connections that haven't been used in a while
   * @param {Number} maxIdleTime - Maximum idle time in milliseconds (default: 30 minutes)
   */
  async cleanupStaleConnections(maxIdleTime = 30 * 60 * 1000) {
    const now = Date.now();
    const staleTenants = [];

    for (const [tenantId, stats] of this.connectionStats.entries()) {
      const idleTime = now - stats.lastUsed.getTime();
      if (idleTime > maxIdleTime) {
        staleTenants.push(tenantId);
      }
    }

    for (const tenantId of staleTenants) {
      logger.info(`Cleaning up stale connection for tenant: ${tenantId}`);
      await this.closeTenantConnection(tenantId);
    }

    return staleTenants.length;
  }
}

// Create singleton instance
const tenantConnectionPool = new TenantConnectionPool();

// Initialize on module load
tenantConnectionPool.initialize().catch(error => {
  logger.error('Failed to initialize TenantConnectionPool on module load:', error);
});

module.exports = tenantConnectionPool;

