const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  cardId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Card'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  entityType: {
    type: String,
    enum: ['project', 'board', 'list', 'card', 'comment', 'attachment', 'member', 'client'],
    required: true
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  action: {
    type: String,
    enum: [
      'created', 'updated', 'deleted', 'moved', 'assigned', 'unassigned',
      'commented', 'attached', 'detached', 'completed', 'reopened',
      'approved', 'rejected', 'invited', 'removed', 'archived', 'restored'
    ],
    required: true
  },
  details: {
    type: mongoose.Schema.Types.Mixed
  },
  metadata: {
    ipAddress: String,
    userAgent: String,
    source: {
      type: String,
      enum: ['web', 'mobile', 'api', 'system'],
      default: 'web'
    }
  },
  visibility: {
    type: String,
    enum: ['public', 'team', 'private'],
    default: 'team'
  }
}, {
  timestamps: true
});

// Index for performance
activitySchema.index({ orgId: 1, createdAt: -1 });
activitySchema.index({ projectId: 1, createdAt: -1 });
activitySchema.index({ cardId: 1, createdAt: -1 });
activitySchema.index({ userId: 1, createdAt: -1 });
activitySchema.index({ entityType: 1, entityId: 1 });

module.exports = mongoose.model('Activity', activitySchema);
