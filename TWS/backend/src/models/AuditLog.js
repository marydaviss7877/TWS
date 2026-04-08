const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  // Basic Information
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  
  // User Information
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  userEmail: {
    type: String,
    required: true,
    index: true
  },
  userRole: {
    type: String,
    required: true
  },
  
  // Action Information
  action: {
    type: String,
    required: true,
    enum: [
      'CREATE', 'READ', 'UPDATE', 'DELETE',
      'LOGIN', 'LOGOUT', 'LOGIN_FAILED',
      'AUTH_SUCCESS', 'AUTH_FAILED', 'AUTH_REFRESH', 'AUTH_REVOKE',
      'PASSWORD_CHANGE', 'PASSWORD_RESET',
      'PERMISSION_CHANGE', 'ROLE_CHANGE',
      'DATA_EXPORT', 'DATA_IMPORT',
      'API_ACCESS', 'FILE_UPLOAD', 'FILE_DOWNLOAD',
      'PAYMENT_PROCESSED', 'SUBSCRIPTION_CHANGE',
      'TENANT_CREATED', 'TENANT_UPDATED', 'TENANT_DELETED', 'TENANT_LOOKUP_FAILED',
      'USER_CREATED', 'USER_UPDATED', 'USER_DELETED',
      'PROJECT_CREATED', 'PROJECT_UPDATED', 'PROJECT_DELETED',
      'ATTENDANCE_CREATED', 'ATTENDANCE_UPDATED', 'ATTENDANCE_DELETED',
      'INVOICE_CREATED', 'INVOICE_UPDATED', 'INVOICE_DELETED',
      'RESOURCE_CREATED', 'RESOURCE_UPDATED', 'RESOURCE_DELETED',
      'CUSTOM'
    ]
  },
  sensitiveDataAccess: {
    type: Boolean,
    default: false
  },
  phiFieldsAccessed: [{
    type: String // e.g., 'personalInfo.firstName', 'medicalInfo.diagnosis'
  }],
  resource: {
    type: String,
    required: true,
    enum: [
      'USER', 'ORGANIZATION', 'TENANT', 'PROJECT', 'CLIENT',
      'EMPLOYEE', 'ATTENDANCE', 'INVOICE', 'SUBSCRIPTION',
      'PAYMENT', 'FILE', 'API', 'SYSTEM', 'AUDIT_LOG',
      'AUTH', 'SESSION', 'RESOURCE', 'TASK', 'SPRINT', 'MILESTONE',
      // Healthcare resources
      'PATIENT', 'MEDICAL_RECORD', 'PRESCRIPTION', 'APPOINTMENT',
      'DOCTOR', 'LAB_RESULT', 'BILLING_CLAIM'
    ]
  },
  resourceId: {
    type: String,
    index: true
  },
  
  // Request Information
  requestId: {
    type: String,
    index: true
  },
  sessionId: {
    type: String,
    index: true
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String
  },
  method: {
    type: String,
    enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']
  },
  endpoint: {
    type: String
  },
  
  // Data Changes
  changes: {
    before: {
      type: mongoose.Schema.Types.Mixed
    },
    after: {
      type: mongoose.Schema.Types.Mixed
    },
    fields: [{
      field: String,
      oldValue: mongoose.Schema.Types.Mixed,
      newValue: mongoose.Schema.Types.Mixed
    }]
  },
  
  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  
  // Compliance Information
  compliance: {
    gdprRelevant: {
      type: Boolean,
      default: false
    },
    dataSubject: {
      type: String // Email or identifier of the data subject
    },
    legalBasis: {
      type: String,
      enum: ['consent', 'contract', 'legal_obligation', 'vital_interests', 'public_task', 'legitimate_interests']
    },
    retentionPeriod: {
      type: Number, // in days
      default: 2555 // 7 years default
    },
    dataCategories: [{
      type: String,
      enum: ['personal_data', 'sensitive_data', 'financial_data', 'health_data', 'biometric_data', 'location_data']
    }]
  },
  
  // Security Information
  security: {
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low'
    },
    suspiciousActivity: {
      type: Boolean,
      default: false
    },
    geolocation: {
      country: String,
      region: String,
      city: String,
      coordinates: {
        latitude: Number,
        longitude: Number
      }
    },
    deviceFingerprint: String
  },
  
  // Result Information
  result: {
    status: {
      type: String,
      enum: ['success', 'failure', 'partial'],
      required: true
    },
    errorCode: String,
    errorMessage: String,
    responseTime: Number, // in milliseconds
    recordsAffected: Number
  },
  
  // Timestamps
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
    index: true
  },
  
  // Data Retention
  expiresAt: {
    type: Date,
    index: { expireAfterSeconds: 0 }
  }
}, {
  timestamps: true
});

// Compound indexes for efficient querying
auditLogSchema.index({ tenantId: 1, timestamp: -1 });
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, resource: 1, timestamp: -1 });
auditLogSchema.index({ 'compliance.gdprRelevant': 1, timestamp: -1 });
auditLogSchema.index({ 'security.riskLevel': 1, timestamp: -1 });
auditLogSchema.index({ 'result.status': 1, timestamp: -1 });

// Virtual for formatted timestamp
auditLogSchema.virtual('formattedTimestamp').get(function() {
  return this.timestamp.toISOString();
});

// Virtual for risk score
auditLogSchema.virtual('riskScore').get(function() {
  let score = 0;
  
  // Base score by action
  const actionScores = {
    'CREATE': 1,
    'READ': 0,
    'UPDATE': 2,
    'DELETE': 5,
    'LOGIN': 1,
    'LOGIN_FAILED': 3,
    'PASSWORD_CHANGE': 2,
    'PASSWORD_RESET': 3,
    'PERMISSION_CHANGE': 4,
    'ROLE_CHANGE': 4,
    'DATA_EXPORT': 3,
    'DATA_IMPORT': 2,
    'API_ACCESS': 1,
    'FILE_UPLOAD': 2,
    'FILE_DOWNLOAD': 1,
    'PAYMENT_PROCESSED': 3,
    'SUBSCRIPTION_CHANGE': 2,
    'TENANT_CREATED': 5,
    'TENANT_UPDATED': 3,
    'TENANT_DELETED': 10,
    'USER_CREATED': 3,
    'USER_UPDATED': 2,
    'USER_DELETED': 5,
    'PROJECT_CREATED': 2,
    'PROJECT_UPDATED': 1,
    'PROJECT_DELETED': 3,
    'ATTENDANCE_CREATED': 1,
    'ATTENDANCE_UPDATED': 1,
    'ATTENDANCE_DELETED': 2,
    'INVOICE_CREATED': 2,
    'INVOICE_UPDATED': 1,
    'INVOICE_DELETED': 3,
    'CUSTOM': 1
  };
  
  score += actionScores[this.action] || 1;
  
  // Add score for GDPR relevant data
  if (this.compliance.gdprRelevant) {
    score += 2;
  }
  
  // Add score for sensitive data categories
  if (this.compliance.dataCategories) {
    this.compliance.dataCategories.forEach(category => {
      if (['sensitive_data', 'financial_data', 'health_data', 'biometric_data'].includes(category)) {
        score += 2;
      }
    });
  }
  
  // Add score for suspicious activity
  if (this.security.suspiciousActivity) {
    score += 5;
  }
  
  // Add score for failed operations
  if (this.result.status === 'failure') {
    score += 3;
  }
  
  return Math.min(10, score);
});

// Method to check if log should be retained
auditLogSchema.methods.shouldRetain = function() {
  const now = new Date();
  const retentionDays = this.compliance.retentionPeriod || 2555; // 7 years default
  const retentionDate = new Date(this.timestamp.getTime() + retentionDays * 24 * 60 * 60 * 1000);
  
  return now < retentionDate;
};

// Method to get data subject information
auditLogSchema.methods.getDataSubject = function() {
  if (this.compliance.dataSubject) {
    return this.compliance.dataSubject;
  }
  
  // Try to extract from changes
  if (this.changes.after && this.changes.after.email) {
    return this.changes.after.email;
  }
  
  if (this.changes.before && this.changes.before.email) {
    return this.changes.before.email;
  }
  
  return this.userEmail;
};

// Static method to get logs for a specific user
auditLogSchema.statics.getUserLogs = function(userId, limit = 100, offset = 0) {
  return this.find({ userId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(offset);
};

// Static method to get logs for a specific tenant
auditLogSchema.statics.getTenantLogs = function(tenantId, limit = 100, offset = 0) {
  return this.find({ tenantId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(offset);
};

// Static method to get GDPR relevant logs
auditLogSchema.statics.getGDPRLogs = function(tenantId, dataSubject = null) {
  const query = { 
    tenantId, 
    'compliance.gdprRelevant': true 
  };
  
  if (dataSubject) {
    query.$or = [
      { 'compliance.dataSubject': dataSubject },
      { userEmail: dataSubject },
      { 'changes.after.email': dataSubject },
      { 'changes.before.email': dataSubject }
    ];
  }
  
  return this.find(query).sort({ timestamp: -1 });
};

// Static method to get security events
auditLogSchema.statics.getSecurityEvents = function(tenantId, riskLevel = null) {
  const query = { 
    tenantId,
    $or: [
      { 'security.riskLevel': { $in: ['high', 'critical'] } },
      { 'security.suspiciousActivity': true },
      { 'result.status': 'failure' },
      { action: { $in: ['LOGIN_FAILED', 'PASSWORD_RESET', 'PERMISSION_CHANGE', 'ROLE_CHANGE'] } }
    ]
  };
  
  if (riskLevel) {
    query['security.riskLevel'] = riskLevel;
  }
  
  return this.find(query).sort({ timestamp: -1 });
};

// Static method to get audit trail for a resource
auditLogSchema.statics.getResourceAuditTrail = function(resource, resourceId, tenantId) {
  return this.find({ 
    resource, 
    resourceId, 
    tenantId 
  }).sort({ timestamp: -1 });
};

// Static method to get compliance report
auditLogSchema.statics.getComplianceReport = function(tenantId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        tenantId,
        timestamp: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          action: '$action',
          resource: '$resource'
        },
        count: { $sum: 1 },
        gdprRelevant: { $sum: { $cond: ['$compliance.gdprRelevant', 1, 0] } },
        highRisk: { $sum: { $cond: [{ $in: ['$security.riskLevel', ['high', 'critical']] }, 1, 0] } },
        failures: { $sum: { $cond: [{ $eq: ['$result.status', 'failure'] }, 1, 0] } }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

// Static method to get user activity summary
auditLogSchema.statics.getUserActivitySummary = function(userId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        userId,
        timestamp: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }
        },
        totalActions: { $sum: 1 },
        uniqueResources: { $addToSet: '$resource' },
        uniqueActions: { $addToSet: '$action' },
        failures: { $sum: { $cond: [{ $eq: ['$result.status', 'failure'] }, 1, 0] } },
        avgResponseTime: { $avg: '$result.responseTime' }
      }
    },
    {
      $project: {
        date: '$_id.date',
        totalActions: 1,
        uniqueResourceCount: { $size: '$uniqueResources' },
        uniqueActionCount: { $size: '$uniqueActions' },
        failures: 1,
        avgResponseTime: 1
      }
    },
    {
      $sort: { date: 1 }
    }
  ]);
};

// Pre-save middleware to set expiration date
auditLogSchema.pre('save', function(next) {
  if (!this.expiresAt) {
    const retentionDays = this.compliance.retentionPeriod || 2555; // 7 years default
    this.expiresAt = new Date(this.timestamp.getTime() + retentionDays * 24 * 60 * 60 * 1000);
  }
  next();
});

// Check if model already exists before creating it to avoid "Cannot overwrite model" errors
module.exports = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);