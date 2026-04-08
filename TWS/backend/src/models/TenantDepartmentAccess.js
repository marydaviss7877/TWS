const mongoose = require('mongoose');

/**
 * Tenant-scoped department access (Plan Phase 1).
 * Granted by tenant admins (CEO, HR, Dept Head); not Supra-admin.
 * Used for "user's departments" and ERP visibility. Supports expiry for contractors/auditors.
 */
const tenantDepartmentAccessSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  department: { type: String, trim: true }, // denormalized for queries
  permissions: [{
    type: String,
    enum: ['read', 'write', 'admin', 'delete', 'manage_users', 'view_analytics', 'export_data']
  }],
  accessLevel: {
    type: String,
    enum: ['viewer', 'contributor', 'editor', 'admin', 'owner'],
    default: 'viewer'
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'revoked', 'expired'],
    default: 'active'
  },
  grantedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date },
  grantedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  revokedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  revokedAt: Date,
  revocationReason: String,
  auditLog: [{
    action: { type: String, enum: ['granted', 'modified', 'suspended', 'revoked', 'expired'] },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date, default: Date.now },
    details: mongoose.Schema.Types.Mixed
  }]
}, { timestamps: true });

tenantDepartmentAccessSchema.index({ tenantId: 1, userId: 1 });
tenantDepartmentAccessSchema.index({ tenantId: 1, departmentId: 1, status: 1 });
tenantDepartmentAccessSchema.index({ userId: 1, status: 1 });
tenantDepartmentAccessSchema.index({ expiresAt: 1 });

tenantDepartmentAccessSchema.virtual('isExpired').get(function () {
  return this.expiresAt && this.expiresAt < new Date();
});

tenantDepartmentAccessSchema.virtual('isActive').get(function () {
  return this.status === 'active' && !this.isExpired;
});

tenantDepartmentAccessSchema.statics.findActiveForUser = function (tenantId, userId) {
  return this.find({
    tenantId,
    userId,
    status: 'active',
    $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: new Date() } }]
  })
    .populate('departmentId', 'name code')
    .lean();
};

tenantDepartmentAccessSchema.statics.cleanupExpired = function () {
  return this.updateMany(
    { status: 'active', expiresAt: { $lt: new Date() } },
    { status: 'expired' }
  );
};

tenantDepartmentAccessSchema.methods.revoke = function (revokedBy, reason) {
  this.status = 'revoked';
  this.revokedBy = revokedBy;
  this.revokedAt = new Date();
  this.revocationReason = reason;
  this.auditLog.push({ action: 'revoked', performedBy: revokedBy, details: { reason } });
  return this.save();
};

tenantDepartmentAccessSchema.methods.suspend = function (suspendedBy, reason) {
  this.status = 'suspended';
  this.auditLog.push({ action: 'suspended', performedBy: suspendedBy, details: { reason } });
  return this.save();
};

module.exports = mongoose.model('TenantDepartmentAccess', tenantDepartmentAccessSchema);
