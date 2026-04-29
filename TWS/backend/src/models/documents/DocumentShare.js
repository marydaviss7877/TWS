/**
 * Document Hub – Share document with a user (view or edit)
 */
const mongoose = require('mongoose');

const documentShareSchema = new mongoose.Schema({
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
  permission: {
    type: String,
    enum: ['view', 'edit'],
    default: 'view'
  },
  sharedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

documentShareSchema.index({ documentId: 1, userId: 1 }, { unique: true });
documentShareSchema.index({ orgId: 1, userId: 1 });

module.exports = mongoose.model('DocumentShare', documentShareSchema);
