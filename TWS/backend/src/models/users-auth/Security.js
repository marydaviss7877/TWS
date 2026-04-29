const mongoose = require('mongoose');

// Audit Log Schema
const auditLogSchema = new mongoose.Schema({
  entityType: {
    type: String,
    required: true,
    enum: ['transaction', 'invoice', 'bill', 'journal_entry', 'project_costing', 'time_entry', 'vendor', 'client', 'chart_of_accounts', 'bank_account', 'integration']
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: ['create', 'read', 'update', 'delete', 'approve', 'reject', 'export', 'import', 'sync', 'reconcile']
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userEmail: String,
  userRole: String,
  changes: {
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed,
    fields: [String]
  },
  ipAddress: String,
  userAgent: String,
  sessionId: String,
  metadata: {
    reason: String,
    approvalWorkflow: String,
    batchOperation: String,
    integrationProvider: String,
    externalId: String
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  }
}, {
  timestamps: false // We use custom timestamp field
});

// Role Permission Schema
const rolePermissionSchema = new mongoose.Schema({
  role: {
    type: String,
    required: true,
    enum: ['owner', 'finance_manager', 'accountant', 'project_manager', 'people_ops', 'viewer', 'auditor']
  },
  permissions: {
    // Finance permissions
    finance: {
      read: { type: Boolean, default: false },
      write: { type: Boolean, default: false },
      approve: { type: Boolean, default: false },
      export: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    },
    // Chart of Accounts permissions
    chart_of_accounts: {
      read: { type: Boolean, default: false },
      write: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    },
    // Journal Entry permissions
    journal_entries: {
      read: { type: Boolean, default: false },
      write: { type: Boolean, default: false },
      post: { type: Boolean, default: false },
      reverse: { type: Boolean, default: false }
    },
    // Invoice permissions
    invoices: {
      read: { type: Boolean, default: false },
      write: { type: Boolean, default: false },
      send: { type: Boolean, default: false },
      approve: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    },
    // Bill permissions
    bills: {
      read: { type: Boolean, default: false },
      write: { type: Boolean, default: false },
      approve: { type: Boolean, default: false },
      pay: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    },
    // Project Costing permissions
    project_costing: {
      read: { type: Boolean, default: false },
      write: { type: Boolean, default: false },
      approve: { type: Boolean, default: false }
    },
    // Time Entry permissions
    time_entries: {
      read: { type: Boolean, default: false },
      write: { type: Boolean, default: false },
      approve: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    },
    // Vendor permissions
    vendors: {
      read: { type: Boolean, default: false },
      write: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    },
    // Client permissions
    clients: {
      read: { type: Boolean, default: false },
      write: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    },
    // Banking permissions
    banking: {
      read: { type: Boolean, default: false },
      reconcile: { type: Boolean, default: false },
      import: { type: Boolean, default: false }
    },
    // Integration permissions
    integrations: {
      read: { type: Boolean, default: false },
      write: { type: Boolean, default: false },
      sync: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    },
    // Reporting permissions
    reports: {
      read: { type: Boolean, default: false },
      generate: { type: Boolean, default: false },
      export: { type: Boolean, default: false }
    },
    // Audit permissions
    audit: {
      read: { type: Boolean, default: false },
      export: { type: Boolean, default: false }
    }
  },
  fieldRestrictions: {
    // Fields that are masked for this role
    maskedFields: [String],
    // Fields that are read-only for this role
    readOnlyFields: [String]
  },
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  }
}, {
  timestamps: true
});

// Data Retention Policy Schema
const dataRetentionPolicySchema = new mongoose.Schema({
  entityType: {
    type: String,
    required: true,
    enum: ['transaction', 'invoice', 'bill', 'journal_entry', 'audit_log', 'integration_log']
  },
  retentionPeriod: {
    type: Number,
    required: true,
    min: 0 // in months
  },
  archiveAfter: {
    type: Number,
    required: true,
    min: 0 // in months
  },
  deleteAfter: {
    type: Number,
    required: true,
    min: 0 // in months
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastApplied: Date,
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  }
}, {
  timestamps: true
});

// Encryption Key Schema
const encryptionKeySchema = new mongoose.Schema({
  keyId: {
    type: String,
    required: true,
    unique: true
  },
  encryptedKey: {
    type: String,
    required: true
  },
  algorithm: {
    type: String,
    default: 'AES-256-GCM'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  rotatedAt: Date,
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  }
}, {
  timestamps: false
});

// Security Event Schema
const securityEventSchema = new mongoose.Schema({
  eventType: {
    type: String,
    required: true,
    enum: ['login', 'logout', 'failed_login', 'permission_denied', 'data_access', 'data_modification', 'export', 'integration_error', 'suspicious_activity']
  },
  severity: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high', 'critical']
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  userEmail: String,
  userRole: String,
  description: {
    type: String,
    required: true
  },
  details: mongoose.Schema.Types.Mixed,
  ipAddress: String,
  userAgent: String,
  sessionId: String,
  resolved: {
    type: Boolean,
    default: false
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolvedAt: Date,
  resolution: String,
  timestamp: {
    type: Date,
    default: Date.now
  },
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  }
}, {
  timestamps: false
});

// Compliance Report Schema
const complianceReportSchema = new mongoose.Schema({
  reportType: {
    type: String,
    required: true,
    enum: ['sox', 'pci_dss', 'gdpr', 'iso27001', 'audit_trail', 'data_retention']
  },
  period: {
    start: Date,
    end: Date
  },
  status: {
    type: String,
    enum: ['generating', 'completed', 'failed'],
    default: 'generating'
  },
  findings: [{
    category: String,
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical']
    },
    description: String,
    recommendation: String,
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved'],
      default: 'open'
    }
  }],
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  filePath: String,
  fileSize: Number,
  checksum: String,
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  }
}, {
  timestamps: true
});

// Indexes for performance
auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ orgId: 1, timestamp: -1 });
auditLogSchema.index({ timestamp: -1 });

rolePermissionSchema.index({ role: 1, orgId: 1 }, { unique: true });
rolePermissionSchema.index({ orgId: 1 });

dataRetentionPolicySchema.index({ entityType: 1, orgId: 1 }, { unique: true });
dataRetentionPolicySchema.index({ orgId: 1 });

encryptionKeySchema.index({ keyId: 1 }, { unique: true });
encryptionKeySchema.index({ orgId: 1 });
encryptionKeySchema.index({ isActive: 1 });

securityEventSchema.index({ eventType: 1, timestamp: -1 });
securityEventSchema.index({ severity: 1, timestamp: -1 });
securityEventSchema.index({ userId: 1, timestamp: -1 });
securityEventSchema.index({ orgId: 1, timestamp: -1 });
securityEventSchema.index({ resolved: 1, timestamp: -1 });

complianceReportSchema.index({ reportType: 1, period: 1 });
complianceReportSchema.index({ status: 1, createdAt: -1 });
complianceReportSchema.index({ orgId: 1, createdAt: -1 });

// Get or create models (check if they exist first to avoid "Cannot overwrite model" errors)
function getOrCreateModel(name, schema) {
  if (mongoose.models[name]) {
    return mongoose.models[name];
  }
  return mongoose.model(name, schema);
}

// IMPORTANT: The AuditLog model is already defined in AuditLog.js
// Security.js defines a finance-specific audit log schema with entityType/entityId
// Since the schemas are different and both are needed, we'll use FinanceAuditLog for the finance-specific one
// and keep AuditLog for the general audit log model

// However, Security routes expect 'AuditLog' with entityType support
// Solution: Remove AuditLog from Security.js exports and import it from AuditLog.js
// But AuditLog.js doesn't have entityType, so we need to either:
// 1. Rename Security's AuditLog to FinanceAuditLog and update routes
// 2. Enhance AuditLog.js to support both schemas
// 3. Remove the duplicate and update Security routes to work without entityType

// For now, let's just not export AuditLog from Security.js and import it from AuditLog.js
// Routes will need to be updated if they require entityType functionality

const AuditLogModel = mongoose.models.AuditLog;
if (!AuditLogModel) {
  // If AuditLog doesn't exist yet, import it (this will create it)
  require('./AuditLog');
}

module.exports = {
  // Don't create AuditLog here - it's already defined in AuditLog.js
  // Import it from there if needed, or use FinanceAuditLog for finance-specific logs
  RolePermission: getOrCreateModel('RolePermission', rolePermissionSchema),
  DataRetentionPolicy: getOrCreateModel('DataRetentionPolicy', dataRetentionPolicySchema),
  EncryptionKey: getOrCreateModel('EncryptionKey', encryptionKeySchema),
  SecurityEvent: getOrCreateModel('SecurityEvent', securityEventSchema),
  ComplianceReport: getOrCreateModel('ComplianceReport', complianceReportSchema)
};
