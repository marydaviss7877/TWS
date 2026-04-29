const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * TWS Platform Administrator Model
 * Manages the entire TWS platform (renamed from SupraAdmin/GTSAdmin)
 */
const twsAdminSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['platform_super_admin', 'platform_admin', 'platform_support', 'platform_billing', 'platform_analyst', 'platform_developer'],
    default: 'platform_admin'
  },
  permissions: {
    tenantManagement: {
      type: Boolean,
      default: true
    },
    billingManagement: {
      type: Boolean,
      default: true
    },
    userManagement: {
      type: Boolean,
      default: true
    },
    systemSettings: {
      type: Boolean,
      default: false
    },
    analytics: {
      type: Boolean,
      default: true
    },
    erpManagement: {
      type: Boolean,
      default: true
    },
    masterERPTemplates: {
      type: Boolean,
      default: true
    }
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'inactive'],
    default: 'active'
  },
  twoFAEnabled: {
    type: Boolean,
    default: false
  },
  twoFASecret: {
    type: String,
    select: false
  },
  lastLogin: {
    type: Date
  },
  profilePicUrl: {
    type: String
  },
  phone: {
    type: String
  },
  department: {
    type: String,
    default: 'Platform Administration'
  },
  refreshTokens: [{
    token: String,
    createdAt: {
      type: Date,
      default: Date.now,
      expires: '7d'
    }
  }],
  activityLog: [{
    action: String,
    details: String,
    tenantId: String, // Track which tenant the action was performed on
    timestamp: {
      type: Date,
      default: Date.now
    },
    ipAddress: String,
    userAgent: String
  }],
  // Platform-level settings
  platformSettings: {
    maxTenants: {
      type: Number,
      default: 1000
    },
    defaultTrialDays: {
      type: Number,
      default: 30
    },
    systemMaintenanceMode: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

// Index for performance
twsAdminSchema.index({ email: 1 });
twsAdminSchema.index({ role: 1 });
twsAdminSchema.index({ status: 1 });

// Hash password before saving
twsAdminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
twsAdminSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Log activity method
twsAdminSchema.methods.logActivity = function(action, details, tenantId, ipAddress, userAgent) {
  this.activityLog.push({
    action,
    details,
    tenantId,
    timestamp: new Date(),
    ipAddress,
    userAgent
  });
  
  // Keep only last 100 activities
  if (this.activityLog.length > 100) {
    this.activityLog = this.activityLog.slice(-100);
  }
  
  return this.save();
};

// Check if admin has specific permission
twsAdminSchema.methods.hasPermission = function(permission) {
  if (this.role === 'platform_super_admin') {
    return true; // Super admin has all permissions
  }
  return this.permissions[permission] === true;
};

// Get admin level (for hierarchy)
twsAdminSchema.methods.getAdminLevel = function() {
  const levels = {
    'platform_super_admin': 100,
    'platform_admin': 80,
    'platform_support': 60,
    'platform_billing': 40
  };
  return levels[this.role] || 0;
};

// Remove sensitive data from JSON output
twsAdminSchema.methods.toJSON = function() {
  const admin = this.toObject();
  delete admin.password;
  delete admin.refreshTokens;
  delete admin.twoFASecret;
  return admin;
};

module.exports = mongoose.model('TWSAdmin', twsAdminSchema);
