/**
 * Document Hub – Version snapshot for created documents (BlockNote)
 * Used for version history and restore
 */
const mongoose = require('mongoose');

const orgDocumentVersionSchema = new mongoose.Schema({
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
  content: {
    type: mongoose.Schema.Types.Mixed,
    required: true
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

orgDocumentVersionSchema.index({ documentId: 1, versionNumber: -1 });

module.exports = mongoose.model('OrgDocumentVersion', orgDocumentVersionSchema);
