const mongoose = require('mongoose');

const clientTouchpointSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  
  // Touchpoint Details
  type: {
    type: String,
    enum: [
      'email', 'phone', 'meeting', 'portal_login', 'project_update', 
      'support_ticket', 'invoice_sent', 'payment_received', 'survey_response',
      'contract_renewal', 'complaint', 'praise', 'escalation', 'other'
    ],
    required: true
  },
  
  category: {
    type: String,
    enum: ['communication', 'project', 'billing', 'support', 'sales', 'marketing'],
    required: true
  },
  
  subject: {
    type: String,
    required: true
  },
  
  description: {
    type: String,
    required: true
  },
  
  // Interaction Details
  direction: {
    type: String,
    enum: ['inbound', 'outbound'],
    required: true
  },
  
  initiatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  participants: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    clientContactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClientContact'
    },
    name: String,
    email: String,
    role: String
  }],
  
  // Project Context
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  
  // Communication Channel
  channel: {
    type: String,
    enum: ['email', 'phone', 'video_call', 'in_person', 'portal', 'chat', 'ticket'],
    required: true
  },
  
  // Duration and Timing
  duration: {
    type: Number, // in minutes
    default: 0
  },
  
  scheduledAt: Date,
  startedAt: Date,
  completedAt: Date,
  
  // Content and Attachments
  content: {
    summary: String,
    keyPoints: [String],
    actionItems: [{
      item: String,
      assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      dueDate: Date,
      status: {
        type: String,
        enum: ['pending', 'in_progress', 'completed', 'cancelled'],
        default: 'pending'
      }
    }],
    attachments: [{
      fileName: String,
      fileUrl: String,
      fileSize: Number,
      mimeType: String
    }]
  },
  
  // Sentiment and Outcome
  sentiment: {
    type: String,
    enum: ['positive', 'neutral', 'negative'],
    default: 'neutral'
  },
  
  satisfaction: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    feedback: String
  },
  
  outcome: {
    type: String,
    enum: ['resolved', 'escalated', 'follow_up_required', 'no_action_needed', 'pending'],
    default: 'pending'
  },
  
  // Follow-up
  followUpRequired: {
    type: Boolean,
    default: false
  },
  
  followUpDate: Date,
  
  followUpNotes: String,
  
  // Tags and Classification
  tags: [String],
  
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // Integration Data
  externalId: String, // For syncing with external systems
  
  source: {
    type: String,
    enum: ['manual', 'email_import', 'calendar_sync', 'portal', 'api', 'webhook'],
    default: 'manual'
  },
  
  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes for performance
clientTouchpointSchema.index({ clientId: 1, createdAt: -1 });
clientTouchpointSchema.index({ orgId: 1, type: 1 });
clientTouchpointSchema.index({ orgId: 1, category: 1 });
clientTouchpointSchema.index({ initiatedBy: 1 });
clientTouchpointSchema.index({ projectId: 1 });
clientTouchpointSchema.index({ scheduledAt: 1 });
clientTouchpointSchema.index({ sentiment: 1 });
clientTouchpointSchema.index({ followUpRequired: 1, followUpDate: 1 });

// Compound indexes
clientTouchpointSchema.index({ clientId: 1, type: 1, createdAt: -1 });
clientTouchpointSchema.index({ orgId: 1, direction: 1, createdAt: -1 });
clientTouchpointSchema.index({ orgId: 1, sentiment: 1, createdAt: -1 });

// Virtual for touchpoint status
clientTouchpointSchema.virtual('status').get(function() {
  if (this.completedAt) return 'completed';
  if (this.startedAt) return 'in_progress';
  if (this.scheduledAt && this.scheduledAt > new Date()) return 'scheduled';
  return 'pending';
});

// Virtual for response time
clientTouchpointSchema.virtual('responseTime').get(function() {
  if (this.direction === 'inbound' && this.completedAt) {
    // Calculate time from when touchpoint was created to when it was completed
    return Math.round((this.completedAt - this.createdAt) / (1000 * 60 * 60)); // hours
  }
  return null;
});

// Pre-save middleware
clientTouchpointSchema.pre('save', function(next) {
  // Auto-set completedAt if not set and duration is provided
  if (!this.completedAt && this.startedAt && this.duration > 0) {
    this.completedAt = new Date(this.startedAt.getTime() + (this.duration * 60 * 1000));
  }
  
  // Auto-set sentiment based on satisfaction rating
  if (this.satisfaction.rating) {
    if (this.satisfaction.rating >= 4) this.sentiment = 'positive';
    else if (this.satisfaction.rating <= 2) this.sentiment = 'negative';
    else this.sentiment = 'neutral';
  }
  
  next();
});

// Method to mark as completed
clientTouchpointSchema.methods.markCompleted = function(notes) {
  this.completedAt = new Date();
  if (notes) {
    this.content.summary = notes;
  }
  return this.save();
};

// Method to add action item
clientTouchpointSchema.methods.addActionItem = function(item, assignedTo, dueDate) {
  this.content.actionItems.push({
    item,
    assignedTo,
    dueDate,
    status: 'pending'
  });
  return this.save();
};

// Method to update action item status
clientTouchpointSchema.methods.updateActionItem = function(itemId, status) {
  const actionItem = this.content.actionItems.id(itemId);
  if (actionItem) {
    actionItem.status = status;
    if (status === 'completed') {
      actionItem.completedAt = new Date();
    }
  }
  return this.save();
};

// Method to add attachment
clientTouchpointSchema.methods.addAttachment = function(fileName, fileUrl, fileSize, mimeType) {
  this.content.attachments.push({
    fileName,
    fileUrl,
    fileSize,
    mimeType
  });
  return this.save();
};

// Method to set follow-up
clientTouchpointSchema.methods.setFollowUp = function(followUpDate, notes) {
  this.followUpRequired = true;
  this.followUpDate = followUpDate;
  if (notes) {
    this.followUpNotes = notes;
  }
  return this.save();
};

// Static method to get touchpoint statistics
clientTouchpointSchema.statics.getStatistics = function(orgId, filters = {}) {
  const pipeline = [
    { $match: { orgId, ...filters } },
    {
      $group: {
        _id: null,
        totalTouchpoints: { $sum: 1 },
        avgSatisfaction: { $avg: '$satisfaction.rating' },
        sentimentDistribution: {
          $push: '$sentiment'
        },
        typeDistribution: {
          $push: '$type'
        },
        avgResponseTime: {
          $avg: {
            $cond: [
              { $and: [{ $eq: ['$direction', 'inbound'] }, { $ne: ['$completedAt', null] }] },
              { $divide: [{ $subtract: ['$completedAt', '$createdAt'] }, 1000 * 60 * 60] },
              null
            ]
          }
        }
      }
    }
  ];
  
  return this.aggregate(pipeline);
};

// Static method to find overdue follow-ups
clientTouchpointSchema.statics.findOverdueFollowUps = function(orgId) {
  return this.find({
    orgId,
    followUpRequired: true,
    followUpDate: { $lte: new Date() },
    'content.actionItems.status': { $in: ['pending', 'in_progress'] }
  }).populate('clientId', 'name email').sort({ followUpDate: 1 });
};

// Static method to get client touchpoint history
clientTouchpointSchema.statics.getClientHistory = function(clientId, limit = 50) {
  return this.find({ clientId })
    .populate('initiatedBy', 'fullName email')
    .populate('projectId', 'name status')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get touchpoints by sentiment
clientTouchpointSchema.statics.getBySentiment = function(orgId, sentiment, limit = 100) {
  return this.find({ orgId, sentiment })
    .populate('clientId', 'name email')
    .populate('initiatedBy', 'fullName email')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get recent touchpoints
clientTouchpointSchema.statics.getRecentTouchpoints = function(orgId, days = 7, limit = 100) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  return this.find({
    orgId,
    createdAt: { $gte: startDate }
  })
    .populate('clientId', 'name email')
    .populate('initiatedBy', 'fullName email')
    .sort({ createdAt: -1 })
    .limit(limit);
};

module.exports = mongoose.model('ClientTouchpoint', clientTouchpointSchema);
