/**
 * Document Hub – Comment on a document
 * Simple thread: documentId + userId + content
 */
const mongoose = require('mongoose');

const orgDocumentCommentSchema = new mongoose.Schema({
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
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 5000
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

orgDocumentCommentSchema.index({ documentId: 1, createdAt: 1 });

module.exports = mongoose.model('OrgDocumentComment', orgDocumentCommentSchema);
