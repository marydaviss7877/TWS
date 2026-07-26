/**
 * Sheets Hub – Audit trail: view, edit, import/export events
 * Supports compliance and "who did what". No approval-workflow actions (Sheets has no review workflow).
 */
const mongoose = require('mongoose');

const orgSheetAuditSchema = new mongoose.Schema({
  sheetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'OrgSheet',
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
    enum: ['created', 'edited', 'deleted', 'restored', 'exported_xlsx', 'imported_xlsx'],
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  comment: {
    type: String,
    default: null,
    maxlength: 2000
  },
  /** Snapshot of metadata at event time */
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: false });

orgSheetAuditSchema.index({ sheetId: 1, createdAt: -1 });
orgSheetAuditSchema.index({ orgId: 1, createdAt: -1 });
orgSheetAuditSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('OrgSheetAudit', orgSheetAuditSchema);
