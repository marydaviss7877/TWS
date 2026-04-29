const mongoose = require('mongoose');

const formTemplateSchema = new mongoose.Schema({
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    required: true,
    default: 'general',
    index: true
  },
  fields: {
    type: [mongoose.Schema.Types.Mixed],
    default: []
  },
  settings: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  views: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true
});

formTemplateSchema.index({ orgId: 1, category: 1, isActive: 1, createdAt: -1 });

module.exports = mongoose.models.FormTemplate || mongoose.model('FormTemplate', formTemplateSchema);

