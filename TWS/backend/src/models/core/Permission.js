const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
  // Basic Information
  code: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  permissionGroup: {
    type: String,
    required: false,
    trim: true
  },
  
  // Tenant Information (optional - can be global permissions)
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: false
  },
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: false
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
permissionSchema.index({ code: 1, tenantId: 1 }, { unique: true, sparse: true });
permissionSchema.index({ code: 1, orgId: 1 }, { unique: true, sparse: true });
permissionSchema.index({ tenantId: 1 });
permissionSchema.index({ orgId: 1 });
permissionSchema.index({ isActive: 1 });
permissionSchema.index({ permissionGroup: 1 });

// Pre-save middleware
permissionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static method to find permissions by tenant
permissionSchema.statics.findByTenant = function(tenantId, includeInactive = false) {
  const query = { tenantId };
  if (!includeInactive) {
    query.isActive = true;
  }
  
  return this.find(query)
    .sort({ code: 1 });
};

// Static method to find permissions by organization
permissionSchema.statics.findByOrganization = function(orgId, includeInactive = false) {
  const query = { orgId };
  if (!includeInactive) {
    query.isActive = true;
  }
  
  return this.find(query)
    .sort({ code: 1 });
};

module.exports = mongoose.model('Permission', permissionSchema);

