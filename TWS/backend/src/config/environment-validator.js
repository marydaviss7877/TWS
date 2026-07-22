const crypto = require('crypto');

/**
 * Environment Configuration and Validation
 * Ensures all required environment variables are present and secure
 */

class EnvironmentConfig {
  constructor() {
    this.requiredVars = [
      'MONGO_URI',
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'ENCRYPTION_MASTER_KEY'
    ];

    this.optionalVars = {
      'NODE_ENV': 'development',
      'PORT': '5000',
      'REDIS_HOST': 'localhost',
      'REDIS_PORT': '6379',
      'REDIS_PASSWORD': '',
      'AWS_ACCESS_KEY_ID': '',
      'AWS_SECRET_ACCESS_KEY': '',
      'S3_BUCKET_NAME': '',
      'AWS_REGION': 'us-east-1',
      'FIREBASE_PROJECT_ID': '',
      'FIREBASE_PRIVATE_KEY': '',
      'FIREBASE_CLIENT_EMAIL': '',
      'SENDGRID_API_KEY': '',
      'BASE_URL': 'http://localhost:4000',
      'SOCKET_CORS_ORIGIN': 'http://localhost:4000',
      'RATE_LIMIT_WINDOW_MS': '900000',
      'RATE_LIMIT_MAX_REQUESTS': '100',
      'LOG_LEVEL': 'info',
      'ENCRYPTION_ENABLED': 'true',
      'AUDIT_LOGGING_ENABLED': 'true',
      'RBAC_ENABLED': 'true',
      'COMPLIANCE_MODE': 'disabled',
      'GDPR_COMPLIANCE': 'false',
      'SOX_COMPLIANCE': 'false',
      'BACKUP_ENABLED': 'false',
      'MONITORING_ENABLED': 'true',
      'METRICS_ENABLED': 'true'
    };

    this.config = {};
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Validate and load environment configuration
   */
  validate() {
    this.errors = [];
    this.warnings = [];

    // Check required variables
    for (const varName of this.requiredVars) {
      if (!process.env[varName]) {
        if (process.env.NODE_ENV === 'production') {
          this.errors.push(`Required environment variable ${varName} is not set`);
        } else {
          // Generate secure defaults for development
          this.generateSecureDefault(varName);
        }
      }
    }


    // Validate JWT secrets
    this.validateJWTSecrets();

    // Validate encryption keys
    this.validateEncryptionKeys();

    // Validate database connection
    this.validateDatabaseConfig();

    // Validate Redis configuration
    this.validateRedisConfig();

    // Validate AWS configuration
    this.validateAWSConfig();

    // Load optional variables with defaults
    this.loadOptionalVars();

    // Check for security issues
    this.checkSecurityIssues();

    if (this.errors.length > 0) {
      throw new Error(`Environment validation failed:\n${this.errors.join('\n')}`);
    }

    if (this.warnings.length > 0) {
      console.warn('Environment warnings:\n', this.warnings.join('\n'));
    }

    return this.config;
  }

  /**
   * Generate secure default values for development
   */
  generateSecureDefault(varName) {
    switch (varName) {
      case 'JWT_SECRET':
        process.env.JWT_SECRET = crypto.randomBytes(64).toString('hex');
        this.warnings.push(`Generated secure JWT_SECRET for development`);
        break;
      case 'JWT_REFRESH_SECRET':
        process.env.JWT_REFRESH_SECRET = crypto.randomBytes(64).toString('hex');
        this.warnings.push(`Generated secure JWT_REFRESH_SECRET for development`);
        break;
      case 'ENCRYPTION_MASTER_KEY':
        process.env.ENCRYPTION_MASTER_KEY = crypto.randomBytes(32).toString('hex');
        this.warnings.push(`Generated secure ENCRYPTION_MASTER_KEY for development`);
        break;
      case 'MONGO_URI':
        process.env.MONGO_URI = 'mongodb://localhost:27017/tws-dev';
        this.warnings.push(`Using default MongoDB URI for development`);
        break;
    }
  }

  /**
   * Validate JWT secrets
   */
  validateJWTSecrets() {
    const jwtSecret = process.env.JWT_SECRET;
    const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;

    if (jwtSecret) {
      if (jwtSecret.length < 32) {
        this.errors.push('JWT_SECRET must be at least 32 characters long');
      }
      if (jwtSecret === 'your-super-secret-jwt-key-change-this-in-production') {
        this.errors.push('JWT_SECRET is using the default insecure value');
      }
    }

    if (jwtRefreshSecret) {
      if (jwtRefreshSecret.length < 32) {
        this.errors.push('JWT_REFRESH_SECRET must be at least 32 characters long');
      }
      if (jwtRefreshSecret === 'your-super-secret-refresh-key-change-this-in-production') {
        this.errors.push('JWT_REFRESH_SECRET is using the default insecure value');
      }
    }

    if (jwtSecret && jwtRefreshSecret && jwtSecret === jwtRefreshSecret) {
      this.errors.push('JWT_SECRET and JWT_REFRESH_SECRET must be different');
    }
  }

  /**
   * Validate encryption keys
   */
  validateEncryptionKeys() {
    const encryptionKey = process.env.ENCRYPTION_MASTER_KEY;

    if (encryptionKey) {
      if (encryptionKey.length < 32) {
        this.errors.push('ENCRYPTION_MASTER_KEY must be at least 32 characters long');
      }
      if (encryptionKey === 'dev-master-key-change-in-production-32-chars') {
        this.errors.push('ENCRYPTION_MASTER_KEY is using the default insecure value');
      }
    }
  }

  /**
   * Validate database configuration
   */
  validateDatabaseConfig() {
    const mongoUri = process.env.MONGO_URI;

    if (mongoUri) {
      if (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
        this.errors.push('MONGO_URI must be a valid MongoDB connection string');
      }
      
    }
  }

  /**
   * Validate Redis configuration
   */
  validateRedisConfig() {
    const redisHost = process.env.REDIS_HOST;
    const redisPort = process.env.REDIS_PORT;

    if (redisPort && isNaN(parseInt(redisPort))) {
      this.errors.push('REDIS_PORT must be a valid number');
    }
  }

  /**
   * Validate AWS configuration
   */
  validateAWSConfig() {
    const awsKey = process.env.AWS_ACCESS_KEY_ID;
    const awsSecret = process.env.AWS_SECRET_ACCESS_KEY;
    const s3Bucket = process.env.S3_BUCKET_NAME;

    if (awsKey && !awsSecret) {
      this.warnings.push('AWS_ACCESS_KEY_ID is set but AWS_SECRET_ACCESS_KEY is missing');
    }

    if (awsSecret && !awsKey) {
      this.warnings.push('AWS_SECRET_ACCESS_KEY is set but AWS_ACCESS_KEY_ID is missing');
    }

    if (s3Bucket && (!awsKey || !awsSecret)) {
      this.warnings.push('S3_BUCKET_NAME is set but AWS credentials are missing');
    }
  }

  /**
   * Load optional variables with defaults
   */
  loadOptionalVars() {
    for (const [varName, defaultValue] of Object.entries(this.optionalVars)) {
      this.config[varName] = process.env[varName] || defaultValue;
    }
  }

  /**
   * Check for security issues
   */
  checkSecurityIssues() {
    // Check for development settings in production
    if (process.env.NODE_ENV === 'production') {
      if (process.env.LOG_LEVEL === 'debug') {
        this.warnings.push('LOG_LEVEL is set to debug in production');
      }
      
      if (process.env.BASE_URL?.includes('localhost')) {
        this.warnings.push('BASE_URL contains localhost in production');
      }
    }

    // Check for weak passwords
    const redisPassword = process.env.REDIS_PASSWORD;
    if (redisPassword && redisPassword.length < 8) {
      this.warnings.push('REDIS_PASSWORD is too short (minimum 8 characters)');
    }
  }

  /**
   * Get configuration value
   */
  get(key) {
    return this.config[key];
  }

  /**
   * Get all configuration
   */
  getAll() {
    return { ...this.config };
  }

  /**
   * Check if running in production
   */
  isProduction() {
    return this.config.NODE_ENV === 'production';
  }

  /**
   * Check if running in development
   */
  isDevelopment() {
    return this.config.NODE_ENV === 'development';
  }

  /**
   * Get database configuration
   */
  getDatabaseConfig() {
    return {
      uri: process.env.MONGO_URI,
      options: {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferMaxEntries: 0,
        bufferCommands: false
      }
    };
  }

  /**
   * Get Redis configuration
   */
  getRedisConfig() {
    return {
      host: this.config.REDIS_HOST,
      port: parseInt(this.config.REDIS_PORT),
      password: this.config.REDIS_PASSWORD || undefined,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: null,
      lazyConnect: true,
      keepAlive: 30000,
      connectTimeout: 10000,
      commandTimeout: 5000,
      retryDelayOnClusterDown: 300,
      enableOfflineQueue: false,
      maxLoadingTimeout: 5000
    };
  }

  /**
   * Get JWT configuration
   */
  getJWTConfig() {
    return {
      secret: process.env.JWT_SECRET,
      refreshSecret: process.env.JWT_REFRESH_SECRET,
      expiresIn: process.env.JWT_EXPIRE || '15m',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRE || '7d'
    };
  }

  /**
   * Get encryption configuration
   */
  getEncryptionConfig() {
    return {
      enabled: this.config.ENCRYPTION_ENABLED === 'true',
      masterKey: process.env.ENCRYPTION_MASTER_KEY,
      algorithm: 'aes-256-gcm',
      keyLength: 32,
      ivLength: 16,
      tagLength: 16
    };
  }
}

// Create singleton instance
const envConfig = new EnvironmentConfig();

// Validate on import (skip in test mode to allow test setup)
if (process.env.NODE_ENV !== 'test') {
  try {
    envConfig.validate();
  } catch (error) {
    console.error('❌ Environment validation failed:', error.message);
    process.exit(1);
  }
}

module.exports = envConfig;
