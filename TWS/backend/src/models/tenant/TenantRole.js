const mongoose = require('mongoose');

const tenantRoleSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  role: {
    type: String,
    enum: ['TENANT_ADMIN', 'USER', 'VIEWER', 'HR', 'FINANCE', 'MANAGER', 'EMPLOYEE'],
    required: true,
    default: 'USER'
  },
  assignedAt: {
    type: Date,
    default: Date.now
  },
  assignedBy: {
    type: String, // 'SYSTEM' or admin user ID
    default: 'SYSTEM'
  },
  permissions: [{
    type: String
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  deactivatedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Compound unique index - one role per user per tenant
tenantRoleSchema.index({ tenantId: 1, userId: 1 }, { unique: true });
tenantRoleSchema.index({ userId: 1, isActive: 1 });
tenantRoleSchema.index({ tenantId: 1, role: 1 });

// Method to deactivate role
tenantRoleSchema.methods.deactivate = function() {
  this.isActive = false;
  this.deactivatedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('TenantRole', tenantRoleSchema);
