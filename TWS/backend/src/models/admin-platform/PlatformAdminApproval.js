/**
 * Platform Admin Approval Model
 * Tracks approvals for platform admin access to sensitive tenants
 */

const mongoose = require('mongoose');

const platformAdminApprovalSchema = new mongoose.Schema({
  // Platform admin requesting access
  platformAdminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TWSAdmin',
    required: true,
    index: true
  },
  platformAdminEmail: {
    type: String,
    required: true
  },
  platformAdminName: {
    type: String,
    required: true
  },
  
  // Tenant being accessed
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },
  tenantName: {
    type: String,
    required: true
  },
  
  // Access details
  reason: {
    type: String,
    required: true,
    enum: [
      'support_troubleshooting',
      'billing_dispute',
      'security_incident',
      'data_migration',
      'compliance_audit',
      'legal_request',
      'system_maintenance',
      'onboarding_assistance'
    ]
  },
  justification: {
    type: String,
    required: true,
    minlength: 20 // Require meaningful justification
  },
  
  // Approval workflow
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'expired', 'revoked'],
    default: 'pending',
    index: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TWSAdmin'
  },
  approvedAt: Date,
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TWSAdmin'
  },
  rejectedAt: Date,
  rejectionReason: String,
  
  // Access session
  accessGranted: {
    type: Boolean,
    default: false
  },
  accessGrantedAt: Date,
  accessExpiresAt: Date,
  
  // Metadata
  ipAddress: String,
  userAgent: String,
  endpoint: String,
  method: String,
  
  // Audit
  revokedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TWSAdmin'
  },
  revokedAt: Date,
  revocationReason: String
}, {
  timestamps: true
});

// Indexes for performance
platformAdminApprovalSchema.index({ platformAdminId: 1, status: 1 });
platformAdminApprovalSchema.index({ tenantId: 1, status: 1 });
platformAdminApprovalSchema.index({ status: 1, createdAt: -1 });
platformAdminApprovalSchema.index({ accessExpiresAt: 1 });

// Virtual for checking if approval is active
platformAdminApprovalSchema.virtual('isActive').get(function() {
  if (this.status !== 'approved') return false;
  if (this.accessExpiresAt && new Date() > this.accessExpiresAt) return false;
  return true;
});

// Method to check if approval is expired
platformAdminApprovalSchema.methods.isExpired = function() {
  if (this.status === 'expired') return true;
  if (this.accessExpiresAt && new Date() > this.accessExpiresAt) {
    this.status = 'expired';
    return true;
  }
  return false;
};

// Method to revoke approval
platformAdminApprovalSchema.methods.revoke = function(revokedBy, reason) {
  this.status = 'revoked';
  this.revokedBy = revokedBy;
  this.revokedAt = new Date();
  this.revocationReason = reason;
  return this.save();
};

module.exports = mongoose.model('PlatformAdminApproval', platformAdminApprovalSchema);
