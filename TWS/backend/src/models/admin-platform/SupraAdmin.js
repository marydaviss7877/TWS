const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const supraAdminSchema = new mongoose.Schema({
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
    enum: ['super_admin', 'admin', 'support', 'billing'],
    default: 'admin'
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
    timestamp: {
      type: Date,
      default: Date.now
    },
    ipAddress: String,
    userAgent: String
  }]
}, {
  timestamps: true
});

// Index for performance
supraAdminSchema.index({ email: 1 });
supraAdminSchema.index({ role: 1 });
supraAdminSchema.index({ status: 1 });

// Hash password before saving
supraAdminSchema.pre('save', async function(next) {
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
supraAdminSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Log activity method
supraAdminSchema.methods.logActivity = function(action, details, ipAddress, userAgent) {
  this.activityLog.push({
    action,
    details,
    ipAddress,
    userAgent
  });
  
  // Keep only last 100 activities
  if (this.activityLog.length > 100) {
    this.activityLog = this.activityLog.slice(-100);
  }
  
  return this.save();
};

// Remove sensitive data from JSON output
supraAdminSchema.methods.toJSON = function() {
  const admin = this.toObject();
  delete admin.password;
  delete admin.refreshTokens;
  delete admin.twoFASecret;
  return admin;
};

module.exports = mongoose.model('SupraAdmin', supraAdminSchema);
