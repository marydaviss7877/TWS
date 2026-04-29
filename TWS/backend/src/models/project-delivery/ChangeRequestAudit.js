const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * ChangeRequestAudit Model - Immutable audit trail for change requests
 * Tracks all actions on change requests (submitted, acknowledged, recommended, decided)
 */
const ChangeRequestAuditSchema = new Schema({
  change_request_id: {
    type: Schema.Types.ObjectId,
    ref: 'ChangeRequest',
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true,
    enum: ['submitted', 'acknowledged', 'recommended', 'decided'],
    index: true
  },
  actor: {
    type: String, // user._id or client email
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  details: {
    type: String
  },
  // Additional context
  metadata: {
    type: Schema.Types.Mixed
  },
  // Multi-tenancy
  orgId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  tenantId: {
    type: String,
    required: true,
    index: true
  }
}, {
  timestamps: true
});

// Indexes
ChangeRequestAuditSchema.index({ change_request_id: 1, timestamp: -1 });
ChangeRequestAuditSchema.index({ orgId: 1, change_request_id: 1 });
ChangeRequestAuditSchema.index({ tenantId: 1, change_request_id: 1 });

/**
 * Static method to get audit trail for a change request
 */
ChangeRequestAuditSchema.statics.getAuditTrail = function(changeRequestId) {
  return this.find({ change_request_id: changeRequestId })
    .sort({ timestamp: -1 });
};

/**
 * Static method to log an audit event
 */
ChangeRequestAuditSchema.statics.logEvent = async function(changeRequestId, action, actor, details, metadata, orgId, tenantId) {
  return this.create({
    change_request_id: changeRequestId,
    action,
    actor,
    details,
    metadata,
    orgId,
    tenantId
  });
};

module.exports = mongoose.model('ChangeRequestAudit', ChangeRequestAuditSchema);
