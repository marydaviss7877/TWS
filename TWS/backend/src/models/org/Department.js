const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  description: String,
  color: {
    type: String,
    default: '#1890ff'
  },
  
  // Tenant Information
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: false // Allow null for global departments
  },
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: false // Allow null for global departments
  },
  
  // Department Hierarchy
  parentDepartment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  },
  childDepartments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  }],
  
  // Department Head (can be User for tenant departments or TWSAdmin for platform departments)
  departmentHead: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'departmentHeadModel'
  },
  departmentHeadModel: {
    type: String,
    enum: ['User', 'TWSAdmin', 'SupraAdmin'],
    default: 'User'
  },
  
  // Settings
  settings: {
    allowExternalAccess: {
      type: Boolean,
      default: false
    },
    requireApproval: {
      type: Boolean,
      default: false
    },
    maxUsers: {
      type: Number,
      default: 50
    },
    sessionTimeout: {
      type: Number,
      default: 8 // hours
    },
    dataRetention: {
      type: Number,
      default: 90 // days
    },
    encryptionRequired: {
      type: Boolean,
      default: false
    },
    auditLogging: {
      type: Boolean,
      default: true
    }
  },
  
  // UPR Phase 3: validated module key for menu/permission mapping (replaces hardcoded moduleToDepartmentMap)
  moduleKey: {
    type: String,
    enum: [
      'projects', 'hr', 'finance', 'payroll', 'documents', 'analytics', 'nucleus',
      'clients', 'deals', 'audit', 'attendance', 'leave', 'notifications', 'settings'
    ],
    required: false,
    default: null
  },

  // Access Control
  defaultPermissions: [{
    type: String,
    enum: ['read', 'write', 'admin', 'delete', 'manage_users', 'view_analytics', 'export_data'],
    default: 'read'
  }],

  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'archived'],
    default: 'active'
  },
  
  // Statistics
  stats: {
    totalUsers: {
      type: Number,
      default: 0
    },
    activeUsers: {
      type: Number,
      default: 0
    },
    totalSessions: {
      type: Number,
      default: 0
    },
    lastActivity: Date,
    dataSize: {
      type: Number,
      default: 0 // in bytes
    }
  },
  
  // Created by (can be SupraAdmin/TWSAdmin or User)
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'createdByModel',
    required: false // Make optional for backward compatibility
  },
  createdByModel: {
    type: String,
    enum: ['SupraAdmin', 'TWSAdmin', 'User'],
    default: 'TWSAdmin'
  },
  
  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes for performance
departmentSchema.index({ tenantId: 1, code: 1 }, { unique: true });
departmentSchema.index({ tenantId: 1, name: 1 });
departmentSchema.index({ orgId: 1 });
departmentSchema.index({ status: 1 });
departmentSchema.index({ parentDepartment: 1 });

// Virtual for full department path
departmentSchema.virtual('fullPath').get(function() {
  // This would be populated with the full hierarchy path
  return this.name; // Simplified for now
});

// Method to add child department
departmentSchema.methods.addChildDepartment = function(childDepartmentId) {
  if (!this.childDepartments.includes(childDepartmentId)) {
    this.childDepartments.push(childDepartmentId);
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to remove child department
departmentSchema.methods.removeChildDepartment = function(childDepartmentId) {
  this.childDepartments = this.childDepartments.filter(id => !id.equals(childDepartmentId));
  return this.save();
};

// Method to update stats
departmentSchema.methods.updateStats = function(statsData) {
  Object.assign(this.stats, statsData);
  this.stats.lastActivity = new Date();
  return this.save();
};

// Static method to find departments by tenant
departmentSchema.statics.findByTenant = function(tenantId, includeInactive = false) {
  const query = { tenantId };
  if (!includeInactive) {
    query.status = 'active';
  }
  
  return this.find(query)
    .populate('departmentHead', 'fullName email')
    .populate('parentDepartment', 'name code')
    .sort({ name: 1 });
};

// Static method to get department hierarchy
departmentSchema.statics.getHierarchy = function(tenantId) {
  return this.find({ tenantId, status: 'active' })
    .populate('departmentHead', 'fullName email')
    .populate('parentDepartment', 'name code')
    .sort({ name: 1 });
};

// Static method to get department statistics
departmentSchema.statics.getStatistics = function(tenantId) {
  return this.aggregate([
    {
      $match: {
        tenantId: mongoose.Types.ObjectId(tenantId),
        status: 'active'
      }
    },
    {
      $group: {
        _id: null,
        totalDepartments: { $sum: 1 },
        totalUsers: { $sum: '$stats.totalUsers' },
        activeUsers: { $sum: '$stats.activeUsers' },
        totalSessions: { $sum: '$stats.totalSessions' },
        totalDataSize: { $sum: '$stats.dataSize' }
      }
    }
  ]);
};

module.exports = mongoose.model('Department', departmentSchema);
