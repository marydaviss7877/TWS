/**
 * Sheets Hub – Share sheet with a user (view or edit)
 */
const mongoose = require('mongoose');

const sheetShareSchema = new mongoose.Schema({
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

sheetShareSchema.index({ sheetId: 1, userId: 1 }, { unique: true });
sheetShareSchema.index({ orgId: 1, userId: 1 });

module.exports = mongoose.model('SheetShare', sheetShareSchema);
