/**
 * Sheets Hub – Version snapshot for created sheets (Univer IWorkbookData)
 * Used for version history and restore. contentKey points at the snapshot's S3 blob —
 * versions are NOT throttled to create-on-every-autosave; see sheetsHub.service.js.
 */
const mongoose = require('mongoose');

const orgSheetVersionSchema = new mongoose.Schema({
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
  versionNumber: {
    type: Number,
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  contentKey: {
    type: String,
    required: true
  },
  sizeBytes: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: false });

orgSheetVersionSchema.index({ sheetId: 1, versionNumber: -1 });
orgSheetVersionSchema.index({ sheetId: 1, createdAt: -1 });

module.exports = mongoose.model('OrgSheetVersion', orgSheetVersionSchema);
