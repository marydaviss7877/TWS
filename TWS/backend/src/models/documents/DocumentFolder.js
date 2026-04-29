/**
 * Document Hub – Folder (hierarchy) per organization
 * Org-scoped; used for both org Document Hub and (later) employee "my docs" when scope = employee
 */
const mongoose = require('mongoose');

const documentFolderSchema = new mongoose.Schema({
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
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DocumentFolder',
    default: null,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 255
  },
  /** 'org' = org Document Hub; 'employee' = employee my-docs (ownerId required) */
  scope: {
    type: String,
    enum: ['org', 'employee'],
    default: 'org'
  },
  /** For scope=employee, folder belongs to this user */
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
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

documentFolderSchema.index({ orgId: 1, parentId: 1, name: 1 });
documentFolderSchema.index({ orgId: 1, scope: 1, ownerId: 1 });

module.exports = mongoose.model('DocumentFolder', documentFolderSchema);
