/**
 * Security Configuration
 * Centralized configuration for all security-related settings
 */

module.exports = {
  // Encryption Settings
  encryption: {
    enabled: process.env.ENCRYPTION_ENABLED === 'true' || true,
    masterKey: process.env.ENCRYPTION_MASTER_KEY || (() => {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('ENCRYPTION_MASTER_KEY must be set in production');
      }
      return 'dev-master-key-change-in-production-32-chars';
    })(),
    algorithm: 'aes-256-gcm',
    keyLength: 32,
    ivLength: 16,
    tagLength: 16
  },

  // Audit Logging Settings
  audit: {
    enabled: process.env.AUDIT_LOGGING_ENABLED !== 'false',
    retentionDays: parseInt(process.env.AUDIT_LOG_RETENTION_DAYS) || 2555, // 7 years
    logLevel: process.env.AUDIT_LOG_LEVEL || 'info',
    exportEnabled: process.env.AUDIT_EXPORT_ENABLED !== 'false',
    maxExportRecords: parseInt(process.env.AUDIT_MAX_EXPORT_RECORDS) || 10000
  },

  // Retention Policy Settings
  retention: {
    enabled: process.env.RETENTION_POLICY_ENABLED !== 'false',
    defaultPolicies: {
      messages: parseInt(process.env.MESSAGE_RETENTION_DAYS) || 365,
      deletedMessages: parseInt(process.env.DELETED_MESSAGE_RETENTION_DAYS) || 30,
      auditLogs: parseInt(process.env.AUDIT_LOG_RETENTION_DAYS) || 2555,
      userData: parseInt(process.env.USER_DATA_RETENTION_DAYS) || 2555,
      chatData: parseInt(process.env.CHAT_DATA_RETENTION_DAYS) || 365
    },
    cleanupSchedule: {
      softDelete: '0 2 * * *', // Daily at 2 AM
      purge: '0 3 * * 0', // Weekly on Sunday at 3 AM
      fullEnforcement: '0 4 1 * *' // Monthly on 1st at 4 AM
    }
  },

  // RBAC Settings
  rbac: {
    enabled: process.env.RBAC_ENABLED !== 'false',
    defaultRole: 'employee',
    roleHierarchy: {
      system: 100,
      super_admin: 90,
      org_manager: 80,
      owner: 70,
      admin: 60,
      moderator: 50,
      hr: 45,
      finance: 45,
      pmo: 40,
      project_manager: 35,
      department_lead: 30,
      manager: 25,
      employee: 20,
      contributor: 15,
      contractor: 10,
      auditor: 5,
      client: 3,
      reseller: 2,
      user: 1
    }
  },

  // Compliance Settings
  compliance: {
    enabled: process.env.COMPLIANCE_MODE === 'enabled',
    gdpr: {
      enabled: process.env.GDPR_COMPLIANCE === 'true',
      rightToBeForgotten: true,
      dataPortability: true,
      consentManagement: true
    },
    sox: {
      enabled: process.env.SOX_COMPLIANCE === 'true',
      immutableAuditTrails: true,
      accessControls: true,
      dataRetention: true
    }
  },

  // Rate Limiting Settings
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  },

  // Security Headers
  securityHeaders: {
    helmet: {
      enabled: process.env.HELMET_ENABLED !== 'false',
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"]
        }
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    },
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      credentials: true,
      optionsSuccessStatus: 200
    }
  },

  // E2E Encryption Settings (Future Implementation)
  e2eEncryption: {
    enabled: process.env.E2E_ENCRYPTION_ENABLED === 'true',
    algorithm: 'x25519',
    encryptionAlgorithm: 'chacha20-poly1305',
    keyExchangeUrl: process.env.E2E_KEY_EXCHANGE_URL,
    preKeyBundleSize: 100,
    keyRotationInterval: 7 * 24 * 60 * 60 * 1000 // 7 days
  },

  // Backup and Recovery Settings
  backup: {
    enabled: process.env.BACKUP_ENABLED === 'true',
    schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *',
    retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS) || 30,
    encryptionEnabled: true,
    compressionEnabled: true
  },

  // Monitoring and Alerting
  monitoring: {
    enabled: process.env.MONITORING_ENABLED !== 'false',
    metricsEnabled: process.env.METRICS_ENABLED !== 'false',
    prometheusPort: parseInt(process.env.PROMETHEUS_PORT) || 9090,
    alertThresholds: {
      failedDecryptions: 10,
      unauthorizedAccess: 5,
      retentionJobFailures: 3,
      auditLogErrors: 5
    }
  },

  // Development vs Production Settings
  environment: {
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
    isTest: process.env.NODE_ENV === 'test',
    debugMode: process.env.DEBUG_MODE === 'true'
  }
};
