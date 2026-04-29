/**
 * Document Hub – Tag/label per organization
 * Org-scoped; reusable across documents
 */
const mongoose = require('mongoose');

const documentTagSchema = new mongoose.Schema({
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
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 80
  },
  /** Optional color for UI (hex or name) */
  color: {
    type: String,
    default: null,
    maxlength: 30
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: false });

documentTagSchema.index({ orgId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('DocumentTag', documentTagSchema);
