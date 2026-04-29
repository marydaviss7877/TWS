const mongoose = require('mongoose');

const projectTemplateSchema = new mongoose.Schema({
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  category: {
    type: String,
    enum: ['web_development', 'mobile_app', 'marketing_campaign', 'design_project', 'consulting', 'other'],
    default: 'other'
  },
  industry: String,
  isPublic: {
    type: Boolean,
    default: false
  },
  template: {
    boards: [{
      name: String,
      type: {
        type: String,
        enum: ['main', 'sprint', 'design', 'qa', 'client_review', 'custom'],
        default: 'main'
      },
      order: Number,
      lists: [{
        name: String,
        order: Number,
        color: String,
        settings: {
          wipLimit: {
            enabled: Boolean,
            limit: Number
          },
          requireApproval: Boolean,
          clientVisible: Boolean
        }
      }]
    }],
    defaultCards: [{
      title: String,
      description: String,
      listName: String,
      priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
      },
      labels: [{
        name: String,
        color: String
      }],
      checklists: [{
        title: String,
        items: [String]
      }],
      estimatedHours: Number
    }],
    settings: {
      allowClientAccess: Boolean,
      clientCanComment: Boolean,
      clientCanApprove: Boolean,
      requireApproval: Boolean
    }
  },
  usageCount: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tags: [String],
  status: {
    type: String,
    enum: ['draft', 'active', 'archived'],
    default: 'draft'
  }
}, {
  timestamps: true
});

// Index for performance
projectTemplateSchema.index({ orgId: 1, category: 1 });
projectTemplateSchema.index({ orgId: 1, isPublic: 1 });
projectTemplateSchema.index({ createdBy: 1 });

module.exports = mongoose.model('ProjectTemplate', projectTemplateSchema);
