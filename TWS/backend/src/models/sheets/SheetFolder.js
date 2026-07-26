/**
 * Sheets Hub – Folder (hierarchy) per organization
 * Org-scoped; kept separate from DocumentFolder to keep the two modules decoupled.
 */
const mongoose = require('mongoose');

const sheetFolderSchema = new mongoose.Schema({
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
    ref: 'SheetFolder',
    default: null,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 255
  },
  /** 'org' = org Sheets Hub; 'employee' = employee my-sheets (ownerId required) */
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

sheetFolderSchema.index({ orgId: 1, parentId: 1, name: 1 });
sheetFolderSchema.index({ orgId: 1, scope: 1, ownerId: 1 });

module.exports = mongoose.model('SheetFolder', sheetFolderSchema);
