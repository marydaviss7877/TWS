const mongoose = require('mongoose');

const departmentAccessSchema = new mongoose.Schema({
  // Tenant and User Information
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  
  // Department Information
  department: {
    type: String,
    required: true,
    trim: true
  },
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  },
  
  // Access Permissions
  permissions: [{
    type: String,
    enum: ['read', 'write', 'admin', 'delete', 'manage_users', 'view_analytics', 'export_data'],
    required: true
  }],
  
  // Access Control
  accessLevel: {
    type: String,
    enum: ['viewer', 'contributor', 'editor', 'admin', 'owner'],
    default: 'viewer'
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'suspended', 'revoked', 'expired'],
    default: 'active'
  },
  
  // Timing
  grantedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: Date,
  lastAccessed: {
    type: Date,
    default: Date.now
  },
  
  // Granted by
  grantedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SupraAdmin',
    required: true
  },
  
  // Revocation
  revokedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SupraAdmin'
  },
  revokedAt: Date,
  revocationReason: String,
  
  // Conditions
  conditions: {
    ipWhitelist: [String],
    timeRestrictions: {
      startTime: String, // HH:MM format
      endTime: String,   // HH:MM format
      days: [{
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      }]
    },
    locationRestrictions: {
      allowedCountries: [String],
      allowedRegions: [String],
      blockedIPs: [String]
    },
    deviceRestrictions: {
      allowedDevices: [String]
    }
  },
  
  // Usage Tracking
  usage: {
    totalAccesses: {
      type: Number,
      default: 0
    },
    lastAccessDuration: Number, // in minutes
    averageAccessDuration: Number, // in minutes
    dataAccessed: [{
      resource: String,
      action: String,
      timestamp: Date,
      size: Number // in bytes
    }]
  },
  
  // Audit Trail
  auditLog: [{
    action: {
      type: String,
      enum: ['granted', 'modified', 'suspended', 'revoked', 'accessed', 'expired']
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SupraAdmin'
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    details: mongoose.Schema.Types.Mixed,
    ipAddress: String,
    userAgent: String
  }],
  
  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes for performance
departmentAccessSchema.index({ tenantId: 1, userId: 1 });
departmentAccessSchema.index({ tenantId: 1, department: 1 });
departmentAccessSchema.index({ userId: 1, department: 1 });
departmentAccessSchema.index({ status: 1 });
departmentAccessSchema.index({ expiresAt: 1 });
departmentAccessSchema.index({ grantedBy: 1 });

// Compound index for efficient queries
departmentAccessSchema.index({ tenantId: 1, department: 1, status: 1 });

// Virtual for is expired
departmentAccessSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});

// Virtual for is active
departmentAccessSchema.virtual('isActive').get(function() {
  return this.status === 'active' && !this.isExpired;
});

// Method to check permission
departmentAccessSchema.methods.hasPermission = function(permission) {
  if (!this.isActive) return false;
  
  // Admin has all permissions
  if (this.permissions.includes('admin')) return true;
  
  return this.permissions.includes(permission);
};

// Method to check access level
departmentAccessSchema.methods.hasAccessLevel = function(level) {
  if (!this.isActive) return false;
  
  const levels = ['viewer', 'contributor', 'editor', 'admin', 'owner'];
  const currentLevelIndex = levels.indexOf(this.accessLevel);
  const requiredLevelIndex = levels.indexOf(level);
  
  return currentLevelIndex >= requiredLevelIndex;
};

// Method to log access
departmentAccessSchema.methods.logAccess = function(resource, action, size = 0) {
  this.usage.totalAccesses += 1;
  this.usage.lastAccessDuration = 0; // Will be updated when session ends
  this.usage.dataAccessed.push({
    resource,
    action,
    timestamp: new Date(),
    size
  });
  this.lastAccessed = new Date();
  
  // Keep only last 100 access records
  if (this.usage.dataAccessed.length > 100) {
    this.usage.dataAccessed = this.usage.dataAccessed.slice(-100);
  }
  
  return this.save();
};

// Method to suspend access
departmentAccessSchema.methods.suspend = function(suspendedBy, reason) {
  this.status = 'suspended';
  this.auditLog.push({
    action: 'suspended',
    performedBy: suspendedBy,
    details: { reason }
  });
  return this.save();
};

// Method to revoke access
departmentAccessSchema.methods.revoke = function(revokedBy, reason) {
  this.status = 'revoked';
  this.revokedBy = revokedBy;
  this.revokedAt = new Date();
  this.revocationReason = reason;
  this.auditLog.push({
    action: 'revoked',
    performedBy: revokedBy,
    details: { reason }
  });
  return this.save();
};

// Method to reactivate access
departmentAccessSchema.methods.reactivate = function(reactivatedBy, newExpiresAt) {
  this.status = 'active';
  if (newExpiresAt) {
    this.expiresAt = newExpiresAt;
  }
  this.auditLog.push({
    action: 'modified',
    performedBy: reactivatedBy,
    details: { action: 'reactivated' }
  });
  return this.save();
};

// Static method to find active access for user
departmentAccessSchema.statics.findActiveAccessForUser = function(tenantId, userId) {
  return this.find({
    tenantId,
    userId,
    status: 'active',
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } }
    ]
  }).populate('grantedBy', 'fullName email');
};

// Static method to find users with department access
departmentAccessSchema.statics.findUsersWithDepartmentAccess = function(tenantId, department) {
  return this.find({
    tenantId,
    department,
    status: 'active',
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } }
    ]
  })
  .populate('userId', 'fullName email role department')
  .populate('grantedBy', 'fullName email')
  .sort({ lastAccessed: -1 });
};

// Static method to get department access summary
departmentAccessSchema.statics.getDepartmentAccessSummary = function(tenantId) {
  return this.aggregate([
    {
      $match: {
        tenantId: mongoose.Types.ObjectId(tenantId),
        status: 'active',
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: { $gt: new Date() } }
        ]
      }
    },
    {
      $group: {
        _id: '$department',
        totalUsers: { $sum: 1 },
        accessLevels: { $addToSet: '$accessLevel' },
        permissions: { $addToSet: '$permissions' },
        lastAccessed: { $max: '$lastAccessed' }
      }
    },
    {
      $sort: { totalUsers: -1 }
    }
  ]);
};

// Static method to cleanup expired access
departmentAccessSchema.statics.cleanupExpiredAccess = function() {
  return this.updateMany(
    {
      status: 'active',
      expiresAt: { $lt: new Date() }
    },
    { status: 'expired' }
  );
};

module.exports = mongoose.model('DepartmentAccess', departmentAccessSchema);
