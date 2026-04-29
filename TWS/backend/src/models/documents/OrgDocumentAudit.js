/**
 * Document Hub – Audit trail: view, edit, approval events
 * Supports compliance and "who did what"
 */
const mongoose = require('mongoose');

const orgDocumentAuditSchema = new mongoose.Schema({
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'OrgDocument',
    required: true,
    index: true
  },
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  action: {
    type: String,
    enum: ['viewed', 'created', 'edited', 'submitted_for_review', 'approved', 'rejected', 'archived', 'restored', 'deleted'],
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  /** Optional comment (e.g. rejection reason, approval note) */
  comment: {
    type: String,
    default: null,
    maxlength: 2000
  },
  /** Snapshot of metadata at event time (e.g. status before/after) */
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: false });

orgDocumentAuditSchema.index({ documentId: 1, createdAt: -1 });
orgDocumentAuditSchema.index({ orgId: 1, createdAt: -1 });
orgDocumentAuditSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('OrgDocumentAudit', orgDocumentAuditSchema);
