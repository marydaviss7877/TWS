/**
 * Tenant-facing audit log (Plan Phase 2, §10).
 * Who accessed what, when — for CEO/Dept Head. Tenant-scoped only.
 */
const mongoose = require('mongoose');

const tenantAuditLogSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  action: { type: String, required: true, index: true },
  resourceType: { type: String, required: true, index: true },
  resourceId: { type: String, index: true },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  ip: String,
  userAgent: String,
  metadata: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now, index: true }
}, { timestamps: false });

tenantAuditLogSchema.index({ tenantId: 1, createdAt: -1 });
tenantAuditLogSchema.index({ tenantId: 1, userId: 1, createdAt: -1 });
tenantAuditLogSchema.index({ tenantId: 1, resourceType: 1, createdAt: -1 });

tenantAuditLogSchema.statics.logEvent = function (opts) {
  const { tenantId, orgId, userId, action, resourceType, resourceId, departmentId, ip, userAgent, metadata } = opts;
  return this.create({
    tenantId,
    orgId,
    userId: userId || null,
    action,
    resourceType,
    resourceId: resourceId ? String(resourceId) : undefined,
    departmentId,
    ip,
    userAgent,
    metadata: metadata || {}
  });
};

module.exports = mongoose.model('TenantAuditLog', tenantAuditLogSchema);
