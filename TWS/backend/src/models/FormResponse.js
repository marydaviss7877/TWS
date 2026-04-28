const mongoose = require('mongoose');

const formResponseSchema = new mongoose.Schema({
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  formId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FormTemplate',
    required: true,
    index: true
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  status: {
    type: String,
    enum: ['submitted', 'in-review', 'accepted', 'rejected'],
    default: 'submitted'
  }
}, {
  timestamps: true
});

formResponseSchema.index({ orgId: 1, formId: 1, createdAt: -1 });

module.exports = mongoose.models.FormResponse || mongoose.model('FormResponse', formResponseSchema);

