const mongoose = require('mongoose');

const tenantUserSchema = new mongoose.Schema({
  // Reference to the main user
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Reference to the tenant
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  
  // Tenant-specific user information
  tenantSpecificInfo: {
    employeeId: String,
    department: String,
    jobTitle: String,
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TenantUser'
    },
    hireDate: Date,
    salary: Number,
    currency: {
      type: String,
      default: 'USD'
    }
  },
  
  // Tenant-specific roles and permissions (per-tenant; used for ERP access when present)
  roles: [{
    role: {
      type: String,
      enum: ['owner', 'admin', 'manager', 'project_manager', 'hr', 'finance', 'employee', 'client', 'contractor'],
      required: true
    },
    permissions: [{
      resource: String,
      actions: [String] // ['read', 'write', 'delete', 'admin']
    }],
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TenantUser'
    },
    assignedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Tenant-specific settings
  settings: {
    timezone: {
      type: String,
      default: 'UTC'
    },
    language: {
      type: String,
      default: 'en'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: false
      }
    },
    preferences: {
      theme: {
        type: String,
        enum: ['light', 'dark', 'auto'],
        default: 'light'
      },
      dashboard: {
        type: String,
        enum: ['default', 'custom'],
        default: 'default'
      }
    }
  },
  
  // Status within this tenant
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'pending'],
    default: 'pending'
  },

  // HR sub-role (Plan Phase 2): only when primary role is 'hr'. Determines payroll vs leave vs roster access.
  // Intentionally no default: when omitted the field stays undefined and enum validation is skipped (non-HR roles do not set hrSubRole).
  hrSubRole: {
    type: String,
    enum: ['manager', 'executive', 'payroll_officer']
  },

  // Finance sub-role (UPR): only when primary role is 'finance'
  financeSubRole: {
    type: String,
    enum: ['manager', 'accountant', 'analyst', 'ap_officer', 'ar_officer']
  },

  // Access control
  accessLevel: {
    type: String,
    enum: ['full', 'limited', 'readonly', 'guest'],
    default: 'limited'
  },
  
  // Invitation information
  invitation: {
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TenantUser'
    },
    invitedAt: {
      type: Date,
      default: Date.now
    },
    invitationToken: String,
    invitationExpires: Date,
    acceptedAt: Date
  },
  
  // Last activity within this tenant
  lastActivity: {
    type: Date,
    default: Date.now
  },
  
  // Tenant-specific data
  metadata: {
    customFields: mongoose.Schema.Types.Mixed,
    tags: [String],
    notes: String
  }
}, {
  timestamps: true
});

// Index for performance
tenantUserSchema.index({ userId: 1, tenantId: 1 }, { unique: true });
tenantUserSchema.index({ tenantId: 1, status: 1 });
tenantUserSchema.index({ userId: 1, status: 1 });
tenantUserSchema.index({ 'invitation.invitationToken': 1 });

// Virtual for primary role
tenantUserSchema.virtual('primaryRole').get(function() {
  return this.roles.length > 0 ? this.roles[0].role : 'employee';
});

// Virtual for permissions
tenantUserSchema.virtual('allPermissions').get(function() {
  const permissions = new Set();
  this.roles.forEach(role => {
    role.permissions.forEach(perm => {
      perm.actions.forEach(action => {
        permissions.add(`${perm.resource}:${action}`);
      });
    });
  });
  return Array.from(permissions);
});

// Method to check if user has permission
tenantUserSchema.methods.hasPermission = function(resource, action) {
  return this.allPermissions.includes(`${resource}:${action}`);
};

// Method to check if user has role
tenantUserSchema.methods.hasRole = function(role) {
  return this.roles.some(r => r.role === role);
};

// Method to add role
tenantUserSchema.methods.addRole = function(role, permissions, assignedBy) {
  this.roles.push({
    role,
    permissions,
    assignedBy,
    assignedAt: new Date()
  });
  return this.save();
};

// Method to remove role
tenantUserSchema.methods.removeRole = function(role) {
  this.roles = this.roles.filter(r => r.role !== role);
  return this.save();
};

// Method to update last activity
tenantUserSchema.methods.updateActivity = function() {
  this.lastActivity = new Date();
  return this.save();
};

// Static method to get user's tenants
tenantUserSchema.statics.getUserTenants = function(userId) {
  return this.find({ userId, status: 'active' })
    .populate('tenantId', 'name slug status subscription.plan')
    .sort({ lastActivity: -1 });
};

// Static method to get tenant users
tenantUserSchema.statics.getTenantUsers = function(tenantId) {
  return this.find({ tenantId, status: 'active' })
    .populate('userId', 'fullName email profilePicUrl')
    .sort({ createdAt: -1 });
};

// Static method to invite user to tenant
tenantUserSchema.statics.inviteUser = async function(userId, tenantId, invitedBy, role = 'employee') {
  const existingInvitation = await this.findOne({ userId, tenantId });
  
  if (existingInvitation) {
    if (existingInvitation.status === 'pending') {
      return existingInvitation; // Already invited
    }
    if (existingInvitation.status === 'active') {
      throw new Error('User is already a member of this tenant');
    }
  }
  
  const invitationToken = require('crypto').randomBytes(32).toString('hex');
  const invitationExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  
  const tenantUser = new this({
    userId,
    tenantId,
    roles: [{
      role,
      permissions: [],
      assignedBy: invitedBy,
      assignedAt: new Date()
    }],
    status: 'pending',
    invitation: {
      invitedBy,
      invitationToken,
      invitationExpires
    }
  });
  
  return tenantUser.save();
};

// Static method to accept invitation
tenantUserSchema.statics.acceptInvitation = async function(token) {
  const tenantUser = await this.findOne({
    'invitation.invitationToken': token,
    'invitation.invitationExpires': { $gt: new Date() },
    status: 'pending'
  }).populate('tenantId userId');
  
  if (!tenantUser) {
    throw new Error('Invalid or expired invitation');
  }
  
  tenantUser.status = 'active';
  tenantUser.invitation.acceptedAt = new Date();
  tenantUser.lastActivity = new Date();
  
  return tenantUser.save();
};

module.exports = mongoose.model('TenantUser', tenantUserSchema);
