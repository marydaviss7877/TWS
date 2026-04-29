const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  // Session Information
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  
  // Session Details
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: true
  },
  deviceInfo: {
    type: String,
    browser: String,
    os: String,
    device: String
  },
  
  // Access Control
  departmentAccess: [{
    department: {
      type: String,
      required: true
    },
    permissions: [{
      type: String,
      enum: ['read', 'write', 'admin', 'delete']
    }],
    grantedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SupraAdmin'
    },
    grantedAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: Date,
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  
  // Session Status
  status: {
    type: String,
    enum: ['active', 'expired', 'terminated', 'suspended'],
    default: 'active'
  },
  
  // Timing
  loginTime: {
    type: Date,
    default: Date.now
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  logoutTime: Date,
  expiresAt: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours default
    }
  },
  
  // Security
  isSecure: {
    type: Boolean,
    default: false
  },
  location: {
    country: String,
    region: String,
    city: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  
  // Activity Log
  activities: [{
    action: String,
    resource: String,
    department: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    details: mongoose.Schema.Types.Mixed
  }],
  
  // Termination
  terminatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SupraAdmin'
  },
  terminationReason: String,
  
  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes for performance
sessionSchema.index({ sessionId: 1 });
sessionSchema.index({ userId: 1 });
sessionSchema.index({ tenantId: 1 });
sessionSchema.index({ status: 1 });
sessionSchema.index({ expiresAt: 1 });
sessionSchema.index({ lastActivity: 1 });
sessionSchema.index({ 'departmentAccess.department': 1 });

// Virtual for session duration
sessionSchema.virtual('duration').get(function() {
  if (this.logoutTime) {
    return this.logoutTime - this.loginTime;
  }
  return Date.now() - this.loginTime;
});

// Virtual for is expired
sessionSchema.virtual('isExpired').get(function() {
  return this.expiresAt < new Date() || this.status === 'expired';
});

// Method to check department access
sessionSchema.methods.hasDepartmentAccess = function(department, permission = 'read') {
  const access = this.departmentAccess.find(da => 
    da.department === department && 
    da.isActive && 
    (!da.expiresAt || da.expiresAt > new Date())
  );
  
  if (!access) return false;
  
  return access.permissions.includes(permission) || access.permissions.includes('admin');
};

// Method to grant department access
sessionSchema.methods.grantDepartmentAccess = function(department, permissions, grantedBy, expiresAt) {
  const existingAccess = this.departmentAccess.find(da => da.department === department);
  
  if (existingAccess) {
    existingAccess.permissions = permissions;
    existingAccess.grantedBy = grantedBy;
    existingAccess.grantedAt = new Date();
    existingAccess.expiresAt = expiresAt;
    existingAccess.isActive = true;
  } else {
    this.departmentAccess.push({
      department,
      permissions,
      grantedBy,
      grantedAt: new Date(),
      expiresAt,
      isActive: true
    });
  }
  
  return this.save();
};

// Method to revoke department access
sessionSchema.methods.revokeDepartmentAccess = function(department) {
  const access = this.departmentAccess.find(da => da.department === department);
  if (access) {
    access.isActive = false;
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to log activity
sessionSchema.methods.logActivity = function(action, resource, department, details = {}) {
  this.activities.push({
    action,
    resource,
    department,
    details
  });
  this.lastActivity = new Date();
  return this.save();
};

// Method to terminate session
sessionSchema.methods.terminate = function(terminatedBy, reason) {
  this.status = 'terminated';
  this.logoutTime = new Date();
  this.terminatedBy = terminatedBy;
  this.terminationReason = reason;
  return this.save();
};

// Static method to find active sessions
sessionSchema.statics.findActiveSessions = function(tenantId, department = null) {
  const query = {
    status: 'active',
    expiresAt: { $gt: new Date() },
    tenantId
  };
  
  if (department) {
    query['departmentAccess.department'] = department;
    query['departmentAccess.isActive'] = true;
  }
  
  return this.find(query)
    .populate('userId', 'fullName email role department')
    .populate('tenantId', 'name slug')
    .populate('orgId', 'name slug')
    .sort({ lastActivity: -1 });
};

// Static method to cleanup expired sessions
sessionSchema.statics.cleanupExpiredSessions = function() {
  return this.updateMany(
    {
      $or: [
        { expiresAt: { $lt: new Date() } },
        { lastActivity: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } // 7 days inactive
      ],
      status: 'active'
    },
    { status: 'expired' }
  );
};

module.exports = mongoose.model('Session', sessionSchema);
