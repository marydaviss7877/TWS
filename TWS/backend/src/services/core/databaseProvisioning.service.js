const mongoose = require('mongoose');
const envConfig = require('../../config/environment');
const logger = require('../../utils/logger');

/**
 * Database Provisioning Service
 * Creates and manages tenant-specific databases
 */
class DatabaseProvisioningService {
  constructor() {
    // Get base URI from environment (remove database name if present)
    const mongoUri = process.env.MONGO_URI || envConfig.get('MONGO_URI') || 'mongodb://localhost:27017';
    // Remove database name from URI if present
    if (mongoUri.includes('/') && !mongoUri.includes('mongodb+srv://')) {
      // For standard MongoDB URIs (mongodb://host:port/dbname)
      this.baseUri = mongoUri.replace(/\/[^/]*$/, '');
    } else if (mongoUri.includes('mongodb+srv://')) {
      // For MongoDB Atlas URIs (mongodb+srv://user:pass@cluster.net/dbname)
      this.baseUri = mongoUri.replace(/\/[^/?]*(\?|$)/, '');
    } else {
      this.baseUri = mongoUri;
    }
  }

  /**
   * Provision a database for a tenant
   * @param {String} tenantId - Tenant ID
   * @param {String} tenantSlug - Tenant slug
   * @param {String} industryType - Industry type (optional)
   * @returns {Object} Database provisioning result
   */
  async provisionTenantDatabase(tenantId, tenantSlug, industryType = 'business') {
    try {
      // Generate unique database name for tenant
      const dbName = `tws_${tenantSlug}`;
      
      // Create connection string for new database
      const connectionString = `${this.baseUri}/${dbName}`;
      
      logger.info(`Provisioning database for tenant ${tenantId}: ${dbName}`);

      // Create new connection to the tenant database
      const connection = await mongoose.createConnection(connectionString, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 10000,
      });

      // Verify connection
      await connection.db.admin().ping();
      logger.info(`Database connection verified for tenant ${tenantId}: ${dbName}`);

      // Initialize tenant collections and indexes
      await this.initializeTenantCollections(connection, industryType);

      // Close the temporary connection (it will be managed by connection pool)
      await connection.close();

      logger.info(`Successfully provisioned database for tenant ${tenantId}: ${dbName}`);
      
      return {
        dbName,
        connectionString,
        status: 'success',
        industryType
      };
    } catch (error) {
      logger.error(`Failed to provision database for tenant ${tenantId}:`, error);
      throw new Error(`Database provisioning failed: ${error.message}`);
    }
  }

  /**
   * Initialize tenant collections and indexes
   * @param {mongoose.Connection} connection - Database connection
   * @param {String} industryType - Industry type
   */
  async initializeTenantCollections(connection, industryType) {
    try {
      // Define base collections every tenant needs
      const baseCollections = [
        'users',
        'organizations',
        'departments',
        'teams',
        'projects',
        'tasks',
        'clients',
        'vendors',
        'transactions',
        'payroll',
        'attendance',
        'meetings',
        'notifications',
        'auditlogs',
        'files'
      ];

      // Industry-specific collections
      const industryCollections = this.getIndustrySpecificCollections(industryType);

      // Create all collections
      const allCollections = [...baseCollections, ...industryCollections];
      
      for (const collectionName of allCollections) {
        try {
          // Create collection if it doesn't exist
          const collection = connection.db.collection(collectionName);
          
          // Create basic indexes
          await collection.createIndex({ createdAt: 1 });
          await collection.createIndex({ updatedAt: 1 });
          
          // Create tenant isolation indexes if collection supports it
          try {
            await collection.createIndex({ tenantId: 1 });
            await collection.createIndex({ orgId: 1 });
          } catch (indexError) {
            // Index might already exist or collection might not have these fields
            // This is okay, continue
          }
        } catch (collectionError) {
          logger.warn(`Error initializing collection ${collectionName}:`, collectionError.message);
          // Continue with other collections
        }
      }

      // Create industry-specific indexes
      await this.createIndustrySpecificIndexes(connection, industryType);

      logger.info(`Initialized collections for industry type: ${industryType}`);
    } catch (error) {
      logger.error('Error initializing tenant collections:', error);
      throw error;
    }
  }

  /**
   * Get industry-specific collections
   * @param {String} industryType - Industry type
   * @returns {Array} Collection names
   */
  getIndustrySpecificCollections(industryType) {
    const collections = {
      'software_house': [
        'sprints',
        'development_metrics',
        'software_house_roles'
      ],
      'business': [] // No additional collections for generic business
    };

    return collections[industryType] || collections['business'];
  }

  /**
   * Create industry-specific indexes
   * @param {mongoose.Connection} connection - Database connection
   * @param {String} industryType - Industry type
   */
  async createIndustrySpecificIndexes(connection, industryType) {
    try {
      switch (industryType) {
        case 'software_house':
          // Software house specific indexes
          try {
            await connection.db.collection('projects').createIndex({ projectCode: 1 }, { unique: true, sparse: true });
            await connection.db.collection('tasks').createIndex({ sprintId: 1 });
            await connection.db.collection('tasks').createIndex({ projectId: 1, sprintId: 1 });
          } catch (error) {
            // Collections might not exist yet, that's okay
          }
          break;

        default:
          // No specific indexes for other industry types
          break;
      }
    } catch (error) {
      logger.warn(`Error creating industry-specific indexes for ${industryType}:`, error.message);
      // Don't throw error, indexes can be created later when collections are used
    }
  }

  /**
   * Remove tenant database
   * @param {String} tenantId - Tenant ID
   * @param {String} dbName - Database name
   */
  async removeTenantDatabase(tenantId, dbName) {
    try {
      // Close connection if it exists in pool
      const tenantConnectionPool = require('../tenant/tenant-connection-pool.service');
      try {
        await tenantConnectionPool.closeTenantConnection(tenantId);
      } catch (poolError) {
        // Connection might not be in pool, that's okay
        logger.warn(`Connection not found in pool for tenant ${tenantId}:`, poolError.message);
      }

      // Connect to the tenant database to drop it
      const connectionString = `${this.baseUri}/${dbName}`;
      const tempConnection = await mongoose.createConnection(connectionString, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
      });

      // Drop the database
      await tempConnection.db.dropDatabase();
      
      // Close the temporary connection
      await tempConnection.close();
      
      logger.info(`Successfully removed database for tenant ${tenantId}: ${dbName}`);
      return { success: true, message: `Database ${dbName} removed successfully` };
    } catch (error) {
      logger.error(`Failed to remove database for tenant ${tenantId}:`, error);
      throw new Error(`Failed to remove database: ${error.message}`);
    }
  }

  /**
   * Verify tenant database exists
   * @param {String} connectionString - Connection string
   * @returns {Boolean} True if database exists and is accessible
   */
  async verifyTenantDatabase(connectionString) {
    try {
      const connection = await mongoose.createConnection(connectionString, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
      });

      await connection.db.admin().ping();
      await connection.close();
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Create singleton instance
const databaseProvisioningService = new DatabaseProvisioningService();

module.exports = databaseProvisioningService;

