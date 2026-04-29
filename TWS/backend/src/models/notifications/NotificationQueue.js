const mongoose = require('mongoose');

const notificationQueueSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  type: {
    type: String,
    enum: ['email'], // SIMPLIFIED: Email only (removed push and sms)
    required: true
  },
  notificationType: {
    type: String,
    enum: ['messages', 'mentions', 'projectUpdates', 'taskAssignments', 'deadlineReminders', 'approvals', 'system'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // Related entities for context
  relatedEntityType: {
    type: String,
    enum: ['chat', 'message', 'project', 'card', 'user', 'system']
  },
  relatedEntityId: {
    type: mongoose.Schema.Types.ObjectId
  },
  // Batching information
  batchKey: {
    type: String,
    index: true
  },
  batchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NotificationBatch'
  },
  // Delivery status
  status: {
    type: String,
    enum: ['pending', 'processing', 'sent', 'failed', 'cancelled'],
    default: 'pending'
  },
  attempts: {
    type: Number,
    default: 0
  },
  maxAttempts: {
    type: Number,
    default: 3
  },
  scheduledFor: {
    type: Date,
    default: Date.now,
    index: true
  },
  sentAt: Date,
  failedAt: Date,
  errorMessage: String,
  // Priority for processing
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  // Retry configuration
  retryDelay: {
    type: Number,
    default: 300000 // 5 minutes in milliseconds
  },
  nextRetryAt: {
    type: Date,
    index: true
  }
}, {
  timestamps: true
});

// Indexes for performance
notificationQueueSchema.index({ status: 1, scheduledFor: 1 });
notificationQueueSchema.index({ userId: 1, type: 1, status: 1 });
notificationQueueSchema.index({ batchKey: 1, status: 1 });
notificationQueueSchema.index({ nextRetryAt: 1 });
notificationQueueSchema.index({ organization: 1, type: 1 });

// Method to mark as processing
notificationQueueSchema.methods.markAsProcessing = function() {
  this.status = 'processing';
  this.attempts += 1;
  return this.save();
};

// Method to mark as sent
notificationQueueSchema.methods.markAsSent = function() {
  this.status = 'sent';
  this.sentAt = new Date();
  return this.save();
};

// Method to mark as failed
notificationQueueSchema.methods.markAsFailed = function(errorMessage) {
  this.status = 'failed';
  this.failedAt = new Date();
  this.errorMessage = errorMessage;
  return this.save();
};

// Method to schedule retry
notificationQueueSchema.methods.scheduleRetry = function() {
  if (this.attempts < this.maxAttempts) {
    this.status = 'pending';
    this.nextRetryAt = new Date(Date.now() + this.retryDelay);
    return this.save();
  } else {
    return this.markAsFailed('Max retry attempts exceeded');
  }
};

// Method to cancel notification
notificationQueueSchema.methods.cancel = function() {
  this.status = 'cancelled';
  return this.save();
};

// Static method to find pending notifications
notificationQueueSchema.statics.findPending = function(limit = 100) {
  return this.find({
    status: 'pending',
    scheduledFor: { $lte: new Date() }
  }).sort({ priority: -1, scheduledFor: 1 }).limit(limit);
};

// Static method to find retry notifications
notificationQueueSchema.statics.findRetry = function(limit = 100) {
  return this.find({
    status: 'pending',
    nextRetryAt: { $lte: new Date() }
  }).sort({ priority: -1, nextRetryAt: 1 }).limit(limit);
};

// Static method to find notifications for batching
notificationQueueSchema.statics.findForBatching = function(batchKey, limit = 50) {
  return this.find({
    batchKey,
    status: 'pending',
    scheduledFor: { $lte: new Date() }
  }).sort({ createdAt: 1 }).limit(limit);
};

// Static method to cleanup old processed notifications
notificationQueueSchema.statics.cleanupOld = function(daysOld = 7) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  return this.deleteMany({
    status: { $in: ['sent', 'failed', 'cancelled'] },
    createdAt: { $lt: cutoffDate }
  });
};

// Static method to get queue statistics
notificationQueueSchema.statics.getStats = function(organizationId = null) {
  const matchStage = organizationId ? { organization: organizationId } : {};
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
};

module.exports = mongoose.model('NotificationQueue', notificationQueueSchema);
