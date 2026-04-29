const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  description: {
    type: String,
    required: false,
    trim: true
  },
  
  // Permissions - Array of permission codes
  permissions: [{
    type: String,
    trim: true
  }],
  
  // Tenant Information
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: false // Allow null for global roles
  },
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: false // Allow null for global roles
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for performance
roleSchema.index({ slug: 1, tenantId: 1 }, { unique: true, sparse: true });
roleSchema.index({ slug: 1, orgId: 1 }, { unique: true, sparse: true });
roleSchema.index({ tenantId: 1 });
roleSchema.index({ orgId: 1 });
roleSchema.index({ isActive: 1 });
roleSchema.index({ name: 1 });

// Pre-save middleware
roleSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Method to generate slug from name
roleSchema.statics.generateSlug = function(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// Static method to find roles by tenant
roleSchema.statics.findByTenant = function(tenantId, includeInactive = false) {
  const query = { tenantId };
  if (!includeInactive) {
    query.isActive = true;
  }
  
  return this.find(query)
    .sort({ name: 1 });
};

// Static method to find roles by organization
roleSchema.statics.findByOrganization = function(orgId, includeInactive = false) {
  const query = { orgId };
  if (!includeInactive) {
    query.isActive = true;
  }
  
  return this.find(query)
    .sort({ name: 1 });
};

module.exports = mongoose.model('Role', roleSchema);

