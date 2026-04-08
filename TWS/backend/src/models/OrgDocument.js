/**
 * Document Hub – Document (created or uploaded) per organization
 * Org-scoped; type = 'created' (BlockNote) or 'uploaded' (file in S3)
 */
const mongoose = require('mongoose');

const orgDocumentSchema = new mongoose.Schema({
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
  /** Template id when created from template (e.g. proposal, contract) */
  templateId: {
    type: String,
    default: null,
    index: true
  },
  /** BlockNote JSON; only for type=created */
  content: {
    type: mongoose.Schema.Types.Mixed,
    default: null
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
    ref: 'DocumentFolder',
    default: null,
    index: true
  },
  tags: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DocumentTag'
  }],
  status: {
    type: String,
    enum: ['draft', 'in_review', 'approved', 'archived'],
    default: 'draft',
    index: true
  },
  /** Set when status becomes in_review (for 7/14-day timeout job) */
  submittedForReviewAt: {
    type: Date,
    default: null,
    index: true
  },
  /** Optional: document's department for reviewer resolution (Dept Head + Senior) */
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    default: null,
    index: true
  },
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

orgDocumentSchema.index({ orgId: 1, deletedAt: 1, status: 1, updatedAt: -1 });
orgDocumentSchema.index({ orgId: 1, folderId: 1, deletedAt: 1 });
orgDocumentSchema.index({ orgId: 1, 'tags': 1, deletedAt: 1 });
orgDocumentSchema.index({ orgId: 1, templateId: 1, deletedAt: 1 });

module.exports = mongoose.model('OrgDocument', orgDocumentSchema);
