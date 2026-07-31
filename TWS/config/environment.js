// External Configuration System for TWS
// This file manages all external configurations

const path = require('path');
const fs = require('fs');

class TWSConfig {
  constructor() {
    this.config = {};
    this.loadConfigurations();
  }

  loadConfigurations() {
    // Load from environment variables
    this.loadEnvironmentConfig();
    
    // Load from config files
    this.loadFileConfigs();
    
    // Load from external services
    this.loadExternalConfigs();
    
    // Validate configurations
    this.validateConfig();
  }

  loadEnvironmentConfig() {
    this.config = {
      // Server Configuration
      PORT: process.env.PORT || 5000,
      NODE_ENV: process.env.NODE_ENV || 'development',
      
      // Database Configuration
      MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/tws-dev',
      
      // Redis Configuration
      REDIS_HOST: process.env.REDIS_HOST || 'localhost',
      REDIS_PORT: process.env.REDIS_PORT || 6379,
      REDIS_PASSWORD: process.env.REDIS_PASSWORD || '',
      REDIS_DB: process.env.REDIS_DB || 0,
      REDIS_DISABLED: process.env.REDIS_DISABLED === 'true',
      BULLMQ_DISABLED: process.env.BULLMQ_DISABLED === 'true',
      REDIS_VERSION_COMPATIBLE: process.env.REDIS_VERSION_COMPATIBLE === 'true',
      
      // Firebase Configuration
      FIREBASE_API_KEY: process.env.FIREBASE_API_KEY || '',
      FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN || '',
      FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || '',
      FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET || '',
      FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
      FIREBASE_APP_ID: process.env.FIREBASE_APP_ID || '',
      FIREBASE_SERVICE_ACCOUNT_PATH: process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json',
      FIREBASE_DATABASE_URL: process.env.FIREBASE_DATABASE_URL || '',
      
      // JWT Configuration
      JWT_SECRET: process.env.JWT_SECRET || this.generateSecureSecret(),
      JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || this.generateSecureSecret(),
      JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
      JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      
      // Encryption Configuration
      ENCRYPTION_MASTER_KEY: process.env.ENCRYPTION_MASTER_KEY || this.generateSecureSecret(),
      
      // CORS Configuration
      CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
      SOCKET_CORS_ORIGIN: process.env.SOCKET_CORS_ORIGIN || 'http://localhost:3000',
      
      // Rate Limiting
      RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS || 900000, // 15 minutes
      RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS || 100,
      
      // File Upload
      MAX_FILE_SIZE: process.env.MAX_FILE_SIZE || '10mb',
      UPLOAD_PATH: process.env.UPLOAD_PATH || './uploads',
      
      // Email Configuration
      EMAIL_HOST: process.env.EMAIL_HOST || '',
      EMAIL_PORT: process.env.EMAIL_PORT || 587,
      EMAIL_USER: process.env.EMAIL_USER || '',
      EMAIL_PASS: process.env.EMAIL_PASS || '',
      EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@noreply.tws.enterprises',
      
      // Stripe Configuration
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
      STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY || '',
      STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
      
      // AWS Configuration
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || '',
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || '',
      AWS_REGION: process.env.AWS_REGION || 'us-east-1',
      AWS_S3_BUCKET: process.env.AWS_S3_BUCKET || '',
      
      // Monitoring
      SENTRY_DSN: process.env.SENTRY_DSN || '',
      LOG_LEVEL: process.env.LOG_LEVEL || 'info',
      
      // SupraAdmin Configuration
      SUPRAADMIN_EMAIL: process.env.SUPRAADMIN_EMAIL || 'admin@tws.com',
      SUPRAADMIN_PASSWORD: process.env.SUPRAADMIN_PASSWORD || 'admin123456',
      
      // Feature Flags
      ENABLE_BIOMETRIC: process.env.ENABLE_BIOMETRIC === 'true',
      ENABLE_ANALYTICS: process.env.ENABLE_ANALYTICS === 'true',
      ENABLE_NOTIFICATIONS: process.env.ENABLE_NOTIFICATIONS === 'true',
      ENABLE_FILE_UPLOAD: process.env.ENABLE_FILE_UPLOAD === 'true',
      ENABLE_EMAIL_SERVICE: process.env.ENABLE_EMAIL_SERVICE === 'true',
      ENABLE_STRIPE: process.env.ENABLE_STRIPE === 'true',
      ENABLE_AWS: process.env.ENABLE_AWS === 'true',
    };
  }

  loadFileConfigs() {
    // Load from config files if they exist
    const configFiles = [
      './config/production.json',
      './config/development.json',
      './config/local.json',
      './redis-config-5.0.env',
      './firebase-config.env'
    ];

    configFiles.forEach(file => {
      if (fs.existsSync(file)) {
        try {
          if (file.endsWith('.json')) {
            const fileConfig = JSON.parse(fs.readFileSync(file, 'utf8'));
            this.config = { ...this.config, ...fileConfig };
          } else if (file.endsWith('.env')) {
            const envContent = fs.readFileSync(file, 'utf8');
            envContent.split('\n').forEach(line => {
              if (line.trim() && !line.startsWith('#')) {
                const [key, value] = line.split('=');
                if (key && value) {
                  this.config[key.trim()] = value.trim();
                }
              }
            });
          }
          console.log(`✅ Loaded configuration from ${file}`);
        } catch (error) {
          console.warn(`⚠️ Failed to load configuration from ${file}:`, error.message);
        }
      }
    });
  }

  loadExternalConfigs() {
    // Load from external configuration services
    // This can be extended to load from:
    // - AWS Parameter Store
    // - Azure Key Vault
    // - HashiCorp Consul
    // - etcd
    // - Database configuration table
  }

  validateConfig() {
    const required = [
      'MONGO_URI',
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'ENCRYPTION_MASTER_KEY'
    ];

    const missing = required.filter(key => !this.config[key]);
    
    if (missing.length > 0) {
      console.warn(`⚠️ Missing required configuration: ${missing.join(', ')}`);
    }

    // Validate Redis configuration
    if (!this.config.REDIS_DISABLED) {
      if (!this.config.REDIS_HOST || !this.config.REDIS_PORT) {
        console.warn('⚠️ Redis enabled but host/port not configured');
      }
    }

    // Validate Firebase configuration
    if (this.config.FIREBASE_API_KEY) {
      const firebaseRequired = [
        'FIREBASE_AUTH_DOMAIN',
        'FIREBASE_PROJECT_ID',
        'FIREBASE_STORAGE_BUCKET',
        'FIREBASE_MESSAGING_SENDER_ID',
        'FIREBASE_APP_ID'
      ];
      
      const missingFirebase = firebaseRequired.filter(key => !this.config[key]);
      if (missingFirebase.length > 0) {
        console.warn(`⚠️ Incomplete Firebase configuration: ${missingFirebase.join(', ')}`);
      }
    }
  }

  generateSecureSecret() {
    return require('crypto').randomBytes(64).toString('hex');
  }

  get(key, defaultValue = null) {
    return this.config[key] || defaultValue;
  }

  set(key, value) {
    this.config[key] = value;
  }

  getAll() {
    return { ...this.config };
  }

  isProduction() {
    return this.config.NODE_ENV === 'production';
  }

  isDevelopment() {
    return this.config.NODE_ENV === 'development';
  }

  isRedisEnabled() {
    return !this.config.REDIS_DISABLED;
  }

  isBullMQEnabled() {
    return !this.config.BULLMQ_DISABLED;
  }

  isFirebaseEnabled() {
    return !!this.config.FIREBASE_API_KEY;
  }

  getRedisConfig() {
    return {
      host: this.config.REDIS_HOST,
      port: this.config.REDIS_PORT,
      password: this.config.REDIS_PASSWORD,
      db: this.config.REDIS_DB
    };
  }

  getFirebaseConfig() {
    return {
      apiKey: this.config.FIREBASE_API_KEY,
      authDomain: this.config.FIREBASE_AUTH_DOMAIN,
      projectId: this.config.FIREBASE_PROJECT_ID,
      storageBucket: this.config.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: this.config.FIREBASE_MESSAGING_SENDER_ID,
      appId: this.config.FIREBASE_APP_ID,
      databaseURL: this.config.FIREBASE_DATABASE_URL
    };
  }

  getDatabaseConfig() {
    return {
      mongoUri: this.config.MONGO_URI,
      redis: this.getRedisConfig()
    };
  }

  getSecurityConfig() {
    return {
      jwtSecret: this.config.JWT_SECRET,
      jwtRefreshSecret: this.config.JWT_REFRESH_SECRET,
      jwtExpiresIn: this.config.JWT_EXPIRES_IN,
      jwtRefreshExpiresIn: this.config.JWT_REFRESH_EXPIRES_IN,
      encryptionKey: this.config.ENCRYPTION_MASTER_KEY
    };
  }

  // Export configuration for external use
  exportConfig() {
    return {
      server: {
        port: this.config.PORT,
        environment: this.config.NODE_ENV,
        corsOrigin: this.config.CORS_ORIGIN
      },
      database: this.getDatabaseConfig(),
      security: this.getSecurityConfig(),
      firebase: this.getFirebaseConfig(),
      features: {
        redis: this.isRedisEnabled(),
        bullmq: this.isBullMQEnabled(),
        firebase: this.isFirebaseEnabled(),
        biometric: this.config.ENABLE_BIOMETRIC,
        analytics: this.config.ENABLE_ANALYTICS,
        notifications: this.config.ENABLE_NOTIFICATIONS
      }
    };
  }
}

// Create singleton instance
const config = new TWSConfig();

module.exports = config;
