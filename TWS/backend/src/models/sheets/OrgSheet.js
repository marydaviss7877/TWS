/**
 * Sheets Hub – Spreadsheet (created or uploaded) per organization
 * Org-scoped; type = 'created' (Univer IWorkbookData, stored in S3 via contentKey) or 'uploaded' (file in S3)
 *
 * Content is NEVER stored inline (Mixed) here — Univer's IWorkbookData JSON is verbose enough that a
 * multi-thousand-cell sheet can approach Mongo's 16MB document cap. contentKey points at the current
 * JSON blob in S3 instead; contentSize mirrors fileSize's role in storage-quota accounting.
 */
const mongoose = require('mongoose');

const orgSheetSchema = new mongoose.Schema({
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['created', 'uploaded'],
    required: true,
    default: 'created'
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500,
    default: 'Untitled'
  },
  /** Template id when created from template (e.g. blank) */
  templateId: {
    type: String,
    default: null,
    index: true
  },
  /** S3 key for the current Univer IWorkbookData JSON blob; only for type=created */
  contentKey: {
    type: String,
    default: null
  },
  /** Size in bytes of the content blob at contentKey (for storage-quota accounting) */
  contentSize: {
    type: Number,
    default: 0
  },
  /** Optimistic-locking counter; incremented on every successful content write */
  revision: {
    type: Number,
    default: 0
  },
  /** S3 key for uploads; only for type=uploaded */
  fileKey: {
    type: String,
    default: null,
    index: true
  },
  /** Original filename for uploads */
  fileName: {
    type: String,
    default: null
  },
  /** MIME type for uploads */
  mimeType: {
    type: String,
    default: null
  },
  /** File size in bytes for uploads */
  fileSize: {
    type: Number,
    default: null
  },
  folderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SheetFolder',
    default: null,
    index: true
  },
  tags: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SheetTag'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  /** Assigned to (single user) */
  assigneeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  /** Soft delete */
  deletedAt: {
    type: Date,
    default: null,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

orgSheetSchema.index({ orgId: 1, deletedAt: 1, updatedAt: -1 });
orgSheetSchema.index({ orgId: 1, folderId: 1, deletedAt: 1 });
orgSheetSchema.index({ orgId: 1, 'tags': 1, deletedAt: 1 });
orgSheetSchema.index({ orgId: 1, templateId: 1, deletedAt: 1 });

module.exports = mongoose.model('OrgSheet', orgSheetSchema);
